// ─── WCAG helpers ────────────────────────────────────────────────────────

// Pre-computed relative luminance of the two text colours used across logos:
//   Logos 0-2 (boat / oval / octagon) → navy text  #1e2448  L≈0.0201
//   Logos 3-5 (stadium / rect / notch) → yellow text #fdcd14  L≈0.6458
const TEXT_LUM = [0.0201, 0.0201, 0.0201, 0.6458, 0.6458, 0.6458];
const MIN_CONTRAST = 4.5;

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function luminance(r, g, b) {
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(l1, l2) {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Binary-searches for the most vivid HSL lightness that still clears MIN_CONTRAST.
function findLightness(h, s, textLum) {
  const needsLight = textLum < 0.5;
  let lo = needsLight ? 20 : 5, hi = needsLight ? 95 : 70, best = needsLight ? 95 : 5;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const [r, g, b] = hslToRgb(h, s, mid);
    const passes = contrastRatio(textLum, luminance(r, g, b)) >= MIN_CONTRAST;
    if (passes) { best = mid; if (needsLight) hi = mid - 1; else lo = mid + 1; }
    else         {            if (needsLight) lo = mid + 1; else hi = mid - 1; }
  }
  return best;
}

function hueDist(a, b) { const d = Math.abs(a - b); return Math.min(d, 360 - d); }

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function randomAccessibleColor(logoIndex, usedHues = []) {
  const MIN_HUE_GAP = 50;
  let h, s, attempts = 0;
  do {
    h = Math.floor(Math.random() * 360);
    s = Math.floor(Math.random() * 40 + 60);
    attempts++;
  } while (attempts < 40 && usedHues.some(u => hueDist(h, u) < MIN_HUE_GAP));
  usedHues.push(h);
  return toHex(...hslToRgb(h, s, findLightness(h, s, TEXT_LUM[logoIndex])));
}

// ─── Logo inner content ──────────────────────────────────────────────────
// Each entry: [viewW, viewH, fn(accentColor) → SVG element string]
// Uses the shared CSS classes above — no <style> blocks needed per logo.

const TS = (textColor, ty) =>
  `<text fill="${textColor}" style="font-family:Manrope,sans-serif;font-size:48px;font-weight:800;letter-spacing:-2px" transform="translate(60.76 ${ty})">#PrzyJednymStole</text>`;

// White on dark backgrounds, navy on light backgrounds.
function bestTextColor(accentHex) {
  const r = parseInt(accentHex.slice(1, 3), 16);
  const g = parseInt(accentHex.slice(3, 5), 16);
  const b = parseInt(accentHex.slice(5, 7), 16);
  return luminance(r, g, b) > 0.179 ? '#1e2448' : '#ffffff';
}

const logos = [

  // 0 — boat / wave  (navy text)
  [555, 260, (c, tc) => `
    <path fill="white" stroke="#8f92a4" stroke-miterlimit="10" d="M277.5,259.5c-91.7,0-179.98-7.96-255.3-23.02-12.58-2.52-21.7-13.65-21.7-26.48V50c0-12.83,9.13-23.96,21.71-26.48C97.52,8.46,185.8.5,277.5.5s179.98,7.96,255.3,23.02c12.58,2.52,21.7,13.65,21.7,26.48v160c0,12.83-9.13,23.96-21.71,26.48-75.31,15.06-163.59,23.02-255.29,23.02Z"/>
    <path fill="#1e2448" d="M277.5,241.5c-90.54,0-177.6-7.84-251.77-22.67-4.21-.84-7.23-4.54-7.23-8.83V50c0-4.29,3.03-7.98,7.23-8.83,74.17-14.83,161.23-22.67,251.77-22.67s177.6,7.84,251.77,22.67c4.21.84,7.23,4.54,7.23,8.83v160c0,4.29-3.03,7.98-7.23,8.83-74.17,14.83-161.23,22.67-251.77,22.67Z"/>
    <path fill="${c}" d="M27.5,50c150-30,350-30,500,0v160c-150,30-350,30-500,0V50Z"/>
    ${TS(tc, 143.49)}`],

  // 1 — oval  (navy text)
  [555, 255, (c, tc) => `
    <path fill="white" stroke="#8f92a4" stroke-miterlimit="10" d="M277.5,254.5c-70.13,0-136.47-11.09-186.8-31.22C32.53,200.01.5,166,.5,127.5S32.53,54.99,90.7,31.72C141.03,11.59,207.37.5,277.5.5s136.47,11.09,186.8,31.22c58.16,23.27,90.2,57.28,90.2,95.78s-32.03,72.51-90.2,95.78c-50.33,20.13-116.67,31.22-186.8,31.22Z"/>
    <path fill="#1e2448" d="M277.5,236.5c-67.9,0-131.86-10.63-180.12-29.93-50.87-20.35-78.88-48.43-78.88-79.07s28.01-58.72,78.88-79.07c48.26-19.3,112.22-29.93,180.12-29.93s131.86,10.63,180.12,29.93c50.87,20.35,78.88,48.43,78.88,79.07s-28.01,58.72-78.88,79.07c-48.26,19.3-112.22,29.93-180.12,29.93Z"/>
    <ellipse fill="${c}" cx="277.5" cy="127.5" rx="250" ry="100"/>
    ${TS(tc, 142.5)}`],

  // 2 — octagon  (navy text)
  [555, 255, (c, tc) => `
    <path fill="white" stroke="#8f92a4" stroke-miterlimit="10" d="M87.5,254.5c-5.35,0-10.53-1.57-14.98-4.54l-60-40c-7.53-5.02-12.02-13.42-12.02-22.47v-120c0-9.05,4.5-17.45,12.02-22.47L72.52,5.03c4.45-2.97,9.63-4.53,14.98-4.53h380c5.35,0,10.53,1.57,14.98,4.54l60,40c7.53,5.02,12.02,13.42,12.02,22.47v120c0,9.05-4.49,17.45-12.02,22.47l-60,40c-4.45,2.97-9.63,4.53-14.98,4.53H87.5Z"/>
    <path fill="#1e2448" d="M87.5,236.5c-1.78,0-3.51-.53-4.99-1.51l-60-40c-2.5-1.67-4.01-4.48-4.01-7.49v-120c0-3.01,1.5-5.82,4.01-7.49l60-40c1.48-.99,3.22-1.51,4.99-1.51h380c1.78,0,3.51.53,4.99,1.51l60,40c2.5,1.67,4.01,4.48,4.01,7.49v120c0,3.01-1.5,5.82-4.01,7.49l-60,40c-1.48.99-3.22,1.51-4.99,1.51H87.5Z"/>
    <path fill="${c}" d="M87.5,27.5h380l60,40v120l-60,40H87.5l-60-40v-120l60-40Z"/>
    ${TS(tc, 142.5)}`],

  // 3 — stadium / bow-end  (yellow text)
  [555, 255, (c, tc) => `
    <path fill="white" stroke="#8f92a4" stroke-miterlimit="10" d="M127.5,254.5C57.47,254.5.5,197.53.5,127.5S57.47.5,127.5.5h300c70.03,0,127,56.97,127,127s-56.97,127-127,127H127.5Z"/>
    <path fill="#1e2448" d="M127.5,236.5c-60.1,0-109-48.9-109-109S67.4,18.5,127.5,18.5h300c60.1,0,109,48.9,109,109s-48.9,109-109,109H127.5Z"/>
    <path fill="${c}" d="M127.5,27.5h300c55.23,0,100,44.77,100,100s-44.77,100-100,100H127.5c-55.23,0-100-44.77-100-100S72.27,27.5,127.5,27.5Z"/>
    ${TS(tc, 142.5)}`],

  // 4 — rounded rectangle  (yellow text)
  [555, 255, (c, tc) => `
    <rect fill="white" stroke="#8f92a4" stroke-miterlimit="10" x=".5" y=".5" width="554" height="254" rx="67" ry="67"/>
    <rect fill="#1e2448" x="18.5" y="18.5" width="518" height="218" rx="49" ry="49"/>
    <path fill="${c}" d="M67.5,27.5h420c22.09,0,40,17.91,40,40v120c0,22.09-17.91,40-40,40H67.5c-22.09,0-40-17.91-40-40v-120c0-22.09,17.91-40,40-40Z"/>
    ${TS(tc, 142.5)}`],

  // 5 — barrel / shield  (Asset 8v2, yellow text)
  [555, 260, (c, tc) => `
    <path fill="white" stroke="#8f92a4" stroke-miterlimit="10" d="M.5,224.06V36.06c0-6.05,4.62-11.1,10.64-11.64L276.45.55c.7-.06,1.4-.06,2.1,0l265.31,23.88c6.02.54,10.64,5.59,10.64,11.64v187.99c0,6.05-4.62,11.1-10.64,11.64l-265.31,23.88c-.7.06-1.4.06-2.1,0L11.14,235.7c-6.02-.54-10.64-5.59-10.64-11.64Z"/>
    <path fill="#1e2448" d="M18.5,210.5V49.63c0-4.41,3.37-8.1,7.76-8.49l250.47-22.54c.51-.05,1.02-.05,1.53,0l250.47,22.54c4.39.4,7.76,4.08,7.76,8.49v160.87c0,4.41-3.37,8.1-7.76,8.49l-250.47,22.54c-.51.05-1.02.05-1.53,0l-250.47-22.54c-4.39-.4-7.76-4.08-7.76-8.49Z"/>
    <polygon fill="${c}" points="27.5 50.06 27.5 210.06 277.5 232.56 527.5 210.06 527.5 50.06 277.5 27.56 27.5 50.06"/>
    ${TS(tc, 144.28)}`],

];

// ─── Cloud layout ────────────────────────────────────────────────────────

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rnd(min, max) { return min + Math.random() * (max - min); }

// Navy-text logos (0-2) always use yellow/orange/cyan.
// Yellow-text logos (3-5) always use red/green/purple.
const BRAND_NAVY = ['#fdcd14', '#ff931e', '#09b8e3'];
const BRAND_YELLOW = ['#e30615', '#30a533', '#ab539a'];

function assignBrandColors(pickedLogos) {
  const navyPool   = shuffled([...BRAND_NAVY]);
  const yellowPool = shuffled([...BRAND_YELLOW]);
  const navyIdx    = { i: 0 };
  const yellowIdx  = { i: 0 };
  return pickedLogos.map(logoIdx =>
    logoIdx < 3 ? navyPool[navyIdx.i++] : yellowPool[yellowIdx.i++]
  );
}

function assignMonoColors(pickedLogos) {
  const h = Math.floor(Math.random() * 360);
  // 6 shade variants: different saturation + lightness offset from the WCAG-minimum.
  // Offset pushes lighter (for navy text) or darker (for yellow text) to spread the shades.
  const variants = shuffled([
    { s: 90, lOff:  0 },
    { s: 75, lOff: 12 },
    { s: 85, lOff: 22 },
    { s: 65, lOff:  6 },
    { s: 95, lOff: 16 },
    { s: 70, lOff: 28 },
  ]);
  return pickedLogos.map((logoIdx, i) => {
    const { s, lOff } = variants[i];
    const baseL = findLightness(h, s, TEXT_LUM[logoIdx]);
    const needsLight = TEXT_LUM[logoIdx] < 0.5;
    const l = needsLight ? Math.min(97, baseL + lOff) : Math.max(3, baseL - lOff);
    const [r, g, b] = hslToRgb(h, s, l);
    if (contrastRatio(TEXT_LUM[logoIdx], luminance(r, g, b)) >= MIN_CONTRAST)
      return toHex(r, g, b);
    return toHex(...hslToRgb(h, s, baseL));
  });
}

// 9 slots — more than the max count of 6, so picking 6 always produces a
// random subset (C(9,6) = 84 combinations) rather than the same fixed ring.
const SLOTS = [
  {  dx:  0.00,  dy:  0.00 },  // centre
  {  dx:  0.58,  dy: -0.22 },  // upper-right
  {  dx:  0.32,  dy:  0.58 },  // lower-right
  {  dx: -0.52,  dy:  0.12 },  // left
  {  dx:  0.12,  dy: -0.56 },  // upper-centre
  {  dx: -0.24,  dy:  0.54 },  // lower-left
  {  dx: -0.46,  dy: -0.40 },  // upper-left
  {  dx:  0.54,  dy:  0.34 },  // lower-right-alt
  {  dx: -0.14,  dy: -0.24 },  // centre-upper
];

const CANVAS_W = 1200, CANVAS_H = 750;

function buildCloud(count) {
  const pickedLogos = shuffled([0, 1, 2, 3, 4, 5]).slice(0, count);

  // For count=2, skip the one slot pair where both logos are far apart horizontally.
  let pickedSlots = shuffled([...SLOTS]).slice(0, count);
  if (count === 2) {
    let attempts = 0;
    while (attempts < 20 && Math.abs(pickedSlots[0].dx - pickedSlots[1].dx) > 0.84) {
      pickedSlots = shuffled([...SLOTS]).slice(0, 2);
      attempts++;
    }
  }

  const W = 555, H = 255;         // native SVG dimensions (used for slot spacing)
  const LOGO_SCALE = 0.60;        // drawn size relative to native — adjust to taste
  const WD = Math.round(W * LOGO_SCALE);  // ≈ 333
  const HD = Math.round(H * LOGO_SCALE);  // ≈ 153

  // Spread scales with count: 0.68 at count=2, up to 0.84 at count=6.
  // Positions use native W/H so gaps between the smaller drawn logos are generous.
  const spread = 0.64 + (count - 1) * 0.04;

  const rawPos = pickedSlots.map(slot => ({
    tx:  Math.round(slot.dx * W * spread + rnd(-15, 15)),
    ty:  Math.round(slot.dy * H * spread + rnd(-10, 10)),
    rot: rnd(-8, 8),
  }));

  // Bounding box uses drawn dimensions + margin for breathing room / rotation bleed.
  const MARGIN = 60;
  const minX = Math.min(...rawPos.map(p => p.tx)) - MARGIN;
  const minY = Math.min(...rawPos.map(p => p.ty)) - MARGIN;
  const maxX = Math.max(...rawPos.map(p => p.tx + WD)) + MARGIN;
  const maxY = Math.max(...rawPos.map(p => p.ty + HD)) + MARGIN;

  // Shift so the padded cluster centre lands on the canvas centre
  const ox = Math.round(CANVAS_W / 2 - (minX + maxX) / 2);
  const oy = Math.round(CANVAS_H / 2 - (minY + maxY) / 2);

  const usedHues = [];
  const mode = document.querySelector('.mode-btn.mode-btn--active').dataset.colorway;
  const palette = mode === 'brand' ? assignBrandColors(pickedLogos)
                : mode === 'mono'  ? assignMonoColors(pickedLogos)
                : null;
  const pieces = pickedLogos.map((logoIdx, i) => {
    const [lw, lh, contentFn] = logos[logoIdx];
    const thisWD = Math.round(lw * LOGO_SCALE);
    const thisHD = Math.round(lh * LOGO_SCALE);
    const color = palette ? palette[i] : randomAccessibleColor(logoIdx, usedHues);
    const tc = mode === 'brand' ? (logoIdx < 3 ? '#1e2448' : '#fdcd14') : bestTextColor(color);
    const { tx, ty, rot } = rawPos[i];

    // scale() shrinks the native-coordinate paths to the drawn size.
    // rotate centre is expressed in drawn (post-scale) coordinates.
    return `<g transform="translate(${tx + ox},${ty + oy}) rotate(${rot.toFixed(2)},${thisWD / 2},${thisHD / 2}) scale(${LOGO_SCALE})">
      ${contentFn(color, tc)}
    </g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" style="width:100%;height:auto">
    ${pieces.join('\n')}
  </svg>`;
}

const EMBEDDED_CSS = `
  @font-face {
    font-family: 'Manrope';
    font-weight: 800;
    font-style: normal;
    src: url('https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRggexSvfedN4.woff2') format('woff2');
  }
`;

function getCount() {
  if (document.getElementById('count-random').classList.contains('active'))
    return Math.floor(Math.random() * 6) + 1;
  return parseInt(document.getElementById('count-slider').value);
}

function onCountRandomToggle() {
  const btn = document.getElementById('count-random');
  const slider = document.getElementById('count-slider');
  const isRandom = btn.classList.toggle('active');
  slider.classList.toggle('thumb-hidden', isRandom);
  render();
}

function setColorway(btn) {
  if (btn.classList.contains('mode-btn--active')) return;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('mode-btn--active'));
  btn.classList.add('mode-btn--active');
  render();
}

function render() {
  const count = getCount();
  const isRandom = document.getElementById('count-random').classList.contains('active');
  document.querySelectorAll('.slider-ticks span').forEach((el, i) => {
    el.classList.toggle('active', !isRandom && i + 1 === count);
  });
  document.getElementById('logo').innerHTML = buildCloud(count);
}

function randomize() { render(); }

function downloadSVG() {
  const svg = document.querySelector('#logo svg');
  if (!svg) return;

  const clone = svg.cloneNode(true);
  clone.removeAttribute('style'); // strip display-only style

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = EMBEDDED_CSS;
  clone.insertBefore(styleEl, clone.firstChild);

  const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + new XMLSerializer().serializeToString(clone);

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
  a.download = 'logo-composition.svg';
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById('count-slider').addEventListener('pointerdown', function() {
  const btn = document.getElementById('count-random');
  if (btn.classList.contains('active')) {
    btn.classList.remove('active');
    this.classList.remove('thumb-hidden');
  }
});

document.querySelectorAll('.slider-ticks span').forEach((el, i) => {
  el.addEventListener('click', () => {
    const slider = document.getElementById('count-slider');
    const btn = document.getElementById('count-random');
    btn.classList.remove('active');
    slider.classList.remove('thumb-hidden');
    slider.value = i + 1;
    render();
  });
});

render();
