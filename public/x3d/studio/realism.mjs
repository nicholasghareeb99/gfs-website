// GFS Model Studio — physically based fence materials for the already-running Three.js viewer.
//
// The viewer (fence3d.html) builds every fence part with procedural canvas textures. This module
// swaps them, from the outside, for albedo + normal + roughness + AO maps (photo sets when a pack
// names them, generated procedural sets otherwise), fixes grain direction and physical scale by
// rewriting each fence geometry's UVs to feet, and restores the stock look on disable().
//
// What was found in the viewer (r160, units are feet):
//  * Boxes (posts, rails, caps, most vinyl/aluminum pickets) are THREE.BoxGeometry scaled by the
//    instance matrix, UV 0..1 per face whatever the size. Cedar pickets are ExtrudeGeometry with
//    UV = (x, y)*0.5 + a random "grain window". Sawn posts / split rails have custom UVs.
//  * A 5.5 in picket is 0.45 ft wide; with stock UVs one picket face spans ~1/4 of a texture tile.
//  * So geometry UVs are rewritten here: u = distance across the member, v = distance along the
//    grain (the longest axis), both in feet, then each family's texture repeat is 1/tileFt.
//    Textures keep grain along the image's vertical axis, so grain runs along every board.

export const FAMILIES = ['wood', 'vinyl', 'vinylGrain', 'aluminum', 'galvanized', 'chainFabric', 'iron', 'screw', 'lattice', 'ground'];

const fam = (tileFt, tintMode = 'luminance', extra = {}) => ({ albedo: null, normal: null, roughness: null, ao: null, tileFt, tintMode, ...extra });
export const DEFAULT_PACK = {
  version: 1,
  resolution: '2k',
  families: {
    wood: fam([0.75, 3]),
    vinyl: fam([1, 1]),
    vinylGrain: fam([0.75, 3]),
    aluminum: fam([0.5, 0.5]),
    galvanized: fam([1, 1]),
    chainFabric: fam([1, 1]),
    iron: fam([0.5, 0.5]),
    screw: fam([0.25, 0.25]),
    lattice: fam([1, 1]),
    ground: fam([10, 10], 'asIs'),
  },
  environment: { url: null, intensity: 1 },
};

const RES_PX = { '1k': 1024, '2k': 2048, '4k': 4096 };
export const resolutionPx = r => RES_PX[r] || 2048;

// ---------------------------------------------------------------------------------------------
// Pure helpers (no DOM; unit-tested in node)
// ---------------------------------------------------------------------------------------------

/** Replace {res} in a URL with the pack resolution ('1k' | '2k' | '4k'). */
export function substituteRes(url, res) {
  return typeof url === 'string' ? url.replace(/\{res\}/g, String(res || '2k')) : url;
}

/**
 * Which MatLib family a viewer material belongs to. Works on real three materials and on plain
 * objects with the same fields. Returns null for things that must not be touched (shadow blobs,
 * reveals, unknown). ctx.ground forces 'ground'.
 */
export function classifyMaterial(m, ctx = {}) {
  if (!m) return null;
  if (ctx.ground) return 'ground';
  if (m.isMeshBasicMaterial || m.type === 'MeshBasicMaterial' || m.isShadowMaterial || m.isPointsMaterial || m.isLineBasicMaterial) return null;
  // V3-191: the viewer's own physically based surfaces (grain per board, end grain) are left as they are, so the
  // Studio shows what customers see. Only older plain materials are swapped.
  if (m.userData && m.userData.gfsSurface) return null;
  if (m.userData && m.userData.gfsGround) return null;
  if (m.userData && m.userData.gfsLawn) return 'ground';
  const alphaTest = +m.alphaTest || 0;
  if (m.alphaMap || (m.transparent && alphaTest > 0)) return alphaTest >= 0.3 ? 'lattice' : 'chainFabric';
  const metal = +m.metalness || 0;
  const rough = m.roughness == null ? 0.5 : +m.roughness;
  const hasMap = !!m.map, hasBump = !!m.bumpMap;
  if (metal >= 0.6) return 'galvanized';
  if (metal >= 0.3) return 'iron';
  if (metal >= 0.08) {
    if (!hasMap && rough >= 0.6 && rough <= 0.76) return 'screw';
    return 'aluminum';
  }
  if (!hasMap && !hasBump) return null;
  if (rough >= 0.8) return 'wood';
  const repY = m.map && m.map.repeat ? +m.map.repeat.y : null;
  if (repY != null && repY < 0.9) return 'vinylGrain';
  return 'vinyl';
}

/**
 * Brightness-normalise a photo albedo so the viewer's colour-multiply tint still works.
 * rgba: Uint8ClampedArray/Array of RGBA (sRGB-encoded 0..255). Returns a NEW Uint8ClampedArray.
 * Mean luminance becomes targetMean (0..255); deviations from the mean are scaled by `contrast`;
 * chroma is reduced to `chroma` (0..1) of the original. Alpha is preserved.
 */
export function normalizeLuminance(rgba, { targetMean = 230, chroma = 0.25, contrast = 1 } = {}) {
  const n = rgba.length / 4, out = new Uint8ClampedArray(rgba.length), lum = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) { const k = i * 4; lum[i] = 0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2]; sum += lum[i]; }
  const mean = n ? sum / n : 0;
  // Highlights are soft-limited so a bright photo does not clip flat at 255; the offset is then
  // iterated so the resulting mean still lands on targetMean.
  const map = (dev, t) => { const d = dev * contrast; if (d <= 0) return t + d; const head = Math.max(1, 255 - t); return t + head * (1 - Math.exp(-d / head)); };
  let t = targetMean;
  for (let it = 0; it < 6 && n; it++) {
    let s2 = 0; for (let i = 0; i < n; i++) s2 += Math.max(0, Math.min(255, map(lum[i] - mean, t)));
    const err = targetMean - s2 / n; if (Math.abs(err) < 0.25) break; t += err;
  }
  for (let i = 0; i < n; i++) {
    const k = i * 4, L = map(lum[i] - mean, t);
    out[k] = L + chroma * (rgba[k] - lum[i]); out[k + 1] = L + chroma * (rgba[k + 1] - lum[i]); out[k + 2] = L + chroma * (rgba[k + 2] - lum[i]); out[k + 3] = rgba[k + 3];
  }
  return out;
}

