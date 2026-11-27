// V3-191 Real materials and light for the common 3D viewer (the app, the portal and the website draw with it).
// Owner, 19 Nov: "upgrade textures shaders, effects, remove fog make thes models more realistic".
//
// What this module does (appearance only: no part sizes, positions or counts change):
//  * Generates its own textures in code (no downloads): pressure treated pine and cedar with grain along each board,
//    knots, latewood bands and matching normal and roughness maps; vinyl, powder coat, galvanised spangle, concrete,
//    soil and a lawn that does not repeat. They are made once per size and kept (cache), and given back on dispose().
//  * Maps them by the part's real size in feet, in the shader: grain runs along the longest side of every board,
//    rail and post, cut ends show end grain, every board gets its own offset and shade (seeded by where it stands),
//    and edges are a touch lighter, as eased lumber is.
//  * Takes the fog away. Instead the ground runs out to the horizon and blends into the sky's horizon colour there
//    (outdoor), or into the backdrop (showroom), so there is no cut-off edge and nothing near the fence is hazed.
//  * Adds a soft contact shadow under each run, fits the sun's shadow to the fence, and scales texture size, shadow
//    map size, pixel ratio and the contact shadow by the Quality setting (Auto picks from the device).
// The pure helpers (no DOM, no three.js) are exported for the tests.

export const VERSION = 'v3191';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------------------------------------ quality tiers
// tex: wood tile height in pixels (its width is 1/4 of that: a tile is 1 ft across and 4 ft along the grain). 1024 is
// 21 pixels an inch. 2048 drew stripes across the boards in the test browser's software GPU, so it is not used.
export const TIERS = {
  field: {tex: 1024, lawn: 512, shadow: 1024, px: 1.25, contact: false, aniso: 4},
  balanced: {tex: 1024, lawn: 1024, shadow: 2048, px: 1.5, contact: true, aniso: 8},
  high: {tex: 1024, lawn: 1024, shadow: 2048, px: 2, contact: true, aniso: 16},
  ultra: {tex: 1024, lawn: 2048, shadow: 4096, px: 2, contact: true, aniso: 16},
};
/** The Quality menu (auto / field / presentation) to a tier. Auto takes the device's tier (detected or chosen). */
export function tierForQuality(mode, detected) {
  if (mode === 'field') return 'field';
  if (mode === 'presentation') return 'ultra';
  return TIERS[detected] ? detected : 'balanced';
}
/** What one tier asks of the renderer, capped by what this device can do. */
export function tierSettings(name, {dpr = 1, maxTexture = 4096, maxAniso = 16} = {}) {
  const t = TIERS[name] || TIERS.balanced;
  return {...t, name: TIERS[name] ? name : 'balanced', px: Math.min(dpr || 1, t.px), shadow: Math.min(maxTexture, t.shadow),
    tex: Math.min(maxTexture, t.tex), lawn: Math.min(maxTexture, t.lawn), aniso: Math.max(1, Math.min(maxAniso || 1, t.aniso))};
}

// ------------------------------------------------------------------------------------------------ species
// Saved colours stay as they are; the species decides the grain's character. Cedar: the viewer's cedar, cedar tone
// and the cedar split rail colours. Anything else drawn as wood is pressure treated pine.
const CEDAR_HEX = new Set([11893055, 12618314, 15778958]);
export function speciesOf(hex, pal) {
  const n = Number(hex);
  if (CEDAR_HEX.has(n)) return 'cedar';
  if (pal && (n === pal.cedar || n === pal.cedartone)) return 'cedar';
  return 'pt';
}
// A gentle tint on top of the saved colour so the two woods read differently even where the saved colours are close:
// pressure treated pine leans green-tan, cedar warm and red.
export const SPECIES_TINT = {pt: [1, 1, 0.99], cedar: [1.02, 0.99, 0.97], grain: [1, 1, 1]};

// ------------------------------------------------------------------------------------------------ noise
export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function lattice(seed, px, py) {
  const r = mulberry32(seed), a = new Float32Array(px * py);
  for (let i = 0; i < a.length; i++) a[i] = r();
  return a;
}
const smooth = t => t * t * (3 - 2 * t);
/** Tileable value noise on a px x py lattice, x and y in lattice units. */
export function periodicNoise(grid, px, py, x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
  const a = grid[y0 * px + x0], b = grid[y0 * px + x1], c = grid[y1 * px + x0], d = grid[y1 * px + x1];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
/** Tileable fractal noise: u, v in 0..1 of the tile; cx, cy cells across the tile at the first octave. 0..1. */
export function makeFbm(seed, cx, cy, octaves = 4) {
  const grids = [];
  for (let o = 0; o < octaves; o++) { const px = cx << o, py = cy << o; grids.push({px, py, g: lattice(seed + o * 101, px, py)}); }
  return (u, v) => {
    let s = 0, amp = 0.5, tot = 0;
    for (const {px, py, g} of grids) { s += amp * periodicNoise(g, px, py, u * px, v * py); tot += amp; amp *= 0.5; }
    return s / tot;
  };
}
/** sRGB transfer to linear light for one channel 0..1 (as three.js decodes an sRGB texture). Pure. */
export const srgbToLinear = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);

// ------------------------------------------------------------------------------------------------ wood
const WOOD = {
  // Southern yellow pine, treated (MCA): pale early wood, darker late wood bands, a slight green cast, knots.
  pt: {rings: 9, late: [0.74, 0.68, 0.5], early: [0.86, 0.8, 0.62], contrast: 1, knotP: 0.55, knotR: [0.022, 0.04], knot: [0.62, 0.5, 0.34], green: 0.02, streak: 0.03, fibre: 0.035},
  // Western red cedar: softer, tighter bands, strong streaks from salmon to chocolate within one board.
  cedar: {rings: 14, late: [0.7, 0.48, 0.33], early: [0.8, 0.56, 0.39], contrast: 1, knotP: 0.45, knotR: [0.018, 0.034], knot: [0.55, 0.36, 0.24], green: 0, streak: 0.08, fibre: 0.04},
  // Wood-grain vinyl: the same figure, much quieter, no knots.
  grain: {rings: 10, late: [0.84, 0.84, 0.84], early: [0.92, 0.92, 0.92], contrast: 0.8, knotP: 0, knotR: [0, 0], knot: [0.8, 0.8, 0.8], green: 0, streak: 0.02, fibre: 0.03},
};
const hash1 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/**
 * One wood tile: W across (1 ft, two board widths) by H along the grain (4 ft); grain runs along v. Pure, deterministic,
 * tileable. The left half is flat sawn (cathedral arches where the growth rings cut the face), the right half rift
 * sawn (straight lines); boards sample it at random offsets, so neighbours differ.
 * Returns {W, H, rgb (Float32Array 3n, colour relative to the tile's mean: mean 1 per channel), height, rough (0..1)}.
 */
