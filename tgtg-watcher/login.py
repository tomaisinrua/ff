#!/usr/bin/env python3
"""One-time credential grab.

Run this once, on the machine that will host the watcher. TGTG emails you a
confirmation link; this script blocks until you click it, then prints the three
values to paste into .env. Credentials are long-lived - you should not need to
repeat this unless you start getting persistent 401/403s.
"""
from __future__ import annotations

import sys

from tgtg import TgtgClient


def main() -> int:
    email = input("TGTG account email: ").strip()
    if not email:
        print("No email given.", file=sys.stderr)
        return 1

    print("\nRequesting login... check your inbox and click the link TGTG sends you.")
    print("(This will sit here and wait. It can take a minute.)\n")

    client = TgtgClient(email=email)
    creds = client.get_credentials()

    print("Success. Paste these into tgtg-watcher/.env:\n")
    print(f"TGTG_ACCESS_TOKEN={creds['access_token']}")
    print(f"TGTG_REFRESH_TOKEN={creds['refresh_token']}")
    print(f"TGTG_COOKIE={creds['cookie']}")
    print("\nThen find the item IDs you care about:  python3 watcher.py --list")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
