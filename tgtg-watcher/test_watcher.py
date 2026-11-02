#!/usr/bin/env python3
"""Offline tests for the watcher's logic. No network, no TGTG account needed.

Run:  python3 test_watcher.py
"""
from __future__ import annotations

import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

os.environ.setdefault("TIMEZONE", "Europe/Dublin")

import watcher as w  # noqa: E402

DUBLIN = ZoneInfo("Europe/Dublin")


def bag(item_id="64346", available=0, name="Jr. Surprise Bag", store="James Whelan Butchers"):
    return {
        "item": {
            "item_id": item_id,
            "item_price": {"code": "EUR", "minor_units": 499, "decimals": 2},
        },
        "store": {"store_name": store},
        "display_name": name,
        "items_available": available,
        "pickup_interval": {"start": "2026-11-02T17:00:00Z", "end": "2026-11-02T18:00:00Z"},
    }


class FakeClient:
    """Stands in for TgtgClient; records what the watcher asked it to do."""

    def __init__(self, items=None):
        self.items = items or []
        self.orders_created = []
        self.orders_aborted = []
        self.statuses = {}
        self.access_token = "at"
        self.refresh_token = "rt"
        self.cookie = "ck"

    def get_items(self, **kwargs):
        return self.items

    def create_order(self, item_id, item_count):
        order_id = f"order-{len(self.orders_created)}"
        self.orders_created.append((item_id, item_count))
        self.statuses[order_id] = "RESERVED"
        return {"id": order_id, "item_id": item_id, "state": "RESERVED"}

    def get_order_status(self, order_id):
        return {"id": order_id, "state": self.statuses.get(order_id, "CANCELLED")}

    def abort_order(self, order_id):
        self.orders_aborted.append(order_id)
        self.statuses.pop(order_id, None)


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        for key in list(os.environ):
            if key.startswith(("TGTG_", "RESERVE_", "WATCH_", "AUTO_", "MAX_", "QUIET_", "LEARN_")):
                del os.environ[key]
        self.cfg = w.Config()
        self.cfg.state_path = Path(self.tmp.name) / "state.json"
        self.state = w.State(self.cfg.state_path)
        self.notifier = w.Notifier()  # unconfigured -> all sends are no-ops


class TestParsing(Base):
    def test_fields_extracted(self):
        entry = bag(available=3)
        self.assertEqual(w.item_id_of(entry), "64346")
        self.assertEqual(w.display_name(entry), "James Whelan Butchers - Jr. Surprise Bag")
        self.assertEqual(w.price_of(entry), "EUR 4.99")
        self.assertIn("17:00", w.pickup_of(entry, DUBLIN))
        self.assertTrue(w.share_url(entry).endswith("64346"))

    def test_missing_fields_do_not_explode(self):
        self.assertEqual(w.item_id_of({}), "")
        self.assertEqual(w.price_of({}), "")
        self.assertEqual(w.pickup_of({}, DUBLIN), "")
        self.assertEqual(w.display_name({}), "Unknown bag")


class TestLearning(Base):
    def test_needs_minimum_samples(self):
        now = datetime(2026, 11, 2, 13, 0, tzinfo=DUBLIN)
        self.state.record_drop("64346", now)
        self.assertIsNone(w.hot_window(self.state, self.cfg, "64346", now))

    def test_window_brackets_the_usual_drop_time(self):
        # Four Mondays where the bag landed around 13:00.
        base = datetime(2026, 10, 5, 13, 0, tzinfo=DUBLIN)
        for week, minute in enumerate([0, 4, -3, 2]):
            self.state.record_drop("64346", base + timedelta(weeks=week, minutes=minute))
        now = datetime(2026, 11, 2, 12, 0, tzinfo=DUBLIN)  # also a Monday
        start, end = w.hot_window(self.state, self.cfg, "64346", now)
        self.assertLess(start, 13 * 60, "window must open before the drop")
        self.assertGreater(end, 13 * 60, "window must close after the drop")
        # Pre-arm means we are already polling fast 20 min out.
        self.assertLessEqual(start, 13 * 60 - self.cfg.prearm)

    def test_outlier_does_not_drag_the_window(self):
        base = datetime(2026, 10, 5, 13, 0, tzinfo=DUBLIN)
        for week in range(4):
            self.state.record_drop("64346", base + timedelta(weeks=week))
        self.state.record_drop("64346", datetime(2026, 10, 12, 3, 0, tzinfo=DUBLIN))  # 03:00 freak
        now = datetime(2026, 11, 2, 12, 0, tzinfo=DUBLIN)
        start, end = w.hot_window(self.state, self.cfg, "64346", now)
        self.assertGreater(start, 11 * 60, "median must ignore the 03:00 outlier")

    def test_poll_speeds_up_inside_the_window(self):
        base = datetime(2026, 10, 5, 13, 0, tzinfo=DUBLIN)
        for week in range(4):
            self.state.record_drop("64346", base + timedelta(weeks=week))
        inside = datetime(2026, 11, 2, 12, 58, tzinfo=DUBLIN)
        outside = datetime(2026, 11, 2, 19, 0, tzinfo=DUBLIN)
        self.assertEqual(w.poll_interval(self.state, self.cfg, ["64346"], inside), self.cfg.fast_interval)
        self.assertEqual(w.poll_interval(self.state, self.cfg, ["64346"], outside), self.cfg.base_interval)


