# Croía's Faces

A collection for Croía, in the spirit of **Fiadh's Faces** (`/images`, style reference:
`images/edited_base_3218662726.jpeg`, the ink-wash landscape inside an arch-shaped face).

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
PLAYWRIGHT_PATH=$(npm root -g)/playwright node croia/src/paint.js 21 croia/images/croia_21.jpg
```