export function woodFields(W, H, {species = 'pt', seed = 7} = {}) {
  const P = WOOD[species] || WOOD.pt, n = W * H, rnd = mulberry32(seed * 977 + 13);
  const warpA = makeFbm(seed + 1, 2, 4, 3), warpB = makeFbm(seed + 2, 8, 24, 3), fibre = makeFbm(seed + 3, 160, 3, 2), patch = makeFbm(seed + 4, 3, 2, 3);
  const streak = makeFbm(seed + 5, 10, 1, 2), depth = makeFbm(seed + 6, 1, 2, 2), pores = makeFbm(seed + 8, 220, 40, 1);
  // Knots are rare: at most one per tile (two board widths by 4 ft), so most boards show none.
  const knots = [], kn = rnd() < P.knotP ? 1 : 0;
  for (let k = 0; k < kn; k++) knots.push({u: rnd(), v: rnd(), r: P.knotR[0] + rnd() * (P.knotR[1] - P.knotR[0]), e: 1.2 + rnd() * 0.8});
  const rgb = new Float32Array(n * 3), height = new Float32Array(n), rough = new Float32Array(n);
  const ringW = []; for (let i = 0; i < 64; i++) ringW.push(0.45 + hash1(i + seed * 13) * 0.35);   // where the late wood starts in each ring
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W;
      // Mostly straight grain along the board, wandering gently; the depth term adds a slow, faint drift (no loops).
      let ring = u * P.rings * 2 + (warpA(u, v) - 0.5) * 0.8 + (warpB(u, v) - 0.5) * 0.2 + (depth(u, v) - 0.5) * 0.6;
      let knotCore = 0, knotRing = 0;
      for (const k of knots) {
        let du = u - k.u, dv = v - k.v; du -= Math.round(du); dv -= Math.round(dv);
        const dvf = dv * 4 / k.e, dist = Math.sqrt(du * du + dvf * dvf) / k.r;
        // The grain bends smoothly around the knot (no spokes): lines either side are pushed aside over a few knot heights.
        ring += 1.1 * Math.tanh(du / k.r) * Math.exp(-(dvf * dvf) / (k.r * k.r * 10)) * Math.exp(-(du * du) / (k.r * k.r * 20));
        knotCore = Math.max(knotCore, (1 - sstep(0.45, 1.15, dist)) * 0.75);
        knotRing = Math.max(knotRing, (1 - sstep(1.0, 1.7, dist)) * (1 - knotCore) * 0.5);
      }
      const ri = Math.floor(ring), f = ring - ri, lw = ringW[((ri % 64) + 64) % 64];
      const late = sstep(lw, lw + 0.1, f) * (1 - sstep(0.93, 1, f));
      const fib = fibre(u, v), pt = patch(u, v), st = streak(u, v), pore = pores(u, v);
      const line = sstep(0.62, 0.7, fib) * P.fibre;   // thin dark fibre lines along the grain
      // Low colour contrast (fence lumber reads as an even colour from a few feet away): the grain is mostly in the relief.
      let c = 1 - late * P.contrast * 0.04 - line * 0.5 - (pore > 0.8 ? 0.01 : 0);
      let r = P.early[0] * c + (P.late[0] - P.early[0]) * late * P.contrast * 0.3;
      let g = P.early[1] * c + (P.late[1] - P.early[1]) * late * P.contrast * 0.3;
      let b = P.early[2] * c + (P.late[2] - P.early[2]) * late * P.contrast * 0.3;
      const sw = (st - 0.5) * P.streak * 2;
      r *= 1 + sw; g *= 1 + sw * 0.7; b *= 1 + sw * 0.5;
      g *= 1 + (pt - 0.5) * P.green * 2; r *= 1 - (pt - 0.5) * P.green;
      if (knotRing > 0) { r *= 1 - knotRing * 0.1; g *= 1 - knotRing * 0.11; b *= 1 - knotRing * 0.12; }
      if (knotCore > 0) { r += (P.knot[0] - r) * knotCore; g += (P.knot[1] - g) * knotCore; b += (P.knot[2] - b) * knotCore; }
      const i = y * W + x;
      rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
      // Weathered wood: the soft early wood wears down, the late wood stands up a little; fibres score along the grain.
      height[i] = 0.5 + late * 0.25 * P.contrast - line * 0.4 + (fib - 0.5) * 0.15 - knotCore * 0.1 + knotRing * 0.05;
      rough[i] = clamp01(0.84 - late * 0.1 * P.contrast + line * 0.06 + knotCore * 0.04);
    }
  }
  const m = [0, 0, 0];
  for (let i = 0; i < n; i++) { m[0] += rgb[i * 3]; m[1] += rgb[i * 3 + 1]; m[2] += rgb[i * 3 + 2]; }
  for (let c = 0; c < 3; c++) m[c] /= n;
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] /= m[c];
  return {W, H, rgb, height, rough};
}

/** Tangent-space normal map (RGBA bytes) from a tileable height field. strength in "height units per pixel". */
export function heightToNormal(h, W, H, strength = 2) {
  const out = new Uint8ClampedArray(W * H * 4), at = (x, y) => h[((y + H) % H) * W + ((x + W) % W)];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const nx = -dx, ny = dy, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * W + x) * 4;
    out[i] = (nx / l * 0.5 + 0.5) * 255; out[i + 1] = (ny / l * 0.5 + 0.5) * 255; out[i + 2] = (nz / l * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}
/** Relative colour (mean 1) to sRGB bytes at a set brightness (the material colour carries the rest). */
export function relToBytes(rgb, n, level = 0.8) {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) { for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(clamp01(rgb[i * 3 + c] * level) * 255); out[i * 4 + 3] = 255; }
  return out;
}
/** Relief in red, roughness in green (three.js reads roughness from green, bump height from red): one texture. */
export function surfaceBytes(height, rough, n) {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) { out[i * 4] = Math.round(clamp01(height[i]) * 255); out[i * 4 + 1] = Math.round(clamp01(rough[i]) * 255); out[i * 4 + 2] = 128; out[i * 4 + 3] = 255; }
  return out;
}
export function grayBytes(f, n) {
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) { const g = Math.round(clamp01(f[i]) * 255); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = g; out[i * 4 + 3] = 255; }
  return out;
}
// Roughness lives in the green channel for three.js; grayBytes fills every channel, so either way works.