export function meanLuminance(rgba) {
  const n = rgba.length / 4; let s = 0;
  for (let i = 0; i < n; i++) { const k = i * 4; s += 0.2126 * rgba[k] + 0.7152 * rgba[k + 1] + 0.0722 * rgba[k + 2]; }
  return n ? s / n : 0;
}

// Deterministic RNG + periodic (tileable) noise ------------------------------------------------
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(ix, iy, seed) { let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed | 0, 1274126177); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
/** Value noise 0..1, periodic over u,v in [0,1) with an nx x ny lattice. */
export function pnoise(u, v, nx, ny, seed) {
  const x = u * nx, y = v * ny, fx = Math.floor(x), fy = Math.floor(y), tx = fade(x - fx), ty = fade(y - fy);
  const x0 = ((fx % nx) + nx) % nx, y0 = ((fy % ny) + ny) % ny, x1 = (x0 + 1) % nx, y1 = (y0 + 1) % ny;
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed), c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
function fbm(u, v, nx, ny, oct, seed) {
  let s = 0, a = 1, t = 0;
  for (let i = 0; i < oct; i++) { s += a * pnoise(u, v, nx << i, ny << i, seed + i * 17); t += a; a *= 0.5; }
  return s / t;
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;

/** Tangent-space (OpenGL, +Y up) normal map RGBA from a tileable height field. */
export function heightToNormal(h, w, hh, strength = 2) {
  const out = new Uint8ClampedArray(w * hh * 4);
  for (let y = 0; y < hh; y++) {
    const ym = ((y - 1 + hh) % hh) * w, yp = ((y + 1) % hh) * w, yc = y * w;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w;
      const dx = (h[yc + xp] - h[yc + xm]) * 0.5 * strength;
      // Image rows grow downward, +V is up (flipY), so the V slope has the opposite sign of the row slope.
      const dy = (h[yp + x] - h[ym + x]) * 0.5 * strength;
      const nx = -dx, ny = dy, nz = 1, il = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const k = (yc + x) * 4;
      out[k] = (nx * il * 0.5 + 0.5) * 255; out[k + 1] = (ny * il * 0.5 + 0.5) * 255; out[k + 2] = (nz * il * 0.5 + 0.5) * 255; out[k + 3] = 255;
    }
  }
  return out;
}

function blurWrap(src, w, h, r) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) { const o = y * w; for (let x = 0; x < w; x++) { let s = 0; for (let k = -r; k <= r; k++) s += src[o + ((x + k + w) % w)]; tmp[o + x] = s * inv; } }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) { let s = 0; for (let k = -r; k <= r; k++) s += tmp[((y + k + h) % h) * w + x]; out[y * w + x] = s * inv; }
  return out;
}

const gray = (f, w, h, scale = 255) => { const o = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const v = f[i] * scale, k = i * 4; o[k] = o[k + 1] = o[k + 2] = v; o[k + 3] = 255; } return o; };

/** Cavity / ambient-occlusion-ish term from a height field: low where the surface sits below its surroundings. */
export function cavityFromHeight(h, w, hh, radius = 3, gain = 1.4) {
  const b = blurWrap(h, w, hh, radius), out = new Float32Array(h.length);
  for (let i = 0; i < h.length; i++) out[i] = clamp01(1 - Math.max(0, b[i] - h[i]) * gain);
  return out;
}

// Procedural generators ------------------------------------------------------------------------
// Each returns Float32 fields in 0..1 (lum = albedo brightness, rough, height) plus size. Pure, seeded.

function woodFields(W, H, o) {
  const N = o.rings || 34, tw = o.tileFt[0], th = o.tileFt[1], rnd = mulberry32(o.seed || 7);
  const knots = [];
  for (let i = 0; i < (o.knots == null ? 1 : o.knots); i++) knots.push({ u: rnd(), v: rnd(), r: 0.035 + rnd() * 0.035, ph: rnd() * 40 });
  const lum = new Float32Array(W * H), height = new Float32Array(W * H), rough = new Float32Array(W * H);
  const s = o.seed || 7, ring = o.ringDepth == null ? 1 : o.ringDepth, fib = o.fibre == null ? 1 : o.fibre, saw = o.saw == null ? 1 : o.saw;
  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W, i = y * W + x;
      let f = N * (u + 0.085 * (fbm(u, v, 2, 3, 3, s) - 0.5) + 0.02 * (fbm(u, v, 3, 9, 2, s + 5) - 0.5));
      let knotDark = 0, knotH = 0;
      for (let k = 0; k < knots.length; k++) {
        const K = knots[k];
        let du = u - K.u; du -= Math.round(du); let dv = v - K.v; dv -= Math.round(dv);
        const dx = du * tw, dy = dv * th * 0.55, d = Math.sqrt(dx * dx + dy * dy);
        const infl = Math.exp(-(d * d) / (K.r * K.r * 9));
        if (infl < 0.002) continue;
        f += N * (du * 0.55 * infl) * 1.4;                       // grain parts around the knot
        const inn = sstep(K.r * 1.5, K.r * 0.6, d);
        f = f * (1 - inn) + (d / K.r * 3 + K.ph) * inn;          // rings circle the knot
        const core = sstep(K.r, K.r * 0.15, d);
        knotDark = Math.max(knotDark, core); knotH = Math.min(knotH, -core * 0.5);
      }
      const fi = Math.floor(f), t = f - fi, idx = ((fi % N) + N) % N;
      const amp = 0.5 + hash2(idx, 3, s) * 0.9;
      const late = t * t * t * (1 - 0.9 * sstep(0.84, 1, t));
      const fibre1 = pnoise(u, v, 96, 9, s + 11), fibre2 = pnoise(u, v, 40, 4, s + 23), blot = fbm(u, v, 3, 5, 3, s + 31);
      const streak = pnoise(u, v, 140, 4, s + 41), fleck = Math.max(0, (streak - 0.8) / 0.2);
      let L = 1 - amp * 0.3 * late * ring - (fibre1 - 0.5) * 0.14 * fib - (fibre2 - 0.5) * 0.08 * fib + (blot - 0.5) * 0.12 - fleck * 0.1;
      L *= 1 - 0.5 * knotDark;
      const sawm = Math.sin(6.2832 * (v * 64 + 0.4 * pnoise(u, v, 3, 2, s + 53))) * (0.35 + 0.65 * pnoise(u, v, 2, 5, s + 59));
      height[i] = 0.07 * amp * late * ring + 0.12 * (fibre1 - 0.5) * fib + 0.04 * (fibre2 - 0.5) * fib - 0.12 * fleck + saw * 0.02 * sawm + knotH * 0.6;
      lum[i] = L;
      rough[i] = Math.min(0.94, 0.74 + (1 - L) * 0.3 + (fibre1 - 0.5) * 0.08);
    }
  }
  return { lum, height, rough };
}

