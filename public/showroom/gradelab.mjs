// Grade Lab: a customer-facing version of the Executive App's "Shape the yard" tools.
// A 32 ft run seen from the side, drawn to scale. Draw the yard, raise or lower posts, smooth the top
// line, rake dirt into gaps, add a kickboard or grade the line, and watch the gap
// under the fence and the line across the top change.
//
// Rules carried over from the app: every style slopes from post to post (nothing is
// stepped); on a no-dig wood fence the pickets are held 2.5 in off the ground and stay
// 6 in above the top rail (72 in boards, rail top at 68.5 in); "Smooth the top line"
// never sets a post more than 2 in into the ground or 12 in above it; raked dirt is
// laid up to the bottom of the pickets.
import { $, $$, esc, clamp, icons, toast, reduced } from './ui.mjs';

const SEC = 8, N = 4, L = SEC * N, STEP = .25, NS = L / STEP + 1, IN = 1 / 12;
const CLEAR = { wood: 2.5 * IN, vinyl: 2 * IN };
const KICK = 5.5 * IN; // a 2×6 kickboard
const PRESETS = {
  flat: () => 0,
  // Real yards: a few inches up or down over a run is normal, and enough to show in the top line.
  slope: x => x * .02,                                                    // a steady 2% grade
  hump: x => 5 * IN * Math.exp(-((x - 13) ** 2) / 14),                    // a 5 in rise
  dip: x => -4 * IN * Math.exp(-((x - 19) ** 2) / 12),                    // a 4 in low spot
  rolling: x => (2.6 * Math.sin(x / 3.6) + 1.1 * Math.sin(x / 1.7 + 1)) * IN + x * .012,
  lumpy: x => (1.2 * Math.sin(x * 1.7) + .8 * Math.sin(x * 3.1 + 2) + 1.6 * Math.sin(x / 3)) * IN
};

