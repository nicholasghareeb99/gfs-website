// Styles mode: swipe through style tiles, grouped by material.
// Swipe sideways for the next style, up/down (or the chips) for the next material,
// tap a tile to open it: photos, specs, colors, brochure pages, 3D.
import { $, $$, esc, clamp, asset, cssUrl, pageImg, icons, fly, reduced, toast } from './ui.mjs';
import { openPhotos, initPhotos, execItems } from './photos.mjs';
import { visit } from './visit.mjs';
let comparing = false, picks = [];

let app, root, D, fam = null, deck, rail, dots, cycle = 0, detailEl = null;
const COLOR = { White: '#f4f5f2', Tan: '#d9c7a3', Adobe: '#c9a984', 'White/Tan': 'linear-gradient(90deg,#f4f5f2 50%,#d9c7a3 50%)', 'Aspen Latte': '#b89c7c', 'Chai Gray': '#9c978e', 'Dark Gray': '#5b5d5f', 'Mocha Walnut': '#6b4b35', Black: '#151515', Bronze: '#5a4632' };

export async function init(a, el) {
  app = a; root = el; D = app.data; initPhotos(app);
  root.innerHTML = `
    <div class="st-head">
      <div class="st-tools"><button class="chip" id="cmpToggle" aria-pressed="false">${icons.compare.replace('<svg', '<svg width="16" height="16"')} Compare</button><span class="src" id="cmpHint" hidden>Tap 2 or 3 styles, then Compare</span><button class="btn sm primary" id="cmpGo" hidden>Compare</button></div>
      <div class="mats" role="tablist"><i class="ink"></i>${D.families.map(f => `<button class="mat" role="tab" data-f="${f.id}"><i class="sw" style="background:${f.tone}"></i>${esc(f.name)} <span class="n">${D.styles.filter(s => s.family === f.id).length}</span></button>`).join('')}</div>
      <div class="fam-line"></div>
    </div>
    <div class="deck"><div class="rail"></div></div>
    <div class="deck-dots"></div>`;
  deck = $('.deck', root); rail = $('.rail', root); dots = $('.deck-dots', root);
  $('.mats', root).onclick = e => { const b = e.target.closest('.mat'); if (b) setFamily(b.dataset.f); };
  let raf = 0; deck.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tilt); }, { passive: true });
  // vertical swipe on the deck switches material
  let sy = null;
  deck.addEventListener('touchstart', e => { sy = { y: e.touches[0].clientY, x: e.touches[0].clientX, t: performance.now() }; }, { passive: true });
  deck.addEventListener('touchend', e => {
    if (!sy) return; const t = e.changedTouches[0], dy = t.clientY - sy.y, dx = t.clientX - sy.x;
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.6 && performance.now() - sy.t < 600) {
      const i = D.families.findIndex(f => f.id === fam); setFamily(D.families[clamp(i + (dy < 0 ? 1 : -1), 0, D.families.length - 1)].id, dy < 0 ? 1 : -1);
    }
    sy = null;
  }, { passive: true });
  rail.onclick = e => {
    const act = e.target.closest('[data-act]'), tile = e.target.closest('.tile'); if (!tile) return;
    const s = D.styleById[tile.dataset.id];
    if (act) { e.stopPropagation(); return action(act.dataset.act, s, tile); }
    if (comparing) { picks = picks.includes(s.id) ? picks.filter(x => x !== s.id) : [...picks, s.id].slice(-3); markPicks(); return; }
    // tapping a side tile brings it to centre first
    const r = tile.getBoundingClientRect(), mid = innerWidth / 2;
    if (Math.abs(r.left + r.width / 2 - mid) > r.width * .4) { tile.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); return; }
    openDetail(s, tile);
  };
  $('#cmpToggle', root).onclick = () => { comparing = !comparing; if (!comparing) picks = []; markPicks(); };
  $('#cmpGo', root).onclick = () => openCompare(picks.map(id => D.styleById[id]));
  visit.onChange(() => { for (const t of rail.children) t.querySelector('[data-act=heart]')?.setAttribute('aria-pressed', String(visit.hasStyle(t.dataset.id))); });
  addEventListener('keydown', e => {
    if (app.mode !== 'styles' || detailEl) { if (e.key === 'Escape') closeDetail(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = current(); rail.children[clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, rail.children.length - 1)]?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' }); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { const i = D.families.findIndex(f => f.id === fam); setFamily(D.families[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, D.families.length - 1)].id); }
  });
  addEventListener('resize', () => app.mode === 'styles' && tilt());
  // Executive App photos can arrive after the tiles are drawn.
  addEventListener('showroom:catalog', () => { if (fam) { const keep = rail.children[current()]?.dataset.id; fam = null; setFamily(D.styleById[keep]?.family || D.families[0].id, 0, keep); } });
}

