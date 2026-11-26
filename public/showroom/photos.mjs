// Full-screen photo explorer: swipe through photos, double-tap to zoom,
// jump to the style, its 3D model, or similar photos.
import { $, esc, asset, cssUrl, pageImg, icons, fly, clamp } from './ui.mjs';

let app, el, state = null;

export function initPhotos(a) { app = a; }

// item: { photo } (an Executive App style photo, see execItems) or { page, r } (a crop of a brochure page)
// Executive App photos for a style tile, as explorer items.
export function execItems(s) { return s ? app.photosFor(s.models).map((url, i) => ({ photo: { id: url, th: url, full: url, alt: `${s.name} photo ${i + 1}` }, styleId: s.id })) : []; }
function aspectOf(it) { return it.page ? (it.r[2] * 900) / (it.r[3] * 1165) : (it.photo?.w && it.photo?.h ? it.photo.w / it.photo.h : 4 / 3); }
export function cropStyle(page, r) {
  const [x, y, w, h] = r;
  return { bg: `url('${pageImg(page, true)}')`, size: `${100 / w}% ${100 / h}%`, pos: `${w < 1 ? (x / (1 - w)) * 100 : 0}% ${h < 1 ? (y / (1 - h)) * 100 : 0}%` };
}
function styleOf(it) {
  const d = app.data;
  if (it.styleId) return d.styleById[it.styleId];
  if (it.photo) return d.styles.find(s => app.photosFor(s.models).includes(it.photo.id));
  if (it.page) return d.styles.find(s => s.pages.includes(it.page));
}
// Similar = Executive App photos of the other styles in the same material.
export function similar(styleId) {
  const d = app.data, s = d.styleById[styleId]; if (!s) return [];
  return d.styles.filter(x => x.family === s.family && x.id !== s.id).flatMap(x => execItems(x).slice(0, 6)).slice(0, 60);
}

function fitRect(aspect, box) {
  let w = box.width - 28, h = w / aspect;
  if (h > box.height - 16) { h = box.height - 16; w = h * aspect; }
  return { left: box.left + (box.width - w) / 2, top: box.top + (box.height - h) / 2, width: w, height: h };
}

export async function openPhotos({ items, index = 0, title = '', sub = '', fromRect = null, similarOf = null }) {
  close(true);
  state = { items, index, title, sub, zoom: 1, similarOf };
  el = document.createElement('div'); el.className = 'px';
  el.innerHTML = `
    <div class="px-top"><button class="iconbtn" data-x aria-label="Close">${icons.close}</button>
      <div class="grow"><h3></h3><div class="sub"></div></div></div>
    <div class="px-main"><div class="px-track"></div></div>
    <div class="px-bottom"><div class="px-cap"></div><div class="px-strip"></div><div class="px-acts"></div></div>`;
  document.body.append(el);
  render();
  const main = $('.px-main', el).getBoundingClientRect();
  const first = items[index];
  let flyer = null;
  if (fromRect && first) {
    const to = fitRect(aspectOf(first), main);
    const c = first.page ? cropStyle(first.page, first.r) : { bg: cssUrl(first.photo.th), size: 'cover', pos: 'center' };
    el.style.visibility = 'hidden';
    requestAnimationFrame(() => { el.style.visibility = ''; el.classList.add('on'); });
    $('.px-track', el).style.opacity = '0';
    flyer = await fly({ from: fromRect, to, bg: c.bg, size: c.size, pos: c.pos, ms: 480, radius: [6, 10] });
    $('.px-track', el).style.opacity = '';
    setTimeout(() => flyer.remove(), 160);
  } else requestAnimationFrame(() => el.classList.add('on'));
}

function render() {
  const { items, index } = state;
  $('h3', el).textContent = state.title;
  $('.sub', el).textContent = state.sub;
  const track = $('.px-track', el);
  track.innerHTML = items.map((it, i) => it.page
    ? `<div class="px-slide" data-i="${i}"><div class="crop" style="aspect-ratio:${aspectOf(it).toFixed(4)};width:min(100%,calc((100dvh - 260px) * ${aspectOf(it).toFixed(4)}));background-image:${cropStyle(it.page, it.r).bg};background-size:${cropStyle(it.page, it.r).size};background-position:${cropStyle(it.page, it.r).pos}"></div></div>`
    : `<div class="px-slide" data-i="${i}"><img src="${esc(asset(i === index ? it.photo.full : it.photo.th))}" data-full="${esc(asset(it.photo.full))}" alt="${esc(it.photo.alt)}" decoding="async"></div>`).join('');
  $('.px-strip', el).innerHTML = items.length > 1 ? items.map((it, i) => {
    const c = it.page ? cropStyle(it.page, it.r) : { bg: cssUrl(it.photo.th), size: 'cover', pos: 'center' };
    return `<button data-i="${i}" aria-label="Photo ${i + 1}" style="background-image:${c.bg};background-size:${c.size};background-position:${c.pos}"></button>`;
  }).join('') : '';
  requestAnimationFrame(() => { track.scrollLeft = index * track.clientWidth; select(index, false); });
  track.onscroll = () => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== state.index) select(i, false); };
  $('.px-strip', el).onclick = e => { const b = e.target.closest('button'); if (b) go(+b.dataset.i); };
  $('[data-x]', el).onclick = () => close();
  bindZoom(track);
}

