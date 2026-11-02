#!/usr/bin/env python3
"""Too Good To Go bag watcher: learns when a store drops its bags, polls hard
through that window, and optionally reserves the instant stock appears.

It cannot pay. The unofficial API exposes order creation but not payment, so
the most this can do is RESERVE a bag and shout at your phone. You then open
the app and pay. If you don't pay within RESERVE_HOLD_MINUTES the watcher
aborts the order itself, so a bag you can't collect goes back on the shelf
instead of rotting in a dead reservation.

Usage:
    python3 watcher.py            # run the watch loop
    python3 watcher.py --list     # print your favourites and their item IDs
    python3 watcher.py --status   # print learned drop windows, then exit
    python3 watcher.py --dry-run  # watch and alert, never reserve
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import random
import signal
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

from tgtg import TgtgClient

from notify import Notifier

HERE = Path(__file__).resolve().parent
log = logging.getLogger("tgtg-watcher")

# --------------------------------------------------------------------------- config


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


def _env_int(key: str, default: int) -> int:
    try:
        return int(_env(key) or default)
    except ValueError:
        return default


def _env_bool(key: str, default: bool = False) -> bool:
    raw = _env(key).lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_list(key: str) -> list[str]:
    return [p.strip() for p in _env(key).split(",") if p.strip()]


class Config:
    def __init__(self) -> None:
        self.access_token = _env("TGTG_ACCESS_TOKEN")
        self.refresh_token = _env("TGTG_REFRESH_TOKEN")
        self.cookie = _env("TGTG_COOKIE")

        self.tz = ZoneInfo(_env("TIMEZONE", "Europe/Dublin"))
        self.watch_items = _env_list("WATCH_ITEM_IDS")      # empty = all favourites
        self.reserve_items = _env_list("RESERVE_ITEM_IDS")  # empty = none

        self.auto_reserve = _env_bool("AUTO_RESERVE", False)
        self.reserve_qty = _env_int("RESERVE_QUANTITY", 1)
        self.hold_minutes = _env_int("RESERVE_HOLD_MINUTES", 6)
        self.max_per_day = _env_int("MAX_RESERVATIONS_PER_DAY", 2)

        self.base_interval = _env_int("POLL_SECONDS", 90)
        self.fast_interval = _env_int("FAST_POLL_SECONDS", 15)
        self.max_backoff = _env_int("MAX_BACKOFF_SECONDS", 1800)
        self.page_size = _env_int("PAGE_SIZE", 50)
        self.timeout = _env_int("REQUEST_TIMEOUT", 30)
        self.proxy = _env("TGTG_PROXY")

        self.quiet_start = _env_int("QUIET_HOURS_START", 23)  # 23:00
        self.quiet_end = _env_int("QUIET_HOURS_END", 7)       # 07:00

        self.min_samples = _env_int("LEARN_MIN_SAMPLES", 3)
        self.window_pad = _env_int("LEARN_WINDOW_PAD_MINUTES", 12)
        self.prearm = _env_int("LEARN_PREARM_MINUTES", 20)

        self.state_path = Path(_env("STATE_FILE") or (HERE / "state.json"))
        self.dry_run = False

    @property
    def has_credentials(self) -> bool:
        return bool(self.access_token and self.refresh_token and self.cookie)

    def wants(self, item_id: str) -> bool:
        return not self.watch_items or item_id in self.watch_items

    def may_reserve(self, item_id: str) -> bool:
        if not self.auto_reserve or self.dry_run:
            return False
        return item_id in self.reserve_items

    def in_quiet_hours(self, now: datetime) -> bool:
        if self.quiet_start == self.quiet_end:
            return False
        h = now.hour
        if self.quiet_start < self.quiet_end:
            return self.quiet_start <= h < self.quiet_end
        return h >= self.quiet_start or h < self.quiet_end  # window wraps midnight


# --------------------------------------------------------------------------- state


class State:
    """Durable memory: observed drop times, stock levels, live reservations."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.data: dict[str, Any] = {
            "drops": {},        # item_id -> [iso local timestamps]
            "stock": {},        # item_id -> last seen items_available
            "reservations": {}, # order_id -> {item_id, name, deadline, created}
            "reserved_on": {},  # YYYY-MM-DD -> count
            "credentials": {},  # last-known-good, refreshed by the client in flight
        }
        if path.exists():
            try:
                self.data.update(json.loads(path.read_text()))
            except (json.JSONDecodeError, OSError) as exc:
                log.warning("Could not read state file (%s); starting fresh.", exc)

    def save(self) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, indent=2, sort_keys=True))
        tmp.replace(self.path)  # atomic: never leave a half-written state file

    # -- drop history ------------------------------------------------------
    def record_drop(self, item_id: str, when: datetime) -> None:
        drops = self.data["drops"].setdefault(item_id, [])
        drops.append(when.isoformat())
        del drops[:-60]  # keep the last 60 observations, forget ancient habits

    def drop_times(self, item_id: str) -> list[datetime]:
        out = []
        for raw in self.data["drops"].get(item_id, []):
            try:
                out.append(datetime.fromisoformat(raw))
            except ValueError:
                continue
        return out

    # -- daily reservation cap --------------------------------------------
    def reserved_today(self, now: datetime) -> int:
        return int(self.data["reserved_on"].get(now.date().isoformat(), 0))

    def bump_reserved(self, now: datetime) -> None:
        key = now.date().isoformat()
        counts = self.data["reserved_on"]
        counts[key] = int(counts.get(key, 0)) + 1
        for stale in [k for k in counts if k < (now.date() - timedelta(days=14)).isoformat()]:
            del counts[stale]


