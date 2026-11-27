// Wind: the average flow of air over and through a fence, for the Wind tool's picture.
//
// Lengths are in fence heights (x downwind from the fence, z up from the ground); speeds are in
// U(h), the open-yard wind at the height of the fence top. This is the time-averaged flow; the
// real thing gusts and tumbles around it. Pieces, each from the literature:
//  • The open-yard wind grows with height as a power law, U(z) ∝ z^n, with n = 1/7 among houses and
//    trees (ASCE 7 Exposure B, α = 7) and 1/9.5 in open country (Exposure C, α = 9.5).
//  • Air through an open fence: a thin perforated plate loses ζ = (1 + 0.707√(1 − f) − f)² / f²
//    dynamic heads at open fraction f (Idelchik, Handbook of Hydraulic Resistance, diagram 8-1), and
//    by actuator-disc momentum the air that gets through moves at 1 / (1 + ζ/4) of the wind.
//  • Below about 30% open (solidity over 0.7) the flow behind the fence separates and rolls back
//    toward it (Perera 1981; Castro 1971; Sci. Rep. 4:6619, 2014). In wind-tunnel work the swirl
//    behind a solid fence reaches about 13 fence heights back (Wei, U. Calgary 2014); turbulence
//    shortens it, so it's drawn 10 heights long among houses and trees and 12 in open country.
//  • Further back the slow air recovers as Perera's far-wake deficit,
//    ΔU/U(h) = 9.75 (1 − f)(h/x) · η exp(−0.67 η^1.5), η = (z/h)(K x/h)^(−1/(n+2)),
//    K = 2κ²/ln(h/z0) (Perera 1981, as given in Peña et al., Wind Energ. Sci. 1:101, 2016).
//  • Whatever can't get through goes over: each column carries the same air as the open yard,
//    and the extra speeds up a layer just above the fence (or the swirl), thicker further back. The picture is drawn from
//    a stream function, so no air is made or lost.
export const EXPOSURE = { B: { n: 1 / 7, z0m: .3, Lr: 10 }, C: { n: 1 / 9.5, z0m: .02, Lr: 12 } };
export const CRITICAL_OPEN = .3, KAPPA = .4, PERERA_A = 9.75;

export function bleed(eps) {
  const f = 1 - eps;
  if (f <= 1e-3) return { f: 0, zeta: Infinity, through: 0 };
  const zeta = (1 + .707 * Math.sqrt(1 - f) - f) ** 2 / f ** 2;
  return { f, zeta, through: 1 / (1 + zeta / 4) };
}

const X0 = -5, X1 = 30, DX = .1, ZT = 5, DZ = 1 / 32;
const NX = Math.round((X1 - X0) / DX) + 1, NZ = Math.round(ZT / DZ) + 1;
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

// eps: solid share of the section; hFt: fence height; exposure 'B' or 'C'
export function flowField({ eps, hFt = 6, exposure = 'B' }) {
  const ex = EXPOSURE[exposure] || EXPOSURE.B, n = ex.n, b = bleed(eps), f = b.f;
  const U0 = z => Math.pow(Math.max(z, .04), n);
  const K = 2 * KAPPA * KAPPA / Math.log(Math.max(1.5, hFt * .3048 / ex.z0m));
  const swirl = f < CRITICAL_OPEN ? (CRITICAL_OPEN - f) / CRITICAL_OPEN : 0, Lr = ex.Lr, c = .25 * swirl;
  // the swirl's top: from the fence top, up to about 1.2 h, back down to the ground at Lr
  const top = x => x <= 0 || x >= Lr ? 0 : (1 + .6 * Math.sin(Math.PI * x / Lr)) * Math.sqrt(1 - x / Lr);
  const far = (x, z) => { const eta = z * Math.pow(K * x, -1 / (n + 2)); return PERERA_A * (1 - f) / x * eta * Math.exp(-.67 * Math.pow(eta, 1.5)); };
  const XF = 5;
  const u = new Float32Array(NX * NZ), psi = new Float32Array(NX * NZ), v = new Float32Array(NX * NZ);
  const col = new Float64Array(NZ);
  let Q0 = 0; for (let k = 1; k < NZ; k++) Q0 += (U0(k * DZ) + U0((k - 1) * DZ)) / 2 * DZ;
  for (let i = 0; i < NX; i++) {
    const x = X0 + i * DX, d = swirl ? top(x) : 0;
    for (let k = 0; k < NZ; k++) {
      const z = k * DZ, u0 = U0(z);
      let du;
      if (x < 0) du = (1 - b.through) * u0 * Math.exp(x / .8) * (z < 1 ? 1 : Math.exp(-(((z - 1) / .35) ** 2)));
      else {
        const near = (1 - b.through) * u0 * (z < 1 ? 1 : Math.exp(-(((z - 1) / .15) ** 2)));
        du = x < XF ? near + (far(XF, z) - near) * smooth(x / XF) : far(x, z);
        if (!swirl) du = Math.min(du, .97 * u0);
      }
      let uu = u0 - du;
      // the swirl: back toward the fence low down, forward along its top; near 30% open it fades
      // into the plain slow air behind the fence
      if (d > 0 && z < d) uu = (1 - swirl) * uu - swirl * .25 * Math.cos(Math.PI * z / d);
      else if (d > 0) uu = Math.max(uu, c);
      col[k] = uu;
    }
    // what's missing goes over, in a layer just above the fence or the swirl
    let Q = 0; for (let k = 1; k < NZ; k++) Q += (col[k] + col[k - 1]) / 2 * DZ;
    // the extra rides in a layer that peaks a little above the fence (or the swirl) and spreads up as it goes
    const m = Q0 - Q, zb = Math.max(x < 0 ? smooth((x + 3) / 3) : 1, d), a = .9 + .15 * Math.max(0, x);
    let W = 0; const w = new Float64Array(NZ);
    for (let k = 0; k < NZ; k++) { const t = (k * DZ - zb) / a; w[k] = t > 0 ? t * Math.exp(-t) : 0; }
    for (let k = 1; k < NZ; k++) W += (w[k] + w[k - 1]) / 2 * DZ;
    let s = 0;
    for (let k = 0; k < NZ; k++) {
      const uu = col[k] + (W > 0 ? m * w[k] / W : 0);
      u[i * NZ + k] = uu;
      if (k) s += (uu + u[i * NZ + k - 1]) / 2 * DZ;
      psi[i * NZ + k] = s;
    }
  }
  for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
    const a = Math.max(0, i - 1), bI = Math.min(NX - 1, i + 1);
    v[i * NZ + k] = -(psi[bI * NZ + k] - psi[a * NZ + k]) / ((bI - a) * DX);
  }
  const at = (A, x, z) => {
    const fx = Math.max(0, Math.min(NX - 1.001, (x - X0) / DX)), fz = Math.max(0, Math.min(NZ - 1.001, z / DZ));
    const i = Math.floor(fx), k = Math.floor(fz), tx = fx - i, tz = fz - k, p = i * NZ + k;
    return (A[p] * (1 - tz) + A[p + 1] * tz) * (1 - tx) + (A[p + NZ] * (1 - tz) + A[p + NZ + 1] * tz) * tx;
  };
  return {
    eps, open: f, through: b.through, zeta: b.zeta, swirl, Lr: swirl ? Lr : 0, K, n,
    range: { x0: X0, x1: X1, z1: ZT },
    vel: (x, z) => [at(u, x, z), at(v, x, z)],
    psi: (x, z) => at(psi, x, z),
    U0,
    swirlTop: x => swirl ? top(x) : 0
  };
}