function pebbleFields(W, H, o) {
  const s = o.seed || 3, cells = o.cells || 220, lum = new Float32Array(W * H), height = new Float32Array(W * H), rough = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { const v = (y + 0.5) / H; for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W, i = y * W + x;
    const a = pnoise(u, v, cells, cells, s), b = pnoise(u, v, cells * 2, cells * 2, s + 9), c = fbm(u, v, 6, 6, 3, s + 21);
    height[i] = a * 0.6 + b * 0.4;
    lum[i] = 1 - (c - 0.5) * 0.06 - (a - 0.5) * 0.04;
    rough[i] = (o.rough || 0.5) + (a - 0.5) * (o.roughVar || 0.12) + (c - 0.5) * 0.06;
  } }
  return { lum, height, rough };
}

function vinylFields(W, H, o) {
  const s = o.seed || 5, lum = new Float32Array(W * H), height = new Float32Array(W * H), rough = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { const v = (y + 0.5) / H; for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W, i = y * W + x;
    const line = pnoise(u, 0.5, 64, 1, s) * 0.6 + pnoise(u, 0.5, 23, 1, s + 3) * 0.4;      // extrusion lines (constant along v)
    const draw = pnoise(u, v, 40, 3, s + 7);                                                   // slow drift along the length
    const peel = fbm(u, v, 60, 60, 2, s + 13);                                                 // orange-peel
    height[i] = (line - 0.5) * 0.3 * (0.6 + 0.4 * draw) + (peel - 0.5) * 0.22;
    lum[i] = 1;
    rough[i] = 0.42 + (peel - 0.5) * 0.07 + (line - 0.5) * 0.03;
  } }
  return { lum, height, rough };
}

function spangleFields(W, H, o) {
  const G = o.cells || 28, s = o.seed || 11, lum = new Float32Array(W * H), height = new Float32Array(W * H), rough = new Float32Array(W * H);
  const pts = new Float32Array(G * G * 2), val = new Float32Array(G * G), tilt = new Float32Array(G * G * 2);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const k = j * G + i; pts[k * 2] = (i + 0.15 + 0.7 * hash2(i, j, s)) / G; pts[k * 2 + 1] = (j + 0.15 + 0.7 * hash2(i, j, s + 1)) / G;
    val[k] = hash2(i, j, s + 2); tilt[k * 2] = (hash2(i, j, s + 3) - 0.5) * 2; tilt[k * 2 + 1] = (hash2(i, j, s + 4) - 0.5) * 2;
  }
  for (let y = 0; y < H; y++) { const v = (y + 0.5) / H, cj = Math.floor(v * G); for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W, ci = Math.floor(u * G); let d1 = 9, d2 = 9, best = 0, bx = 0, by = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const ii = ((ci + a) % G + G) % G, jj = ((cj + b) % G + G) % G, k = jj * G + ii;
      let dx = u - (pts[k * 2] + Math.floor((ci + a) / G)), dy = v - (pts[k * 2 + 1] + Math.floor((cj + b) / G));
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < d1) { d2 = d1; d1 = d; best = k; bx = dx; by = dy; } else if (d < d2) d2 = d;
    }
    const edge = sstep(0, 0.012, (d2 - d1) * G), i = y * W + x;
    // Each crystal is a slightly tilted facet; borders are shallow grooves.
    height[i] = (tilt[best * 2] * bx + tilt[best * 2 + 1] * by) * G * 0.35 - (1 - edge) * 0.12;
    lum[i] = 0.93 + val[best] * 0.1 - (1 - edge) * 0.05;
    rough[i] = 0.36 + val[best] * 0.22 + (1 - edge) * 0.05;
  } }
  return { lum, height, rough };
}

/**
 * One procedural PBR set for a family. size = pixel height of the tile (width follows tileFt).
 * Returns { w, h, albedo|null, normal, roughness, ao, roughMean, params } as Uint8ClampedArray RGBA.
 */
