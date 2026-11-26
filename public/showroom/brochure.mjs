// Brochure mode: a real page-turning book.
//  • one finger drags a page corner over (curling strips, live shading)
//  • tap the outer edge to turn, tap a photo to explore it, tap the middle to hide the chrome
//  • pinch in to zoom (high-res pages swap in), double-tap to zoom to a spot
//  • pinch out to fly every page into a flowing deck with search
import { $, $$, esc, clamp, pageImg, icons, spring, tween, ring, fly, tokens, snippet, reduced, toast, cssUrl, asset } from './ui.mjs';
import { initPhotos, openPhotos, execItems } from './photos.mjs';

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
      <button data-p="all" aria-label="All pages">${icons.layers}</button></div>
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
  els.pager.onclick = e => { const p = e.target.closest('[data-p]')?.dataset.p; if (p === 'all') openOverview(); else if (p) turn(+p); };
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
}

function paint() {
  const [l, r] = viewPages();
  setSlot(els.l, spread ? l : null); setSlot(els.r, spread ? r : cur);
  const p = D.page(firstOf(cur));
  const label = spread && l && r ? `${l}–${r}` : String(spread ? (l || r) : cur);
  $('.t', els.pager).textContent = spread && l && r ? `${D.page(l).title} · ${D.page(r).title}` : p.title;
  $('.n', els.pager).textContent = `${label} / ${D.pages.length}`;
  els.bar.style.width = ((spread ? (r || l) : cur) / D.pages.length * 100) + '%';
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
  els.rail.innerHTML = D.pages.map(p => `<button class="card" data-n="${p.n}" aria-label="Page ${p.n}: ${esc(p.title)}" style="background-image:url('${pageImg(p.n)}')"><span class="no">${p.n}</span></button>`).join('');
  const secs = []; for (const p of D.pages) if (!secs.some(s => s.name === p.section)) secs.push({ name: p.section, n: p.n });
  els.chips.innerHTML = secs.map(s => `<button class="chip" data-n="${s.n}">${esc(s.name)} <span class="n">${s.n}</span></button>`).join('');
  els.ticks.innerHTML = D.pages.map(p => `<i data-n="${p.n}" class="${secs.some(s => s.n === p.n) ? 'sec' : ''}"></i>`).join('');
  let raf = 0;
  els.flow.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(coverflow); }, { passive: true });
  els.rail.onclick = e => { const c = e.target.closest('.card'); if (c) pickPage(+c.dataset.n, c); };
  els.chips.onclick = e => { const c = e.target.closest('.chip'); if (c) scrollToCard(+c.dataset.n, true); };
  const scrubTo = x => { const r = els.ticks.getBoundingClientRect(); scrollToCard(Math.round(clamp((x - r.left) / r.width, 0, 1) * (D.pages.length - 1)) + 1, false); };
  els.scrub.addEventListener('pointerdown', e => { els.scrub.setPointerCapture(e.pointerId); scrubTo(e.clientX); els.scrub.onpointermove = ev => scrubTo(ev.clientX); });
  els.scrub.addEventListener('pointerup', () => { els.scrub.onpointermove = null; });
  // close the deck by pinching it back in, or tapping empty space
  let down = null;
  els.ov.addEventListener('pointerdown', e => { down = (e.target === els.ov || e.target === els.flow || e.target === els.rail) ? { t: performance.now(), x: e.clientX, y: e.clientY } : null; });
  els.ov.addEventListener('pointerup', e => { if (down && performance.now() - down.t < 300 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && els.flow.scrollLeft === (els.flow._sl ?? els.flow.scrollLeft)) closeOverview(); down = null; });
  els.ov.addEventListener('gestureend', e => { if (e.scale > 1.25) closeOverview(); });
  // search
  const x = $('.x', els.ov);
  els.input.addEventListener('input', () => { x.hidden = !els.input.value; search(els.input.value); });
  els.input.addEventListener('keydown', e => { if (e.key === 'Enter') { els.input.blur(); const first = root.querySelector('.results .res'); first?.click(); } if (e.key === 'Escape') { els.input.value = ''; search(''); } });
  x.onclick = () => { els.input.value = ''; x.hidden = true; search(''); els.input.focus(); };
}

