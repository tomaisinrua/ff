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

Facebook's photo pages require login and block automated downloading, so this
part is a manual browser step (there's no reliable script for it):

1. Log into Facebook, open the album:
   https://www.facebook.com/HELLANDBACKCHALLENGE/photos/
2. Filter to the album/date for the 6th if there's a separate one.
3. Bulk-download with a browser extension such as **Imageye**, **Image
   Downloader**, or **DownThemAll** — scroll to the bottom first so they all
   load, then grab them in one go.
4. Save them all into a folder, e.g. `hellandback/` next to this file.

> Tip: download the largest size available — face matching is much more
> reliable on higher-resolution images.

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