def sync_credentials(client: TgtgClient, state: State) -> None:
    """The client silently rotates its access token. Persist whatever it holds
    now so a restart does not fall back to the stale values in .env."""
    current = {
        "access_token": getattr(client, "access_token", "") or "",
        "refresh_token": getattr(client, "refresh_token", "") or "",
        "cookie": getattr(client, "cookie", "") or "",
    }
    if all(current.values()) and current != state.data.get("credentials"):
        state.data["credentials"] = current
        log.debug("Stored refreshed credentials.")


# --------------------------------------------------------------------------- learning


def _median(values: list[float]) -> float:
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2


def _minutes(when: datetime) -> float:
    return when.hour * 60 + when.minute + when.second / 60


def hot_window(state: State, cfg: Config, item_id: str, now: datetime) -> tuple[float, float] | None:
    """Minutes-since-midnight range in which this item usually appears.

    Prefers same-weekday history (butchers restock differently on a Saturday),
    falling back to all observations when that is too thin to trust.
    """
    all_drops = state.drop_times(item_id)
    if not all_drops:
        return None

    same_day = [d for d in all_drops if d.weekday() == now.weekday()]
    sample = same_day if len(same_day) >= cfg.min_samples else all_drops
    if len(sample) < cfg.min_samples:
        return None

    minutes = [_minutes(d) for d in sample]
    centre = _median(minutes)
    # Median absolute deviation: robust to the one day the shop dropped at 09:00.
    mad = _median([abs(m - centre) for m in minutes])
    pad = max(cfg.window_pad, 3 * mad)
    return centre - pad - cfg.prearm, centre + pad


def poll_interval(state: State, cfg: Config, item_ids: Iterable[str], now: datetime) -> int:
    """Fast inside any watched item's expected drop window, lazy otherwise."""
    current = _minutes(now)
    for item_id in item_ids:
        window = hot_window(state, cfg, item_id, now)
        if window and window[0] <= current <= window[1]:
            return cfg.fast_interval
    return cfg.base_interval


# --------------------------------------------------------------------------- helpers


def item_id_of(entry: dict[str, Any]) -> str:
    return str(entry.get("item", {}).get("item_id", ""))


def display_name(entry: dict[str, Any]) -> str:
    store = entry.get("store", {}).get("store_name", "")
    bag = entry.get("display_name") or entry.get("item", {}).get("name", "")
    if store and bag and store not in bag:
        return f"{store} - {bag}"
    return bag or store or "Unknown bag"


def price_of(entry: dict[str, Any]) -> str:
    price = entry.get("item", {}).get("item_price") or {}
    minor, decimals = price.get("minor_units"), price.get("decimals")
    if minor is None or decimals is None:
        return ""
    return f"{price.get('code', '')} {minor / (10 ** decimals):.2f}".strip()


def pickup_of(entry: dict[str, Any], tz: ZoneInfo) -> str:
    interval = entry.get("pickup_interval") or {}
    try:
        start = datetime.fromisoformat(interval["start"].replace("Z", "+00:00")).astimezone(tz)
        end = datetime.fromisoformat(interval["end"].replace("Z", "+00:00")).astimezone(tz)
    except (KeyError, AttributeError, ValueError):
        return ""
    return f"{start:%a %H:%M}-{end:%H:%M}"


def share_url(entry: dict[str, Any]) -> str:
    direct = entry.get("sharing_url")
    if direct:
        return str(direct)
    item_id = item_id_of(entry)
    return f"https://share.toogoodtogo.com/item/{item_id}" if item_id else ""


# --------------------------------------------------------------------------- actions


