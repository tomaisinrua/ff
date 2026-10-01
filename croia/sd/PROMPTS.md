# Croía's Faces — Stable Diffusion prompt list

Made from `../images/croia_00.jpg` with img2img. The styles mirror the families
in Fiadh's 117 (the numbers in brackets are example Fiadh images, by their index
in `/images.json`), so the two collections pair up style for style.

## Quick route — the Fiadh workflow (inpaint + style only)

This is how Fiadh's Faces was made: image 0 in A1111's **Inpaint** tab, with just a style as the prompt.

1. **img2img → Inpaint**, and upload `croia/images/croia_00.jpg`.
2. **Mask:** paint over the whole image with the brush, or skip the brush and use
   **Inpaint upload** with one of these masks:
   - `mask_whole_image.png`: everything can change, background included (like Fiadh's
     concrete walls and desert skies).
   - `mask_face_only.png`: only the face changes, and the sage background and frame stay.
3. Settings:

   | Setting | Value |
   |---|---|
   | Mask mode | Inpaint masked |
   | Masked content | **original** (this keeps the layout) |
   | Inpaint area | Whole picture |
   | Denoising | 0.55–0.65 (lower = closer to the base) |

4. **Prompt:** just the style, e.g. `Japanese sumi-e`. The one difference from Fiadh is to
   add **`closed eyes`**. Fiadh's image 0 has one eye open, so SD had nothing to "fix".
   Croía's eyes are closed, and SD will often try to open them. Put `open eyes, pupils` in
   the negative prompt too.