// ------------------------------------------------------------------------------------------------ other surfaces
/** Square tileable fields for the other families. Returns {S, rgb|null (relative, mean 1), height, rough}. */
export function surfaceFields(kind, S, seed = 11) {
  const n = S * S, height = new Float32Array(n), rough = new Float32Array(n);
  let rgb = null;
  if (kind === 'vinyl' || kind === 'powder') {
    // Vinyl: nearly smooth with faint extrusion lines; powder coat: a fine orange peel.
    const a = makeFbm(seed, kind === 'powder' ? 40 : 3, kind === 'powder' ? 40 : 24, 3), b = makeFbm(seed + 9, 8, 8, 3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, u = x / S, v = y / S;
      height[i] = 0.5 + (a(u, v) - 0.5) * (kind === 'powder' ? 0.9 : 0.25);
      rough[i] = kind === 'powder' ? 0.5 + (b(u, v) - 0.5) * 0.12 : 0.32 + (b(u, v) - 0.5) * 0.1;
    }
  } else if (kind === 'galv') {
    // Hot-dip spangle: crystal cells of slightly different brightness and roughness.
    const r = mulberry32(seed), cells = [];
    for (let k = 0; k < 90; k++) cells.push([r(), r(), r()]);
    const fine = makeFbm(seed + 3, 24, 24, 3);
    rgb = new Float32Array(n * 3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S; let best = 9, val = 0;
      for (const c of cells) { let du = u - c[0], dv = v - c[1]; du -= Math.round(du); dv -= Math.round(dv); const d = du * du + dv * dv; if (d < best) { best = d; val = c[2]; } }
      const i = y * S + x, f = fine(u, v), L = 0.9 + val * 0.18 + (f - 0.5) * 0.08;
      rgb[i * 3] = L; rgb[i * 3 + 1] = L; rgb[i * 3 + 2] = L * 1.01;
      height[i] = 0.5 + (val - 0.5) * 0.15 + (f - 0.5) * 0.2;
      rough[i] = 0.3 + val * 0.18 + (f - 0.5) * 0.06;
    }
  } else if (kind === 'concrete') {
    const a = makeFbm(seed, 4, 4, 5), b = makeFbm(seed + 5, 64, 64, 2), r = mulberry32(seed + 1);
    rgb = new Float32Array(n * 3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, u = x / S, v = y / S, big = a(u, v), grit = b(u, v), speck = r();
      let L = 0.88 + (big - 0.5) * 0.3 + (grit - 0.5) * 0.18;
      if (speck > 0.985) L *= 0.62; else if (speck > 0.97) L *= 1.15;
      rgb[i * 3] = L * 1.01; rgb[i * 3 + 1] = L; rgb[i * 3 + 2] = L * 0.96;
      height[i] = 0.5 + (grit - 0.5) * 0.8 - (speck > 0.985 ? 0.35 : 0);
      rough[i] = 0.86 + (grit - 0.5) * 0.1;
    }
  } else if (kind === 'soil') {
    const a = makeFbm(seed, 5, 5, 5), b = makeFbm(seed + 7, 48, 48, 3), r = mulberry32(seed + 2);
    rgb = new Float32Array(n * 3);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, u = x / S, v = y / S, big = a(u, v), clod = b(u, v), stone = r() > 0.992;
      const L = 0.85 + (big - 0.5) * 0.4 + (clod - 0.5) * 0.35;
      rgb[i * 3] = stone ? 1.5 : L; rgb[i * 3 + 1] = stone ? 1.45 : L * 0.97; rgb[i * 3 + 2] = stone ? 1.35 : L * 0.92;
      height[i] = 0.5 + (clod - 0.5) * 1 + (stone ? 0.4 : 0);
      rough[i] = 0.95;
    }
  } else if (kind === 'lawn') {
    // A 3 ft square of turf seen from above: thousands of blades in clumps, a few dry ones, some clover.
    const r = mulberry32(seed), clump = makeFbm(seed + 1, 6, 6, 4);
    rgb = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = (i % S) / S, v = Math.floor(i / S) / S, c = clump(u, v); rgb[i * 3] = 0.33 + c * 0.05; rgb[i * 3 + 1] = 0.45 + c * 0.07; rgb[i * 3 + 2] = 0.22; height[i] = 0.25; rough[i] = 0.95; }
    const blades = Math.round(n / 9);
    for (let k = 0; k < blades; k++) {
      let x = r() * S, y = r() * S;
      const c = clump(x / S, y / S), len = (3 + r() * 9) * S / 1024, an = r() * TAU, dry = r() < 0.04;
      const L = 0.85 + r() * 0.3 + (c - 0.5) * 0.25, top = 0.55 + r() * 0.45;
      const col = dry ? [0.62 * L, 0.58 * L, 0.38 * L] : [0.36 * L, (0.52 + r() * 0.06) * L, 0.24 * L];
      const dx = Math.cos(an), dy = Math.sin(an), steps = Math.max(2, Math.round(len));
      for (let s = 0; s < steps; s++) {
        const px = ((Math.round(x + dx * s) % S) + S) % S, py = ((Math.round(y + dy * s) % S) + S) % S, i = py * S + px, h = top * (0.6 + 0.4 * s / steps);
        if (h >= height[i]) { height[i] = h; rgb[i * 3] = col[0]; rgb[i * 3 + 1] = col[1]; rgb[i * 3 + 2] = col[2]; rough[i] = 0.82 + r() * 0.12; }
      }
    }
    for (let k = 0; k < 14; k++) {   // clover patches
      const cx = r() * S, cy = r() * S, R = (8 + r() * 16) * S / 1024;
      for (let q = 0; q < R * R * 2; q++) {
        const a = r() * TAU, d = Math.sqrt(r()) * R, px = ((Math.round(cx + Math.cos(a) * d) % S) + S) % S, py = ((Math.round(cy + Math.sin(a) * d) % S) + S) % S, i = py * S + px;
        if (height[i] < 0.75) { rgb[i * 3] = 0.2; rgb[i * 3 + 1] = 0.42; rgb[i * 3 + 2] = 0.16; height[i] = 0.7; }
      }
    }
    // Absolute colours for the lawn (the ground material is white): no mean normalisation.
    return {S, rgb, height, rough, absolute: true};
  } else return null;
  if (rgb) { const m = [0, 0, 0]; for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) m[c] += rgb[i * 3 + c]; for (let c = 0; c < 3; c++) m[c] /= n; for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) rgb[i * 3 + c] /= m[c]; }
  return {S, rgb, height, rough};
}

// ------------------------------------------------------------------------------------------------ sky colour
/** The sky shader's colour at the horizon, toward `dir` (unit x/z), for the sun direction `sun` (unit). Linear. */
export function horizonColor(sun, dir = {x: 1, z: 0}) {
  const sunUp = Math.max(-0.2, Math.min(1, sun.y)), day = sstep(-0.12, 0.22, sunUp);
  const sunTint = [0, 1, 2].map(c => [1, 0.42, 0.16][c] + ([1, 0.96, 0.9][c] - [1, 0.42, 0.16][c]) * sstep(-0.02, 0.34, sunUp));
  const mu = Math.max(-1, Math.min(1, dir.x * sun.x + dir.z * sun.z)), path = 1 / 0.2, rPhase = 0.75 * (1 + mu * mu);
  const g = 0.76, mPhase = (1 - g * g) / Math.pow(1 + g * g - 2 * g * mu, 1.5), ray = [0.128, 0.278, 0.66];
  let sky = ray.map((r, c) => r * rPhase * path * (0.62 + 0.38 * day) + sunTint[c] * mPhase * 0.055 * 2.4 * path * (0.25 + 0.75 * day));
  const hzCol = [0, 1, 2].map(c => ([0.66, 0.7, 0.74][c] + (sunTint[c] * 0.78 - [0.66, 0.7, 0.74][c]) * 0.35 * day) * (0.35 + 0.65 * day));
  sky = sky.map((s, c) => s + (hzCol[c] - s) * 0.7);
  const haze = [0, 1, 2].map(c => [0.3, 0.36, 0.42][c] + ([0.68, 0.76, 0.84][c] - [0.3, 0.36, 0.42][c]) * day);
  const k = sstep(0.02, -0.03, 0);
  return sky.map((s, c) => s + (haze[c] - s) * k);
}

