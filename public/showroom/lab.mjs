// Fence Lab: the engineering behind a fence, as things a customer can play with.
// Every number comes from a published source named in its "Show the math" panel:
// ASCE 7 wind loads, the USDA Wood Handbook, local frost depths, and the lifespans
// already printed in the GFS brochure. Where a drawing exaggerates motion so it can
// be seen, it says so.
import { $, $$, esc, clamp, icons, reduced } from './ui.mjs';

let app, root, D, current = null, stop = null;

const TOOLS = [
  { id: 'wind', name: 'Wind', line: 'How hard wind pushes on each style' },
  { id: 'life', name: 'Lifespan', line: 'How long each material lasts, and what wears out first' },
  { id: 'wood', name: 'Wood movement', line: 'Why gaps open between boards' },
  { id: 'frost', name: 'Frost & posts', line: 'Why post depth matters in Toledo clay' },
  { id: 'gate', name: 'Gate sag', line: 'Why gates sag, and how a brace stops it' }
];

export async function init(a, el) {
  app = a; root = el; D = app.data;
  root.innerHTML = `
    <div class="lab">
      <header class="lab-head">
        <div class="eyebrow">FENCE LAB · THE ENGINEERING BEHIND EVERY GFS FENCE</div>
        <h2 id="labTitle"></h2><p id="labLine"></p>
        <div class="chips lab-tabs">${TOOLS.map(t => `<button class="chip" data-t="${t.id}">${esc(t.name)}</button>`).join('')}</div>
      </header>
      <div class="lab-body"></div>
    </div>`;
  $('.lab-tabs', root).onclick = e => { const b = e.target.closest('[data-t]'); if (b) select(b.dataset.t); };
}
export function show(opts = {}) { select(opts.tool || current || 'wind', true); }
export function hide() { stop?.(); stop = null; }

const RENDER = { wind, life, wood, frost, gate };
function select(id, force) {
  if (!RENDER[id]) id = 'wind';
  if (id === current && !force && stop) return;
  stop?.(); stop = null; current = id;
  const t = TOOLS.find(x => x.id === id);
  $('#labTitle', root).textContent = t.name; $('#labLine', root).textContent = t.line;
  for (const b of $$('.lab-tabs .chip', root)) b.setAttribute('aria-pressed', String(b.dataset.t === id));
  $(`.lab-tabs [data-t="${id}"]`, root)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  const body = $('.lab-body', root);
  body.classList.remove('in'); void body.offsetWidth;
  stop = RENDER[id](body) || null;
  body.classList.add('in');
}

// ── shared bits ───────────────────────────────────────────────────
const fmt = (v, d = 0) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const seg = (name, opts, val) => `<div class="seg" data-name="${name}">${opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${String(v) === String(val)}">${esc(l)}</button>`).join('')}</div>`;
const slider = (name, label, min, max, step, val, unit = '') => `<label class="lab-slider"><span>${esc(label)} <b class="mono" data-out="${name}">${val}${unit}</b></span><input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
function bindSeg(el, fn) { el.addEventListener('click', e => { const b = e.target.closest('.seg button'); if (!b) return; const s = b.closest('.seg'); for (const x of s.children) x.setAttribute('aria-pressed', String(x === b)); fn(s.dataset.name, b.dataset.v); }); }
const math = (html) => `<details class="lab-math"><summary>${icons.spark}<span>Show the math and the sources</span></summary><div class="lab-math-b">${html}</div></details>`;
// Canvas that follows its box size and device pixel ratio.
function sizedCanvas(cv) {
  const g = cv.getContext('2d');
  const fit = () => { const r = cv.getBoundingClientRect(), k = Math.min(devicePixelRatio || 1, 2); cv.width = Math.max(1, r.width * k); cv.height = Math.max(1, r.height * k); g.setTransform(k, 0, 0, k, 0, 0); return { w: r.width, h: r.height }; };
  return { g, fit };
}

// ═════════════════════════════════════════════════════════════════
// 1. WIND — ASCE 7 force on freestanding walls, with a flow picture
// ═════════════════════════════════════════════════════════════════
// Solidity ε = solid area ÷ gross area of one section (ASCE 7 §29.3, Fig. 29.3-1).
// Open styles are estimates from typical member sizes; they are labelled "about".
const WSTYLES = [
  { id: 'privacy', name: 'Solid privacy', note: 'Dog-ear, board-on-board, Kingston vinyl', eps: () => 1, hs: [4, 5, 6, 7, 8], bay: 8 },
  { id: 'shadowbox', name: 'Shadowbox', note: 'Engineers treat it as solid. Air does weave through the offset boards, so the real push is a bit lower, but we never count on that', eps: () => 1, hs: [4, 6], bay: 8 },
  { id: 'lattice', name: 'Lattice top', note: 'Solid boards with a 12 in lattice band that is about half open', eps: h => (h - 1 + .5) / h, hs: [6], bay: 8 },
  { id: 'picket', name: 'Picket', note: 'About 60% solid', eps: () => .6, hs: [3, 4, 5], bay: 8 },
  { id: 'split', name: 'Split rail', note: 'About 25% solid', eps: () => .25, hs: [3, 4], bay: 10 },
  { id: 'alu', name: 'Aluminum', note: 'About 20% solid. Typical 6 ft panels', eps: () => .2, hs: [4, 5, 6], bay: 6 },
  { id: 'chain', name: 'Chain link', note: 'Bare fabric, about 15% solid. Posts up to 10 ft apart (ASTM F567)', eps: () => .15, hs: [4, 5, 6], bay: 10 }
];
const PRESETS = [[25, 'Breezy'], [58, 'Severe storm'], [80, 'Derecho'], [115, 'Ohio design gust']];
export function windLoad({ V, h, exposure, style }) {
  const Kz = exposure === 'C' ? 0.85 : 0.57, Kd = 0.85, Kzt = 1, Ke = 1, G = 0.85, Cf = 1.3;
  const q = 0.00256 * Kz * Kzt * Kd * Ke * V * V;              // psf, ASCE 7-16 Eq. 26.10-1
  const eps = clamp(style.eps(h), 0, 1);
  const red = eps >= .999 ? 1 : 1 - Math.pow(1 - eps, 1.5);    // ASCE 7 reduction for walls with openings
  const p = q * G * Cf * red;                                   // psf on the gross area
  const perFt = p * h, perPost = perFt * style.bay, moment = perPost * 0.55 * h;
  return { q, eps, red, p, perFt, perPost, moment, Kz, Kd, G, Cf };
}

