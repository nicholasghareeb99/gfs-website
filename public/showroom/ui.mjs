// Shared helpers for the GFS Showroom.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Executive App model names are shorthand ("8'P/t dog ear privacy"); tidy them for customers.
export const niceModel = m => m.replace(/\bp\/t\b/gi, 'PT').replace(/(\d)\s*(?:['’′]|ft\b)\s*/gi, '$1 ft ').replace(/\bno[- ]dig\b/gi, 'No-dig').replace(/\bdog[- ]ear\b/gi, 'dog-ear').replace(/\s+/g, ' ').trim().replace(/^./, c => c.toUpperCase());
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Same-origin asset URL from a data path such as "assets/img/x.webp".
export const asset = p => (!p ? '' : /^https:\/\//.test(p) ? String(p) : '/' + String(p).replace(/^\/+/, ''));
export const cssUrl = p => `url('${asset(p).replace(/'/g, '%27')}')`;
export const pageImg = (n, hi = false) => `/assets/brochure/${hi ? 'hires' : 'pages'}/p${String(n).padStart(2, '0')}.webp`;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export const icons = {
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17h.01"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>',
  ar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M12 7.5 8 9.7v4.6l4 2.2 4-2.2V9.7z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14"/></svg>',
  photos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  pinch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>',
  blueprint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16V9l2.5-2.5L12 9v7M7 12h5M15 8v8M14 8h2M14 16h2"/></svg>',
  noPhoto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/><path d="M3 3l18 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.3 3.9 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.4 0 5.7 3.3 4.5 6.7C19.5 15.4 12 20 12 20z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>',
  compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>'
};

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}

// Critically damped-ish spring toward a target. Returns a promise; onStep(value, velocity).
export function spring({ from, to, velocity = 0, stiffness = 260, damping = 28, onStep }) {
  if (reduced.matches) { onStep(to, 0); return Promise.resolve(); }
  return new Promise(resolve => {
    let x = from, v = velocity, last = performance.now();
    const tick = now => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const a = -stiffness * (x - to) - damping * v; v += a * dt; x += v * dt;
      if (Math.abs(v) < 0.002 && Math.abs(x - to) < 0.0015) { onStep(to, 0); resolve(); return; }
      onStep(x, v); requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function tween(ms, onStep, ease = t => 1 - Math.pow(1 - t, 3)) {
  if (reduced.matches) { onStep(1); return Promise.resolve(); }
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = now => { const t = clamp((now - t0) / ms, 0, 1); onStep(ease(t)); t < 1 ? requestAnimationFrame(tick) : resolve(); };
    requestAnimationFrame(tick);
  });
}

export function ring(x, y) {
  const r = document.createElement('i'); r.className = 'tap-ring'; r.style.left = x + 'px'; r.style.top = y + 'px';
  document.body.append(r); setTimeout(() => r.remove(), 520);
}

export function modal(html, { onOpen } = {}) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { m.classList.add('out'); setTimeout(() => m.remove(), 230); };
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  document.body.append(m); onOpen?.(m, close);
  return { el: m, close };
}

// Preload an image; resolves even on error so callers never hang.
export const loadImg = src => new Promise(res => { const i = new Image(); i.decoding = 'async'; i.onload = i.onerror = () => res(i); i.src = src; });

// Fly a rectangle from one screen rect to another (shared-element transitions).
export async function fly({ from, to, bg, size = 'cover', pos = 'center', ms = 520, radius = [8, 8] }) {
  const el = document.createElement('div'); el.className = 'px-fly';
  Object.assign(el.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', backgroundImage: bg, backgroundSize: size, backgroundPosition: pos, borderRadius: radius[0] + 'px' });
  document.body.append(el);
  await tween(ms, t => {
    const l = from.left + (to.left - from.left) * t, tp = from.top + (to.top - from.top) * t;
    const w = from.width + (to.width - from.width) * t, h = from.height + (to.height - from.height) * t;
    el.style.left = l + 'px'; el.style.top = tp + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';
    el.style.borderRadius = radius[0] + (radius[1] - radius[0]) * t + 'px';
  }, t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  return el;
}

// Safari (every iPhone/iPad browser is Safari underneath) can leave a view transition hanging,
// which froze screen changes with no message. There we use a plain CSS slide instead.
const UA = globalThis.navigator?.userAgent || '';
export const webkit = /AppleWebKit/.test(UA) && !/Chrome\/|Edg\//.test(UA) || /CriOS|FxiOS|EdgiOS/.test(UA);
export const canVT = !!globalThis.document?.startViewTransition && !webkit;
export function vt(update) {
  // Whatever happens, the update runs once, and within 1.2 s.
  let done = false; const run = () => { if (done) return; done = true; update(); };
  const guard = new Promise(res => setTimeout(() => { if (!done) { vt.running = null; run(); } res(); }, 1200));
  try {
    // One transition at a time: a tap during a running one just swaps, so fast taps never queue up or throw.
    if (vt.running) { const r = vt.running; try { r.skipTransition(); } catch {} return Promise.race([r.updateCallbackDone.catch(() => {}).then(run), guard]); }
    if (canVT && !reduced.matches) {
      const t = document.startViewTransition(run); vt.running = t;
      t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {});
      return Promise.race([t.finished.catch(() => {}), guard.then(() => new Promise(r => setTimeout(r, 400)))]).finally(() => { if (vt.running === t) vt.running = null; });
    }
  } catch (e) { console.error(e); vt.running = null; }
  run(); return Promise.resolve();
}

// Simple word search with prefix matching and highlights.
export function tokens(q) { return String(q).toLowerCase().replace(/[^a-z0-9.'"×\- ]/g, ' ').split(/\s+/).filter(w => w.length > 1 || /\d/.test(w)); }
export function score(text, words) {
  const t = text.toLowerCase(); let s = 0;
  for (const w of words) { const i = t.indexOf(w); if (i < 0) return 0; s += 1 + (t.slice(Math.max(0, i - 1), i).match(/\W|^$/) ? 1 : 0); }
  return s;
}
export function snippet(text, words, len = 120) {
  const t = text, lo = t.toLowerCase(); let at = -1;
  for (const w of words) { const i = lo.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; }
  const start = Math.max(0, at - 40), raw = (start ? '…' : '') + t.slice(start, start + len) + (start + len < t.length ? '…' : '');
  let out = esc(raw);
  for (const w of words) out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
  return out;
}

// Little animated hand demos for the help sheets and tool hints.
// kinds: tap, dtap, swipe, swipev, drag (up/down), pinchin, pinchout, slide, type
export function gesture(kind) {
  const two = kind === 'pinchin' || kind === 'pinchout';
  if (kind === 'look') return `<span class="gest g-look" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></span>`;
  return `<span class="gest g-${kind}" aria-hidden="true">${kind === 'slide' ? '<s></s>' : ''}${kind === 'type' ? '<s></s>' : ''}<i></i>${two ? '<i class="b"></i>' : ''}</span>`;
}

// A dug post, as the Executive App draws it: a 10 in hole 36 in deep, the 4×4 set 32 in down with
// concrete under and around it. Driven posts: an 8 ft pipe, 4 ft in the ground.
export const DIG = { holeIn: 10, depthIn: 36, postDepthIn: 32, swell: 1.3, lbPerFt3: 110, barrowFt3: 6, bagLb: 80, bagFt3: 0.6, postIn: 3.5, spacingFt: 8, pipeOdIn: 2.375, pipeWallIn: .154, pipeLenIn: 96, drivenIn: 48 };
export function digNumbers(lengthFt, k = DIG) {
  const posts = Math.ceil(lengthFt / k.spacingFt) + 1;
  const r = k.holeIn / 2 / 12, d = k.depthIn / 12;
  const hole = Math.PI * r * r * d;                          // cu ft of dirt out of each hole, in the ground
  const conc = hole - (k.postIn / 12) ** 2 * (k.postDepthIn / 12);   // concrete under and around the 4×4
  const dirt = hole * posts, loose = dirt * k.swell;
  return { posts, hole, dirtFt3: dirt, dirtYd3: dirt / 27, looseFt3: loose, looseYd3: loose / 27, lb: dirt * k.lbPerFt3,
    barrows: loose / k.barrowFt3, bags: Math.ceil(conc * posts / k.bagFt3), concLb: Math.ceil(conc * posts / k.bagFt3) * k.bagLb };
}
