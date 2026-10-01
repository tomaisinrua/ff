// Croía's Faces — generates one ink-wash "face landscape" as SVG and renders it to JPEG.
// Usage: node croia/src/paint.js <seed> <out.jpg>
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const seed = parseInt(process.argv[2] || '21', 10);
const out = process.argv[3] || path.join(__dirname, '..', 'images', `croia_${seed}.jpg`);
const S = 1024;

// Seeded PRNG (mulberry32) so a seed always reproduces the same painting
let t = seed >>> 0;
const rnd = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
const rr = (a, b) => a + rnd() * (b - a);
const f = (n) => n.toFixed(1);

// Face frame: a stadium/arch, as in the Fiadh originals
const FX = 192, FY = 96, FW = 640, FH = 812, FR = 320;

// Tapered brush stroke along a polyline: thick in the middle, pointed at the ends
function brush(pts, width, jitter = 0.25) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)], [nx, ny] = pts[Math.min(pts.length - 1, i + 1)];
    let dx = nx - px, dy = ny - py; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (pts.length - 1);
    const w = width * Math.pow(Math.sin(Math.PI * u), 0.7) * (1 + rr(-jitter, jitter));
    L.push([x - dy * w, y + dx * w]); R.push([x + dy * w, y - dx * w]);
  }
  const all = L.concat(R.reverse());
  return 'M' + all.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
}

// Sample a quadratic/cubic-ish curve through control points (Catmull-Rom)
function curve(ctrl, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) * (ctrl.length - 1), k = Math.min(Math.floor(u), ctrl.length - 2), s = u - k;
    const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
    pts.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
  }
  return pts;
}

// Mountain silhouette between x0..x1 with a base line, peaks jagged
function mountains(x0, x1, base, height, peaks, rough = 0.35) {
  const pts = [[x0, base]];
  const n = peaks * 6;
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n;
    const env = Math.pow(Math.sin(Math.PI * i / n), 0.8);
    const ridge = Math.abs(Math.sin(i / n * Math.PI * peaks + seed)) * 0.6 + 0.4;
    pts.push([x, base - height * env * ridge * (1 + rr(-rough, rough))]);
  }
  pts.push([x1, base]);
  return 'M' + pts.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
}

// Little ink pine: trunk + layered drooping brush clusters
function pine(x, y, h, ink = '#1b1d1c') {
  let s = '';
  const lean = rr(-0.25, 0.25);
  const top = [x + lean * h, y - h];
  s += `<path d="${brush(curve([[x, y], [x + lean * h * 0.3 + rr(-6, 6), y - h * 0.5], top], 12), h * 0.035)}" fill="${ink}"/>`;
  const tiers = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < tiers; i++) {
    const u = 0.4 + 0.6 * i / tiers;
    const cx = x + lean * h * u + rr(-h * 0.08, h * 0.08), cy = y - h * u;
    const span = h * (0.34 - 0.18 * u) * rr(0.8, 1.25);
    for (let k = 0; k < 7; k++) {
      s += `<ellipse cx="${f(cx + rr(-span, span))}" cy="${f(cy + rr(-span * 0.12, span * 0.12))}" rx="${f(span * rr(0.25, 0.5))}" ry="${f(span * rr(0.08, 0.16))}" fill="${ink}" opacity="${f(rr(0.5, 0.9))}"/>`;
    }
  }
  s = `<g filter="url(#inkedge)">${s}</g>`;
  return s;
}

// Ogham for C-R-O-Í-A, drawn as strokes on a vertical stem (read bottom to top)
function ogham(x, y, len) {
  // C: 4 left; R: 5 diagonal across; O: 2 notches; Í: 5 notches; A: 1 notch
  const letters = [['L', 4], ['D', 5], ['V', 2], ['V', 5], ['V', 1]];
  let s = `<path d="${brush([[x, y], [x + 1, y - len * 0.5], [x, y - len]], 3.2, 0.1)}" fill="#2a1f18"/>`;
  let cy = y - 16;
  const gap = 9;
  for (const [kind, n] of letters) {
    for (let i = 0; i < n; i++) {
      if (kind === 'L') s += `<path d="${brush([[x, cy], [x - 9, cy], [x - 18, cy]], 2.2)}" fill="#2a1f18"/>`;
      if (kind === 'D') s += `<path d="${brush([[x - 11, cy + 6], [x, cy], [x + 11, cy - 6]], 2.2)}" fill="#2a1f18"/>`;
      if (kind === 'V') s += `<circle cx="${x}" cy="${cy}" r="2.6" fill="#2a1f18"/>`;
      cy -= gap;
    }
    cy -= gap * 1.2;
  }
  return s;
}

