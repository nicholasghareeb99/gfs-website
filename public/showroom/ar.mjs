// 3D · AR mode. The model on screen is the Executive App's own viewer (/x3d/),
// built from the same published style specs. "Place it in the yard" exports that
// exact model at 1:1 scale to USDZ and hands it to Apple's AR Quick Look.
import { $, $$, esc, clamp, icons, toast } from './ui.mjs';

let app, root, D, frame, state = { model: null, layout: 'run24g', styleId: null }, ar = { url: null, ticket: 0, key: '' }, mods = null;
const LAYOUTS = [
  { id: 'panel', name: 'One section', detail: true },
  { id: 'run16', name: '16 ft run', length: 16 },
  { id: 'run24g', name: '24 ft + walk gate', length: 24, single: 1 },
  { id: 'run40', name: '40 ft run', length: 40 },
  { id: 'corner', name: 'Corner 24 × 16', corner: [24, 16] }
];
const canAR = (() => { const a = document.createElement('a'); return !!a.relList?.supports?.('ar'); })();

export function familyOfModel(n) {
  if (/chain/i.test(n)) return 'chainlink';
  if (/alum|ornamental/i.test(n)) return 'aluminum';
  if (/split rail/i.test(n)) return 'split-rail';
  if (/^(HW )?(Kingston|Rockport|Wellington|Whitney|Windsor|Hartford|Bedford|Cascade|Midland|Montgomery)/i.test(n) || /^Shadowbox - /i.test(n)) return 'vinyl';
  return 'wood';
}
const heightOf = n => { const m = n.match(/(\d+(?:\.\d)?)\s*(?:ft|'|’)/i); return m ? +m[1] : 6; };
const DOT = { White: '#f4f5f2', Tan: '#d9c7a3', Adobe: '#c9a984', 'Mocha Walnut': '#6b4b35', 'Chai Gray': '#9c978e', 'Dark Gray': '#5b5d5f', 'Aspen Latte': '#b89c7c', Black: '#151515', BLK: '#151515', Bronze: '#5a4632', Galv: '#b9c2cb', Galvanized: '#b9c2cb', Cedar: '#c98a4b', cedar: '#c98a4b' };
const dotOf = n => { for (const [k, v] of Object.entries(DOT)) if (n.includes(k)) return v; return familyOfModel(n) === 'wood' ? '#a8865d' : '#8fa3ba'; };

export async function init(a, el) {
  app = a; root = el; D = app.data;
  root.innerHTML = `
    <div class="ar-head">
      <div class="eyebrow">3D · AR · ACTUAL FENCE GEOMETRY</div>
      <div class="ar-title"><h2 id="arName">Choose a fence</h2><button class="btn sm" id="arPick">${icons.layers} All models</button></div>
    </div>
    <div class="ar-stage">
      <i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i>
      <div class="ar-load"><div class="spin"></div><span id="arLoadText">BUILDING MODEL</span></div>
      <iframe title="3D fence model" allow="fullscreen; xr-spatial-tracking" sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"></iframe>
    </div>
    <div class="ar-bar">
      <div class="ar-row" id="arLayouts">${LAYOUTS.map(l => `<button class="chip" data-l="${l.id}">${esc(l.name)}</button>`).join('')}</div>
      <div class="ar-go">
        <button class="btn primary" id="arGo">${icons.ar} <span>Place it in the yard</span></button>
        <button class="btn blue" id="arStyle" hidden>${icons.photos} Style</button>
      </div>
      <div class="ar-status" id="arStatus"></div>
    </div>`;
  frame = $('iframe', root);
  $('#arPick', root).onclick = picker;
  $('#arLayouts', root).onclick = e => { const b = e.target.closest('[data-l]'); if (b) { state.layout = b.dataset.l; load(); } };
  $('#arStyle', root).onclick = () => state.styleId && app.go('styles', { style: state.styleId, detail: true });
  $('#arGo', root).addEventListener('click', goAR);
  addEventListener('message', e => {
    if (e.source !== frame.contentWindow || e.data?.type !== 'GFS_F3D_READY') return;
    try { // keep the viewer clean: the showroom has its own controls around it
      const doc = frame.contentDocument;
      if (doc && !doc.getElementById('showroomClean')) { const st = doc.createElement('style'); st.id = 'showroomClean'; st.textContent = 'body>*:not(canvas):not(#c):not(#load):not(script):not(style){display:none!important}'; doc.head.append(st); }
    } catch {}
    frame.classList.add('ready'); $('.ar-load', root).hidden = true;
    setTimeout(prepareAR, 900); // build the AR file in the background so the first tap opens it
  });
  try { const saved = JSON.parse(localStorage.getItem('gfs-showroom-ar') || 'null'); if (saved?.model) state = { ...state, ...saved }; } catch {}
}

export function show(opts = {}) {
  if (opts.model) { state.model = opts.model; state.styleId = opts.styleId || D.styles.find(s => s.models.includes(opts.model))?.id || null; }
  if (!state.model) { state.model = D.styles[0].models[0]; state.styleId = D.styles[0].id; }
  const fresh = frame.dataset.key !== key();
  if (fresh) load(); else render();
  if (opts.ar) setTimeout(() => toast(canAR ? 'Getting the AR model ready…' : 'AR opens on iPhone and iPad in Safari'), 300);
}
export function hide() {}

const key = () => `${state.model}|${state.layout}`;
function render() {
  $('#arName', root).textContent = state.model;
  for (const b of $$('#arLayouts .chip', root)) b.setAttribute('aria-pressed', String(b.dataset.l === state.layout));
  $('#arStyle', root).hidden = !state.styleId;
}

async function spec() {
  mods ||= await import('/gfs/website-model.mjs');
  const L = LAYOUTS.find(l => l.id === state.layout) || LAYOUTS[2];
  const live = app.live.specs && app.live.specs[state.model] ? app.live.specs : undefined;
  const base = { name: state.model, height: heightOf(state.model), overrides: live };
  if (L.detail) return mods.buildPreviewSpec({ ...base, detail: true });
  if (L.corner) {
    const [a, b] = L.corner, s = mods.buildPreviewSpec({ ...base, length: a });
    s.lines = [{ x1: -a / 2, z1: 0, x2: a / 2, z2: 0, ft: a }, { x1: a / 2, z1: 0, x2: a / 2, z2: -b, ft: b }]; s.gates = [];
    return s;
  }
  return mods.buildPreviewSpec({ ...base, length: L.length, singleGates: L.single || 0 });
}

async function load() {
  render(); resetAR();
  try { localStorage.setItem('gfs-showroom-ar', JSON.stringify({ model: state.model, layout: state.layout, styleId: state.styleId })); } catch {}
  frame.classList.remove('ready'); $('.ar-load', root).hidden = false; $('#arLoadText', root).textContent = 'BUILDING MODEL';
  let s;
  try { s = await spec(); } catch (e) { $('#arLoadText', root).textContent = e.message.toUpperCase(); return; }
  frame.dataset.key = key();
  frame.src = '/x3d/fence3d.html?embed=1&website=1#' + mods.encodePreview(s);
  clearTimeout(load.t); load.t = setTimeout(() => { if (!frame.classList.contains('ready')) $('#arLoadText', root).textContent = navigator.onLine ? 'STILL LOADING…' : 'THE 3D VIEWER NEEDS A CONNECTION THE FIRST TIME'; }, 15000);
}

function resetAR() {
  ar.ticket++; if (ar.url) URL.revokeObjectURL(ar.url); ar = { url: null, ticket: ar.ticket, key: '', busy: false };
  const go = $('#arGo', root);
  $('span', go).textContent = canAR ? 'Place it in the yard' : 'Save AR file';
  $('#arStatus', root).textContent = canAR ? '' : 'AR opens on iPhone and iPad in Safari.';
}

async function prepareAR() {
  if (ar.url && ar.key === key()) return true;
  if (ar.busy) return ar.busy;
  const ticket = ++ar.ticket, status = $('#arStatus', root);
  ar.busy = (async () => {
    try {
      const fence = frame.contentWindow?.__f3d?.fenceGroup;
      if (!fence) throw Error('The model is still loading.');
      status.textContent = 'Preparing posts, rails, pickets and textures for AR…';
      const { exportARModel } = await import('/x3d/gfs/ar-model.mjs');
      const res = await exportARModel(fence, { isCurrent: () => ticket === ar.ticket });
      if (ticket !== ar.ticket) return false;
      ar.url = URL.createObjectURL(res.blob); ar.key = key();
      const dims = res.dimensionsFt ? ` · ${res.dimensionsFt.map?.(v => Math.round(v)).join(' × ') || ''} ft` : '';
      status.textContent = `AR ready · ${res.count.toLocaleString()} parts · ${(res.blob.size / 1048576).toFixed(1)} MB${dims} · shown at true size`;
      return true;
    } catch (e) {
      if (ticket === ar.ticket) status.textContent = e.message || 'The AR file could not be made. Try a shorter layout.';
      return false;
    } finally { if (ticket === ar.ticket) ar.busy = false; }
  })();
  return ar.busy;
}

// Apple's AR Quick Look opens from an <a rel="ar"> whose only child is an image,
// clicked during the tap. The file is built ahead of time so the first tap works.
function openQuickLook() {
  const a = document.createElement('a');
  if (canAR) { a.rel = 'ar'; a.href = ar.url + '#allowsContentScaling=0'; const img = document.createElement('img'); img.alt = ''; img.src = 'icon-192.png'; a.append(img); }
  else { a.href = ar.url; a.download = state.model.replace(/[<>:"/\\|?*]/g, '-').slice(0, 90) + '.usdz'; }
  a.style.display = 'none'; document.body.append(a); a.click(); setTimeout(() => a.remove(), 1000);
}
async function goAR() {
  if (ar.url && ar.key === key()) return openQuickLook();
  const ok = await prepareAR();
  if (ok) toast(canAR ? 'Ready. Tap again to place it in the yard.' : 'Ready. Tap again to save the AR file.');
}

function picker() {
  const names = app.live.names?.length ? app.live.names : D.models;
  const el = document.createElement('div'); el.className = 'picker';
  const fams = D.families;
  el.innerHTML = `<div class="sheet" role="dialog" aria-label="Choose a 3D model"><div class="grab"></div>
    <div class="hd"><div class="row"><h2 style="font-size:22px">${names.length} fence models</h2><button class="iconbtn" data-x aria-label="Close">${icons.close}</button></div>
      <label class="search">${icons.search}<input type="search" placeholder="Kingston, cedar, black chain link…" aria-label="Search models"></label>
      <div class="chips">${['all', ...fams.map(f => f.id)].map(f => `<button class="chip" data-f="${f}" aria-pressed="${f === 'all'}">${f === 'all' ? 'All' : esc(D.familyById[f].name)}</button>`).join('')}</div></div>
    <div class="list"></div></div>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  let f = 'all'; const input = $('input', el), list = $('.list', el);
  const draw = () => {
    const q = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = names.filter(n => (f === 'all' || familyOfModel(n) === f) && q.every(w => n.toLowerCase().includes(w)));
    list.innerHTML = fams.filter(x => f === 'all' || x.id === f).map(x => {
      const r = rows.filter(n => familyOfModel(n) === x.id); if (!r.length) return '';
      return `<div class="grp">${esc(x.name.toUpperCase())} · ${r.length}</div>` + r.map(n => `<button class="item${n === state.model ? ' on' : ''}" data-n="${esc(n)}"><i class="dot" style="background:${dotOf(n)}"></i>${esc(n)}<small>${heightOf(n)} FT</small></button>`).join('');
    }).join('') || '<div class="empty">No models match.</div>';
  };
  draw();
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
  el.onclick = e => {
    if (e.target === el || e.target.closest('[data-x]')) return close();
    const c = e.target.closest('[data-f]'); if (c) { f = c.dataset.f; $$('[data-f]', el).forEach(b => b.setAttribute('aria-pressed', String(b === c))); draw(); }
    const it = e.target.closest('[data-n]'); if (it) { state.model = it.dataset.n; state.styleId = D.styles.find(s => s.models.includes(state.model))?.id || null; close(); load(); }
  };
  input.oninput = draw;
}