export function show(opts = {}) {
  const s = opts.style && D.styleById[opts.style];
  setFamily(s ? s.family : opts.family || fam || D.families[0].id, 0, s?.id);
  if (s && opts.detail) setTimeout(() => openDetail(s, rail.querySelector(`[data-id="${s.id}"]`)), 80);
  clearInterval(cycle); cycle = setInterval(rotatePhotos, 3600);
}
export function hide() { clearInterval(cycle); closeDetail(true); }

// Photos come only from the Executive App. None there = "No photo available".
const photoUrls = s => app.photosFor(s.models);
function heroList(s) { return photoUrls(s).slice(0, 4).map(cssUrl); }
const NOPHOTO = `<div class="nophoto">${icons.noPhoto}<b>No photo available</b><small>Add photos to this style in the Executive App</small></div>`;
const swatch = c => COLOR[c] ? `<i title="${esc(c)}" style="background:${COLOR[c]}"></i>` : '';
const heights = s => s.heights?.length ? s.heights.map(h => (h % 1 ? h.toFixed(1) : h)).join(' · ') + ' ft' : 'Built to fit';

function tileHTML(s, i, total) {
  const imgs = heroList(s), n = photoUrls(s).length;
  return `<div class="tile" data-id="${esc(s.id)}" role="button" tabindex="0" aria-label="${esc(s.name)}">
    <div class="ph">${imgs.length ? imgs.map((u, j) => `<div class="${j ? '' : 'on'}" style="background-image:${u};animation-delay:${-j * 3}s"></div>`).join('') : NOPHOTO}</div>
    <div class="shade"></div><div class="gloss"></div>
    <span class="count">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
    <button class="heart" data-act="heart" aria-label="Save ${esc(s.name)} to this visit" aria-pressed="${visit.hasStyle(s.id)}">${icons.heart}</button>
    <span class="pickmark" aria-hidden="true"></span>
    <div class="badges">${s.models.length ? `<span>${icons.cube} 3D</span>` : ''}${n ? `<span>${icons.photos} ${n}</span>` : ''}</div>
    <div class="body">
      <div class="eyebrow">${esc(D.familyById[s.family].name.toUpperCase())}${s.colors ? ` <span class="swatches" style="display:inline-flex;vertical-align:middle;margin-left:8px">${s.colors.map(swatch).join('')}</span>` : ''}</div>
      <h2>${esc(s.name)}</h2>
      <p>${esc(s.line)}</p>
      <div class="specrow">
        <div><small>PRIVACY</small><b>${esc(s.privacy)}</b></div>
        <div><small>HEIGHTS</small><b>${esc(heights(s))}</b></div>
        <div><small>${s.colors ? 'COLORS' : 'OPTIONS'}</small><b>${esc(String((s.colors || s.options || []).filter(c => !/more/.test(c)).length || '—'))}${s.colors?.some(c => /more/.test(c)) ? '+' : ''}</b></div>
      </div>
      <div class="acts">
        ${n ? `<button class="btn sm" data-act="photos">${icons.photos} Photos</button>` : `<button class="btn sm" data-act="page">${icons.book} P.${s.pages[0]}</button>`}
        ${s.models.length ? `<button class="btn sm blue" data-act="3d">${icons.cube} 3D</button><button class="btn sm" data-act="bp">${icons.blueprint} Blueprint</button>` : ''}
      </div>
    </div>
  </div>`;
}

