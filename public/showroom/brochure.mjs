// Brochure mode: a real page-turning book.
//  • one finger drags a page corner over (curling strips, live shading)
//  • tap the outer edge to turn, tap a photo to explore it, tap the middle to hide the chrome
//  • pinch in to zoom (high-res pages swap in), double-tap to zoom to a spot
//  • pinch out to fly every page into a flowing deck with search
import { $, $$, esc, clamp, pageImg, icons, spring, tween, ring, fly, tokens, snippet, reduced, toast, cssUrl, asset } from './ui.mjs';
import { initPhotos, openPhotos, execItems } from './photos.mjs';
import { visit } from './visit.mjs';

const N_STRIPS = 12, ASPECT = 900 / 1165;
let app, root, D;
let cur = 1, spread = false, chromeHidden = false;
let els = {}, size = { w: 0, h: 0 }, base = { x: 0, y: 0 };
let view = { s: 1, x: 0, y: 0 };
let flip = null, busy = false, overviewOn = false, hiTimer = 0;
const SYN = { dog: ['dog', 'pet'], dogs: ['dog', 'pet'], pet: ['pet', 'dog'], price: ['price', 'quote', 'cost', '$'], cost: ['cost', 'price', 'quote'], permit: ['permit', 'zoning', 'rules'], rules: ['rules', 'permit', 'code'], color: ['color', 'colour', 'colors'], colors: ['color', 'colors'], tall: ['tall', '8', 'midrail'], privacy: ['privacy'], warranty: ['warranty'], finance: ['financ', 'payment'], financing: ['financ', 'payment'], pay: ['pay', 'financ'], gate: ['gate'], gates: ['gate'], posts: ['post'], post: ['post'], nodig: ['no-dig', 'driven'], 'no-dig': ['no-dig', 'driven'], aluminium: ['aluminum'], pvc: ['vinyl'], plastic: ['vinyl'], wooden: ['wood', 'cedar'], horse: ['ranch', 'split rail'], farm: ['ranch', 'split rail'], pool: ['lifegard', 'pool'], kids: ['lifegard', 'kids'] };

export async function init(a, el) {
  app = a; root = el; D = app.data; initPhotos(app);
  root.innerHTML = `
    <div class="stage">
      <div class="book-wrap"><div class="book">
        <div class="slot l"></div><div class="slot r"></div><div class="spine"></div><div class="under-shade"></div>
      </div></div>
    </div>
    <div class="zoom-badge mono"></div>
    <div class="pinch-hint">${icons.pinch}<span>Let go to see every page</span></div>
    <div class="pager"><span class="t"></span><span class="n"></span>
      <button data-p="-1" aria-label="Previous page">${icons.back}</button><button data-p="1" aria-label="Next page">${icons.next}</button>
      <button data-p="all" aria-label="All pages">${icons.layers}</button><button data-p="heart" class="heartbtn" aria-label="Save this page to the visit" aria-pressed="false">${icons.heart}</button></div>
    <div class="progress"><i></i></div>
    <div class="overview" aria-hidden="true">
      <div class="ov-head">
        <label class="search">${icons.search}<input type="search" placeholder="Search styles, specs, towns, warranty…" enterkeyhint="search" autocomplete="off" aria-label="Search the brochure"><button class="x" hidden aria-label="Clear">${icons.close}</button></label>
        <div class="chips"></div>
      </div>
      <div class="flow"><div class="rail"></div></div>
      <div class="ov-foot">
        <div class="ov-title"><span class="mono"></span><h2></h2></div>
        <div class="scrub"><div class="ticks"></div><i class="knob"></i></div>
      </div>
    </div>`;
  els = {
    stage: $('.stage', root), wrap: $('.book-wrap', root), book: $('.book', root), l: $('.slot.l', root), r: $('.slot.r', root), shade: $('.under-shade', root),
    badge: $('.zoom-badge', root), hint: $('.pinch-hint', root), pager: $('.pager', root), bar: $('.progress i', root),
    ov: $('.overview', root), flow: $('.flow', root), rail: $('.flow .rail', root), input: $('.overview input', root), chips: $('.overview .chips', root),
    ovTitle: $('.ov-title h2', root), ovNo: $('.ov-title .mono', root), ticks: $('.scrub .ticks', root), knob: $('.scrub .knob', root), scrub: $('.scrub', root)
  };
  try { cur = clamp(+localStorage.getItem('gfs-showroom-page') || 1, 1, D.pages.length); } catch {}
  buildOverview();
  bindGestures();
  els.pager.onclick = e => { const p = e.target.closest('[data-p]')?.dataset.p; if (p === 'heart') { const n = spread ? (viewPages()[1] || viewPages()[0]) : cur; const on = visit.togglePage(n); toast(on ? `Page ${n} saved to this visit` : 'Removed from this visit', 1400); paint(); } else if (p === 'all') openOverview(); else if (p) turn(+p); };
  addEventListener('resize', () => { if (root.classList.contains('on')) { layout(); if (overviewOn) { sizeBooklet(); scrollToCard(+centerCard()?.dataset.n || cur, false); } } });
  addEventListener('keydown', e => {
    if (app.mode !== 'brochure' || e.target.matches('input')) return;
    if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1);
    if (e.key === 'Escape' && overviewOn) closeOverview(); else if (e.key === '/' ) { e.preventDefault(); openOverview({ focus: true }); }
  });
}

