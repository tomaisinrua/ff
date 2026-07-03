// ── Platform prompts ──────────────────────────────────────────────────────────
const PLATFORM_META = {
  instagram: {
    label: '📸 Instagram',
    instructions: `Write an Instagram post for this artwork.

Output exactly these sections:
CAPTION
(Engaging 3-4 sentence caption. Lead with emotion or visual storytelling. End with a question or invitation. 150-200 words.)

HASHTAGS
(30 highly relevant hashtags mixing: niche art tags, AI art community, print/home decor buyers, broader discovery tags. One line.)

STORY IDEA
(One sentence idea for an Instagram Story to accompany this post.)`,
  },
  pinterest: {
    label: '📌 Pinterest',
    instructions: `Write Pinterest content for this artwork.

Output exactly these sections:
PIN TITLE
(Keyword-rich, 50-100 chars, great for SEO — what buyers would search for)

PIN DESCRIPTION
(150-300 word description. Front-load keywords. Mention: the art style, the emotional story, suitable room settings, what the print looks like in a home. End with a soft CTA.)

BOARD SUGGESTIONS
(3-5 board names this pin would perform well in)`,
  },
  facebook_ad: {
    label: '📣 Facebook Ad',
    instructions: `Write a Facebook/Instagram paid ad for this artwork.

Output exactly these sections:
PRIMARY TEXT
(Hook + story + offer. 100-150 words. Build desire then address objections.)

HEADLINE
(Max 40 chars. Punchy, benefit-led.)

DESCRIPTION
(Max 30 chars. Supports the headline.)

CTA BUTTON
(One of: Shop Now / Learn More / Get Offer)

TARGETING NOTES
(3-5 bullet audience suggestions: interests, demographics, behaviours)`,
  },
  google_ad: {
    label: '🔍 Google Ad',
    instructions: `Write a Google Search Ad for this artwork (Responsive Search Ad format).

Output exactly these sections:
HEADLINES (write 5, max 30 chars each)
(Number them 1-5)

DESCRIPTIONS (write 3, max 90 chars each)
(Number them 1-3)

KEYWORDS
(10-15 keyword phrases a buyer would search, comma-separated)`,
  },
  email: {
    label: '✉️ Email campaign',
    instructions: `Write a marketing email for this artwork.

Output exactly these sections:
SUBJECT LINE
(Under 50 chars, curiosity-driving, avoid spam words)

PREHEADER
(Under 85 chars, complements the subject)

EMAIL BODY
(Full email, ~300 words. Start with a personal hook about the story behind the art. Build desire. Include a clear CTA button text. Use short paragraphs and a warm, personal tone.)

CTA BUTTON TEXT
(5-7 words)`,
  },
  press: {
    label: '📰 Press pitch',
    instructions: `Write a press/media pitch for this art collection.

Output exactly these sections:
SUBJECT LINE
(Compelling, journalistic, under 60 chars)

PITCH BODY
(200-250 words. Who, what, why it's newsworthy. Target: art blogs, parenting/lifestyle media, AI art outlets. Lead with the human story. Include a quote from the artist. Offer image access.)

SUGGESTED OUTLETS
(5 specific publication names this pitch suits)`,
  },
};

const TONES = {
  emotional:  'Tone: deeply emotional, personal, intimate — this art comes from the love of a parent for a newborn.',
  artistic:   'Tone: sophisticated and art-world credible — speak to collectors and art enthusiasts who appreciate AI as a medium.',
  commercial: 'Tone: conversion-focused and clear — speak to home décor buyers who want beautiful, unique statement pieces.',
  minimal:    'Tone: spare and poetic — few words, high impact. Let white space do the work.',
};