// ------------------------------------------------------------------------------------------------ shader
// Box mapping in the part's own axes, scaled to feet by the instance's scale. `gfsExt`/`gfsMid` are the geometry's
// bounding box (set before each draw), so pickets made as extrusions work like boxes do.
const VERT_HEAD = `uniform vec3 gfsExt;
uniform vec3 gfsMid;
uniform vec4 gfsTile;
varying vec4 gfsP;
varying vec4 gfsHalf;
varying vec3 gfsAx;
`;
const VERT_BODY = `
{
  mat4 gfsM = modelMatrix;
  #ifdef USE_INSTANCING
  gfsM = modelMatrix * instanceMatrix;
  #endif
  vec3 gfsS = vec3(length(gfsM[0].xyz), length(gfsM[1].xyz), length(gfsM[2].xyz));
  vec3 gfsE = gfsExt * gfsS;
  vec3 gp = (position - gfsMid) * gfsS;
  vec3 gn = abs(normal);
  vec3 gGrain = gfsE.x >= gfsE.y && gfsE.x >= gfsE.z ? vec3(1.0, 0.0, 0.0) : (gfsE.y >= gfsE.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  vec3 gNorm = gn.x >= gn.y && gn.x >= gn.z ? vec3(1.0, 0.0, 0.0) : (gn.y >= gn.z ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
  vec3 gWorld = gfsM[3].xyz;
  float gfsSeed = fract(sin(dot(floor(gWorld * 8.0 + 0.5), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float gfsSeed2 = fract(gfsSeed * 91.37 + 0.123);
  float gfsEnd = dot(gGrain, gNorm) > 0.5 ? 1.0 : 0.0;
  vec3 gAcross = vec3(1.0) - gGrain - gNorm;
  vec2 gUv;
  if (gfsEnd > 0.5) gUv = vec2(dot(gp, gGrain.yzx), dot(gp, gGrain.zxy));
  else gUv = vec2(dot(gp, gAcross) * (gfsSeed2 > 0.5 ? 1.0 : -1.0), dot(gp, gGrain));
  gUv = gUv / gfsTile.xy + vec2(gfsSeed * 7.31, gfsSeed2 * 3.77) * gfsTile.z;
  gfsP = vec4(gp, gfsSeed); gfsHalf = vec4(gfsE * 0.5, gfsEnd); gfsAx = gGrain + gNorm * 2.0;
  #ifdef USE_MAP
  vMapUv = gUv;
  #endif
  #ifdef USE_BUMPMAP
  vBumpMapUv = gUv;
  #endif
  #ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv = gUv;
  #endif
  #ifdef USE_CLEARCOAT_NORMALMAP
  vClearcoatNormalMapUv = gUv;
  #endif
}
`;
const FRAG_HEAD = `uniform vec4 gfsTile;
uniform vec4 gfsLook;
uniform vec3 gfsVaryTint;
varying vec4 gfsP;
varying vec4 gfsHalf;
varying vec3 gfsAx;
float gfsWear;
`;
// gfsLook: x board-to-board variation, y end grain (1 wood), z edge wear, w rings per foot on the end grain.
const FRAG_ALBEDO = `
{
  float gfsSeed = gfsP.w, gfsEnd = gfsHalf.w;
  float gv = gfsSeed - 0.5;
  diffuseColor.rgb *= (1.0 + gv * gfsLook.x * 0.1) * mix(vec3(1.0), gfsVaryTint, clamp(fract(gfsSeed * 17.0) * gfsLook.x, 0.0, 1.0));
  vec3 gGrain = step(0.5, mod(gfsAx + 0.25, 2.0));
  vec3 gNorm = step(1.5, gfsAx);
  vec3 gEdge = (gfsHalf.xyz - abs(gfsP.xyz)) + gNorm * 10.0;
  float gd = min(min(gEdge.x, gEdge.y), gEdge.z);
  gfsWear = gfsLook.z * (1.0 - smoothstep(0.0, 0.014, gd));
  diffuseColor.rgb *= 1.0 + gfsWear * 0.16;
  if (gfsEnd > 0.5 && gfsLook.y > 0.0) {
    vec2 q = vec2(dot(gfsP.xyz, gGrain.yzx), dot(gfsP.xyz, gGrain.zxy));
    vec2 pith = vec2(cos(gfsSeed * 6.2831), sin(gfsSeed * 6.2831)) * (0.35 + gfsSeed * 0.5);
    float rr = length(q - pith) * gfsLook.w + sin(atan(q.y - pith.y, q.x - pith.x) * 5.0 + gfsSeed * 20.0) * 0.12;
    float ring = smoothstep(0.55, 0.85, fract(rr)) * (1.0 - smoothstep(0.9, 1.0, fract(rr)));
    diffuseColor.rgb *= mix(vec3(0.84, 0.8, 0.76), vec3(0.62, 0.56, 0.5), ring) * gfsLook.y + vec3(1.0 - gfsLook.y);
  }
}
`;
const FRAG_ROUGH = `
roughnessFactor = clamp(roughnessFactor + gfsWear * 0.08 + (gfsHalf.w > 0.5 ? 0.06 : 0.0) * gfsLook.y, 0.04, 1.0);
`;

function patchShader(sh, mat) {
  const u = mat.userData.gfsU;
  sh.uniforms.gfsTile = u.tile; sh.uniforms.gfsLook = u.look; sh.uniforms.gfsVaryTint = u.tint; sh.uniforms.gfsExt = u.ext; sh.uniforms.gfsMid = u.mid;
  sh.vertexShader = VERT_HEAD + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>' + VERT_BODY);
  sh.fragmentShader = FRAG_HEAD + sh.fragmentShader
    .replace('#include <map_fragment>', '#include <map_fragment>' + FRAG_ALBEDO)
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>' + FRAG_ROUGH);
}
/** The geometry's bounding box size and centre (cached on the geometry), which the shader reads per draw. */
export function geometryBox(geo) {
  if (!geo || !geo.attributes || !geo.attributes.position) return null;
  const ud = geo.userData || (geo.userData = {});
  if (ud.gfsBox && ud.gfsBox.n === geo.attributes.position.count && ud.gfsBox.v === geo.attributes.position.version) return ud.gfsBox;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const b = geo.boundingBox;
  ud.gfsBox = {n: geo.attributes.position.count, v: geo.attributes.position.version,
    ext: [Math.max(1e-4, b.max.x - b.min.x), Math.max(1e-4, b.max.y - b.min.y), Math.max(1e-4, b.max.z - b.min.z)],
    mid: [(b.max.x + b.min.x) / 2, (b.max.y + b.min.y) / 2, (b.max.z + b.min.z) / 2]};
  return ud.gfsBox;
}
// Before each draw: this geometry's box into the material's uniforms (materials are shared by posts, rails and boards).
function boxHook(m) {
  return (_r, _s, _c, geo) => {
    const box = geometryBox(geo), u = m.userData.gfsU; if (!box || !u) return;
    const e = u.ext.value, c = u.mid.value;
    if (e.x !== box.ext[0] || e.y !== box.ext[1] || e.z !== box.ext[2] || c.x !== box.mid[0] || c.y !== box.mid[1] || c.z !== box.mid[2]) {
      e.set(box.ext[0], box.ext[1], box.ext[2]); c.set(box.mid[0], box.mid[1], box.mid[2]); m.uniformsNeedUpdate = true;
    }
  };
}