export function show(opts = {}) {
  layout();
  if (opts.page) goTo(opts.page, false);
  if (opts.overview) openOverview({ focus: opts.focus });
  else if (overviewOn) closeOverview(true);
  try { if (!localStorage.getItem('gfs-showroom-coach')) { coach(); localStorage.setItem('gfs-showroom-coach', '1'); } } catch {}
}
export function hide() { document.body.classList.remove('chrome-hidden'); chromeHidden = false; }

function coach() {
  const c = document.createElement('div'); c.className = 'coach';
  c.innerHTML = '<span><b>Drag</b> a page to turn it</span><span><b>Tap</b> a photo to explore</span><span><b>Pinch out</b> for every page</span>';
  root.append(c); setTimeout(() => { c.style.transition = 'opacity .6s'; c.style.opacity = '0'; setTimeout(() => c.remove(), 700); }, 5200);
  setTimeout(() => { els.book.classList.add('hint-spots'); setTimeout(() => els.book.classList.remove('hint-spots'), 3400); }, 900);
}

// ── Layout & content ─────────────────────────────────────────────
function viewPages(p = cur) {
  if (!spread) return [null, p];
  const n = D.pages.length;
  if (p === 1) return [null, 1];
  const left = p % 2 === 0 ? p : p - 1;
  return [left, left + 1 <= n ? left + 1 : null];
}
const firstOf = p => { const [l, r] = viewPages(p); return l || r; };

function layout() {
  const cs = getComputedStyle(els.stage);
  const box = { w: els.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h: els.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) };
  spread = box.w > box.h * 1.15 && box.w >= 820;
  const cols = spread ? 2 : 1;
  let h = box.h, w = h * ASPECT * cols;
  if (w > box.w) { w = box.w; h = w / ASPECT / cols; }
  size = { w: Math.floor(w), h: Math.floor(h), page: Math.floor(w / cols) };
  Object.assign(els.book.style, { width: size.w + 'px', height: size.h + 'px' });
  Object.assign(els.wrap.style, { width: size.w + 'px', height: size.h + 'px' });
  els.book.classList.toggle('single', !spread);
  setView({ s: 1, x: 0, y: 0 });
  paint();
}

// Pages that have a matching hands-on tool in the Fence Lab.
const LAB_PAGES = { 5: 'build', 6: 'build', 22: 'build', 14: 'build', 9: 'life', 10: 'wood', 11: 'life', 15: 'wind', 23: 'gate', 27: 'wood', 54: 'life', 61: 'grade', 77: 'life', 31: 'vinyl', 32: 'vinyl', 36: 'vinyl', 7: 'frost' };
const LAB_NAMES = { build: 'Our build vs prefab', grade: 'Grade Lab', vinyl: 'Vinyl walls', frost: 'Frost & posts', life: 'Lifespan', wood: 'Wood movement', wind: 'Wind', gate: 'Gate sag' };
function setSlot(slot, n) {
  slot.innerHTML = '';
  if (!n) { slot.classList.add('blank'); slot.style.backgroundImage = 'none'; slot.dataset.n = ''; return; }
  slot.classList.remove('blank'); slot.dataset.n = n;
  slot.style.backgroundImage = `url('${pageImg(n, view.s > 1.3)}'), url('${pageImg(n)}')`;
  for (const [i, sp] of D.page(n).spots.entries()) {
    const h = document.createElement('i'); h.className = 'hot'; h.dataset.i = i;
    Object.assign(h.style, { left: sp.r[0] * 100 + '%', top: sp.r[1] * 100 + '%', width: sp.r[2] * 100 + '%', height: sp.r[3] * 100 + '%' });
    slot.append(h);
  }
  const tool = LAB_PAGES[n];
  if (tool) { const b = document.createElement('span'); b.className = 'lab-try'; b.dataset.tool = tool; b.innerHTML = `${icons.spark}<b>Try it</b><small>${LAB_NAMES[tool]} · Fence Lab</small>`; slot.append(b); }
}

function paint() {
  const [l, r] = viewPages();
  setSlot(els.l, spread ? l : null); setSlot(els.r, spread ? r : cur);
  const p = D.page(firstOf(cur));
  const label = spread && l && r ? `${l}–${r}` : String(spread ? (l || r) : cur);
  $('.t', els.pager).textContent = spread && l && r ? `${D.page(l).title} · ${D.page(r).title}` : p.title;
  $('.n', els.pager).textContent = `${label} / ${D.pages.length}`;
  $('[data-p=heart]', els.pager).setAttribute('aria-pressed', String(visit.hasPage(spread ? (r || l) : cur)));
  els.bar.style.width = ((spread ? (r || l) : cur) / D.pages.length * 100) + '%';
  // Page edges: the read pages stack up on the left, the rest on the right, like a real booklet.
  const at = (spread ? (r || l) : cur) / D.pages.length;
  els.book.style.setProperty('--edge-l', (1.5 + at * 9).toFixed(1) + 'px');
  els.book.style.setProperty('--edge-r', (1.5 + (1 - at) * 9).toFixed(1) + 'px');
  try { localStorage.setItem('gfs-showroom-page', cur); } catch {}
  if (app.mode === 'brochure' && location.hash !== '#brochure-' + cur) history.replaceState(null, '', '#brochure-' + cur);
  // warm the next pages
  for (const n of [cur + 1, cur + 2, cur + 3, cur - 1, cur - 2]) if (n >= 1 && n <= D.pages.length) { const i = new Image(); i.src = pageImg(n); }
}

