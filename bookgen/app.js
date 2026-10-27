// Builds copy-paste prompt packs for the "vintage book" carousel format.
// Formula reference: .claude/skills/book-series/references/formula.md

const POSH_HEROES = ['Sebastian', 'Jasper', 'Rupert', 'Giles', 'Tarquin', 'Miles', 'Barnaby', 'Hugo', 'Quentin', 'Crispin'];
const POSH_FOILS  = ['Camilla', 'Felicity', 'Arabella', 'Cressida', 'Henrietta', 'Clementine', 'Imogen', 'Davina', 'Rosamund', 'Perpetua'];

const BEATS = [
  ['The Discovery',       'Inciting incident, then instant overcommitment within hours'],
  ['The New Vocabulary',  'Jargon acquisition — he no longer speaks English'],
  ['The Expensive Thing', 'Pays money to do something that is free at home'],
  ['The Appearance',      'Clothing, hair or body changes to signal membership'],
  ['The Gear',            'Buys multiples of one trivial item, with a taxonomy'],
  ['The Embarrassment',   'Behaviour that strangers are forced to witness'],
  ['The Documentation',   'Recording the hobby overtakes doing the hobby'],
  ['The Recruitment',     'He inflicts it on another human being'],
  ['The Event',           'The real thing. Genuine joy. THE WARMTH BEAT — ends sincerely'],
  ['The New Identity',    'Relabels himself as something he was not last month'],
  ['The Next Obsession',  'Escalation, plus the VOLUME 1 sting. Nobody learns anything'],
];

const state = { mode: 'write' };

const $ = id => document.getElementById(id);