// ------------------------------------------------------------------------------------------------ textures (DOM)
const stores = new WeakMap();
function store(T) { if (!stores.has(T)) stores.set(T, {tex: new Map(), mats: new Set(), tier: null, aniso: 8}); return stores.get(T); }
function doc() { return globalThis.document; }
function canvasOf(W, H, bytes) {
  const c = doc().createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), id = g.createImageData(W, H); id.data.set(bytes); g.putImageData(id, 0, 0); return c;
}
function finish(T, t, srgb, aniso) {
  t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.needsUpdate = true;
  t.userData.gfsSurface = VERSION; return t;
}
/** {map, bumpMap, roughnessMap} for a family at a size, made once and kept. Relief is a height (bump) map: a normal
 * map striped the boards across the grain in the test renders, and a height map is half the work to make. */
export function textureSet(T, kind, size) {
  const st = store(T), key = kind + '@' + size;
  if (st.tex.has(key)) return st.tex.get(key);
  let W, H, f, level = 0.8;
  if (kind === 'pt' || kind === 'cedar' || kind === 'grain') {
    H = size; W = Math.max(64, size >> 2);
    f = woodFields(W, H, {species: kind, seed: kind === 'cedar' ? 23 : kind === 'grain' ? 31 : 7});
    level = 0.8;
  } else {
    const S = kind === 'lawn' ? size : Math.min(512, size >> 1);
    f = surfaceFields(kind, S, 11); W = H = S;
    level = f.absolute ? 1 : 0.84;
  }
  const n = W * H, aniso = st.aniso;
  const set = {kind, size, level,
    map: f.rgb ? finish(T, new T.CanvasTexture(canvasOf(W, H, f.absolute ? relToBytes(f.rgb, n, 1) : relToBytes(f.rgb, n, level))), true, aniso) : null,
    bumpMap: finish(T, new T.CanvasTexture(canvasOf(W, H, surfaceBytes(f.height, f.rough, n))), false, aniso)};
  set.roughnessMap = set.bumpMap;   // the same texture: fewer samplers per material (see surfaceBytes)
  st.tex.set(key, set);
  return set;
}
function disposeSet(set) { for (const k of ['map', 'bumpMap']) set[k]?.dispose(); }

// ------------------------------------------------------------------------------------------------ materials
// Physical settings per family. tile: [across ft, along ft, offset scale]; look: [variation, end grain, wear, rings/ft].
const FAMILY = {
  wood: {rough: 1, metal: 0, env: 0.55, bump: 0.003, tile: [1, 4, 1], look: [1, 1, 1, 36], clearcoat: 0},
  grain: {rough: 1, metal: 0, env: 0.8, bump: 0.0015, tile: [1, 4, 1], look: [0.25, 0, 0.4, 0], clearcoat: 0.35, ccRough: 0.35},
  vinyl: {rough: 1, metal: 0, env: 0.75, bump: 0.0004, tile: [1.5, 1.5, 1], look: [0.05, 0, 0.35, 0], clearcoat: 0.4, ccRough: 0.28},
  powder: {rough: 1, metal: 0.05, env: 0.9, bump: 0.0008, tile: [0.4, 0.4, 1], look: [0, 0, 0.25, 0], clearcoat: 0.3, ccRough: 0.4},
  galv: {rough: 1, metal: 0.92, env: 1, bump: 0.0006, tile: [0.75, 0.75, 1], look: [0.15, 0, 0.2, 0], clearcoat: 0},
  concrete: {rough: 1, metal: 0, env: 0.35, bump: 0.01, tile: [1, 1, 1], look: [0.2, 0, 0.3, 0], clearcoat: 0},
  soil: {rough: 1, metal: 0, env: 0.2, bump: 0.02, tile: [1.5, 1.5, 1], look: [0, 0, 0, 0], clearcoat: 0},
};
const textureKind = (family, species) => family === 'wood' ? species : family;
/**
 * A physically based material for a fence part. family: wood | grain | vinyl | powder | galv | concrete | soil.
 * opts.species (wood): pt | cedar. Materials are tracked so a Quality change can swap their texture size.
 */
export function surfaceMaterial(T, family, hex, {species = 'pt', size} = {}) {
  const F = FAMILY[family] || FAMILY.vinyl, st = store(T), tier = st.tier || tierSettings('balanced');
  const kind = textureKind(family, species), set = textureSet(T, kind, size || tier.tex);
  const col = new T.Color(hex);
  // The texture stores colour at `level` in sRGB; three.js reads it in linear light (level ** 2.2), so the material
  // colour is lifted by exactly that and the saved colour stays the average (dividing by `level` left wood 24% dark).
  const lift = 1 / srgbToLinear(set.level);
  if (family === 'wood') { const t = SPECIES_TINT[species] || SPECIES_TINT.pt; col.r *= t[0] * lift; col.g *= t[1] * lift; col.b *= t[2] * lift; }
  else if (set.map && !set.absolute) col.multiplyScalar(lift);
  const p = {color: col, map: set.map, bumpMap: set.bumpMap, bumpScale: F.bump, roughnessMap: set.roughnessMap,
    roughness: family === 'vinyl' ? vinylRough(hex) : family === 'powder' ? 0.62 : family === 'galv' ? 0.62 : F.rough, metalness: F.metal, envMapIntensity: F.env};
  if (F.clearcoat) { p.clearcoat = F.clearcoat; p.clearcoatRoughness = F.ccRough; }
  // Physical only where a clear coat is wanted (vinyl, powder coat): the standard material is lighter to draw.
  const m = F.clearcoat ? new T.MeshPhysicalMaterial(p) : new T.MeshStandardMaterial(p);
  const tint = species === 'cedar' ? [1.04, 0.97, 0.95] : family === 'wood' ? [1.02, 1.01, 0.97] : [1, 1, 1];
  m.userData.gfsSurface = VERSION; m.userData.gfsFamily = family; m.userData.gfsKind = kind;
  m.userData.gfsU = {tile: {value: new T.Vector4(F.tile[0], F.tile[1], F.tile[2], 0)}, look: {value: new T.Vector4(...F.look)}, tint: {value: new T.Vector3(...tint)}, ext: {value: new T.Vector3(1, 1, 1)}, mid: {value: new T.Vector3()}};
  m.onBeforeCompile = sh => patchShader(sh, m);
  m.customProgramCacheKey = () => 'gfsSurface-' + VERSION;
  m.onBeforeRender = boxHook(m);
  st.mats.add(m);
  const dispose = m.dispose.bind(m);
  m.dispose = () => { st.mats.delete(m); dispose(); };
  return m;
}
// Saved white vinyl is bright: a little glossier than tinted vinyl, as the real product is.
function vinylRough(hex) { const r = hex >> 16 & 255, g = hex >> 8 & 255, b = hex & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 230 ? 0.8 : 0.95; }

