# Croía's Faces

A collection for Croía, in the spirit of **Fiadh's Faces**.

**Base face:** `images/croia_00.jpg` (`src/face.js`), made in the style of Fiadh's image 0:
a flat pastel geometric face, split down the middle, in a stadium frame on sage. Croía's
features: dark hair with a curl, sleeping eyes with lashes, big round rosy cheeks, button
nose, pursed rosebud lips, round chin, and a small heart (croí). Like Fiadh's set, the
variations are meant to be made from this base with Stable Diffusion img2img.

**Early variation:** `images/croia_21.jpg` (`src/paint.js`), a sumi-e ink landscape
modelled on one of Fiadh's SD variations (not the base). It's described below.

Each piece hides Croía's newborn face in a sumi-e landscape:

| Feature        | In the landscape                              |
|----------------|-----------------------------------------------|
| Dark hair      | Ink pine ridge across the crown               |
| Closed eyes    | Two long mountain ridgelines with mist below  |
| Button nose    | Pale moon glow                                |
| Rosy cheeks    | Red suns on the cheek hills                   |
| Pursed lips    | Crimson bow reflected in a lake               |
| Inscription    | "Croía" in Ogham + a red "C" seal             |

## Generating

Pieces are painted procedurally (SVG + filters, rendered by headless Chromium).
The seed makes each render reproducible.

```sh
export PLAYWRIGHT_PATH=$(npm root -g)/playwright
node croia/src/face.js croia/images/croia_00.jpg          # base face (jpg + svg)
python3 croia/src/lineart.py && node croia/src/render.js \
  croia/sd/croia_00_lineart.svg croia/sd/croia_00_lineart_inverted.svg   # ControlNet maps
PLAYWRIGHT_PATH=$(npm root -g)/playwright node croia/src/paint.js 21 croia/images/croia_21.jpg
```