function svg() {
  const cx = 512;
  const eyeY = 408, noseY = 548, mouthY = 690;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.18  0 0 0 0.22 0"/>
  </filter>
  <filter id="mottle" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="4" seed="${seed + 3}" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.40  0 0 0 0 0.18  0 0 0 1.1 -0.45"/>
  </filter>
  <filter id="inkedge" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="${seed + 7}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="drybrush" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05 0.35" numOctaves="2" seed="${seed + 11}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.03 0.25" numOctaves="2" seed="${seed + 12}" result="streak"/>
    <feColorMatrix in="streak" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.2 -0.55" result="mask"/>
    <feComposite in="d" in2="mask" operator="in"/>
  </filter>
  <filter id="wash" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="${seed + 5}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feGaussianBlur in="d" stdDeviation="10"/>
  </filter>
  <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="mist"><feGaussianBlur stdDeviation="7"/></filter>
  <radialGradient id="moon"><stop offset="0" stop-color="#fffaf0"/><stop offset="0.55" stop-color="#fbf3e2" stop-opacity="0.95"/><stop offset="1" stop-color="#f4e8cf" stop-opacity="0"/></radialGradient>
  <radialGradient id="sun" cx="0.45" cy="0.42"><stop offset="0" stop-color="#e2593a"/><stop offset="0.8" stop-color="#c8402a"/><stop offset="1" stop-color="#a8331f"/></radialGradient>
  <radialGradient id="sunPale" cx="0.45" cy="0.42"><stop offset="0" stop-color="#e98a6a"/><stop offset="1" stop-color="#d0654a"/></radialGradient>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9cfb1"/><stop offset="0.3" stop-color="#8fb3b9"/><stop offset="0.62" stop-color="#3f7f93"/><stop offset="1" stop-color="#1f5a70"/>
  </linearGradient>
  <clipPath id="face"><rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="${FR}" ry="${FR}"/></clipPath>
</defs>`;

  // --- Paper ---
  s += `<rect width="${S}" height="${S}" fill="#e6d8b8"/>`;
  s += `<rect width="${S}" height="${S}" filter="url(#mottle)" opacity="0.55"/>`;
  // Teal bleed outside the frame (right) and ochre warmth (left), like the original
  s += `<ellipse cx="880" cy="260" rx="260" ry="220" fill="#4f8ea3" opacity="0.55" filter="url(#wash)"/>`;
  s += `<ellipse cx="760" cy="900" rx="340" ry="160" fill="#2f6f86" opacity="0.5" filter="url(#wash)"/>`;
  s += `<ellipse cx="110" cy="620" rx="200" ry="260" fill="#9a7a3a" opacity="0.35" filter="url(#wash)"/>`;

  // Distant ranges outside the face
  s += `<g filter="url(#inkedge)">`;
  s += `<path d="${mountains(-20, 300, 560, 170, 3)}" fill="#8f8a63" opacity="0.55"/>`;
  s += `<path d="${mountains(-20, 260, 600, 110, 4)}" fill="#3e6f78" opacity="0.6"/>`;
  s += `<path d="${mountains(730, 1044, 520, 140, 3)}" fill="#9c8a55" opacity="0.5"/>`;
  s += `<path d="${mountains(760, 1044, 590, 90, 4)}" fill="#1f3e44" opacity="0.7"/>`;
  s += `</g>`;
  s += `<rect x="0" y="585" width="${S}" height="30" fill="#e6d8b8" opacity="0.5" filter="url(#mist)"/>`;

  // --- Inside the face ---
  s += `<g clip-path="url(#face)">`;
  s += `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" fill="url(#sky)"/>`;
  // Blotchy washes
  for (let i = 0; i < 16; i++) {
    const col = ['#e1d2a6', '#5d97a8', '#2b6a80', '#b99a55', '#d8c89a'][i % 5];
    s += `<ellipse cx="${f(rr(FX, FX + FW))}" cy="${f(rr(FY + 80, FY + FH))}" rx="${f(rr(60, 170))}" ry="${f(rr(40, 120))}" fill="${col}" opacity="${f(rr(0.25, 0.5))}" filter="url(#wash)"/>`;
  }
  s += `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" filter="url(#mottle)" opacity="0.5"/>`;
  // Warm glow in the brow — "forehead" sky, where the newborn skin is palest
  s += `<ellipse cx="${cx}" cy="300" rx="230" ry="110" fill="#efe2c2" opacity="0.7" filter="url(#soft)"/>`;

  // HAIR: a dense dark ridge of pines across the crown, heavier on her left like the photo
  s += `<g filter="url(#inkedge)">`;
  s += `<path d="M${FX},${FY} L${FX + FW},${FY} L${FX + FW},250 C700,215 640,185 560,196 C480,205 400,180 330,228 C280,262 240,300 ${FX},330 Z" fill="#161816" opacity="0.92"/>`;
  s += `<path d="M${FX},${FY + 60} C360,170 520,150 ${FX + FW},205 L${FX + FW},${FY} L${FX},${FY} Z" fill="#0c0d0c"/>`;
  s += `</g>`;
  s += `<g filter="url(#drybrush)">`;
  for (let i = 0; i < 14; i++) {
    const y0 = rr(150, 250), x0 = rr(FX - 20, FX + 200);
    s += `<path d="${brush(curve([[x0, y0 + 40], [x0 + 200, y0 - rr(10, 40)], [x0 + rr(380, 560), y0 + rr(-20, 20)]], 30), rr(6, 14))}" fill="#0d0e0d" opacity="0.8"/>`;
  }
  s += `</g>`;
  for (let i = 0; i < 26; i++) {
    const u = i / 25, x = FX + 40 + u * (FW - 80);
    const y = 210 + 40 * Math.cos(u * Math.PI * 1.1 + 0.4) + rr(-8, 8);
    s += pine(x, y + 12, rr(34, 62), '#121412');
  }
  // Faint concentric "eye" circles, as in the original's hairline rings
  for (const [ex, er] of [[392, 118], [646, 104]]) {
    s += `<circle cx="${ex}" cy="${eyeY + 10}" r="${er}" fill="none" stroke="#3a2c18" stroke-width="1.1" opacity="0.35"/>`;
    s += `<circle cx="${ex + 8}" cy="${eyeY + 16}" r="${er * 0.72}" fill="none" stroke="#3a2c18" stroke-width="0.9" opacity="0.25"/>`;
  }

  // EYES: closed, sleepy crescents = long mountain ridgelines with mist beneath
  const eyes = [
    [[282, eyeY - 18], [340, eyeY - 2], [400, eyeY + 14], [455, eyeY + 12], [490, eyeY - 4]],
    [[548, eyeY + 2], [590, eyeY + 18], [650, eyeY + 20], [712, eyeY + 4], [752, eyeY - 18]],
  ];
  for (const e of eyes) {
    // soft lid shadow above the crease, then the ink ridge
    s += `<path d="${brush(curve(e.map(([x, y]) => [x, y - 20]), 40), 26)}" fill="#6b5a3c" opacity="0.28" filter="url(#mist)"/>`;
    s += `<g filter="url(#drybrush)"><path d="${brush(curve(e, 50), 10)}" fill="#141414"/></g>`;
    s += `<path d="${brush(curve(e, 50), 5, 0.1)}" fill="#0e0e0e" filter="url(#inkedge)"/>`;
    s += `<path d="${brush(curve(e.map(([x, y]) => [x, y + 24]), 40), 14)}" fill="#f3ead2" opacity="0.55" filter="url(#mist)"/>`;
    // small pines riding the lid ridge
    for (let k = 0; k < 3; k++) {
      const p = curve(e, 50)[10 + Math.floor(rnd() * 30)];
      s += pine(p[0], p[1] - 2, rr(16, 26), '#151515');
    }
  }

  // NOSE: pale moon rising between hills (her little button nose), with two ink nostril-boats
  s += `<circle cx="${cx}" cy="${noseY}" r="96" fill="url(#moon)"/>`;
  s += `<circle cx="${cx}" cy="${noseY}" r="50" fill="#fffaf0" opacity="0.9" filter="url(#mist)"/>`;
  s += `<circle cx="${cx}" cy="${noseY}" r="74" fill="none" stroke="#3a2c18" stroke-width="1" opacity="0.35"/>`;
  s += `<g filter="url(#inkedge)">`;
  s += `<path d="${brush([[cx - 42, noseY + 44], [cx - 26, noseY + 50], [cx - 12, noseY + 46]], 5)}" fill="#2a211a" opacity="0.8"/>`;
  s += `<path d="${brush([[cx + 12, noseY + 46], [cx + 26, noseY + 50], [cx + 42, noseY + 44]], 5)}" fill="#2a211a" opacity="0.8"/>`;
  s += `</g>`;

  // CHEEKS: big rosy hills with red suns — her best feature, so they get the most paint
  s += `<g filter="url(#inkedge)">`;
  s += `<path d="M${FX},${FH + FY} L${FX},560 C250,520 330,505 390,540 C430,565 452,610 470,660 L470,${FY + FH} Z" fill="#23414a" opacity="0.7" filter="url(#wash)"/>`;
  s += `<path d="M${FX + FW},${FH + FY} L${FX + FW},555 C780,515 700,500 640,535 C598,562 575,610 556,660 L556,${FY + FH} Z" fill="#23414a" opacity="0.7" filter="url(#wash)"/>`;
  s += `<path d="M${FX},620 C260,585 330,590 380,640 C400,660 410,700 400,760 L${FX},780 Z" fill="#b6934d" opacity="0.55"/>`;
  s += `<path d="M${FX + FW},610 C770,582 700,588 650,636 C630,656 622,700 632,760 L${FX + FW},780 Z" fill="#b6934d" opacity="0.5"/>`;
  s += `</g>`;
  s += `<circle cx="318" cy="628" r="66" fill="url(#sun)" filter="url(#inkedge)" opacity="0.95"/>`;
  s += `<circle cx="318" cy="628" r="66" fill="none" stroke="#3a2c18" stroke-width="1.1" opacity="0.5"/>`;
  s += `<circle cx="716" cy="616" r="48" fill="url(#sunPale)" filter="url(#inkedge)" opacity="0.9"/>`;
  s += pine(300, 700, 70, '#131313');
  s += pine(738, 690, 52, '#131313');
  // dry-brush ridge contours along the cheek hills
  s += `<g filter="url(#drybrush)">`;
  s += `<path d="${brush(curve([[FX + 10, 575], [300, 528], [392, 548], [455, 640]], 40), 7)}" fill="#111"/>`;
  s += `<path d="${brush(curve([[FX + FW - 10, 568], [730, 525], [636, 545], [572, 640]], 40), 7)}" fill="#111"/>`;
  s += `</g>`;

  // MOUTH: pursed lips = a crimson bow over a still lake
  s += `<rect x="${FX}" y="${mouthY + 10}" width="${FW}" height="${FH}" fill="#2a6a80" opacity="0.55" filter="url(#wash)"/>`;
  s += `<g filter="url(#inkedge)">`;
  s += `<path d="M${cx - 48},${mouthY} C${cx - 30},${mouthY - 22} ${cx - 10},${mouthY - 8} ${cx},${mouthY - 14} C${cx + 10},${mouthY - 8} ${cx + 30},${mouthY - 22} ${cx + 48},${mouthY} C${cx + 26},${mouthY + 24} ${cx - 26},${mouthY + 24} ${cx - 48},${mouthY} Z" fill="#b8392a" opacity="0.92"/>`;
  s += `<path d="${brush([[cx - 44, mouthY], [cx, mouthY + 4], [cx + 44, mouthY]], 2.4)}" fill="#3a1410"/>`;
  s += `</g>`;
  // its reflection in the lake
  s += `<path d="M${cx - 40},${mouthY + 34} C${cx - 20},${mouthY + 50} ${cx + 20},${mouthY + 50} ${cx + 40},${mouthY + 34}" stroke="#b8392a" stroke-width="7" fill="none" opacity="0.3" filter="url(#mist)"/>`;
  // ripple lines
  for (let i = 0; i < 6; i++) {
    const y = mouthY + 60 + i * 22, w = 120 - i * 8 + rr(-20, 20);
    s += `<path d="${brush([[cx - w, y], [cx, y + rr(-3, 3)], [cx + w, y]], 1.6)}" fill="#e9dcbc" opacity="${f(0.5 - i * 0.06)}"/>`;
  }
  // CHIN: a low island at the base of the face
  s += `<path d="${mountains(380, 650, 870, 46, 2)}" fill="#1a2c30" opacity="0.8" filter="url(#inkedge)"/>`;
  s += `</g>`;

  // Frame hairline (gold) and paper texture over everything
  s += `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="${FR}" ry="${FR}" fill="none" stroke="#8a6a2e" stroke-width="2.2" opacity="0.8" filter="url(#inkedge)"/>`;

  // Foreground pine outside the frame, lower left, like the original
  s += `<g filter="url(#inkedge)">${pine(150, 960, 170, '#121212')}</g>`;
  s += `<path d="${mountains(-10, 330, 1030, 90, 3)}" fill="#141a18" opacity="0.85" filter="url(#inkedge)"/>`;

  // Inscription: Croía in Ogham, and a red seal
  s += ogham(900, 960, 150);
  s += `<g transform="translate(936,934) rotate(${f(rr(-4, 4))})" filter="url(#inkedge)">
    <rect x="-18" y="-18" width="36" height="36" rx="3" fill="#b3321f" opacity="0.9"/>
    <text x="0" y="9" font-family="Georgia, serif" font-size="26" font-weight="bold" text-anchor="middle" fill="#efe0c4">C</text></g>`;

  s += `<rect width="${S}" height="${S}" filter="url(#paper)"/>`;
  s += `</svg>`;
  return s;
}

(async () => {
  const markup = svg();
  fs.writeFileSync(out.replace(/\.jpg$/, '.svg'), markup);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const page = await browser.newPage({ viewport: { width: S, height: S } });
  await page.setContent(`<html><body style="margin:0">${markup}</body></html>`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 92 });
  await browser.close();
  console.log('wrote', out);
})();
