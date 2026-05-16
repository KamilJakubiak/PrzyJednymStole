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

// Pre-computed outline of "#PrzyJednymStole" — Manrope v20 ExtraBold 800, 48px, letter-spacing -2px, baseline at y=0
const TEXT_OUTLINE = 'M8.784 -0.048 11.232 -9.072H2.88L4.512 -15.216H12.864L14.16 -20.16H5.808L7.488 -26.256H15.792L18.048 -34.56H24.384L22.128 -26.256H27.312L29.568 -34.56H35.904L33.648 -26.256H42L40.368 -20.16H32.016L30.672 -15.216H39.024L37.392 -9.072H29.04L26.64 -0.048H20.304L22.704 -9.072H17.52L15.12 -0.048ZM19.2 -15.216H24.336L25.68 -20.16H20.496Z M46.24 0V-34.56H60.832Q61.336 -34.56 62.188 -34.524Q63.04 -34.488 63.712 -34.368Q66.808 -33.888 68.788 -32.328Q70.768 -30.768 71.704 -28.404Q72.64 -26.04 72.64 -23.136Q72.64 -20.232 71.692 -17.868Q70.744 -15.504 68.764 -13.944Q66.784 -12.384 63.712 -11.904Q63.04 -11.808 62.176 -11.76Q61.312 -11.712 60.832 -11.712H52.768V0ZM52.768 -17.808H60.544Q61.048 -17.808 61.648 -17.856Q62.248 -17.904 62.752 -18.048Q64.072 -18.408 64.792 -19.26Q65.512 -20.112 65.788 -21.156Q66.064 -22.2 66.064 -23.136Q66.064 -24.072 65.788 -25.116Q65.512 -26.16 64.792 -27.012Q64.072 -27.864 62.752 -28.224Q62.248 -28.368 61.648 -28.416Q61.048 -28.464 60.544 -28.464H52.768Z M75.44 0V-25.92H81.2V-19.584L80.576 -20.4Q81.08 -21.744 81.92 -22.848Q82.76 -23.952 83.984 -24.672Q84.92 -25.248 86.024 -25.572Q87.128 -25.896 88.304 -25.98Q89.48 -26.064 90.656 -25.92V-19.824Q89.576 -20.16 88.148 -20.052Q86.72 -19.944 85.568 -19.392Q84.416 -18.864 83.624 -17.988Q82.832 -17.112 82.424 -15.924Q82.016 -14.736 82.016 -13.248V0Z M90.816 0V-0.816L103.536 -20.256H92.256V-25.92H113.616V-25.104L100.944 -5.664H113.136V0Z M120.208 11.52 125.2 -2.208 125.296 1.824 114.016 -25.92H120.784L128.368 -6.288H126.832L134.368 -25.92H140.896L126.256 11.52Z M149.504 0.72Q145.376 0.72 142.7 -1.392Q140.024 -3.504 138.896 -7.104L145.328 -8.64Q145.544 -7.32 146.72 -6.348Q147.896 -5.376 149.216 -5.376Q150.128 -5.376 151.172 -5.88Q152.216 -6.384 152.672 -7.488Q152.96 -8.184 153.008 -9.192Q153.056 -10.2 153.056 -11.52V-34.56H159.68V-11.52Q159.68 -9.864 159.668 -8.64Q159.656 -7.416 159.428 -6.348Q159.2 -5.28 158.528 -4.128Q157.064 -1.584 154.712 -0.432Q152.36 0.72 149.504 0.72Z M176.928 0.72Q172.944 0.72 169.908 -0.996Q166.872 -2.712 165.156 -5.724Q163.44 -8.736 163.44 -12.624Q163.44 -16.872 165.12 -20.016Q166.8 -23.16 169.752 -24.9Q172.704 -26.64 176.544 -26.64Q180.624 -26.64 183.48 -24.72Q186.336 -22.8 187.704 -19.32Q189.072 -15.84 188.664 -11.136H182.208V-13.536Q182.208 -17.496 180.948 -19.236Q179.688 -20.976 176.832 -20.976Q173.496 -20.976 171.924 -18.948Q170.352 -16.92 170.352 -12.96Q170.352 -9.336 171.924 -7.356Q173.496 -5.376 176.544 -5.376Q178.464 -5.376 179.832 -6.216Q181.2 -7.056 181.92 -8.64L188.448 -6.768Q186.984 -3.216 183.828 -1.248Q180.672 0.72 176.928 0.72ZM168.336 -11.136V-15.984H185.52V-11.136Z M202.576 0.72Q199 0.72 196.312 -1.08Q193.624 -2.88 192.124 -5.976Q190.624 -9.072 190.624 -12.96Q190.624 -16.92 192.148 -20.004Q193.672 -23.088 196.432 -24.864Q199.192 -26.64 202.912 -26.64Q206.608 -26.64 209.128 -24.84Q211.648 -23.04 212.944 -19.944Q214.24 -16.848 214.24 -12.96Q214.24 -9.072 212.932 -5.976Q211.624 -2.88 209.032 -1.08Q206.44 0.72 202.576 0.72ZM203.632 -5.088Q205.816 -5.088 207.124 -6.072Q208.432 -7.056 209.008 -8.832Q209.584 -10.608 209.584 -12.96Q209.584 -15.312 209.008 -17.088Q208.432 -18.864 207.172 -19.848Q205.912 -20.832 203.872 -20.832Q201.688 -20.832 200.284 -19.764Q198.88 -18.696 198.208 -16.908Q197.536 -15.12 197.536 -12.96Q197.536 -10.776 198.184 -8.988Q198.832 -7.2 200.176 -6.144Q201.52 -5.088 203.632 -5.088ZM209.584 0V-17.76H208.768V-34.56H215.344V0Z M237.728 0V-12.24Q237.728 -13.128 237.632 -14.508Q237.536 -15.888 237.032 -17.28Q236.528 -18.672 235.388 -19.608Q234.248 -20.544 232.16 -20.544Q231.32 -20.544 230.36 -20.28Q229.4 -20.016 228.56 -19.26Q227.72 -18.504 227.18 -17.04Q226.64 -15.576 226.64 -13.152L222.896 -14.928Q222.896 -18 224.144 -20.688Q225.392 -23.376 227.9 -25.032Q230.408 -26.688 234.224 -26.688Q237.272 -26.688 239.192 -25.656Q241.112 -24.624 242.18 -23.04Q243.248 -21.456 243.704 -19.74Q244.16 -18.024 244.256 -16.608Q244.352 -15.192 244.352 -14.544V0ZM220.016 0V-25.92H225.824V-17.328H226.64V0Z M251.904 11.52 256.896 -2.208 256.992 1.824 245.712 -25.92H252.48L260.064 -6.288H258.528L266.064 -25.92H272.592L257.952 11.52Z M305.152 0V-15.312Q305.152 -17.88 303.94 -19.308Q302.728 -20.736 300.592 -20.736Q299.224 -20.736 298.216 -20.1Q297.208 -19.464 296.644 -18.324Q296.08 -17.184 296.08 -15.696L293.344 -17.52Q293.344 -20.184 294.604 -22.224Q295.864 -24.264 297.988 -25.404Q300.112 -26.544 302.704 -26.544Q307.144 -26.544 309.412 -23.916Q311.68 -21.288 311.68 -17.04V0ZM273.904 0V-25.92H279.664V-17.328H280.48V0ZM289.552 0V-15.312Q289.552 -17.88 288.34 -19.308Q287.128 -20.736 284.992 -20.736Q282.952 -20.736 281.716 -19.332Q280.48 -17.928 280.48 -15.696L277.744 -17.616Q277.744 -20.16 279.016 -22.176Q280.288 -24.192 282.436 -25.368Q284.584 -26.544 287.248 -26.544Q290.296 -26.544 292.252 -25.248Q294.208 -23.952 295.144 -21.792Q296.08 -19.632 296.08 -17.04V0Z M328.976 0.72Q325.136 0.72 322.052 -0.636Q318.968 -1.992 316.988 -4.524Q315.008 -7.056 314.48 -10.56L321.296 -11.568Q322.016 -8.592 324.272 -6.984Q326.528 -5.376 329.408 -5.376Q331.016 -5.376 332.528 -5.88Q334.04 -6.384 335.012 -7.368Q335.984 -8.352 335.984 -9.792Q335.984 -10.32 335.828 -10.812Q335.672 -11.304 335.312 -11.736Q334.952 -12.168 334.292 -12.552Q333.632 -12.936 332.624 -13.248L323.648 -15.888Q322.64 -16.176 321.308 -16.704Q319.976 -17.232 318.728 -18.216Q317.48 -19.2 316.652 -20.82Q315.824 -22.44 315.824 -24.912Q315.824 -28.392 317.576 -30.696Q319.328 -33 322.256 -34.128Q325.184 -35.256 328.736 -35.232Q332.312 -35.184 335.12 -34.008Q337.928 -32.832 339.824 -30.588Q341.72 -28.344 342.56 -25.104L335.504 -23.904Q335.12 -25.584 334.088 -26.736Q333.056 -27.888 331.628 -28.488Q330.2 -29.088 328.64 -29.136Q327.104 -29.184 325.748 -28.716Q324.392 -28.248 323.54 -27.36Q322.688 -26.472 322.688 -25.248Q322.688 -24.12 323.384 -23.412Q324.08 -22.704 325.136 -22.272Q326.192 -21.84 327.296 -21.552L333.296 -19.92Q334.64 -19.56 336.272 -18.972Q337.904 -18.384 339.404 -17.34Q340.904 -16.296 341.876 -14.592Q342.848 -12.888 342.848 -10.272Q342.848 -7.488 341.684 -5.412Q340.52 -3.336 338.552 -1.98Q336.584 -0.624 334.1 0.048Q331.616 0.72 328.976 0.72Z M361.68 0Q358.992 0.504 356.412 0.444Q353.832 0.384 351.804 -0.468Q349.776 -1.32 348.72 -3.216Q347.76 -4.992 347.712 -6.828Q347.664 -8.664 347.664 -10.992V-33.12H354.192V-11.376Q354.192 -9.864 354.228 -8.652Q354.264 -7.44 354.72 -6.72Q355.584 -5.352 357.48 -5.232Q359.376 -5.112 361.68 -5.424ZM343.248 -20.88V-25.92H361.68V-20.88Z M377.104 0.72Q373.192 0.72 370.24 -1.032Q367.288 -2.784 365.644 -5.868Q364 -8.952 364 -12.96Q364 -17.016 365.68 -20.1Q367.36 -23.184 370.312 -24.912Q373.264 -26.64 377.104 -26.64Q381.016 -26.64 383.98 -24.888Q386.944 -23.136 388.6 -20.052Q390.256 -16.968 390.256 -12.96Q390.256 -8.928 388.588 -5.844Q386.92 -2.76 383.956 -1.02Q380.992 0.72 377.104 0.72ZM377.104 -5.376Q380.248 -5.376 381.796 -7.5Q383.344 -9.624 383.344 -12.96Q383.344 -16.416 381.772 -18.48Q380.2 -20.544 377.104 -20.544Q374.968 -20.544 373.6 -19.584Q372.232 -18.624 371.572 -16.92Q370.912 -15.216 370.912 -12.96Q370.912 -9.48 372.484 -7.428Q374.056 -5.376 377.104 -5.376Z M394.016 0V-35.28H400.544V0Z M417.792 0.72Q413.808 0.72 410.772 -0.996Q407.736 -2.712 406.02 -5.724Q404.304 -8.736 404.304 -12.624Q404.304 -16.872 405.984 -20.016Q407.664 -23.16 410.616 -24.9Q413.568 -26.64 417.408 -26.64Q421.488 -26.64 424.344 -24.72Q427.2 -22.8 428.568 -19.32Q429.936 -15.84 429.528 -11.136H423.072V-13.536Q423.072 -17.496 421.812 -19.236Q420.552 -20.976 417.696 -20.976Q414.36 -20.976 412.788 -18.948Q411.216 -16.92 411.216 -12.96Q411.216 -9.336 412.788 -7.356Q414.36 -5.376 417.408 -5.376Q419.328 -5.376 420.696 -6.216Q422.064 -7.056 422.784 -8.64L429.312 -6.768Q427.848 -3.216 424.692 -1.248Q421.536 0.72 417.792 0.72ZM409.2 -11.136V-15.984H426.384V-11.136Z';

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
  clone.removeAttribute('style');

  clone.querySelectorAll('text').forEach(textEl => {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('fill', textEl.getAttribute('fill') || '#000000');
    const transform = textEl.getAttribute('transform');
    if (transform) pathEl.setAttribute('transform', transform);
    pathEl.setAttribute('d', TEXT_OUTLINE);
    textEl.parentNode.replaceChild(pathEl, textEl);
  });

  const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + new XMLSerializer().serializeToString(clone);

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
  a.download = 'logo-composition.svg';
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadPNG() {
  const svg = document.querySelector('#logo svg');
  if (!svg) return;

  // Crop to actual content, not the full 1200×750 canvas
  const pad = 40;
  const b = svg.getBBox();
  const vx = b.x - pad, vy = b.y - pad;
  const vw = b.width + pad * 2, vh = b.height + pad * 2;

  const SCALE = 3;
  const clone = svg.cloneNode(true);
  clone.removeAttribute('style');
  clone.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  clone.setAttribute('width', vw * SCALE);
  clone.setAttribute('height', vh * SCALE);

  clone.querySelectorAll('text').forEach(textEl => {
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('fill', textEl.getAttribute('fill') || '#000000');
    const transform = textEl.getAttribute('transform');
    if (transform) pathEl.setAttribute('transform', transform);
    pathEl.setAttribute('d', TEXT_OUTLINE);
    textEl.parentNode.replaceChild(pathEl, textEl);
  });

  const svgStr = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = vw * SCALE;
    canvas.height = vh * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'logo-composition.png';
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
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