def try_reserve(
    client: TgtgClient,
    cfg: Config,
    state: State,
    notifier: Notifier,
    entry: dict[str, Any],
    now: datetime,
) -> None:
    item_id = item_id_of(entry)
    name = display_name(entry)

    if not cfg.may_reserve(item_id):
        return
    if any(r["item_id"] == item_id for r in state.data["reservations"].values()):
        log.info("Already holding a reservation for %s; not stacking another.", name)
        return
    if state.reserved_today(now) >= cfg.max_per_day:
        log.info("Daily reservation cap (%d) reached; skipping %s.", cfg.max_per_day, name)
        return
    if cfg.in_quiet_hours(now):
        log.info("Quiet hours; not reserving %s.", name)
        return

    qty = min(cfg.reserve_qty, int(entry.get("items_available", 1)) or 1)
    try:
        order = client.create_order(item_id, qty)
    except Exception as exc:  # noqa: BLE001 - surface, never crash the loop
        log.error("Reserve failed for %s: %s", name, exc)
        notifier.send("TGTG reserve failed", f"{name}\n{exc}", url=share_url(entry))
        return

    order_id = str(order.get("id", ""))
    deadline = now + timedelta(minutes=cfg.hold_minutes)
    state.data["reservations"][order_id] = {
        "item_id": item_id,
        "name": name,
        "created": now.isoformat(),
        "deadline": deadline.isoformat(),
    }
    state.bump_reserved(now)
    state.save()

    log.warning("RESERVED %s (order %s) - pay in the app by %s", name, order_id, f"{deadline:%H:%M}")
    notifier.send(
        "Bag held - PAY NOW",
        f"{name}\n{price_of(entry)}  {pickup_of(entry, cfg.tz)}\n"
        f"Open the TGTG app and pay by {deadline:%H:%M} or it is released.",
        urgent=True,
        url=share_url(entry),
    )


def sweep_reservations(
    client: TgtgClient, cfg: Config, state: State, notifier: Notifier, now: datetime
) -> None:
    """Release anything still sitting unpaid past its deadline."""
    for order_id, info in list(state.data["reservations"].items()):
        try:
            deadline = datetime.fromisoformat(info["deadline"])
        except (KeyError, ValueError):
            del state.data["reservations"][order_id]
            continue

        try:
            status = str(client.get_order_status(order_id).get("state", "")).upper()
        except Exception as exc:  # noqa: BLE001
            log.warning("Could not check order %s: %s", order_id, exc)
            continue

        if status != "RESERVED":
            # Paid, cancelled or otherwise resolved - stop tracking it.
            log.info("Order %s for %s is now %s.", order_id, info["name"], status or "gone")
            del state.data["reservations"][order_id]
            state.save()
            continue

        if now < deadline:
            continue

        try:
            client.abort_order(order_id)
            log.warning("Aborted unpaid order %s (%s).", order_id, info["name"])
            notifier.send(
                "Reservation released",
                f"{info['name']} went unpaid for {cfg.hold_minutes} min, so it is back "
                f"on sale for someone else.",
            )
        except Exception as exc:  # noqa: BLE001
            log.error("Abort failed for %s: %s", order_id, exc)
            continue
        del state.data["reservations"][order_id]
        state.save()


def handle_items(
    client: TgtgClient,
    cfg: Config,
    state: State,
    notifier: Notifier,
    items: list[dict[str, Any]],
    now: datetime,
) -> None:
    for entry in items:
        item_id = item_id_of(entry)
        if not item_id or not cfg.wants(item_id):
            continue

        available = int(entry.get("items_available", 0) or 0)
        previous = int(state.data["stock"].get(item_id, 0) or 0)
        state.data["stock"][item_id] = available

        if available > 0 and previous == 0:
            name = display_name(entry)
            state.record_drop(item_id, now)
            log.warning("DROP: %s - %d available", name, available)
            notifier.send(
                "Bag available",
                f"{name}\n{available} left  {price_of(entry)}  {pickup_of(entry, cfg.tz)}",
                urgent=True,
                url=share_url(entry),
            )
            try_reserve(client, cfg, state, notifier, entry, now)


# --------------------------------------------------------------------------- CLI modes


def cmd_list(client: TgtgClient, cfg: Config) -> int:
    items = client.get_items(favorites_only=True, page_size=cfg.page_size)
    if not items:
        print("No favourites found. Heart the bag in the app first.")
        return 1
    print(f"{'ITEM ID':<12} {'STOCK':<6} NAME")
    for entry in items:
        print(
            f"{item_id_of(entry):<12} {entry.get('items_available', 0):<6} "
            f"{display_name(entry)}  {price_of(entry)}"
        )
    print("\nPut the IDs you want in WATCH_ITEM_IDS / RESERVE_ITEM_IDS in .env")
    return 0