class TestQuietHours(Base):
    def test_window_wrapping_midnight(self):
        self.cfg.quiet_start, self.cfg.quiet_end = 23, 7
        for hour, quiet in [(23, True), (2, True), (6, True), (7, False), (13, False), (22, False)]:
            with self.subTest(hour=hour):
                now = datetime(2026, 11, 2, hour, 0, tzinfo=DUBLIN)
                self.assertEqual(self.cfg.in_quiet_hours(now), quiet)

    def test_disabled_when_equal(self):
        self.cfg.quiet_start = self.cfg.quiet_end = 0
        self.assertFalse(self.cfg.in_quiet_hours(datetime(2026, 11, 2, 3, tzinfo=DUBLIN)))


class TestReserving(Base):
    def setUp(self):
        super().setUp()
        self.cfg.auto_reserve = True
        self.cfg.reserve_items = ["64346"]
        self.now = datetime(2026, 11, 2, 13, 0, tzinfo=DUBLIN)

    def test_reserves_on_a_zero_to_stock_transition(self):
        client = FakeClient([bag(available=2)])
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, self.now)
        self.assertEqual(client.orders_created, [("64346", 1)])
        self.assertEqual(len(self.state.data["reservations"]), 1)
        self.assertEqual(len(self.state.data["drops"]["64346"]), 1)

    def test_no_repeat_while_stock_stays_up(self):
        client = FakeClient([bag(available=2)])
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, self.now)
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, self.now)
        self.assertEqual(len(client.orders_created), 1, "must not re-fire while already in stock")

    def test_daily_cap_is_enforced(self):
        self.cfg.max_per_day = 1
        client = FakeClient()
        for item_id in ("64346", "99999"):
            self.cfg.reserve_items.append(item_id)
            w.handle_items(client, self.cfg, self.state, self.notifier, [bag(item_id=item_id, available=1)], self.now)
        self.assertEqual(len(client.orders_created), 1)

    def test_quiet_hours_block_reserving_but_not_alerting(self):
        client = FakeClient([bag(available=2)])
        night = datetime(2026, 11, 2, 3, 0, tzinfo=DUBLIN)
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, night)
        self.assertEqual(client.orders_created, [])
        self.assertEqual(len(self.state.data["drops"]["64346"]), 1, "drop still recorded for learning")

    def test_unlisted_item_is_watched_but_never_reserved(self):
        self.cfg.reserve_items = ["other"]
        client = FakeClient([bag(available=2)])
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, self.now)
        self.assertEqual(client.orders_created, [])

    def test_dry_run_never_reserves(self):
        self.cfg.dry_run = True
        client = FakeClient([bag(available=2)])
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, self.now)
        self.assertEqual(client.orders_created, [])

    def test_create_order_failure_does_not_crash(self):
        client = FakeClient([bag(available=2)])
        client.create_order = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("403 captcha"))
        w.handle_items(client, self.cfg, self.state, self.notifier, client.items, self.now)
        self.assertEqual(self.state.data["reservations"], {})


class TestReservationSweep(Base):
    def setUp(self):
        super().setUp()
        self.now = datetime(2026, 11, 2, 13, 0, tzinfo=DUBLIN)
        self.client = FakeClient()
        self.client.create_order("64346", 1)
        self.state.data["reservations"]["order-0"] = {
            "item_id": "64346",
            "name": "test bag",
            "created": self.now.isoformat(),
            "deadline": (self.now + timedelta(minutes=6)).isoformat(),
        }

    def test_held_before_deadline(self):
        w.sweep_reservations(self.client, self.cfg, self.state, self.notifier, self.now)
        self.assertEqual(self.client.orders_aborted, [])
        self.assertIn("order-0", self.state.data["reservations"])

    def test_aborted_after_deadline(self):
        later = self.now + timedelta(minutes=10)
        w.sweep_reservations(self.client, self.cfg, self.state, self.notifier, later)
        self.assertEqual(self.client.orders_aborted, ["order-0"])
        self.assertEqual(self.state.data["reservations"], {})

    def test_paid_order_is_forgotten_not_aborted(self):
        self.client.statuses["order-0"] = "PAID"
        later = self.now + timedelta(minutes=10)
        w.sweep_reservations(self.client, self.cfg, self.state, self.notifier, later)
        self.assertEqual(self.client.orders_aborted, [], "never abort a bag you already paid for")
        self.assertEqual(self.state.data["reservations"], {})


class TestState(Base):
    def test_round_trip(self):
        self.state.record_drop("64346", datetime(2026, 11, 2, 13, 0, tzinfo=DUBLIN))
        self.state.bump_reserved(datetime(2026, 11, 2, 13, 0, tzinfo=DUBLIN))
        self.state.save()
        reloaded = w.State(self.cfg.state_path)
        self.assertEqual(len(reloaded.drop_times("64346")), 1)
        self.assertEqual(reloaded.reserved_today(datetime(2026, 11, 2, tzinfo=DUBLIN)), 1)

    def test_corrupt_state_file_is_survivable(self):
        self.cfg.state_path.write_text("{ not json")
        self.assertEqual(w.State(self.cfg.state_path).data["drops"], {})

    def test_drop_history_is_capped(self):
        base = datetime(2026, 1, 1, 13, 0, tzinfo=DUBLIN)
        for day in range(100):
            self.state.record_drop("64346", base + timedelta(days=day))
        self.assertEqual(len(self.state.data["drops"]["64346"]), 60)

    def test_credential_sync(self):
        client = FakeClient()
        w.sync_credentials(client, self.state)
        self.assertEqual(self.state.data["credentials"]["access_token"], "at")


if __name__ == "__main__":
    unittest.main(verbosity=2)