export function generateProcedural(family, { size = 1024, tileFt, seed = 7, stockMean = 230 } = {}) {
  const tf = tileFt || DEFAULT_PACK.families[family].tileFt;
  const pot = n => Math.max(64, 1 << Math.round(Math.log2(Math.max(64, n))));
  let W, H = pot(size), fields, nStrength, aoGain, albedoMode, params = {}, aoRadius = 3;
  if (family === 'wood' || family === 'vinylGrain') {
    W = pot(H * tf[0] / tf[1]);
    const grain = family === 'vinylGrain';
    fields = woodFields(W, H, grain ? { tileFt: tf, seed: seed + 100, rings: 22, knots: 1, ringDepth: 0.8, fibre: 0.7, saw: 0 } : { tileFt: tf, seed });
    if (grain) { for (let i = 0; i < fields.height.length; i++) fields.height[i] *= 0.5; for (let i = 0; i < fields.rough.length; i++) fields.rough[i] = 0.44 + (1 - fields.lum[i]) * 0.2; }
    nStrength = grain ? 4 : 3.5; aoGain = grain ? 1.2 : 2.2; albedoMode = 'lum'; aoRadius = 4;
    params = grain ? { metalness: 0, roughnessTarget: 'keep', aoIntensity: 0.6, albedoWarm: [1, 0.97, 0.93], lumContrast: 0.55 } : { metalness: 0, roughness: 1, aoIntensity: 0.9, albedoWarm: [1, 0.955, 0.9] };
  } else if (family === 'vinyl') {
    H = pot(size / 2); W = pot(H * tf[0] / tf[1]);
    fields = vinylFields(W, H, { seed }); nStrength = 1.0; aoGain = 0; albedoMode = null; params = { metalness: 0, roughnessTarget: 'keep', aoIntensity: 0 };
  } else if (family === 'aluminum' || family === 'iron') {
    H = pot(size / 2); W = pot(H * tf[0] / tf[1]); const iron = family === 'iron';
    fields = pebbleFields(W, H, { seed: iron ? seed + 3 : seed, cells: iron ? 160 : 200, rough: iron ? 0.52 : 0.5, roughVar: 0.14 });
    nStrength = iron ? 1.6 : 1.3; aoGain = 0; albedoMode = null;
    params = iron ? { metalness: 0.2, roughness: 1, aoIntensity: 0 } : { metalness: 0.15, roughness: 1, aoIntensity: 0, clearcoat: 0.3, clearcoatRoughness: 0.35 };
  } else if (family === 'galvanized') {
    H = pot(size / 2); W = pot(H * tf[0] / tf[1]);
    fields = spangleFields(W, H, { seed, cells: 26 }); nStrength = 0.9; aoGain = 0; albedoMode = 'lum';
    params = { metalness: 0.9, roughness: 1, aoIntensity: 0, albedoWarm: [1, 1, 1.01] };
  } else return null;
  const n = W * H, normal = heightToNormal(fields.height, W, H, nStrength);
  const rough = gray(fields.rough.map(x => clamp01(x)), W, H);
  let rm = 0; for (let i = 0; i < n; i++) rm += rough[i * 4]; rm /= n * 255;
  const ao = aoGain ? gray(cavityFromHeight(fields.height, W, H, aoRadius, aoGain), W, H) : null;
  let albedo = null;
  if (albedoMode === 'lum') {
    const warm = params.albedoWarm || [1, 1, 1], a = new Uint8ClampedArray(n * 4), cs = params.lumContrast || 1;
    let m = 0; for (let i = 0; i < n; i++) m += fields.lum[i]; m /= n;
    for (let i = 0; i < n; i++) { const L = (m + (fields.lum[i] - m) * cs) * 255, k = i * 4; a[k] = L * warm[0]; a[k + 1] = L * warm[1]; a[k + 2] = L * warm[2]; a[k + 3] = 255; }
    albedo = normalizeLuminance(a, { targetMean: stockMean, chroma: 1 });
  }
  return { w: W, h: H, albedo, normal, roughness: rough, ao, roughMean: rm, params };
}

// UV rewrite -----------------------------------------------------------------------------------
/**
 * Compute new UVs (in feet) for a geometry. `sc` is the member's world scale per local axis,
 * tileFt [across, along-grain]. Pure: takes anything with attributes.position/normal/uv.
 * Returns Float32Array(2n) or null when the geometry has no uv.
 */
