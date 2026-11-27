// Fence Lab: the engineering behind a fence, as things a customer can play with.
// Every number comes from a published source named in its "Show the math" panel:
// ASCE 7 wind loads, the USDA Wood Handbook, local frost depths, and the lifespans
// already printed in the GFS brochure. Where a drawing exaggerates motion so it can
// be seen, it says so.
import { $, $$, esc, clamp, icons, reduced, gesture, digNumbers } from './ui.mjs';
import { webglOK } from './lab3d-ok.mjs';
import { PLACES, MONTHS, WINTERS, POSTS, DRAWN, frozenAt, lift } from './frost-plan.mjs';
export { digNumbers } from './ui.mjs';
import { visit } from './visit.mjs';
import { helpOnce } from './help.mjs';

let app, root, D, current = null, stop = null;

const TOOLS = [
  { id: 'dig', name: 'No-dig vs dug', line: 'Watch both crews put in the same fence, and see how much dirt a dug fence leaves in the yard',
    how: [['tap', 'Tap <b>Play install day</b> to watch both crews work, or slide <b>Install day</b> to any moment.'], ['slide', 'Slide <b>Your fence</b> to the length of your fence.'], ['drag', 'Drag sideways on a yard to turn it. Pinch to zoom, double-tap to reset.'], ['look', 'Watch the dirt piles and concrete bags in the dug yard. The no-dig yard has none.']],
    take: 'No holes, no concrete, no dirt left in the yard. Steel posts driven 4 ft into the clay, and no waiting on concrete before the fence goes up.' },
  { id: 'build', name: 'Our build vs prefab', line: 'One 8 ft section, side by side, then watch 15 years go by',
    how: [['slide', 'Slide <b>Years</b>, or tap <b>Play 15 years</b>, to age both fences.'], ['tap', 'Switch <b>Wood</b> or <b>Vinyl</b>, how the prefab posts are set, and a flat or sloped yard.'], ['tap', 'Tap a part in the lists below to point it out.'], ['drag', 'Drag sideways on a yard to turn it. Pinch to zoom, double-tap to reset.']],
    take: 'Steel driven 4 ft has no wood in the ground to rot and nothing above the frost line to heave. The flat 2×4 across the top keeps the top line straight.' },
  { id: 'frost', name: 'Frost & posts', line: 'What Toledo winters do to dug posts, and why driven steel stays put',
    how: [['tap', 'Pick <b>Toledo</b> or <b>Michigan</b>, <b>clay</b> or <b>sand</b>, and a <b>typical</b> or <b>hard</b> winter.'], ['tap', 'Tap <b>Play a winter</b>, or slide through the <b>months</b>. Add <b>winters</b> to watch footings creep up.'], ['drag', 'Drag sideways on the yard to turn it. Pinch to zoom, double-tap to reset.']],
    take: 'A post has to reach well below the frost line, 3 ft here and 3½ ft in Michigan. Ours are driven 4 ft.' },
  { id: 'grade', name: 'Grade Lab', line: 'Shape the yard and see how we make the top line look great and close the gaps',
    how: [['drag', 'Drag <b>up or down</b> on the yard to shape the ground under the fence.'], ['tap', 'Pick what your finger does: <b>Shape the yard</b>, <b>Raise / lower posts</b>, or the <b>Dirt pen</b>.'], ['tap', 'Then tap <b>Smooth the top line</b>, <b>Fill the gaps</b>, <b>Add a kickboard</b> or <b>Grade the line</b>.']],
    take: 'We set a clean top line first, then close what is left underneath with raked dirt, a kickboard or grading.' },
  { id: 'gate', name: 'Gate sag', line: 'Why gates sag, and how a brace stops it',
    how: [['slide', 'Slide the <b>gate width</b> and the <b>years in use</b>.'], ['tap', 'Try each <b>brace</b> and <b>hinge post</b> to see how much the gate drops.']],
    take: 'A brace from the bottom hinge up to the latch side holds a gate square. A steel frame and a steel hinge post hold it best.' },
  { id: 'life', more: true, name: 'Lifespan', line: 'How long each material lasts, and what wears out first',
    how: [['tap', 'Tap a <b>material</b> to see about how long it lasts.'], ['tap', 'Flip the switches under <b>This yard</b> to match your yard.']],
    take: 'On a wood fence the posts in the ground usually go first. Ours are galvanized steel.' },
  { id: 'vinyl', more: true, name: 'Vinyl walls', line: 'Same size post, thicker wall: what .015 in buys you',
    how: [['slide', 'Slide <b>Gust speed</b> to push on both posts.'], ['look', 'Watch the thinner big-box post bend further than ours.']],
    take: 'A thicker wall makes a stiffer post, and ours sleeves over a driven steel post instead of sitting in a concrete plug.' },
  { id: 'wind', more: true, name: 'Wind', line: 'How hard wind pushes on each style',
    how: [['tap', 'Pick a <b>style</b> and a <b>height</b>.'], ['slide', 'Slide <b>Gust speed</b>, or tap a storm, to see the push on each post.'], ['look', 'Watch the air: solid fences make a swirl behind them, open ones just slow it.']],
    take: 'Solid, tall fences catch the most wind, so post strength and depth matter most on privacy fences.' },
  { id: 'wood', more: true, name: 'Wood movement', line: 'Why gaps open between boards',
    how: [['tap', 'Pick a <b>wood</b>.'], ['slide', 'Slide the moisture <b>when built</b> and <b>later</b> to watch the gaps open.']],
    take: 'All wood shrinks as it dries. Styles that overlap the boards, like board-on-board, hide the gaps.' }
];

// Small line drawings for the Lab home cards.
const PICT = {
  dig: '<path d="M4 30h56"/><path d="M14 30v12" class="mute"/><path d="M6 30q8-11 16 0" class="mute"/><path d="M44 8v34" class="cu"/><path d="M38 5h12" class="cu"/>',
  build: '<path d="M6 40h52"/><path d="M10 40V16M26 40V16" class="mute"/><path d="M10 20l16 3M10 34l16 1" class="mute"/><path d="M36 40V14M54 40V14"/><path d="M36 18h18M36 26h18M36 34h18"/><path d="M36 14h18" class="cu"/>',
  grade: '<path d="M6 36c8-4 14 3 22 0s14-6 30-2" class="cu"/><path d="M8 14h48"/><path d="M10 14v20M24 14v21M38 14v18M52 14v19"/>',
  vinyl: '<rect x="10" y="10" width="16" height="30" rx="1"/><rect x="38" y="10" width="16" height="30" rx="1" class="cu"/><rect x="41" y="13" width="10" height="24" class="cu"/><rect x="12" y="12" width="12" height="26" class="mute"/>',
  wind: '<path d="M44 8v34"/><path d="M8 14h22M8 22h28M8 30h22" class="cu"/><path d="M30 10l4 4-4 4M36 18l4 4-4 4M30 26l4 4-4 4" class="cu"/>',
  life: '<path d="M8 38h48"/><rect x="10" y="26" width="10" height="12"/><rect x="24" y="18" width="10" height="20"/><rect x="38" y="10" width="10" height="28" class="cu"/>',
  wood: '<path d="M8 12h10v28H8zM21 12h10v28H21zM34 12h10v28H34z"/><path d="M47 12h10v28H47z" class="mute"/><path d="M18.5 16v20M31.5 16v20M44.5 16v20" class="cu"/>',
  frost: '<path d="M4 18h56"/><path d="M4 30h56" class="cu dash"/><path d="M14 10v14M30 10v18M48 10v30"/>',
  gate: '<path d="M8 8v34"/><rect x="12" y="12" width="42" height="26"/><path d="M12 38L54 12" class="cu"/>'
};

export async function init(a, el) {
  app = a; root = el; D = app.data;
  root.innerHTML = `
    <div class="lab">
      <header class="lab-head">
        <div class="lab-nav" hidden>
          <button class="btn sm" data-nav="home">${icons.grid}<span>All tools</span></button>
          <div class="grow"></div>
          <button class="iconbtn sm" data-nav="-1" aria-label="Previous tool">${icons.back}</button>
          <span class="mono lab-count"></span>
          <button class="iconbtn sm" data-nav="1" aria-label="Next tool">${icons.next}</button>
        </div>
        <div class="eyebrow">FENCE LAB<span class="lab-eb-more"> · THE ENGINEERING BEHIND EVERY GFS FENCE</span></div>
        <h2 id="labTitle"></h2><p id="labLine"></p>
      </header>
      <details class="lab-how" hidden><summary>${icons.help}<span>How to use</span><small></small></summary><ul class="hs-list"></ul></details>
      <div class="lab-body"></div>
      <footer class="lab-foot" hidden>
        <div class="lab-take"><div class="lab-label">Why it matters</div><p></p></div>
        <div class="lab-next"><button class="btn sm" data-nav="home">${icons.grid}<span>All tools</span></button><button class="btn primary" data-nav="1"></button></div>
      </footer>
    </div>`;
  root.addEventListener('click', e => {
    const tile = e.target.closest('.lab-tile'); if (tile) return select(tile.dataset.tool);
    const n = e.target.closest('[data-nav]')?.dataset.nav; if (!n) return;
    if (n === 'home') return select('home');
    const i = TOOLS.findIndex(x => x.id === current);
    select(TOOLS[(i + +n + TOOLS.length) % TOOLS.length].id);
  });
}
let fromLink = false, visible = false, preset = {};
export function show(opts = {}) {
  fromLink = !!opts.fromLink; preset = { len: opts.len };
  // Tapping Lab in the dock while already in the Lab goes back to the Lab home.
  const tool = opts.tool || (opts.via === 'dock' && visible ? 'home' : current || 'home');
  visible = true; select(tool, true);
}
export function hide() { visible = false; stop?.(); stop = null; }
export const where = () => ({ opts: { tool: current || 'home' }, label: current && current !== 'home' ? `Fence Lab · ${TOOLS.find(x => x.id === current).name}` : 'Fence Lab', short: current && current !== 'home' ? TOOLS.find(x => x.id === current).name : 'Lab' });
export const help = () => { const t = TOOLS.find(x => x.id === current); return t ? { key: 'lab-' + t.id, extra: { title: t.name, steps: t.how, note: 'Tap <b>All tools</b> to see the other tools, or ‹ › to go to the next one.' } } : { key: 'lab' }; };