function centerCard() {
  const fr = els.flow.getBoundingClientRect(), mid = fr.left + fr.width / 2;
  let best = null, bd = 1e9;
  for (const c of els.rail.children) { const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = c; } }
  return best;
}
// The pinched-out view behaves like holding the booklet: one page big in the middle,
// the edges of the pages before and after it showing, and a thumb flick riffles through.
function sizeBooklet() {
  const fw = els.flow.clientWidth, fh = els.flow.clientHeight;
  const cw = Math.max(140, Math.min(fw * (fw < 700 ? .76 : .5), (fh - 24) * 900 / 1165));
  els.flow.style.setProperty('--cw', cw + 'px');
}
function coverflow() {
  const fr = els.flow.getBoundingClientRect(), cw = els.rail.firstElementChild?.offsetWidth || 200, pitch = cw + 14;
  for (const c of els.rail.children) {
    const r = c.offsetLeft + c.offsetWidth / 2 - els.flow.scrollLeft - fr.width / 2;
    const d = clamp(r / pitch, -4, 4), ad = Math.abs(d);
    if (ad > 3.5) { c.style.visibility = 'hidden'; continue; }
    c.style.visibility = '';
    const turn = Math.min(1, ad);                         // a page lifts off the stack as it leaves the middle
    c.style.transformOrigin = d > 0 ? '0% 50%' : '100% 50%';
    c.style.transform = `perspective(1100px) translateX(${-Math.sign(d) * Math.max(0, ad - 1) * cw * .78}px) rotateY(${Math.sign(d) * (turn * 34 + Math.max(0, ad - 1) * 8)}deg) scale(${1 - turn * .05})`;
    c.style.zIndex = String(100 - Math.round(ad * 10));
    c.style.setProperty('--shade', (turn * .55 + Math.max(0, ad - 1) * .2).toFixed(2));
    c.classList.toggle('mid', ad < .5);
  }
  const c = centerCard(); if (!c) return;
  const n = +c.dataset.n, p = D.page(n);
  els.ovTitle.textContent = p.title; els.ovNo.textContent = `PAGE ${n} · ${p.section.toUpperCase()}`;
  els.knob.style.left = ((n - 1) / (D.pages.length - 1) * 100) + '%';
  for (const ch of els.chips.children) ch.setAttribute('aria-pressed', String(ch.textContent.trim().startsWith(p.section)));
}
function scrollToCard(n, smooth) {
  const c = els.rail.children[n - 1]; if (!c) return;
  const left = c.offsetLeft + c.offsetWidth / 2 - els.flow.clientWidth / 2;
  els.flow.scrollTo({ left, behavior: smooth && !reduced.matches ? 'smooth' : 'auto' });
  if (!smooth) coverflow();
}

async function openOverview({ fromPinch = false, focus = false } = {}) {
  if (overviewOn) { if (focus) els.input.focus(); return; }
  overviewOn = true; els.ov.setAttribute('aria-hidden', 'false');
  document.body.classList.remove('chrome-hidden'); chromeHidden = false;
  sizeBooklet(); scrollToCard(cur, false);
  const from = (els.r.dataset.n == cur ? els.r : els.l).getBoundingClientRect();
  const card = els.rail.children[cur - 1];
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
  for (const c of els.rail.children) c.classList.remove('dim');
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
    if (b.dataset.flip !== undefined) { box.remove(); for (const c of els.rail.children) c.classList.toggle('dim', !pages.some(x => x.p.n === +c.dataset.n)); scrollToCard(pages[0].p.n, true); els.input.blur(); return; }
    if (b.dataset.n) pickPage(+b.dataset.n, b.querySelector('.th'));
    if (b.dataset.style) { closeOverview(true); app.go('styles', { style: b.dataset.style, detail: true }); }
    if (b.dataset.town) { closeOverview(true); app.go('permits', { town: b.dataset.town }); }
  };
}
const p_all = p => `${p.title} ${p.section} ${p.text}`;
