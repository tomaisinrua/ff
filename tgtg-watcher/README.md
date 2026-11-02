# tgtg-watcher

Watches a Too Good To Go bag, learns what time the shop usually puts it out,
polls hard through that window, and shouts at your phone the instant it lands.
Optionally reserves it for you first.

Built for the James Whelan Butchers Leopardstown Jr. Surprise Bag problem: by
the time the app notification arrives, it is gone.

## Read this before you build your hopes up

**It cannot pay.** The unofficial API exposes order *creation* but no client
implements payment. The absolute best this can do is put a bag in the RESERVED
state and tell you to open the app and pay. That still wins you the race, which
is the actual problem - but there is no "wake up to a bought bag" mode, and
there is not going to be one.

**It may not work at all right now.** TGTG sits behind DataDome, and the
unofficial client has been losing to it. [Issue #403](https://github.com/ahivert/tgtg-python/issues/403)
reports the endpoints moved and bot detection tightened; [#396](https://github.com/ahivert/tgtg-python/issues/396)
reports login 403s where even a residential proxy held for only ~30 minutes.
Some 403 issues are marked `wontfix`. The `tgtg` package on PyPI is 0.19.0 from
May 2026, which is older than the API changes it needs to handle. Try it; if you
get instant 403s, that is why, and no amount of config will fix it.

**Run it at home, not in the cloud.** Datacenter IPs get flagged on the first
request. GitHub Actions, a VPS, a free tier box - all pointless here, quite
apart from Actions' 5-minute cron floor and its habit of firing late. This wants
a Raspberry Pi, an old laptop or a Mac mini on your own broadband.

**TGTG's terms forbid it.** The app T&Cs say you will not "use any automated
systems, robots or software to extract data from the Too Good To Go
Marketplace". Polling is exactly that. The penalty is account suspension. It is
your account and your €4.99, so it is your call - just make it with your eyes
open.

## Setup

```bash
cd tgtg-watcher
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env

.venv/bin/python login.py          # emails you a link; click it
# paste the three values it prints into .env

.venv/bin/python watcher.py --list # find your item IDs
```

Heart the bag in the TGTG app first or `--list` returns nothing.

Fill in `WATCH_ITEM_IDS` and a notification backend in `.env`. [ntfy](https://ntfy.sh)
is the least hassle: invent an unguessable topic name, put it in `NTFY_TOPIC`,
install the ntfy app on your phone, subscribe to the same topic. Anyone who
guesses your topic gets your alerts, so make it long.

Then:

```bash
.venv/bin/python watcher.py --dry-run   # alert only, never reserve
```

Leave it in dry-run for a week. It needs to see the bag appear at least
`LEARN_MIN_SAMPLES` (3) times before it has any idea when to poll fast.

## Running it properly

Linux/Pi: edit paths in `tgtg-watcher.service`, then

```bash
sudo cp tgtg-watcher.service /etc/systemd/system/
sudo systemctl enable --now tgtg-watcher
journalctl -u tgtg-watcher -f
```

macOS: edit `dev.tgtg.watcher.plist`, then

```bash
cp dev.tgtg.watcher.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/dev.tgtg.watcher.plist
```

## How the polling works

Hammering the API every 10 seconds all day is the fastest way to get blocked
and the slowest way to get a bag. So:

- Baseline is `POLL_SECONDS` (90s), which is cheap and invisible.
- Every time stock goes 0 → something, the timestamp is recorded.
- Once there are 3+ observations it computes the median drop time, pads it by
  the median absolute deviation (so one freak 03:00 restock does not drag the
  window), pre-arms `LEARN_PREARM_MINUTES` early, and drops to
  `FAST_POLL_SECONDS` (15s) inside that window.
- Same-weekday history is preferred where there is enough of it, because
  butchers do not restock a Saturday like a Tuesday.
- Every sleep gets random jitter so the traffic is not a metronome.
- Failures back off exponentially to `MAX_BACKOFF_SECONDS`. Six in a row sends
  you an urgent "I am blocked" push rather than quietly rotting.

`watcher.py --status` prints what it has learned.

Honestly: once `--status` tells you the bag lands at 13:00 on weekdays, a phone
alarm at 12:58 is a legitimate, unbannable solution that works about as well.
Consider stopping there.

## Should you turn on AUTO_RESERVE?

It is off by default and gated behind an explicit allowlist - `AUTO_RESERVE=true`
alone does nothing until you also put item IDs in `RESERVE_ITEM_IDS`.

When it fires it calls `create_order`, which puts the bag in RESERVED and sends
you an urgent push. You then open the app and pay. If you have not paid within
`RESERVE_HOLD_MINUTES` (6), the watcher calls `abort_order` itself and the bag
goes back on sale. That matters: an unpaid reservation you forgot about is a bag
nobody eats, which is the precise opposite of the point of this app. Do not raise
the hold time to something silly.

Other guardrails:

- `MAX_RESERVATIONS_PER_DAY` (2) caps a runaway loop.
- It will not stack a second reservation on an item it is already holding.
- `QUIET_HOURS_START`/`END` stop it reserving overnight - it still alerts, and
  still records the drop for learning.
- `--dry-run` overrides everything.

## Tests

```bash
.venv/bin/python test_watcher.py
```

22 offline tests covering drop learning, outlier rejection, poll-rate switching,
quiet hours wrapping midnight, the daily cap, abort-on-deadline, not aborting a
bag you already paid for, and surviving a corrupt state file. No network, no
account needed.

## Files

| File | |
|---|---|
| `watcher.py` | main loop, learning, reserving |
| `notify.py` | ntfy / Telegram / Pushover / webhook fan-out |
| `login.py` | one-time credential grab |
| `test_watcher.py` | offline tests |
| `state.json` | learned drop times, live reservations (gitignored) |
| `.env` | credentials and config (gitignored) |