function setFamily(id, dir = 0, focusId = null) {
  const changed = id !== fam; fam = id;
  const f = D.familyById[id], list = D.styles.filter(s => s.family === id);
  for (const b of $$('.mat', root)) b.setAttribute('aria-pressed', String(b.dataset.f === id));
  const btn = $(`.mat[data-f="${id}"]`, root), ink = $('.mats .ink', root);
  requestAnimationFrame(() => { ink.style.width = btn.offsetWidth + 'px'; ink.style.transform = `translateX(${btn.offsetLeft}px)`; btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
  $('.fam-line', root).textContent = f.line;
  if (changed || !rail.children.length) {
    const render = () => {
      rail.innerHTML = list.map((s, i) => tileHTML(s, i, list.length)).join('');
      dots.innerHTML = list.map(() => '<i></i>').join('');
      deck.scrollLeft = 0;
    };
    if (dir && !reduced.matches) {
      rail.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-dir * 60}px) scale(.94)`, opacity: 0 }], { duration: 220, easing: 'ease-in' }).finished.then(() => {
        render(); tilt();
        rail.animate([{ transform: `translateY(${dir * 80}px) scale(.94)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      });
    } else { render(); rail.animate?.([{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' }); }
  }
  requestAnimationFrame(() => {
    if (focusId) { const t = rail.querySelector(`[data-id="${focusId}"]`); if (t) deck.scrollLeft = t.offsetLeft + t.offsetWidth / 2 - deck.clientWidth / 2; }
    tilt();
  });
}

function current() {
  const mid = deck.scrollLeft + deck.clientWidth / 2; let best = 0, bd = 1e9;
  [...rail.children].forEach((t, i) => { const d = Math.abs(t.offsetLeft + t.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
  return best;
}
function tilt() {
  const mid = deck.scrollLeft + deck.clientWidth / 2;
  [...rail.children].forEach(t => {
    const d = clamp((t.offsetLeft + t.offsetWidth / 2 - mid) / (t.offsetWidth + 22), -3, 3), ad = Math.abs(d);
    t.style.transform = `translateZ(${-ad * 140}px) rotateY(${-d * 24}deg) scale(${1 - Math.min(.16, ad * .1)})`;
    t.style.opacity = String(1 - Math.min(.55, ad * .32));
    t.style.setProperty('--gx', `${-60 + d * 120}%`);
  });
  const i = current(); [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
}
function rotatePhotos() {
  if (app.mode !== 'styles' || detailEl || document.hidden) return;
  const t = rail.children[current()]; if (!t) return;
  const layers = $$('.ph div', t); if (layers.length < 2) return;
  const i = layers.findIndex(l => l.classList.contains('on')); layers[i].classList.remove('on'); layers[(i + 1) % layers.length].classList.add('on');
}

const photoItems = s => execItems(s);
function action(a, s, tile) {
  if (a === 'heart') { const on = visit.toggleStyle(s.id); tile.querySelector('[data-act=heart]').setAttribute('aria-pressed', String(on)); toast(on ? `${s.name} saved to this visit` : 'Removed from this visit', 1400); return; }
  if (a === 'photos') {
    const items = photoItems(s); if (!items.length) return;
    openPhotos({ items, title: s.name, sub: `${items.length} photos`, fromRect: tile.querySelector('.ph').getBoundingClientRect() });
  }
  if (a === '3d') app.go('ar', { model: s.models[0], styleId: s.id });
  if (a === 'page') app.go('brochure', { page: s.pages[0] });
  if (a === 'bp') import('./blueprint.mjs').then(m => m.openBlueprint(app, s.models[0], s));
}

// ── Detail ───────────────────────────────────────────────────────
async function openDetail(s, tile) {
  if (detailEl) closeDetail(true);
  const imgs = heroList(s), items = photoItems(s), fam = D.familyById[s.family];
  const el = document.createElement('div'); el.className = 'detail'; detailEl = el;
  el.innerHTML = `
    <button class="iconbtn back" aria-label="Back to styles">${icons.back}</button>
    <div class="hero">${imgs.length ? `<div class="img" style="background-image:${imgs[0]}"></div>` : `<div class="img">${NOPHOTO}</div>`}</div>
    <div class="inner">
      <div><div class="eyebrow">${esc(fam.name.toUpperCase())}</div><h1>${esc(s.name)}</h1><p class="lead">${esc(s.line)}</p></div>
      <div class="acts">
        ${s.models.length ? `<button class="btn primary" data-act="ar">${icons.ar} Place it in the yard</button><button class="btn blue" data-act="3d">${icons.cube} Spin it in 3D</button>` : ''}
        ${s.models.length ? `<button class="btn" data-act="bp">${icons.blueprint} Blueprint</button>` : ''}
        <button class="btn heartbtn" data-act="heart" aria-pressed="${visit.hasStyle(s.id)}">${icons.heart} <span>${visit.hasStyle(s.id) ? 'Saved' : 'Save'}</span></button>
        ${items.length ? `<button class="btn" data-act="photos">${icons.photos} ${items.length} photos</button>` : ''}
        <button class="btn ghost" data-act="page">${icons.book} Brochure p.${s.pages[0]}</button>
      </div>
      <div class="d-grid">
        <div class="panel"><h3>Build specs</h3><dl class="spec">
          <dt>Privacy</dt><dd>${esc(s.privacy)}</dd>
          <dt>Heights</dt><dd class="mono">${esc(heights(s))}</dd>
          ${s.specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
        </dl></div>
        <div style="display:grid;gap:18px;align-content:start">
          ${s.colors ? `<div class="panel"><h3>Colors</h3><div class="opts">${s.colors.map(c => `<span class="chip">${COLOR[c] ? `<i style="width:16px;height:16px;border-radius:50%;background:${COLOR[c]};box-shadow:0 0 0 2px rgba(255,255,255,.2)"></i>` : ''}${esc(c)}</span>`).join('')}</div></div>` : ''}
          ${s.options ? `<div class="panel"><h3>${s.family === 'wood' ? 'Lumber' : 'Options'}</h3><div class="opts">${s.options.map(o => `<span class="chip">${esc(o)}</span>`).join('')}</div></div>` : ''}
          ${s.models.length ? `<div class="panel"><h3>Blueprints <span class="mono" style="font-size:12px;color:var(--mute)">${s.models.length}</span></h3><div class="opts">${s.models.map(m => `<button class="chip" data-bp="${esc(m)}">${icons.blueprint.replace('<svg', '<svg width="14" height="14"')} ${esc(m)}</button>`).join('')}</div></div>` : ''}
          ${s.models.length ? `<div class="panel"><h3>3D models <span class="mono" style="font-size:12px;color:var(--mute)">${s.models.length}</span></h3><div class="opts">${s.models.map(m => `<button class="chip" data-model="${esc(m)}">${icons.cube.replace('<svg', '<svg width="14" height="14"')} ${esc(m)}</button>`).join('')}</div></div>` : ''}
          <div class="panel"><h3>In the brochure</h3><div class="pages">${s.pages.map(n => `<button data-page="${n}"><span class="th" style="background-image:url('${pageImg(n)}')"></span><small>P.${n} · ${esc(D.page(n).title)}</small></button>`).join('')}</div></div>
        </div>
      </div>
      ${items.length ? '' : `<div class="panel"><h3>Photos</h3><p style="margin:0;color:var(--dim)">No photo available. Add photos to ${s.models.length ? 'this style' : 'a matching style'} in the Executive App and they show up here.</p></div>`}
      ${items.length ? `<div class="panel"><h3>Photos <span class="mono" style="font-size:12px;color:var(--mute)">${items.length}</span></h3><div class="gal">${items.slice(0, 48).map((it, i) => `<button data-photo="${i}" style="background-image:${cssUrl(it.photo.th)}" aria-label="${esc(it.photo.alt)}"></button>`).join('')}</div></div>` : ''}
      <p class="src">Specs from the GFS brochure and supplier drawings. Final layout, heights and materials are confirmed in your written quote.</p>
    </div>`;
  document.body.append(el);
  const hero = $('.hero', el).getBoundingClientRect();
  if (tile && imgs.length && !reduced.matches) {
    $('.hero .img', el).style.opacity = '0';
    const from = tile.getBoundingClientRect();
    requestAnimationFrame(() => el.classList.add('on'));
    const f = await fly({ from, to: { left: 0, top: 0, width: innerWidth, height: hero.height }, bg: imgs[0], size: 'cover', ms: 560, radius: [26, 0] });
    $('.hero .img', el).style.opacity = ''; f.remove();
  } else requestAnimationFrame(() => el.classList.add('on'));
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('back')) return closeDetail();
    if (b.dataset.act === 'ar') { closeDetail(true); app.go('ar', { model: s.models[0], styleId: s.id, ar: true }); }
    if (b.dataset.act === '3d') { closeDetail(true); app.go('ar', { model: s.models[0], styleId: s.id }); }
    if (b.dataset.act === 'heart') { const on = visit.toggleStyle(s.id); b.setAttribute('aria-pressed', String(on)); b.querySelector('span').textContent = on ? 'Saved' : 'Save'; }
    if (b.dataset.act === 'photos') openPhotos({ items, title: s.name, sub: `${items.length} photos` });
    if (b.dataset.act === 'bp') import('./blueprint.mjs').then(m => m.openBlueprint(app, s.models[0], s));
    if (b.dataset.bp) import('./blueprint.mjs').then(m => m.openBlueprint(app, b.dataset.bp, s));
    if (b.dataset.act === 'page') { closeDetail(true); app.go('brochure', { page: s.pages[0] }); }
    if (b.dataset.page) { closeDetail(true); app.go('brochure', { page: +b.dataset.page }); }
    if (b.dataset.model) { closeDetail(true); app.go('ar', { model: b.dataset.model, styleId: s.id }); }
    if (b.dataset.photo) openPhotos({ items, index: +b.dataset.photo, title: s.name, sub: `${items.length} photos`, fromRect: b.getBoundingClientRect() });
  };
  // parallax hero
  el.addEventListener('scroll', () => { const y = el.scrollTop; $('.hero .img', el).style.transform = `translateY(${y * .4}px) scale(${1 + Math.min(.15, y / 2000)})`; }, { passive: true });
}
function closeDetail(instant = false) {
  if (!detailEl) return; const el = detailEl; detailEl = null;
  if (instant) return el.remove();
  el.classList.remove('on'); setTimeout(() => el.remove(), 360);
}

// ── Compare 2 or 3 styles side by side ───────────────────────────
function markPicks() {
  $('#cmpToggle', root).setAttribute('aria-pressed', String(comparing));
  $('#cmpHint', root).hidden = !comparing || picks.length >= 2; $('#cmpGo', root).hidden = !comparing || picks.length < 2;
  $('#cmpGo', root).textContent = `Compare ${picks.length}`;
  root.classList.toggle('comparing', comparing);
  for (const t of rail.children) { const n = picks.indexOf(t.dataset.id); t.classList.toggle('picked', n >= 0); t.querySelector('.pickmark').textContent = n >= 0 ? String(n + 1) : ''; }
}
function openCompare(list) {
  const rows = [['Material', s => D.familyById[s.family].name], ['Privacy', s => s.privacy], ['Heights', s => heights(s)], ['Colors', s => (s.colors || []).join(', ') || '—'], ['Lumber / options', s => (s.options || []).join(', ') || '—']];
  const keys = [...new Set(list.flatMap(s => s.specs.map(([k]) => k)))].filter(k => !/warranty/i.test(k)).slice(0, 10);
  for (const k of keys) rows.push([k, s => (s.specs.find(([x]) => x === k) || [, '—'])[1]]);
  rows.push(['Warranty', s => (s.specs.find(([k]) => /warranty/i.test(k)) || [, '—'])[1]]);
  const el = document.createElement('div'); el.className = 'cmp';
  el.innerHTML = `<div class="recap-top"><button class="iconbtn" data-x aria-label="Close">${icons.close}</button><div class="grow"><div class="eyebrow">SIDE BY SIDE</div><h2>${list.map(s => esc(s.name)).join(' · ')}</h2></div></div>
    <div class="cmp-scroll"><table class="cmp-t" style="--n:${list.length}">
      <thead><tr><th></th>${list.map(s => { const ph = app.photosFor(s.models)[0]; return `<th><div class="cmp-img" style="${ph ? `background-image:${cssUrl(ph)}` : ''}">${ph ? '' : `<span>${icons.noPhoto}No photo available</span>`}</div><b>${esc(s.name)}</b><div class="rs-acts">${s.models.length ? `<button class="btn sm" data-bp="${s.id}">${icons.blueprint}</button><button class="btn sm blue" data-3d="${s.id}">${icons.cube}</button>` : ''}<button class="btn sm heartbtn" data-heart="${s.id}" aria-pressed="${visit.hasStyle(s.id)}">${icons.heart}</button></div></th>`; }).join('')}</tr></thead>
      <tbody>${rows.map(([k, f]) => `<tr><th scope="row">${esc(k)}</th>${list.map(s => `<td>${esc(f(s))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 350); };
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x !== undefined) return close();
    const s = D.styleById[b.dataset.bp || b.dataset['3d'] || b.dataset.heart];
    if (b.dataset.bp) import('./blueprint.mjs').then(m => m.openBlueprint(app, s.models[0], s));
    if (b.dataset['3d']) { close(); app.go('ar', { model: s.models[0], styleId: s.id }); }
    if (b.dataset.heart) b.setAttribute('aria-pressed', String(visit.toggleStyle(s.id)));
  };
}