function goTo(n, animate = true) {
  n = clamp(n, 1, D.pages.length);
  if (n === cur || firstOf(n) === firstOf(cur)) { cur = n; paint(); return; }
  if (animate && Math.abs(firstOf(n) - firstOf(cur)) <= 2) return turn(n > cur ? 1 : -1);
  cur = n; paint();
}

// ── Page turning ─────────────────────────────────────────────────
function neighbor(dir) {
  if (!spread) { const n = cur + dir; return n >= 1 && n <= D.pages.length ? n : null; }
  const [l, r] = viewPages();
  if (dir > 0) { const n = (r || l) + 1; return n <= D.pages.length ? n : null; }
  const n = (l || r) - 1; return n >= 1 ? n : null;
}

function makeLeaf(dir) {
  const target = neighbor(dir); if (!target) return null;
  const [l, r] = viewPages(), [tl, tr] = viewPages(target);
  const w = spread ? size.page : size.w, h = size.h;
  let front, back;
  if (spread) {
    if (dir > 0) { front = r; back = tl; setSlot(els.r, tr); }
    else { front = tr; back = l; setSlot(els.l, tl); }
  } else {
    if (dir > 0) { front = cur; back = null; setSlot(els.r, target); }
    else { front = target; back = null; }
  }
  const leaf = document.createElement('div'); leaf.className = 'leaf';
  Object.assign(leaf.style, { left: spread ? size.page + 'px' : '0px', width: w + 'px', height: h + 'px' });
  const sw = w / N_STRIPS; let parent = leaf; const strips = [];
  const fimg = front ? `url('${pageImg(front)}')` : 'none';
  const bimg = back ? `url('${pageImg(back)}')` : `linear-gradient(rgba(255,255,255,.88),rgba(255,255,255,.88)), url('${pageImg(front)}')`;
  for (let i = 0; i < N_STRIPS; i++) {
    const s = document.createElement('div'); s.className = 'strip';
    Object.assign(s.style, { width: (sw + .6) + 'px', left: i ? sw + 'px' : '0px' });
    s.innerHTML = `<div class="f"><i></i></div><div class="b"><i></i></div>`;
    const f = s.firstChild, b = s.lastChild;
    Object.assign(f.style, { backgroundImage: fimg, backgroundSize: `${w}px ${h}px`, backgroundPosition: `${-i * sw}px 0` });
    Object.assign(b.style, { backgroundImage: bimg, backgroundSize: back ? `${w}px ${h}px` : `100% 100%, ${w}px ${h}px`, backgroundPosition: back ? `${-(w - (i + 1) * sw)}px 0` : `0 0, ${-(w - (i + 1) * sw)}px 0` });
    parent.append(s); parent = s; strips.push({ s, fo: f.firstChild, bo: b.firstChild });
  }
  els.book.append(leaf);
  return { dir, target, leaf, strips, w, p: 0 };
}

// p: 0 → 1 progress of the turn. Forward pages travel 0° → −180°, back pages −180° → 0°.
function drawLeaf(f, p) {
  f.p = p;
  const A = f.dir > 0 ? -180 * p : -180 * (1 - p);
  const bend = Math.sin(Math.PI * clamp(p, 0, 1)) * (spread ? 48 : 40) * (f.dir > 0 ? -1 : 1);
  let prev = 0;
  f.strips.forEach((st, i) => {
    const t = i / (N_STRIPS - 1), phi = clamp(A + bend * Math.pow(t, 1.7), -184, 4);
    st.s.style.transform = `rotateY(${(phi - prev).toFixed(2)}deg)`; prev = phi;
    const rad = phi * Math.PI / 180;
    st.fo.style.background = `rgba(10,16,24,${(0.42 * (1 - Math.cos(rad)) / 2).toFixed(3)})`;
    st.bo.style.background = `rgba(10,16,24,${(0.30 * (1 + Math.cos(rad)) / 2).toFixed(3)})`;
  });
  // shadow the page being uncovered, near the travelling edge
  const edge = Math.cos(A * Math.PI / 180), s = Math.sin(Math.PI * clamp(p, 0, 1));
  const sh = els.shade, half = spread ? size.page : size.w;
  if (f.dir > 0) Object.assign(sh.style, { left: spread ? half + 'px' : '0px', width: half + 'px', opacity: s.toFixed(3), background: `linear-gradient(90deg,transparent ${Math.max(0, edge * 100 - 18)}%,rgba(0,0,0,.38) ${Math.max(0, edge * 100)}%,transparent ${Math.min(100, edge * 100 + 26)}%)` });
  else Object.assign(sh.style, { left: '0px', width: (spread ? half : half) + 'px', opacity: (s * .9).toFixed(3), background: `linear-gradient(270deg,transparent ${Math.max(0, -edge * 100 - 18)}%,rgba(0,0,0,.32) ${Math.max(0, -edge * 100)}%,transparent ${Math.min(100, -edge * 100 + 26)}%)` });
}

