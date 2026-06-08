# Finding yourself in the Hell & Back photos

A repeatable workflow for locating yourself in a big batch of event photos
(Hell & Back, 6th of the month). Two parts: **get the photos onto your
computer**, then **let face-matching narrow them down**.

## Step 0 (do this first): check for an official race photographer

Most obstacle races (Hell & Back included) use a dedicated photo partner
rather than only posting to Facebook. These let you find yourself in
**seconds**, far faster than scanning a whole album:

- Look on the Hell & Back website / the Facebook post itself for a link to a
  photo partner (e.g. **Sportograf**, **MarathonPhotos**, an event SmugMug,
  or a Google Drive/Dropbox the organisers shared).
- These usually offer **search by bib number** and/or **"selfie search"**
  (upload one photo of your face, it finds you). If that exists, you're done.

Only fall back to the steps below if all you have is the Facebook album.

## Step 1: get the photos onto disk

Facebook needs a login and blocks fully-automated scraping, so the two options
both keep **you** in control of the login.

### Option A — semi-automated with Playwright (recommended)

`fb_download.py` opens a real browser, **you** log in yourself (so 2FA /
checkpoints are fine and no password is stored), then it auto-scrolls the album
and downloads the photos for you.

```bash
pip install -r requirements.txt
playwright install chromium
python3 fb_download.py --url "https://www.facebook.com/HELLANDBACKCHALLENGE/photos/" --out hellandback
```

- It pauses after launch — log in, then press ENTER in the terminal.
- Your session is saved to `fb_profile/` so you only log in once.
- Full resolution (opens each photo) by default; add `--thumbs-only` for a
  fast, lower-res first pass.
- `--max 50` to test on a small batch first; `--pause 3` to go gentler.

> Note: automating Facebook is against their ToS and the page structure changes
> often, so the selectors in `fb_download.py` may occasionally need a tweak. Use
> it only for photos you're entitled to view, and keep the pace gentle.

### Option B — fully manual (zero scripting)

1. Log into Facebook, open the album, scroll to the very bottom so all photos
   load.
2. Bulk-download with a browser extension such as **Imageye**, **Image
   Downloader**, or **DownThemAll**.
3. Save them into a `hellandback/` folder next to this file.

> Tip (either option): grab the largest size available — face matching is much
> more reliable on higher-resolution images.

## Step 2: add a couple of selfies of yourself

Create a `me/` folder and drop in **2–4 clear, front-on photos of your face**
(different angles/lighting helps). The more reference faces, the better the
match.

## Step 3: run the matcher

```bash
pip install -r requirements.txt        # one-time setup (installs face_recognition)
python3 find_me.py --me me --photos hellandback
```

It scans every photo, scores each face against your selfies, and copies the
**likely matches into `matches/`**, named so the best matches sort first
(`001_0.412_....jpeg`). Lower distance = more confident it's you.

Tuning:
- Too many wrong people? Lower the threshold: `--tolerance 0.5`
- Missing yourself? Raise it: `--tolerance 0.65` (more false positives to sift)

## Step 4 (optional): view matches in the gallery

This repo already renders `images/` via `generate_images_json.py` + `index.html`.
To browse your matches the same way:

```bash
cp matches/* images/
python3 generate_images_json.py
# then open index.html
```

---

### Notes / limitations
- `face_recognition` depends on `dlib`, which can be slow to install
  (it compiles). On macOS: `brew install cmake` first. On Ubuntu:
  `sudo apt install build-essential cmake`.
- Big albums + CPU = a few minutes. That's normal.
- This is for finding **yourself** in photos you're entitled to view — keep it
  to that.