const RENDER = { dig, build, grade: gradeTool, vinyl, wind, life, wood, frost, gate };
function select(id, force) {
  if (id !== 'home' && !RENDER[id]) id = 'home';
  if (id === current && !force && (stop || id === 'home')) return;
  stop?.(); stop = null; current = id;
  // Each tool gets a brand-new container: tools hang their tap handlers on it, and reusing one
  // let handlers from tools seen earlier keep firing (wrong redraws, errors, memory growth).
  const old = $('.lab-body', root), body = old.cloneNode(false); old.replaceWith(body);
  const home = id === 'home', t = TOOLS.find(x => x.id === id), i = TOOLS.indexOf(t);
  $('.lab-nav', root).hidden = home; $('.lab-foot', root).hidden = home; $('.lab-how', root).hidden = home;
  $('#labTitle', root).textContent = home ? 'Fence Lab' : t.name;
  $('#labLine', root).textContent = home ? 'Hands-on tools that show how a fence is built, and why ours lasts. Pick one.' : t.line;
  if (!home) {
    $('.lab-count', root).textContent = `${i + 1} / ${TOOLS.length}`;
    const how = $('.lab-how', root);
    $('ul', how).innerHTML = t.how.map(([g, s]) => `<li>${gesture(g)}<p>${s}</p></li>`).join('');
    $('summary span', how).innerHTML = `<b>How to use:</b> ${t.how[0][1].replace(/<[^>]+>/g, '')}`;
    $('summary small', how).textContent = `${t.how.length} steps`;
    // open the first time each tool is used on this device, folded after that
    // Folded so the picture is the first thing you see; the first step shows in the bar.
    const open = false;
    how.open = open;
    $('.lab-take p', root).textContent = t.take;
    const nx = TOOLS[(i + 1) % TOOLS.length];
    $('.lab-next [data-nav="1"]', root).innerHTML = `<span>Next: ${esc(nx.name)}</span>${icons.next}`;
  }
  body.classList.remove('in'); void body.offsetWidth;
  if (home) { body.innerHTML = homeHTML(); if (visible) helpOnce('lab'); }
  else { stop = RENDER[id](body) || null; if (!fromLink) visit.addLab(id); } // tools opened go in the picks summary and the share link
  body.classList.add('in');
  root.scrollTo?.({ top: 0 }); $('.lab', root).scrollTop = 0;
  if (app.mode === 'lab') { const h = '#lab' + (home ? '' : '-' + id); if (location.hash !== h) history.replaceState(null, '', h); }
}
function homeHTML() {
  const tile = (t, i) => `<button class="lab-card lab-tile${t.more ? ' more' : ''}" data-tool="${t.id}">
    <svg viewBox="0 0 64 48" aria-hidden="true">${PICT[t.id]}</svg>
    <span class="lt-b"><span class="mono">${String(i + 1).padStart(2, '0')}${i === 0 ? ' · START HERE' : ''}</span><b>${esc(t.name)}</b><small>${esc(t.line)}</small>
    <span class="lt-how">${[...new Set(t.how.map(h => h[0]).filter(g => g !== 'look'))].map(g => `<em>${{ tap: 'Tap', slide: 'Slide', drag: 'Drag', swipe: 'Swipe' }[g] || ''}</em>`).join('')}</span></span>${icons.next}</button>`;
  const main = TOOLS.filter(t => !t.more), more = TOOLS.filter(t => t.more);
  return `<div class="lab-label">Why our fences last</div><div class="lab-home">${main.map((t, i) => tile(t, i)).join('')}</div>
    <div class="lab-label lab-more-h">More for the curious</div><div class="lab-home">${more.map((t, i) => tile(t, main.length + i)).join('')}</div>`;
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
  let update = () => {
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
  // Reduce Motion (an iPhone setting) gets a still picture: the flow is run ahead off-screen and drawn once.
  const still = () => { if (!W) return; for (let i = 0; i < 70; i++) frame(true); };
  const resize = () => { ({ w: W, h: H } = fit()); seed(); if (reduced.matches) still(); };
  const ro = new ResizeObserver(resize); ro.observe(cv);
  const frame = (once) => {
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
    g.textAlign = 'right'; g.fillText(`${st.h} FT`, fx - 14, ground - hpx + 4); g.textAlign = 'center';
    if (eddy > .2) { g.fillStyle = 'rgba(140,199,255,.9)'; g.fillText('EDDY', fx + hpx * 1.1, ground - hpx * 1.15); }
    if (once !== true && live && vis.on && !reduced.matches) raf = requestAnimationFrame(frame);
  };
  const vis = onScreen(cv, () => { if (live && !reduced.matches) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
  update(); resize(); frame();
  const upd = update; update = () => { upd(); if (reduced.matches) still(); };
  return () => { live = false; cancelAnimationFrame(raf); ro.disconnect(); vis.stop(); };
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
  { id: 'nwc', name: 'Northern White Cedar', T: 4.9, R: 2.2, wet: 18, note: 'Shrinks even less than Western Red Cedar as it dries.' }
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
function frost(body) {
  let place = PLACES[0], mi = 3, winters = 1, soil = 'clay', winter = WINTERS[0];
  body.innerHTML = `
    <div class="frost-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the yard in 3D…</div></div>
    <div class="lab-ctl vs-ctl">
      <div class="vs-years"><button class="btn primary" id="frPlay">Play a winter</button>${slider('m', 'Month', 0, 5, 1, mi)}</div>
      ${slider('w', 'Winters', 1, 10, 1, winters)}
    </div>
    <div class="lab-grid">
      <div class="lab-vis"><svg class="frost-svg" viewBox="0 0 420 330" aria-label="Soil cross-section with three posts"></svg>
        <div class="vis-note">Post movement drawn ${DRAWN} times bigger than life so you can see it.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Where</div>${seg('place', PLACES.map(p => [p.id, p.name]), place.id)}
        <div class="lab-label">Soil</div>${seg('soil', [['clay', 'Clay (most of Toledo)'], ['sand', 'Sand']], soil)}
        <div class="lab-label">Winter</div>${seg('winter', WINTERS.map(w => [w.id, w.name]), winter.id)}
        <div class="readouts one"><div><b id="fWhy"></b><small id="fWhyS"></small></div></div>
        <div class="vis-note f3d-note" hidden>Post movement drawn ${DRAWN} times bigger than life so you can see it.</div>
      </div>
    </div>
    ${math(`<p><b>Frost line</b>: how deep the ground freezes in the hardest winters, 36 in in Toledo and Lucas County and 42 in across Michigan. A typical winter freezes it about two-thirds of the way down. A GFS driven post goes 48 in, past both.</p>
      <p><b>Frost heave</b>: in wet clay, water is drawn up to the freezing front and freezes into seams of ice (ice lenses) that lift the ground. Frozen soil also grips whatever is in it (adfreeze). A footing whose bottom is in or near the frozen layer rides up with it. At the thaw the ground settles, but loose soil falls into the gap under the footing, so it never quite comes back down, and it creeps up a little more each winter.</p>
      <p><b>Why depth matters</b>: the arrows show it. Frozen soil grips a post along the frozen part (up arrows). Unfrozen soil below the frost holds it along the rest (down arrows). A post with plenty of length below the frost line is held; a footing that ends at or above it is not. A flared top, where the top of a hole caved in, gives the frost even more to grab.</p>
      <p><b>The numbers here are a picture, not a measurement</b>: how far a post moves depends on how wet the clay is, how cold the winter gets and how deep the frost goes. We show about 1¼ in of lift in a winter for a footing fully in frozen clay, with about a third of it left behind each spring, drawn ${DRAWN} times bigger.</p>
      <p><b>Why GFS changes method by soil</b>: a driven steel post needs firm clay to grip. In sand, which drains and heaves far less but holds a driven post poorly, GFS sets pressure-treated posts in concrete instead.</p>
      <p class="src">Frost depths: ${PLACES.map(p => esc(p.src)).join('; ')}.</p>`)}`;
  const svg = $('.frost-svg', body);
  let scene = null;
  const update = () => {
    const mName = MONTHS[Math.round(mi)];
    $('[data-out=m]', body).textContent = mName; $('[data-out=w]', body).textContent = winters;
    const ls = POSTS.map(p => lift(p, mi, winters, place.frost, soil, winter.reach));
    if (scene) scene.set({ m: mi, winter: winters, frost: place.frost, soil, reach: winter.reach });
    else {
      const fz = frozenAt(mi, place.frost * winter.reach), ppi = 230 / 60, top = 70, gx = y => top + y * ppi;
      const xs = [64, 178, 292];
      svg.innerHTML = `
        <defs><linearGradient id="soilG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${soil === 'clay' ? '#5b4532' : '#8a7550'}"/><stop offset="1" stop-color="${soil === 'clay' ? '#3d2d20' : '#6b5a3c'}"/></linearGradient>
          <pattern id="ice" width="14" height="10" patternUnits="userSpaceOnUse"><path d="M0 5h9" stroke="#bfe3ff" stroke-width="2" opacity=".55"/></pattern></defs>
        <rect x="0" y="0" width="420" height="${top}" fill="#0f2034"/>
        <rect x="0" y="${top}" width="420" height="${330 - top}" fill="url(#soilG)"/>
        ${fz.depth > fz.thawed ? `<rect x="0" y="${gx(fz.thawed)}" width="420" height="${(fz.depth - fz.thawed) * ppi}" fill="#9fd0ff" opacity=".16"/>${soil === 'clay' ? `<rect x="0" y="${gx(fz.thawed)}" width="420" height="${(fz.depth - fz.thawed) * ppi}" fill="url(#ice)"/>` : ''}` : ''}
        <line x1="0" x2="420" y1="${gx(place.frost)}" y2="${gx(place.frost)}" stroke="#8cc7ff" stroke-dasharray="6 6" stroke-width="1.5"/>
        <text x="414" y="${gx(place.frost) - 6}" text-anchor="end" class="svg-l blue halo">FROST LINE ${place.frost}″</text>
        ${fz.depth > fz.thawed ? `<text x="6" y="${gx(fz.depth) - 6}" class="svg-l halo">FROZEN TO ${Math.round(fz.depth)}″ · ${esc(mName.toUpperCase())}</text>` : `<text x="6" y="${top + 16}" class="svg-l">${esc(mName.toUpperCase())} · GROUND THAWED</text>`}
        ${POSTS.map((p, i) => { const L = ls[i].lift * DRAWN * ppi, x = xs[i], bot = gx(p.depthIn) - L, w = p.pipe ? 9 : 16; return `
          ${p.pipe ? '' : `<path d="M${x - 20},${gx(0) - L} L${x + 20},${gx(0) - L} L${x + 17},${bot} L${x - 17},${bot} Z" fill="#9aa3ab" opacity=".9"/>`}
          <rect x="${x - w / 2}" y="${top - 52 - L}" width="${w}" height="${(p.pipe ? bot : gx(p.postBotIn) - L) - (top - 52 - L)}" fill="${p.pipe ? '#c8d2dc' : '#a68b60'}" rx="${p.pipe ? 4 : 1}" ${p.pipe ? 'stroke="#eef3f7" stroke-width=".8"' : ''}/>
          ${L > 1.5 ? `<path d="M${x},${top - 60 - L} v-14 m-6 6 l6 -6 l6 6" stroke="#ef5b5b" stroke-width="2.2" fill="none"/>` : ''}
          <text x="${x}" y="${top - 74 - Math.min(L, 16)}" text-anchor="middle" class="svg-n">${esc(p.name)}</text>
          <text x="${x}" y="${328}" text-anchor="middle" class="svg-l">${esc(p.sub)}</text>`; }).join('')}`;
    }
    const fz = frozenAt(mi, place.frost * winter.reach), up = ls.map(l => l.lift > .05);
    $('#fWhy', body).textContent = up[0] && up[1] ? 'Both concrete footings have been lifted' : up[0] ? 'The typical 24 in footing is being lifted' : fz.depth - fz.thawed > 1 ? 'Every post is holding' : 'The ground is thawed';
    $('#fWhyS', body).textContent = soil === 'sand' ? 'Sand drains, so it heaves much less than clay. GFS sets posts in concrete in sand, because sand holds a driven post poorly.'
      : winter.id === 'typical' ? `A typical winter freezes about ${Math.round(place.frost * winter.reach)} in down. Footings that stop near that get lifted. GFS drives steel to 48 in, past the ${place.frost} in frost line.`
      : `A hard winter freezes all the way to the ${place.frost} in frost line, so even a footing that stops right at it can be lifted. GFS drives steel to 48 in.`;
  };
  bindSeg(body, (n, v) => { if (n === 'place') place = PLACES.find(p => p.id === v); if (n === 'soil') soil = v; if (n === 'winter') winter = WINTERS.find(w => w.id === v); update(); });
  let raf = 0, live = true, playing = false, last = 0;
  const stopPlay = (label = 'Play a winter') => { playing = false; cancelAnimationFrame(raf); $('#frPlay', body).textContent = label; };
  $('[name=m]', body).oninput = e => { stopPlay(); mi = +e.target.value; update(); };
  $('[name=w]', body).oninput = e => { stopPlay(); winters = +e.target.value; update(); };
  $('#frPlay', body).onclick = () => {
    if (playing) return stopPlay();
    if (mi >= 5) { if (winters < 10 && $('#frPlay', body).textContent === 'Next winter') { winters++; $('[name=w]', body).value = winters; } mi = 0; }
    if (reduced.matches) { mi = 3; $('[name=m]', body).value = 3; update(); return; }
    playing = true; $('#frPlay', body).textContent = 'Pause'; last = performance.now();
    const step = now => { if (!playing || !live) return; mi = Math.min(5, mi + Math.min(now - last, 100) / 1400); last = now; $('[name=m]', body).value = Math.round(mi); update();
      if (mi >= 5) { stopPlay(winters < 10 ? 'Next winter' : 'Play a winter'); return; } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  if (webglOK()) {
    const host = $('.frost-3d', body); host.hidden = false; $('.lab-vis', body).hidden = true; $('.f3d-note', body).hidden = false;
    import('./frost3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); scene = m.createFrostScene(host, { specs: app.live?.specs }); update(); })
      .catch(() => { if (!live) return; host.hidden = true; $('.lab-vis', body).hidden = false; $('.f3d-note', body).hidden = true; scene = null; update(); });
  }
  update();
  return () => { live = false; stopPlay(); scene?.dispose(); scene = null; };
}

// ═════════════════════════════════════════════════════════════════
// 5. GATE SAG — lever arm, bracing direction, steel frame
// ═════════════════════════════════════════════════════════════════
const BRACES = [['none', 'No brace'], ['wrong', 'Brace the wrong way'], ['right', 'Brace the right way'], ['steel', 'GFS steel frame']];
function gate(body) {
  let width = 4, brace = 'right', years = 5, gpost = 'steel';
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis"><svg class="gate-svg" viewBox="0 0 420 300" aria-label="A wood gate on its hinges"></svg>
        <div class="vis-note">Sag drawn bigger than life so you can see it.</div></div>
      <div class="lab-ctl">
        ${slider('gw', 'Gate width', 3, 6, .5, width, ' ft')}
        <div class="lab-label">Bracing</div>${seg('brace', BRACES, brace)}
        <div class="lab-label">Hinge post</div>${seg('gpost', [['wood', '4×4 wood post'], ['steel', 'GFS 3 in steel post']], gpost)}
        ${slider('y', 'Years in use', 0, 15, 1, years)}
        <div class="readouts">
          <div><b class="mono" id="gPull"></b><small>pull on the top hinge, compared with a 4 ft gate</small></div>
          <div><b id="gState"></b><small id="gStateS"></small></div>
        </div>
      </div>
    </div>
    ${math(`<p><b>Why wide gates sag more</b>: a gate hangs from one side, so its weight acts as a lever on the hinges. The weight grows with the width and so does the lever, so the pull on the top hinge grows with width squared. A 5 ft gate pulls about (5 ÷ 4)² ≈ 1.6 times as hard as a 4 ft gate.</p>
      <p><b>Which way a brace goes</b>: a wood brace works in compression, so it runs from the bottom hinge corner up to the top latch corner and props the latch side up. Run it the other way and it hangs off nails in tension, and the gate racks into a parallelogram. A steel cable is the opposite: it works in tension, from the top hinge corner down to the bottom latch corner.</p>
      <p><b>The hinge post matters as much as the gate</b>: if the post leans, a perfectly square gate still drops at the latch. GFS gate posts are 3 in steel in a bigger wood box, so the post doesn't lean.</p>
      <p><b>GFS steel frame</b>: wood gates can get a welded steel frame inside, which can't rack the way a wood frame does. Vinyl gates get aluminum inside the frame.</p>`)}`;
  const svg = $('.gate-svg', body);
  const update = () => {
    const k = (width / 4) ** 2, base = { none: 9, wrong: 7, right: .8, steel: .1 }[brace];
    // A hinge post that leans lets the whole gate drop, braced or not.
    const leanDeg = gpost === 'wood' ? clamp(years / 15, 0, 1) * 2.2 * Math.sqrt(k) : 0;
    const rack = clamp(base * k * Math.sqrt(years / 5 || 0), 0, 40);
    const pw = 70 + width * 40, drop = rack + pw * Math.sin(leanDeg * Math.PI / 180), lean = drop - rack;
    $('[data-out=gw]', body).textContent = width + ' ft'; $('[data-out=y]', body).textContent = years;
    $('#gPull', body).textContent = fmt(k, 2) + '×';
    $('#gState', body).textContent = drop < 2 ? 'Square and swinging free' : drop < 9 ? 'Starting to drag' : 'Dragging on the ground';
    $('#gStateS', body).textContent = lean > 3 && brace !== 'none' && brace !== 'wrong' ? 'The gate is square, but the wood hinge post is leaning, so the whole gate drops.' : brace === 'wrong' ? 'The brace is pulling on nails instead of pushing.' : brace === 'none' ? 'Nothing stops the frame from racking.' : brace === 'steel' ? 'A welded frame cannot rack.' : 'The brace props the latch corner up.';
    const x0 = 210 - pw / 2 + 20, y0 = 60, h = 170, post = x0 - 22, sag = rack;
    const pts = [[x0, y0], [x0 + pw, y0 + sag], [x0 + pw, y0 + h + sag], [x0, y0 + h]];
    const P = p => p.join(',');
    const pickets = Array.from({ length: Math.round(pw / 18) }, (_, i) => { const t = (i + .5) / Math.round(pw / 18), x = x0 + pw * t, dy = sag * t; const T = y0 - 14 + dy, B = T + h + 14, e = 3; return `<path d="M${x - 7},${B} L${x - 7},${T + e} L${x - 7 + e},${T} L${x + 7 - e},${T} L${x + 7},${T + e} L${x + 7},${B} Z" fill="#c98a5b" stroke="#7a4f2f" stroke-width=".8"/>`; }).join('');
    const br = brace === 'right' ? [pts[3], pts[1]] : brace === 'wrong' ? [pts[0], pts[2]] : null;
    svg.innerHTML = `
      <rect x="0" y="${y0 + h + 6}" width="420" height="80" fill="#1b2c1e"/>
      ${gpost === 'steel' ? `<rect x="${post - 15}" y="${y0 - 30}" width="30" height="${h + 60}" fill="#b99a68" stroke="#5e4c30"/><rect x="${post - 6}" y="${y0 - 26}" width="12" height="${h + 56}" fill="#c8d2dc" opacity=".45"/>` : `<rect x="${post - 12}" y="${y0 - 30}" width="24" height="${h + 60}" fill="#8f6a46" transform="rotate(${leanDeg} ${post} ${y0 + h + 30})"/>`}
      <g transform="rotate(${leanDeg} ${post} ${y0 + h + 30})">
      ${pickets}
      <polyline points="${P(pts[0])} ${P(pts[1])}" stroke="#7a4f2f" stroke-width="10" fill="none"/>
      <polyline points="${P(pts[3])} ${P(pts[2])}" stroke="#7a4f2f" stroke-width="10" fill="none"/>
      ${brace === 'steel' ? `<polygon points="${pts.map(P).join(' ')}" fill="none" stroke="#c8d2dc" stroke-width="5"/>` : ''}
      ${br ? `<line x1="${br[0][0]}" y1="${br[0][1]}" x2="${br[1][0]}" y2="${br[1][1]}" stroke="${brace === 'right' ? '#3ecf8e' : '#ef5b5b'}" stroke-width="8" stroke-linecap="round"/>` : ''}
      <rect x="${post + 8}" y="${y0 + 8}" width="20" height="10" rx="2" fill="#20262c"/><rect x="${post + 8}" y="${y0 + h - 18}" width="20" height="10" rx="2" fill="#20262c"/></g>
      ${drop > 2 ? `<path d="M${x0 + pw + 14},${y0 + h} v${drop}" stroke="#ef5b5b" stroke-width="2"/><text x="${x0 + pw + 20}" y="${y0 + h + drop / 2 + 4}" class="svg-l red">SAG</text>` : ''}
      <text x="${x0 + pw / 2}" y="${y0 - 26}" text-anchor="middle" class="svg-n">${width} ft gate</text>`;
  };
  $('[name=gw]', body).oninput = e => { width = +e.target.value; update(); };
  $('[name=y]', body).oninput = e => { years = +e.target.value; update(); };
  bindSeg(body, (n, v) => { if (n === 'brace') brace = v; if (n === 'gpost') gpost = v; update(); });
  update();
}

// ═════════════════════════════════════════════════════════════════
// 0. OUR BUILD VS PREFAB — one section of each, aged year by year
// ═════════════════════════════════════════════════════════════════
// Every claim here is one the GFS brochure already makes (p. 5, 6, 14, 25):
// King Plus = 8 ft galvanized Sch. 40 steel post, 2⅜ in OD, driven 4 ft, a wood
// box around it, rails nailed across the box, and a flat 2×4 across the top (the King Plus way).
// Prefab = thin pickets stapled to a light frame on 4×4 wood posts, gaps between
// panels, can't follow a slope, tends to sag after a few years. The competitor's
// post is set the two ways p. 6 describes: in tamped dirt about 2 ft deep, or in
// concrete about 2.5 ft deep.
const GFS_PARTS = [
  { k: 'steel', n: 'Driven steel post', d: 'Galvanized Schedule 40 steel, 2⅜ in across, driven 4 ft into undisturbed clay. Below Toledo\'s frost line, with no concrete to heave and no wood underground to rot.' },
  { k: 'box', n: 'Wood box around every post', d: 'Steel in the ground, wood where you see it. The box gives the rails a full nailing surface and makes the post look like a wood post.' },
  { k: 'plus', n: 'A flat 2×4 across the top', d: 'A 2×4 laid flat on top of the boxes, behind the boards that rise above it. It ties the posts together and keeps the top line straight.' },
  { k: 'rails', n: 'Rails nailed across the box', d: '2×4 rails run across the face of each box instead of being toe-nailed between posts, with 3 in galvanized nails.' },
  { k: 'pickets', n: 'Pickets nailed one at a time', d: 'Cut and fit in your yard with 1¾ in galvanized coil nails. No staples.' },
  { k: 'grade', n: 'Follows the ground', d: 'Every section follows the grade from post to post, so there is no triangle of gap under the fence on a slope.' }
];
const PRE_PARTS = [
  { k: 'post', n: '4×4 wood post', d: 'Set about 2 ft deep in tamped dirt, or about 2.5 ft in concrete. Either way, wood sits underground where it rots.' },
  { k: 'staples', n: 'Thin pickets on a light frame', d: 'A factory panel: pickets about ½ in thick on 2×3 rails, stapled or nailed on.' },
  { k: 'gap', n: 'Seams at every post', d: 'Panels come in fixed widths, so two panels meet at every post.' },
  { k: 'slope', n: 'Can\'t follow a slope', d: 'A rectangle panel stays level, so on a slope it leaves gaps underneath or gets stepped.' },
  { k: 'sag', n: 'Sags after a few years', d: 'The light frame racks and sags between posts.' }
];
const GFS_PARTS_V = [
  { k: 'steel', n: 'Driven steel inside every post', d: 'A galvanized steel post is driven 4 ft into the clay. Steel adapters clamp onto it, and the vinyl post sleeves down over them. No concrete to lift in frost, and nothing gripping the vinyl at the ground.' },
  { k: 'wall', n: 'Homeland .150″ post walls', d: 'Thicker walls than the big-box brand (.135″), so the post flexes less in wind and holds up longer.' },
  { k: 'uv', n: 'ACCU-Shield UV protection', d: 'Made in the USA with UV protection built in, so it stays white instead of yellowing.' },
  { k: 'grade', n: 'Slopes with the ground', d: 'Rails pass through the posts, so each section follows the grade with no stair-step gaps.' }
];
const PRE_PARTS_V = [
  { k: 'footing', n: 'Post set in a concrete footing', d: 'The usual way: a vinyl post sunk in a concrete plug about 2.5 ft deep.' },
  { k: 'heave', n: 'Footings lift in frost', d: 'Water gets in, freezes, and pushes the footing a little further out of line each year. Posts lift by different amounts, so the panels rack.' },
  { k: 'crack', n: 'Cracks at the ground', d: 'Concrete grips the vinyl at the top of the footing, so that is where the post takes the strain. Thinner .135″ walls crack sooner.' },
  { k: 'yellow', n: 'Yellows in the sun', d: 'Cheaper vinyl yellows faster in the sun.' },
  { k: 'slope', n: 'Stepped on a slope', d: 'Level panels on sloped ground leave a gap underneath.' }
];
// Shared scenery for the side-by-side drawings: sky, tree line, soil with stones, grass, frost.
const BLADES = Array.from({ length: 96 }, (_, i) => [((i * 37) % 7) - 3, 5 + ((i * 53) % 7)]);
function scene(id, gy, fr, G, S) {
  const gpath = `M0,${gy(0)} L380,${gy(380)} L380,460 L0,460 Z`;
  return `<defs>
    <linearGradient id="${id}sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c2036"/><stop offset="1" stop-color="#21466b"/></linearGradient>
    <linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6b4f36"/><stop offset=".4" stop-color="#4f3a28"/><stop offset="1" stop-color="#2a1e15"/></linearGradient>
    <pattern id="${id}p" width="44" height="34" patternUnits="userSpaceOnUse"><ellipse cx="7" cy="9" rx="2.4" ry="1.6" fill="#a08c73" opacity=".55"/><ellipse cx="29" cy="5" rx="1.6" ry="1.2" fill="#2a1b10" opacity=".6"/><ellipse cx="20" cy="24" rx="3" ry="2" fill="#7d654b" opacity=".5"/><ellipse cx="38" cy="28" rx="1.4" ry="1" fill="#b39d80" opacity=".5"/><circle cx="12" cy="30" r="1" fill="#2a1b10" opacity=".5"/></pattern>
    <pattern id="${id}i" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 4h8" stroke="#bfe3ff" stroke-width="2" opacity=".55"/></pattern>
    <pattern id="${id}g" width="16" height="64" patternUnits="userSpaceOnUse"><path d="M4 0C6 16 2 32 5 64M11 0C9 22 13 40 10 64" stroke="rgba(90,55,25,.16)" stroke-width=".7" fill="none"/></pattern>
    <linearGradient id="${id}s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>
    <linearGradient id="${id}v" x1="0" x2="1"><stop offset="0" stop-color="#d9ddda"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd4d1"/></linearGradient>
    <linearGradient id="${id}st" x1="0" x2="1"><stop offset="0" stop-color="#9aa7b3"/><stop offset=".5" stop-color="#e8eef3"/><stop offset="1" stop-color="#8b98a4"/></linearGradient>
    <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#8d959b"/><stop offset=".5" stop-color="#b9c0c4"/><stop offset="1" stop-color="#848c92"/></linearGradient>
  </defs>
  <rect width="380" height="460" fill="url(#${id}sky)"/>
  <path d="M0,${G - 40} ${Array.from({ length: 20 }, (_, i) => `Q${i * 20 + 10},${G - 70 - ((i * 29) % 23)} ${i * 20 + 20},${G - 44 - ((i * 13) % 11)}`).join(' ')} L380,${G} L0,${G} Z" fill="#0a1a2a" opacity=".75"/>
  <path d="${gpath}" fill="url(#${id})"/><path d="${gpath}" fill="url(#${id}p)"/>
  ${fr.w > .05 ? `<path d="M0,${gy(0)} L380,${gy(380)} L380,${gy(380) + fr.depth} L0,${gy(0) + fr.depth} Z" fill="url(#${id}i)" opacity="${fr.w}"/><text x="370" y="${gy(380) + fr.depth - 6}" text-anchor="end" class="svg-l blue">FROST</text>` : ''}
  <line x1="0" x2="380" y1="${G + 3 * S}" y2="${G + 3 * S}" stroke="#8cc7ff" stroke-dasharray="5 6" opacity=".55"/><text x="80" y="${G + 3 * S - 5}" class="svg-l blue">FROST LINE ~3 FT</text>
  <path d="M0,${gy(0)} L380,${gy(380)}" stroke="#3f6b33" stroke-width="4"/>
  <path d="${BLADES.map(([dx, h], i) => { const x = i * 4 + 1; return `M${x},${gy(x) + 1}q${dx * .4},${-h * .6} ${dx},${-h}`; }).join('')}" stroke="#4f8a3c" stroke-width="1.3" fill="none"/>`;
}
function build(body) {
  const st = { years: 0, set: 'concrete', slope: false, focus: null, playing: false, mat: 'wood' };
  body.innerHTML = `
    <div class="build-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the two yards in 3D…</div></div>
    <div class="vs-grid">
      <figure class="vs-card pre"><figcaption><span class="vs-tag bad" id="vsPreT">Big-box prefab</span><b id="vsPreB">Panel on 4×4 wood posts</b><small id="vsPreC"></small></figcaption><svg class="vs-svg" id="vsPre" viewBox="0 64 380 396"></svg><p class="vs-status" id="vsPreS"></p></figure>
      <figure class="vs-card gfs"><figcaption><span class="vs-tag good" id="vsGfsT">GFS King Plus</span><b id="vsGfsB">Driven steel, built board by board</b><small>Steel driven 4 ft, no concrete</small></figcaption><svg class="vs-svg" id="vsGfs" viewBox="0 64 380 396"></svg><p class="vs-status" id="vsGfsS"></p></figure>
    </div>
    <div class="lab-ctl vs-ctl">
      <div class="vs-years"><button class="btn sm primary" id="vsPlay">Play 15 years</button>${slider('yr', 'Years', 0, 15, .05, 0)}</div>
    </div>
    <div class="lab-ctl">
      <div class="vs-opts">
        <div><div class="lab-label">Fence</div>${seg('mat', [['wood', 'Wood'], ['vinyl', 'Vinyl']], st.mat)}</div>
        <div id="vsSet"><div class="lab-label">Prefab posts</div>${seg('set', [['dirt', 'In dirt, ~2 ft'], ['concrete', 'In concrete, ~2½ ft']], st.set)}</div>
        <div><div class="lab-label">Yard</div>${seg('slope', [['0', 'Flat'], ['1', 'Sloped']], '0')}</div>
      </div>
      <p class="vis-note-inline" id="vsNote">Both drawn from the back, so you can see how each is built. Movement and rot are drawn bigger than life so you can see them. Winters show as frost in the ground.</p>
    </div>
    <div class="vs-parts">
      <div class="lab-card"><div class="lab-label">What makes ours different (tap one)</div><div class="vs-list" id="vsG"></div></div>
      <div class="lab-card"><div class="lab-label" id="vsPL">What you get with prefab (tap one)</div><div class="vs-list" id="vsP"></div></div>
    </div>
    ${math(`<p><b>Why the wood post fails first</b>: decay needs air and water together. On a buried wood post that band is right at the soil line, or where the wood meets the top of the concrete, and that is where it breaks. A steel post has no wood underground.</p>
      <p><b>Why posts lift</b>: wet clay freezes onto a post and lifts it as the ground heaves. A post that stops inside the frozen layer (about 3 ft in Toledo) rides up a little each winter. A post in concrete can lift the whole footing. A post driven 4 ft is held below the frost line by soil that never freezes.</p>
      <p><b>Why a prefab panel sags</b>: the panel hangs between two posts on a light stapled frame, so its weight keeps working at the staples and joints. Ours spreads the load across rails nailed to a wood box on a steel post, with a flat 2×4 across the top holding the line.</p>
      <p><b>Vinyl in concrete</b>: a vinyl post sunk in a concrete plug has the same frost problem as any footing, and the concrete holds the vinyl rigid right at the ground, which is where a pushed post cracks. GFS drives a galvanized steel post, clamps steel adapters to it, and sleeves the vinyl post over the adapters, so there is no footing to lift.</p>
      <p class="src">The specs and comparisons here are the ones printed in the GFS brochure (pages 5, 6, 14, 25 and 31). Rates of movement in the drawing are for illustration, not measurements.</p>`)}`;
  const pre = $('#vsPre', body), gfs = $('#vsGfs', body);
  const S = 34, G = 300; // px per ft, ground line
  const groundY = (x) => st.slope ? G - (x - 40) * 0.16 : G; // slope rises to the right
  function frostBand(season, y) {
    const w = clamp(Math.sin(Math.PI * clamp((season - .62) / .36, 0, 1)), 0, 1);
    return { w, depth: w * 3 * S };
  }
  let draw = function () {
    const y = st.years, yi = Math.floor(y), season = y - yi, fr = y < .01 ? { w: 0, depth: 0 } : frostBand(season, y);
    // competitor post movement
    const dirt = st.set === 'dirt';
    const heave = Math.min(18, (dirt ? 1.3 : .9) * yi + (dirt ? 4 : 3) * fr.w);
    const lean = Math.min(dirt ? .07 : .04, (dirt ? .006 : .003) * y);
    const rot = clamp((y - (dirt ? 3 : 5)) / 8, 0, 1);
    const sag = clamp((y - 3) / 10, 0, 1) * 16;
    const fade = clamp(y / 6, 0, 1);
    const hl = k => st.focus === k ? ' hl' : '';
    const soil = id => scene(id, groundY, fr, G, S);
    if (st.mat === 'vinyl') return drawVinyl(y, yi, fr, hl, fade);
    // ── prefab ──
    {
      const px = [56, 324], top = G - 6 * S, tilt = (x, yy, sgn) => [x + Math.sin(lean * sgn) * (G - yy), yy - heave];
      const postW = 13, depth = (dirt ? 2 : 2.5) * S;
      let s = soil('ps');
      for (const [i, x] of px.entries()) {
        const sgn = i ? -1 : 1, gy = groundY(x);
        if (!dirt) s += `<path d="M${x - 22},${gy - heave * .6} L${x + 22},${gy - heave * .6} L${x + 16},${gy + depth - heave * .6} L${x - 16},${gy + depth - heave * .6} Z" fill="#9aa3ab" opacity=".9"/>`;
        const [tx, ty] = tilt(x, top, sgn);
        s += `<g class="part${hl('post')}"><path d="M${x - postW / 2},${gy + depth - heave} L${x + postW / 2},${gy + depth - heave} L${tx + postW / 2},${ty} L${tx - postW / 2},${ty} Z" fill="#8f7a52"/>
          <rect x="${x - postW / 2 - 1}" y="${gy - 10 - heave}" width="${postW + 2}" height="22" fill="#2b1a0e" opacity="${rot * .9}"/></g>`;
        if (rot > .6) s += `<path d="M${x + 9},${gy - 4 - heave} l10 -8" stroke="#ef5b5b" stroke-width="2"/>`;
      }
      // panel: level rectangle between posts; sags in the middle, stays level on a slope
      const x0 = 62, x1 = 318, ptop = top + 4 - heave, pbot = Math.max(groundY(x0), groundY(x1)) - 4 - heave + (st.slope ? -2 : 0);
      const lvl = st.slope ? Math.min(groundY(x0), groundY(x1)) - 6 - heave : pbot;
      const sagAt = x => sag * Math.sin(Math.PI * (x - x0) / (x1 - x0));
      const rails = [ptop + 16, (ptop + lvl) / 2, lvl - 16];
      s += `<g class="part${hl('staples')}">`;
      for (const ry of rails) s += `<path d="M${x0},${ry} Q${(x0 + x1) / 2},${ry + sag * 2} ${x1},${ry}" stroke="#a48a5c" stroke-width="7" fill="none"/>`;
      const n = 15;
      for (let i = 0; i < n; i++) { const x = x0 + 3 + (x1 - x0 - 6) * i / (n - 1), dy = sagAt(x), cup = clamp((y - 2) / 10, 0, 1) * (i % 3 === 1 ? 4 : i % 4 === 0 ? -3 : 1);
        const xl = x - 8.5 + cup, xr = x + 8.5 + cup, yt = ptop + dy, yb = lvl, e = S / 12, d = `M${xl},${yb} L${xr},${yb} L${xr},${yt + e} L${xr - e},${yt} L${xl + e},${yt} L${xl},${yt + e} Z`;
        s += `<path d="${d}" fill="${mixHex('#d4bf8f', '#9a958c', fade)}" stroke="#6f5d3b" stroke-width=".6"/><path d="${d}" fill="url(#psg)"/><path d="${d}" fill="url(#pss)"/>`;
        for (const ry of [rails[0], rails[2]]) s += `<rect x="${x - 2}" y="${ry + dy - 1}" width="4" height="2" fill="#5a5a5a"/>`; }
      s += `</g>`;
      s += `<g class="part${hl('gap')}">${px.map(x => `<rect x="${x + 6}" y="${ptop}" width="3" height="${lvl - ptop}" fill="#0f2034"/>`).join('')}</g>`;
      if (st.slope) s += `<g class="part${hl('slope')}"><path d="M${x0},${lvl + sagAt(x0)} L${x1},${lvl} L${x1},${groundY(x1)} L${x0},${groundY(x0)} Z" fill="#ef5b5b" opacity=".25"/><text x="${(x0 + x1) / 2}" y="${(lvl + groundY(x0)) / 2 + 30}" text-anchor="middle" class="svg-l red">GAP UNDER THE PANEL</text></g>`;
      if (sag > 3) s += `<g class="part${hl('sag')}"><path d="M190,${ptop - 12} v${sag + 6}" stroke="#ef5b5b" stroke-width="2"/><text x="198" y="${ptop - 2}" class="svg-l red">SAG</text></g>`;
      $('#vsPreC', body).textContent = dirt ? 'Posts about 2 ft deep in dirt' : 'Posts about 2.5 ft deep in concrete';
      pre.innerHTML = s;
      $('#vsPreS', body).innerHTML = y < .5 ? 'Looks fine the day it goes in.' : [rot > .6 ? 'Posts rotting at the ' + (dirt ? 'soil line' : 'top of the concrete') : '', heave > 4 ? 'posts pushed up and leaning' : '', sag > 3 ? 'panel sagging' : '', st.slope ? 'gap under the panel' : '', fade > .5 ? 'stapled pickets cupping' : ''].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase()) || 'Starting to move.';
    }
    // ── GFS ──
    {
      const px = [56, 324], top = G - 6 * S, boxTop = top + 6 + 12;
      let s = soil('gs');
      const x0 = 43, x1 = 337, g0 = groundY(x0), g1 = groundY(x1), lineAt = (x, off) => (g0 + (g1 - g0) * (x - x0) / (x1 - x0)) - off;
      const railOffs = [6 * S - 30, 3.1 * S, .7 * S];
      // pickets, seen from the back, nailed one at a time and following the ground
      s += `<g class="part${hl('pickets')}${hl('grade')}">`;
      const pw = 5.5 / 12 * S, n = Math.round((x1 - x0) / pw), w = (x1 - x0) / n, ear = S / 12; // 5½ in dog-ear pickets, 1 in clips
      for (let i = 0; i < n; i++) { const xl = x0 + i * w, xr = xl + w, bl = lineAt(xl, 3), br = lineAt(xr, 3), tl = lineAt(xl, 6 * S - 4), tr = lineAt(xr, 6 * S - 4);
        const d = `M${xl},${bl} L${xr},${br} L${xr},${tr + ear} L${xr - ear},${tr} L${xl + ear},${tl} L${xl},${tl + ear} Z`;
        s += `<path d="${d}" fill="${mixHex('#d4bf8f', '#a8a39a', fade)}" stroke="#6f5d3b" stroke-width=".6"/><path d="${d}" fill="url(#gsg)"/><path d="${d}" fill="url(#gss)"/>`; }
      s += `</g>`;
      // steel post in the ground, wood box around it above ground
      for (const x of px) {
        const gy = groundY(x), bt = lineAt(x, 6 * S - 30) + 4;
        s += `<g class="part${hl('steel')}"><rect x="${x - 5}" y="${gy - 4}" width="10" height="${4 * S + 4}" rx="2" fill="#c8d2dc" stroke="#eef3f7" stroke-width=".8"/><text x="${x}" y="${gy + 4 * S + 16}" text-anchor="middle" class="svg-l">4 FT</text></g>
          <g class="part${hl('box')}"><rect x="${x - 14}" y="${bt}" width="28" height="${gy - bt}" fill="${mixHex('#b99a68', '#a29d93', fade * .7)}" stroke="#5e4c30" stroke-width="1.2"/><line x1="${x}" x2="${x}" y1="${bt + 3}" y2="${gy - 2}" stroke="#5e4c30" stroke-width=".8" opacity=".6"/></g>`;
      }
      // rails run across the face of the boxes, nailed with 3 in galvanized nails
      s += `<g class="part${hl('rails')}">${railOffs.map(o => `<line x1="${x0}" y1="${lineAt(x0, o)}" x2="${x1}" y2="${lineAt(x1, o)}" stroke="#a48a5c" stroke-width="10"/>${px.map(x => `<circle cx="${x - 6}" cy="${lineAt(x, o)}" r="1.8" fill="#d7dde3"/><circle cx="${x + 6}" cy="${lineAt(x, o)}" r="1.8" fill="#d7dde3"/>`).join('')}`).join('')}</g>`;
      // the flat 2x4 that lies across the tops of the boxes
      s += `<g class="part plus${hl('plus')}"><line x1="${x0 - 14}" y1="${lineAt(x0, 6 * S - 30) - 12}" x2="${x1 + 14}" y2="${lineAt(x1, 6 * S - 30) - 12}" stroke="#d9823f" stroke-width="7"/><text x="190" y="${lineAt(190, 6 * S) - 18}" text-anchor="middle" class="svg-plus">flat 2×4 on top</text></g>`;
      gfs.innerHTML = s;
      $('#vsGfsS', body).textContent = y < .5 ? 'Straight on day one.' : fade > .5 ? 'Still straight and tight. The wood has weathered to gray.' : 'Still straight and tight.';
    }
    $('[data-out=yr]', body).textContent = y < .05 ? 'Day one' : `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}${season > .62 && season < .98 && y > .5 ? ' · winter' : ''}`;
    for (const b of $$('.vs-item', body)) b.classList.toggle('on', b.dataset.k === st.focus);
  };
  let raf = 0, live = true;
  const play = () => {
    if (st.playing) { st.playing = false; $('#vsPlay', body).textContent = 'Play 15 years'; return; }
    if (st.years >= 14.9) st.years = 0;
    st.playing = true; $('#vsPlay', body).textContent = 'Pause';
    let last = performance.now();
    const step = now => { if (!st.playing || !live) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
      st.years = Math.min(15, st.years + dt * (reduced.matches ? 3 : 1.2)); $('[name=yr]', body).value = st.years; draw();
      if (st.years >= 15) { st.playing = false; $('#vsPlay', body).textContent = 'Play again'; return; } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  $('#vsPlay', body).onclick = play;
  $('[name=yr]', body).oninput = e => { st.playing = false; $('#vsPlay', body).textContent = 'Play 15 years'; st.years = +e.target.value; draw(); };
  bindSeg(body, (n, v) => { if (n === 'set') st.set = v; if (n === 'slope') st.slope = v === '1'; if (n === 'mat') { st.mat = v; lists(); } draw(); });
  lists();
  body.addEventListener('click', e => { const b = e.target.closest('.vs-item'); if (!b) return; st.focus = st.focus === b.dataset.k ? null : b.dataset.k; draw(); });
  function lists() {
    const v = st.mat === 'vinyl', G1 = v ? GFS_PARTS_V : GFS_PARTS, P1 = v ? PRE_PARTS_V : PRE_PARTS;
    $('#vsG', body).innerHTML = G1.map((p, i) => `<button class="vs-item" data-k="${p.k}"><i>${i + 1}</i><span><b>${esc(p.n)}</b><small>${esc(p.d)}</small></span></button>`).join('');
    $('#vsP', body).innerHTML = P1.map((p, i) => `<button class="vs-item bad" data-k="${p.k}"><i>${String.fromCharCode(65 + i)}</i><span><b>${esc(p.n)}</b><small>${esc(p.d)}</small></span></button>`).join('');
    $('#vsPL', body).textContent = v ? 'What you get with vinyl in concrete (tap one)' : 'What you get with prefab (tap one)';
    $('#vsPreT', body).textContent = v ? 'Typical vinyl install' : 'Big-box prefab'; $('#vsPreB', body).textContent = v ? 'Vinyl post in concrete' : 'Panel on 4×4 wood posts';
    $('#vsGfsT', body).textContent = v ? 'GFS vinyl' : 'GFS King Plus'; $('#vsGfsB', body).textContent = v ? 'Homeland over driven steel' : 'Driven steel, built board by board';
    $('#vsSet', body).hidden = v; st.focus = null;
  }
  // Vinyl: big-box vinyl set in concrete vs Homeland over a driven steel post.
  function drawVinyl(y, yi, fr, hl, fade) {
    const soil = id => scene(id, groundY, fr, G, S), top = G - 6 * S, px = [56, 324], depth = 2.5 * S;
    // competitor: each footing lifts a different amount every winter; posts tip; the panel racks
    const h1 = Math.min(16, 1.1 * yi + 3 * fr.w), h2 = Math.min(10, .55 * yi + 1.6 * fr.w), hv = [h1, h2];
    const lean = [Math.min(.05, .0045 * y), -Math.min(.03, .0025 * y)];
    const crack = clamp((y - 4) / 6, 0, 1), yellow = clamp(y / 10, 0, 1);
    let s = soil('pv');
    const pw = 17;
    const topOf = i => { const x = px[i], gy = groundY(x); return [x + Math.sin(lean[i]) * (gy - top), top - hv[i]]; };
    for (const [i, x] of px.entries()) {
      const gy = groundY(x), h = hv[i];
      s += `<g class="part${hl('footing')}${hl('heave')}"><path d="M${x - 20},${gy - h} L${x + 20},${gy - h} L${x + 25},${gy + depth - h} L${x - 25},${gy + depth - h} Z" fill="url(#pvc)" stroke="#6f777d"/></g>`;
      const [tx, ty] = topOf(i);
      s += `<g class="part${hl('crack')}"><path d="M${x - pw / 2},${gy + depth * .8 - h} L${x + pw / 2},${gy + depth * .8 - h} L${tx + pw / 2},${ty} L${tx - pw / 2},${ty} Z" fill="${mixHex('#ffffff', '#efe3bd', yellow)}" stroke="#aab3b0"/>
        <rect x="${tx - pw / 2 - 2}" y="${ty - 6}" width="${pw + 4}" height="7" rx="2" fill="${mixHex('#f7f7f5', '#ece0b8', yellow)}" stroke="#aab3b0"/>
        ${crack > .05 ? `<path d="M${x - pw / 2 + 2},${gy - h - 2} l4,-6 l-3,-5 l5,-7 l-2,-6" stroke="#ef5b5b" stroke-width="${1 + crack}" fill="none" opacity="${crack}"/>` : ''}</g>`;
    }
    // panel hangs between the two posts at their (different) heights
    const [ta, tb] = [topOf(0), topOf(1)], xa = ta[0] + pw / 2, xb = tb[0] - pw / 2;
    const ya = ta[1] + 10, yb = tb[1] + 10, panelH = 6 * S - 26;
    const lvlA = ya + panelH, lvlB = yb + panelH;
    s += `<g class="part${hl('yellow')}"><path d="M${xa},${ya} L${xb},${yb} L${xb},${lvlB} L${xa},${lvlA} Z" fill="${mixHex('#fbfbf9', '#efe3bd', yellow)}"/>`;
    for (let k = 1; k < 14; k++) { const t = k / 14, x = xa + (xb - xa) * t; s += `<line x1="${x}" y1="${ya + (yb - ya) * t + 14}" x2="${x}" y2="${lvlA + (lvlB - lvlA) * t - 12}" stroke="rgba(150,140,110,.45)" stroke-width=".8"/>`; }
    for (const off of [0, panelH - 12]) s += `<path d="M${xa},${ya + off} L${xb},${yb + off} L${xb},${yb + off + 12} L${xa},${ya + off + 12} Z" fill="${mixHex('#f2f3f1', '#e6d9b2', yellow)}" stroke="rgba(150,150,140,.6)"/>`;
    s += `</g>`;
    if (st.slope) s += `<g class="part${hl('slope')}"><path d="M${xa},${lvlA} L${xb},${lvlB} L${xb},${groundY(xb)} L${xa},${groundY(xa)} Z" fill="#ef5b5b" opacity=".25"/><text x="190" y="${(lvlA + groundY(xa)) / 2 + 24}" text-anchor="middle" class="svg-l red">GAP UNDER THE PANEL</text></g>`;
    else if (y > .5) { const ga = groundY(xa) - lvlA, gb = groundY(xb) - lvlB; if (Math.max(ga, gb) > 3) s += `<path d="M${xa},${lvlA} L${xb},${lvlB} L${xb},${groundY(xb)} L${xa},${groundY(xa)} Z" fill="#ef5b5b" opacity=".22"/>`; }
    pre.innerHTML = s;
    $('#vsPreC', body).textContent = 'Big-box vinyl, posts about 2.5 ft in concrete';
    $('#vsPreS', body).textContent = y < .5 ? 'Looks fine the day it goes in.' : [h1 > 4 ? 'Footings lifting by different amounts, panel racking' : '', crack > .4 ? 'post cracking at the concrete' : '', yellow > .5 ? 'vinyl yellowing' : '', st.slope ? 'gap under the panel' : ''].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase()) || 'Starting to move.';
    // GFS: Homeland vinyl over a driven steel post, following the ground
    let g2 = soil('gv');
    const x0 = 56 + pw / 2, x1 = 324 - pw / 2, b0 = groundY(x0) - 6, b1 = groundY(x1) - 6, tt0 = b0 - (6 * S - 26), tt1 = b1 - (6 * S - 26);
    g2 += `<g class="part${hl('grade')}${hl('uv')}"><path d="M${x0},${tt0} L${x1},${tt1} L${x1},${b1} L${x0},${b0} Z" fill="#fdfdfb"/>`;
    for (let k = 1; k < 14; k++) { const t = k / 14, x = x0 + (x1 - x0) * t; g2 += `<line x1="${x}" y1="${tt0 + (tt1 - tt0) * t + 14}" x2="${x}" y2="${b0 + (b1 - b0) * t - 12}" stroke="rgba(140,150,160,.45)" stroke-width=".8"/>`; }
    for (const off of [0, 6 * S - 38]) g2 += `<path d="M${x0},${tt0 + off} L${x1},${tt1 + off} L${x1},${tt1 + off + 12} L${x0},${tt0 + off + 12} Z" fill="#f2f3f1" stroke="rgba(140,150,160,.6)"/>`;
    g2 += `</g>`;
    for (const x of px) {
      const gy = groundY(x), ptop = gy - 6 * S - 4;
      g2 += `<g class="part${hl('steel')}"><rect x="${x - 5}" y="${ptop + 20}" width="10" height="${gy - ptop - 20 + 4 * S}" rx="2" fill="url(#gvst)" stroke="#eef3f7" stroke-width=".6"/><text x="${x}" y="${gy + 4 * S + 16}" text-anchor="middle" class="svg-l">4 FT</text></g>
        <g class="part${hl('wall')}"><rect x="${x - pw / 2}" y="${ptop}" width="${pw}" height="${gy - ptop}" fill="url(#gvv)" stroke="#aab3b0" opacity=".9"/>
        <rect x="${x - pw / 2 + 2}" y="${gy - 2.2 * S}" width="${pw - 4}" height="${1.6 * S}" rx="2" fill="#0f2034" opacity=".55"/><rect x="${x - 5}" y="${gy - 2.2 * S}" width="10" height="${1.6 * S}" fill="url(#gvst)"/><rect x="${x - 7.5}" y="${gy - 2.2 * S + 6}" width="15" height="7" rx="1.5" fill="#5d6a76"/><rect x="${x - 7.5}" y="${gy - .6 * S - 13}" width="15" height="7" rx="1.5" fill="#5d6a76"/>
        <rect x="${x - pw / 2 - 2}" y="${ptop - 6}" width="${pw + 4}" height="7" rx="2" fill="#f7f7f5" stroke="#aab3b0"/></g>`;
    }
    g2 += `<text x="190" y="${G - 6 * S - 22}" text-anchor="middle" class="svg-l">CUTAWAY: STEEL POST AND ADAPTERS INSIDE</text>`;
    gfs.innerHTML = g2;
    $('#vsGfsS', body).textContent = y < .5 ? 'Straight on day one.' : 'Still straight, square and white.';
    $('[data-out=yr]', body).textContent = y < .05 ? 'Day one' : `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}${(y - yi) > .62 && (y - yi) < .98 && y > .5 ? ' · winter' : ''}`;
    for (const b of $$('.vs-item', body)) b.classList.toggle('on', b.dataset.k === st.focus);
  }
  // The yards in 3D, with the Executive App's own models; the drawings stay for devices without 3D.
  let yard3d = null;
  const draw2 = draw;
  draw = () => {
    if (!yard3d) return draw2();
    yard3d.set({ y: st.years, mat: st.mat, set: st.set, slope: st.slope }); yard3d.focus(st.focus);
    const y = st.years, season = y - Math.floor(y);
    $('[data-out=yr]', body).textContent = y < .05 ? 'Day one' : `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}${season > .62 && season < .98 && y > .5 ? ' · winter' : ''}`;
    for (const b of $$('.vs-item', body)) b.classList.toggle('on', b.dataset.k === st.focus);
  };
  if (webglOK()) {
    const host = $('.build-3d', body); host.hidden = false; $('.vs-grid', body).hidden = true;
    $('#vsNote', body).textContent = 'Both seen from the rail side, with the ground cut open at the posts. How far store posts move varies from yard to yard; this is a typical case, drawn at true size. Winters show as frost in the ground and snow on the lawn.';
    import('./build3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); yard3d = m.createBuildScene(host, { specs: app.live?.specs }); draw(); })
      .catch(() => { if (!live) return; host.hidden = true; $('.vs-grid', body).hidden = false; yard3d = null; draw(); });
  }
  draw();
  return () => { live = false; st.playing = false; cancelAnimationFrame(raf); yard3d?.dispose(); yard3d = null; };
}
function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t, 0, 1)).toString(16).padStart(2, '0')).join('');
}

// ═════════════════════════════════════════════════════════════════
// 6. VINYL WALLS — section properties of a 5×5 post, .150 vs .135 wall
// ═════════════════════════════════════════════════════════════════
// Wall thicknesses are the ones printed in the brochure (p. 31, 36). The big-box
// post is drawn at the same 5 in size so only the wall changes. Square hollow
// section: A = b² − (b − 2t)², I = (b⁴ − (b − 2t)⁴) / 12. Same wind and same
// material means bending (deflection) goes as 1/I.
export function tube(b, t) { const i = b - 2 * t; return { A: b * b - i * i, I: (b ** 4 - i ** 4) / 12 }; }
// Runs an animation only while its picture is on screen (saves the iPad's battery when you scroll down to read).
function onScreen(el, resume) {
  const s = { on: true }; const io = new IntersectionObserver(([e]) => { const was = s.on; s.on = e.isIntersecting; if (s.on && !was) resume(); }); io.observe(el);
  s.stop = () => io.disconnect(); return s;
}
function vinyl(body) {
  const B = 5, HOME = .150, BIG = .135;
  let V = 58, wob = 0, raf = 0, live = true;
  const h = tube(B, HOME), g = tube(B, BIG), stiff = h.I / g.I, more = h.A / g.A;
  body.innerHTML = `
    <div class="lab-grid">
      <div class="lab-vis"><svg class="vinyl-svg" viewBox="0 0 420 330" aria-label="Two vinyl posts bending in the wind"></svg>
        <div class="vis-note">Walls drawn thicker so you can see the difference. Bend drawn bigger than life.</div></div>
      <div class="lab-ctl">
        ${slider('V', 'Gust speed', 20, 115, 1, V, ' mph')}
        <div class="readouts">
          <div><b class="mono">${fmt((stiff - 1) * 100, 0)}%</b><small>stiffer post, from a wall just .015 in thicker</small></div>
          <div><b class="mono">${fmt((1 - 1 / stiff) * 100, 0)}%</b><small>less bend in the same wind</small></div>
          <div><b class="mono">${fmt((more - 1) * 100, 0)}%</b><small>more vinyl in every foot of post</small></div>
          <div><b class="mono" id="vLoad"></b><small>lb of wind on each 6 ft × 8 ft section right now</small></div>
        </div>
        <p class="lab-note">The wall is the part you can't see in the store, and it's where cheaper vinyl saves money. Homeland prints it on the spec sheet: 5″ × 5″ posts at .150″. Every Homeland gate also has aluminum inside the frame.</p>
      </div>
    </div>
    ${math(`<p><b>Section properties of a square tube</b> (outside size b, wall t): area A = b² − (b − 2t)², moment of inertia I = [b⁴ − (b − 2t)⁴] / 12.</p>
      <p>Homeland 5″ at .150″: A = ${fmt(h.A, 3)} in², I = ${fmt(h.I, 2)} in⁴. Big-box wall .135″ at the same 5″: A = ${fmt(g.A, 3)} in², I = ${fmt(g.I, 2)} in⁴.</p>
      <p><b>Bending</b>: for the same load, length and material, a post bends in proportion to 1/I, so the thicker wall bends ${fmt((1 - 1 / stiff) * 100, 1)}% less. Bending stress drops by about the same share, which is what keeps a post from cracking at the ground.</p>
      <p><b>Wind on the section</b> uses the ASCE 7 numbers from the Wind tool (solid 6 ft fence, houses and trees around).</p>
      <p class="src">Wall thicknesses from the GFS brochure, p. 31 (big-box .135″ vs Homeland .150″) and p. 36 (Homeland 5″ × 5″ at .150″). The big-box post is drawn at the same 5″ size so only the wall changes.</p>`)}`;
  const svg = $('.vinyl-svg', body);
  const draw = () => {
    const load = windLoad({ V, h: 6, exposure: 'B', style: WSTYLES[0] });
    $('[data-out=V]', body).textContent = V + ' mph'; $('#vLoad', body).textContent = fmt(load.perPost, 0);
    const base = clamp(load.perPost / 900, 0, 1) * 34 * (1 + .12 * Math.sin(wob));
    const post = (x, bend, t, label, good) => {
      const top = 70, gy = 250, tipX = x + bend;
      const sec = (cx, cy) => { const s = 5 * 8, w = t * 8 * 6; return `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${good ? '#f4f6f8' : '#e6e8ea'}"/><rect x="${cx - s / 2 + w}" y="${cy - s / 2 + w}" width="${s - 2 * w}" height="${s - 2 * w}" fill="#0f2034"/>`; };
      return `<path d="M${x - 11},${gy} Q${x - 11},${(gy + top) / 2} ${tipX - 11},${top} L${tipX + 11},${top} Q${x + 11},${(gy + top) / 2} ${x + 11},${gy} Z" fill="${good ? '#f4f6f8' : '#e6e8ea'}" stroke="#9aa8b6"/>
        <rect x="${tipX - 13}" y="${top - 8}" width="26" height="8" rx="2" fill="${good ? '#f4f6f8' : '#e6e8ea'}" stroke="#9aa8b6"/>
        ${bend > 1 ? `<path d="M${x},${top - 18} h${bend}" stroke="${good ? '#3ecf8e' : '#ef5b5b'}" stroke-width="2"/><path d="M${x + bend},${top - 22} v8" stroke="${good ? '#3ecf8e' : '#ef5b5b'}" stroke-width="2"/>` : ''}
        ${sec(x, gy + 40)}
        <text x="${x}" y="${gy + 78}" text-anchor="middle" class="svg-n">${label}</text>
        <text x="${x}" y="${gy + 94}" text-anchor="middle" class="svg-l">${t.toFixed(3).replace(/^0/, '')}″ WALL</text>`;
    };
    svg.innerHTML = `<rect width="420" height="250" fill="#0f2034"/><rect y="250" width="420" height="80" fill="#1b2c1e"/>
      ${post(120, base * stiff, BIG, 'Big-box vinyl', false)}${post(300, base, HOME, 'Homeland', true)}
      <text x="210" y="34" text-anchor="middle" class="svg-big">${V} mph →</text>`;
  };
  const tick = () => { wob += .08; draw(); if (live && vis.on && !reduced.matches) raf = requestAnimationFrame(tick); };
  const vis = onScreen($('.vinyl-svg', body), () => { if (live && !reduced.matches) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } });
  $('[name=V]', body).oninput = e => { V = +e.target.value; if (reduced.matches) draw(); };
  tick();
  return () => { live = false; cancelAnimationFrame(raf); vis.stop(); };
}

// Grade Lab lives in its own file; it loads the first time it's opened.
function gradeTool(body) {
  let stopFn = null, gone = false;
  body.innerHTML = '<div class="lab-vis" style="min-height:320px;display:grid;place-items:center;color:var(--dim)">Loading Grade Lab…</div>';
  import('./gradelab.mjs').then(m => { if (gone || current !== 'grade') return; body.innerHTML = ''; stopFn = m.grade(body, { seg, bindSeg, math, fmt }); });
  return () => { gone = true; stopFn?.(); };
}

// ── No-dig vs dug ────────────────────────────────────────────────
// The numbers behind "no leftover dirt": what comes out of a dug post hole and what goes back in.
function dig(body) {
  const st = { len: preset.len ? clamp(Math.round(preset.len / 10) * 10, 40, 2000) : 150, p: 0, playing: false };
  body.innerHTML = `
    <div class="dig-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the two yards in 3D…</div></div>
    <div class="vs-grid">
      <figure class="vs-card pre"><figcaption><span class="vs-tag bad">Dug &amp; concrete</span><b>Holes dug, posts set in concrete</b><small>How most fences go in</small></figcaption>
        <svg class="vs-svg dig-a" viewBox="0 36 380 214" role="img" aria-label="A crew digging post holes and setting posts in concrete"></svg><p class="vs-status" id="dgA"></p></figure>
      <figure class="vs-card gfs"><figcaption><span class="vs-tag good">GFS no-dig</span><b>Steel posts driven 4 ft</b><small>No holes, no concrete</small></figcaption>
        <svg class="vs-svg dig-b" viewBox="0 36 380 214" role="img" aria-label="Steel posts driven into the ground with no digging"></svg><p class="vs-status" id="dgB"></p></figure>
    </div>
    <div class="lab-ctl vs-ctl">
      <div class="vs-years"><button class="btn primary" id="dgPlay">Play install day</button>${slider('p', 'Install day', 0, 100, 1, 0, '%')}</div>
      ${slider('len', 'Your fence', 40, Math.max(400, st.len), 10, st.len, ' ft')}
    </div>
    <div class="lab-card dig-sum">
      <div class="lab-label">A <span id="dgLen"></span> fence, side by side</div>
      <div class="dig-t" role="table">
        <div class="dig-h" role="row"><span></span><span class="bad">Dug &amp; concrete</span><span class="good">GFS no-dig</span></div>
        <div role="row"><span>Dirt left in the yard</span><b id="dgDirt"></b><b class="g">None</b></div>
        <div role="row"><span>Concrete hauled in</span><b id="dgConc"></b><b class="g">None</b></div>
        <div role="row"><span>Holes dug in the lawn</span><b id="dgHoles"></b><b class="g">0</b></div>
        <div role="row"><span>Before the fence goes on the posts</span><b>Wait about 2 days for concrete</b><b class="g">No wait</b></div>
        <div role="row"><span>In winter</span><b>Frozen ground to dig, concrete to keep from freezing</b><b class="g">We drive posts all winter</b></div>
      </div>
    </div>
    <div class="lab-card">
      <div class="lab-label">All of that dirt in one pile</div>
      <svg class="dig-pile" viewBox="0 0 380 170" role="img" aria-label="The dirt from every post hole in one pile, next to a 6 foot person"></svg>
      <p class="lab-note" id="dgPileT"></p>
      <div class="dig-barrows" id="dgBar" aria-hidden="true"></div>
      <p class="lab-note">It's mostly clay from under the topsoil, so it either gets spread on the lawn or hauled away. With driven posts there's nothing to spread and nothing to haul.</p>
    </div>
    ${math(`<p><b>One dug hole</b>: 10 in across and 36 in deep, the size we dig ourselves when a yard's soil calls for concrete. Volume = π × (5 in)² × 36 in = <span class="mono" id="mH"></span> cu ft of dirt in the ground.</p>
      <p><b>Dirt once it's dug</b>: loose clay takes up about 30% more room than it did in the ground (typical swell for clay is 30 to 40%). Moist clay weighs about 110 lb per cu ft in the ground. A contractor wheelbarrow holds 6 cu ft.</p>
      <p><b>Concrete</b>: the hole less the 32 in of 4×4 post standing in it, filled with concrete mix. An 80 lb bag makes about 0.6 cu ft (manufacturer yield for 80 lb bags), so about 2 to 3 bags a post.</p>
      <p><b>Posts</b>: one every 8 ft plus one at the end. Gate posts would add more.</p>
      <p><b>The wait</b>: concrete keeps gaining strength for days, so installers usually let it set a day or two before hanging the fence. Our own checklist waits 48 hours on any post we set in concrete.</p>
      <p class="src">We drive steel in clay, which is most of the Toledo area. In sandy soil we set pressure-treated posts in concrete instead, and we check the soil before we quote.</p>`)}`;
  const A = $('.dig-a', body), B = $('.dig-b', body), pile = $('.dig-pile', body);
  const G = 168, S = 12, PX = [46, 142, 238, 334];
  const cl = (v, a = 0, b = 1) => clamp(v, a, b);
  const sky = id => `<defs><linearGradient id="${id}k" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0c2036"/><stop offset="1" stop-color="#22486e"/></linearGradient>
      <linearGradient id="${id}s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6b4f36"/><stop offset="1" stop-color="#2f2218"/></linearGradient>
      <linearGradient id="${id}t" x1="0" x2="1"><stop offset="0" stop-color="#8b98a4"/><stop offset=".5" stop-color="#eef3f7"/><stop offset="1" stop-color="#7d8a96"/></linearGradient></defs>
    <rect width="380" height="${G}" fill="url(#${id}k)"/>
    <path d="M0,${G - 34} ${Array.from({ length: 19 }, (_, i) => `Q${i * 20 + 10},${G - 60 - ((i * 29) % 21)} ${i * 20 + 20},${G - 38 - ((i * 13) % 11)}`).join(' ')} L380,${G} L0,${G} Z" fill="#0a1a2a" opacity=".8"/>
    <rect y="${G}" width="380" height="${250 - G}" fill="url(#${id}s)"/>
    <path d="M0,${G} H380" stroke="#3f6b33" stroke-width="4"/>
    <path d="${Array.from({ length: 95 }, (_, i) => { const x = i * 4 + 1, h = 3 + ((i * 7) % 5); return `M${x},${G - 1}q${((i * 3) % 5) - 2},${-h * .6} ${((i * 5) % 7) - 3},${-h}`; }).join('')}" stroke="#4f8a3c" stroke-width="1.2" fill="none"/>`;
  const ear = (x, top, bot, w) => `M${x},${bot} L${x},${top + 2.5} L${x + 2.5},${top} L${x + w - 2.5},${top} L${x + w},${top + 2.5} L${x + w},${bot} Z`;
  const pickets = (o, x0, x1) => { let s = ''; for (let x = x0; x < x1 - 1; x += 6) s += `<path d="${ear(x, G - 72, G - 3, 5.6)}" fill="#c98a5b" stroke="#7a4f2f" stroke-width=".5" opacity="${o}"/>`; return s; };
  const mound = (x, f) => { if (f <= 0) return ''; const w = 26 * Math.sqrt(f), h = 11 * Math.sqrt(f); return `<path d="M${x},${G + 1} Q${x + w * .2},${G - h * 1.05} ${x + w * .5},${G - h} Q${x + w * .8},${G - h * .95} ${x + w},${G + 1} Z" fill="#6a4a2e" stroke="#3d2a19" stroke-width=".8"/><circle cx="${x + w * .35}" cy="${G - h * .55}" r="1.6" fill="#8a6440"/><circle cx="${x + w * .62}" cy="${G - h * .7}" r="1.3" fill="#4a3220"/>`; };
  const clock = (x, y, txt, o) => `<g opacity="${o}"><rect x="${x - 112}" y="${y - 17}" width="224" height="32" rx="16" fill="rgba(10,20,34,.9)" stroke="rgba(140,199,255,.45)"/><circle cx="${x - 94}" cy="${y - 1}" r="8" fill="none" stroke="#8cc7ff" stroke-width="1.6"/><path d="M${x - 94},${y - 6} v5 l4,3" stroke="#8cc7ff" stroke-width="1.6" fill="none"/><text x="${x - 80}" y="${y + 4}" class="svg-l" style="font-size:12px">${txt}</text></g>`;
  const drawA = p => {
    let s = sky('da'), bags = 0, dirtShown = 0;
    // bags of concrete delivered, used as each post is set
    const perPost = Math.ceil((Math.PI * (5 / 12) ** 2 * 3 - (3.5 / 12) ** 2 * 3) / .6 * 10) / 10;
    let used = 0;
    PX.forEach((x, i) => {
      const t0 = .02 + i * .1, dg = cl((p - t0) / .08), pour = cl((p - (.46 + i * .035)) / .03);
      used += perPost * pour;
      if (dg > 0) {
        const depth = 3 * S * dg;
        s += `<rect x="${x - 5}" y="${G}" width="10" height="${depth}" fill="${pour > 0 ? '#9aa3ab' : '#1b130c'}"/>`;
        if (pour > 0 && pour < 1) s += `<rect x="${x - 5}" y="${G}" width="10" height="${depth * (1 - pour)}" fill="#1b130c"/>`;
        s += mound(x + 8, dg); dirtShown += dg;
        if (dg < 1) s += `<g><rect x="${x - 2}" y="${G - 70}" width="4" height="${70 + depth}" fill="#5c6670"/><path d="M${x - 6},${G + depth - 4} l12,-6 m-12,0 l12,-6 m-12,0 l12,-6" stroke="#9aa3ab" stroke-width="2"/><rect x="${x - 10}" y="${G - 84}" width="20" height="14" rx="3" fill="#d6823f"/></g>`;
      }
      if (pour > 0) s += `<rect x="${x - 2.5}" y="${G - 72}" width="5" height="${72 + 3 * S - 1}" fill="#a68b60" stroke="#6e5638" stroke-width=".5"/>`;
    });
    const total = Math.ceil(perPost * 4); bags = Math.max(0, Math.round(total - used));
    for (let b = 0; b < bags; b++) { const bx = 6 + (b % 3) * 11, by = G - 7 - Math.floor(b / 3) * 7; s += `<rect x="${bx}" y="${by}" width="10" height="7" rx="1.5" fill="#cfc7b6" stroke="#8d8576" stroke-width=".6"/>`; }
    const fenceOn = cl((p - .82) / .12);
    if (fenceOn > 0) {
      for (const y of [G - 12, G - 38, G - 64]) s += `<rect x="${PX[0]}" y="${y}" width="${PX[3] - PX[0]}" height="4" fill="#b98757" opacity="${fenceOn}"/>`;
      s += pickets(fenceOn, PX[0] - 3, PX[3] + 3);
      PX.forEach((x, i) => { s += mound(x + 8, 1); });
    }
    const cure = cl((p - .6) / .04) * (1 - cl((p - .8) / .03));
    if (cure > 0) s += clock(190, 60, 'Concrete curing · about 2 days', cure);
    if (p >= .99) s += `<text x="190" y="${G + 72}" text-anchor="middle" class="svg-l halo" fill="#ffd2b0">DIRT PILES LEFT ON THE LAWN</text>`;
    A.innerHTML = s;
    const holes = PX.filter((x, i) => p > .02 + i * .1).length;
    $('#dgA', body).textContent = p <= 0 ? 'A clean yard, before anyone digs.' : p < .45 ? `Digging hole ${Math.min(4, holes)} of 4. Every hole leaves a pile of clay on the lawn.` : p < .6 ? 'Mixing and pouring concrete around each post.' : p < .82 ? 'Waiting on the concrete before the fence can go on.' : 'Fence up, plus 4 dirt piles to spread or haul away.';
  };
  const drawB = p => {
    let s = sky('db');
    PX.forEach((x, i) => {
      const t0 = .02 + i * .07, dv = cl((p - t0) / .06);
      if (p < t0) return;
      const sink = 4 * S * dv, topY = G - 4 * S - (4 * S - sink), shake = dv > 0 && dv < 1 ? ((Math.floor(p * 900) % 2) ? 1 : -1) : 0;
      s += `<rect x="${x - 2 + shake}" y="${topY}" width="4" height="${8 * S}" rx="1" fill="url(#dbt)"/>`;
      if (dv < 1) s += `<rect x="${x - 8 + shake}" y="${topY - 22}" width="16" height="22" rx="3" fill="#2a3644" stroke="#8cc7ff" stroke-width=".8"/><rect x="${x - 3 + shake}" y="${topY - 30}" width="6" height="9" fill="#d6823f"/>`;
    });
    const box = cl((p - .32) / .1), fence = cl((p - .44) / .14);
    if (box > 0) PX.forEach(x => { s += `<rect x="${x - 3.5}" y="${G - 69.5}" width="7" height="67" fill="#b98757" stroke="#7a4f2f" stroke-width=".6" opacity="${box}"/>`; });
    if (fence > 0) {
      for (const y of [G - 14, G - 40]) s += `<rect x="${PX[0]}" y="${y}" width="${PX[3] - PX[0]}" height="4" fill="#b98757" opacity="${fence}"/>`;
      s += `<rect x="${PX[0] - 4}" y="${G - 73}" width="${PX[3] - PX[0] + 8}" height="3" fill="#a8774b" opacity="${fence}"/>`;
      s += pickets(fence, PX[0] - 3, PX[3] + 3);
    }
    if (p >= .6) s += clock(190, 60, 'No concrete to wait on', cl((p - .6) / .05));
    if (p >= .99 || p === 0) s += `<text x="190" y="${G + 72}" text-anchor="middle" class="svg-l halo" fill="#b5f3d4">${p === 0 ? 'SAME YARD' : 'NO DIRT. NO CONCRETE. LAWN LEFT AS IT WAS.'}</text>`;
    B.innerHTML = s;
    $('#dgB', body).textContent = p <= 0 ? 'The same yard.' : p < .32 ? 'Driving each steel post 4 ft into the clay. Nothing comes out of the ground.' : p < .6 ? 'Building the fence on the posts right away.' : 'Done, with nothing to clean up but scraps.';
  };
  const drawPile = n => {
    const ft = 18, Gp = 150, R = Math.cbrt(n.looseFt3 / .733), H = R * .7; // loose clay at about 35°
    const cx = 150 + R * ft, w = R * ft, h = H * ft;
    pile.innerHTML = `<rect width="380" height="170" fill="#0f2034"/><path d="M0,${Gp} H380" stroke="#3f6b33" stroke-width="4"/>
      <g fill="#9fb4c8"><circle cx="64" cy="${Gp - 6 * ft + 9}" r="8"/><path d="M56,${Gp - 6 * ft + 20} h16 l3,46 h-5 l-2,-30 l-1,30 h-6 l-1,-30 l-2,30 h-5 z"/><rect x="58" y="${Gp - 6 * ft + 64}" width="5" height="${6 * ft - 64}"/><rect x="65" y="${Gp - 6 * ft + 64}" width="5" height="${6 * ft - 64}"/></g>
      <path d="M40,${Gp - 6 * ft} h48 M44,${Gp} V${Gp - 6 * ft}" stroke="rgba(140,199,255,.5)" stroke-dasharray="3 3"/><text x="30" y="${Gp - 6 * ft / 2}" class="svg-l blue" text-anchor="middle" transform="rotate(-90 30 ${Gp - 6 * ft / 2})">6 FT</text>
      <path d="M${cx - w},${Gp + 1} C${cx - w * .55},${Gp - h * .75} ${cx - w * .2},${Gp - h} ${cx},${Gp - h} C${cx + w * .2},${Gp - h} ${cx + w * .55},${Gp - h * .75} ${cx + w},${Gp + 1} Z" fill="#6a4a2e" stroke="#3d2a19"/>
      ${Array.from({ length: 26 }, (_, i) => { const a = (i * 37) % 100 / 100, b = (i * 61) % 100 / 100, x = cx - w * .8 + a * w * 1.6, yTop = Gp - h * (1 - Math.abs(x - cx) / w) ** 1.1; return `<circle cx="${x}" cy="${Gp - (Gp - yTop) * b * .9}" r="${1.2 + (i % 3) * .6}" fill="${i % 2 ? '#8a6440' : '#4a3220'}"/>`; }).join('')}
      <text x="${cx}" y="${Gp + 16}" text-anchor="middle" class="svg-l">${fmt(R * 2, 1)} FT ACROSS · ${fmt(H, 1)} FT TALL</text>`;
  };
  const update = () => {
    const n = digNumbers(st.len);
    $('[data-out=len]', body).textContent = st.len + ' ft'; $('#dgLen', body).textContent = st.len + ' ft';
    $('#dgDirt', body).textContent = `${fmt(n.looseYd3, 1)} cu yd · about ${fmt(Math.ceil(n.barrows))} wheelbarrow loads · ${fmt(Math.round(n.lb / 100) * 100)} lb`;
    $('#dgConc', body).textContent = `${n.bags} bags · ${fmt(n.concLb)} lb`;
    $('#dgHoles', body).textContent = n.posts;
    $('#dgPileT', body).textContent = `${n.posts} holes for a ${st.len} ft fence. About ${fmt(n.lb / 2000, 1)} tons of clay, ${fmt(Math.ceil(n.barrows))} wheelbarrow loads.`;
    $('#dgBar', body).innerHTML = Array.from({ length: Math.min(40, Math.ceil(n.barrows)) }, () => `<svg viewBox="0 0 32 20"><path d="M3,6 h20 l-3,7 h-14 z" fill="#5d6b78"/><path d="M5,6 q9,-7 18,0 z" fill="#6a4a2e"/><circle cx="22" cy="16" r="3" fill="none" stroke="#9fb4c8" stroke-width="1.6"/><path d="M20,13 l2,3 M3,6 l-2,-3" stroke="#9fb4c8" stroke-width="1.6"/></svg>`).join('') + (n.barrows > 40 ? `<span class="mono">+${Math.ceil(n.barrows) - 40}</span>` : '');
    $('#mH', body).textContent = fmt(n.hole, 2);
    drawPile(n);
  };
  let scene = null;
  const paint = () => { if (scene) scene.set(st.p); else { drawA(st.p); drawB(st.p); } $('[data-out=p]', body).textContent = Math.round(st.p * 100) + '%'; $('[name=p]', body).value = Math.round(st.p * 100); };
  let raf = 0, live = true, last = 0;
  // The Executive App's own fence models in 3D; the line drawings stay for devices that can't draw 3D.
  if (webglOK()) {
    const host = $('.dig-3d', body); host.hidden = false; $('.vs-grid', body).hidden = true; pile.hidden = true;
    import('./dig3d.mjs').then(m => {
      if (!live) return;
      $('.l3d-wait', host).remove();
      scene = m.createDigScene(host, { len: st.len, specs: app.live?.specs }); dur = m.DUR; paint();
    }).catch(() => { if (!live) return; host.hidden = true; $('.vs-grid', body).hidden = false; pile.hidden = false; scene = null; paint(); });
  }
  let dur = 9000;
  const play = () => {
    if (st.playing) { st.playing = false; $('#dgPlay', body).textContent = 'Play install day'; return; }
    if (st.p >= 1) st.p = 0;
    if (reduced.matches) { st.p = 1; paint(); return; }
    st.playing = true; $('#dgPlay', body).textContent = 'Pause'; last = performance.now();
    const step = now => { if (!st.playing || !live) return; st.p = Math.min(1, st.p + Math.min(now - last, 100) / dur); last = now; paint();
      if (st.p >= 1) { st.playing = false; $('#dgPlay', body).textContent = 'Play again'; return; } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  $('#dgPlay', body).onclick = play;
  $('[name=p]', body).oninput = e => { st.playing = false; $('#dgPlay', body).textContent = 'Play install day'; st.p = +e.target.value / 100; paint(); };
  $('[name=len]', body).oninput = e => { st.len = +e.target.value; update(); scene?.setLen(st.len); };
  update(); paint();
  return () => { live = false; st.playing = false; cancelAnimationFrame(raf); scene?.dispose(); scene = null; };
}