const COLLECTION_CONTEXT = `
Collection: "Fiadh's Faces"
Artist background: The artist photographed their newborn daughter Fiadh in her first days of life, then used Stable Diffusion (AI image generation) to transform those intimate photos into a series of abstract artworks — masks, geometric faces, ink paintings, street art figures, surrealist portraits. Each piece is a different artistic interpretation of the same extraordinary new person.
Products: Available as fine art giclée prints, canvas prints, and posters. Sizes from 8×8" to 24×24". Printed to order.
Unique selling points: Deeply personal origin story. AI art as a new medium. Limited edition. Conversation-starting home décor. Perfect gift for parents, grandparents, art lovers.
`;

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  images: [],
  selectedImage: null,
  platform: 'instagram',
  tone: 'emotional',
  apiKey: localStorage.getItem('claude_api_key') || '',
  history: [],
  lastOutput: '',
};

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  await loadImages();
  wireEvents();
  updatePlatformTitle();
});

async function loadImages() {
  try {
    const res = await fetch('../images.json');
    state.images = await res.json();
    renderPicker();
  } catch (e) {
    $('image-picker').innerHTML = '<div class="picker-loading">Could not load images</div>';
  }
}

function renderPicker() {
  const picker = $('image-picker');
  picker.innerHTML = '';
  state.images.forEach(fname => {
    const img = document.createElement('img');
    img.src = `../images/${fname}`;
    img.alt = fname;
    img.className = 'picker-img';
    img.loading = 'lazy';
    img.addEventListener('click', () => selectImage(fname, img));
    picker.appendChild(img);
  });
}

function selectImage(fname, el) {
  document.querySelectorAll('.picker-img').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedImage = fname;
  $('preview-img').src = `../images/${fname}`;
  $('preview-name').textContent = fname.slice(0, 28) + '…';
  $('selected-preview').hidden = false;
}

// ── Events ────────────────────────────────────────────────────────────────────
function wireEvents() {
  // Platform
  document.querySelectorAll('[data-platform]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-platform]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.platform = btn.dataset.platform;
      updatePlatformTitle();
    });
  });

  // Tone
  document.querySelectorAll('[data-tone]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tone]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tone = btn.dataset.tone;
    });
  });

  // Generate
  $('generate-btn').addEventListener('click', generate);
  $('batch-btn').addEventListener('click', batchGenerate);

  // Output actions
  $('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(state.lastOutput);
    $('copy-btn').textContent = 'Copied!';
    setTimeout(() => $('copy-btn').textContent = 'Copy', 1800);
  });
  $('export-btn').addEventListener('click', exportTxt);
  $('regen-btn').addEventListener('click', generate);

  // API key
  $('api-key-btn').addEventListener('click', () => {
    $('key-input').value = state.apiKey;
    $('key-overlay').hidden = false;
  });
  $('key-save').addEventListener('click', () => {
    state.apiKey = $('key-input').value.trim();
    localStorage.setItem('claude_api_key', state.apiKey);
    $('key-overlay').hidden = true;
  });
  $('key-cancel').addEventListener('click', () => { $('key-overlay').hidden = true; });
}

