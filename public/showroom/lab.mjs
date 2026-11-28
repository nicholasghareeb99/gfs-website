// Fence Lab: the engineering behind a fence, as things a customer can play with.
// Every number comes from a published source named in its "Show the math" panel:
// ASCE 7 wind loads, the USDA Wood Handbook, local frost depths, and the lifespans
// already printed in the GFS brochure. Where a drawing exaggerates motion so it can
// be seen, it says so.
import { $, $$, esc, clamp, icons, reduced, gesture, digNumbers } from './ui.mjs';
import { webglOK } from './lab3d-ok.mjs';
import { PLACES, MONTHS, WINTERS, POSTS, DRAWN, frozenAt, lift } from './frost-plan.mjs';
import { sag, gateGeom, BRACES as GBRACES, LATCH } from './gate-plan.mjs';
import { YEARS as BUILD_YEARS } from './build-plan.mjs';
import { flowField, streamlines } from './wind-plan.mjs';
import { bends } from './vinyl-plan.mjs';
export { digNumbers } from './ui.mjs';
import { visit } from './visit.mjs';
import { helpOnce } from './help.mjs';

let app, root, D, current = null, stop = null;

const TOOLS = [
  { id: 'dig', name: 'No-dig vs dug', line: 'Watch both crews put in the same fence, and see how much dirt a dug fence leaves in the yard',
    how: [['tap', 'Tap <b>Play install day</b> to watch both crews work, or slide <b>Install day</b> to any moment.'], ['slide', 'Slide <b>Your fence</b> to the length of your fence.'], ['drag', 'Drag sideways on a yard to turn it. Pinch to zoom, double-tap to reset.'], ['look', 'Watch the dirt piles and concrete bags in the dug yard. The no-dig yard has none.']],
    take: 'No holes, no concrete, no dirt left in the yard. Steel posts driven 4 ft, and the lawn left as it was.' },
  { id: 'build', name: 'Our build vs prefab', line: 'One 8 ft section, side by side, then watch 25 years go by',
    how: [['slide', 'Slide <b>Years</b>, or tap <b>Play 25 years</b>, to age both fences.'], ['tap', 'Switch <b>Wood</b> or <b>Vinyl</b>, how the prefab posts are set, and a flat or sloped yard.'], ['tap', 'Tap a part in the lists below to point it out.'], ['drag', 'Drag sideways on a yard to turn it. Pinch to zoom, double-tap to reset.']],
    take: 'Steel driven 4 ft has no wood in the ground to rot and nothing above the frost line to heave. The flat 2×4 across the top keeps the top line straight.' },
  { id: 'frost', name: 'Frost & posts', line: 'What Toledo winters do to dug posts, and why driven steel stays put',
    how: [['tap', 'Pick <b>Toledo</b> or <b>Michigan</b>, and a <b>typical</b> or <b>hard</b> winter.'], ['look', 'The winters play by themselves. Watch the footings creep up a little more each spring.'], ['slide', 'Tap <b>Pause</b>, or slide to any <b>month</b> and <b>winter</b>.'], ['drag', 'Drag sideways on the yard to turn it. Pinch to zoom, double-tap to reset.']],
    take: 'A post has to reach well below the frost line, 3 ft here and 3½ ft in Michigan. Ours are driven 4 ft.' },
  { id: 'grade', name: 'Grade Lab', line: 'Shape the yard and see how we make the top line look great and close the gaps',
    how: [['tap', 'Pick a <b>yard</b>: lumpy, a low spot, a hump.'], ['tap', 'Tap <b>Build it the GFS way</b>. We smooth the top line, then rake dirt in under the fence.'], ['drag', 'Or drag <b>up or down</b> on the yard to shape the ground yourself.'], ['look', 'Watch the close-up: the gap under the fence closes.']],
    take: 'We set a clean top line first, then close what is left underneath with raked dirt, a kickboard or grading.' },
  { id: 'gate', name: 'Gate sag', line: 'Why gates sag, and what keeps a gate latching for years',
    how: [['slide', 'Slide <b>Years in use</b>, or tap <b>Play 15 years</b>.'], ['tap', 'Try each <b>frame</b> and both kinds of <b>gate posts</b>, and slide the <b>gate width</b>.'], ['look', 'Watch the close-up of the latch: when the rod on the gate sits too low for the latch on the post, the gate won\'t latch.'], ['drag', 'Drag sideways on a view to turn it. Pinch to zoom, double-tap to reset.']],
    take: 'Most of a gate\'s trouble starts at the posts. A 3 in steel post driven below the frost line doesn\'t lean or heave, and a welded steel frame doesn\'t rack.' },
  { id: 'life', more: true, name: 'Lifespan', line: 'How long each material lasts, and what wears out first',
    how: [['tap', 'Tap a <b>material</b> to see about how long it lasts.'], ['tap', 'Flip the switches under <b>This yard</b> to match your yard.'], ['drag', 'Drag sideways to turn the 3D fence. Pinch to zoom, double-tap to reset.']],
    take: 'On a wood fence the posts in the ground usually go first. Ours are galvanized steel.' },
  { id: 'vinyl', more: true, name: 'Vinyl walls', line: 'Same size post, thicker wall, steel inside: how far each bends',
    how: [['slide', 'Slide <b>Gust speed</b> to push on both fences.'], ['look', 'Watch the big-box post bend further than ours. The bend is drawn true size.'], ['drag', 'Drag sideways to turn the view. Pinch to zoom, double-tap to reset.']],
    take: 'A thicker wall makes the vinyl stiffer, and ours sleeves over a steel post driven 4 ft, which takes most of the push.' },
  { id: 'wind', more: true, name: 'Wind', line: 'How hard wind pushes on each style',
    how: [['tap', 'Pick a <b>style</b> and a <b>height</b>.'], ['slide', 'Slide <b>Gust speed</b>, or tap a storm, to see the push on each post.'], ['look', 'Watch the air: solid fences make a swirl behind them, open ones just slow it.'], ['drag', 'Drag sideways to turn the view. Pinch to zoom, double-tap to reset.']],
    take: 'Solid, tall fences catch the most wind, so post strength and depth matter most on privacy fences.' },
  { id: 'wood', more: true, name: 'Wood movement', line: 'Why gaps open between boards',
    how: [['tap', 'Pick a <b>wood</b>.'], ['slide', 'Slide the moisture <b>when built</b> and <b>later</b> to watch the gaps open.'], ['drag', 'Drag sideways to turn the view. Pinch to zoom, double-tap to reset.']],
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
  // get the 3D engine loading while the customer is still choosing a tool
  if (!show.warmed && webglOK()) { show.warmed = true; setTimeout(() => import('./lab3d.mjs').catch(() => {}), 400); }
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
  $('.lab', root).classList.toggle('tool', !home);
  if (home) { body.innerHTML = homeHTML(); if (visible) helpOnce('lab'); }
  else { stop = RENDER[id](body) || null; liveWrap(body); if (!fromLink) visit.addLab(id); } // tools opened go in the picks summary and the share link
  body.classList.add('in');
  root.scrollTo?.({ top: 0 }); $('.lab', root).scrollTop = 0;
  if (app.mode === 'lab') { const h = '#lab' + (home ? '' : '-' + id); if (location.hash !== h) history.replaceState(null, '', h); }
}
// The picture and everything that changes it (sliders, choices, the numbers that come out) go in one
// block. On a phone the picture stays in view at the top of that block while its controls scroll
// under it, so a choice and what it does are on screen together. Lists, charts and the math follow.
function liveWrap(body) {
  const kids = [...body.children], at = kids.findIndex(k => k.matches('.l3d-host'));
  if (at < 0) return;
  let end = at;
  kids.forEach((k, i) => { if (i > at && k.matches('.lab-ctl, .lab-grid, .vs-grid') && !k.matches('.lab-card')) end = i; });
  const live = document.createElement('div'); live.className = 'lab-live';
  kids[at].before(live); live.append(...kids.slice(at, end + 1));
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
// The solid shares are measured off the Executive App's own models, seen face-on from post centre
// to post centre and ground to fence top (chain-link fabric is thin wire, so it is worked out
// instead: about 15% for the fabric, plus the top rail and posts).
const WSTYLES = [
  { id: 'privacy', name: 'Solid privacy', note: 'Dog-ear, board-on-board, Kingston vinyl. Counted as solid', eps: () => 1, hs: [4, 5, 6, 7, 8], bay: 8, posts: true },
  { id: 'shadowbox', name: 'Shadowbox', note: 'Engineers treat it as solid. Air does weave through the offset boards, so the real push is a bit lower, but we never count on that', eps: () => 1, hs: [4, 6], bay: 8, posts: true },
  { id: 'lattice', name: 'Lattice top', note: 'Solid boards with a lattice band at the top: about 91% solid', eps: () => .91, hs: [6], bay: 8, posts: true },
  { id: 'picket', name: 'Picket', note: 'About three-quarters solid, once you count the rails behind the pickets', eps: h => ({ 3: .76, 4: .74, 5: .73 })[h] ?? .74, hs: [3, 4, 5], bay: 8, posts: true },
  { id: 'split', name: 'Split rail', note: 'About 20 to 25% solid', eps: h => h <= 3 ? .2 : .24, hs: [3, 4], bay: 10 },
  { id: 'alu', name: 'Aluminum', note: 'About 20% solid. Typical 6 ft panels', eps: h => ({ 4: .22, 5: .21, 6: .2 })[h] ?? .21, hs: [4, 5, 6], bay: 6 },
  { id: 'chain', name: 'Chain link', note: 'Fabric about 15% solid, plus the top rail and posts, all round. Posts up to 10 ft apart (ASTM F567)', eps: h => .15 + 1.37 / (12 * h) + 1.62 / 120, hs: [4, 5, 6], bay: 10, members: 'round' }
];
// A fence under 70% solid is an "open sign or lattice framework" in ASCE 7 (Fig. 29.4-1), not a wall
// with holes: the force is worked out on the solid area alone, with a coefficient set by how open the
// fence is and by whether its parts are flat-sided (pickets, rails, square tube) or round (wire and
// pipe; these are the values for small round parts, D·√q ≤ 2.5, which fence wire and rail always are).
export const OPEN_CF = { flat: [2.0, 1.8, 1.6], round: [1.2, 1.3, 1.5] };   // ε under 0.1, 0.1 to 0.29, 0.3 to 0.7
// What gives first on one line post, and at how much push. Two posts are compared:
//  • typical: a 4×4 (3½ in square) in a 10 in concrete footing 2 ft deep. Average bending strength of No. 2
//    southern pine about 4,600 psi (NDS design value 1,100 psi × 2.1 to the 5th-percentile strength,
//    ÷ 0.5 to the average);
//  • GFS: 2⅜ in Schedule 40 steel pipe driven 4 ft, yield 30,000 psi (the least ASTM F1083 allows for
//    regular-grade fence pipe), bending until the whole section has yielded (plastic modulus).
// The ground: Broms' method for a short post pushed sideways in firm ground with 1,500 psf of shear
// strength. Nothing holds in the top 1½ post widths; below that the ground pushes back with 9 × its
// strength × the post's width. The post tips out when the ground below can't balance the push, and
// the post itself gives where the bending is greatest, a little below the surface.
export const GROUND_PSF = 1500;
export const WPOSTS = {
  store: { id: 'store', name: 'Typical 4×4, 2 ft deep', wFt: 10 / 12, depthFt: 2, breakLbFt: 4600 * 3.5 ** 3 / 6 / 12, snaps: true },
  gfs: { id: 'gfs', name: 'GFS steel, driven 4 ft', wFt: 2.375 / 12, depthFt: 4, breakLbFt: 30000 * (2.375 ** 3 - 2.067 ** 3) / 6 / 12, snaps: false }
};
export function postLimit(post, armFt, su = GROUND_PSF) {
  const b = post.wFt, k = 9 * su * b;
  const arm = P => armFt + 1.5 * b + .5 * P / k;                     // from the push down to where the bending is greatest
  const solve = f => { let lo = 0, hi = 50000; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; } return lo; };
  const tip = solve(P => 2.25 * su * b * Math.max(0, post.depthFt - 1.5 * b - P / k) ** 2 - P * arm(P));
  const bend = solve(P => post.breakLbFt - P * arm(P));
  return tip < bend ? { lb: tip, mode: 'tips' } : { lb: bend, mode: post.snaps ? 'snaps' : 'bends' };
}
// the gust at which a fence's posts give: the push grows with the square of the wind
export function failGust(o, post) {
  const one = windLoad({ ...o, V: 100 }), lim = postLimit(post, one.arm * o.h);
  return { ...lim, V: 100 * Math.sqrt(lim.lb / one.perPost) };
}
const PRESETS = [[25, 'Breezy'], [58, 'Severe storm'], [80, 'Derecho'], [115, 'Ohio design gust']];
export function windLoad({ V, h, exposure, style }) {
  const Kz = exposure === 'C' ? 0.85 : 0.57, Kd = 0.85, Kzt = 1, Ke = 1, G = 0.85, Cf = 1.3;
  const q = 0.00256 * Kz * Kzt * Kd * Ke * V * V;              // psf, ASCE 7-16 Eq. 26.10-1
  const eps = clamp(style.eps(h), 0, 1), open = eps < .7;
  // 70% solid and up: a solid wall, less the ASCE 7 allowance for openings (Fig. 29.3-1, note 2)
  const red = open || eps >= .999 ? 1 : 1 - Math.pow(1 - eps, 1.5);
  // under 70% solid: open framework, force on the solid area (Fig. 29.4-1)
  const cfOpen = open ? OPEN_CF[style.members === 'round' ? 'round' : 'flat'][eps < .1 ? 0 : eps < .3 ? 1 : 2] : null;
  const net = open ? cfOpen * eps : Cf * red;                   // force coefficient on the gross area
  const p = q * G * net;                                        // psf on the gross area
  const arm = open ? .5 : .55;                                  // where the push acts, as a share of the height
  const perFt = p * h, perPost = perFt * style.bay, moment = perPost * arm * h;
  return { q, eps, red, open, cfOpen, net, arm, p, perFt, perPost, moment, Kz, Kd, G, Cf };
}

function wind(body) {
  const st = { style: WSTYLES[0], h: 6, V: 58, exposure: 'B', post: 'gfs' };
  body.innerHTML = `
    <div class="wind-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the fence in 3D…</div></div>
    <div class="lab-ctl vs-ctl">${slider('V', 'Gust speed', 10, 120, 1, st.V, ' mph')}
      <div id="wPostW" class="wpost">${seg('wpost', Object.values(WPOSTS).map(p => [p.id, p.name]), st.post)}</div></div>
    <div class="lab-grid">
      <div class="lab-vis"><canvas class="wind-cv" aria-label="Wind flowing over the fence"></canvas>
        <div class="wind-gauge"><div class="wg-n mono" id="wgN"></div><div class="wg-l">lb on each post</div></div>
        <div class="vis-note">Side view. Wind blows left to right, slowed way down.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Style</div>
        <div class="chips wrap" id="wStyle">${WSTYLES.map(s => `<button class="chip" data-s="${s.id}">${esc(s.name)}</button>`).join('')}</div>
        <p class="lab-note" id="wNote"></p>
        <div class="lab-label">Height</div><div id="wH"></div>
        <div class="chips wrap presets">${PRESETS.map(([v, l]) => `<button class="chip" data-v="${v}">${l} · ${v}</button>`).join('')}</div>
        <div class="lab-label">Yard</div>
        ${seg('exposure', [['B', 'Houses and trees around'], ['C', 'Open field']], st.exposure)}
        <div class="readouts">
          <div><b class="mono" id="rP"></b><small>lb per sq ft on the fence</small></div>
          <div><b class="mono" id="rF"></b><small>lb per running foot</small></div>
          <div><b class="mono" id="rM"></b><small>lb·ft trying to bend each post at the ground</small></div>
          <div id="rFailW"><b id="rFail"></b><small id="rFailS"></small></div>
        </div>
      </div>
    </div>
    <div class="lab-card"><div class="lab-label">Every style at this height and gust</div><div class="wbars" id="wBars"></div></div>
    ${math(`
      <p><b>Velocity pressure</b> (ASCE 7-16 Eq. 26.10-1): q = 0.00256 · K<sub>z</sub> · K<sub>zt</sub> · K<sub>d</sub> · K<sub>e</sub> · V² <span class="mono" id="mQ"></span></p>
      <p>K<sub>z</sub> = 0.57 for houses and trees (Exposure B) or 0.85 for open ground (Exposure C), 0–15 ft (Table 26.10-1). K<sub>zt</sub> = 1 (flat ground). K<sub>d</sub> = 0.85. K<sub>e</sub> = 1.</p>
      <p><b>Force on a freestanding wall</b> (Eq. 29.3-1): F = q · G · C<sub>f</sub> · A<sub>s</sub>, with gust factor G = 0.85 and C<sub>f</sub> = 1.3 for a long wall standing on the ground (Fig. 29.3-1, s/h = 1).</p>
      <p><b>Fences with gaps</b>: ε is the solid share of the section. At 70% solid and up (picket, lattice top) the code still treats the fence as a wall and multiplies C<sub>f</sub> by 1 − (1 − ε)<sup>1.5</sup> (Fig. 29.3-1). Under 70% solid (split rail, aluminum, chain link) it is an open framework (Fig. 29.4-1): the force is worked out on the solid area alone, F = q · G · C<sub>f</sub> · ε · A, with C<sub>f</sub> = 1.8 for flat-sided parts at 10 to 29% solid (1.6 from 30 to 70%), and 1.3 for small round parts such as chain-link wire and pipe. <span class="mono" id="mE"></span> The solid shares are measured off the Executive App's own models, face-on, from post centre to post centre and from the ground to the top: picket about 75% (the rails behind the gaps count), split rail 20–24%, aluminum 20–22%, lattice top 91%. Chain-link fabric is thin wire, so it's worked out instead: about 15% for the fabric, plus the top rail and posts.</p>
      <p><b>Bending at the ground</b>: on a solid fence the push acts at 0.55 h above the ground, so M = F · 0.55 h. On an open fence it acts at mid-height, 0.5 h.</p>
      <p><b>The moving air</b> is the average flow, slowed way down so you can follow it. The open-yard wind grows with height (ASCE 7 power law, 1/7 among houses, 1/9.5 in open country). Air that gets through an open fence is worked out from the pressure loss of a perforated plate (Idelchik, <i>Handbook of Hydraulic Resistance</i>, diagram 8-1) and actuator-disc momentum. Behind a fence less than about 30% open the air rolls back toward the fence (Perera 1981; <i>Scientific Reports</i> 4:6619, 2014). In wind-tunnel work that swirl reaches about 13 fence heights back; turbulence shortens it, so it's drawn 10 heights long among houses and 12 in open country. Further back the slow air recovers as Perera's far-wake formula (as given in <i>Wind Energy Science</i> 1:101, 2016). What can't get through goes over the top, faster.</p>
      <p><b>When the posts give</b>: the push on each post is set against two limits, and the lower one decides. The ground: Broms' method for a short post in firm ground (1,500 psf shear strength), where nothing holds in the top 1½ post widths and below that the ground pushes back with 9 times its strength times the post's width. The post: a 4×4 breaks at about 4,600 psi of bending (average No. 2 southern pine, from the NDS design value); a 2⅜ in Schedule 40 steel pipe bends over once the whole section yields at 30,000 psi (the least the fence-pipe standard, ASTM F1083, allows). A typical 4×4 in a 2 ft footing tips out of the ground long before the wood breaks. Steel driven 4 ft is held by twice the depth, so the pipe itself is the limit, and steel bends where wood snaps. These are estimates for a new fence in firm ground. Soaked ground holds less, and a wood post loses strength as it rots.</p>
      <p><b>Ends and corners</b> see higher pressure than the middle of a long run (ASCE 7 Case C), which is why end, corner and gate posts matter most.</p>
      <p class="src">Gust speeds are 3-second gusts. 115 mph is Ohio's ultimate design wind speed for ordinary buildings, a rare event. These are unfactored loads for comparing styles, not a stamped design. Fences in 3D are the Executive App's models: no-dig dog-ear privacy, shadowbox, lattice top, spaced picket, cedar split rail, 3-rail aluminum and galvanized chain link.</p>`)}`;
  const cv = $('.wind-cv', body), { g, fit } = sizedCanvas(cv);
  let W = 0, H = 0, raf = 0, live = true, scene = null, field = null, fkey = '';
  const res = () => windLoad(st);
  const flow = () => { const r = res(), k = `${r.eps}|${st.h}|${st.exposure}`; if (k !== fkey) { field = flowField({ eps: r.eps, hFt: st.h, exposure: st.exposure }); fkey = k; } return field; };
  let update = () => {
    const r = res();
    $('#wNote', body).textContent = st.style.note;
    $('#wH', body).innerHTML = seg('h', st.style.hs.map(h => [h, h + ' ft']), st.h);
    $('[data-out=V]', body).textContent = st.V + ' mph';
    $('#rP', body).textContent = fmt(r.p, 1); $('#rF', body).textContent = fmt(r.perFt, 0); $('#rM', body).textContent = fmt(r.moment, 0);
    const fg = st.style.posts ? failGust(st, WPOSTS[st.post]) : null, down = !!fg && st.V >= fg.V;
    $('#wPostW', body).hidden = $('#rFailW', body).hidden = !fg;
    if (fg) {
      // each choice of post carries the gust it holds to, for this fence in this yard
      for (const b of $$('.seg[data-name=wpost] button', body)) { const P = WPOSTS[b.dataset.v], g = failGust(st, P); b.innerHTML = `${esc(P.name)}<small>${st.V >= g.V ? { tips: 'tips out', snaps: 'snaps', bends: 'bends over' }[g.mode] + ' at' : 'holds to'} about ${Math.round(g.V / 5) * 5} mph</small>`; b.classList.toggle('gone', st.V >= g.V); }
      const how = { tips: 'tip out of the ground', snaps: 'snap at the ground', bends: 'bend over' }[fg.mode];
      $('#rFail', body).textContent = down ? { tips: 'Down: posts tipped out', snaps: 'Down: posts snapped', bends: 'Posts bent over' }[fg.mode] : `Holds to about ${Math.round(fg.V / 5) * 5} mph`;
      $('#rFailS', body).textContent = down ? `These posts ${how} at about ${Math.round(fg.V / 5) * 5} mph in firm ground. An estimate, not a test.` : `Past that these posts ${how}. An estimate for firm ground; soaked ground holds less.`;
      $('#rFailW', body).classList.toggle('bad', down);
    }
    $('#wgN', body).textContent = fmt(r.perPost, 0);
    $('#mQ', body).textContent = `= ${fmt(r.q, 1)} psf at ${st.V} mph`;
    $('#mE', body).textContent = r.open ? `${st.style.name}: ε ≈ ${fmt(r.eps, 2)}, C_f ${fmt(r.cfOpen, 1)} on the solid area.` : `${st.style.name}: ε ≈ ${fmt(r.eps, 2)}, factor ${fmt(r.red, 2)}.`;
    for (const b of $$('#wStyle .chip', body)) b.setAttribute('aria-pressed', String(b.dataset.s === st.style.id));
    for (const b of $$('.presets .chip', body)) b.setAttribute('aria-pressed', String(+b.dataset.v === st.V));
    const all = WSTYLES.map(s => { const h = s.hs.reduce((a, x) => Math.abs(x - st.h) < Math.abs(a - st.h) ? x : a, s.hs[0]); return { s, h, r: windLoad({ ...st, style: s, h }) }; });
    const max = Math.max(...all.map(x => x.r.perFt), 1);
    $('#wBars', body).innerHTML = all.map(x => `<button class="wbar${x.s === st.style ? ' on' : ''}" data-s="${x.s.id}"><span class="wb-n">${esc(x.s.name)} <small>${x.h} ft</small></span><span class="wb-t"><i style="--w:${(x.r.perFt / max * 100).toFixed(1)}%"></i></span><b class="mono">${fmt(x.r.perFt)} <small>lb/ft</small></b></button>`).join('');
    if (scene) scene.set({ style: st.style.id, h: st.h, bay: st.style.bay, eps: r.eps, V: st.V, exposure: st.exposure, p: r.p, perPost: r.perPost, fail: fg ? { down, mode: fg.mode, frac: st.V / fg.V, V: fg.V } : null });
  };
  body.addEventListener('click', e => {
    const s = e.target.closest('[data-s]'); if (s) { st.style = WSTYLES.find(x => x.id === s.dataset.s); if (!st.style.hs.includes(st.h)) st.h = st.style.hs.reduce((a, x) => Math.abs(x - st.h) < Math.abs(a - st.h) ? x : a, st.style.hs[0]); update(); seed(); }
    const p = e.target.closest('.presets [data-v]'); if (p) { st.V = +p.dataset.v; $('[name=V]', body).value = st.V; update(); }
  });
  bindSeg(body, (n, v) => { if (n === 'h') st.h = +v; if (n === 'exposure') st.exposure = v; if (n === 'wpost') st.post = v; update(); });
  $('[name=V]', body).oninput = e => { st.V = +e.target.value; update(); };

  // ── flow picture without 3D: the same smoke lines as the 3D, side on ──
  const geo = () => { const ground = H * .8, hpx = st.h * (H * .5) / 8, fx = W * .22; return { ground, hpx, fx }; };
  let lines = [], lkey = '', T = 0;
  const seed = () => { lkey = ''; };
  const smoke = () => {
    const { hpx, fx } = geo(), F = flow(), k = fkey + '|' + W + '|' + H;
    if (k === lkey) return; lkey = k;
    lines = streamlines(F, { x0: -fx / hpx - .2, x1: (W - fx) / hpx + .2, top: (H * .8 - 8) / hpx });
  };
  // Reduce Motion (an iPhone setting) gets still smoke lines.
  const still = () => { if (W) frame(true); };
  const resize = () => { ({ w: W, h: H } = fit()); seed(); if (reduced.matches) still(); };
  const ro = new ResizeObserver(resize); ro.observe(cv);
  const frame = (once) => {
    if (scene) return;
    const { ground, hpx, fx } = geo(), r = res(), F = flow(); smoke();
    if (once !== true) T = (T + (.55 + 1.25 * st.V / 58) * 1.6 / 60) % 1000;
    g.clearRect(0, 0, W, H);
    const sky = g.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, '#0d1d31'); sky.addColorStop(1, '#13283f'); g.fillStyle = sky; g.fillRect(0, 0, W, ground);
    g.fillStyle = '#1b2c1e'; g.fillRect(0, ground, W, H - ground); g.fillStyle = '#26402a'; g.fillRect(0, ground, W, 3);
    g.lineCap = 'round'; g.lineWidth = 2;
    const X = x => fx + x * hpx, Y = z => ground - z * hpx;
    for (const L of lines) {
      const P = L.pts, swirl = L.kind === 'swirl';
      g.strokeStyle = swirl ? 'rgba(196,181,255,.25)' : 'rgba(140,199,255,.22)';
      g.beginPath(); P.forEach((p, k) => k ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke();
      // dashes the same time long, moving at the local speed
      for (let k = 1; k < P.length; k++) {
        const p = P[k], ph = ((p[2] * 1.6 - T) % 1 + 1) % 1;
        if (ph > .42) continue;
        const sp = Math.hypot(p[3], p[4]), u0 = F.U0(p[1]);
        g.strokeStyle = swirl || p[3] < -.02 ? 'rgba(196,181,255,.95)' : sp > u0 * 1.12 && p[1] > .8 && p[0] > -1 && p[0] < 4 ? 'rgba(240,168,101,.95)' : 'rgba(159,208,255,.9)';
        g.beginPath(); g.moveTo(X(P[k - 1][0]), Y(P[k - 1][1])); g.lineTo(X(p[0]), Y(p[1])); g.stroke();
      }
    }
    // the fence (dashed when it's open)
    const eps = r.eps;
    g.strokeStyle = '#d9823f'; g.lineWidth = 7; g.setLineDash(eps > .9 ? [] : [Math.max(2, eps * 10), Math.max(2, (1 - eps) * 10)]);
    g.beginPath(); g.moveTo(fx, ground); g.lineTo(fx, ground - hpx); g.stroke(); g.setLineDash([]);
    // pressure arrows on the windward face
    const n = 5, len = clamp(r.p * 1.6, 4, 46);
    g.strokeStyle = 'rgba(239,91,91,.9)'; g.fillStyle = 'rgba(239,91,91,.9)'; g.lineWidth = 2;
    for (let i = 0; i < n; i++) { const y = ground - hpx * (i + .5) / n, x = fx - 6; g.beginPath(); g.moveTo(x - len, y); g.lineTo(x, y); g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y - 4); g.lineTo(x - 6, y + 4); g.fill(); }
    g.fillStyle = 'rgba(234,240,247,.85)'; g.font = '600 12px "IBM Plex Mono", monospace';
    g.textAlign = 'right'; g.fillText(`${st.h} FT`, fx - 14, ground - hpx + 4); g.textAlign = 'center';
    if (F.swirl > .5) { const tw = g.measureText('AIR ROLLS BACK').width; g.fillStyle = 'rgba(196,181,255,.95)'; g.fillText('AIR ROLLS BACK', Math.min(fx + hpx * 1.9, W - tw / 2 - 8), ground - hpx * .5); }
    if (once !== true && live && vis.on && !reduced.matches) raf = requestAnimationFrame(frame);
  };
  const vis = onScreen(cv, () => { if (live && !scene && !reduced.matches) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } });
  update(); resize(); frame();
  const upd = update; update = () => { upd(); if (reduced.matches) { if (scene) scene.still(); else still(); } };
  if (webglOK()) {
    const host = $('.wind-3d', body); host.hidden = false; $('.lab-vis', body).hidden = true;
    import('./wind3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); cancelAnimationFrame(raf); scene = m.createWindScene(host, { specs: app.live?.specs }); body.__wind = scene; update(); })
      .catch(() => { if (!live) return; host.hidden = true; $('.lab-vis', body).hidden = false; scene = null; resize(); frame(); });
  }
  return () => { live = false; cancelAnimationFrame(raf); ro.disconnect(); vis.stop(); scene?.dispose(); scene = null; };
}

