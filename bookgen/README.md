# Book Series Generator

Turns any obsession into a 12-slide deadpan Instagram carousel in the "mock
vintage book" format — a cover plus eleven numbered chapters narrating how an
ordinary person's hobby ate their entire personality, while their partner
watches with a cup of tea.

Reverse-engineered from [@gary_b_runs](https://instagram.com/gary_b_runs)'
"When A Runner Discovers HYROX".

## Three ways in

**1. The Claude skill** — `.claude/skills/book-series/`

The full workflow. Say *"do a book series about golf"* in Claude Code and it
runs the topic audit, writes eleven chapters, captions and twelve image prompts,
then saves the pack to `series/<topic>/series.md`.

- `SKILL.md` — the workflow
- `references/formula.md` — the comedy engine: the Six Laws and the 11-beat arc
- `references/image-prompts.md` — the visual recipe and consistency tricks
- `references/example-hyrox.md` — the source series, fully transcribed

**2. This web app** — `bookgen/index.html`

No Claude needed. Enter a topic and two names, get a copy-paste pack in three
flavours: the writing prompt, the image prompt pack, or a blank beat sheet to
fill in yourself. Mobile-first, no build step, no dependencies.

**3. The worked example** — `series/padel/series.md`

A complete generated series, end to end, to show what good output looks like.

## The short version of the formula

1. **Deadpan, present tense, third person.** Zero exclamation marks.
2. **Specific numbers beat vague ones.** Six headbands, not several. Nothing lands on ten.
3. **The Observer never escalates.** Her weapon is the mundane alternative.
4. **The jargon must be real.** Insiders laugh because it's accurate.
5. **One sincere beat near the end.** Chapter 9, or it's just bullying.
6. **Escalate, never resolve.** Nobody learns anything.
