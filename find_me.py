"""
find_me.py - Locate yourself in a folder of event photos using face matching.

Workflow:
  1. Put one or more clear selfies of your face in a folder (e.g. me/).
  2. Put all the downloaded event photos in another folder (e.g. hellandback/).
  3. Run:  python3 find_me.py --me me --photos hellandback
  4. Ranked matches are copied into matches/ (best first) so you can flick
     through just the photos you're probably in.

Requires:  pip install -r requirements.txt
"""

import argparse
import os
import shutil

import face_recognition

IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')


def list_images(folder):
    return [
        os.path.join(folder, f)
        for f in sorted(os.listdir(folder))
        if f.lower().endswith(IMAGE_EXTS)
    ]


def load_reference_encodings(me_folder):
    """Encode every face found in the reference selfies."""
    encodings = []
    for path in list_images(me_folder):
        image = face_recognition.load_image_file(path)
        found = face_recognition.face_encodings(image)
        if not found:
            print(f"  ! no face found in reference {path} (skipping)")
            continue
        encodings.extend(found)
        print(f"  + loaded {len(found)} face(s) from {os.path.basename(path)}")
    if not encodings:
        raise SystemExit("No usable reference faces. Add clearer selfies to --me.")
    return encodings


def best_distance(reference_encodings, candidate_encoding):
    """Smallest distance between this candidate face and any reference face."""
    distances = face_recognition.face_distance(reference_encodings, candidate_encoding)
    return min(distances)


def main():
    ap = argparse.ArgumentParser(description="Find yourself in event photos.")
    ap.add_argument("--me", default="me", help="folder of reference selfies")
    ap.add_argument("--photos", default="hellandback", help="folder of event photos")
    ap.add_argument("--out", default="matches", help="folder for ranked matches")
    ap.add_argument(
        "--tolerance",
        type=float,
        default=0.6,
        help="lower = stricter. 0.5 is strict, 0.6 default, 0.65 catches more (more false positives)",
    )
    args = ap.parse_args()

    print("Loading reference faces...")
    references = load_reference_encodings(args.me)

    photos = list_images(args.photos)
    print(f"\nScanning {len(photos)} photos in {args.photos}/ ...")

    results = []  # (distance, path)
    for i, path in enumerate(photos, 1):
        try:
            image = face_recognition.load_image_file(path)
            faces = face_recognition.face_encodings(image)
        except Exception as e:
            print(f"  [{i}/{len(photos)}] {os.path.basename(path)} - error: {e}")
            continue

        if not faces:
            continue

        dist = min(best_distance(references, face) for face in faces)
        if dist <= args.tolerance:
            results.append((dist, path))
            print(f"  [{i}/{len(photos)}] MATCH {os.path.basename(path)}  (distance {dist:.3f})")

    results.sort(key=lambda r: r[0])

    os.makedirs(args.out, exist_ok=True)
    for rank, (dist, path) in enumerate(results, 1):
        # Prefix with rank + confidence so best matches sort first in the folder.
        name = f"{rank:03d}_{dist:.3f}_{os.path.basename(path)}"
        shutil.copy2(path, os.path.join(args.out, name))

    print(f"\nDone. {len(results)} likely matches copied to {args.out}/ (best first).")
    if results:
        print("Open the matches/ folder and eyeball them - closest distances are most likely you.")


if __name__ == "__main__":
    main()