def cmd_status(cfg: Config, state: State) -> int:
    now = datetime.now(cfg.tz)
    watched = cfg.watch_items or sorted(state.data["drops"])
    if not watched:
        print("Nothing learned yet. Let the watcher run for a few days.")
        return 0
    for item_id in watched:
        drops = state.drop_times(item_id)
        window = hot_window(state, cfg, item_id, now)
        label = f"item {item_id}"
        if window is None:
            print(f"{label}: {len(drops)} observation(s) - not enough to predict yet")
            continue
        start, end = window
        print(
            f"{label}: {len(drops)} observations, "
            f"fast-poll window {int(start) // 60:02d}:{int(start) % 60:02d}"
            f"-{int(end) // 60:02d}:{int(end) % 60:02d} on {now:%A}s"
        )
    active = state.data["reservations"]
    print(f"\nLive reservations: {len(active)}")
    for order_id, info in active.items():
        print(f"  {order_id}  {info['name']}  deadline {info['deadline']}")
    return 0


# --------------------------------------------------------------------------- main


class Shutdown:
    """Flips on SIGINT/SIGTERM so we stop between polls, not mid-reserve."""

    def __init__(self) -> None:
        self.requested = False
        signal.signal(signal.SIGINT, self._handle)
        signal.signal(signal.SIGTERM, self._handle)

    def _handle(self, *_: Any) -> None:
        log.info("Shutdown requested; finishing this cycle.")
        self.requested = True


def run_loop(client: TgtgClient, cfg: Config, state: State, notifier: Notifier) -> int:
    shutdown = Shutdown()
    failures = 0
    warned_about_failures = False

    log.info(
        "Watching %s | auto-reserve: %s | poll %ds (fast %ds)",
        ", ".join(cfg.watch_items) if cfg.watch_items else "all favourites",
        "on" if cfg.auto_reserve and not cfg.dry_run else "off",
        cfg.base_interval,
        cfg.fast_interval,
    )

    while not shutdown.requested:
        now = datetime.now(cfg.tz)
        try:
            items = client.get_items(favorites_only=True, page_size=cfg.page_size)
            handle_items(client, cfg, state, notifier, items, now)
            if state.data["reservations"]:
                sweep_reservations(client, cfg, state, notifier, now)
            sync_credentials(client, state)
            state.save()

            if failures and warned_about_failures:
                notifier.send("TGTG watcher recovered", "Polling is working again.")
            failures = 0
            warned_about_failures = False

            watched = cfg.watch_items or list(state.data["stock"])
            delay = poll_interval(state, cfg, watched, now)
        except Exception as exc:  # noqa: BLE001 - the loop must outlive any one error
            failures += 1
            delay = min(cfg.base_interval * (2 ** failures), cfg.max_backoff)
            log.error("Poll failed (%d in a row): %s - backing off %ds", failures, exc, delay)
            # Six straight failures is almost always DataDome or dead credentials.
            if failures >= 6 and not warned_about_failures:
                notifier.send(
                    "TGTG watcher is blocked",
                    f"{failures} consecutive failures.\n{exc}\n"
                    "Likely a captcha/403 or expired credentials - rerun login.py.",
                    urgent=True,
                )
                warned_about_failures = True

        # Jitter keeps the request pattern from looking like a metronome.
        slept = 0.0
        target = delay + random.uniform(0, max(1.0, delay * 0.1))
        while slept < target and not shutdown.requested:
            nap = min(1.0, target - slept)
            time.sleep(nap)
            slept += nap

    state.save()
    log.info("Stopped cleanly.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Too Good To Go bag watcher")
    parser.add_argument("--list", action="store_true", help="print favourites and item IDs")
    parser.add_argument("--status", action="store_true", help="print learned drop windows")
    parser.add_argument("--dry-run", action="store_true", help="alert but never reserve")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Load .env without a hard dependency on python-dotenv.
    env_file = HERE / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

    cfg = Config()
    cfg.dry_run = args.dry_run
    state = State(cfg.state_path)

    if args.status:
        return cmd_status(cfg, state)

    if not cfg.has_credentials:
        print("Missing credentials. Run:  python3 login.py", file=sys.stderr)
        return 2

    stored = state.data.get("credentials") or {}
    client = TgtgClient(
        access_token=stored.get("access_token") or cfg.access_token,
        refresh_token=stored.get("refresh_token") or cfg.refresh_token,
        cookie=stored.get("cookie") or cfg.cookie,
        timeout=cfg.timeout,
        proxies={"http": cfg.proxy, "https": cfg.proxy} if cfg.proxy else None,
    )

    if args.list:
        return cmd_list(client, cfg)

    notifier = Notifier()
    if not notifier.configured:
        log.warning("No notification backend configured - alerts will only hit the log.")
    if cfg.auto_reserve and not cfg.reserve_items and not args.dry_run:
        log.warning("AUTO_RESERVE is on but RESERVE_ITEM_IDS is empty - nothing will be reserved.")

    return run_loop(client, cfg, state, notifier)


if __name__ == "__main__":
    raise SystemExit(main())