export function computeFootUVs(geo, sc, tileFt, seed = 1) {
  const pos = geo.attributes.position, uvA = geo.attributes.uv, nor = geo.attributes.normal;
  if (!pos || !uvA) return null;
  const n = pos.count, s = [Math.abs(sc[0]) || 1, Math.abs(sc[1]) || 1, Math.abs(sc[2]) || 1];
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) { const p = [pos.getX(i), pos.getY(i), pos.getZ(i)]; for (let a = 0; a < 3; a++) { if (p[a] < mn[a]) mn[a] = p[a]; if (p[a] > mx[a]) mx[a] = p[a]; } }
  const ext = [0, 1, 2].map(a => (mx[a] - mn[a]) * s[a]);
  const G = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2;
  let boxLike = /^(Box|Extrude|Shape|Plane)Geometry$/.test(geo.type || '');
  if (!geo.type && nor) { let ax = 0; for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i))); if (a > 0.985) ax++; } boxLike = ax / n > 0.88; }
  const out = new Float32Array(n * 2), rnd = k => hash2(k, seed, 977);
  const off = k => [rnd(k) * tileFt[0], rnd(k + 31) * tileFt[1]];
  if (boxLike) {
    for (let i = 0; i < n; i++) {
      const nv = [nor.getX(i), nor.getY(i), nor.getZ(i)];
      let A = 0; for (let a = 1; a < 3; a++) if (Math.abs(nv[a]) > Math.abs(nv[A])) A = a;
      const sign = nv[A] >= 0 ? 1 : 0, p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
      let u, v;
      if (A !== G) { const T = 3 - A - G; u = p[T] * s[T]; v = p[G] * s[G]; }
      else { const a1 = (G + 1) % 3, a2 = (G + 2) % 3; u = p[a1] * s[a1]; v = p[a2] * s[a2]; }
      const o = off(A * 2 + sign); out[i * 2] = u + o[0]; out[i * 2 + 1] = v + o[1];
    }
  } else {
    let umin = 1e9, umax = -1e9;
    for (let i = 0; i < n; i++) { const u = uvA.getX(i); if (u < umin) umin = u; if (u > umax) umax = u; }
    const T1 = (G + 1) % 3, T2 = (G + 2) % 3, per = Math.PI * (ext[T1] + ext[T2]) / 2 * 0.95;
    const urange = Math.max(1e-3, umax - umin), perUnit = per * (urange < 0.6 ? 0.5 : 1) / urange, o = off(1);
    for (let i = 0; i < n; i++) { out[i * 2] = uvA.getX(i) * perUnit + o[0]; out[i * 2 + 1] = (pos.getComponent ? pos.getComponent(i, G) : [pos.getX(i), pos.getY(i), pos.getZ(i)][G]) * s[G] + o[1]; }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The module that talks to the viewer
// ---------------------------------------------------------------------------------------------

const UV_FAMILIES = new Set(['wood', 'vinyl', 'vinylGrain', 'aluminum', 'galvanized', 'iron']);
const STOCK_MEAN_DEFAULT = { wood: 0.9, vinylGrain: 0.9, vinyl: 0.97, galvanized: 0.95, aluminum: 0.97, iron: 0.9 };
const PROC_SEED = { wood: 7, vinyl: 5, vinylGrain: 17, aluminum: 3, galvanized: 11, iron: 23 };
const ORIG_KEYS = ['map', 'bumpMap', 'bumpScale', 'normalMap', 'roughnessMap', 'roughness', 'metalness', 'aoMap', 'aoMapIntensity', 'envMapIntensity', 'clearcoat', 'clearcoatRoughness'];
const tick = () => new Promise(r => setTimeout(r, 0));

export function createRealism(viewer, { pack = DEFAULT_PACK, anisotropy = 8, onStatus } = {}) {
  let cfg = normalisePack(pack);
  let enabled = false, unsub = null, version = 0, scanning = false, dirty = false;
  let nextId = 1, THREE_ = null;
  const recs = new Map();                    // id -> rec
  const recOf = new WeakMap();               // material -> rec
  const uvOrig = new WeakMap();              // geometry -> original uv array
  const uvDone = new WeakMap();              // geometry -> version applied
  const famCache = new Map();                // family -> Promise<famSet>
  const texCache = new Map();                // key -> Promise<Texture>
  const famStatus = {};
  const env = { active: false, orig: undefined, rt: null, error: null, applied: false, url: null };
  let upgraded = 0, stockMeans = {};

  function normalisePack(p) {
    const c = JSON.parse(JSON.stringify(p || DEFAULT_PACK));
    c.resolution = RES_PX[c.resolution] ? c.resolution : '2k';
    c.families = c.families || {};
    for (const f of FAMILIES) c.families[f] = Object.assign({}, DEFAULT_PACK.families[f], c.families[f] || {});
    c.environment = Object.assign({ url: null, intensity: 1 }, c.environment || {});
    return c;
  }
  const win = () => viewer.hooks && viewer.hooks();
  const emit = () => { if (onStatus) { try { onStatus(status()); } catch (_) { } } };
  const doc = () => { const w = win(); return (w && w.document) || document; };

  function status() {
    const families = {};
    for (const f of FAMILIES) families[f] = famStatus[f] ? Object.assign({}, famStatus[f], { maps: (famStatus[f].maps || []).slice() }) : { source: 'none', maps: [] };
    return { enabled, families, materialsUpgraded: upgraded, resolution: cfg.resolution, environment: { url: cfg.environment.url, applied: env.applied, error: env.error } };
  }

  // ---- texture construction -------------------------------------------------------------------
  function maxAniso() { try { const r = win().__rend(); return Math.min(anisotropy, r.capabilities.getMaxAnisotropy()); } catch (_) { return anisotropy; } }

  function finishTex(t, T, { srgb, tile }) {
    t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
    t.anisotropy = maxAniso(); t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter;
    if (tile) t.repeat.set(1 / tile[0], 1 / tile[1]);
    t.needsUpdate = true; return t;
  }
  function canvasFromRGBA(w, h, rgba) {
    const c = doc().createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), id = g.createImageData(w, h); id.data.set(rgba); g.putImageData(id, 0, 0); return c;
  }
  function texFromRGBA(T, w, h, rgba, opt) { return finishTex(new T.CanvasTexture(canvasFromRGBA(w, h, rgba)), T, opt); }

  function loadUrl(T, url, key) {
    if (texCache.has(key)) return texCache.get(key);
    const p = new Promise((resolve, reject) => {
      const L = new T.TextureLoader(); L.setCrossOrigin('anonymous');
      L.load(url, resolve, undefined, () => reject(new Error('could not load ' + url)));
    });
    texCache.set(key, p); p.catch(() => texCache.delete(key)); return p;
  }

  async function loadPhotoMap(T, url, kind, spec, family, targetMean) {
    const resolved = substituteRes(url, cfg.resolution);
    const tile = spec.tileFt;
    const lum = kind === 'albedo' && spec.tintMode !== 'asIs';
    const key = [resolved, kind, lum ? 'lum' + Math.round(targetMean) : 'raw', tile && tile.join('x'), spec.chroma, spec.contrast].join('|');
    if (texCache.has(key)) return texCache.get(key);
    const p = (async () => {
      const base = await loadUrl(T, resolved, 'raw|' + resolved);
      const isColor = kind === 'albedo';
      let t;
      if (lum) {
        const img = base.image, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const c = doc().createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        const id = g.getImageData(0, 0, w, h);
        id.data.set(normalizeLuminance(id.data, { targetMean, chroma: spec.chroma == null ? 0.25 : spec.chroma, contrast: spec.contrast == null ? 1 : spec.contrast }));
        g.putImageData(id, 0, 0);
        t = new T.CanvasTexture(c);
      } else {
        t = base.clone();
      }
      return finishTex(t, T, { srgb: isColor, tile });
    })();
    texCache.set(key, p); p.catch(() => texCache.delete(key)); return p;
  }

  function measureStockMean(family, rec) {
    if (stockMeans[family] != null) return stockMeans[family];
    let m = (STOCK_MEAN_DEFAULT[family] || 0.9) * 255;
    try {
      const img = rec && rec.orig.map && rec.orig.map.image;
      if (img && (img.width || img.naturalWidth)) {
        const c = doc().createElement('canvas'); c.width = c.height = 32;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 32, 32);
        const d = g.getImageData(0, 0, 32, 32).data, v = meanLuminance(d);
        if (v > 60) m = v;
      }
    } catch (_) { /* tainted or not drawable: default */ }
    return (stockMeans[family] = m);
  }

  const PARAM_ONLY = {
    chainFabric: { metalGalv: { metalness: 0.88, roughness: 0.4 }, coated: { metalness: 0.05, roughness: 0.62 } },
    screw: { metalness: 0.55, roughness: 0.42 },
    lattice: { roughness: 0.52 },
  };

  async function buildFamily(family, rec) {
    const T = THREE_, spec = cfg.families[family], st = famStatus[family] = { source: 'none', maps: [] };
    const hasUrls = ['albedo', 'normal', 'roughness', 'ao'].some(k => spec[k]);
    const set = { family, source: 'none', maps: {}, params: {}, tile: spec.tileFt, needsUV: UV_FAMILIES.has(family) };
    if (hasUrls) {
      try {
        const mean = measureStockMean(family, rec), got = {};
        const kinds = { albedo: 'map', normal: 'normalMap', roughness: 'roughnessMap', ao: 'aoMap' };
        await Promise.all(Object.keys(kinds).filter(k => spec[k]).map(async k => { got[kinds[k]] = await loadPhotoMap(T, spec[k], k, spec, family, mean); }));
        set.maps = got; set.source = 'photo';
        set.params = { roughness: got.roughnessMap ? 1 : null, colorWhite: !!(got.map && spec.tintMode === 'asIs'), normalScale: spec.normalScale || [1, 1], normalDX: spec.normalConvention === 'dx', aoIntensity: spec.aoIntensity == null ? 1 : spec.aoIntensity };
        if (family === 'ground') set.needsUV = false;
        st.source = 'photo'; st.maps = Object.keys(spec).filter(k => ['albedo', 'normal', 'roughness', 'ao'].includes(k) && spec[k]);
        return set;
      } catch (err) {
        st.error = String(err && err.message || err); set.maps = {}; // fall through to procedural
      }
    }
    if (PARAM_ONLY[family]) { set.source = 'procedural'; set.paramOnly = PARAM_ONLY[family]; st.source = 'procedural'; st.maps = []; return set; }
    if (family === 'ground') { set.source = 'none'; st.source = 'none'; st.maps = []; return set; }
    await tick();
    const scale = Math.min(1, resolutionPx(cfg.resolution) / 2048), size = Math.max(256, Math.round((family === 'wood' || family === 'vinylGrain' ? 2048 : 1024) * scale));
    const g = generateProcedural(family, { size, tileFt: spec.tileFt, seed: PROC_SEED[family] || 7, stockMean: measureStockMean(family, rec) });
    if (!g) { st.source = 'none'; return set; }
    const tile = spec.tileFt;
    if (g.albedo) set.maps.map = texFromRGBA(T, g.w, g.h, g.albedo, { srgb: true, tile });
    set.maps.normalMap = texFromRGBA(T, g.w, g.h, g.normal, { srgb: false, tile });
    set.maps.roughnessMap = texFromRGBA(T, g.w, g.h, g.roughness, { srgb: false, tile });
    if (g.ao) set.maps.aoMap = texFromRGBA(T, g.w, g.h, g.ao, { srgb: false, tile });
    set.dropAlbedo = !g.albedo; set.roughMean = g.roughMean;
    set.params = Object.assign({ normalScale: [1, 1] }, g.params);
    set.source = 'procedural'; st.source = 'procedural';
    st.maps = [g.albedo && 'albedo', 'normal', 'roughness', g.ao && 'ao'].filter(Boolean);
    await tick();
    return set;
  }
  function famSet(family, rec) {
    if (!famCache.has(family)) famCache.set(family, buildFamily(family, rec).catch(err => { famStatus[family] = { source: 'none', maps: [], error: String(err && err.message || err) }; return { family, source: 'none', maps: {}, params: {}, needsUV: false }; }));
    return famCache.get(family);
  }

  // ---- upgrade / restore ----------------------------------------------------------------------
  function captureOrig(m) {
    const o = {};
    for (const k of ORIG_KEYS) o[k] = m[k];
    o.normalScale = m.normalScale ? m.normalScale.clone() : null;
    o.colorHex = m.color ? m.color.getHex() : null;
    return o;
  }
  function restoreOrig(m, o) {
    for (const k of ORIG_KEYS) if (o[k] !== undefined) m[k] = o[k]; else if (k in m) m[k] = o[k];
    if (o.normalScale && m.normalScale) m.normalScale.copy(o.normalScale);
    if (o.colorHex != null && m.color) m.color.setHex(o.colorHex);
    if (m.userData) { delete m.userData.__gfsReal; if (m.userData.__gfsRealLawn) { delete m.userData.gfsLawn; delete m.userData.__gfsRealLawn; } }
    m.needsUpdate = true;
  }

  function registerMaterial(m, family, ctx) {
    let rec = recOf.get(m);
    if (rec) return rec;
    let orig;
    const srcId = m.userData && m.userData.__gfsReal;
    const src = srcId && recs.get(srcId);
    if (src) orig = Object.assign({}, src.orig, { normalScale: src.orig.normalScale && src.orig.normalScale.clone() });  // clone of an upgraded material: stock state is the source's
    else orig = captureOrig(m);
    rec = { id: nextId++, family, orig, ref: new WeakRef(m), applied: -1, hasUV: ctx.hasUV };
    recs.set(rec.id, rec); recOf.set(m, rec);
    return rec;
  }

  function applyTo(m, rec, fs) {
    const o = rec.orig, P = fs.params || {}, f = rec.family;
    m.userData.__gfsReal = rec.id;
    if (fs.paramOnly) {
      let p = fs.paramOnly;
      if (f === 'chainFabric') p = (o.metalness || 0) > 0.4 ? p.metalGalv : p.coated;
      if (p.metalness != null) m.metalness = p.metalness;
      if (p.roughness != null) m.roughness = p.roughness;
    } else {
      const M = fs.maps;
      if (M.map) { m.map = M.map; if (P.colorWhite && m.color) m.color.setHex(0xffffff); }
      else if (fs.dropAlbedo) m.map = null;
      if (M.normalMap) {
        m.normalMap = M.normalMap; m.bumpMap = null;
        const ns = P.normalScale || [1, 1]; if (m.normalScale) m.normalScale.set(ns[0], P.normalDX ? -ns[1] : ns[1]);
      }
      if (M.roughnessMap) {
        m.roughnessMap = M.roughnessMap;
        if (P.roughnessTarget === 'keep') { const t = Math.min(0.56, Math.max(0.34, o.roughness == null ? 0.45 : o.roughness)); m.roughness = t / (fs.roughMean || 0.45); }
        else m.roughness = P.roughness == null ? 1 : P.roughness;
      }
      if (M.aoMap && rec.hasUV) { m.aoMap = M.aoMap; m.aoMapIntensity = P.aoIntensity == null ? 1 : P.aoIntensity; }
      if (P.metalness != null) m.metalness = P.metalness;
      if (m.isMeshPhysicalMaterial && P.clearcoat != null) { m.clearcoat = P.clearcoat; m.clearcoatRoughness = P.clearcoatRoughness == null ? 0.35 : P.clearcoatRoughness; }
      if (f === 'ground' && P.colorWhite) { m.userData.gfsLawn = 1; m.userData.__gfsRealLawn = 1; }
    }
    const e = cfg.environment.intensity; if (o.envMapIntensity != null) m.envMapIntensity = o.envMapIntensity * (e == null ? 1 : e);
    m.needsUpdate = true; rec.applied = version;
  }

  function meshScale(mesh) {
    mesh.updateWorldMatrix(true, false);
    const W = mesh.matrixWorld.elements;
    const wc = [Math.hypot(W[0], W[1], W[2]), Math.hypot(W[4], W[5], W[6]), Math.hypot(W[8], W[9], W[10])];
    if (!mesh.isInstancedMesh || !mesh.count) return wc;
    const a = mesh.instanceMatrix.array, n = mesh.count, step = Math.max(1, Math.floor(n / 48)), xs = [[], [], []];
    for (let i = 0; i < n; i += step) { const b = i * 16; xs[0].push(Math.hypot(a[b], a[b + 1], a[b + 2])); xs[1].push(Math.hypot(a[b + 4], a[b + 5], a[b + 6])); xs[2].push(Math.hypot(a[b + 8], a[b + 9], a[b + 10])); }
    return xs.map((v, k) => { v.sort((p, q) => p - q); return v[v.length >> 1] * wc[k]; });
  }

  function remapMesh(mesh, fs, family) {
    const g = mesh.geometry; if (!g || !g.attributes || !g.attributes.uv || uvDone.get(g) === version) return;
    if (!uvOrig.has(g)) uvOrig.set(g, g.attributes.uv.array.slice());
    const orig = uvOrig.get(g), uvA = g.attributes.uv;
    // compute from the ORIGINAL uv so repeated passes (resolution/pack changes) never compound
    uvA.array.set(orig);
    const out = computeFootUVs(g, meshScale(mesh), fs.tile, (g.id | 0) + 1);
    if (!out) return;
    for (let i = 0; i < out.length; i++) uvA.array[i] = out[i];
    uvA.needsUpdate = true; uvDone.set(g, version);
  }
  function restoreUVs(fg) {
    fg.traverse(o => { const g = o.isMesh && o.geometry; if (g && uvOrig.has(g) && g.attributes.uv) { g.attributes.uv.array.set(uvOrig.get(g)); g.attributes.uv.needsUpdate = true; uvDone.delete(g); } });
  }

  // Board-to-board variation: the viewer's own pass (gfsReal) only runs on meshes whose material has a
  // bumpMap; once a material is upgraded it is skipped, so do the same job here when it hasn't run yet.
  function ensureVariation(T, mesh) {
    if (!mesh.isInstancedMesh || mesh.instanceColor) return;
    const N = mesh.instanceMatrix ? mesh.instanceMatrix.count : mesh.count, parts = mesh.userData.parts || [], col = new T.Color();
    const R = mulberry32(N * 131 + ((parts[0] && parts[0].run) || 0) * 17 + (mesh.geometry.attributes.position.count | 0));
    for (let i = 0; i < N; i++) {
      const k = (parts[i] && parts[i].kind) || '', v = /picket|board|slat|pale/.test(k) ? 1 : 0.45, b = 1 + (R() - 0.5) * 0.24 * v, h = (R() - 0.5) * 0.07 * v;
      col.setRGB(b * (1 + h), b, b * (1 - h * 1.6)); mesh.setColorAt(i, col);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  async function scanOnce() {
    const w = win(); if (!w || !w.__f3d || !THREE_) return;
    const T = THREE_, fg = w.__f3d.fenceGroup, ground = w.__f3d.ground;
    const items = new Map();                // material -> {meshes, hasUV, family}
    if (fg) fg.traverse(o => {
      if (!o.isMesh) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m) continue;
        let it = items.get(m); if (!it) items.set(m, it = { meshes: [], hasUV: true, ground: false });
        it.meshes.push(o); if (!(o.geometry && o.geometry.attributes && o.geometry.attributes.uv)) it.hasUV = false;
      }
    });
    if (ground && ground.material && !items.has(ground.material)) items.set(ground.material, { meshes: [ground], hasUV: !!(ground.geometry && ground.geometry.attributes.uv), ground: true });
    const jobs = [];
    for (const [m, it] of items) {
      let rec = recOf.get(m);
      if (!rec) {
        const family = classifyMaterial(m, { ground: it.ground });
        if (!family) continue;
        rec = registerMaterial(m, family, it);
      }
      rec.hasUV = it.hasUV; jobs.push([m, it, rec]);
    }
    const byFam = new Map();
    for (const j of jobs) { if (!byFam.has(j[2].family)) byFam.set(j[2].family, j[2]); }
    const sets = {};
    for (const [f, rec] of byFam) { sets[f] = await famSet(f, rec); if (!enabled) return; }
    const fenceWood = new Set();
    for (const [m, it, rec] of jobs) {
      const fs = sets[rec.family]; if (!fs || (fs.source === 'none' && rec.family !== 'ground')) { rec.applied = version; continue; }
      if (fs.source === 'none') { rec.applied = version; continue; }
      if (rec.applied !== version) applyTo(m, rec, fs);
      if (rec.family === 'ground' && fs.maps.map && fs.params.colorWhite && it.meshes[0]) fitGround(it.meshes[0], fs);
      if (fs.needsUV && fs.source !== 'none') for (const mesh of it.meshes) remapMesh(mesh, fs, rec.family);
      if (rec.family === 'wood') for (const mesh of it.meshes) ensureVariation(T, mesh);
    }
    countUpgraded();
    try { const r = w.__rend(); if (r.shadowMap) r.shadowMap.needsUpdate = true; } catch (_) { }
    if (viewer.redraw) viewer.redraw();
    emit();
  }
  function fitGround(mesh, fs) {
    const t = fs.maps.map; const g = mesh.geometry; if (!g || !g.attributes.uv) return;
    g.computeBoundingBox(); const b = g.boundingBox, sz = [b.max.x - b.min.x, Math.max(b.max.y - b.min.y, b.max.z - b.min.z)];
    let a = 1e9, c = -1e9, d = 1e9, e = -1e9; const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { a = Math.min(a, uv.getX(i)); c = Math.max(c, uv.getX(i)); d = Math.min(d, uv.getY(i)); e = Math.max(e, uv.getY(i)); }
    const sc = mesh.scale || { x: 1, y: 1, z: 1 };
    const ft = [sz[0] * sc.x / Math.max(1e-6, c - a), sz[1] * (sc.y || 1) / Math.max(1e-6, e - d)];
    for (const k of ['normalMap', 'roughnessMap', 'aoMap', 'map']) if (fs.maps[k]) fs.maps[k].repeat.set(ft[0] / fs.tile[0], ft[1] / fs.tile[1]);
  }
  function countUpgraded() { let n = 0; for (const r of recs.values()) { const m = r.ref.deref(); if (m && r.applied === version && famStatus[r.family] && famStatus[r.family].source !== 'none') n++; } upgraded = n; }

  async function scan() {
    if (!enabled) return;
    if (scanning) { dirty = true; return; }
    scanning = true;
    try {
      // A reloaded viewer is a new frame with its own THREE; anything cached from the old one is dead.
      { const T = await viewer.three(); if (T !== THREE_) { THREE_ = T; try { disposeCaches(); } catch (_) { } try { recs.clear(); } catch (_) { } upgraded = 0; } }
      do { dirty = false; await scanOnce(); } while (dirty && enabled);
    } catch (err) { console.warn('[realism] scan failed', err); }
    scanning = false;
  }

  // ---- environment ----------------------------------------------------------------------------
  async function applyEnvironment() {
    const w = win(); if (!w || !THREE_) return;
    const T = THREE_, scene = w.__f3d.scene || w.__scene(), url = substituteRes(cfg.environment.url, cfg.resolution);
    env.error = null;
    if (!url) { restoreEnvironment(); return; }
    try {
      const tex = await loadUrl(T, url, 'env|' + url);
      const t = tex.clone(); t.needsUpdate = true; t.mapping = T.EquirectangularReflectionMapping; t.colorSpace = T.SRGBColorSpace;
      const pm = new T.PMREMGenerator(w.__rend()), rt = pm.fromEquirectangular(t); pm.dispose(); t.dispose();
      if (!env.active) { env.orig = scene.environment; env.active = true; }
      if (env.rt) env.rt.dispose();
      env.rt = rt; scene.environment = rt.texture; env.applied = true; env.url = url;
    } catch (err) { env.error = String(err && err.message || err); env.applied = false; }
  }
  function restoreEnvironment() {
    const w = win(); if (env.active && w) { const scene = w.__f3d.scene || w.__scene(); scene.environment = env.orig === undefined ? null : env.orig; }
    if (env.rt) { env.rt.dispose(); env.rt = null; }
    env.active = false; env.applied = false; env.orig = undefined;
  }

  // ---- public ---------------------------------------------------------------------------------
  async function reapply() {
    version++; famCache.clear();
    for (const k of Object.keys(famStatus)) delete famStatus[k];
    if (!enabled) return;
    await applyEnvironment();
    scanning = false; await scan();
  }
  function disposeCaches() {
    const seen = new Set();
    texCache.forEach(p => p.then(t => { if (t && t.dispose && !seen.has(t)) { seen.add(t); t.dispose(); } }, () => { }));
    texCache.clear(); famCache.clear();
  }

  return {
    async enable() {
      if (enabled) return status();
      enabled = true;
      try { if (viewer.ready && viewer.ready()) await viewer.ready(); } catch (_) { }
      unsub = viewer.onRebuild(() => { scan(); });
      // A reloaded viewer is a new frame with its own THREE; anything cached from the old one is dead.
      { const T = await viewer.three(); if (T !== THREE_) { THREE_ = T; try { disposeCaches(); } catch (_) { } try { recs.clear(); } catch (_) { } upgraded = 0; } }
      await applyEnvironment();
      await scan(); emit(); return status();
    },
    disable() {
      if (!enabled) return status();
      enabled = false; if (unsub) { unsub(); unsub = null; }
      const w = win();
      for (const rec of recs.values()) { const m = rec.ref.deref(); if (m) restoreOrig(m, rec.orig); rec.applied = -1; }
      if (w && w.__f3d.fenceGroup) restoreUVs(w.__f3d.fenceGroup);
      restoreEnvironment(); upgraded = 0; version++;
      try { const r = w.__rend(); if (r.shadowMap) r.shadowMap.needsUpdate = true; } catch (_) { }
      if (viewer.redraw) viewer.redraw();
      emit(); return status();
    },
    async setPack(p) { cfg = normalisePack(p); disposeCaches(); stockMeansKeep(); await reapply(); emit(); return status(); },
    async setResolution(r) { if (!RES_PX[r]) throw new Error('resolution must be 1k, 2k or 4k'); cfg.resolution = r; disposeCaches(); stockMeansKeep(); await reapply(); emit(); return status(); },
    status,
  };
  function stockMeansKeep() { /* stock means come from the viewer's own maps and do not change */ }
}