function updatePlatformTitle() {
  $('output-platform-title').textContent = PLATFORM_META[state.platform].label;
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function generate() {
  if (!state.apiKey) {
    $('key-overlay').hidden = false;
    return;
  }
  if (!state.selectedImage) {
    alert('Select an artwork from the grid first.');
    return;
  }

  showSpinner();
  $('output-actions').hidden = true;

  const shopUrl = $('shop-url').value.trim();
  const prompt = buildPrompt(shopUrl);

  try {
    const text = await callClaude(prompt);
    state.lastOutput = text;
    renderOutput(text);
    addToHistory(text);
    $('output-actions').hidden = false;
  } catch (e) {
    showError(e.message);
  }
}

function buildPrompt(shopUrl) {
  const platform = PLATFORM_META[state.platform];
  const tone     = TONES[state.tone];
  const shopLine = shopUrl ? `Shop URL: ${shopUrl}` : 'Shop URL: (not set yet — use placeholder [SHOP_URL] where needed)';

  return `You are an expert art marketing copywriter specialising in limited-edition prints and AI-generated artwork.

${COLLECTION_CONTEXT}
${shopLine}

${tone}

The specific artwork being marketed: "${state.selectedImage}" — a piece from the Fiadh's Faces collection.

${platform.instructions}

Write only the content. No preamble, no meta-commentary. Use the exact section headers specified.`;
}

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// ── Batch generate ────────────────────────────────────────────────────────────
async function batchGenerate() {
  if (!state.apiKey || !state.selectedImage) {
    alert(!state.apiKey ? 'Set your API key first.' : 'Select an artwork first.');
    return;
  }

  const platforms = Object.keys(PLATFORM_META);
  showSpinner('Generating all platforms… (this takes ~30 seconds)');

  const results = {};
  for (const p of platforms) {
    state.platform = p;
    const shopUrl = $('shop-url').value.trim();
    try {
      results[p] = await callClaude(buildPrompt(shopUrl));
    } catch (e) {
      results[p] = `Error: ${e.message}`;
    }
  }

  const combined = platforms.map(p =>
    `${'='.repeat(60)}\n${PLATFORM_META[p].label.toUpperCase()}\n${'='.repeat(60)}\n\n${results[p]}`
  ).join('\n\n\n');

  state.lastOutput = combined;
  renderOutput(combined);
  addToHistory(combined, 'ALL PLATFORMS');
  $('output-actions').hidden = false;
}

// ── Output rendering ──────────────────────────────────────────────────────────
function renderOutput(text) {
  const area = $('output-area');
  area.classList.remove('streaming');
  area.innerHTML = '';

  // Parse sections (lines that are ALL CAPS with optional leading emoji)
  const lines = text.split('\n');
  let currentSection = null;
  let bodyLines = [];

  function flushSection() {
    if (!currentSection) return;
    const div = document.createElement('div');
    div.className = 'output-section';
    div.innerHTML = `<div class="output-section-title">${currentSection}</div><div class="output-section-body">${escHtml(bodyLines.join('\n').trim())}</div>`;
    area.appendChild(div);
    bodyLines = [];
  }

  lines.forEach(line => {
    const isSectionHeader = /^[A-Z][A-Z\s\/\(\)]+$/.test(line.trim()) && line.trim().length > 3;
    if (isSectionHeader) {
      flushSection();
      currentSection = line.trim();
    } else if (line.startsWith('===')) {
      flushSection();
      const div = document.createElement('div');
      div.style.cssText = 'border-top:1px solid var(--border);margin:20px 0;';
      area.appendChild(div);
    } else {
      bodyLines.push(line);
    }
  });
  flushSection();

  if (!area.children.length) {
    area.textContent = text; // Fallback plain text
  }
}

function showSpinner(msg = 'Writing copy…') {
  const area = $('output-area');
  area.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><div class="spinner-label">${escHtml(msg)}</div></div>`;
}

function showError(msg) {
  const area = $('output-area');
  area.innerHTML = `<div class="spinner-wrap" style="color:var(--error)">⚠ ${escHtml(msg)}</div>`;
}

// ── History ───────────────────────────────────────────────────────────────────
function addToHistory(text, label) {
  const entry = {
    platform: label || PLATFORM_META[state.platform].label,
    text,
    image: state.selectedImage,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  state.history.unshift(entry);
  renderHistory();
}

function renderHistory() {
  if (!state.history.length) return;
  $('history-section').hidden = false;
  const list = $('history-list');
  list.innerHTML = '';
  state.history.slice(0, 10).forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-header">
        <span class="history-platform">${escHtml(entry.platform)}</span>
        <span class="history-time">${entry.time}</span>
      </div>
      <div class="history-preview">${escHtml(entry.text.slice(0, 80))}</div>`;
    item.addEventListener('click', () => {
      state.lastOutput = entry.text;
      renderOutput(entry.text);
      $('output-actions').hidden = false;
    });
    list.appendChild(item);
  });
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportTxt() {
  const blob = new Blob([state.lastOutput], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fiadhs-faces_${state.platform}_${Date.now()}.txt`;
  a.click();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