function go(i) { const track = $('.px-track', el); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); select(i, true); }

function select(i, scrollStrip = true) {
  state.index = i = clamp(i, 0, state.items.length - 1);
  const it = state.items[i];
  // swap in the full-size photo for the current slide and its neighbours
  for (const j of [i, i + 1, i - 1]) { const img = $(`.px-slide[data-i="${j}"] img`, el); if (img && img.src !== location.origin + img.dataset.full) img.src = img.dataset.full; }
  const s = styleOf(it), d = app.data;
  const cap = it.photo ? `<b>${esc(s?.name || 'Style photo')}</b> · ${esc(d.familyById[s?.family]?.name || '')}` : `<b>From page ${it.page}</b> · ${esc(d.page(it.page).title)}`;
  $('.px-cap', el).innerHTML = cap + (state.items.length > 1 ? ` <span class="mono" style="color:var(--mute)">${i + 1}/${state.items.length}</span>` : '');
  for (const b of el.querySelectorAll('.px-strip button')) b.classList.toggle('on', +b.dataset.i === i);
  if (scrollStrip) el.querySelector(`.px-strip button[data-i="${i}"]`)?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  else el.querySelector(`.px-strip button[data-i="${i}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const acts = [];
  if (s) acts.push(`<button class="btn blue sm" data-a="style">${icons.photos} ${esc(s.name)}</button>`);
  if (s?.models?.length) acts.push(`<button class="btn sm" data-a="3d">${icons.cube} See in 3D</button>`);
  if (s && !state.similarOf && similar(s.id).length) acts.push(`<button class="btn sm" data-a="similar">${icons.layers} Similar</button>`);
  if (s?.models?.length) acts.push(`<button class="btn sm" data-a="bp">${icons.blueprint} Blueprint</button>`);
  if (!it.page && s?.pages?.length) acts.push(`<button class="btn ghost sm" data-a="page">${icons.book} Page ${s.pages[0]}</button>`);
  const box = $('.px-acts', el); box.innerHTML = acts.join('');
  box.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'style') { close(); app.go('styles', { style: s.id, detail: true }); }
    if (a === '3d') { close(); app.go('ar', { model: s.models[0], styleId: s.id }); }
    if (a === 'page') { close(); app.go('brochure', { page: s.pages[0] }); }
    if (a === 'similar') { const list = similar(s.id); openPhotos({ items: list, index: 0, title: `More ${d.familyById[s.family].name.toLowerCase()}`, sub: `${list.length} photos from other styles`, similarOf: s.id }); }
    if (a === 'bp') import('./blueprint.mjs').then(m => m.openBlueprint(app, s.models[0], s));
  };
}

function bindZoom(track) {
  let lastTap = 0, z = null;
  track.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse' && e.button) return;
    const now = performance.now();
    if (now - lastTap < 300) {
      const slide = e.target.closest('.px-slide'), media = slide?.firstElementChild; if (!media) return;
      if (z && z.media === media) { media.style.transform = ''; track.style.overflowX = ''; z = null; }
      else {
        const r = media.getBoundingClientRect();
        media.style.transformOrigin = `${e.clientX - r.left}px ${e.clientY - r.top}px`; media.style.transform = 'scale(2.4)';
        track.style.overflowX = 'hidden'; z = { media, x: 0, y: 0 };
      }
      lastTap = 0;
    } else lastTap = now;
  });
  let drag = null;
  track.addEventListener('pointerdown', e => { if (z) drag = { x: e.clientX, y: e.clientY, ox: parseFloat(z.media.style.translate) || 0 }; });
  track.addEventListener('pointermove', e => { if (!z || !drag) return; z.media.style.translate = `${(e.clientX - drag.x) / 1.2}px ${(e.clientY - drag.y) / 1.2}px`; });
  track.addEventListener('pointerup', () => { drag = null; });
}

export function close(instant = false) {
  if (!el) return;
  const old = el; el = null; state = null;
  if (instant) { old.remove(); return; }
  old.classList.remove('on'); old.style.opacity = '0'; old.style.transition = 'opacity .3s, background .3s';
  setTimeout(() => old.remove(), 300);
}
addEventListener('keydown', e => { if (!el) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(state.index + 1); if (e.key === 'ArrowLeft') go(state.index - 1); });