// Smoke lines: contours of the stream function, spaced so the same amount of air flows between each
// pair of neighbouring lines (they crowd together where the air is fast, and spread where it's slow).
// Each point carries its time of flight from the start (in h / U(h)), so dashes drawn on a line move
// at the local speed. Points: [x, z, tof, u, v]. Lines behind a fence under 30% open also include a
// few closed loops in the swirl.
export function streamlines(F, { n = 14, top = 3, x0 = -4, x1 = 14, loops = [.3, .55, .8] } = {}) {
  const out = [];
  const Q = F.psi(x0, top);
  for (let i = 0; i < n; i++) {
    const level = (i + .5) / n * Q;
    let lo = 0, hi = F.range.z1; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (F.psi(x0, m) < level) lo = m; else hi = m; }
    out.push({ kind: 'open', pts: trace(F, x0, (lo + hi) / 2, x1, top + 1, false) });
  }
  if (F.swirl > .5) {
    // seed through the deepest part of the swirl
    let xs = F.Lr * .35, least = 0;
    for (let x = .3; x < F.Lr * .6; x += .1) { const d = F.swirlTop(x); for (let k = 1; k < 40; k++) { const p = F.psi(x, d * k / 40); if (p < least) { least = p; xs = x; } } }
    xs = Math.max(xs, 1); const d = F.swirlTop(xs);
    for (const lv of loops.map(f => f * least)) {
      if (F.psi(xs, d / 2) > lv) continue;
      let lo = 0, hi = d / 2; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (F.psi(xs, m) > lv) lo = m; else hi = m; }
      const pts = trace(F, xs, (lo + hi) / 2, F.range.x1, top + 1, true);   // a loop is drawn whole
      if (pts.at(-1)[0] === xs) out.push({ kind: 'swirl', pts });   // only loops that close
    }
  }
  return out;
}
function trace(F, x, z, x1, zMax, closed) {
  const pts = [], ds = closed ? .015 : .03, x00 = x, z00 = z;
  let tof = 0;
  for (let s = 0; s < 6000; s++) {
    const [u, v] = F.vel(x, z), sp = Math.hypot(u, v) || 1e-6;
    pts.push([x, z, tof, u, v]);
    // midpoint step along the line, a fixed distance at a time
    const xm = x + u / sp * ds / 2, zm = z + v / sp * ds / 2, [um, vm] = F.vel(xm, zm), spm = Math.hypot(um, vm) || 1e-6;
    x += um / spm * ds; z = Math.max(.005, z + vm / spm * ds);
    if (closed) x = Math.max(x, .02);   // a swirl loop runs up the back of the fence, not through it
    tof += ds / Math.max(spm, .02);
    if (x > x1 || z > zMax) break;
    if (closed && s > 80 && Math.hypot(x - x00, z - z00) < ds * 1.5) { pts.push([x00, z00, tof, u, v]); break; }
  }
  return pts;
}