/** Replace the viewer's material library methods (wood, vinyl, vinylGrain, alu, galv) with these materials. */
export function upgradeMatLib(MatLib, T, pal) {
  const p = MatLib.prototype; if (p._gfsV3191) return; p._gfsV3191 = true;
  const fabric = p.fabric;
  const mk = (self, key, f) => self._mk('v3191' + key, f);
  p.wood = function (hex) { const sp = speciesOf(hex, pal || globalThis._bpxPAL); return mk(this, 'w' + sp + hex, () => surfaceMaterial(T, 'wood', hex, {species: sp})); };
  p.vinyl = function (hex) { return mk(this, 'v' + hex, () => surfaceMaterial(T, 'vinyl', hex)); };
  p.vinylGrain = function (hex) { return mk(this, 'g' + hex, () => surfaceMaterial(T, 'grain', hex)); };
  p.alu = function (hex) { return mk(this, 'a' + hex, () => surfaceMaterial(T, 'powder', hex)); };
  p.galv = function (hex) { return mk(this, 'z' + hex, () => surfaceMaterial(T, 'galv', hex)); };
  if (fabric) p.fabric = function (hex) {
    const m = fabric.call(this, hex);
    if (!m.userData.gfsFabric) {
      m.userData.gfsFabric = 1;
      const coated = hex < 6316128;
      // Vinyl-coated (black, green) wire is a rough plastic; galvanised wire is metal.
      m.roughness = coated ? 0.6 : 0.42; m.metalness = coated ? 0 : 0.85; m.envMapIntensity = coated ? 0.5 : 1;
      if (m.alphaMap) m.alphaMap.anisotropy = store(T).aniso;
      m.needsUpdate = true;
    }
    return m;
  };
}

/** Swap every tracked material to the textures of another size (Quality change); drop the old textures. */
export function setTextureSize(T, size) {
  const st = store(T), used = new Set();
  for (const m of st.mats) {
    const kind = m.userData.gfsKind, set = textureSet(T, kind, size); used.add(set);
    if (m.map !== set.map || m.bumpMap !== set.bumpMap) { m.map = set.map; m.bumpMap = set.bumpMap; m.roughnessMap = set.roughnessMap; m.needsUpdate = true; }
  }
  for (const [key, set] of st.tex) if (!used.has(set) && set.kind !== 'lawn' && set.size !== size) { disposeSet(set); st.tex.delete(key); }
}
export function setAnisotropy(T, aniso) {
  const st = store(T); st.aniso = aniso;
  for (const set of st.tex.values()) for (const k of ['map', 'bumpMap', 'roughnessMap']) if (set[k] && set[k].anisotropy !== aniso) { set[k].anisotropy = aniso; set[k].needsUpdate = true; }
}
/** Release every texture this module made for T (renderer teardown). */
export function disposeAll(T) { const st = store(T); for (const set of st.tex.values()) disposeSet(set); st.tex.clear(); }
export function stats(T) { const st = store(T); return {textures: st.tex.size, materials: st.mats.size, tier: st.tier && st.tier.name}; }

/** Physically based maps on an existing material (site kit concrete and soil): keeps its colour. */
export function dressMaterial(T, m, family) {
  if (!m || m.userData.gfsSurface) return m;
  const F = FAMILY[family], st = store(T), set = textureSet(T, family, (st.tier || tierSettings('balanced')).tex);
  m.map = set.map; m.bumpMap = set.bumpMap; m.bumpScale = F.bump; m.roughnessMap = set.roughnessMap; m.roughness = 1;
  m.envMapIntensity = F.env;
  if (set.map) m.color.multiplyScalar(1 / srgbToLinear(set.level));
  m.userData.gfsSurface = VERSION; m.userData.gfsFamily = family; m.userData.gfsKind = family;
  m.userData.gfsU = {tile: {value: new T.Vector4(F.tile[0], F.tile[1], F.tile[2], 0)}, look: {value: new T.Vector4(...F.look)}, tint: {value: new T.Vector3(1, 1, 1)}, ext: {value: new T.Vector3(1, 1, 1)}, mid: {value: new T.Vector3()}};
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { if (prev && prev !== m.onBeforeCompile) prev.call(m, sh, r); patchShader(sh, m); };
  m.customProgramCacheKey = () => 'gfsSurface-' + VERSION;
  m.onBeforeRender = boxHook(m);
  st.mats.add(m); m.needsUpdate = true;
  return m;
}