async function finishFlip(f, complete, velocity = 0) {
  busy = true;
  await spring({ from: f.p, to: complete ? 1 : 0, velocity, stiffness: complete ? 170 : 240, damping: 24, onStep: x => drawLeaf(f, clamp(x, -0.02, 1.02)) });
  f.leaf.remove(); els.shade.style.opacity = '0';
  if (complete) cur = f.target;
  paint(); flip = null; busy = false;
}

async function turn(dir) {
  if (busy || flip || overviewOn) return;
  if (view.s > 1.02) { await resetZoom(); }
  const f = makeLeaf(dir);
  if (!f) { nudge(dir); return; }
  flip = f; drawLeaf(f, 0);
  await finishFlip(f, true, 1.6);
}

function nudge(dir) {
  toast(dir > 0 ? 'That’s the back cover' : 'You’re on the cover', 1400);
  tween(320, t => { els.wrap.style.translate = `${Math.sin(t * Math.PI * 3) * 10 * (1 - t) * -dir}px 0`; }).then(() => els.wrap.style.translate = '');
}

// ── Zoom & pan ───────────────────────────────────────────────────
function setView(v) {
  view = v;
  els.wrap.style.transformOrigin = '0 0';
  els.wrap.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`;
  els.badge.classList.toggle('on', v.s > 1.05);
  els.badge.textContent = `${v.s.toFixed(1)}×`;
  els.hint.classList.remove('on');
  clearTimeout(hiTimer);
  if (v.s > 1.3) hiTimer = setTimeout(() => { for (const s of [els.l, els.r]) if (s.dataset.n && !s.style.backgroundImage.includes('hires')) s.style.backgroundImage = `url('${pageImg(+s.dataset.n, true)}'), url('${pageImg(+s.dataset.n)}')`; }, 120);
}
function clampView(v) {
  const r = els.stage.getBoundingClientRect(), bw = size.w * v.s, bh = size.h * v.s;
  const baseRect = { x: els.wrap.offsetLeft, y: els.wrap.offsetTop };
  const fit = (pos, len, vp, b, off) => len <= vp ? (vp - len) / 2 - b + off : clamp(pos, vp - len - b + off - 30, -b + off + 30);
  return { s: v.s, x: fit(v.x, bw, r.width, baseRect.x, 0), y: fit(v.y, bh, r.height, baseRect.y, 0) };
}
async function animateView(to) {
  const from = { ...view };
  await tween(380, t => setView({ s: from.s + (to.s - from.s) * t, x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }));
}
const resetZoom = () => animateView({ s: 1, x: 0, y: 0 });
function zoomAt(clientX, clientY, s) {
  const wr = els.wrap.getBoundingClientRect();
  const lx = (clientX - wr.left) / view.s, ly = (clientY - wr.top) / view.s;
  const bx = wr.left - view.x, by = wr.top - view.y;
  return clampView({ s, x: clientX - bx - lx * s, y: clientY - by - ly * s });
}

// ── Gestures ─────────────────────────────────────────────────────
function bindGestures() {
  const pts = new Map(); let g = null, lastTap = { t: 0, x: 0, y: 0 }, tapTimer = 0;
  const st = els.stage;
  st.addEventListener('pointerdown', e => {
    if (overviewOn) return;
    st.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) {
      if (flip && !busy) { const f = flip; finishFlip(f, false); }
      const [a, b] = [...pts.values()];
      const wr = els.wrap.getBoundingClientRect();
      g = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: view.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, lx: ((a.x + b.x) / 2 - wr.left) / view.s, ly: ((a.y + b.y) / 2 - wr.top) / view.s, bx: wr.left - view.x, by: wr.top - view.y };
    } else if (pts.size === 1) {
      g = { type: 'pending', x0: e.clientX, y0: e.clientY, t0: performance.now(), vx: 0, lastX: e.clientX, lastT: performance.now(), view0: { ...view } };
    }
  });
  st.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.type === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const s = clamp(g.s0 * d / g.d0, 0.4, 5);
      if (s < 0.86 && g.s0 <= 1.05) { pts.clear(); g = null; openOverview({ fromPinch: true }); return; }
      setView({ s, x: mx - g.bx - g.lx * s, y: my - g.by - g.ly * s });
      return;
    }
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0, now = performance.now();
    g.vx = (e.clientX - g.lastX) / Math.max(1, now - g.lastT); g.lastX = e.clientX; g.lastT = now;
    if (g.type === 'pending' && Math.hypot(dx, dy) > 8) {
      if (view.s > 1.02) g.type = 'pan';
      else if (Math.abs(dx) > Math.abs(dy) * 0.9 && !busy) {
        const f = makeLeaf(dx < 0 ? 1 : -1);
        if (f) { flip = f; g.type = 'flip'; } else { g.type = 'none'; nudge(dx < 0 ? 1 : -1); }
      } else g.type = 'none';
    }
    if (g.type === 'pan') setView(clampView({ s: view.s, x: g.view0.x + dx, y: g.view0.y + dy }));
    if (g.type === 'flip' && flip) {
      const travel = flip.w * (spread ? 1.6 : 1.1);
      drawLeaf(flip, clamp((flip.dir > 0 ? -dx : dx) / travel, 0, 1));
    }
  });
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!g) return;
    if (g.type === 'pinch') {
      if (pts.size === 1) { const [p] = [...pts.values()]; g = { type: 'pan', x0: p.x, y0: p.y, view0: { ...view } }; return; }
      if (view.s < 0.8) { openOverview({ fromPinch: true }); }
      else if (view.s < 1.05) resetZoom();
      else animateView(clampView(view));
      g = null; return;
    }
    if (g.type === 'flip' && flip) {
      const v = (flip.dir > 0 ? -g.vx : g.vx);
      finishFlip(flip, flip.p > 0.38 || v > 0.45, Math.max(0, v * 2));
    } else if (g.type === 'pending' && performance.now() - g.t0 < 300) {
      const x = e.clientX, y = e.clientY, now = performance.now();
      if (now - lastTap.t < 300 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) {
        clearTimeout(tapTimer); lastTap.t = 0;
        animateView(view.s > 1.2 ? { s: 1, x: 0, y: 0 } : zoomAt(x, y, 2.6));
      } else {
        lastTap = { t: now, x, y };
        clearTimeout(tapTimer); tapTimer = setTimeout(() => tap(x, y), view.s > 1.02 ? 280 : 240);
      }
    }
    g = null;
  };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  st.addEventListener('wheel', e => {
    if (overviewOn) return; e.preventDefault();
    if (e.ctrlKey) { const s = clamp(view.s * Math.exp(-e.deltaY / 120), .4, 5); if (s < .8) { openOverview({ fromPinch: true }); return; } setView(s < 1.02 ? { s: 1, x: 0, y: 0 } : zoomAt(e.clientX, e.clientY, s)); }
    else if (view.s > 1.02) setView(clampView({ s: view.s, x: view.x - e.deltaX, y: view.y - e.deltaY }));
    else if (Math.abs(e.deltaX) > 30 && !busy) turn(e.deltaX > 0 ? 1 : -1);
  }, { passive: false });
  // Safari trackpad / iPad keyboard pinch events
  st.addEventListener('gesturestart', e => e.preventDefault());
}

function tap(x, y) {
  if (busy || overviewOn) return;
  // "Try it" link to the Fence Lab?
  const lab = document.elementFromPoint(x, y)?.closest('.lab-try');
  if (lab) { ring(x, y); return app.go('lab', { tool: lab.dataset.tool }); }
  // photo hotspot?
  for (const slot of [els.l, els.r]) {
    if (!slot.dataset.n) continue;
    const r = slot.getBoundingClientRect(); if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    const n = +slot.dataset.n, u = (x - r.left) / r.width, v = (y - r.top) / r.height, page = D.page(n);
    const i = page.spots.findIndex(s => u >= s.r[0] && u <= s.r[0] + s.r[2] && v >= s.r[1] && v <= s.r[1] + s.r[3]);
    if (i >= 0) { ring(x, y); return openSpot(n, i, slot); }
    const edge = spread ? (slot === els.l ? u < .2 : u > .8) : (u < .2 || u > .8);
    if (edge && view.s <= 1.02) return turn(spread ? (slot === els.l ? -1 : 1) : (u < .5 ? -1 : 1));
  }
  chromeHidden = !chromeHidden; document.body.classList.toggle('chrome-hidden', chromeHidden);
  setTimeout(layout, 460);
}

function openSpot(n, i, slot) {
  const page = D.page(n), sp = page.spots[i], r = slot.getBoundingClientRect();
  const from = { left: r.left + sp.r[0] * r.width, top: r.top + sp.r[1] * r.height, width: sp.r[2] * r.width, height: sp.r[3] * r.height };
  const first = { page: n, r: sp.r };
  const style = D.styles.find(s => s.pages.includes(n) && s.models.length) || D.styles.find(s => s.pages.includes(n));
  const more = execItems(style);
  const others = page.spots.filter((_, j) => j !== i).map(s => ({ page: n, r: s.r }));
  const sid = style?.id;
  openPhotos({ items: [first, ...others, ...more.slice(0, 40)].map(it => ({ ...it, styleId: sid })), index: 0, title: style ? style.name : page.title, sub: `Page ${n} · ${more.length ? more.length + ' style photos' : page.section}`, fromRect: from });
}

// ── Overview: every page, flowing deck, search ───────────────────
function buildOverview() {
  // The zoomed-out view is the booklet itself, open in 3D: a stack of pages on each side
  // of the spine, the two open pages dipping into the gutter, and pages that riffle over
  // the spine as you swipe. Each leaf carries two pages, front (odd) and back (even).
  els.flow.classList.add('book3d');
  const leaves = Math.ceil(D.pages.length / 2);
  els.rail.className = 'b3';
  els.rail.innerHTML = `<div class="b3-shadow"></div><div class="b3-cover l"></div><div class="b3-cover r"></div>` +
    Array.from({ length: leaves }, (_, j) => { const f = 2 * j + 1, b = 2 * j + 2;
      return `<div class="leaf3" data-j="${j}"><div class="face front" data-n="${f}" role="button" aria-label="Page ${f}: ${esc(D.page(f).title)}"><i class="shade"></i><span class="no">${f}</span></div>${b <= D.pages.length ? `<div class="face back" data-n="${b}" role="button" aria-label="Page ${b}: ${esc(D.page(b).title)}"><i class="shade"></i><span class="no">${b}</span></div>` : ''}</div>`; }).join('');
  bindBook();
  const secs = []; for (const p of D.pages) if (!secs.some(s => s.name === p.section)) secs.push({ name: p.section, n: p.n });
  els.chips.innerHTML = secs.map(s => `<button class="chip" data-n="${s.n}">${esc(s.name)} <span class="n">${s.n}</span></button>`).join('');
  els.ticks.innerHTML = D.pages.map(p => `<i data-n="${p.n}" class="${secs.some(s => s.n === p.n) ? 'sec' : ''}"></i>`).join('');
  els.chips.onclick = e => { const c = e.target.closest('.chip'); if (c) scrollToCard(+c.dataset.n, true); };
  const scrubTo = x => { const r = els.ticks.getBoundingClientRect(); scrollToCard(Math.round(clamp((x - r.left) / r.width, 0, 1) * (D.pages.length - 1)) + 1, false); };
  els.scrub.addEventListener('pointerdown', e => { els.scrub.setPointerCapture(e.pointerId); scrubTo(e.clientX); els.scrub.onpointermove = ev => scrubTo(ev.clientX); });
  els.scrub.addEventListener('pointerup', () => { els.scrub.onpointermove = null; });
  // close the deck by pinching it back in, or tapping empty space
  let down = null;
  els.ov.addEventListener('pointerdown', e => { down = e.target === els.ov ? { t: performance.now(), x: e.clientX, y: e.clientY } : null; });
  els.ov.addEventListener('pointerup', e => { if (down && performance.now() - down.t < 300 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) closeOverview(); down = null; });
  els.ov.addEventListener('gestureend', e => { if (e.scale > 1.25) closeOverview(); });
  // search
  const x = $('.x', els.ov);
  els.input.addEventListener('input', () => { x.hidden = !els.input.value; search(els.input.value); });
  els.input.addEventListener('keydown', e => { if (e.key === 'Enter') { els.input.blur(); const first = root.querySelector('.results .res'); first?.click(); } if (e.key === 'Escape') { els.input.value = ''; search(''); } });
  x.onclick = () => { els.input.value = ''; x.hidden = true; search(''); els.input.focus(); };
}

// ── 3D book ─────────────────────────────────────────────────────
// bk.pos is how many leaves have been turned (continuous while a page is in the air).
// At a whole number k the book is open to pages 2k (left) and 2k+1 (right).
const bk = { pos: 0, w: 200, h: 260, anim: 0, v: 0 };
const leafCount = () => Math.ceil(D.pages.length / 2);
const posOf = n => Math.floor(n / 2);
const focusPage = () => { const k = Math.round(bk.pos), right = 2 * k + 1; return right <= D.pages.length ? right : 2 * k; };
function centerCard() { return { dataset: { n: String(focusPage()) } }; }
function sizeBooklet() {
  const fw = els.flow.clientWidth, fh = els.flow.clientHeight;
  // two pages side by side, opened about 150°, have to fit the width; the height leaves room for the tilt
  const h = Math.max(160, Math.min(fh * .74, (fw * .84) / (2 * ASPECT * .97)));
  bk.h = Math.round(h); bk.w = Math.round(h * ASPECT);
  els.flow.style.setProperty('--pw', bk.w + 'px'); els.flow.style.setProperty('--ph', bk.h + 'px');
}
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function coverflow() {
  const P = bk.pos, open = 30, step = 1.6, show = 10;
  for (const el of els.rail.querySelectorAll('.leaf3')) {
    const j = +el.dataset.j, f = clamp(P - j, 0, 1);            // 0 = lying on the right, 1 = turned to the left
    const depth = f >= 1 ? (P - 1 - j) : f <= 0 ? (j - P) : 0;  // how far down its stack a page sits
    if (depth > show) { el.style.display = 'none'; continue; }
    el.style.display = '';
    if (!el.dataset.img) { el.dataset.img = '1'; for (const fc of el.querySelectorAll('.face')) fc.style.backgroundImage = `url('${pageImg(+fc.dataset.n)}')`; }
    const lift = Math.max(0, open - depth * step);              // pages lower in the stack lie a little flatter
    const a = f <= 0 ? -lift : f >= 1 ? -(180 - lift) : -(open + (180 - 2 * open) * ease(f));
    const bend = f > 0 && f < 1 ? Math.sin(Math.PI * f) : 0;
    el.style.transform = `translate3d(0,0,${(-depth * .6).toFixed(2)}px) rotateY(${a.toFixed(2)}deg)`;
    el.style.zIndex = String(500 - Math.round(depth * 10) + (bend ? 100 : 0));
    el.style.setProperty('--sh', (bend * .45 + depth * .05).toFixed(3));
    el.style.setProperty('--lift', (bend * 18).toFixed(1) + 'px');
  }
  // covers sit just under the deepest pages
  const turned = clamp(P, 0, leafCount());
  $('.b3-cover.l', els.rail).style.transform = `rotateY(${-(180 - Math.max(0, 30 - 11 * 1.6) + 1.5)}deg)`;
  $('.b3-cover.r', els.rail).style.transform = `rotateY(${-(Math.max(0, 30 - 11 * 1.6) - 1.5)}deg)`;
  $('.b3-cover.l', els.rail).style.opacity = turned > .02 ? '1' : '0';
  $('.b3-cover.r', els.rail).style.opacity = turned < leafCount() - .02 ? '1' : '0';
  const n = focusPage(), p = D.page(n), k = Math.round(P), left = 2 * k, right = 2 * k + 1;
  els.ovTitle.textContent = p.title;
  els.ovNo.textContent = `PAGE${left >= 1 && right <= D.pages.length ? `S ${left}–${right}` : ` ${n}`} · ${p.section.toUpperCase()}`;
  els.knob.style.left = ((n - 1) / (D.pages.length - 1) * 100) + '%';
  for (const ch of els.chips.children) ch.setAttribute('aria-pressed', String(ch.textContent.trim().startsWith(p.section)));
}
function setPos(p) { bk.pos = clamp(p, 0, leafCount()); coverflow(); }
// Spring the book to a whole leaf; a fast flick riffles through several pages on the way.
function settle(target) {
  cancelAnimationFrame(bk.anim);
  target = clamp(Math.round(target), 0, leafCount());
  if (reduced.matches) return setPos(target);
  let last = performance.now();
  const stepF = now => {
    const dt = Math.min(.032, (now - last) / 1000); last = now;
    const k = 120, c = 2 * Math.sqrt(k) * .9;                    // nearly critically damped
    bk.v += (-(bk.pos - target) * k - bk.v * c) * dt; bk.pos += bk.v * dt;
    if (Math.abs(bk.pos - target) < .002 && Math.abs(bk.v) < .02) { bk.v = 0; return setPos(target); }
    setPos(bk.pos); bk.anim = requestAnimationFrame(stepF);
  };
  bk.anim = requestAnimationFrame(stepF);
}
function scrollToCard(n, smooth) { const t = posOf(clamp(n, 1, D.pages.length)); if (smooth) settle(t); else { cancelAnimationFrame(bk.anim); bk.v = 0; setPos(t); } }
function bindBook() {
  let d = null;
  els.flow.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    cancelAnimationFrame(bk.anim); bk.v = 0;
    d = { x: e.clientX, y: e.clientY, p: bk.pos, t: performance.now(), hist: [[performance.now(), bk.pos]], moved: false };
    els.flow.setPointerCapture(e.pointerId);
  });
  els.flow.addEventListener('pointermove', e => {
    if (!d) return;
    const dx = e.clientX - d.x; if (Math.abs(dx) > 6) d.moved = true;
    setPos(d.p - dx / (bk.w * 1.15));                           // drag a page's width to turn one leaf
    d.hist.push([performance.now(), bk.pos]); if (d.hist.length > 6) d.hist.shift();
  });
  const end = e => {
    if (!d) return; const dd = d; d = null;
    if (!dd.moved && performance.now() - dd.t < 400) {             // a tap opens the page you tapped
      const face = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList?.contains('face'));
      if (face) return pickPage(+face.dataset.n, face);
      return settle(bk.pos);
    }
    const [t0, p0] = dd.hist[0], [t1, p1] = dd.hist[dd.hist.length - 1], v = (p1 - p0) / Math.max(16, t1 - t0) * 1000; // leaves per second
    bk.v = v; settle(bk.pos + v * .28);
  };
  els.flow.addEventListener('pointerup', end); els.flow.addEventListener('pointercancel', end);
  els.flow.addEventListener('wheel', e => { e.preventDefault(); cancelAnimationFrame(bk.anim); setPos(bk.pos + (e.deltaX || e.deltaY) / (bk.w * 1.15)); clearTimeout(bk.wt); bk.wt = setTimeout(() => settle(bk.pos), 120); }, { passive: false });
}

async function openOverview({ fromPinch = false, focus = false } = {}) {
  if (overviewOn) { if (focus) els.input.focus(); return; }
  overviewOn = true; els.ov.setAttribute('aria-hidden', 'false');
  document.body.classList.remove('chrome-hidden'); chromeHidden = false;
  sizeBooklet(); scrollToCard(cur, false);
  const from = (els.r.dataset.n == cur ? els.r : els.l).getBoundingClientRect();
  const card = els.rail.querySelector(`.face[data-n="${cur}"]`);
  els.ov.classList.add('on');
  els.wrap.style.transition = 'opacity .35s'; els.wrap.style.opacity = '0';
  if (!reduced.matches && card) {
    card.style.opacity = '0';
    requestAnimationFrame(async () => {
      const to = card.getBoundingClientRect();
      const f = await fly({ from, to, bg: `url('${pageImg(cur)}')`, ms: 520, radius: [2, 6] });
      card.style.opacity = ''; f.remove();
    });
  }
  setTimeout(() => { setView({ s: 1, x: 0, y: 0 }); els.hint.classList.remove('on'); }, 360);
  if (focus) setTimeout(() => els.input.focus(), 380);
  if (!fromPinch && !focus) {/* opened from the pager button */}
}

async function closeOverview(instant = false) {
  if (!overviewOn) return;
  overviewOn = false; els.ov.setAttribute('aria-hidden', 'true');
  els.ov.classList.remove('on'); $('.results', root)?.remove();
  els.wrap.style.transition = instant ? '' : 'opacity .45s'; els.wrap.style.opacity = '1';
  els.input.blur();
}

async function pickPage(n, fromEl) {
  const fr = fromEl?.getBoundingClientRect();
  cur = n; setView({ s: 1, x: 0, y: 0 }); paint();
  els.wrap.style.transition = ''; els.wrap.style.opacity = '0';
  const target = (els.r.dataset.n == n ? els.r : els.l).getBoundingClientRect();
  overviewOn = false; els.ov.classList.remove('on'); els.ov.setAttribute('aria-hidden', 'true'); $('.results', root)?.remove(); els.input.blur();
  if (fr && !reduced.matches) {
    const f = await fly({ from: fr, to: target, bg: `url('${pageImg(n)}')`, ms: 540, radius: [6, 2] });
    els.wrap.style.opacity = '1'; f.remove();
  } else els.wrap.style.opacity = '1';
}

function search(q) {
  $('.results', root)?.remove();
  for (const t of els.ticks.children) t.classList.remove('hit');
  for (const c of els.rail.querySelectorAll('.face')) c.classList.remove('dim');
  const words = tokens(q); if (!words.length) return;
  const groups = words.map(w => SYN[w] || [w]);
  const hits = text => { const t = text.toLowerCase(); let s = 0; for (const g of groups) { const m = g.find(w => t.includes(w)); if (!m) return 0; s += 1; } return s; };
  const pages = D.pages.map(p => { const all = hits(p_all(p)); return { p, s: all ? all + hits(p.title) * 4 + hits(p.section) * 2 : 0 }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s || a.p.n - b.p.n);
  const styles = D.styles.map(s => ({ s, sc: hits(`${s.name} ${s.line} ${s.keywords} ${D.familyById[s.family].name} ${(s.colors || []).join(' ')} ${(s.options || []).join(' ')}`) })).filter(x => x.sc).sort((a, b) => b.sc - a.sc).slice(0, 6);
  const towns = D.rules.filter(r => hits(`${r.name} ${r.state} ${r.county} fence rules permit`));
  const flat = groups.map(g => g[0]);
  const box = document.createElement('div'); box.className = 'results';
  let html = '';
  if (styles.length) html += `<h4>STYLES</h4>` + styles.map(({ s }) => { const ph = app.photosFor(s.models)[0]; return `<button class="res" data-style="${esc(s.id)}"><span class="th ph" style="background-image:${ph ? cssUrl(ph) : `url('${pageImg(s.pages[0])}')`}"></span><span><b>${esc(s.name)}</b><small>${esc(D.familyById[s.family].name)} · ${esc(s.line)}</small></span><span class="pg">${icons.next}</span></button>`; }).join('');
  if (towns.length) html += `<h4>FENCE RULES</h4>` + towns.map(t => `<button class="res" data-town="${esc(t.id)}"><span class="th ph" style="display:grid;place-items:center;background:rgba(61,127,224,.18);color:var(--blue-lt)">${icons.map}</span><span><b>${esc(t.name)}, ${esc(t.state)}</b><small>${t.front != null ? `Front ${t.front} ft · ` : ''}${t.side != null ? `Side/rear ${t.side} ft · ` : ''}${esc(t.permit)}</small></span><span class="pg">MAP</span></button>`).join('');
  if (pages.length) html += `<h4>${pages.length} BROCHURE PAGE${pages.length > 1 ? 'S' : ''}</h4>` + pages.slice(0, 40).map(({ p }) => `<button class="res" data-n="${p.n}"><span class="th" style="background-image:url('${pageImg(p.n)}')"></span><span><b>${esc(p.title)}</b><small>${snippet(p.text || p.title, flat)}</small></span><span class="pg">P.${p.n}</span></button>`).join('');
  if (!html) html = `<div class="empty">Nothing in the brochure matches “${esc(q)}”.</div>`;
  else if (pages.length > 1) html = `<button class="btn sm" data-flip style="justify-self:start;margin:4px">${icons.layers} Flip through the ${pages.length} pages</button>` + html;
  box.innerHTML = html; root.querySelector('.overview').append(box);
  for (const { p } of pages) { els.ticks.children[p.n - 1]?.classList.add('hit'); }
  box.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.flip !== undefined) { box.remove(); for (const c of els.rail.querySelectorAll('.face')) c.classList.toggle('dim', !pages.some(x => x.p.n === +c.dataset.n)); scrollToCard(pages[0].p.n, true); els.input.blur(); return; }
    if (b.dataset.n) pickPage(+b.dataset.n, b.querySelector('.th'));
    if (b.dataset.style) { closeOverview(true); app.go('styles', { style: b.dataset.style, detail: true }); }
    if (b.dataset.town) { closeOverview(true); app.go('permits', { town: b.dataset.town }); }
  };
}
const p_all = p => `${p.title} ${p.section} ${p.text}`;
