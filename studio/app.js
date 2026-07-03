// ── Style presets ─────────────────────────────────────────────────────────────
const STYLES = {
  ink: {
    prompt: 'traditional Chinese ink wash painting, oval composition, overlapping circles, teal and gold tones, aged paper texture, calligraphy brushwork, watercolor washes, serene and meditative',
    negative: 'ugly, blurry, low quality, watermark, text, photo, realistic',
  },
  geometric: {
    prompt: 'geometric abstract face, bold primary colors, cubist oval shapes, bauhaus style, flat graphic design, colorful mosaic, clean graphic art',
    negative: 'ugly, blurry, low quality, realistic, photo, watermark',
  },
  street: {
    prompt: 'street art stencil graffiti on concrete wall, Banksy style, bold black and white with subtle color accents, weathered urban texture, spray paint',
    negative: 'ugly, blurry, low quality, watermark, digital art, painting',
  },
  lineart: {
    prompt: 'minimal elegant line art, thin gold lines on dark background, oval mask shape, symmetrical face geometry, Art Nouveau, sacred geometry',
    negative: 'ugly, blurry, low quality, photo, realistic, colorful, watermark',
  },
  surreal: {
    prompt: 'surrealist painting, dreamlike face emerging from golden sky with clouds, cosmic planets, dramatic light, Federico Solmi style, painterly',
    negative: 'ugly, blurry, low quality, photo, watermark, text',
  },
  custom: {
    prompt: '',
    negative: 'ugly, blurry, low quality, watermark',
  },
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
  apiUrl: localStorage.getItem('sd_api_url') || '',
  photoB64: null,
  style: 'ink',
  results: [],   // { b64, seed }
  abortController: null,
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const apiUrlInput    = $('api-url');
const configToggle   = $('config-toggle');
const configPanel    = $('config-panel');
const testBtn        = $('test-btn');
const apiStatus      = $('api-status');
const uploadZone     = $('upload-zone');
const zoneInner      = $('zone-inner');
const photoInput     = $('photo-input');
const styleGrid      = $('style-grid');
const promptTA       = $('prompt');
const negPromptTA    = $('negative-prompt');
const strengthSlider = $('strength');
const stepsSlider    = $('steps');
const cfgSlider      = $('cfg');
const batchSlider    = $('batch');
const strengthVal    = $('strength-val');
const stepsVal       = $('steps-val');
const cfgVal         = $('cfg-val');
const batchVal       = $('batch-val');
const seedInput      = $('seed');
const diceBtn        = $('dice-btn');
const generateBtn    = $('generate-btn');
const genLabel       = $('gen-label');
const resultsGrid    = $('results-grid');
const resultsActions = $('results-actions');
const tileBtn        = $('tile-btn');
const dlAllBtn       = $('dl-all-btn');
const tileOutput     = $('tile-output');
const tileCanvas     = $('tile-canvas');
const dlTileBtn      = $('dl-tile-btn');
const progressOverlay= $('progress-overlay');
const progressLabel  = $('progress-label');
const cancelBtn      = $('cancel-btn');

// ── Init ──────────────────────────────────────────────────────────────────────
apiUrlInput.value = state.apiUrl;
applyStyle('ink');
updateGenerateBtn();

// ── Config panel ──────────────────────────────────────────────────────────────
configToggle.addEventListener('click', () => {
  configPanel.hidden = !configPanel.hidden;
});

apiUrlInput.addEventListener('input', () => {
  state.apiUrl = apiUrlInput.value.trim().replace(/\/$/, '');
  localStorage.setItem('sd_api_url', state.apiUrl);
  apiStatus.textContent = '';
  apiStatus.className = 'api-status';
});

testBtn.addEventListener('click', async () => {
  if (!state.apiUrl) { showStatus('Enter an endpoint URL first', false); return; }
  testBtn.disabled = true;
  testBtn.textContent = '…';
  apiStatus.textContent = '';
  try {
    const res = await fetch(`${state.apiUrl}/sdapi/v1/sd-models`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    showStatus(`Connected · ${data.length} model${data.length !== 1 ? 's' : ''} available`, true);
  } catch (e) {
    showStatus(`Cannot reach A1111: ${e.message}`, false);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test';
  }
});

function showStatus(msg, ok) {
  apiStatus.textContent = ok ? `✓ ${msg}` : `✗ ${msg}`;
  apiStatus.className = `api-status ${ok ? 'ok' : 'err'}`;
}

// ── Photo upload ──────────────────────────────────────────────────────────────
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    state.photoB64 = dataUrl.split(',')[1];
    uploadZone.classList.add('has-image');
    zoneInner.innerHTML = `
      <img class="zone-preview" src="${dataUrl}">
      <div class="zone-overlay">Tap to change</div>`;
    updateGenerateBtn();
  };
  reader.readAsDataURL(file);
});

// ── Style selection ───────────────────────────────────────────────────────────
styleGrid.addEventListener('click', e => {
  const btn = e.target.closest('.style-btn');
  if (!btn) return;
  styleGrid.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyStyle(btn.dataset.style);
});