5. **Batch:** `prompts_style_only.txt` has all 40 styles as short lines ("style, sleeping
   baby, closed eyes"). Load it with **Script → Prompts from file or textbox** in the
   Inpaint tab. Each plain line is used as the prompt, and the negative prompt comes from
   the UI box.

If the quick route gives results you like, you're done. The detailed prompts below are for
styles that come out weak, or for faces where SD keeps opening her eyes (add ControlNet then).

---

## Detailed route — full prompts

### Setup

| Setting | Value | Why |
|---|---|---|
| Init image | `croia/images/croia_00.jpg` | The base face |
| Size | 1024×1024 (SDXL) or 768×768 (SD 1.5) | Matches the Fiadh set |
| Denoising | Per style below; **0.45–0.65** is the sweet spot | Above ~0.7 SD redraws the face and opens her eyes |
| CFG | 6–7 | |
| Steps | 30–40 | |
| Sampler | DPM++ 2M Karras | |
| ControlNet (recommended) | `sd/croia_00_lineart.png`, **lineart** model, preprocessor **invert** (or use `croia_00_lineart_inverted.png` with preprocessor **none**), weight **0.6–0.8**, end step 0.8 | Locks the closed eyes, cheeks, curl and heart, even at high denoising |
| Seeds | Try 4 per prompt, keep the best | |

## Shared text

Append to **every** positive prompt:

```
face inside a rounded arch frame, symmetrical face split down the centre line, closed sleeping eyes, chubby round cheeks, small button nose, pursed rosebud lips, newborn baby, masterpiece, highly detailed
```

**Negative prompt** (use for all):

```
open eyes, eyeballs, pupils, iris, staring, adult, wrinkles, teeth, frown lines, extra eyes, extra nose, deformed, blurry, lowres, jpeg artifacts, watermark, signature, text, logo, frame cropped, cut off
```

> The key word is **closed sleeping eyes** in the positive and **open eyes, pupils** in the negative. SD loves to wake babies up.

---

## 1. Sumi-e / ink wash (Fiadh 0, 1, 2, 11, 21, 51, 58, 86, 115) · denoise 0.6–0.7

1. `traditional Chinese sumi-e ink wash painting, misty mountains and pine trees inside the face, aged rice paper, teal and ochre washes, red sun cheeks, calligraphy and red seal stamp in the corner`
2. `Japanese suibokuga landscape painting, sleeping mountain face, soft mist valleys for eyelids, lone pine on a cliff, faded parchment, indigo and gold ink`
3. `ink and watercolour on silk scroll, lake at dawn forming a sleeping face, reflections, wandering cranes, muted jade and rust tones, visible brush texture`
4. `zen sumi-e minimalism, few confident black ink brushstrokes, huge empty cream paper, one red cheek circle, enso circle frame`

## 2. Street stencil art (Fiadh 4, 5, 18, 31, 46, 53, 82, 102) · denoise 0.55–0.65

5. `stencil street art mural on a weathered concrete wall, black spray-paint stencil of a small child holding a red heart balloon in front of a bright multicolour mosaic face, paint drips, urban grit`
6. `graffiti stencil on grey concrete, rainbow pastel geometric face, little girl silhouette releasing a flock of balloons, dripping spray paint, pavement debris`
7. `urban street art, spray-painted stencil of a sleeping baby face on a brick wall, a red heart floating above, posters peeling, raw and poetic`

## 3. Bauhaus / abstract geometry (Fiadh 6, 10, 14, 22, 50, 78, 83, 100, 113) · denoise 0.5–0.6

8. `Bauhaus poster, bold primary colour blocks, circles and semicircles, clean geometric face, Kandinsky-inspired composition, flat colour, paper texture`
9. `Orphism in the style of Sonia Delaunay, concentric colour discs for cheeks, rhythmic circles, vivid red blue yellow and green, joyous abstraction`
10. `mid-century modern abstract, Mondrian grid meets soft circles, cream background, mustard, teal and coral panels, Scandinavian print`
11. `Swiss modernist screenprint, overlapping transparent colour shapes, halftone dots, limited palette of pink, navy and gold`
12. `colourful confetti geometry, Matisse paper cut-outs, playful dancing shapes around the face, bright gouache colours`

## 4. Minimal line art / blueprint (Fiadh 3, 12, 16, 23, 30, 57, 71, 99, 114) · denoise 0.4–0.5

13. `minimalist continuous single gold line drawing of a sleeping baby face on textured olive paper, elegant, lots of negative space`
14. `architectural blueprint of a face, fine white technical lines on cyanotype blue paper, measurement marks, construction circles`
15. `glowing neon green line art face on dark green felt board, thin luminous strokes, minimal`
16. `pencil sketch on aged tan paper, faint construction lines, graphite shading on the cheeks, artist's study`
17. `fine gold leaf inlay lines on dark slate, luxurious minimal Art Deco face, one small red heart`

## 5. Surrealism / golden sculpture (Fiadh 7, 8, 34, 35, 37, 56, 65, 92, 112) · denoise 0.6–0.7

18. `surrealist oil painting in the style of Salvador Dalí, giant golden sculpted sleeping baby face resting in a vast desert, melting clouds, long shadows, tiny figure walking below`
19. `René Magritte surrealism, sleeping face made of blue sky and white clouds, bowler hat floating, calm dreamlike stillness`
20. `polished bronze statue of a sleeping infant face, patina green and gold, museum lighting on dark background, sculptural realism`
21. `jade carving of a sleeping baby face, translucent green stone, intricate relief, soft rim light`

## 6. Dark and Art Deco (Fiadh 9, 40, 47, 64) · denoise 0.5–0.6

22. `Art Deco poster, navy and gold, geometric sunburst behind the face, elegant 1920s luxury, symmetrical`
23. `dark moody midnight palette, deep navy panels with a single glowing peach cheek, gold outlines, chiaroscuro`
24. `stained glass window, lead lines, jewel-toned glass of ruby, sapphire and emerald, light streaming through, cathedral glow`

## 7. Pop and graphic (Fiadh 62, 67, 73) · denoise 0.55–0.65

25. `pop art in the style of Andy Warhol, four-colour screenprint, hot pink, cyan and yellow, bold outlines, Ben-Day dots`
26. `Keith Haring style, thick black outlines, dancing figures and radiating lines around the face, bright flat colours`
27. `abstract expressionist drip painting, Jackson Pollock splatters in red, yellow and cyan over a black ground, the face emerging from the chaos`
28. `Roy Lichtenstein comic panel, halftone dots, speech-bubble-free, dramatic primary colours, crisp black ink`

## 8. Painterly and textured (Fiadh 25, 41, 43, 79, 95) · denoise 0.55–0.65

29. `Picasso cubism, fragmented planes, face seen from multiple angles, muted ochre, olive and blue, oil on canvas`
30. `pointillism in the style of Georges Seurat, thousands of tiny colour dots, soft impressionist light`
31. `Gustav Klimt golden period, gold leaf, ornate spirals and mosaic patterns, sleeping baby, Byzantine richness`
32. `Van Gogh swirling brushstrokes, thick impasto, starry night blues and yellows around the face`
33. `Irish illuminated manuscript, Book of Kells Celtic knotwork border, interlaced spirals, vellum, lapis blue and gold leaf`

## 9. Croía's own (new — no Fiadh match)

These give her collection a few pieces Fiadh's doesn't have.

34. `Celtic spiral stone carving, sleeping face carved into ancient Newgrange limestone, triskele cheeks, moss and lichen, soft Irish daylight`
35. `soft pastel nursery watercolour, dreamy clouds and tiny stars, blush pink and lilac, gentle and tender, children's book illustration`
36. `embroidered textile, cross-stitch and satin stitch on linen, pastel threads, a stitched red heart, handcrafted`
37. `Atlantic seascape from Loop Head, sleeping face formed by sea cliffs and waves, wild coastal light, ocean spray, oil painting`
38. `ceramic tile mosaic, glazed pastel tiles, grout lines following the face panels, Mediterranean sunlight`
39. `paper quilling art, rolled paper strips in pastel colours, 3D relief, soft shadows`
40. `night lullaby, deep navy sky, the face made of a crescent moon and stars, golden constellation lines, sleepy and calm`

---

## Batch file

Three files hold all 40 prompts in the format of AUTOMATIC1111's **"Prompts from file or
textbox"** script (img2img tab → Script). The shared text and the negative prompt are already
filled in. They're split by denoising strength, so set the img2img slider to match the file,
load it and press Generate:

| File | Denoising | Styles | Prompts |
|---|---|---|---|
| `prompts_denoise_0.45.txt` | 0.45 | Minimal line art | 5 |
| `prompts_denoise_0.55.txt` | 0.55 | Street stencil, Bauhaus, dark and Deco, pop, painterly, Croía's own | 27 |
| `prompts_denoise_0.65.txt` | 0.65 | Sumi-e, surrealism | 8 |

In ComfyUI, feed the same lines through a text-list or batch-prompt node.

## Notes

- **Selling prints:** prompts that name artists ("in the style of Dalí/Warhol/Klimt…")
  are common, and most of those artists died long ago. For a shop, prefer describing the
  style over naming living artists. The street-art prompts here describe the style and
  don't name anyone.
- **If a style ignores the layout:** raise the ControlNet weight before lowering the
  denoising. Lowering the denoising keeps the layout, but the result looks like the base
  face with a filter over it.
- **Naming outputs:** `croia_<nn>_<style>.jpg` (e.g. `croia_18_dali.jpg`) makes the
  collection easy to sort into style sections later, like AnEye4AI's.
