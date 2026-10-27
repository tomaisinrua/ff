---
name: book-series
description: Generate a 12-slide deadpan "vintage book" comedy carousel about a hobby, sport, job or subculture — chapter text, Instagram captions and image prompts, in the style of "When A Runner Discovers HYROX". Use when the user asks for a funny series, carousel, book-of, or "do one about X" for any topic where people get obsessed.
---

# Book Series Generator

Produces a complete 12-slide Instagram carousel in the "mock vintage book"
format: a cover plus eleven numbered chapters narrating, in total deadpan, how
an ordinary person's hobby ate their entire personality — while their partner
watches with a cup of tea.

Output is a ready-to-shoot pack: chapter text, captions, and one image prompt
per slide.

## Read first

- `references/formula.md` — the comedy engine. **Always read this.** The Six Laws
  and the 11-beat arc are the whole skill.
- `references/example-hyrox.md` — the source series, fully transcribed. Read it
  to calibrate density and restraint before writing a word.
- `references/image-prompts.md` — read before writing image prompts.

## Step 1 — Settle the inputs

You need four things. Infer what you can; ask only for what's genuinely missing
and would change the output.

| Input | Default if unstated |
|---|---|
| **Topic** | — must be supplied |
| **Who they were before** | The obvious adjacent identity ("a runner" → HYROX, "a cyclist" → Zwift, "a man with a kitchen" → sourdough) |
| **Character names** | Invent two posh British ones (see formula.md) |
| **Series name** | `THE <USER'S HANDLE> BOOK OF` — ask if you don't know it |

Don't interrogate. Topic alone is enough to start.

## Step 2 — Run the topic audit

**Do not write any chapters yet.** First mine the topic for raw material. Fill
this table in your head (or out loud if the user wants to see the workings) —
the audit is where the jokes actually come from. A series written without it
comes out generic.

| Beat | What to find in this topic |
|---|---|
| 1 Discovery | Where would a civilian first hear about this? Who mentions it? |
| 2 Vocabulary | **5–8 pieces of real jargon.** Must be genuine. Research if unsure. |
| 3 Expensive Thing | What do adherents pay for that is free at home or plainly absurd? |
| 4 Appearance | What do they start wearing, shaving, growing or removing? |
| 5 Gear | Which trivial item gets bought in multiples, with a taxonomy? |
| 6 Embarrassment | What must strangers witness? |
| 7 Documentation | How is it filmed, tracked, logged, posted, Strava'd, spreadsheeted? |
| 8 Recruitment | Who gets dragged in — partner, colleague, sibling, the group chat? |
| 9 The Event ⭐ | The race, comp, league night, bake, gig, summit. The real thing. |
| 10 New Identity | What do they now call themselves that they weren't before? |
| 11 Escalation | Where does it go next — cities, equipment, qualification, a van? |

If the topic has an obvious beat the template misses, swap it in for one of
beats 3–8. Beats 1, 2, 9, 10 and 11 stay where they are.

**Jargon is non-negotiable.** Real terms, used with total sincerity, are the
single biggest driver of shares — insiders laugh because it's accurate.
If you don't know a topic's vocabulary, look it up before writing.

## Step 3 — Write the eleven chapters

Follow the micro-structure in `formula.md`:

> behaviour → escalation → cost → observer's mundane alternative → sincere jargon defence → button

Hard rules while drafting:

- Present tense, third person, flat declarative. **Zero exclamation marks.**
- 5–7 lines per chapter. Longest line 16 words; aim for 7–11.
- Every chapter carries **at least one oddly specific number**. Not round ones —
  six, eleven, thirty-eight, twelve, £65.
- The Observer gets the last word roughly 70% of the time, and never raises her
  voice. Her alternative is always domestic and practical.
- The Enthusiast is **delighted, not pathetic.** Never mock him for being bad at
  it; mock him for how much he cares.
- **Chapter 9 is the warmth beat.** It ends sincerely — "Camilla has never seen
  him so happy." Without it the series reads as bullying. Do not skip it.
- Chapter 11 ends with the VOLUME 1 sting. Nobody learns anything.

Then write the cover: title stack, `VOLUME 1 — THE BEGINNING OF THE END`, and a
one-line tagline in the pattern *"A perfectly ordinary X discovers that Y is no
longer enough."*

## Step 4 — Write the captions

One per slide. Two or three short sentences that **restate the contrast** without
explaining the joke, then 1–2 emoji. Staccato fragments beat full sentences:

> Six headbands. Eleven minutes of exercise. Sweat management is apparently a
> very complicated science. 😂

Captions are the only place energy is allowed. The page text stays stone-faced.

## Step 5 — Write the image prompts

Read `references/image-prompts.md`, then write twelve prompts using its skeleton.

The two things people get wrong:

1. **Lock the character sentences.** Write each character's appearance once and
   paste that identical sentence into all twelve prompts, verbatim. Paraphrasing
   is what makes faces drift across a carousel.
2. **Put the written gag in the picture.** Six colour-coded headbands on the
   dresser; the wardrobe in a thought bubble; the twelve-page strategy on an
   easel. The image should be funny with the text covered up.

Also: the topic's wordmark on at least six objects per scene — the over-branding
is itself a joke about hobby culture.

## Step 6 — Deliver

Write the pack to `series/<topic-slug>/series.md` in the repo, structured as:

```
# <Series title>
Cast · Topic audit (one line per beat)
## Slide 1/12 — Cover
  Cover text · Caption · Image prompt
## Slide 2/12 — 1. <Chapter Title>
  Body lines · Caption · Image prompt
... through 12/12
```

Then give the user, in chat: the eleven chapter titles, two or three of the
strongest chapters in full, and the file path. Don't paste all twelve chapters
into chat — it buries the good ones.

## Self-check before delivering

Run this list. It catches almost everything.

- [ ] Every chapter has an oddly specific, non-round number
- [ ] Zero exclamation marks in body text
- [ ] No line over 16 words
- [ ] Jargon is real, verifiable, and used sincerely
- [ ] The Observer never nags, escalates or resents
- [ ] The Enthusiast never learns anything
- [ ] **Chapter 9 ends with genuine warmth**
- [ ] Chapter 11 escalates and promises Volume 2
- [ ] Character appearance sentences are byte-identical across all 12 prompts
- [ ] Each image prompt contains the chapter's visual gag as a prop

## Volume 2

If asked for more of an existing series, keep the cast and reuse the beats at a
higher intensity: the coach, the injury, the diet, the holiday ruined, the
equipment purchase that needs its own room, the one friend who has it worse.
Volume 2 opens where Volume 1 ended — already escalating, never resetting.