function wind(body) {
  const st = { style: WSTYLES[0], h: 6, V: 58, exposure: 'B' };
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis"><canvas class="wind-cv" aria-label="Wind flowing over the fence"></canvas>
        <div class="wind-gauge"><div class="wg-n mono" id="wgN"></div><div class="wg-l">lb on each post</div></div>
        <div class="vis-note">Side view. Wind blows left to right.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Style</div>
        <div class="chips wrap" id="wStyle">${WSTYLES.map(s => `<button class="chip" data-s="${s.id}">${esc(s.name)}</button>`).join('')}</div>
        <p class="lab-note" id="wNote"></p>
        <div class="lab-label">Height</div><div id="wH"></div>
        ${slider('V', 'Gust speed', 10, 120, 1, st.V, ' mph')}
        <div class="chips wrap presets">${PRESETS.map(([v, l]) => `<button class="chip" data-v="${v}">${l} · ${v}</button>`).join('')}</div>
        <div class="lab-label">Yard</div>
        ${seg('exposure', [['B', 'Houses and trees around'], ['C', 'Open field']], st.exposure)}
        <div class="readouts">
          <div><b class="mono" id="rP"></b><small>lb per sq ft on the fence</small></div>
          <div><b class="mono" id="rF"></b><small>lb per running foot</small></div>
          <div><b class="mono" id="rM"></b><small>lb·ft trying to bend each post at the ground</small></div>
          <div><b class="mono" id="rBags"></b><small>80 lb concrete bags, same push</small></div>
        </div>
      </div>
    </div>
    <div class="lab-card"><div class="lab-label">Every style at this height and gust</div><div class="wbars" id="wBars"></div></div>
    ${math(`
      <p><b>Velocity pressure</b> (ASCE 7-16 Eq. 26.10-1): q = 0.00256 · K<sub>z</sub> · K<sub>zt</sub> · K<sub>d</sub> · K<sub>e</sub> · V² <span class="mono" id="mQ"></span></p>
      <p>K<sub>z</sub> = 0.57 for houses and trees (Exposure B) or 0.85 for open ground (Exposure C), 0–15 ft (Table 26.10-1). K<sub>zt</sub> = 1 (flat ground). K<sub>d</sub> = 0.85. K<sub>e</sub> = 1.</p>
      <p><b>Force on a freestanding wall</b> (Eq. 29.3-1): F = q · G · C<sub>f</sub> · A<sub>s</sub>, with gust factor G = 0.85 and C<sub>f</sub> = 1.3 for a long wall standing on the ground (Fig. 29.3-1, s/h = 1).</p>
      <p><b>Open styles</b>: C<sub>f</sub> is multiplied by 1 − (1 − ε)<sup>1.5</sup>, where ε is the solid share of the section. <span class="mono" id="mE"></span></p>
      <p><b>Bending at the ground</b>: the resultant acts at 0.55 h above grade, so M = F · 0.55 h.</p>
      <p><b>Wind behind the fence</b>: behind a fence that is less than about 30% open, air rolls back toward the fence in an eddy. Above that porosity the eddy disappears (wind tunnel work summarized in <i>Scientific Reports</i> 4:6619, 2014). That is why a solid fence makes a calm but swirly pocket, and a picket or aluminum fence just slows the wind.</p>
      <p><b>Ends and corners</b> see higher pressure than the middle of a long run (ASCE 7 Case C), which is why end, corner and gate posts matter most.</p>
      <p class="src">Gust speeds are 3-second gusts. 115 mph is Ohio's ultimate design wind speed for ordinary buildings, a rare event. These are unfactored loads for comparing styles, not a stamped design.</p>`)}`;
  const cv = $('.wind-cv', body), { g, fit } = sizedCanvas(cv);
  let W = 0, H = 0, parts = [], t = 0, raf = 0, live = true;
  const res = () => windLoad(st);
  const update = () => {
    const r = res();
    $('#wNote', body).textContent = st.style.note;
    $('#wH', body).innerHTML = seg('h', st.style.hs.map(h => [h, h + ' ft']), st.h);
    $('[data-out=V]', body).textContent = st.V + ' mph';
    $('#rP', body).textContent = fmt(r.p, 1); $('#rF', body).textContent = fmt(r.perFt, 0); $('#rM', body).textContent = fmt(r.moment, 0);
    $('#rBags', body).textContent = fmt(r.perPost / 80, 1);
    $('#wgN', body).textContent = fmt(r.perPost, 0);
    $('#mQ', body).textContent = `= ${fmt(r.q, 1)} psf at ${st.V} mph`;
    $('#mE', body).textContent = `${st.style.name}: ε ≈ ${fmt(r.eps, 2)}, factor ${fmt(r.red, 2)}`;
    for (const b of $$('#wStyle .chip', body)) b.setAttribute('aria-pressed', String(b.dataset.s === st.style.id));
    for (const b of $$('.presets .chip', body)) b.setAttribute('aria-pressed', String(+b.dataset.v === st.V));
    const all = WSTYLES.map(s => { const h = s.hs.reduce((a, x) => Math.abs(x - st.h) < Math.abs(a - st.h) ? x : a, s.hs[0]); return { s, h, r: windLoad({ ...st, style: s, h }) }; });
    const max = Math.max(...all.map(x => x.r.perFt), 1);
    $('#wBars', body).innerHTML = all.map(x => `<button class="wbar${x.s === st.style ? ' on' : ''}" data-s="${x.s.id}"><span class="wb-n">${esc(x.s.name)} <small>${x.h} ft</small></span><span class="wb-t"><i style="--w:${(x.r.perFt / max * 100).toFixed(1)}%"></i></span><b class="mono">${fmt(x.r.perFt)} <small>lb/ft</small></b></button>`).join('');
  };
  body.addEventListener('click', e => {
    const s = e.target.closest('[data-s]'); if (s) { st.style = WSTYLES.find(x => x.id === s.dataset.s); if (!st.style.hs.includes(st.h)) st.h = st.style.hs.reduce((a, x) => Math.abs(x - st.h) < Math.abs(a - st.h) ? x : a, st.style.hs[0]); update(); seed(); }
    const p = e.target.closest('.presets [data-v]'); if (p) { st.V = +p.dataset.v; $('[name=V]', body).value = st.V; update(); }
  });
  bindSeg(body, (n, v) => { if (n === 'h') st.h = +v; if (n === 'exposure') st.exposure = v; update(); });
  $('[name=V]', body).oninput = e => { st.V = +e.target.value; update(); };

  // ── flow picture ──
  const geo = () => { const ground = H * .8, scale = (H * .52) / 8, fx = W * .4; return { ground, hpx: st.h * scale, fx, scale }; };
  const seed = () => { parts = Array.from({ length: Math.round(clamp(W * H / 1700, 120, 420)) }, () => spawn(true)); };
  const spawn = (anywhere) => { const { ground } = geo(); return { x: anywhere ? Math.random() * W : -10 - Math.random() * 40, y: 12 + Math.random() * (ground - 16), r: Math.random(), trail: [] }; };
  const resize = () => { ({ w: W, h: H } = fit()); seed(); };
  const ro = new ResizeObserver(resize); ro.observe(cv);
  const frame = () => {
    t += 1 / 60;
    const { ground, hpx, fx } = geo(), r = res(), eps = r.eps;
    const U = clamp(st.V / 58, .25, 2.2) * 2.4; // px per frame
    g.clearRect(0, 0, W, H);
    // sky + ground
    const sky = g.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#0d1d31'); sky.addColorStop(1, '#13283f'); g.fillStyle = sky; g.fillRect(0, 0, W, ground);
    g.fillStyle = '#1b2c1e'; g.fillRect(0, ground, W, H - ground); g.fillStyle = '#26402a'; g.fillRect(0, ground, W, 3);
    // a house downwind for scale
    const hx = fx + hpx * 2.6, hw = 7.5 * 8 * (hpx / st.h) / 8 * 1.2, hh = 9 * hpx / st.h;
    g.fillStyle = '#0a1726'; g.fillRect(hx, ground - hh, hw * 3, hh); g.beginPath(); g.moveTo(hx - 6, ground - hh); g.lineTo(hx + hw * 1.5, ground - hh - hh * .45); g.lineTo(hx + hw * 3 + 6, ground - hh); g.fill();
    // wake eddy behind fences under ~30% open (solidity over ~0.7)
    const eddy = clamp((eps - .65) / .35, 0, 1);
    // particles
    g.lineCap = 'round';
    for (const p of parts) {
      const z = ground - p.y, dx = p.x - fx;
      let vx = U * (0.55 + 0.45 * Math.min(1, z / (H * .35))) * (0.8 + 0.4 * p.r), vy = 0;
      const blocked = p.r < eps;
      if (blocked && z < hpx * 1.25 && dx > -hpx * 2.2 && dx < 0) { const k = 1 - (-dx) / (hpx * 2.2); vy = -(hpx * 1.25 - z) * 0.06 * k * U * .6; vx *= 0.85 + .4 * k; }
      if (!blocked && dx > -4 && dx < 6 && z < hpx) vx *= 1 - eps * .75;
      if (dx > 0 && dx < hpx * 5 && z < hpx * 1.4 && eps > .5) { const k = 1 - dx / (hpx * 5); vy += (z - hpx * .3) * 0.012 * k * U * (blocked ? 1 : 0.2); if (z < hpx * 1.05) vx *= 1 - .7 * eps * k; }
      p.x += vx; p.y += vy;
      if (p.y > ground - 2) p.y = ground - 2;
      p.trail.push(p.x, p.y); if (p.trail.length > 14) p.trail.splice(0, 2);
      if (p.x > W + 10 || p.y < 0) Object.assign(p, spawn(false), { trail: [] });
      const fast = Math.hypot(vx, vy) / U;
      g.strokeStyle = fast > 1.15 ? 'rgba(240,168,101,.75)' : 'rgba(140,199,255,.5)'; g.lineWidth = 1.4;
      g.beginPath(); for (let i = 0; i < p.trail.length; i += 2) i ? g.lineTo(p.trail[i], p.trail[i + 1]) : g.moveTo(p.trail[i], p.trail[i + 1]); g.stroke();
    }
    if (eddy > 0) { // rolling air behind a solid fence: drawn as rotating arcs
      const cx = fx + hpx * 1.1, cy = ground - hpx * .45, rr = hpx * .55;
      g.save(); g.globalAlpha = .55 * eddy; g.strokeStyle = '#8cc7ff'; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a0 = -t * 2.2 * clamp(st.V / 40, .4, 2) + i * 2.1; g.beginPath(); g.ellipse(cx, cy, rr * (1 - i * .22), rr * .7 * (1 - i * .22), 0, a0, a0 + 1.7); g.stroke(); }
      g.restore();
    }
    // fence, leaning a little with the load (drawn exaggerated)
    const lean = clamp(r.moment / 6000, 0, .07) * (1 + .25 * Math.sin(t * 5 + Math.sin(t * 1.7) * 2)), top = [fx + Math.sin(lean) * hpx, ground - Math.cos(lean) * hpx];
    g.strokeStyle = '#d9823f'; g.lineWidth = 7; g.setLineDash(eps > .9 ? [] : [Math.max(2, eps * 10), Math.max(2, (1 - eps) * 10)]);
    g.beginPath(); g.moveTo(fx, ground); g.lineTo(top[0], top[1]); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#f0a865'; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, ground + 2); g.lineTo(fx, ground + hpx * .55); g.stroke(); // post below grade
    // pressure arrows on the windward face
    const n = 5, len = clamp(r.p * 1.6, 4, 46);
    g.strokeStyle = 'rgba(239,91,91,.9)'; g.fillStyle = 'rgba(239,91,91,.9)'; g.lineWidth = 2;
    for (let i = 0; i < n; i++) { const y = ground - hpx * (i + .5) / n, x = fx - 6; g.beginPath(); g.moveTo(x - len, y); g.lineTo(x, y); g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y - 4); g.lineTo(x - 6, y + 4); g.fill(); }
    // labels
    g.fillStyle = 'rgba(234,240,247,.85)'; g.font = '600 12px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText(`${st.h} FT`, fx, ground - hpx - 10);
    if (eddy > .2) { g.fillStyle = 'rgba(140,199,255,.9)'; g.fillText('EDDY', fx + hpx * 1.1, ground - hpx * 1.15); }
    if (live && !reduced.matches) raf = requestAnimationFrame(frame);
  };
  update(); resize(); frame();
  return () => { live = false; cancelAnimationFrame(raf); ro.disconnect(); };
}

// ═════════════════════════════════════════════════════════════════
// 2. LIFESPAN — the published ranges, and where in the range a fence lands
// ═════════════════════════════════════════════════════════════════
// Ranges are the ones already printed in the GFS brochure (p. 9, 11, 31, 77). The
// toggles only move the estimate inside the range; nothing here goes past it.
const LIFE = [
  { id: 'pt', name: 'Pressure-treated pine', range: [10, 15], wood: true, care: 'Stain or seal every few years', first: 'Boards check, twist and turn gray. Wood posts rot where they meet the soil, where there is both air and water.', src: 'GFS brochure p. 9 (up to about 15 years). Fannie Mae useful-life tables list a 6 ft wood privacy fence at 15 years (10 to 20).' },
  { id: 'wrc', name: 'Western Red Cedar', range: [15, 30], wood: true, care: 'Seal every 3 to 5 years, or let it gray', first: 'Surface weathering and graying. The heartwood\'s natural oils resist decay, so boards outlast pine.', src: 'GFS brochure p. 9 and 11 (15 to 30 years). Re-seal interval from brochure p. 27.' },
  { id: 'nwc', name: 'Northern White Cedar', range: [15, 30], wood: true, care: 'Seal every 3 to 5 years, or let it gray', first: 'Surface weathering. Very decay resistant, and it moves less as it dries than pine.', src: 'GFS brochure p. 9 and 11 (15 to 30 years).' },
  { id: 'vinyl', name: 'Homeland vinyl', range: [20, 30], care: 'Wash it once a year', first: 'Knocks from mowers and trimmers, and stress at the gate. Thin big-box vinyl fades and cracks first; Homeland walls are thicker.', src: 'Angi: 20 to 30 years. Fannie Mae useful-life tables: PVC fencing 25 years. Homeland limited lifetime warranty (brochure p. 31).' },
  { id: 'alu', name: 'Elite aluminum', range: [30, 45], plus: true, care: 'Nothing. Rinse if you want', first: 'Very little. Aluminum does not rust, and Elite\'s powder coat is covered for peeling and cracking.', src: 'GFS brochure p. 77 (30+ years). Elite lifetime warranty on the finish (brochure p. 52).' },
  { id: 'cl', name: 'Galvanized chain link', range: [20, 30], care: 'None', first: 'The zinc coating wears slowly, most where the fabric touches wet soil or mulch.', src: 'GFS brochure p. 77 (20 to 30 years). Fannie Mae lists chain link at 40 years.' },
  { id: 'clb', name: 'Black vinyl-coated chain link', range: [25, 35], care: 'None', first: 'Trimmer nicks in the coating along the bottom.', src: 'GFS brochure p. 77 (25 to 35 years).' },
  { id: 'split', name: 'Cedar split rail', range: [15, 30], wood: true, care: 'None needed', first: 'Posts at the soil line. Mortised rails have no nails to work loose.', src: 'GFS brochure p. 77 (15 to 30 years).' }
];
const LTOGGLES = [
  { id: 'seal', label: 'Sealed or stained on schedule', on: m => m.wood && m.id !== 'split', w: .2 },
  { id: 'steel', label: 'Driven galvanized steel posts (not wood in the ground)', on: m => m.wood && m.id !== 'split', w: .15 },
  { id: 'sprink', label: 'Lawn sprinklers hit the fence', on: m => m.wood, w: -.25 },
  { id: 'damp', label: 'Shade, mulch or leaves piled against the bottom', on: m => m.wood || m.id === 'cl', w: -.2 },
  { id: 'trim', label: 'String trimmer used right along the bottom', on: m => ['vinyl', 'clb', 'cl'].includes(m.id), w: -.2 },
  { id: 'clear', label: 'Kept clear of soil and mulch', on: m => !m.wood || m.id === 'split', w: .2 }
];
export function lifeEstimate(m, on) {
  const s = LTOGGLES.filter(x => x.on(m) && on.has(x.id)).reduce((a, x) => a + x.w, 0);
  const f = clamp(.5 + s, 0, 1);
  return { f, years: Math.round(m.range[0] + (m.range[1] - m.range[0]) * f) };
}
function life(body) {
  let m = LIFE[1]; const on = new Set(['steel', 'seal']);
  const MAXY = 50;
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis life-vis"><div class="life-big"><b class="mono" id="lY"></b><span>years, about</span></div>
        <div class="life-axis" id="lAxis"></div><p class="lab-note" id="lFirst"></p></div>
      <div class="lab-ctl">
        <div class="lab-label">Material</div>
        <div class="chips wrap" id="lMat">${LIFE.map(x => `<button class="chip" data-m="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <div class="lab-label">This yard</div><div class="toggles" id="lTog"></div>
        <div class="readouts one"><div><b id="lCare"></b><small>Upkeep</small></div></div>
      </div>
    </div>
    <div class="lab-card"><div class="lab-label">Every material, side by side</div><div class="lchart" id="lChart"></div></div>
    ${math(`<p>Each bar is a published range. The estimate starts in the middle and the yard choices move it toward one end. It never goes past the range, because nobody has data for that.</p><div id="lSrc"></div>
      <p><b>Why wood posts fail at the soil line</b>: decay fungi need oxygen, water and a temperature they like. A few inches either side of grade has all three, deeper soil has little oxygen, and the air above dries out. That band is where a wood post rots first, and it is why GFS drives galvanized steel posts in clay.</p>`)}`;
  const tick = y => `<i style="left:${y / MAXY * 100}%"><span>${y}</span></i>`;
  const update = () => {
    const e = lifeEstimate(m, on);
    $('#lY', body).textContent = m.plus ? m.range[0] + '+' : e.years;
    $('#lFirst', body).innerHTML = `<b>What wears out first:</b> ${esc(m.first)}`;
    $('#lCare', body).textContent = m.care;
    const careEvery = m.id === 'wrc' || m.id === 'nwc' ? 4 : m.id === 'pt' ? 3 : 0;
    const ticks = careEvery && on.has('seal') ? Array.from({ length: Math.floor(e.years / careEvery) }, (_, i) => `<em style="left:${(i + 1) * careEvery / MAXY * 100}%" title="Seal"></em>`).join('') : '';
    $('#lAxis', body).innerHTML = `<div class="la-track"><div class="la-range" style="left:${m.range[0] / MAXY * 100}%;width:${(m.range[1] - m.range[0]) / MAXY * 100}%">${m.plus ? '<span class="la-plus"></span>' : ''}</div>${ticks}<div class="la-mark" style="left:${(m.plus ? m.range[0] : e.years) / MAXY * 100}%"></div></div><div class="la-ticks">${[0, 10, 20, 30, 40, 50].map(tick).join('')}</div>${ticks ? '<p class="src">Dots: a re-seal about every ' + careEvery + ' years.</p>' : ''}`;
    $('#lTog', body).innerHTML = LTOGGLES.filter(x => x.on(m)).map(x => `<label class="tog"><input type="checkbox" data-k="${x.id}" ${on.has(x.id) ? 'checked' : ''}><i></i><span>${esc(x.label)}</span></label>`).join('');
    for (const b of $$('#lMat .chip', body)) b.setAttribute('aria-pressed', String(b.dataset.m === m.id));
    $('#lChart', body).innerHTML = LIFE.map(x => `<button class="lrow${x === m ? ' on' : ''}" data-m="${x.id}"><span>${esc(x.name)}</span><span class="lr-t"><i style="left:${x.range[0] / MAXY * 100}%;width:${(x.range[1] - x.range[0]) / MAXY * 100}%" class="${x.plus ? 'plus' : ''}"></i></span><b class="mono">${x.plus ? x.range[0] + '+' : x.range[0] + '–' + x.range[1]}</b></button>`).join('');
    $('#lSrc', body).innerHTML = LIFE.map(x => `<p><b>${esc(x.name)}</b>: ${esc(x.src)}</p>`).join('');
  };
  body.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { m = LIFE.find(x => x.id === b.dataset.m); update(); } });
  body.addEventListener('change', e => { const c = e.target.closest('[data-k]'); if (c) { c.checked ? on.add(c.dataset.k) : on.delete(c.dataset.k); update(); } });
  update();
}

// ═════════════════════════════════════════════════════════════════
// 3. WOOD MOVEMENT — USDA Wood Handbook shrinkage
// ═════════════════════════════════════════════════════════════════
// Green-to-ovendry shrinkage, flat-sawn (tangential) and quartersawn (radial), %.
// USDA Forest Products Laboratory, Wood Handbook, Table 4-3. Southern pine uses loblolly,
// the most common treated pine species.
const SPECIES = [
  { id: 'pt', name: 'Treated pine', T: 7.4, R: 4.8, wet: 30, note: 'Treated lumber often leaves the yard soaked, above 30% moisture, so it shrinks the most after it goes up.' },
  { id: 'wrc', name: 'Western Red Cedar', T: 5.0, R: 2.4, wet: 18, note: 'Cedar shrinks about a third less than pine and is usually drier when it arrives.' },
  { id: 'nwc', name: 'Northern White Cedar', T: 4.9, R: 2.2, wet: 18, note: 'Among the most stable woods grown in North America.' }
];
const FSP = 30; // fiber saturation point, % (Wood Handbook uses 30 for this estimate)
export function shrink(sp, width, mcFrom, mcTo, grain = 'T') {
  const S0 = sp[grain] / 100, a = Math.min(mcFrom, FSP), b = Math.min(mcTo, FSP);
  return width * S0 * (a - b) / FSP; // inches; positive = shrinks
}
const frac16 = v => { const n = Math.round(Math.abs(v) * 16); if (!n) return '0'; const w = Math.floor(n / 16), r = n % 16; let f = ''; if (r) { let a = r, d = 16; while (a % 2 === 0) { a /= 2; d /= 2; } f = `${a}/${d}`; } return (v < 0 ? '−' : '') + [w || '', f].filter(Boolean).join(' ') + '″'; };
function wood(body) {
  let sp = SPECIES[0], from = sp.wet, to = 12, width = 5.5;
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis wood-vis"><svg class="wood-svg" viewBox="0 0 400 230" aria-label="Pickets seen from above"></svg>
        <div class="vis-note">Looking down on six pickets. Gap drawn 4× bigger so you can see it.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Wood</div>
        ${seg('sp', SPECIES.map(s => [s.id, s.name]), sp.id)}
        <p class="lab-note" id="wdNote"></p>
        ${slider('from', 'Moisture when built', 8, 40, 1, from, '%')}
        ${slider('to', 'Moisture later (Ohio summer is about 12%)', 6, 30, 1, to, '%')}
        <div class="readouts">
          <div><b class="mono" id="wdGap"></b><small>gap that opens between butted 1×6 pickets</small></div>
          <div><b class="mono" id="wdCup"></b><small>flat-sawn shrinks this many times more than quartersawn, which is what makes boards cup</small></div>
        </div>
      </div>
    </div>
    <div class="lab-card"><p class="lab-note">This is why GFS builds board-on-board with overlapping boards: a gap opening as the wood dries stays covered. On a butted privacy fence, pine leaves the bigger gaps.</p></div>
    ${math(`<p><b>Shrinkage below the fiber saturation point</b> (USDA Wood Handbook, Ch. 4): S = S<sub>0</sub> · (M<sub>1</sub> − M<sub>2</sub>) / 30, where S<sub>0</sub> is green-to-ovendry shrinkage and moisture above 30% (free water) causes no shrinking. <span class="mono" id="wdEq"></span></p>
      <p>S<sub>0</sub> from Wood Handbook Table 4-3: loblolly pine 7.4% flat-sawn, 4.8% quartersawn; Western redcedar 5.0% and 2.4%; Northern white-cedar 4.9% and 2.2%.</p>
      <p class="src">Fence pickets are mostly flat-sawn, so the flat-sawn number is used. A 1×6 picket is 5½″ wide.</p>`)}`;
  const svg = $('.wood-svg', body);
  const update = () => {
    const g = shrink(sp, width, from, to);
    $('#wdNote', body).textContent = sp.note;
    $('[data-out=from]', body).textContent = from + '%'; $('[data-out=to]', body).textContent = to + '%';
    $('#wdGap', body).textContent = g < 0 ? `Swells ${frac16(-g)}` : frac16(g) + (g >= 1 / 32 ? ` (${fmt(g, 2)} in)` : '');
    $('#wdCup', body).textContent = fmt(sp.T / sp.R, 1) + '×';
    $('#wdEq', body).textContent = `= ${sp.T}% × (${Math.min(from, FSP)} − ${Math.min(to, FSP)}) / 30 × 5.5 in = ${fmt(g, 3)} in`;
    const pw = 58, gap = clamp(g * 4 * (pw / 5.5), -3, 40), x0 = 200 - (6 * pw + 5 * gap) / 2;
    const col = sp.id === 'pt' ? ['#c9b48a', '#a99566'] : sp.id === 'wrc' ? ['#c98a5b', '#9d6340'] : ['#e2cfa6', '#c2ad83'];
    svg.innerHTML = `<defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs>
      <rect x="40" y="128" width="320" height="16" rx="2" fill="#5a4a33" opacity=".8"/><text x="200" y="164" text-anchor="middle" class="svg-l">RAIL</text>
      ${Array.from({ length: 6 }, (_, i) => { const x = x0 + i * (pw + gap); const cup = clamp(g, 0, 1) * 10; return `<path d="M${x},${84} Q${x + pw / 2},${84 + cup} ${x + pw},${84} L${x + pw},${124} Q${x + pw / 2},${124 + cup} ${x},${124} Z" fill="url(#wg)" stroke="#3b2f20" stroke-width="1"/>`; }).join('')}
      ${gap > 2 ? Array.from({ length: 5 }, (_, i) => { const x = x0 + (i + 1) * pw + i * gap; return `<rect x="${x}" y="70" width="${gap}" height="68" fill="#8cc7ff" opacity=".25"/>`; }).join('') : ''}
      <text x="200" y="48" text-anchor="middle" class="svg-big">${g < 0 ? 'Boards swell ' + esc(frac16(-g)) : esc(frac16(g)) + ' gap'}</text>`;
  };
  bindSeg(body, (n, v) => { if (n === 'sp') { sp = SPECIES.find(s => s.id === v); from = sp.wet; $('[name=from]', body).value = from; } update(); });
  $('[name=from]', body).oninput = e => { from = +e.target.value; update(); };
  $('[name=to]', body).oninput = e => { to = +e.target.value; update(); };
  update();
}