// ------------------------------------------------------------------------------------------------ the scene
const GROUND_HEAD = `varying vec3 gfsW;
`;
const GROUND_VERT = `
gfsW = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const GROUND_FRAG_HEAD = `varying vec3 gfsW;
uniform vec3 gfsHorizon;
uniform vec4 gfsFade;
uniform float gfsLawn;
uniform sampler2D gfsLawnMap;
float gfsH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float gfsN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(gfsH(i),gfsH(i+vec2(1.0,0.0)),f.x),mix(gfsH(i+vec2(0.0,1.0)),gfsH(i+vec2(1.0,1.0)),f.x),f.y);}
`;
// Lawn: the turf tile at two scales and two angles, so it never lines up, then slow patches (lighter, darker,
// drier) laid over in world space. Every ground: far away it blends into the horizon colour.
const GROUND_MAP = `
if (gfsLawn > 0.5) {
  vec2 w = gfsW.xz;
  vec2 a = w / 3.0;
  vec2 b = mat2(0.8, -0.6, 0.6, 0.8) * w / 7.3 + 0.37;
  vec3 ta = texture2D(gfsLawnMap, a).rgb, tb = texture2D(gfsLawnMap, b).rgb;
  float k = smoothstep(0.3, 0.7, gfsN(w * 0.11));
  vec3 turf = mix(ta, tb, 0.35 + 0.3 * k);
  float big = gfsN(w * 0.018) * 0.55 + gfsN(w * 0.07 + 7.3) * 0.3 + gfsN(w * 0.33 + 2.1) * 0.15;
  float dry = smoothstep(0.62, 0.86, gfsN(w * 0.025 + 13.7));
  turf *= mix(vec3(0.9, 0.93, 0.86), vec3(1.06, 1.04, 0.96), big);
  turf = mix(turf, turf * vec3(1.22, 1.08, 0.78), dry * 0.45);
  diffuseColor.rgb = turf * 1.0;
}
`;
const GROUND_FOG = `
{
  float gd = length(gfsW.xz - cameraPosition.xz);
  float gk = smoothstep(gfsFade.x, gfsFade.y, gd);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gfsHorizon, gk);
}
`;

/**
 * Called by the viewer once its scene, ground and sky exist. Takes the fog away, dresses the ground, adds contact
 * shadows and applies the quality tier. Returns a small API (also window.__gfsReal191).
 */
export function installRealScene({THREE: T, renderer, scene, ground, PR, cam, win = globalThis}) {
  const st = store(T);
  let api_fit = null, lastGroundGeo = ground && ground.geometry;
  const caps = renderer.capabilities, maxAniso = caps.getMaxAnisotropy ? caps.getMaxAnisotropy() : 8;
  const detected = () => { try { return win.GFSPhotoreal ? win.GFSPhotoreal.tier() : 'balanced'; } catch (_) { return 'balanced'; } };
  let quality = 'auto';
  const apply = tierName => {
    const t = tierSettings(tierName, {dpr: win.devicePixelRatio || 1, maxTexture: caps.maxTextureSize, maxAniso});
    const prevTex = st.tier && st.tier.tex;
    st.tier = t; setAnisotropy(T, t.aniso);
    if (prevTex && prevTex !== t.tex) setTextureSize(T, t.tex);
    renderer.setPixelRatio(t.px);
    const sun = PR && PR.sunLight;
    if (sun && sun.shadow.mapSize.x !== t.shadow) { sun.shadow.map?.dispose(); sun.shadow.map = null; sun.shadow.mapSize.set(t.shadow, t.shadow); }
    if (sun) { sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.045; sun.shadow.radius = t.shadow >= 2048 ? 2.5 : 1.5; }
    if (contact) contact.visible = t.contact && contactWanted;
    renderer.shadowMap.needsUpdate = true;
    return t;
  };
  // Fog off, here and from now on (older add-ons ask for it by setting scene.fog).
  scene.fog = null;
  if (PR && PR.sunLight) {
    const s = PR.sunLight.shadow;
    s.bias = -0.0004; s.normalBias = 0.045; if ('radius' in s) s.radius = 2.5;
  }
  // PCF with a blur radius instead of PCF soft: the soft kernel striped the shaded side of thin pickets across the
  // grain (seen in the test renders); filtered PCF gives the same soft edge without it.
  renderer.shadowMap.type = T.PCFShadowMap;
  if (PR && PR.fillLight) PR.fillLight.intensity = Math.min(PR.fillLight.intensity, 0.5);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  // ---- ground ----------------------------------------------------------------------------------------------------
  const horizon = new T.Color(0.7, 0.76, 0.82);
  const fade = new T.Vector4(900, 3800, 0, 0);
  const lawnU = {value: 0}, lawnMap = {value: null};
  const dressGround = (m, lawn) => {
    if (!m || m.userData.gfsGround === VERSION) return m;
    m.userData.gfsGround = VERSION; m.userData.gfsLawn = 1;   // the older lawn code leaves a dressed ground alone
    m.onBeforeCompile = sh => {
      sh.uniforms.gfsHorizon = {value: horizon}; sh.uniforms.gfsFade = {value: fade};
      sh.uniforms.gfsLawn = {value: lawn ? 1 : 0}; sh.uniforms.gfsLawnMap = lawnMap;
      sh.vertexShader = GROUND_HEAD + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>' + GROUND_VERT);
      sh.fragmentShader = GROUND_FRAG_HEAD + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>' + GROUND_MAP)
        .replace('#include <dithering_fragment>', GROUND_FOG + '#include <dithering_fragment>');
    };
    m.customProgramCacheKey = () => 'gfsGround-' + VERSION + (lawn ? 'L' : 'F');
    m.needsUpdate = true; return m;
  };
  const lawnSet = textureSet(T, 'lawn', (st.tier || tierSettings(detected())).lawn);
  lawnMap.value = lawnSet.map;
  if (ground && ground.material) {
    const g = ground.material;
    g.map = null; g.color = new T.Color(1, 1, 1); g.bumpMap = lawnSet.bumpMap; g.bumpScale = 0.02; g.roughnessMap = lawnSet.roughnessMap; g.roughness = 1; g.envMapIntensity = 0.3;
    dressGround(g, true);
    // Relief and roughness are read through the ground's own UVs; keep their scale near the turf tile (3 ft).
    const fitRepeat = () => { try { const p = ground.geometry.parameters, w = (p && p.width) || 1700; for (const t of [lawnSet.bumpMap, lawnSet.roughnessMap]) t.repeat.set(w / 3, w / 3); } catch (_) { } };
    fitRepeat(); api_fit = fitRepeat;
  }
  // ---- showroom: a soft backdrop that the floor blends into at the horizon --------------------------------------
  let backdropTex = null, floorMat = null;
  function studioBackground(topHex = 0xdfe4e6, horizonHex = 0xf2f1ec) {
    if (backdropTex) return backdropTex;
    const W = 16, H = 256, c = doc().createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, H), top = '#' + topHex.toString(16).padStart(6, '0'), hz = '#' + horizonHex.toString(16).padStart(6, '0');
    grad.addColorStop(0, top); grad.addColorStop(0.5, hz); grad.addColorStop(1, '#d9dbd6');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    backdropTex = new T.CanvasTexture(c); backdropTex.mapping = T.EquirectangularReflectionMapping; backdropTex.colorSpace = T.SRGBColorSpace;
    return backdropTex;
  }
  function studioFloor(hex = 0xd9ddd7) {
    if (!floorMat) {
      const set = textureSet(T, 'concrete', 1024);
      floorMat = new T.MeshStandardMaterial({color: new T.Color(hex), roughness: 1, roughnessMap: set.roughnessMap, bumpMap: set.bumpMap, bumpScale: 0.002, metalness: 0, envMapIntensity: 0.4});
      floorMat.userData.gfsStudioFloor = 1;
      dressGround(floorMat, false);
    } else floorMat.color.setHex(hex);
    return floorMat;
  }
  let showroom = false;
  // hex: the backdrop's colour at the horizon (a plain background colour when a page sets one).
  function backdrop(on, hex = 0xf2f1ec) {
    showroom = !!on; scene.fog = null;
    // The backdrop is drawn as it is (not tone mapped), so the floor blends to the very same screen colour.
    if (on) horizon.setRGB((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255); else syncHorizon();
    fitFade();
  }
  function syncHorizon() {
    try {
      if (showroom) return;
      const s = PR && PR._skyUni ? PR._skyUni.uSun.value : {x: 0.3, y: 0.6, z: 0.4};
      const d = cam ? cam.getWorldDirection(new T.Vector3()) : {x: 1, z: 0}, l = Math.hypot(d.x, d.z) || 1;
      const c = horizonColor(s, {x: d.x / l, z: d.z / l}), ex = (PR && PR._skyUni && PR._skyUni.uExposure) ? PR._skyUni.uExposure.value : 1;
      horizon.setRGB(c[0] * ex, c[1] * ex, c[2] * ex);
    } catch (_) { }
  }
  // Where the blend starts and ends: well past the fence and the yard, before the ground's edge.
  let fenceSpan = 40;
  function fitFade() {
    const half = ground && ground.geometry && ground.geometry.parameters ? ground.geometry.parameters.width / 2 : 1700;
    if (showroom) { fade.x = Math.max(60, fenceSpan * 2.2); fade.y = Math.min(half * 0.95, Math.max(fade.x + 120, fenceSpan * 9)); }
    else { fade.x = Math.max(160, fenceSpan * 4); fade.y = Math.min(half * 0.97, Math.max(fade.x + 1100, 1500)); }
  }

  // ---- contact shadow under each run -------------------------------------------------------------------------
  let contact = null, contactWanted = true, contactTex = null;
  function contactTexture() {
    if (contactTex) return contactTex;
    // Dark along the fence line, fading out to both sides and at both ends of each straight piece.
    const c = doc().createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.3, 'rgba(0,0,0,0.2)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.5)'); grad.addColorStop(0.7, 'rgba(0,0,0,0.2)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'destination-out';
    for (const [x0, x1] of [[0, 6], [64, 58]]) { const e = g.createLinearGradient(x0, 0, x1, 0); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = e; g.fillRect(Math.min(x0, x1), 0, 6, 64); }
    contactTex = new T.CanvasTexture(c); return contactTex;
  }
  let contactTries = 0;
  function buildContact() {
    try {
      // The viewer's first build runs before it publishes window.__f3d: try again shortly.
      if (!win.__f3d) { if (contactTries++ < 40 && win.setTimeout) win.setTimeout(buildContact, 100); return; }
      const f3d = win.__f3d, runs = win.__f3dRuns ? win.__f3dRuns() : [];
      if (contact) { contact.traverse(o => { o.geometry?.dispose(); }); scene.remove(contact); contact = null; }
      if (!f3d || !runs.length) return;
      const mat = new T.MeshBasicMaterial({map: contactTexture(), transparent: true, depthWrite: false, opacity: 0.45, color: 0xffffff, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false});
      contact = new T.Group(); contact.name = 'gfsContactShadow'; contact.userData.noShadow = 1; contact.matrixAutoUpdate = false;
      const gy = (x, z) => { try { return typeof f3d.gy === 'function' ? f3d.gy(x, z) : 0; } catch (_) { return 0; } };
      const pos = [], uv = [], idx = [], col = [];
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      for (const r of runs) {
        // Open styles (chain link, aluminum, split rail, ranch, spaced pickets) touch the ground at the posts only: lighter.
        let open = false; try { const sp = win.__f3dStyleSpec ? win.__f3dStyleSpec(r.styleName) : null; open = !!sp && /chain|alu|split|ranch|picket/.test(sp.mode || ''); } catch (_) { }
        const h = Math.max(3, Math.min(8, Number(r.heightFt) || 6)), wdt = (0.45 + h * 0.07) * (open ? 0.6 : 1), shade = open ? 0.5 : 1;
        for (let k = 0; k < r.pts.length - 1; k++) {
          const a = r.pts[k], b = r.pts[k + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); if (L < 0.2) continue;
          const nx = -dz / L * wdt, nz = dx / L * wdt, ex = dx / L * 0.4, ez = dz / L * 0.4, base = pos.length / 3;
          const ax = a.x - ex, az = a.z - ez, bx = b.x + ex, bz = b.z + ez;
          for (const [x, z, v, u] of [[ax + nx, az + nz, 0, 0], [ax - nx, az - nz, 1, 0], [bx + nx, bz + nz, 0, 1], [bx - nx, bz - nz, 1, 1]]) { pos.push(x, gy(x, z) + 0.04, z); uv.push(u, v); col.push(0, 0, 0, shade); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
          idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
      }
      if (!idx.length) { contact = null; return; }
      fenceSpan = Math.max(24, Math.hypot(maxX - minX, maxZ - minZ)); fitFade();
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 4)); geo.setIndex(idx);
      const mesh = new T.Mesh(geo, mat); mesh.userData.noShadow = 1; mesh.renderOrder = 1; mesh.frustumCulled = false; contact.add(mesh);
      // Moves and turns with the fence (the viewer's move tool and rotate slider act on the fence group).
      mesh.onBeforeRender = () => { const fg = f3d.fenceGroup; if (fg) { fg.updateWorldMatrix(true, false); contact.matrix.copy(fg.matrixWorld); contact.matrixWorld.copy(fg.matrixWorld); mesh.matrixWorld.copy(fg.matrixWorld); } };
      contact.visible = contactWanted && (!st.tier || st.tier.contact);
      scene.add(contact);
      fitSun();
    } catch (e) { win.console && win.console.warn('[gfs] contact shadow', e); }
  }
  // The sun's shadow covers the fence closely (sharper shadows), with room for the house and yard when present.
  function fitSun() {
    try {
      const f3d = win.__f3d, sun = PR && PR.sunLight; if (!f3d || !sun || !f3d.fenceGroup) return;
      const box = new T.Box3().setFromObject(f3d.fenceGroup); if (box.isEmpty()) return;
      if (f3d.siteGroup && f3d.siteGroup.children.length) box.union(new T.Box3().setFromObject(f3d.siteGroup));
      const size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3()), r = Math.max(size.x, size.z, 16) * 0.62 + 8;
      const s = sun.shadow.camera; s.left = -r; s.right = r; s.top = r; s.bottom = -r;
      const dir = sun.position.clone().sub(sun.target.position).normalize();
      sun.target.position.copy(c); sun.target.updateMatrixWorld(); sun.position.copy(c).addScaledVector(dir, Math.max(120, r * 3));
      s.near = 1; s.far = Math.max(260, r * 7); s.updateProjectionMatrix();
      renderer.shadowMap.needsUpdate = true;
    } catch (_) { }
  }
  const onRebuilt = () => { buildContact(); };
  win.addEventListener && win.addEventListener('gfs:fence-rebuilt', onRebuilt);
  // Keep the horizon colour and the fade in step with the camera and the sun (cheap: a few multiplies a frame).
  const prevBefore = scene.onBeforeRender;
  scene.onBeforeRender = function (...a) { if (scene.fog) scene.fog = null; syncHorizon(); if (api_fit && ground && ground.geometry !== lastGroundGeo) { lastGroundGeo = ground.geometry; api_fit(); fitFade(); } return prevBefore && prevBefore.apply(this, a); };
  if (PR) { const prevSun = PR.onSun; PR.onSun = (...a) => { if (prevSun) prevSun(...a); if (st.tier) fitSun(); }; }
  const api = {
    version: VERSION,
    setQuality(mode) { quality = mode || 'auto'; return apply(tierForQuality(quality, detected())); },
    tier: () => st.tier && st.tier.name,
    backdrop, studioBackground, studioFloor,
    contactShadows(on) { contactWanted = !!on; if (contact) contact.visible = contactWanted && (!st.tier || st.tier.contact); },
    rebuildContact: buildContact, fitSun,
    stats: () => ({...stats(T), fog: !!scene.fog, fade: [fade.x, fade.y], contact: !!(contact && contact.visible)}),
    dressMaterial: (m, family) => dressMaterial(T, m, family),
    dispose() { win.removeEventListener && win.removeEventListener('gfs:fence-rebuilt', onRebuilt); if (contact) { contact.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); scene.remove(contact); } contactTex?.dispose(); backdropTex?.dispose(); floorMat?.dispose(); },
  };
  apply(tierForQuality(quality, detected()));
  if (win.__f3dRuns) buildContact();
  win.__gfsReal191 = api;
  return api;
}
