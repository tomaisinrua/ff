const S = 1080;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = S;
canvas.height = S;

const state = {
  mapImg: null,
  photoImg: null,
  template: 'summit',
  caption: '',
  distance: '',
  duration: '',
  pace: '',
  elevation: '',
};

// ── Input wiring ─────────────────────────────────────────────────────────────

function bindUpload(inputId, zoneId, innerId, key) {
  const input = document.getElementById(inputId);
  const zone  = document.getElementById(zoneId);
  const inner = document.getElementById(innerId);
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        state[key] = img;
        zone.classList.add('has-image');
        inner.innerHTML = `
          <img class="zone-preview" src="${e.target.result}">
          <div class="zone-overlay">Tap to change</div>`;
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

bindUpload('map-input',   'map-zone',   'map-inner',   'mapImg');
bindUpload('photo-input', 'photo-zone', 'photo-inner', 'photoImg');

['caption','distance','duration','pace','elevation'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state[id] = el.value.trim(); render(); });
});

document.querySelectorAll('.vibe').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vibe').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.template = btn.dataset.t;
    render();
  });
});

document.getElementById('download-btn').addEventListener('click', () => {
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'workout-poster.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
});

// ── Canvas helpers ────────────────────────────────────────────────────────────

function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function drawCover(img, x, y, w, h, radius = 0) {
  if (!img) return;
  ctx.save();
  if (radius > 0) { rrect(x, y, w, h, radius); ctx.clip(); }
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function fadeEdge(x, y, w, h, fromColor, toColor, vertical = true) {
  const g = vertical
    ? ctx.createLinearGradient(x, y, x, y + h)
    : ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, fromColor);
  g.addColorStop(1, toColor);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function statBox(label, value, cx, cy, w, h, accent, textColor = '#fff') {
  ctx.save();
  rrect(cx - w/2, cy - h/2, w, h, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.font = `700 ${Math.round(h * 0.38)}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, cx, cy - h * 0.08);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `500 ${Math.round(h * 0.21)}px -apple-system, sans-serif`;
  ctx.fillText(label.toUpperCase(), cx, cy + h * 0.3);
}

function getStats() {
  const out = [];
  if (state.distance)  out.push({ label: 'Distance',  value: state.distance });
  if (state.duration)  out.push({ label: 'Time',       value: state.duration });
  if (state.pace)      out.push({ label: 'Pace',       value: state.pace });
  if (state.elevation) out.push({ label: 'Elev gain',  value: state.elevation });
  return out;
}

function renderStatsRow(stats, y, areaH, accent) {
  if (!stats.length) return;
  const cols = Math.min(stats.length, 4);
  const boxW = Math.floor((S - 80) / cols);
  const boxH = Math.floor(areaH * 0.75);
  const startX = (S - cols * boxW) / 2 + boxW / 2;
  stats.slice(0, 4).forEach((s, i) => {
    statBox(s.label, s.value, startX + i * boxW, y + areaH / 2, boxW - 16, boxH, accent);
  });
}

// ── SUMMIT template ───────────────────────────────────────────────────────────
function renderSummit() {
  const bg = ctx.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, '#0b0b18');
  bg.addColorStop(1, '#1a0a2a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  const mapH = state.photoImg ? Math.floor(S * 0.46) : Math.floor(S * 0.58);
  const pad  = 0;

  if (state.mapImg) {
    drawCover(state.mapImg, pad, pad, S - pad * 2, mapH - pad);
    fadeEdge(0, mapH - 180, S, 180, 'rgba(11,11,24,0)', 'rgba(11,11,24,1)');
  } else {
    ctx.fillStyle = '#14142a';
    ctx.fillRect(0, 0, S, mapH);
    ctx.fillStyle = '#2a2a55';
    ctx.font = 'bold 40px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Upload your route map', S / 2, mapH / 2);
  }

  let y = mapH;

  if (state.photoImg) {
    const ph = Math.floor(S * 0.28);
    const pw = Math.floor(S * 0.38);
    const px = Math.floor((S - pw) / 2);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 30;
    drawCover(state.photoImg, px, y - ph / 2 + 10, pw, ph, 18);
    ctx.restore();
    y += ph / 2 + 20;
  }

  if (state.caption) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.caption.toUpperCase(), S / 2, y + 70);
    y += 90;
  }

  const stats = getStats();
  if (stats.length) renderStatsRow(stats, y + 10, 160, '#ff5c35');

  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '26px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('WORKOUT POSTER', S / 2, S - 28);
}

// ── VELOCITY template ─────────────────────────────────────────────────────────
function renderVelocity() {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, S, S);

  const accent  = '#ffcc00';
  const accentB = '#ff5c00';

  const g = ctx.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, '#ff5c00');
  g.addColorStop(1, '#ff9a00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, 14);
  ctx.fillRect(0, S - 14, S, 14);

  const mapW  = Math.floor(S * 0.56);
  const mapH  = Math.floor(S * 0.62);
  const mapX  = 0;
  const mapY  = Math.floor((S - mapH) / 2);

  if (state.mapImg) {
    drawCover(state.mapImg, mapX, mapY, mapW, mapH, 0);
    fadeEdge(mapW - 200, mapY, 200, mapH, 'rgba(10,10,10,0)', 'rgba(10,10,10,1)', false);
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(mapX, mapY, mapW, mapH);
  }

  if (state.photoImg) {
    const ph = Math.floor(mapH * 0.42);
    const pw = ph;
    ctx.save();
    ctx.shadowColor = 'rgba(255,92,0,0.5)';
    ctx.shadowBlur = 24;
    drawCover(state.photoImg, mapW + 20, mapY, pw, ph, 14);
    ctx.restore();
  }

  const textX = mapW + 40;
  const textW = S - textX - 40;
  let ty = state.photoImg
    ? mapY + Math.floor(mapH * 0.42) + 50
    : mapY + 50;

  if (state.caption) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${state.caption.length > 14 ? 48 : 56}px -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, state.caption.toUpperCase(), textX, ty, textW, 62);
    ty += 80;
  }

  const stats = getStats();
  const boxW  = textW;
  const boxH  = 100;
  stats.slice(0, 4).forEach((s, i) => {
    const bx = textX + boxW / 2;
    const by = ty + i * (boxH + 12) + boxH / 2;
    statBox(s.label, s.value, bx, by, boxW, boxH, accent);
  });
}

// ── MIST template ─────────────────────────────────────────────────────────────
function renderMist() {
  ctx.fillStyle = '#f4f0eb';
  ctx.fillRect(0, 0, S, S);

  const pad  = 56;
  const mapH = state.photoImg ? Math.floor(S * 0.44) : Math.floor(S * 0.55);

  if (state.mapImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.14)';
    ctx.shadowBlur  = 28;
    ctx.shadowOffsetY = 6;
    drawCover(state.mapImg, pad, pad, S - pad * 2, mapH, 18);
    ctx.restore();
  } else {
    rrect(pad, pad, S - pad * 2, mapH, 18);
    ctx.fillStyle = '#e0dbd3';
    ctx.fill();
  }

  let y = pad + mapH + 36;

  if (state.photoImg) {
    const ph = 200;
    const pw = 200;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur  = 20;
    drawCover(state.photoImg, (S - pw) / 2, y, pw, ph, ph / 2);
    ctx.restore();
    y += ph + 28;
  }

  if (state.caption) {
    ctx.fillStyle = '#111111';
    ctx.font      = 'bold 62px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.caption, S / 2, y + 56);
    y += 76;
  }

  const stats = getStats();
  if (stats.length) {
    const cols  = Math.min(stats.length, 4);
    const boxW  = Math.floor((S - pad * 2 - (cols - 1) * 14) / cols);
    const boxH  = 120;
    const startX = pad + boxW / 2;
    stats.slice(0, 4).forEach((s, i) => {
      ctx.save();
      rrect(pad + i * (boxW + 14), y, boxW, boxH, 14);
      ctx.fillStyle = '#ede9e0';
      ctx.fill();
      ctx.restore();
      statBox(s.label, s.value, startX + i * (boxW + 14), y + boxH / 2, boxW - 8, boxH - 12, '#c026d3', '#111');
    });
  }

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.font      = '24px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('WORKOUT POSTER', S / 2, S - 24);
}

// ── GRID template ─────────────────────────────────────────────────────────────
function renderGrid() {
  ctx.fillStyle = '#0e0e16';
  ctx.fillRect(0, 0, S, S);

  const colW = Math.floor(S * 0.52);

  if (state.mapImg) {
    drawCover(state.mapImg, 0, 0, colW, S, 0);
    fadeEdge(colW - 180, 0, 180, S, 'rgba(14,14,22,0)', 'rgba(14,14,22,1)', false);
  } else {
    ctx.fillStyle = '#181825';
    ctx.fillRect(0, 0, colW, S);
  }

  const gx  = colW + 20;
  const gw  = S - gx - 40;
  let   gy  = 80;

  if (state.photoImg) {
    const ph = 220;
    const pw = gw;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 20;
    drawCover(state.photoImg, gx, gy, pw, ph, 16);
    ctx.restore();
    gy += ph + 32;
  }

  if (state.caption) {
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 52px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    wrapText(ctx, state.caption.toUpperCase(), gx, gy + 50, gw, 58);
    gy += 80;
  }

  const accent = '#7c3aed';
  ctx.fillStyle = accent;
  ctx.fillRect(gx, gy + 6, 48, 4);
  gy += 24;

  const stats = getStats();
  stats.slice(0, 4).forEach(s => {
    const bh = 100;
    ctx.save();
    rrect(gx, gy, gw, bh, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = accent;
    ctx.font      = `bold 38px -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.value, gx + 18, gy + bh * 0.42);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font      = '22px -apple-system, sans-serif';
    ctx.fillText(s.label.toUpperCase(), gx + 18, gy + bh * 0.72);

    gy += bh + 10;
  });

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font      = '22px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('WORKOUT POSTER', gx, S - 30);
}

// ── Text wrap helper ──────────────────────────────────────────────────────────
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let ly = y;
  words.forEach((w, i) => {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, ly);
      line = w;
      ly += lineH;
    } else {
      line = test;
    }
    if (i === words.length - 1) ctx.fillText(line, x, ly);
  });
}

// ── Main render ───────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, S, S);
  ({ summit: renderSummit, velocity: renderVelocity, mist: renderMist, grid: renderGrid })[state.template]();
}

render();
