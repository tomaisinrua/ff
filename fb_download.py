"""
fb_download.py - Semi-automated downloader for a Facebook photo album.

This is HUMAN-IN-THE-LOOP on purpose:
  * It opens a REAL browser window (not headless).
  * YOU log into Facebook yourself in that window (handle any 2FA/checkpoint).
    No password is ever typed or stored by this script.
  * Your login is saved to a local profile folder (fb_profile/) so you only
    log in once.
  * Playwright then does the tedious bit: scroll the album to load every
    photo, collect the full-size image URLs, and download them.

Heads-up:
  * Automating Facebook is against their Terms of Service and FB actively
    changes its page structure, so selectors here may need tweaking over time.
    Use this only to collect photos you're entitled to view (e.g. finding
    yourself), and keep the pace gentle so you don't trip bot detection.

Setup:
  pip install -r requirements.txt
  playwright install chromium

Run:
  python3 fb_download.py --url "https://www.facebook.com/HELLANDBACKCHALLENGE/photos/" --out hellandback
"""

import argparse
import os
import re
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

PROFILE_DIR = "fb_profile"


def slow_scroll(page, rounds, pause):
    """Scroll to the bottom repeatedly so lazy-loaded photos render."""
    last_height = 0
    for i in range(rounds):
        page.mouse.wheel(0, 20000)
        time.sleep(pause)
        height = page.evaluate("document.body.scrollHeight")
        print(f"  scroll {i + 1}/{rounds}  (page height {height})")
        if height == last_height:
            print("  reached the bottom (no new content).")
            break
        last_height = height


def collect_photo_links(page):
    """Grab links to individual photo viewers from the album grid."""
    hrefs = page.eval_on_selector_all(
        "a[href*='/photo/'], a[href*='/photos/'], a[href*='fbid=']",
        "els => els.map(e => e.href)",
    )
    # Keep only real photo-viewer links, de-duplicated, order preserved.
    seen, links = set(), []
    for h in hrefs:
        if ("fbid=" in h or "/photo" in h) and h not in seen:
            seen.add(h)
            links.append(h)
    return links


def extract_full_image(page):
    """On an open photo viewer, return the highest-res image URL we can find."""
    # The main photo is usually the largest <img> whose src is a scontent CDN URL.
    srcs = page.eval_on_selector_all(
        "img",
        """els => els
            .filter(e => e.src && e.src.includes('scontent') && e.naturalWidth > 400)
            .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))
            .map(e => e.src)""",
    )
    return srcs[0] if srcs else None


def safe_name(url, index):
    path = urlparse(url).path
    base = os.path.basename(path) or f"photo_{index}"
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    if not base.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        base += ".jpg"
    return f"{index:04d}_{base}"


def download(context, url, dest):
    resp = context.request.get(url)
    if resp.ok:
        with open(dest, "wb") as f:
            f.write(resp.body())
        return True
    print(f"  ! failed ({resp.status}) {url}")
    return False


def main():
    ap = argparse.ArgumentParser(description="Semi-automated FB album downloader.")
    ap.add_argument("--url", required=True, help="album / photos page URL")
    ap.add_argument("--out", default="hellandback", help="download folder")
    ap.add_argument("--scrolls", type=int, default=40, help="max scroll rounds")
    ap.add_argument("--pause", type=float, default=2.0, help="seconds between scrolls")
    ap.add_argument("--max", type=int, default=0, help="cap number of photos (0 = all)")
    ap.add_argument("--thumbs-only", action="store_true",
                    help="grab grid thumbnails only (fast, lower-res, no per-photo clicks)")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            PROFILE_DIR, headless=False, viewport={"width": 1280, "height": 900}
        )
        page = context.pages[0] if context.pages else context.new_page()

        page.goto("https://www.facebook.com/", wait_until="domcontentloaded")
        print("\n>>> Log into Facebook in the browser window if you're not already.")
        input(">>> When you're logged in and ready, press ENTER here to continue...\n")

        print(f"Opening album: {args.url}")
        page.goto(args.url, wait_until="domcontentloaded")
        time.sleep(3)

        print("Scrolling to load all photos...")
        slow_scroll(page, args.scrolls, args.pause)

        if args.thumbs_only:
            urls = page.eval_on_selector_all(
                "img",
                "els => els.filter(e => e.src && e.src.includes('scontent')).map(e => e.src)",
            )
            urls = list(dict.fromkeys(urls))
            if args.max:
                urls = urls[: args.max]
            print(f"Downloading {len(urls)} thumbnails...")
            for i, u in enumerate(urls, 1):
                if download(context, u, os.path.join(args.out, safe_name(u, i))):
                    print(f"  [{i}/{len(urls)}] saved")
        else:
            links = collect_photo_links(page)
            if args.max:
                links = links[: args.max]
            print(f"Found {len(links)} photos. Opening each for full resolution...")
            for i, link in enumerate(links, 1):
                try:
                    page.goto(link, wait_until="domcontentloaded")
                    time.sleep(args.pause)
                    full = extract_full_image(page)
                    if not full:
                        print(f"  [{i}/{len(links)}] no image found, skipping")
                        continue
                    if download(context, full, os.path.join(args.out, safe_name(full, i))):
                        print(f"  [{i}/{len(links)}] saved")
                except Exception as e:
                    print(f"  [{i}/{len(links)}] error: {e}")

        print(f"\nDone. Photos in {args.out}/")
        print("Next: put selfies in me/ and run  python3 find_me.py --me me --photos", args.out)
        context.close()


if __name__ == "__main__":
    main()