export function grade(body, kit) {
  const { seg, bindSeg, math, fmt } = kit;
  const st = { style: 'wood', kick: false, mode: 'ground', ground: new Float32Array(NS), dirt: new Float32Array(NS), offs: new Float32Array(N + 1), orig: null, anim: 0 };
  const hist = [];
  const snap = () => { hist.push({ g: st.ground.slice(), d: st.dirt.slice(), o: st.offs.slice(), orig: st.orig?.slice() || null }); if (hist.length > 60) hist.shift(); };
  const preset = id => { for (let j = 0; j < NS; j++) st.ground[j] = PRESETS[id](j * STEP); st.dirt.fill(0); st.offs.fill(0); st.orig = null; };
  preset('rolling');

  body.innerHTML = `
    <div class="gl-stage lab-vis"><canvas class="gl-cv" aria-label="A 32 foot fence on a shaped yard, seen from the side"></canvas>
      <div class="gl-zoom"><canvas class="gl-zcv" aria-label="Close-up of the bottom of the fence"></canvas><span class="mono" id="glZl">CLOSE-UP 4×</span></div>
      <div class="gl-hud"><div><b class="mono" id="glGap"></b><small>biggest gap under the fence</small></div><div><b class="mono" id="glTop"></b><small>top line</small></div></div>
      <div class="vis-note" id="glNote"></div></div>
    <div class="gl-tools lab-ctl">
      <div class="gl-row"><div class="lab-label">Your finger</div>${seg('mode', [['ground', 'Shape the yard'], ['posts', 'Raise / lower posts'], ['dirt', 'Dirt pen']], st.mode)}</div>
      <div class="gl-row"><div class="lab-label">Start from</div><div class="chips wrap" id="glPre">${[['flat', 'Flat'], ['slope', 'Steady 2% slope'], ['hump', 'Hump'], ['dip', 'Low spot'], ['rolling', 'Rolling'], ['lumpy', 'Lumpy']].map(([k, n]) => `<button class="chip" data-pre="${k}">${n}</button>`).join('')}</div></div>
      <div class="gl-row"><div class="lab-label">Fence</div>${seg('style', [['wood', 'Wood privacy'], ['vinyl', 'Vinyl privacy']], st.style)}</div>
      <div class="gl-row"><div class="lab-label">Make it look great</div><div class="gl-acts">
        <button class="btn sm" data-a="smooth">${icons.spark} Smooth the top line</button>
        <button class="btn sm" data-a="fill">Fill the gaps with raked dirt</button>
        <button class="btn sm" data-a="kick" id="glKick">Add a kickboard</button>
        <button class="btn sm" data-a="grade">Grade the line</button>
        <button class="btn sm ghost" data-a="reset">Back to the ground</button>
        <button class="btn sm ghost" data-a="undo">Undo</button></div></div>
      <div class="readouts gl-read">
        <div><b class="mono" id="glOver"></b><small>of fence with more than a 4 in gap underneath</small></div>
        <div><b class="mono" id="glBur"></b><small>where the bottom sits in the dirt</small></div>
        <div><b class="mono" id="glKink"></b><small>sharpest bend in the top line, at a post</small></div>
        <div><b class="mono" id="glWork"></b><small id="glWorkS">dirt moved</small></div>
      </div>
    </div>
    ${math(`<p><b>We slope every fence, we never step it.</b> Each section runs straight from one post to the next and follows the ground. The tops line up post to post, and there are no stair-step gaps.</p>
      <p><b>The gap under a section</b> is the distance from the bottom of the fence to the ground, checked every 3 in along the run. Wood pickets on our no-dig fence sit 2.5 in off the ground at the posts (72 in boards, rail top at 68.5 in, pickets 6 in above the rail). Because a section is a straight line, a dip between two posts opens a gap and a hump pushes into the fence.</p>
      <p><b>Smooth the top line</b> moves each post up or down so the top reads as one smooth line over bumps and dips. It never sets a post more than 2 in into the ground or 12 in above it, then lifts any section that a hump would still push into.</p>
      <p><b>Three ways to close what's left</b>: raked dirt up to the bottom of the pickets (included with our installs); a pressure-treated 2×6 kickboard along the bottom of wood fences, which also keeps the pickets off the dirt; or grading the strip under the fence so the ground matches the fence line.</p>
      <p><b>Dirt moved</b> is the cut and fill along a 3 ft wide strip under the fence, in cubic yards.</p>
      <p class="src">Drawn to scale. The close-up under the drawing shows the bottom of the fence 4× bigger at the biggest gap. The yard shapes are examples; at the estimate we measure yours.</p>`)}`;

  const cv = $('.gl-cv', body); let g = cv.getContext('2d');
  let W = 0, H = 0, k = 1, sx = 1, sy = 1, ox = 0, oy = 0;
  // fixed random texture so the soil and grass don't shimmer between frames
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const pebbles = Array.from({ length: 260 }, () => ({ x: rnd() * (L + 8) - 4, d: rnd() * 3.4 + .15, r: rnd() * 1.6 + .6, c: rnd() }));
  const blades = Array.from({ length: 700 }, () => ({ x: rnd() * (L + 8) - 4, h: 3 + rnd() * 6, lean: (rnd() - .5) * 3, c: rnd() }));
  const clods = Array.from({ length: 180 }, () => ({ x: rnd() * L, f: rnd(), r: 1 + rnd() * 2 }));
  const grain = Array.from({ length: 64 }, () => rnd());

  const fit = () => {
    const r = cv.getBoundingClientRect(); k = Math.min(devicePixelRatio || 1, 2);
    W = r.width; sx = (W - 40) / (L + 3); sy = sx;                 // same scale both ways: what you see is what the yard does
    const want = Math.round(clamp(sx * 11.5 + 30, 200, 520));
    if (Math.abs(r.height - want) > 2) { cv.style.height = want + 'px'; }
    H = want; cv.width = W * k; cv.height = H * k; g.setTransform(k, 0, 0, k, 0, 0);
    ox = 20 + sx * 1.5; oy = H - 20 - sy * 3;
    draw();
  };
  const X = x => ox + x * sx, Y = y => oy - y * sy, FX = px => (px - ox) / sx, FY = py => (oy - py) / sy;
  const at = (arr, x) => { const f = clamp(x / STEP, 0, NS - 1), i = Math.floor(f), t = f - i; return i >= NS - 1 ? arr[NS - 1] : arr[i] * (1 - t) + arr[i + 1] * t; };
  const surf = x => at(st.ground, x) + at(st.dirt, x);
  const base = i => at(st.ground, i * SEC) + st.offs[i];
  const lineAt = x => { const i = clamp(Math.floor(x / SEC), 0, N - 1), t = (x - i * SEC) / SEC; return base(i) * (1 - t) + base(i + 1) * t; };
  const bottomAt = x => lineAt(x) + (st.kick && st.style === 'wood' ? 0 : CLEAR[st.style]);

  function metrics() {
    let maxGap = 0, maxAt = 0, over = 0, bur = 0;
    for (let x = .3; x <= L - .3; x += STEP) {
      const pi = Math.round(x / SEC); if (Math.abs(x - pi * SEC) < .3) continue; // skip the post itself
      const gp = bottomAt(x) - surf(x);
      if (gp > maxGap) { maxGap = gp; maxAt = x; }
      if (gp > 4 * IN) over += STEP;
      if (gp < -1 * IN) bur += STEP;
    }
    let kink = 0, kinkAt = -1;
    for (let i = 1; i < N; i++) { const a1 = Math.atan((base(i) - base(i - 1)) / SEC), a2 = Math.atan((base(i + 1) - base(i)) / SEC), d = Math.abs(a2 - a1) * 180 / Math.PI; if (d > kink) { kink = d; kinkAt = i; } }
    return { maxGap, maxAt, over, bur, kink, kinkAt };
  }

  // ── drawing ──
  // Flat sawn boards: one tone per board with a little variation, not a rounded shading.
  const TONES = ['#cfa674', '#c79d69', '#d4ad7b', '#c39963', '#cca370', '#d0a977'];
  const woodFill = (i, p) => TONES[(i * 7 + p * 3 + (p >> 2)) % TONES.length];
  function draw() {
    if (!W) return;
    const m = metrics();
    paint(m, false);
    closeUp(m);
    readouts(m);
  }
  function paint(m, zoom) {
    g.clearRect(0, 0, W, H);
    // sky and a soft tree line
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0e2440'); sky.addColorStop(.6, '#183a5c'); sky.addColorStop(1, '#22476b'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,26,40,.7)'; g.beginPath(); g.moveTo(0, Y(7));
    for (let x = -2; x <= L + 4; x += .5) g.lineTo(X(x), Y(6.4 + .7 * Math.sin(x * .7) + .5 * Math.sin(x * 1.9 + 1) + .3 * Math.sin(x * 4.3)));
    g.lineTo(W, H); g.lineTo(0, H); g.fill();
    // soil cross-section
    const soilTop = x => surf(clamp(x, 0, L)) - (x < 0 || x > L ? 0 : 0);
    g.beginPath(); g.moveTo(0, H); for (let px = 0; px <= W; px += 2) g.lineTo(px, Y(soilTop(FX(px)))); g.lineTo(W, H); g.closePath();
    const soil = g.createLinearGradient(0, Y(2), 0, H); soil.addColorStop(0, '#6b4f36'); soil.addColorStop(.35, '#55402c'); soil.addColorStop(1, '#2f2219'); g.fillStyle = soil; g.fill();
    g.save(); g.clip();
    for (const p of pebbles) { const y = at(st.ground, clamp(p.x, 0, L)) - p.d; g.fillStyle = p.c > .6 ? 'rgba(160,140,115,.55)' : p.c > .3 ? 'rgba(40,28,18,.55)' : 'rgba(120,96,70,.5)'; g.beginPath(); g.ellipse(X(p.x), Y(y), p.r * 1.3, p.r, p.c * 3, 0, 7); g.fill(); }
    g.restore();
    // grading: show the original ground as a dashed line, with cut and fill shaded
    if (st.orig) {
      for (let j = 0; j < NS - 1; j++) { const x = j * STEP, a = st.orig[j], b2 = st.ground[j]; if (Math.abs(a - b2) < .01) continue;
        g.fillStyle = b2 > a ? 'rgba(62,207,142,.35)' : 'rgba(239,91,91,.35)'; g.fillRect(X(x), Y(Math.max(a, b2)), sx * STEP + .6, Math.abs(a - b2) * sy); }
      g.setLineDash([6, 5]); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); for (let j = 0; j < NS; j++) { const px = X(j * STEP), py = Y(st.orig[j]); j ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.setLineDash([]);
    }
    // raked dirt berm with clods
    let anyDirt = false;
    g.beginPath(); for (let j = 0; j < NS; j++) { const x = j * STEP, y = st.ground[j] + st.dirt[j]; j ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); if (st.dirt[j] > .01) anyDirt = true; }
    for (let j = NS - 1; j >= 0; j--) g.lineTo(X(j * STEP), Y(st.ground[j])); g.closePath();
    if (anyDirt) { const dg = g.createLinearGradient(0, Y(1), 0, Y(-1)); dg.addColorStop(0, '#8a6644'); dg.addColorStop(1, '#5d432c'); g.fillStyle = dg; g.fill();
      for (const c of clods) { const d = at(st.dirt, c.x); if (d < .03) continue; g.fillStyle = c.f > .5 ? '#7a5a3c' : '#9b7550'; g.beginPath(); g.arc(X(c.x), Y(at(st.ground, c.x) + d * (.4 + .6 * c.f)), c.r, 0, 7); g.fill(); } }
    // lawn edge and grass blades (not on raked dirt)
    g.strokeStyle = '#3f6b33'; g.lineWidth = 3; g.beginPath(); for (let px = 0; px <= W; px += 2) { const x = FX(px); const y = Y(clamp(x, 0, L) === x ? surf(x) : surf(clamp(x, 0, L))); px ? g.lineTo(px, y) : g.moveTo(px, y); } g.stroke();
    for (const b of blades) { const x = b.x; if (x >= 0 && x <= L && at(st.dirt, x) > .05) continue; const y = Y(surf(clamp(x, 0, L))); g.strokeStyle = b.c > .5 ? '#4f8a3c' : '#3b6d2e'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(x), y + 1); g.quadraticCurveTo(X(x) + b.lean * .5, y - b.h * .6, X(x) + b.lean, y - b.h); g.stroke(); }

    // ── fence ──
    const post = i => i * SEC;
    // shadow on the lawn behind the fence
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(X(0), Y(base(0) + 6)); for (let i = 0; i <= N; i++) g.lineTo(X(post(i)) + 10, Y(base(i) + 6.1)); for (let i = N; i >= 0; i--) g.lineTo(X(post(i)) + 4, Y(base(i))); g.fill();
    // posts below ground (driven steel) and stubs where a post is raised
    for (let i = 0; i <= N; i++) { const x = X(post(i)), gr = at(st.ground, post(i)); g.fillStyle = 'rgba(200,210,220,.85)'; g.fillRect(x - 2.5, Y(gr), 5, 4 * sy); }
    // sections
    for (let i = 0; i < N; i++) {
      // Wood is seen from the good side: pickets run continuously, with a box picket covering each post.
      const xa = st.style === 'wood' ? post(i) : post(i) + .35, xb = st.style === 'wood' ? post(i + 1) : post(i + 1) - .35;
      if (st.style === 'wood') {
        // dog-ear pickets: 5½ in boards butted tight, each top corner clipped 1 in at 45°
        const n = Math.round((xb - xa) / (5.5 * IN)), w = (xb - xa) / n, ear = 1 * IN;
        for (let p = 0; p < n; p++) {
          const x0 = xa + p * w, x1 = x0 + w, b0 = bottomAt(x0) + (st.kick ? KICK - IN : 0), b1 = bottomAt(x1) + (st.kick ? KICK - IN : 0), t0 = lineAt(x0) + 74.5 * IN, t1 = lineAt(x1) + 74.5 * IN;
          g.fillStyle = woodFill(i, p);
          g.beginPath(); g.moveTo(X(x0), Y(b0)); g.lineTo(X(x1), Y(b1)); g.lineTo(X(x1), Y(t1 - ear)); g.lineTo(X(x1 - ear), Y(t1)); g.lineTo(X(x0 + ear), Y(t0)); g.lineTo(X(x0), Y(t0 - ear)); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(70,45,20,.75)'; g.lineWidth = .7; g.stroke();
          g.fillStyle = 'rgba(255,240,210,.18)'; g.beginPath(); g.moveTo(X(x0 + ear), Y(t0)); g.lineTo(X(x1 - ear), Y(t1)); g.lineTo(X(x1 - ear), Y(t1) + 1.2); g.lineTo(X(x0 + ear), Y(t0) + 1.2); g.fill(); // light catching the cut top
          // grain
          g.strokeStyle = 'rgba(120,80,40,.22)'; g.lineWidth = .6;
          for (let q = 0; q < 2; q++) { const gx = X(x0) + (X(x1) - X(x0)) * (.3 + .4 * grain[(i * 16 + p + q * 7) % 64]); g.beginPath(); g.moveTo(gx, Y(b0) - 3); g.bezierCurveTo(gx + 1.5, Y(t0) * .6 + Y(b0) * .4, gx - 1.5, Y(t0) * .3 + Y(b0) * .7, gx, Y(t0) + 6); g.stroke(); }
        }
        if (st.kick) { const ka = xa - .3, kb = xb + .3, kg = g.createLinearGradient(0, Y(lineAt(ka) + KICK), 0, Y(lineAt(ka)));
          kg.addColorStop(0, '#9b8a5f'); kg.addColorStop(1, '#6f6340'); g.fillStyle = kg;
          g.beginPath(); g.moveTo(X(ka), Y(lineAt(ka))); g.lineTo(X(kb), Y(lineAt(kb))); g.lineTo(X(kb), Y(lineAt(kb) + KICK)); g.lineTo(X(ka), Y(lineAt(ka) + KICK)); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,30,15,.6)'; g.lineWidth = 1; g.stroke(); }
      } else {
        const b0 = bottomAt(xa), b1 = bottomAt(xb), t0 = lineAt(xa) + 72 * IN, t1 = lineAt(xb) + 72 * IN;
        const vg = g.createLinearGradient(0, Y(t0), 0, Y(b0)); vg.addColorStop(0, '#fdfdfb'); vg.addColorStop(1, '#e4e6e3'); g.fillStyle = vg;
        g.beginPath(); g.moveTo(X(xa), Y(b0)); g.lineTo(X(xb), Y(b1)); g.lineTo(X(xb), Y(t1)); g.lineTo(X(xa), Y(t0)); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(140,150,160,.55)'; g.lineWidth = .7;
        for (let p = 1; p < 14; p++) { const x = xa + (xb - xa) * p / 14; g.beginPath(); g.moveTo(X(x), Y(bottomAt(x) + 3 * IN)); g.lineTo(X(x), Y(lineAt(x) + 66 * IN)); g.stroke(); }
        for (const rh of [CLEAR.vinyl + 1.5 * IN, 66 * IN]) { g.fillStyle = '#f2f3f1'; g.strokeStyle = 'rgba(120,130,140,.6)'; g.beginPath(); g.moveTo(X(xa), Y(lineAt(xa) + rh)); g.lineTo(X(xb), Y(lineAt(xb) + rh)); g.lineTo(X(xb), Y(lineAt(xb) + rh + 5 * IN)); g.lineTo(X(xa), Y(lineAt(xa) + rh + 5 * IN)); g.closePath(); g.fill(); g.stroke(); }
      }
    }
    // posts above ground
    for (let i = 0; i <= N; i++) {
      const x = X(post(i)), gr = at(st.ground, post(i)), b = base(i), top = b + (st.style === 'wood' ? 67 * IN : 76 * IN), w = st.style === 'wood' ? 4.5 * IN * sx * 2.2 : 5 * IN * sx * 2.2;
      if (st.style === 'wood') { if (b > gr + .05) { g.fillStyle = 'rgba(200,210,220,.9)'; g.fillRect(x - 2.5, Y(b), 5, Y(gr) - Y(b)); } continue; }
      if (false) { const pg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); pg.addColorStop(0, '#9c7a4e'); pg.addColorStop(.5, '#c9a271'); pg.addColorStop(1, '#8e6e45'); g.fillStyle = pg; g.fillRect(x - w / 2, Y(top), w, Y(Math.min(gr, b)) - Y(top)); g.strokeStyle = 'rgba(70,45,20,.6)'; g.strokeRect(x - w / 2, Y(top), w, Y(Math.min(gr, b)) - Y(top)); }
      else { const pg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0); pg.addColorStop(0, '#dfe2e0'); pg.addColorStop(.5, '#ffffff'); pg.addColorStop(1, '#d4d8d6'); g.fillStyle = pg; g.fillRect(x - w / 2, Y(top), w, Y(Math.min(gr, b)) - Y(top)); g.fillStyle = '#f6f7f5'; g.fillRect(x - w / 2 - 2, Y(top) - 5, w + 4, 6); }
      if (b > gr + .05) { g.fillStyle = 'rgba(200,210,220,.9)'; g.fillRect(x - 2.5, Y(b), 5, Y(gr) - Y(b)); }
    }
    // gaps (red) and fence in the dirt (orange)
    for (let x = .3; x <= L - .3; x += STEP) {
      const pi = Math.round(x / SEC); if (Math.abs(x - pi * SEC) < .4) continue;
      const bt = bottomAt(x), s = surf(x), gp = bt - s;
      if (gp > 1 * IN) { g.fillStyle = gp > 4 * IN ? 'rgba(239,91,91,.75)' : 'rgba(240,168,101,.55)'; g.fillRect(X(x - STEP / 2), Y(bt), sx * STEP + .5, (gp) * sy); }
      else if (gp < -1 * IN) { g.fillStyle = 'rgba(255,170,60,.9)'; g.fillRect(X(x - STEP / 2), Y(s) - 2, sx * STEP + .5, 3); }
    }
    if (zoom) return;
    // biggest-gap callout
    if (m.maxGap > 1 * IN) { const x = X(m.maxAt), yb = Y(bottomAt(m.maxAt)), ys = Y(surf(m.maxAt));
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, yb); g.lineTo(x, ys); g.stroke();
      const label = `${fmt(m.maxGap * 12, 1)}″ gap`; g.font = '700 12px "IBM Plex Mono", monospace'; const tw = g.measureText(label).width + 12;
      g.fillStyle = 'rgba(6,12,20,.85)'; roundRect(x - tw / 2, ys + 8, tw, 20, 6); g.fill(); g.fillStyle = '#ffb3b3'; g.textAlign = 'center'; g.fillText(label, x, ys + 22); }
    // sharpest kink marker
    if (m.kinkAt > 0 && m.kink > 1.5) { const x = X(post(m.kinkAt)), y = Y(base(m.kinkAt) + (st.style === 'wood' ? 74.5 : 76) * IN) - 10; g.fillStyle = '#f0a865'; g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x - 6, y - 4); g.lineTo(x + 6, y - 4); g.fill(); }
    // post handles in post mode
    if (st.mode === 'posts') for (let i = 0; i <= N; i++) { const x = X(post(i)), y = Y(base(i) + (st.style === 'wood' ? 74.5 : 76) * IN) - 16;
      g.fillStyle = 'rgba(61,127,224,.95)'; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x - 4, y - 2); g.lineTo(x + 4, y - 2); g.fill(); g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x - 4, y + 2); g.lineTo(x + 4, y + 2); g.fill();
      if (Math.abs(st.offs[i]) > .01) { g.font = '600 11px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillStyle = '#cfe6ff'; g.fillText(`${st.offs[i] > 0 ? '+' : '−'}${fmt(Math.abs(st.offs[i]) * 12, 1)}″`, x, y - 16); } }
    // brush ring
    if (brush && st.mode !== 'posts') { g.strokeStyle = st.mode === 'dirt' ? 'rgba(240,168,101,.9)' : 'rgba(140,199,255,.9)'; g.lineWidth = 2; g.beginPath(); g.ellipse(X(brush.x), Y(surf(clamp(brush.x, 0, L))), (st.mode === 'dirt' ? 1.2 : 3) * sx, 8, 0, 0, 7); g.stroke(); }
    // scale
    g.font = '600 11px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.fillStyle = 'rgba(234,240,247,.7)';
    for (let i = 0; i <= N; i++) g.fillText(`${i * SEC}′`, X(post(i)) - 6, H - 6);

  }
  function readouts(m) {
    $('#glGap', body).textContent = m.maxGap < .5 * IN ? 'none' : `${fmt(m.maxGap * 12, 1)}″`;
    $('#glTop', body).textContent = m.kink < 1 ? 'Smooth' : m.kink < 2.5 ? 'Slight bends' : 'Uneven';
    $('#glOver', body).textContent = `${fmt(m.over, 0)} ft`;
    $('#glBur', body).textContent = `${fmt(m.bur, 0)} ft`;
    $('#glKink', body).textContent = `${fmt(m.kink, 1)}°`;
    const dv = dirtMoved();
    $('#glWork', body).textContent = dv.total < .01 ? '—' : `${fmt(dv.total, 2)} yd³`;
    $('#glWorkS', body).textContent = st.orig ? `graded: ${fmt(dv.cut, 2)} cut, ${fmt(dv.fill, 2)} fill` : dv.total > .01 ? 'raked dirt along the bottom' : 'dirt moved';
    $('#glNote', body).textContent = { ground: 'Drag on the yard to raise or lower it.', posts: 'Drag a blue dot up or down to raise or lower that post.', dirt: 'Drag along the bottom of the fence to rake dirt into the gaps.' }[st.mode] + ' Drawn to scale.';
    $('#glKick', body).disabled = st.style !== 'wood';
    $('#glKick', body).textContent = st.kick ? 'Remove the kickboard' : 'Add a kickboard';
  }
  // 4× close-up of the bottom of the fence where the gap is biggest (or the middle of the run).
  const zc = $('.gl-zcv', body), zg = zc.getContext('2d');
  function closeUp(m) {
    const r = zc.getBoundingClientRect(); if (!r.width) return;
    zc.width = r.width * k; zc.height = r.height * k; zg.setTransform(k, 0, 0, k, 0, 0);
    const cx = clamp(m.maxGap > .3 * IN ? m.maxAt : L / 2, r.width / sx / 8, L - r.width / sx / 8), cy = (bottomAt(cx) + surf(cx)) / 2;
    const keep = { g, W, H, sx, sy, ox, oy };
    g = zg; W = r.width; H = r.height; sx = keep.sx * 4; sy = keep.sy * 4; ox = W / 2 - cx * sx; oy = H / 2 + cy * sy;
    try { paint(m, true); } finally { ({ g, W, H, sx, sy, ox, oy } = keep); }
    $('#glZl', body).textContent = m.maxGap > .3 * IN ? `CLOSE-UP 4× · ${fmt(m.maxGap * 12, 1)}″ GAP AT ${fmt(cx, 0)} FT` : 'CLOSE-UP 4× · NO GAP';
  }
  function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function dirtMoved() {
    // cubic yards over a 3 ft wide strip: raked dirt plus grading cut/fill
    let cut = 0, fill = 0, raked = 0;
    for (let j = 0; j < NS; j++) { raked += st.dirt[j] * STEP; if (st.orig) { const d = st.ground[j] - st.orig[j]; if (d > 0) fill += d * STEP; else cut -= d * STEP; } }
    const cy = a => a * 3 / 27;
    return { cut: cy(cut), fill: cy(fill), total: cy(cut + fill + raked * .5) };
  }

  // ── actions ──
  function smoothTop() {
    const gp = Array.from({ length: N + 1 }, (_, i) => at(st.ground, i * SEC));
    let t = gp.slice();
    for (let r = 0; r < 2; r++) t = t.map((v, i) => i === 0 || i === N ? v * .6 + t[i === 0 ? 1 : N - 1] * .4 : (t[i - 1] + 2 * v + t[i + 1]) / 4);
    for (let i = 0; i <= N; i++) st.offs[i] = clamp(t[i] - gp[i], -2 * IN, 12 * IN);
    // lift any section a hump would still push into (the app's "lift out of the ground")
    for (let pass = 0; pass < 6; pass++) for (let i = 0; i < N; i++) { let worst = 0; for (let x = i * SEC + .5; x < (i + 1) * SEC - .5; x += STEP) worst = Math.max(worst, surf(x) - bottomAt(x) - .5 * IN); if (worst > 0) { st.offs[i] = Math.min(st.offs[i] + worst, 12 * IN); st.offs[i + 1] = Math.min(st.offs[i + 1] + worst, 12 * IN); } }
  }
  function fillGaps() { for (let j = 0; j < NS; j++) { const x = j * STEP, gap = bottomAt(x) - (st.ground[j] + st.dirt[j]); if (gap > .5 * IN) st.dirt[j] += gap; } }
  function gradeLine() {
    const from = st.ground.slice(), to = new Float32Array(NS);
    for (let j = 0; j < NS; j++) to[j] = lineAt(j * STEP) + (st.kick && st.style === 'wood' ? 0 : CLEAR[st.style]) - .4 * IN;
    // blend the ends back to the yard so the strip meets the lawn
    if (!st.orig) st.orig = from.slice();
    st.dirt.fill(0);
    // keep each post where it is while the ground under it changes
    const keep = Array.from({ length: N + 1 }, (_, i) => base(i));
    const t0 = performance.now(), dur = reduced.matches ? 1 : 700;
    const step = now => { const t = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - t, 3); for (let j = 0; j < NS; j++) st.ground[j] = from[j] + (to[j] - from[j]) * e; for (let i = 0; i <= N; i++) st.offs[i] = keep[i] - at(st.ground, i * SEC); draw(); if (t < 1 && live) st.anim = requestAnimationFrame(step); };
    st.anim = requestAnimationFrame(step);
  }
  body.addEventListener('click', e => {
    const p = e.target.closest('[data-pre]'); if (p) { snap(); preset(p.dataset.pre); draw(); }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'undo') { const h = hist.pop(); if (!h) return toast('Nothing to undo'); st.ground.set(h.g); st.dirt.set(h.d); st.offs.set(h.o); st.orig = h.orig; draw(); return; }
    snap();
    if (a === 'smooth') smoothTop();
    if (a === 'fill') fillGaps();
    if (a === 'kick') st.kick = !st.kick;
    if (a === 'grade') return gradeLine();
    if (a === 'reset') { st.offs.fill(0); st.dirt.fill(0); st.kick = false; if (st.orig) { st.ground.set(st.orig); st.orig = null; } }
    draw();
  });
  bindSeg(body, (n, v) => { if (n === 'mode') st.mode = v; if (n === 'style') { st.style = v; if (v !== 'wood') st.kick = false; } draw(); });

  // ── touch ──
  let drag = null, brush = null, live = true;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(), x = FX(e.clientX - r.left), y = FY(e.clientY - r.top);
    snap();
    if (st.mode === 'posts') { let best = -1, bd = 1e9; for (let i = 0; i <= N; i++) { const d = Math.abs(x - i * SEC); if (d < bd) { bd = d; best = i; } } if (bd > 3) return; drag = { kind: 'post', i: best, y0: y, o0: st.offs[best] }; }
    else drag = { kind: st.mode, x, y };
    move(e);
  });
  const move = e => {
    const r = cv.getBoundingClientRect(), x = FX(e.clientX - r.left), y = FY(e.clientY - r.top);
    brush = { x }; if (!drag) { if (st.mode !== 'posts') draw(); return; }
    if (drag.kind === 'post') st.offs[drag.i] = Math.round(clamp(drag.o0 + (y - drag.y0) * .4, -4 * IN, 18 * IN) * 48) / 48; // quarter inches
    if (drag.kind === 'ground') { const R = 2.5, dy = (y - drag.y) * .25; drag.y = y; for (let j = 0; j < NS; j++) { const d = j * STEP - x; if (Math.abs(d) > R * 2) continue; const w = Math.exp(-(d * d) / (R * R)); st.ground[j] = clamp(st.ground[j] + dy * w, -1.5, 2); } if (st.orig) st.orig = null; }
    if (drag.kind === 'dirt') { const R = 1.2; for (let j = 0; j < NS; j++) { const xx = j * STEP, d = xx - x; if (Math.abs(d) > R) continue; const gap = bottomAt(xx) - (st.ground[j] + st.dirt[j]); if (gap > 0) st.dirt[j] += gap * (1 - Math.abs(d) / R) * .5; } }
    draw();
  };
  cv.addEventListener('pointermove', move);
  const up = () => { drag = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { brush = null; draw(); });
  const ro = new ResizeObserver(fit); ro.observe(cv);
  return () => { live = false; cancelAnimationFrame(st.anim); ro.disconnect(); };
}
