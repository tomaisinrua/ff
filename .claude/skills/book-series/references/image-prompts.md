# The Visual Recipe

The look is doing half the work. A funny script on generic stock-photo slides
dies; this script on a fake Victorian book page kills. Keep the visuals rigid.

---

## The two templates

### A. The cover (slide 1 of 12)

Different from every other slide. Dark, bold, branded, loud.

- Aged **dark** book cover (near-black cloth/leather), worn corners, thin rule borders
- Title block in the topic's brand colours — HYROX uses **yellow on black**
- Stack: `THE <SERIES> BOOK OF` / `WHEN A <PERSON> DISCOVERS` / **`<TOPIC>`** (huge)
- Subtitle bar: `VOLUME 1 — THE BEGINNING OF THE END`
- Hero illustration: the Enthusiast mid-exertion, face contorted with effort/joy,
  the Observer at the edge of frame with arms folded
- Bottom rule + tagline in serif italic-weight caps:
  *"A perfectly ordinary runner discovers that running is no longer enough."*

### B. The chapter page (slides 2–12)

Identical treatment every time. Consistency is the gag.

- **Aged cream paper**, heavy foxing, brown water-staining, torn/crumbling edges,
  visible paper grain, slight page curl — a book left in a loft for sixty years
- Black serif type. Chapter number + title as a large heading: `3. The Sled Push`
- Body text below in smaller serif, 5–7 lines, generous leading
- A single framed **painterly illustration** occupying the lower 55–60%
- Horizontal rule at the foot with the **page number centred** (chapter number − 1)

---

## Illustration rules

Photorealistic-painterly — think a 1970s sports annual or a Ladybird book drawn
by someone who could really paint. Warm domestic light indoors; hard industrial
light in the gym.

**The Enthusiast.** Always mid-gesture, always *thrilled*. Wild sandy curls,
branded headband, wiry over-defined runner's physique, mouth open mid-explanation
or mid-scream. He is never drawn as sad or foolish — he is drawn as a man having
the best day of his life.

**The Observer.** Always in frame, always at the edge. Arms folded, or holding a
mug, or chin in hand. Normal clothes — jeans, striped jumper, cardigan. Expression
dialled to *mild weary affection*, never anger. She is the only calm object in
the composition.

**The onlookers.** From chapter 6 onwards, add 2–5 anonymous bystanders staring
flatly at the Enthusiast. They never react strongly. They just look.

**The branding gag.** The topic's logo is on *everything*, far past plausibility:
the shaker bottle, the shorts, the headband, the gym bag, the wall, the mug, the
shopping bags, the laptop, the socks. Over-branding is itself a punchline about
hobby culture. Ask for the wordmark on at least six separate objects per scene.

**Props carry the joke.** The written gag should be visible in the picture — the
six colour-coded headbands laid out on the dresser, the twelve-page strategy on
an easel, the wardrobe in a thought bubble, the checklist with four cities ticked.
If someone scrolls past the text, the image alone should still be funny.

---

## Prompt skeleton

Reuse verbatim, swapping the bracketed parts:

```
A page from an aged vintage book, heavily foxed cream paper with brown
water-staining, torn crumbling edges and visible paper grain. At the top in
large black serif type: "[N]. [Chapter Title]". Below it, [5-7] lines of smaller
black serif body text. Beneath the text, a framed painterly illustration in a
realistic 1970s sports-annual style:

[SCENE: who is doing what, where]. [ENTHUSIAST NAME], a wiry man in his forties
with wild sandy curls and a black [TOPIC] headband, [specific action], face
[expression]. [OBSERVER NAME], a woman with shoulder-length blonde hair in a
[cream striped jumper / jeans and cardigan], stands [position] with [arms folded
/ a mug of tea], looking [mildly unimpressed / weary].

[PROP DETAIL that carries the written joke]. The [TOPIC] wordmark appears on the
[list 5-6 objects]. [Lighting]. A horizontal rule at the foot of the page with
the page number "[N-1]" centred.
```

## Carousel consistency

Image models drift. Counter it:

1. **Lock the character descriptions.** Write both characters' appearance once and
   paste the *identical* sentence into all twelve prompts. Never paraphrase it.
2. **Lock the paper.** Same foxing/staining sentence every time, verbatim.
3. **Generate the cover last**, once the house style has settled.
4. **Reference-image chaining**, if your tool supports it: feed slide 2 back in as
   a style reference for 3–12.
5. **Batch in one session.** Model updates between sessions will visibly shift faces.
6. Square **1:1, 1080×1080** throughout. Instagram carousel native.

---

## Text-rendering reality check

Most image models still mangle long passages of text. Two viable routes:

**Route A — model renders everything.** Fastest. Accept that ~1 slide in 4 needs a
re-roll for a garbled word. Keep body lines short, which helps the model and the
joke simultaneously.

**Route B — model renders the illustration, you composite the type.** Generate the
aged-paper background plus illustration with *no text*, then lay the chapter title
and body over it in a serif face (EB Garamond, Playfair Display, Libre Baskerville
are all free and correct). Slower, perfect every time, and the body copy stays
editable. Use Route B if the series matters.