function applyStyle(name) {
  state.style = name;
  const preset = STYLES[name];
  promptTA.value    = preset.prompt;
  negPromptTA.value = preset.negative;
  promptTA.readOnly = (name !== 'custom');
  if (name === 'custom') promptTA.focus();
}

// ── Sliders ───────────────────────────────────────────────────────────────────
strengthSlider.addEventListener('input', () => { strengthVal.textContent = strengthSlider.value; });
stepsSlider.addEventListener('input',    () => { stepsVal.textContent    = stepsSlider.value; });
cfgSlider.addEventListener('input',      () => { cfgVal.textContent      = cfgSlider.value; });
batchSlider.addEventListener('input',    () => { batchVal.textContent    = batchSlider.value; });

diceBtn.addEventListener('click', () => {
  seedInput.value = Math.floor(Math.random() * 2 ** 31);
});

// ── Generate ──────────────────────────────────────────────────────────────────
function updateGenerateBtn() {
  generateBtn.disabled = !state.photoB64 || !state.apiUrl;
  genLabel.textContent = !state.apiUrl ? 'Set API endpoint first' : !state.photoB64 ? 'Upload a photo first' : 'Generate';
}

generateBtn.addEventListener('click', generate);

async function generate() {
  state.abortController = new AbortController();
  progressOverlay.hidden = false;
  progressLabel.textContent = 'Sending to A1111…';

  const body = {
    init_images:        [state.photoB64],
    prompt:             promptTA.value,
    negative_prompt:    negPromptTA.value,
    denoising_strength: parseFloat(strengthSlider.value),
    steps:              parseInt(stepsSlider.value),
    cfg_scale:          parseFloat(cfgSlider.value),
    batch_size:         parseInt(batchSlider.value),
    seed:               parseInt(seedInput.value) || -1,
    save_images:        false,
    send_images:        true,
  };

  try {
    progressLabel.textContent = 'Generating…';
    const res = await fetch(`${state.apiUrl}/sdapi/v1/img2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: state.abortController.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`A1111 returned ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const seeds = data.info ? JSON.parse(data.info).all_seeds || [] : [];

    state.results = data.images.map((b64, i) => ({
      b64,
      seed: seeds[i] ?? '?',
    }));

    renderResults();
  } catch (e) {
    if (e.name === 'AbortError') {
      progressLabel.textContent = 'Cancelled';
    } else {
      alert(`Generation failed:\n${e.message}`);
    }
  } finally {
    progressOverlay.hidden = true;
    state.abortController = null;
  }
}

cancelBtn.addEventListener('click', () => {
  state.abortController?.abort();
});

// ── Render results ────────────────────────────────────────────────────────────
function renderResults() {
  resultsGrid.innerHTML = '';
  resultsActions.hidden = state.results.length === 0;
  tileOutput.hidden = true;

  state.results.forEach(({ b64, seed }, i) => {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.innerHTML = `
      <img src="data:image/png;base64,${b64}" alt="Result ${i+1}">
      <div class="result-seed">#${seed}</div>
      <div class="result-overlay">
        <button class="result-dl-btn" data-i="${i}">Download</button>
        <button class="result-dl-btn" data-i="${i}" data-use="seed">Use seed</button>
      </div>`;
    resultsGrid.appendChild(item);
  });

  resultsGrid.addEventListener('click', e => {
    const dl = e.target.closest('[data-i]');
    if (!dl) return;
    const i = parseInt(dl.dataset.i);
    if (dl.dataset.use === 'seed') {
      seedInput.value = state.results[i].seed;
    } else {
      downloadResult(i);
    }
  }, { once: false });
}

function downloadResult(i) {
  const { b64, seed } = state.results[i];
  const a = document.createElement('a');
  a.href     = `data:image/png;base64,${b64}`;
  a.download = `fiadh_${state.style}_seed${seed}.png`;
  a.click();
}

dlAllBtn.addEventListener('click', () => {
  state.results.forEach((_, i) => {
    setTimeout(() => downloadResult(i), i * 300);
  });
});

// ── Tile ──────────────────────────────────────────────────────────────────────
tileBtn.addEventListener('click', () => {
  if (!state.results.length) return;
  const n    = state.results.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const TILE = 512;

  tileCanvas.width  = cols * TILE;
  tileCanvas.height = rows * TILE;
  const ctx = tileCanvas.getContext('2d');

  let loaded = 0;
  state.results.forEach(({ b64 }, i) => {
    const img = new Image();
    img.onload = () => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      ctx.drawImage(img, col * TILE, row * TILE, TILE, TILE);
      if (++loaded === n) {
        tileOutput.hidden = false;
        tileOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
    img.src = `data:image/png;base64,${b64}`;
  });
});

dlTileBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href     = tileCanvas.toDataURL('image/png');
  a.download = `fiadh_tile_${state.style}.png`;
  a.click();
});