// ═════════════════════════════════════════════════════════════════
// 4. FROST & POSTS — cross-section through a winter
// ═════════════════════════════════════════════════════════════════
const PLACES = [{ id: 'oh', name: 'Toledo · Lucas County', frost: 36, src: 'City of Toledo and Lucas County design frost depth' }, { id: 'mi', name: 'Michigan', frost: 42, src: 'Michigan footings 42 in below grade (Mich. Admin. Code R 408.30522)' }];
const MONTHS = [['Nov', 0], ['Dec', .35], ['Jan', .75], ['Feb', 1], ['Mar', .55], ['Apr', 0]];
function frost(body) {
  let place = PLACES[0], mi = 3, winters = 1, soil = 'clay';
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis"><svg class="frost-svg" viewBox="0 0 420 330" aria-label="Soil cross-section with three posts"></svg>
        <div class="vis-note">Post movement drawn bigger than life so you can see it.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Where</div>${seg('place', PLACES.map(p => [p.id, p.name]), place.id)}
        <div class="lab-label">Soil</div>${seg('soil', [['clay', 'Clay (most of Toledo)'], ['sand', 'Sand']], soil)}
        ${slider('m', 'Month', 0, 5, 1, mi)}
        ${slider('w', 'Winters', 1, 10, 1, winters)}
        <div class="readouts one"><div><b id="fWhy"></b><small id="fWhyS"></small></div></div>
      </div>
    </div>
    ${math(`<p><b>Frost depth</b> is how deep the ground freezes in a hard winter: 36 in in Toledo and Lucas County, 42 in across Michigan. A GFS driven post goes 48 in down, past both.</p>
      <p><b>Frost heave</b>: in wet clay, water is drawn up to the freezing front and freezes into ice lenses that lift the ground. Frozen soil also grips whatever is in it (adfreeze). A post that stops inside the frozen layer gets lifted with it, and each thaw it settles back a little less. A post anchored well below the frost line is held by unfrozen soil.</p>
      <p><b>Why GFS changes method by soil</b>: a driven steel post needs firm clay to grip. In sand, which drains and heaves far less but holds a driven post poorly, GFS sets the post in concrete instead.</p>
      <p class="src">Frost depths: ${PLACES.map(p => esc(p.src)).join('; ')}.</p>`)}`;
  const svg = $('.frost-svg', body);
  const update = () => {
    const [mName, mf] = MONTHS[mi], fd = place.frost * mf, ppi = 230 / 60, top = 70, gx = y => top + y * ppi;
    $('[data-out=m]', body).textContent = mName; $('[data-out=w]', body).textContent = winters;
    const heaving = soil === 'clay' ? 1 : .25;
    const posts = [
      { x: 64, d: 24, name: 'Shallow post', sub: '24 in deep', col: '#a68b60' },
      { x: 178, d: Math.max(36, place.frost), name: soil === 'sand' ? 'GFS in sand' : 'Wood in concrete', sub: `${Math.max(36, place.frost)} in · concrete`, col: '#a68b60', conc: true },
      { x: 292, d: 48, name: soil === 'clay' ? 'GFS driven steel' : 'Driven steel', sub: '48 in · driven', col: '#c8d2dc', steel: true }
    ];
    // Lift: only posts whose bottom sits within the frozen zone get carried; residual grows each winter.
    const lift = p => { if (p.d >= place.frost) return 0; const grip = clamp((fd - p.d * .45) / (p.d * .55), 0, 1); return grip * 14 * heaving + 3 * heaving * (winters - 1); };
    svg.innerHTML = `
      <defs><linearGradient id="soilG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${soil === 'clay' ? '#5b4532' : '#8a7550'}"/><stop offset="1" stop-color="${soil === 'clay' ? '#3d2d20' : '#6b5a3c'}"/></linearGradient>
        <pattern id="ice" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M0 5h9" stroke="#bfe3ff" stroke-width="2" opacity=".55"/></pattern></defs>
      <rect x="0" y="0" width="420" height="${top}" fill="#0f2034"/>
      <rect x="0" y="${top}" width="420" height="${330 - top}" fill="url(#soilG)"/>
      ${fd > 0 ? `<rect x="0" y="${top}" width="420" height="${fd * ppi}" fill="#9fd0ff" opacity=".16"/>${soil === 'clay' ? `<rect x="0" y="${top}" width="420" height="${fd * ppi}" fill="url(#ice)"/>` : ''}` : ''}
      <line x1="0" x2="420" y1="${gx(place.frost)}" y2="${gx(place.frost)}" stroke="#8cc7ff" stroke-dasharray="6 6" stroke-width="1.5"/>
      <text x="414" y="${gx(place.frost) - 6}" text-anchor="end" class="svg-l blue">FROST LINE ${place.frost}″</text>
      ${fd > 0 ? `<text x="6" y="${gx(fd) + 14}" class="svg-l">FROZEN TO ${Math.round(fd)}″ · ${esc(mName.toUpperCase())}</text>` : `<text x="6" y="${top + 16}" class="svg-l">${esc(mName.toUpperCase())} · GROUND THAWED</text>`}
      ${posts.map(p => { const L = lift(p), bot = gx(p.d) - L, w = p.steel ? 9 : 16; return `
        ${p.conc ? `<path d="M${p.x - 22},${gx(0) - L} L${p.x + 22},${gx(0) - L} L${p.x + 17},${bot + 8} L${p.x - 17},${bot + 8} Z" fill="#9aa3ab" opacity=".9"/>` : ''}
        <rect x="${p.x - w / 2}" y="${top - 52 - L}" width="${w}" height="${bot - (top - 52 - L)}" fill="${p.col}" rx="${p.steel ? 4 : 1}" ${p.steel ? 'stroke="#eef3f7" stroke-width=".8"' : ''}/>
        ${L > 1.5 ? `<path d="M${p.x},${top - 60 - L} v-14 m-6 6 l6 -6 l6 6" stroke="#ef5b5b" stroke-width="2.2" fill="none"/>` : ''}
        <text x="${p.x}" y="${top - 74 - Math.min(L, 16)}" text-anchor="middle" class="svg-n">${esc(p.name)}</text>
        <text x="${p.x}" y="${328}" text-anchor="middle" class="svg-l">${esc(p.sub)}</text>`; }).join('')}`;
    const shallow = lift(posts[0]);
    $('#fWhy', body).textContent = shallow > 2 ? 'The shallow post is being jacked up' : mf ? 'Every post is holding' : 'Ground is thawed';
    $('#fWhyS', body).textContent = soil === 'sand' ? 'Sand drains, so it heaves much less than clay. Posts are set in concrete here because sand holds a driven post poorly.' : `Only a post that reaches past ${place.frost} in is anchored in soil that never freezes. GFS drives to 48 in.`;
  };
  bindSeg(body, (n, v) => { if (n === 'place') place = PLACES.find(p => p.id === v); if (n === 'soil') soil = v; update(); });
  $('[name=m]', body).oninput = e => { mi = +e.target.value; update(); };
  $('[name=w]', body).oninput = e => { winters = +e.target.value; update(); };
  update();
}

// ═════════════════════════════════════════════════════════════════
// 5. GATE SAG — lever arm, bracing direction, steel frame
// ═════════════════════════════════════════════════════════════════
const BRACES = [['none', 'No brace'], ['wrong', 'Brace the wrong way'], ['right', 'Brace the right way'], ['steel', 'GFS steel frame']];
function gate(body) {
  let width = 4, brace = 'right', years = 5;
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis"><svg class="gate-svg" viewBox="0 0 420 300" aria-label="A wood gate on its hinges"></svg>
        <div class="vis-note">Sag drawn bigger than life so you can see it.</div></div>
      <div class="lab-ctl">
        ${slider('gw', 'Gate width', 3, 6, .5, width, ' ft')}
        <div class="lab-label">Bracing</div>${seg('brace', BRACES, brace)}
        ${slider('y', 'Years in use', 0, 15, 1, years)}
        <div class="readouts">
          <div><b class="mono" id="gPull"></b><small>pull on the top hinge, compared with a 4 ft gate</small></div>
          <div><b id="gState"></b><small id="gStateS"></small></div>
        </div>
      </div>
    </div>
    ${math(`<p><b>Why wide gates sag more</b>: a gate hangs from one side, so its weight acts as a lever on the hinges. The weight grows with the width and so does the lever, so the pull on the top hinge grows with width squared. A 5 ft gate pulls about (5 ÷ 4)² ≈ 1.6 times as hard as a 4 ft gate.</p>
      <p><b>Which way a brace goes</b>: a wood brace works in compression, so it runs from the bottom hinge corner up to the top latch corner and props the latch side up. Run it the other way and it hangs off nails in tension, and the gate racks into a parallelogram. A steel cable is the opposite: it works in tension, from the top hinge corner down to the bottom latch corner.</p>
      <p><b>GFS steel frame</b>: wood gates can get a welded 1½ in square steel tube frame inside, so the gate cannot rack at all. Vinyl gates get aluminum inside the frame.</p>`)}`;
  const svg = $('.gate-svg', body);
  const update = () => {
    const k = (width / 4) ** 2, base = { none: 9, wrong: 7, right: .8, steel: .1 }[brace];
    const sag = clamp(base * k * Math.sqrt(years / 5 || 0) * 1.0, 0, 40);
    $('[data-out=gw]', body).textContent = width + ' ft'; $('[data-out=y]', body).textContent = years;
    $('#gPull', body).textContent = fmt(k, 2) + '×';
    $('#gState', body).textContent = sag < 2 ? 'Square and swinging free' : sag < 7 ? 'Starting to drag' : 'Dragging on the ground';
    $('#gStateS', body).textContent = brace === 'wrong' ? 'The brace is pulling on nails instead of pushing.' : brace === 'none' ? 'Nothing stops the frame from racking.' : brace === 'steel' ? 'A welded frame cannot rack.' : 'The brace props the latch corner up.';
    const pw = 70 + width * 40, x0 = 210 - pw / 2 + 20, y0 = 60, h = 170, post = x0 - 22;
    const pts = [[x0, y0], [x0 + pw, y0 + sag], [x0 + pw, y0 + h + sag], [x0, y0 + h]];
    const P = p => p.join(',');
    const pickets = Array.from({ length: Math.round(pw / 18) }, (_, i) => { const t = (i + .5) / Math.round(pw / 18), x = x0 + pw * t, dy = sag * t; return `<rect x="${x - 7}" y="${y0 - 14 + dy}" width="14" height="${h + 14}" fill="#c98a5b" stroke="#7a4f2f" stroke-width=".8" rx="1.5"/>`; }).join('');
    const br = brace === 'right' ? [pts[3], pts[1]] : brace === 'wrong' ? [pts[0], pts[2]] : null;
    svg.innerHTML = `
      <rect x="0" y="${y0 + h + 6}" width="420" height="80" fill="#1b2c1e"/>
      <rect x="${post - 12}" y="${y0 - 30}" width="24" height="${h + 60}" fill="#8f6a46"/>
      ${pickets}
      <polyline points="${P(pts[0])} ${P(pts[1])}" stroke="#7a4f2f" stroke-width="10" fill="none"/>
      <polyline points="${P(pts[3])} ${P(pts[2])}" stroke="#7a4f2f" stroke-width="10" fill="none"/>
      ${brace === 'steel' ? `<polygon points="${pts.map(P).join(' ')}" fill="none" stroke="#c8d2dc" stroke-width="5"/>` : ''}
      ${br ? `<line x1="${br[0][0]}" y1="${br[0][1]}" x2="${br[1][0]}" y2="${br[1][1]}" stroke="${brace === 'right' ? '#3ecf8e' : '#ef5b5b'}" stroke-width="8" stroke-linecap="round"/>` : ''}
      <rect x="${post + 8}" y="${y0 + 8}" width="20" height="10" rx="2" fill="#20262c"/><rect x="${post + 8}" y="${y0 + h - 18}" width="20" height="10" rx="2" fill="#20262c"/>
      ${sag > 2 ? `<path d="M${x0 + pw + 14},${y0 + h} v${sag}" stroke="#ef5b5b" stroke-width="2"/><text x="${x0 + pw + 20}" y="${y0 + h + sag / 2 + 4}" class="svg-l red">SAG</text>` : ''}
      <text x="${x0 + pw / 2}" y="${y0 - 26}" text-anchor="middle" class="svg-n">${width} ft gate</text>`;
  };
  $('[name=gw]', body).oninput = e => { width = +e.target.value; update(); };
  $('[name=y]', body).oninput = e => { years = +e.target.value; update(); };
  bindSeg(body, (n, v) => { brace = v; update(); });
  update();
}
