// Croía's Faces — base face in the style of Fiadh's image 0 (flat pastel geometric face,
// split down the middle, stadium frame). Croía's features: dark hair, sleeping eyes,
// big round cheeks, button nose, pursed rosebud lips, chubby chin.
// Usage: node croia/src/face.js <out.jpg>
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || path.join(__dirname, '..', 'images', 'croia_00.jpg');
const S = 1024, CX = 512;
const FX = 196, FY = 98, FW = 632, FH = 808, FR = 316;

// Palette: Fiadh's pastels, nudged pinker for a newborn
const P = {
  bg: '#a8bdb6', cream: '#f4ead6', creamD: '#e9dcc2', peach: '#f2b9a0', peachD: '#e59f86',
  apricot: '#eec08f', mint: '#bfe0da', mintD: '#9fcac6', sky: '#a9cbd8', skyD: '#8fb6c7',
  sage: '#bcd3c3', rose: '#eea596', roseD: '#dc8676', hair: '#3e4953', hairL: '#5d6c78',
  line: '#1e1a18',
};

const grad = (id, a, b, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const rgrad = (id, a, b, cx = 0.4, cy = 0.35) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.75"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;

// A shape: fill + soft inner shadow, clipped to the face; stroke drawn separately on top
const shape = (d, fill, clip = 'face') =>
  `<path d="${d}" fill="${fill}" filter="url(#inner)" clip-path="url(#${clip})"/>`;
const line = (d, w = 3.2, clip = 'face') =>
  `<path d="${d}" fill="none" stroke="${P.line}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" clip-path="url(#${clip})"/>`;
// Split shape: left half one fill, right half another (the signature of the series)
const split = (d, fl, fr) => shape(d, fl, 'left') + shape(d, fr, 'right');

function svg() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>
  <filter id="inner" x="-10%" y="-10%" width="120%" height="120%">
    <feFlood flood-color="#3a2a20" flood-opacity="0.22"/><feComposite in2="SourceAlpha" operator="out"/>
    <feGaussianBlur stdDeviation="9"/><feOffset dx="3" dy="7" result="sh"/>
    <feComposite in="sh" in2="SourceAlpha" operator="in" result="ish"/>
    <feFlood flood-color="#fffaf0" flood-opacity="0.45"/><feComposite in2="SourceAlpha" operator="out"/>
    <feGaussianBlur stdDeviation="6"/><feOffset dx="-3" dy="-4" result="hl"/>
    <feComposite in="hl" in2="SourceAlpha" operator="in" result="ihl"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="ish"/><feMergeNode in="ihl"/></feMerge>
  </filter>
  <filter id="drop" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="14"/><feOffset dy="10"/><feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="21"/><feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0 0.3  0 0 0 0.07 0"/></filter>
  <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter>
  ${grad('gForeL', P.cream, P.apricot)}${grad('gForeR', P.mint, P.sage)}
  ${grad('gHair', P.hairL, P.hair, 1, 1)}
  ${grad('gLidL', P.peach, P.apricot)}${grad('gLidR', P.sage, P.mintD)}
  ${rgrad('gCheekL', '#f7c4b2', P.rose)}${rgrad('gCheekR', '#f6c9ae', P.peachD)}
  ${grad('gMidL', P.mint, P.sky)}${grad('gMidR', P.cream, P.creamD)}
  ${grad('gLowL', P.apricot, '#e8b27f')}${grad('gLowR', P.cream, P.mint)}
  ${grad('gJawL', P.sky, P.skyD)}${grad('gJawR', P.creamD, P.cream)}
  ${rgrad('gNoseL', P.mint, P.mintD)}${rgrad('gNoseR', '#f8cdb8', P.peach)}
  ${rgrad('gLipL', P.sky, P.skyD)}${rgrad('gLipR', '#f3b09d', P.roseD)}
  ${rgrad('gChinL', P.sky, P.skyD)}${rgrad('gChinR', P.cream, P.creamD)}
  <clipPath id="face"><rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="${FR}" ry="${FR}"/></clipPath>
  <clipPath id="left"><rect x="${FX}" y="${FY}" width="${CX - FX}" height="${FH}"/></clipPath>
  <clipPath id="right"><rect x="${CX}" y="${FY}" width="${FX + FW - CX}" height="${FH}"/></clipPath>
</defs>`;

  // Background + frame
  s += `<rect width="${S}" height="${S}" fill="${P.bg}"/>`;
  s += `<ellipse cx="${CX}" cy="470" rx="470" ry="440" fill="#b9ccc5" opacity="0.6" filter="url(#blur6)"/>`;
  s += `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="${FR}" ry="${FR}" fill="${P.cream}" filter="url(#drop)"/>`;

  // Forehead halves
  s += shape(`M${FX},${FY} H${CX} V470 H${FX} Z`, 'url(#gForeL)');
  s += shape(`M${CX},${FY} H${FX + FW} V470 H${CX} Z`, 'url(#gForeR)');

  // HAIR: a dark swoop across the crown, heavier on her right (viewer's left) like the photo
  const hair = `M${FX - 10},430 C${FX + 20},320 290,250 390,244 C450,240 480,262 540,252 C620,238 720,236 790,300 C815,322 830,350 ${FX + FW + 10},380
    L${FX + FW + 10},${FY - 10} L${FX - 10},${FY - 10} Z`;
  s += shape(hair, 'url(#gHair)');
  // a little baby curl flicking down onto the forehead
  const curl = `M470,248 C462,292 438,314 404,318 C426,300 436,280 438,252 Z`;
  s += shape(curl, P.hair);

  // CHEEKS: big round cheek shapes under the eyes (drawn before eyes so lids sit on top)
  const cheekL = `M${FX - 10},470 C${FX + 20},440 300,436 360,470 C420,505 440,580 420,650 C400,715 330,742 270,735 C230,730 ${FX + 10},715 ${FX - 10},700 Z`;
  const cheekR = `M${FX + FW + 10},470 C${FX + FW - 20},440 724,436 664,470 C604,505 584,580 604,650 C624,715 694,742 754,735 C794,730 ${FX + FW - 10},715 ${FX + FW + 10},700 Z`;
  // mid panels behind the cheeks
  s += shape(`M${FX},470 H${CX} V640 H${FX} Z`, 'url(#gMidL)');
  s += shape(`M${CX},470 H${FX + FW} V640 H${CX} Z`, 'url(#gMidR)');
  s += shape(cheekL, 'url(#gCheekL)');
  s += shape(cheekR, 'url(#gCheekR)');

  // EYES: the eye discs from image 0, but closed — a lid fills the top, a sleepy crease curves down
  const eyes = [[330, 358, 84, 'url(#gLidL)', P.sky], [694, 358, 84, 'url(#gLidR)', P.sage]];
  for (const [ex, ey, r, lid, disc] of eyes) {
    s += shape(`M${ex - r},${ey} A${r},${r} 0 1 1 ${ex + r},${ey} A${r},${r} 0 1 1 ${ex - r},${ey} Z`, disc);
    // puffy newborn lid covering most of the disc
    s += shape(`M${ex - r},${ey} A${r},${r} 0 0 1 ${ex + r},${ey} C${ex + r * 0.6},${ey + 34} ${ex - r * 0.6},${ey + 34} ${ex - r},${ey} Z`, lid);
    s += line(`M${ex - r},${ey} A${r},${r} 0 1 1 ${ex + r},${ey} A${r},${r} 0 1 1 ${ex - r},${ey} Z`, 3);
    // the crease: a bold downward arc, slightly tilted like her squint
    s += line(`M${ex - r + 8},${ey + 2} C${ex - r * 0.4},${ey + 36} ${ex + r * 0.4},${ey + 36} ${ex + r - 8},${ey + 2}`, 4.5);
    // tiny lashes
    for (const t of [-0.45, -0.15, 0.15, 0.45]) {
      const lx = ex + t * r * 1.5, ly = ey + 26 - Math.abs(t) * 14;
      s += line(`M${lx},${ly} L${lx + t * 10},${ly + 13}`, 2.6);
    }
  }

  // Lower panels
  s += shape(`M${FX},640 H${CX} V${FY + FH} H${FX} Z`, 'url(#gJawL)');
  s += shape(`M${CX},640 H${FX + FW} V${FY + FH} H${CX} Z`, 'url(#gJawR)');
  s += shape(`M${FX - 10},760 C${FX + 30},700 300,690 340,740 C360,765 360,800 350,${FY + FH + 10} L${FX - 10},${FY + FH + 10} Z`, 'url(#gLowL)');
  s += shape(`M${FX + FW + 10},760 C${FX + FW - 30},700 724,690 684,740 C664,765 664,800 674,${FY + FH + 10} L${FX + FW + 10},${FY + FH + 10} Z`, 'url(#gLowR)');
  // cheeks overlap the jaw a touch — redraw their lower curves on top for the chubby look
  s += shape(cheekL, 'url(#gCheekL)');
  s += shape(cheekR, 'url(#gCheekR)');

  // NOSE: a small round button, split down the middle
  const ny = 548;
  const nostrils = `M${CX - 58},${ny + 22} C${CX - 64},${ny - 4} ${CX - 40},${ny - 16} ${CX - 24},${ny - 2} L${CX + 24},${ny - 2} C${CX + 40},${ny - 16} ${CX + 64},${ny - 4} ${CX + 58},${ny + 22} C${CX + 52},${ny + 48} ${CX + 20},${ny + 50} ${CX},${ny + 40} C${CX - 20},${ny + 50} ${CX - 52},${ny + 48} ${CX - 58},${ny + 22} Z`;
  s += split(nostrils, 'url(#gNoseL)', 'url(#gNoseR)');
  s += line(nostrils);
  const bulb = `M${CX},${ny - 58} C${CX + 30},${ny - 58} ${CX + 40},${ny - 20} ${CX + 36},${ny + 4} C${CX + 30},${ny + 34} ${CX + 12},${ny + 40} ${CX},${ny + 40} C${CX - 12},${ny + 40} ${CX - 30},${ny + 34} ${CX - 36},${ny + 4} C${CX - 40},${ny - 20} ${CX - 30},${ny - 58} ${CX},${ny - 58} Z`;
  s += split(bulb, 'url(#gNoseR)', 'url(#gNoseL)');
  s += line(bulb);
  s += `<ellipse cx="${CX - 30}" cy="${ny + 26}" rx="10" ry="6" fill="${P.line}" transform="rotate(-20 ${CX - 30} ${ny + 26})"/>`;
  s += `<ellipse cx="${CX + 30}" cy="${ny + 26}" rx="10" ry="6" fill="${P.line}" transform="rotate(20 ${CX + 30} ${ny + 26})"/>`;

  // MOUTH: small pursed rosebud — tight bow on top, round pout below
  const my = 690;
  const upper = `M${CX - 50},${my} C${CX - 38},${my - 30} ${CX - 14},${my - 30} ${CX},${my - 16} C${CX + 14},${my - 30} ${CX + 38},${my - 30} ${CX + 50},${my} C${CX + 20},${my + 6} ${CX - 20},${my + 6} ${CX - 50},${my} Z`;
  const lower = `M${CX - 44},${my + 2} C${CX - 20},${my + 8} ${CX + 20},${my + 8} ${CX + 44},${my + 2} C${CX + 44},${my + 40} ${CX + 20},${my + 52} ${CX},${my + 52} C${CX - 20},${my + 52} ${CX - 44},${my + 40} ${CX - 44},${my + 2} Z`;
  s += split(upper, 'url(#gLipL)', 'url(#gLipR)');
  s += split(lower, 'url(#gLipL)', 'url(#gLipR)');
  s += line(upper) + line(lower);

  // CHIN: the round chin from image 0, plus a soft chubby fold beneath
  const cy = 820;
  const chin = `M${CX - 62},${cy} A62,58 0 1 1 ${CX + 62},${cy} A62,58 0 1 1 ${CX - 62},${cy} Z`;
  s += split(chin, 'url(#gChinL)', 'url(#gChinR)');
  s += line(chin);

  // Panel outlines (the lead-line grid of the series)
  s += line(`M${CX},${FY} V${ny - 58}`) + line(`M${CX},${ny + 40} V${my - 16}`) + line(`M${CX},${my + 52} V${cy - 58}`) + line(`M${CX},${cy + 58} V${FY + FH}`);
  s += line(`M365,470 H${CX - 40}`) + line(`M${CX + 40},470 H659`);
  s += line(`M423,640 H${CX - 60}`) + line(`M${CX + 60},640 H601`);
  s += line(hair.split('L')[0]);
  s += line(curl);
  s += line(cheekL) + line(cheekR);
  s += line(`M${FX - 10},760 C${FX + 30},700 300,690 340,740 C360,765 360,800 350,${FY + FH + 10}`);
  s += line(`M${FX + FW + 10},760 C${FX + FW - 30},700 724,690 684,740 C664,765 664,800 674,${FY + FH + 10}`);

  // A small heart tile, for croí ("heart") — tucked into the lower panel
  const hx = 405, hy = 800;
  const heart = `M${hx},${hy + 22} C${hx - 30},${hy} ${hx - 24},${hy - 26} ${hx},${hy - 12} C${hx + 24},${hy - 26} ${hx + 30},${hy} ${hx},${hy + 22} Z`;
  s += shape(heart, P.rose) + line(heart, 2.4);

  // Frame border
  s += `<rect x="${FX}" y="${FY}" width="${FW}" height="${FH}" rx="${FR}" ry="${FR}" fill="none" stroke="${P.line}" stroke-width="3.5"/>`;
  s += `<rect x="${FX - 6}" y="${FY - 6}" width="${FW + 12}" height="${FH + 12}" rx="${FR + 6}" ry="${FR + 6}" fill="none" stroke="${P.cream}" stroke-width="7"/>`;
  s += `<rect width="${S}" height="${S}" filter="url(#grain)"/>`;
  return s + '</svg>';
}

(async () => {
  const markup = svg();
  fs.writeFileSync(out.replace(/\.jpg$/, '.svg'), markup);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: S, height: S } });
  await page.setContent(`<html><body style="margin:0">${markup}</body></html>`);
  await page.screenshot({ path: out, type: 'jpeg', quality: 93 });
  await browser.close();
  console.log('wrote', out);
})();