function vals() {
  const topic  = $('topic').value.trim()  || 'HYROX';
  const before = $('before').value.trim() || 'a runner';
  const hero   = $('hero').value.trim()   || 'Sebastian';
  const foil   = $('foil').value.trim()   || 'Camilla';
  const series = $('series').value.trim() || 'THE BOOK OF';
  return { topic, before, hero, foil, series, TOPIC: topic.toUpperCase() };
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function writePrompt(v) {
  return `Write a 12-slide Instagram carousel in the "mock vintage book" comedy format.

TOPIC:    ${v.topic}
BEFORE:   ${v.before}
CAST:     ${v.hero} (the Enthusiast) and ${v.foil} (the Observer, his partner)
TITLE:    ${v.series} WHEN ${v.before.toUpperCase()} DISCOVERS ${v.TOPIC}
          VOLUME 1 — THE BEGINNING OF THE END

THE PREMISE
An ordinary person discovers ${v.topic}, and it quietly eats their entire
personality, while someone who loves them watches with a cup of tea.

STEP 1 — TOPIC AUDIT (do this before writing anything)
For ${v.topic}, work out:
  · 5-8 pieces of REAL jargon that insiders actually use
  · What adherents pay for that is free or absurd at home
  · What they start wearing / shaving / growing
  · Which trivial item gets bought in multiples
  · What strangers are forced to witness
  · How it gets filmed, tracked, logged or posted
  · Who else gets dragged in
  · The event: the race, comp, league night, bake, gig
  · What they now call themselves

STEP 2 — WRITE 11 CHAPTERS on these beats, in this order:
${BEATS.map((b, i) => `  ${i + 1}. ${b[0]} — ${b[1]}`).join('\n')}

CHAPTER MICRO-STRUCTURE (5-7 short lines, each on its own line)
  1. The behaviour     — flat statement of the new madness
  2. The escalation    — absurdly specific detail
  3. The cost          — money, time or dignity, stated plainly
  4. ${v.foil} — says the obvious, devastating, domestic thing
  5. The defence       — ${v.hero} justifies it with sincere jargon
  6. The button        — optional final kill

RULES — these are not suggestions
  · Present tense, third person, flat declarative. ZERO exclamation marks.
  · Longest line 16 words. Aim for 7-11. One breath per line.
  · Every chapter needs an oddly specific, NON-ROUND number.
    Six headbands. Eleven minutes. Twelve pages. £65. Thirty-eight minutes.
    Nothing lands on ten.
  · Jargon must be REAL. Never invent silly fake terms — the real ones are
    already ridiculous.
  · ${v.foil} never nags, never shouts, never resents. Her weapon is the
    mundane alternative: the thing he could do at home, for free, like a
    normal person.
  · ${v.hero} is DELIGHTED, never pathetic. Mock how much he cares, never
    how bad he is at it.
  · ${v.foil} gets the last word about 70% of the time. When ${v.hero}
    gets it, it should be unintentionally revealing.
  · CHAPTER 9 IS THE WARMTH BEAT. All the mocked behaviour happens at once,
    and the last line turns sincere — "${v.foil} has never seen him so
    happy." Without this the series is just bullying. Do not skip it.
  · Chapter 11 escalates and promises Volume 2. Nobody learns anything.

STEP 3 — CAPTIONS
One per slide. Two or three staccato sentences restating the contrast, never
explaining the joke, then 1-2 emoji. Captions are the only place energy is
allowed — the page text stays stone-faced. Example:
  "Six headbands. Eleven minutes of exercise. Sweat management is apparently
   a very complicated science. 😂"

STEP 4 — COVER
Title stack, the VOLUME 1 line, and a tagline in the pattern:
  "A perfectly ordinary ${v.before.replace(/^an? /, '')} discovers that
   [old thing] is no longer enough."

OUTPUT
Slide 1/12 cover, then slides 2/12 to 12/12 as chapters 1-11. For each: the
body lines, then the caption.`;
}

function imagePrompt(v) {
  const heroDesc = `${v.hero}, a wiry man in his forties with wild sandy curls and a black ${v.topic} headband`;
  const foilDesc = `${v.foil}, a woman with shoulder-length blonde hair in a cream striped jumper and jeans`;

  return `IMAGE PROMPT PACK — ${v.TOPIC}

Generate 12 square 1080x1080 images. Slides 2-12 use Template B. Slide 1 uses
Template A. Generate the cover LAST, once the house style has settled.

━━ LOCKED SENTENCES ━━
Paste these VERBATIM into every prompt. Do not paraphrase — paraphrasing is
what makes faces drift across a carousel.

  ENTHUSIAST: ${heroDesc}
  OBSERVER:   ${foilDesc}
  PAPER:      heavily foxed cream paper with brown water-staining, torn
              crumbling edges and visible paper grain

━━ TEMPLATE B — CHAPTER PAGE (slides 2-12) ━━

A page from an aged vintage book, [PAPER]. At the top in large black serif
type: "[N]. [Chapter Title]". Below it, [5-7] lines of smaller black serif
body text. Beneath the text, a framed painterly illustration in a realistic
1970s sports-annual style:

[SCENE — who is doing what, where]. [ENTHUSIAST], [specific action], face
[thrilled / contorted with effort / mid-explanation]. [OBSERVER] stands at the
edge of frame with [arms folded / a mug of tea], looking mildly unimpressed.

[PROP DETAIL that carries the written joke]. The ${v.TOPIC} wordmark appears on
the shaker bottle, the shorts, the headband, the gym bag, the wall and the mug.
[Lighting]. A horizontal rule at the foot of the page with the page number
"[N-1]" centred.

━━ TEMPLATE A — COVER (slide 1) ━━

An aged dark book cover, near-black worn cloth with thin rule borders and
battered corners. Title in bold [BRAND COLOUR] serif caps:
  "${v.series}" / "WHEN ${v.before.toUpperCase()} DISCOVERS" / "${v.TOPIC}" (huge)
A bar beneath reads "VOLUME 1 — THE BEGINNING OF THE END".
Hero illustration: [ENTHUSIAST] mid-exertion, mouth open, face contorted with
effort. [OBSERVER] at the left edge, arms folded, entirely unimpressed. A
sidebar lists the topic's verbs in caps. A rule at the foot with the tagline in
serif caps.

━━ RULES ━━
· ${v.hero} is always mid-gesture and always THRILLED — never sad, never foolish.
· ${v.foil} is always in frame, always at the edge, always calm. Weary
  affection, never anger. She is the only still object in the composition.
· From chapter 6 on, add 2-5 anonymous bystanders staring flatly.
· OVER-BRAND EVERYTHING. The ${v.TOPIC} wordmark on at least six objects per
  scene — bottle, shorts, bag, wall, mug, socks. The over-branding is itself
  the joke about hobby culture.
· THE IMAGE MUST BE FUNNY WITH THE TEXT COVERED UP. Put the written gag in the
  picture as a prop: the six colour-coded headbands laid out on the dresser,
  the wardrobe in a thought bubble, the twelve-page strategy on an easel.

━━ CONSISTENCY ━━
· Batch all 12 in one session — model updates between sessions shift faces.
· Chain slide 2 back in as a style reference for 3-12 if your tool allows it.
· If the model mangles long text, generate the illustration and aged paper with
  NO TEXT, then composite the type yourself in EB Garamond, Playfair Display or
  Libre Baskerville. Slower, perfect every time, body copy stays editable.`;
}

function beatSheet(v) {
  const rows = BEATS.map((b, i) => {
    const star = i === 8 ? '  ⭐ WARMTH BEAT — must end sincerely' : '';
    return `${String(i + 1).padStart(2, ' ')}. ${b[0]}${star}\n    ${b[1]}\n    For ${v.topic}: ________________________________________\n`;
  }).join('\n');

  return `BEAT SHEET — ${v.TOPIC}
Cast: ${v.hero} (Enthusiast) · ${v.foil} (Observer)

Fill the blanks BEFORE writing a word. The audit is where the jokes come from;
a series written without it comes out generic.

${rows}
━━ JARGON BANK ━━
5-8 real terms insiders actually use. Research them — never invent fake ones.
  1. ______________________  5. ______________________
  2. ______________________  6. ______________________
  3. ______________________  7. ______________________
  4. ______________________  8. ______________________

━━ NUMBER BANK ━━
One oddly specific, non-round number per chapter. Nothing lands on ten.
  ______  ______  ______  ______  ______  ______
  ______  ______  ______  ______  ______

━━ ${v.foil.toUpperCase()}'S ALTERNATIVES ━━
The mundane, domestic, free-at-home thing she suggests instead.
  · ______________________________________________
  · ______________________________________________
  · ______________________________________________`;
}

// ── Wiring ───────────────────────────────────────────────────────────────────

const TITLES = {
  write:  ['Writing prompt',     'Paste into Claude or ChatGPT.'],
  images: ['Image prompt pack',  'Paste into your image model. Generate the cover last.'],
  beats:  ['Beat sheet',         'Fill the blanks before writing anything.'],
};

function render() {
  const v = vals();
  const build = { write: writePrompt, images: imagePrompt, beats: beatSheet }[state.mode];
  $('out').value = build(v);
  $('out-title').textContent = TITLES[state.mode][0];
  $('out-hint').textContent  = TITLES[state.mode][1];
}

['topic', 'before', 'hero', 'foil', 'series'].forEach(id =>
  $(id).addEventListener('input', render));

document.querySelectorAll('.vibe').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vibe').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    render();
  });
});

$('roll').addEventListener('click', () => {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  $('hero').value = pick(POSH_HEROES);
  $('foil').value = pick(POSH_FOILS);
  render();
});

$('copy').addEventListener('click', async () => {
  const btn = $('copy');
  try {
    await navigator.clipboard.writeText($('out').value);
  } catch {
    $('out').select();
    document.execCommand('copy');
  }
  btn.textContent = 'Copied';
  btn.classList.add('done');
  setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1400);
});

render();