// ═════════════════════════════════════════════════════════════════
// 2. LIFESPAN — the published ranges, and where in the range a fence lands
// ═════════════════════════════════════════════════════════════════
// Ranges are the ones already printed in the GFS brochure (p. 9, 11, 31, 77). The
// toggles only move the estimate inside the range; nothing here goes past it.
const LIFE = [
  { id: 'pt', name: 'Pressure-treated pine', range: [10, 15], wood: true, care: 'Stain or seal every few years', first: 'Boards check, twist and turn gray. Wood posts rot where they meet the soil, where there is both air and water.', src: 'GFS brochure p. 9 (up to about 15 years). Fannie Mae useful-life tables list a 6 ft wood privacy fence at 15 years (10 to 20). HUD’s capital-needs table gives a wood board fence 20 to 25, so this range is on the cautious side.' },
  { id: 'wrc', name: 'Western Red Cedar', range: [15, 30], wood: true, care: 'Seal every 3 to 5 years, or let it gray', first: 'Surface weathering and graying. The heartwood\'s natural oils resist decay, so boards outlast pine.', src: 'GFS brochure p. 9 and 11 (15 to 30 years). Re-seal interval from brochure p. 27.' },
  { id: 'nwc', name: 'Northern White Cedar', range: [15, 30], wood: true, care: 'Seal every 3 to 5 years, or let it gray', first: 'Surface weathering. Very decay resistant, and it moves less as it dries than pine.', src: 'GFS brochure p. 9 and 11 (15 to 30 years).' },
  { id: 'vinyl', name: 'Homeland vinyl', range: [20, 30], care: 'Wash it once a year', first: 'Knocks from mowers and trimmers, and stress at the gate. Thin big-box vinyl fades and cracks first; Homeland walls are thicker.', src: 'Angi: 20 to 30 years. Fannie Mae useful-life tables: PVC fencing 25 years. HUD’s capital-needs table is more cautious, 15 to 20. Homeland limited lifetime warranty (brochure p. 31).' },
  { id: 'alu', name: 'Elite aluminum', range: [30, 45], plus: true, care: 'Nothing. Rinse if you want', first: 'Very little. Aluminum does not rust, and Elite\'s powder coat is covered for peeling and cracking.', src: 'GFS brochure p. 77 (30+ years). Elite lifetime warranty on the finish (brochure p. 52). HUD’s capital-needs table lists steel or aluminum fence at 20 to 25, which covers painted steel too.' },
  { id: 'cl', name: 'Galvanized chain link', range: [20, 30], care: 'None', first: 'The zinc coating wears slowly, most where the fabric touches wet soil or mulch.', src: 'GFS brochure p. 77 (20 to 30 years). Fannie Mae and HUD both list chain link at 40 years, so this range is on the cautious side.' },
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
    <div class="life-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the fence in 3D…</div></div>
    <div class="lab-ctl vs-ctl life-mat"><div class="chips wrap" id="lMat">${LIFE.map(x => `<button class="chip" data-m="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>
    <div class="lab-grid">
      <div class="lab-vis life-vis"><div class="life-big"><b class="mono" id="lY"></b><span>years, about</span></div>
        <div class="life-axis" id="lAxis"></div><p class="lab-note" id="lFirst"></p></div>
      <div class="lab-ctl">
        <div class="lab-label">This yard</div><div class="toggles" id="lTog"></div>
        <div class="readouts one"><div><b id="lCare"></b><small>Upkeep</small></div></div>
      </div>
    </div>
    <div class="lab-card"><div class="lab-label">Every material, side by side</div><div class="lchart" id="lChart"></div></div>
    ${math(`<p>Each bar is a published range. The estimate starts in the middle and the yard choices move it toward one end. It never goes past the range, because nobody has data for that. The 3D fence is the Executive App's model of each material, shown new; it isn't aged.</p><div id="lSrc"></div>
      <p><b>Why wood posts fail at the soil line</b>: decay fungi need oxygen, water and a temperature they like. A few inches either side of grade has all three, deeper soil has little oxygen, and the air above dries out. That band is where a wood post rots first, and it is why GFS drives galvanized steel posts.</p>`)}`;
  const tick = y => `<i style="left:${y / MAXY * 100}%"><span>${y}</span></i>`;
  let scene = null, live = true;
  const update = () => {
    const e = lifeEstimate(m, on);
    scene?.set({ id: m.id, steel: on.has('steel') });
    $('#lY', body).textContent = m.plus ? m.range[0] + '+' : e.years;
    $('#lFirst', body).innerHTML = `<b>What wears out first:</b> ${esc(m.first)}`;
    $('#lCare', body).textContent = m.care;
    const careEvery = m.id === 'wrc' || m.id === 'nwc' ? 4 : m.id === 'pt' ? 3 : 0;
    const ticks = careEvery && on.has('seal') ? Array.from({ length: Math.floor(e.years / careEvery) }, (_, i) => `<em style="left:${(i + 1) * careEvery / MAXY * 100}%" title="Seal"></em>`).join('') : '';
    $('#lAxis', body).innerHTML = `<div class="la-track"><div class="la-range" style="left:${m.range[0] / MAXY * 100}%;width:${(m.range[1] - m.range[0]) / MAXY * 100}%">${m.plus ? '<span class="la-plus"></span>' : ''}</div>${ticks}<div class="la-mark" style="left:${(m.plus ? m.range[0] : e.years) / MAXY * 100}%"></div></div><div class="la-ticks">${[0, 10, 20, 30, 40, 50].map(tick).join('')}</div>${ticks ? '<p class="src">Dots: a re-seal about every ' + careEvery + ' years.</p>' : ''}`;
    $('#lTog', body).innerHTML = LTOGGLES.filter(x => x.on(m)).map(x => `<label class="tog"><input type="checkbox" data-k="${x.id}" ${on.has(x.id) ? 'checked' : ''}><i></i><span>${esc(x.label)}</span></label>`).join('');
    for (const b of $$('#lMat .chip', body)) { b.setAttribute('aria-pressed', String(b.dataset.m === m.id));
      if (b.dataset.m === m.id) { const box = b.parentElement; if (box.scrollWidth > box.clientWidth + 4) box.scrollLeft += b.getBoundingClientRect().left - box.getBoundingClientRect().left - (box.clientWidth - b.offsetWidth) / 2; } }
    $('#lChart', body).innerHTML = LIFE.map(x => `<button class="lrow${x === m ? ' on' : ''}" data-m="${x.id}"><span>${esc(x.name)}</span><span class="lr-t"><i style="left:${x.range[0] / MAXY * 100}%;width:${(x.range[1] - x.range[0]) / MAXY * 100}%" class="${x.plus ? 'plus' : ''}"></i></span><b class="mono">${x.plus ? x.range[0] + '+' : x.range[0] + '–' + x.range[1]}</b></button>`).join('');
    $('#lSrc', body).innerHTML = LIFE.map(x => `<p><b>${esc(x.name)}</b>: ${esc(x.src)}</p>`).join('');
  };
  body.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { m = LIFE.find(x => x.id === b.dataset.m); update(); } });
  body.addEventListener('change', e => { const c = e.target.closest('[data-k]'); if (c) { c.checked ? on.add(c.dataset.k) : on.delete(c.dataset.k); update(); } });
  update();
  if (webglOK()) {
    const host = $('.life-3d', body); host.hidden = false;
    import('./life3d.mjs').then(x => { if (!live) return; $('.l3d-wait', host).remove(); scene = x.createLifeScene(host, { specs: app.live?.specs }); body.__life = scene; update(); })
      .catch(() => { if (!live) return; host.hidden = true; scene = null; });
  }
  return () => { live = false; scene?.dispose(); scene = null; };
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
    <div class="wood-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the boards in 3D…</div></div>
    <div class="lab-ctl vs-ctl">
      ${slider('from', 'Moisture when built', 8, 40, 1, from, '%')}
      ${slider('to', 'Moisture later (Ohio summer is about 12%)', 6, 30, 1, to, '%')}
    </div>
    <div class="lab-grid">
      <div class="lab-vis wood-vis"><svg class="wood-svg" viewBox="0 0 400 230" aria-label="Pickets seen from above"></svg>
        <div class="vis-note">Looking down on six pickets. Gap drawn 4× bigger so you can see it.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Wood</div>
        ${seg('sp', SPECIES.map(s => [s.id, s.name]), sp.id)}
        <p class="lab-note" id="wdNote"></p>
        <div class="readouts">
          <div><b class="mono" id="wdGap"></b><small>each 1×6 picket gets this much narrower, so that much gap opens between boards set side by side</small></div>
          <div><b class="mono" id="wdLap"></b><small>overlap left on board-on-board, so nothing shows through</small></div>
          <div><b class="mono" id="wdCup"></b><small>flat-sawn shrinks this many times more than quartersawn, which is what makes boards cup</small></div>
        </div>
      </div>
    </div>
    <div class="lab-card"><p class="lab-note">This is why GFS builds board-on-board with overlapping boards: a gap opening as the wood dries stays covered. On a butted privacy fence, pine leaves the bigger gaps.</p></div>
    ${math(`<p><b>Shrinkage below the fiber saturation point</b> (USDA Wood Handbook, Ch. 4): S = S<sub>0</sub> · (M<sub>1</sub> − M<sub>2</sub>) / 30, where S<sub>0</sub> is green-to-ovendry shrinkage and moisture above 30% (free water) causes no shrinking. <span class="mono" id="wdEq"></span></p>
      <p>S<sub>0</sub> from Wood Handbook Table 4-3: loblolly pine 7.4% flat-sawn, 4.8% quartersawn; Western redcedar 5.0% and 2.4%; Northern white-cedar 4.9% and 2.2%.</p>
      <p class="src">Fence pickets are mostly flat-sawn, so the flat-sawn number is used. A 1×6 picket is 5½″ wide. The 3D boards are the Executive App's dog-ear privacy and board-on-board models, drawn true size; each board changes width about its middle, where it's nailed. Cedar is drawn with the app's cedar model for both cedars. Board-on-board boards are 5½″ wide, 4″ apart, so each laps its neighbours 1½″. Cupping and twisting aren't drawn.</p>`)}`;
  const svg = $('.wood-svg', body);
  let scene = null, live = true;
  const update = () => {
    const g = shrink(sp, width, from, to);
    const r3 = scene?.set({ sp: sp.id, s: g / width });
    $('#wdLap', body).textContent = r3 ? frac16(r3.bob.lapIn) : '1 1/2″';
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
  if (webglOK()) {
    const host = $('.wood-3d', body); host.hidden = false; $('.lab-vis', body).hidden = true;
    import('./wood3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); scene = m.createWoodScene(host, { specs: app.live?.specs }); body.__wood = scene; update(); })
      .catch(() => { if (!live) return; host.hidden = true; $('.lab-vis', body).hidden = false; scene = null; });
  }
  return () => { live = false; scene?.dispose(); scene = null; };
}

// ═════════════════════════════════════════════════════════════════
// 4. FROST & POSTS — cross-section through a winter
// ═════════════════════════════════════════════════════════════════
function frost(body) {
  let place = PLACES[0], mi = 3, winters = 1, soil = 'clay', winter = WINTERS[0];
  body.innerHTML = `
    <div class="frost-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the yard in 3D…</div></div>
    <div class="lab-ctl vs-ctl">
      <div class="vs-years"><button class="btn primary" id="frPlay">Play</button>${slider('m', 'Month', 0, 5, 1, mi)}</div>
      ${slider('w', 'Winters', 1, 10, 1, winters)}
    </div>
    <div class="lab-grid">
      <div class="lab-vis"><svg class="frost-svg" viewBox="0 0 420 330" aria-label="Soil cross-section with three posts"></svg>
        <div class="vis-note">Post movement drawn ${DRAWN} times bigger than life so you can see it.</div></div>
      <div class="lab-ctl">
        <div class="lab-label">Where</div>${seg('place', PLACES.map(p => [p.id, p.name]), place.id)}
        <div class="lab-label">Winter</div>${seg('winter', WINTERS.map(w => [w.id, w.name]), winter.id)}
        <div class="readouts one"><div><b id="fWhy"></b><small id="fWhyS"></small></div></div>
        <div class="vis-note f3d-note" hidden>Post movement drawn ${DRAWN} times bigger than life so you can see it.</div>
      </div>
    </div>
    ${math(`<p><b>Frost line</b>: how deep the building code says the ground can freeze in the hardest winters, 36 in in Toledo and Lucas County and 42 in across Michigan. Most winters freeze about half that deep. A GFS driven post goes 48 in, past both.</p>
      <p><b>Frost heave</b>: in wet ground, water is drawn up to the freezing front and freezes into seams of ice (ice lenses) that lift the ground. Frozen soil also grips whatever is in it (adfreeze). A footing whose bottom is in or near the frozen layer rides up with it. At the thaw the ground settles, but loose soil falls into the gap under the footing, so it never quite comes back down, and it creeps up a little more each winter.</p>
      <p><b>Why depth matters</b>: the arrows show it. Frozen soil grips a post along the frozen part (up arrows). Unfrozen soil below the frost holds it along the rest (down arrows). A footing starts to give once more than half its length is frozen, and rides all the way up with the ground once it is frozen to the bottom. A post with plenty of length below the frost line is held. A flared top, where the top of a hole caved in, gives the frost even more to grab.</p>
      <p><b>The numbers here are a picture, not a measurement</b>: how far a post moves depends on how wet the soil is, how cold the winter gets and how deep the frost goes. We use the least the ground can lift: water grows about 9% as it freezes, which comes to about ½ in for each foot of wet soil that freezes (¾ in in a typical Toledo winter, 1½ in in a hard one). Ice seams can add a lot to that. About a third is left behind each spring, because a lifted post mostly stays lifted. Drawn ${DRAWN} times bigger.</p>
      <p><b>No post is frost-proof in every yard</b>. Wet ground lifts more than well-drained ground, and a rough concrete plug gives frost far more to grip than a slim, smooth steel post. Driving 4 ft puts a foot or more of post in ground that doesn't freeze even in the hardest winter.</p>
      <p class="src">Frost depths: ${PLACES.map(p => esc(p.src)).join('; ')}. Lift from freezing, and posts staying lifted: North Dakota Geological Survey, "Frost Heave" (2011).</p>`)}`;
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
    $('#fWhyS', body).textContent = winter.id === 'typical' ? `A typical winter freezes about ${Math.round(place.frost * winter.reach)} in down. A footing with more than half its length in frozen ground starts to lift. GFS drives steel to 48 in, past the ${place.frost} in frost line.`
      : `A hard winter freezes all the way to the ${place.frost} in frost line, so even a footing that stops right at it can be lifted. GFS drives steel to 48 in.`;
  };
  bindSeg(body, (n, v) => { if (n === 'place') place = PLACES.find(p => p.id === v); if (n === 'winter') winter = WINTERS.find(w => w.id === v); update(); });
  // The winters play by themselves: one after another, with a short pause each spring, until the
  // tenth. Touching a slider or the button takes over.
  let raf = 0, live = true, playing = false, last = 0, auto = !reduced.matches, wait = 0;
  const stopPlay = (label = 'Play') => { playing = false; cancelAnimationFrame(raf); clearTimeout(wait); $('#frPlay', body).textContent = label; };
  const run = () => {
    playing = true; $('#frPlay', body).textContent = 'Pause'; last = performance.now();
    const step = now => { if (!playing || !live) return; mi = Math.min(5, mi + Math.min(now - last, 100) / 1100); last = now; $('[name=m]', body).value = Math.round(mi); update();
      if (mi >= 5) {
        if (winters >= 10) { auto = false; stopPlay('Play again'); return; }
        playing = false; wait = setTimeout(() => { if (!live || !auto) return; winters++; $('[name=w]', body).value = winters; mi = 0; update(); run(); }, 700);
        return;
      }
      raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  $('[name=m]', body).oninput = e => { auto = false; stopPlay(); mi = +e.target.value; update(); };
  $('[name=w]', body).oninput = e => { auto = false; stopPlay(); winters = +e.target.value; update(); };
  $('#frPlay', body).onclick = () => {
    if (playing || wait && auto && $('#frPlay', body).textContent === 'Pause') { auto = false; return stopPlay(); }
    if (reduced.matches) { mi = 3; $('[name=m]', body).value = 3; update(); return; }
    if (winters >= 10 && mi >= 5) { winters = 1; $('[name=w]', body).value = 1; }
    if (mi >= 5) mi = 0;
    auto = true; run();
  };
  const start = () => { if (!live || !auto || playing) return; winters = 1; $('[name=w]', body).value = 1; mi = 0; update(); run(); };
  if (webglOK()) {
    const host = $('.frost-3d', body); host.hidden = false; $('.lab-vis', body).hidden = true; $('.f3d-note', body).hidden = false;
    import('./frost3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); scene = m.createFrostScene(host, { specs: app.live?.specs }); body.__frost = scene; update(); setTimeout(start, 900); })
      .catch(() => { if (!live) return; host.hidden = true; $('.lab-vis', body).hidden = false; $('.f3d-note', body).hidden = true; scene = null; update(); start(); });
  } else setTimeout(start, 600);
  update();
  return () => { live = false; stopPlay(); scene?.dispose(); scene = null; };
}

// ═════════════════════════════════════════════════════════════════
// 5. GATE SAG — the gate's weight on its hinges, the frame, the brace, the hinge post, frost
// ═════════════════════════════════════════════════════════════════
// The model is in gate-plan.mjs (Eurocode 5 nail slip and creep, NDS nail factors, USDA Wood Handbook
// shrinkage, beam formulas for the post, the Frost & posts model). In 3D the gate is the Executive
// App's own; without 3D the same sums run on the gate's measured shape and a drawing shows it.
const G_BRACES = GBRACES;
function gate(body) {
  const st = { w: 4, brace: 'right', post: 'steel', y: 0, playing: false };
  body.innerHTML = `
    <div class="gate-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the gate in 3D…</div></div>
    <div class="lab-ctl vs-ctl">
      <div class="vs-years"><button class="btn primary" id="gtPlay">Play 15 years</button>${slider('y', 'Years in use', 0, 15, .05, 0)}</div>
    </div>
    <div class="lab-grid">
      <div class="lab-vis"><svg class="gate-svg" viewBox="0 0 420 300" aria-label="A wood gate on its hinges"></svg>
        <div class="vis-note">Movement drawn 4 times bigger than life so you can see it.</div></div>
      <div class="lab-ctl">
        ${slider('gw', 'Gate width', 3, 6, .5, st.w, ' ft')}
        <div class="lab-label">Frame</div>${seg('brace', G_BRACES, st.brace)}
        <div class="lab-label">Gate posts</div>${seg('gpost', [['wood', '4×4 wood in concrete'], ['steel', 'GFS 3 in steel, driven']], st.post)}
        <div class="readouts">
          <div><b class="mono" id="gWt"></b><small>lb of gate hanging on the hinges</small></div>
          <div><b class="mono" id="gPull"></b><small>lb pulling the top hinge off the post</small></div>
          <div><b class="mono" id="gDrop"></b><small>the latch side has dropped since it was hung</small></div>
          <div><b id="gState"></b><small id="gStateS"></small></div>
        </div>
        <p class="vis-note g3d-note" hidden>Everything moves at true size. Tap Show the math to see how each number is worked out.</p>
      </div>
    </div>
    ${math(`<p><b>Why wide gates sag more</b>: a gate hangs from one side, so its weight works like a lever on the hinges. The top hinge is pulled off the post and the bottom one is pushed in, each with the gate's weight times how far out its middle is, divided by the distance between the hinges. A 6 ft gate weighs about 40% more than a 4 ft one and its weight sits half again as far out, so it pulls about twice as hard on the top hinge.</p>
      <p><b>The frame</b>: with no brace, only the nails where the pickets cross the rails keep the gate square, and nails slip a little under steady load. Outdoors, wood joints creep: Eurocode 5 puts long-term movement of nailed wood joints kept outside at up to 5 times the first day's. Treated pine also goes up wet; as it dries, nails hold about 70% as well (the NDS wet-service factor).</p>
      <p><b>Which way a brace goes</b>: a brace from the bottom hinge corner up to the top latch corner is squeezed, so it bears wood on wood and props the latch side up. Run it the other way and it is pulled, so it hangs on the nails at its ends, pulled lengthwise. The NDS gives smooth nails a quarter of their hold in wood that dries after it's built, two-thirds of that again when toe-nailed: about 37 lb for four nails, less than a 4 ft gate asks of them. So the wrong-way brace lets go.</p>
      <p><b>Even a good brace drops a little</b>: the brace is cut to fit tight between the rails. As the rails dry they shrink across the grain (about 4½% for treated pine going from soaked to 12% moisture, from the USDA Wood Handbook), so each pocket opens about ⅛ in and the latch side settles about ⁵⁄₁₆ in before the brace bears again. That is why wood gates need an adjustment after the first year.</p>
      <p><b>GFS welded steel frame</b>: 1½ in square steel tube, welded all the way around and corner to corner. A welded frame doesn't slip, creep or shrink, so it stays square.</p>
      <p><b>The hinge post</b>: the pull on the top hinge bends the post. A 3 in steel post (2⅞ in Schedule 40 pipe) is about 2½ times stiffer than a 4×4 and doesn't creep; a 4×4 outdoors keeps bending a little more for years (Eurocode 5 creep for wood outside). Posts set in concrete also get lifted by frost, each a little differently, so the latch post and the hinge post drift apart. That share is an estimate, not a measurement: it is the Frost & posts picture for typical Toledo winters, and a wet yard or a hard winter moves posts more. GFS drives its steel 4 ft, below the frost line.</p>
      <p><b>What isn't counted</b>: kids swinging on the gate, slams, hinge screws working loose, rot, and a footing rocking in soft ground. Each of those only adds to the sag, so the frame and post numbers are the least a gate moves, not the most.</p>
      <p class="src">Sources: EN 1995-1-1 (Eurocode 5) Table 7.1 nail slip modulus, Table 3.2 and 2.3.2.2 creep; NDS for Wood Construction, nail withdrawal and wet-service factors; USDA Forest Products Laboratory, Wood Handbook (loblolly pine shrinkage and density); GFS brochure p. 23 (steel frame) and p. 6 (posts).</p>`)}`;
  const svg = $('.gate-svg', body);
  let scene = null, raf = 0, live = true;
  const frac = v => { const n = Math.round(Math.abs(v) * 16); if (!n) return '0'; const w = Math.floor(n / 16), r = n % 16; let f = ''; if (r) { let a = r, d = 16; while (a % 2 === 0) { a /= 2; d /= 2; } f = `${a}/${d}`; } return [w || '', f].filter(Boolean).join(' '); };
  // without 3D: the gate face-on from the rail side, movement drawn 4 times bigger
  const drawSvg = r => {
    const K = 4, ppi = 2.6, pw = st.w * 12 * ppi * .82, h = 66 * ppi, x0 = 210 - pw / 2, gy = 250, y0 = gy - 8 - h;
    const lift = [r.liftH, r.liftL].map(v => v * ppi * K), drop = r.drop * ppi * K;
    const at = (x, y) => [x, y + (x - x0) / pw * drop - lift[0]];
    const pts = [at(x0, y0), at(x0 + pw, y0), at(x0 + pw, y0 + h), at(x0, y0 + h)], P = p => p.map(v => v.toFixed(1)).join(',');
    const n = Math.max(4, Math.round(pw / 15));
    const pickets = Array.from({ length: n }, (_, i) => { const x = x0 + pw * (i + .5) / n, [tx, ty] = at(x, y0 - 10), [, by] = at(x, y0 + h + 4); return `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#c98a5b" stroke-width="${(pw / n - 1.5).toFixed(1)}"/>`; }).join('');
    const steel = st.brace === 'steel', frame = steel ? '#1c1e21' : '#7a4f2f';
    const brace = st.brace === 'right' || steel ? [pts[3], pts[1]] : st.brace === 'wrong' ? [pts[0], pts[2]] : null;
    const postX = [x0 - 14, x0 + pw + 14], postW = st.post === 'steel' ? 22 : 14;
    svg.innerHTML = `
      <rect x="0" y="${gy}" width="420" height="${300 - gy}" fill="#1b2c1e"/>
      ${postX.map((x, k) => `<rect x="${x - postW / 2}" y="${y0 - 22 - lift[k]}" width="${postW}" height="${gy - y0 + 22}" fill="${st.post === 'steel' ? '#b99a68' : '#8f6a46'}"/>`).join('')}
      ${pickets}
      <polyline points="${P(pts[0])} ${P(pts[1])}" stroke="${frame}" stroke-width="9" fill="none"/>
      <polyline points="${P(pts[3])} ${P(pts[2])}" stroke="${frame}" stroke-width="9" fill="none"/>
      ${steel ? `<polygon points="${pts.map(P).join(' ')}" fill="none" stroke="${frame}" stroke-width="6"/>` : ''}
      ${brace ? `<line x1="${brace[0][0].toFixed(1)}" y1="${brace[0][1].toFixed(1)}" x2="${brace[1][0].toFixed(1)}" y2="${brace[1][1].toFixed(1)}" stroke="${steel ? frame : st.brace === 'right' ? '#3ecf8e' : '#ef5b5b'}" stroke-width="7" stroke-linecap="round"/>` : ''}
      <rect x="${postX[1] - postW / 2 - 9}" y="${(y0 + h * .4 - lift[1]).toFixed(1)}" width="9" height="7" fill="#20262c"/>
      <rect x="${(x0 + pw - 10).toFixed(1)}" y="${(at(x0 + pw, y0 + h * .4)[1] + 1).toFixed(1)}" width="10" height="5" fill="#20262c"/>
      <text x="210" y="22" text-anchor="middle" class="svg-n">${st.w} ft gate · latch side ${r.drop < 1 / 32 ? 'hasn’t dropped' : 'down ' + frac(r.drop) + ' in'}</text>`;
  };
  const draw = () => {
    const r = scene ? scene.numbers() : sag(gateGeom(st.w, st.brace), st);
    $('[data-out=gw]', body).textContent = st.w + ' ft'; $('[data-out=y]', body).textContent = st.y < .05 ? 'Day one' : `${Math.floor(st.y)} yr${Math.floor(st.y) === 1 ? '' : 's'}`;
    $('#gWt', body).textContent = fmt(r.weightLb); $('#gPull', body).textContent = fmt(r.pullLb);
    $('#gDrop', body).textContent = r.drop < 1 / 32 ? '0 in' : frac(r.drop) + ' in';
    const off = r.offset;
    $('#gState', body).textContent = off < 1 / 16 ? 'Still where it was hung' : off <= LATCH.cleanIn ? 'Still latches' : off <= LATCH.maxIn ? 'Latches, but needs adjusting' : 'Won’t latch';
    $('#gStateS', body).textContent = off < 1 / 16 ? 'The rod on the gate still goes straight into the latch on the post.' : `The rod on the gate now sits ${frac(off)} in lower than the latch on the post${r.liftL > .05 ? ', partly because frost has lifted the posts unevenly' : ''}.`;
    if (!scene) drawSvg(r);
  };
  const setOpt = o => { Object.assign(st, o); if (scene) scene.set({ w: st.w, brace: st.brace, post: st.post, y: st.y }); draw(); };
  const play = () => {
    if (st.playing) { st.playing = false; $('#gtPlay', body).textContent = 'Play 15 years'; return; }
    if (st.y >= 14.9) st.y = 0;
    if (reduced.matches) { setOpt({ y: 15 }); $('[name=y]', body).value = 15; return; }
    st.playing = true; $('#gtPlay', body).textContent = 'Pause';
    let last = performance.now();
    const step = now => { if (!st.playing || !live) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
      setOpt({ y: Math.min(15, st.y + dt * 1.2) }); $('[name=y]', body).value = st.y;
      if (st.y >= 15) { st.playing = false; $('#gtPlay', body).textContent = 'Play again'; return; } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  $('#gtPlay', body).onclick = play;
  $('[name=y]', body).oninput = e => { st.playing = false; $('#gtPlay', body).textContent = 'Play 15 years'; setOpt({ y: +e.target.value }); };
  $('[name=gw]', body).oninput = e => setOpt({ w: +e.target.value });
  bindSeg(body, (n, v) => { if (n === 'brace') setOpt({ brace: v }); if (n === 'gpost') setOpt({ post: v }); });
  if (webglOK()) {
    const host = $('.gate-3d', body); host.hidden = false; $('.lab-vis', body).hidden = true; $('.g3d-note', body).hidden = false;
    import('./gate3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); scene = m.createGateScene(host, { specs: app.live?.specs }); body.__gate = scene; scene.set({ w: st.w, brace: st.brace, post: st.post, y: st.y }); draw(); })
      .catch(() => { if (!live) return; host.hidden = true; $('.lab-vis', body).hidden = false; $('.g3d-note', body).hidden = true; scene = null; draw(); });
  }
  draw();
  return () => { live = false; st.playing = false; cancelAnimationFrame(raf); scene?.dispose(); scene = null; };
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
  { k: 'steel', n: 'Driven steel post', d: 'Galvanized Schedule 40 steel, 2⅜ in across, driven 4 ft into undisturbed ground. Below Toledo\'s frost line, with no concrete to heave and no wood underground to rot.' },
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
  { k: 'steel', n: 'Driven steel inside every post', d: 'A galvanized steel post is driven 4 ft into the ground. Steel adapters clamp onto it, and the vinyl post sleeves down over them. No concrete to lift in frost, and nothing gripping the vinyl at the ground.' },
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
      <div class="vs-years"><button class="btn sm primary" id="vsPlay">Play ${BUILD_YEARS} years</button>${slider('yr', 'Years', 0, BUILD_YEARS, .05, 0)}</div>
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
      <p><b>Why posts lift</b>: wet ground freezes onto a post and lifts it as the ground heaves. A post that stops inside the frozen layer (about 3 ft in Toledo) rides up a little each winter. A post in concrete can lift the whole footing. A post driven 4 ft is held below the frost line by soil that never freezes.</p>
      <p><b>Why a prefab panel sags</b>: the panel hangs between two posts on a light stapled frame, so its weight keeps working at the staples and joints. Ours spreads the load across rails nailed to a wood box on a steel post, with a flat 2×4 across the top holding the line.</p>
      <p><b>Vinyl in concrete</b>: a vinyl post sunk in a concrete plug has the same frost problem as any footing, and the concrete holds the vinyl rigid right at the ground, which is where a pushed post cracks. GFS drives a galvanized steel post, clamps steel adapters to it, and sleeves the vinyl post over the adapters, so there is no footing to lift.</p>
      <p><b>How long a store fence lasts</b>: Fannie Mae's useful-life table gives a 6 ft wood privacy fence 15 years, 10 to 20 at the outside. We give the store fence longer than that. Its posts lean as they rot at the soil line, then break there at 19 years set in dirt and 21 set in concrete. By then our wood is gray and a picket or two may need replacing, but the posts are steel, so the fence is still standing straight.</p>
      <p class="src">The specs and comparisons here are the ones printed in the GFS brochure (pages 5, 6, 14, 25 and 31). How fast any one fence goes varies from yard to yard; this is a typical case, not a measurement.</p>`)}`;
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
    if (st.playing) { st.playing = false; $('#vsPlay', body).textContent = `Play ${BUILD_YEARS} years`; return; }
    if (st.years >= BUILD_YEARS - .1) st.years = 0;
    st.playing = true; $('#vsPlay', body).textContent = 'Pause';
    let last = performance.now();
    const step = now => { if (!st.playing || !live) return; const dt = Math.min(.05, (now - last) / 1000); last = now;
      st.years = Math.min(BUILD_YEARS, st.years + dt * (reduced.matches ? 4 : 1.5)); $('[name=yr]', body).value = st.years; draw();
      if (st.years >= BUILD_YEARS) { st.playing = false; $('#vsPlay', body).textContent = 'Play again'; return; } raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  };
  $('#vsPlay', body).onclick = play;
  $('[name=yr]', body).oninput = e => { st.playing = false; $('#vsPlay', body).textContent = `Play ${BUILD_YEARS} years`; st.years = +e.target.value; draw(); };
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
    import('./build3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); yard3d = m.createBuildScene(host, { specs: app.live?.specs }); body.__build = yard3d; draw(); })
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
  let V = 58, wob = 0, raf = 0, live = true, scene = null;
  const h = tube(B, HOME), g = tube(B, BIG), stiff = h.I / g.I, more = h.A / g.A;
  body.innerHTML = `
    <div class="vinyl-3d l3d-host" hidden><div class="l3d-wait"><span></span>Loading the posts in 3D…</div></div>
    <div class="lab-ctl vs-ctl">${slider('V', 'Gust speed', 20, 90, 1, V, ' mph')}</div>
    <div class="lab-grid">
      <div class="lab-vis"><svg class="vinyl-svg" viewBox="0 0 420 330" aria-label="Two vinyl posts bending in the wind"></svg>
        <div class="vis-note">Walls drawn thicker so you can see the difference. Bend drawn twice as big as life.</div></div>
      <div class="lab-ctl">
        <div class="readouts">
          <div><b class="mono" id="vBig"></b><small>big-box post bends at the top</small></div>
          <div><b class="mono" id="vGfs"></b><small>GFS post bends at the top</small></div>
          <div><b class="mono">${fmt((stiff - 1) * 100, 0)}%</b><small>stiffer vinyl, from a wall just .015 in thicker</small></div>
          <div><b class="mono" id="vLoad"></b><small>lb of wind on each 6 ft × 8 ft section right now</small></div>
        </div>
        <svg class="vinyl-sec" viewBox="0 0 320 150" aria-label="The two posts cut across at the ground"></svg>
        <p class="lab-note">The wall is the part you can't see in the store, and it's where cheaper vinyl saves money. Homeland prints it on the spec sheet: 5 in × 5 in posts at .150 in. Ours also sleeves over a steel post driven 4 ft, and the steel does most of the work.</p>
      </div>
    </div>
    ${math(`<p><b>Section properties of a square tube</b> (outside size b, wall t): area A = b² − (b − 2t)², moment of inertia I = [b⁴ − (b − 2t)⁴] / 12. Homeland 5 in at .150 in: A = ${fmt(h.A, 3)} in², I = ${fmt(h.I, 2)} in⁴. Big-box .135 in at the same 5 in: A = ${fmt(g.A, 3)} in², I = ${fmt(g.I, 2)} in⁴. For the same load a post bends in proportion to 1/I, so the thicker wall alone bends ${fmt((1 - 1 / stiff) * 100, 1)}% less.</p>
      <p><b>The wind</b> on each 8 ft section uses the ASCE 7 numbers from the Wind tool (solid 6 ft fence, houses and trees around). It reaches each post through the bottom and top rails, split so the push centres at 0.55 of the height, as ASCE 7 does for walls.</p>
      <p><b>The bend</b> is worked out up the post from the ground, curvature = moment ÷ (E × I). Rigid PVC: E about 392,000 psi (2,700 MPa). The big-box post is vinyl alone. Ours is vinyl over a 2⅜ in Schedule 40 steel post (E 29,000,000 psi, I = 0.666 in⁴) that stands 4 ft above the ground; to there the two bend together, and the steel takes about four-fifths of it.</p>
      <p><b>Not counted</b>: the footing or the ground giving a little, which adds about the same to both. This shows how far each post bends; it isn't a rating of how much wind either fence can stand.</p>
      <p class="src">Wall thicknesses from the GFS brochure, p. 31 (big-box .135 in vs Homeland .150 in) and p. 36 (Homeland 5 in × 5 in at .150 in); steel from the brochure spec sheets. The big-box post is drawn at the same 5 in size so only the wall and the steel change. Vinyl in 3D is the app's Kingston section.</p>`)}`;
  const svg = $('.vinyl-svg', body), sec = $('.vinyl-sec', body);
  // the two posts cut across at the ground, walls drawn 4 times thicker so the difference shows
  sec.innerHTML = [[80, BIG, false, 'BIG-BOX .135 IN'], [240, HOME, true, 'GFS .150 IN + STEEL']].map(([cx, t, steel, lab]) => {
    const s = 5 * 15, w = t * 15 * 4, y = 12;
    return `<rect x="${cx - s / 2}" y="${y}" width="${s}" height="${s}" fill="#eef0f1"/><rect x="${cx - s / 2 + w}" y="${y + w}" width="${s - 2 * w}" height="${s - 2 * w}" fill="#0f2034"/>
      ${steel ? `<circle cx="${cx}" cy="${y + s / 2}" r="${2.375 / 2 * 15}" fill="#9fb0bd"/><circle cx="${cx}" cy="${y + s / 2}" r="${(2.375 / 2 - .154 * 2) * 15}" fill="#0f2034"/>` : ''}
      <text x="${cx}" y="${y + s + 18}" text-anchor="middle" class="svg-l">${lab}</text>`;
  }).join('') + `<text x="160" y="128" text-anchor="middle" class="svg-l" opacity=".7">CUT ACROSS AT THE GROUND</text><text x="160" y="144" text-anchor="middle" class="svg-l" opacity=".7">WALLS DRAWN 4× THICKER</text>`;
  const draw = () => {
    const load = windLoad({ V, h: 6, exposure: 'B', style: WSTYLES[0] });
    $('[data-out=V]', body).textContent = V + ' mph'; $('#vLoad', body).textContent = fmt(load.perPost, 0);
    if (scene) {
      const r = scene.set({ V, perPost: load.perPost });
      $('#vBig', body).textContent = fmt(r.big.top, 1) + ' in'; $('#vGfs', body).textContent = fmt(r.gfs.top, 1) + ' in';
      return;
    }
    // without 3D: the same beam numbers, drawn twice as big as life (the posts are 2.3 px to the inch)
    const r = bends(load.perPost), k = 2.3 * 2 * (reduced.matches ? 1 : 1 + .08 * Math.sin(wob));
    $('#vBig', body).textContent = fmt(r.big.top, 1) + ' in'; $('#vGfs', body).textContent = fmt(r.gfs.top, 1) + ' in';
    const post = (x, bend, t, label, good) => {
      const top = 70, gy = 250, tipX = x + bend;
      const sec = (cx, cy) => { const s = 5 * 8, w = t * 8 * 6; return `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${good ? '#f4f6f8' : '#e6e8ea'}"/><rect x="${cx - s / 2 + w}" y="${cy - s / 2 + w}" width="${s - 2 * w}" height="${s - 2 * w}" fill="#0f2034"/>${good ? `<circle cx="${cx}" cy="${cy}" r="9.5" fill="none" stroke="#9fb0bd" stroke-width="2.4"/>` : ''}`; };
      return `<path d="M${x - 11},${gy} Q${x - 11},${(gy + top) / 2} ${tipX - 11},${top} L${tipX + 11},${top} Q${x + 11},${(gy + top) / 2} ${x + 11},${gy} Z" fill="${good ? '#f4f6f8' : '#e6e8ea'}" stroke="#9aa8b6"/>
        <rect x="${tipX - 13}" y="${top - 8}" width="26" height="8" rx="2" fill="${good ? '#f4f6f8' : '#e6e8ea'}" stroke="#9aa8b6"/>
        ${bend > 1 ? `<path d="M${x},${top - 18} h${bend}" stroke="${good ? '#3ecf8e' : '#ef5b5b'}" stroke-width="2"/><path d="M${x + bend},${top - 22} v8" stroke="${good ? '#3ecf8e' : '#ef5b5b'}" stroke-width="2"/>` : ''}
        ${sec(x, gy + 40)}
        <text x="${x}" y="${gy + 78}" text-anchor="middle" class="svg-n">${label}</text>
        <text x="${x}" y="${gy + 94}" text-anchor="middle" class="svg-l">${t.toFixed(3).replace(/^0/, '')}″ WALL</text>`;
    };
    svg.innerHTML = `<rect width="420" height="250" fill="#0f2034"/><rect y="250" width="420" height="80" fill="#1b2c1e"/>
      ${post(120, r.big.top * k, BIG, 'Big-box vinyl', false)}${post(300, r.gfs.top * k, HOME, 'GFS over steel', true)}
      <text x="210" y="34" text-anchor="middle" class="svg-big">${V} mph →</text>`;
  };
  const tick = () => { wob += .08; draw(); if (live && !scene && vis.on && !reduced.matches) raf = requestAnimationFrame(tick); };
  const vis = onScreen($('.vinyl-svg', body), () => { if (live && !scene && !reduced.matches) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); } });
  $('[name=V]', body).oninput = e => { V = +e.target.value; if (reduced.matches || scene) draw(); };
  if (webglOK()) {
    const host = $('.vinyl-3d', body); host.hidden = false; $('.lab-vis', body).hidden = true;
    import('./vinyl3d.mjs').then(m => { if (!live) return; $('.l3d-wait', host).remove(); scene = m.createVinylScene(host, { specs: app.live?.specs }); body.__vinyl = scene; cancelAnimationFrame(raf); draw(); })
      .catch(() => { if (!live) return; host.hidden = true; $('.lab-vis', body).hidden = false; scene = null; tick(); });
  }
  tick();
  return () => { live = false; cancelAnimationFrame(raf); vis.stop(); scene?.dispose(); scene = null; };
}

// Grade Lab lives in its own file; it loads the first time it's opened.
function gradeTool(body) {
  let stopFn = null, gone = false;
  body.innerHTML = '<div class="lab-vis" style="min-height:320px;display:grid;place-items:center;color:var(--dim)">Loading Grade Lab…</div>';
  import('./gradelab.mjs').then(m => { if (gone || current !== 'grade') return; body.innerHTML = ''; stopFn = m.grade(body, { seg, bindSeg, math, fmt, specs: app.live?.specs }); liveWrap(body); });
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
        <div role="row"><span>In winter</span><b>Frozen ground to dig, concrete to keep from freezing</b><b class="g">We drive posts all winter</b></div>
      </div>
    </div>
    <div class="lab-card">
      <div class="lab-label">All of that dirt in one pile</div>
      <svg class="dig-pile" viewBox="0 0 380 170" role="img" aria-label="The dirt from every post hole in one pile, next to a 6 foot person"></svg>
      <p class="lab-note" id="dgPileT"></p>
      <div class="dig-barrows" id="dgBar" aria-hidden="true"></div>
      <p class="lab-note">It's subsoil, not topsoil, so it either gets spread on the lawn or hauled away. With driven posts there's nothing to spread and nothing to haul.</p>
    </div>
    ${math(`<p><b>One dug hole</b>: 10 in across and 36 in deep, the size we dig ourselves when a yard calls for concrete. Volume = π × (5 in)² × 36 in = <span class="mono" id="mH"></span> cu ft of dirt in the ground.</p>
      <p><b>Dirt once it's dug</b>: loose dirt takes up about 30% more room than it did in the ground, and the heavy subsoil around here weighs about 110 lb per cu ft in the ground. A contractor wheelbarrow holds 6 cu ft.</p>
      <p><b>Concrete</b>: we fill the hole three-quarters of the way with concrete around the 4×4, 27 in of the 36, then tamp dirt over it up to the lawn. An 80 lb bag makes about 0.6 cu ft (manufacturer yield for 80 lb bags), so about 2 bags a post.</p>
      <p><b>Dirt left over</b>: what came out of the hole, less what gets tamped back in over the concrete.</p>
      <p><b>Posts</b>: one every 8 ft plus one at the end. Gate posts would add more.</p>
      <p class="src">Driven posts suit most yards around Toledo. Where the ground calls for it we set posts in concrete instead, and we check before we quote.</p>`)}`;
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
    const perPost = Math.ceil(digNumbers(8).concFt3 / .6 * 10) / 10;
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
    if (p >= .99) s += `<text x="190" y="${G + 72}" text-anchor="middle" class="svg-l halo" fill="#ffd2b0">DIRT PILES LEFT ON THE LAWN</text>`;
    A.innerHTML = s;
    const holes = PX.filter((x, i) => p > .02 + i * .1).length;
    $('#dgA', body).textContent = p <= 0 ? 'A clean yard, before anyone digs.' : p < .45 ? `Digging hole ${Math.min(4, holes)} of 4. Every hole leaves a pile of dirt on the lawn.` : p < .82 ? 'Setting each post in concrete and tamping dirt over it.' : 'Fence up, plus 4 dirt piles to spread or haul away.';
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
    if (p >= .99 || p === 0) s += `<text x="190" y="${G + 72}" text-anchor="middle" class="svg-l halo" fill="#b5f3d4">${p === 0 ? 'SAME YARD' : 'NO DIRT. NO CONCRETE. LAWN LEFT AS IT WAS.'}</text>`;
    B.innerHTML = s;
    $('#dgB', body).textContent = p <= 0 ? 'The same yard.' : p < .32 ? 'Driving each steel post 4 ft into the ground. Nothing comes out of it.' : p < .6 ? 'Building the fence on the posts right away.' : 'Done, with nothing to clean up but scraps.';
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
    $('#dgPileT', body).textContent = `${n.posts} holes for a ${st.len} ft fence. About ${fmt(n.lb / 2000, 1)} tons of dirt, ${fmt(Math.ceil(n.barrows))} wheelbarrow loads.`;
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
      scene = m.createDigScene(host, { len: st.len, specs: app.live?.specs }); body.__dig = scene; dur = m.DUR; paint();
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
