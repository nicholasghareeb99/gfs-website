// One customer visit: the styles and pages you heart, the address and the fence you
// drew on the permit map, and the customer's details. The recap screen sends it all
// to the customer as a link and saves the customer as a lead in the Executive App
// (through the website's own lead helper, the same path a quote request takes).
import { $, $$, esc, icons, toast, cssUrl, pageImg, modal } from './ui.mjs';

const KEY = 'gfs-showroom-visit', OFFICE = '(419) 214-2107', OFFICE_TEL = '+14192142107';
let app, D, v = blank(), listeners = new Set(), shared = null;
function blank() { return { styles: [], pages: [], lab: [], address: '', fence: null, customer: {}, sent: null, started: Date.now() }; }
function load() { try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && Array.isArray(x.styles)) v = { ...blank(), ...x }; } catch {} }
function save() { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} listeners.forEach(f => f(v)); badge(); }

export const visit = {
  get: () => v,
  onChange: f => listeners.add(f),
  hasStyle: id => v.styles.includes(id),
  toggleStyle(id) { v.styles = v.styles.includes(id) ? v.styles.filter(x => x !== id) : [...v.styles, id]; save(); return v.styles.includes(id); },
  hasPage: n => v.pages.includes(n),
  togglePage(n) { v.pages = v.pages.includes(n) ? v.pages.filter(x => x !== n) : [...v.pages, n].sort((a, b) => a - b); save(); return v.pages.includes(n); },
  setAddress(a) { if (a && a !== v.address) { v.address = a; save(); } },
  // geometry: {lines:[[{lat,lng}…]], gates:[{lat,lng,type}]} — the ballpark tool's format
  setFence(fence) { v.fence = fence; save(); },
  // Fence Lab tools shown during the visit, so the customer can replay them from the link.
  addLab(id) { if (!LAB_IDS.includes(id) || v.lab.includes(id)) return; v.lab = [...v.lab, id]; save(); },
  count: () => v.styles.length + v.pages.length + (v.fence ? 1 : 0)
};
const LAB_IDS = ['build', 'grade', 'vinyl', 'wind', 'life', 'wood', 'frost', 'gate'];
const LAB_NAME = { build: 'Our build vs prefab', grade: 'Grade Lab', vinyl: 'Vinyl walls', wind: 'Wind', life: 'Lifespan', wood: 'Wood movement', frost: 'Frost & posts', gate: 'Gate sag' };
const LAB_LINE = { build: 'A prefab panel and our King Plus fence, 15 years later', grade: 'How we keep the top line clean and close gaps on your slope', vinyl: 'What a thicker vinyl wall buys you', wind: 'How hard wind pushes on each style', life: 'How long each material lasts', wood: 'Why gaps open between boards', frost: 'Why post depth matters in clay', gate: 'Why gates sag, and how we stop it' };

export function initVisit(a) {
  app = a; D = app.data; load();
  const btn = document.createElement('button');
  btn.className = 'pill'; btn.id = 'btnVisit'; btn.setAttribute('aria-label', 'This visit');
  btn.innerHTML = `${icons.heart}<span class="mono" id="visitCount"></span>`;
  $('#btnSearch').before(btn); btn.onclick = () => openRecap();
  const rv = document.createElement('button'); rv.className = 'pill'; rv.id = 'btnReviews'; rv.setAttribute('aria-label', 'Customer reviews');
  rv.innerHTML = icons.star; btn.before(rv); rv.onclick = () => import('./reviews.mjs').then(m => m.openReviews(app));
  badge();
  // A link sent to a customer opens straight into their picks.
  const m = location.hash.match(/^#visit=([A-Za-z0-9_-]+)/);
  if (m) { try { shared = decode(m[1]); } catch { toast('That link is not complete. Ask us to send it again.'); } if (shared) setTimeout(() => openRecap(shared), 2000); }
}
function badge() { const n = visit.count(), el = $('#visitCount'); if (el) { el.textContent = n ? String(n) : ''; $('#btnVisit').classList.toggle('has-picks', !!n); } }

// ── Link to the customer ─────────────────────────────────────────
const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function encode(x) {
  const r = n => Math.round(n * 1e6) / 1e6;
  const g = x.fence?.geometry ? { l: x.fence.geometry.lines.map(l => l.map(p => [r(p.lat), r(p.lng)])), g: (x.fence.geometry.gates || []).map(p => [r(p.lat), r(p.lng), p.type === 'drive' ? 1 : 0]) } : null;
  return b64(JSON.stringify({ v: 1, s: x.styles, p: x.pages, l: x.lab || [], a: x.address || '', f: g ? { ...g, m: x.fence.model || '', ft: x.fence.ft || 0 } : null, n: (x.customer?.name || '').split(' ')[0] }));
}
function decode(s) {
  const j = JSON.parse(unb64(s)); if (j.v !== 1) throw Error('version');
  const ok = id => typeof id === 'string' && D.styleById[id];
  const fence = j.f && Array.isArray(j.f.l) ? { geometry: { lines: j.f.l.slice(0, 100).map(l => l.slice(0, 300).map(([lat, lng]) => ({ lat: +lat, lng: +lng }))), gates: (j.f.g || []).slice(0, 40).map(([lat, lng, d]) => ({ lat: +lat, lng: +lng, type: d ? 'drive' : 'walk' })) }, model: D.models.includes(j.f.m) ? j.f.m : '', ft: +j.f.ft || 0 } : null;
  return { styles: (j.s || []).filter(ok).slice(0, 20), pages: (j.p || []).map(Number).filter(n => n >= 1 && n <= D.pages.length).slice(0, 40), lab: (j.l || []).filter(id => LAB_IDS.includes(id)), address: String(j.a || '').slice(0, 200), fence, customer: { name: String(j.n || '').slice(0, 40) }, readOnly: true };
}
export function shareUrl(x = v) { return `${location.origin}/showroom/#visit=${encode(x)}`; }

// ── Recap screen ─────────────────────────────────────────────────
export function openRecap(x = null) {
  const ro = !!x?.readOnly, data = x || v;
  const el = document.createElement('div'); el.className = 'recap';
  const styles = data.styles.map(id => D.styleById[id]).filter(Boolean);
  const first = name => (name || '').split(' ')[0];
  el.innerHTML = `
    <div class="recap-top"><button class="iconbtn" data-x aria-label="Close">${icons.close}</button>
      <div class="grow"><div class="eyebrow">${ro ? 'FROM GHAREEB FENCING SOLUTIONS' : 'THIS VISIT'}</div><h2>${ro ? (data.customer.name ? `${esc(first(data.customer.name))}, here are your fence picks` : 'Your fence picks') : 'Saved during this visit'}</h2></div></div>
    <div class="recap-body">
      ${data.address ? `<p class="recap-addr">${icons.pin.replace('<svg', '<svg width="16" height="16"')} ${esc(data.address)}</p>` : ''}
      <section><h3>Styles <span class="mono">${styles.length}</span></h3>
        ${styles.length ? `<div class="recap-styles">${styles.map(s => { const ph = app.photosFor(s.models)[0]; return `<div class="rs">
          <div class="rs-img" style="${ph ? `background-image:${cssUrl(ph)}` : ''}">${ph ? '' : `<span>${icons.noPhoto}No photo available</span>`}</div>
          <div class="rs-b"><small>${esc(D.familyById[s.family].name)}</small><b>${esc(s.name)}</b><p>${esc(s.line)}</p>
            <div class="rs-acts"><button class="btn sm" data-style="${s.id}">${icons.photos} Details</button>${s.models.length ? `<button class="btn sm" data-bp="${s.id}">${icons.blueprint} Blueprint</button><button class="btn sm blue" data-3d="${s.id}">${icons.cube} 3D</button>` : ''}${ro ? '' : `<button class="iconbtn sm" data-unheart="${s.id}" aria-label="Remove">${icons.close}</button>`}</div></div></div>`; }).join('')}</div>`
          : `<p class="muted">${ro ? 'No styles picked.' : 'Tap the heart on a style to save it here.'}</p>`}</section>
      <section><h3>Brochure pages <span class="mono">${data.pages.length}</span></h3>
        ${data.pages.length ? `<div class="pages">${data.pages.map(n => `<button data-page="${n}"><span class="th" style="background-image:url('${pageImg(n)}')"></span><small>P.${n} · ${esc(D.page(n).title)}</small></button>`).join('')}</div>`
          : `<p class="muted">${ro ? 'No pages picked.' : 'Tap the heart under the brochure to save a page.'}</p>`}</section>
      ${(data.lab || []).length ? `<section><h3>From the Fence Lab <span class="mono">${data.lab.length}</span></h3><div class="lab-list">${data.lab.map(id => `<button class="lab-li" data-lab="${id}">${icons.spark}<span><b>${esc(LAB_NAME[id])}</b><small>${esc(LAB_LINE[id])}</small></span>${icons.next}</button>`).join('')}</div></section>` : ''}
      ${data.fence ? `<section><h3>Your fence</h3><p>${data.fence.ft ? `<b class="mono">${Math.round(data.fence.ft)} ft</b> of fence` : 'Fence layout'}${(data.fence.geometry.gates || []).length ? ` · ${data.fence.geometry.gates.length} gate${data.fence.geometry.gates.length > 1 ? 's' : ''}` : ''}${data.fence.model ? ` · ${esc(data.fence.model)}` : ''}</p>
        <div class="rs-acts"><button class="btn sm blue" data-fence3d>${icons.cube} See it in 3D</button>${ro ? '' : `<button class="btn sm" data-fencemap>${icons.map} Edit on the map</button>`}</div></section>` : ''}
      ${ro ? `<section class="recap-call"><h3>Questions?</h3><p>Call or text Ghareeb Fencing Solutions at <b class="mono">${OFFICE}</b>.</p>
        <div class="rs-acts"><a class="btn primary" href="tel:${OFFICE_TEL}">Call</a><a class="btn" href="sms:${OFFICE_TEL}">Text</a><a class="btn ghost" href="/">ghareebfence.com</a></div></section>`
      : `<section><h3>Send it to the customer</h3><p class="muted">A link to everything above. It opens on their phone with your photos, blueprints and 3D.</p>
        <div class="rs-acts"><button class="btn primary" data-send>Send link</button><button class="btn" data-copy>Copy link</button></div>${v.sent ? `<p class="src">Last sent ${esc(new Date(v.sent).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET')}</p>` : ''}</section>
      <section><h3>Customer sign-in</h3><p class="muted">Saves this customer as a lead in the Executive App with everything from this visit.</p>
        <form class="lead" novalidate>
          <label>Name<input name="name" autocomplete="name" value="${esc(v.customer.name || '')}" required></label>
          <label>Phone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${esc(v.customer.phone || '')}" required></label>
          <label>Email <small>(optional)</small><input name="email" type="email" autocomplete="email" value="${esc(v.customer.email || '')}"></label>
          <label>Address<input name="address" autocomplete="street-address" value="${esc(v.customer.address || v.address || '')}"></label>
          <fieldset><legend>Best way to reach them</legend><div class="opts">${['Call', 'Text', 'Email'].map(r => `<label class="chip"><input type="radio" name="reach" value="${r}" ${v.customer.reach === r ? 'checked' : ''}> ${r}</label>`).join('')}</div></fieldset>
          <label>Notes<textarea name="notes" rows="3">${esc(v.customer.notes || '')}</textarea></label>
          <p class="lead-msg" role="status"></p>
          <div class="rs-acts"><button class="btn primary" type="submit">Save as lead</button></div>
        </form></section>
      <section><div class="rs-acts"><button class="btn ghost" data-new>Start a new visit</button></div></section>`}
    </div>`;
  // The customer's copy only shows what was actually picked.
  if (ro) for (const h of $$('.recap-body section h3 .mono', el)) if (h.textContent.trim() === '0') h.closest('section').remove();
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 350); if (ro && location.hash.startsWith('#visit=')) history.replaceState(null, '', '#brochure'); };
  el.onclick = async e => {
    const b = e.target.closest('button,[data-x]'); if (!b) return;
    const s = id => D.styleById[id];
    if (b.dataset.x !== undefined) return close();
    if (b.dataset.style) { close(); app.go('styles', { style: b.dataset.style, detail: true }); }
    if (b.dataset.bp) import('./blueprint.mjs').then(m => m.openBlueprint(app, s(b.dataset.bp).models[0], s(b.dataset.bp)));
    if (b.dataset['3d']) { close(); app.go('ar', { model: s(b.dataset['3d']).models[0], styleId: b.dataset['3d'] }); }
    if (b.dataset.unheart) { visit.toggleStyle(b.dataset.unheart); el.remove(); openRecap(); }
    if (b.dataset.page) { close(); app.go('brochure', { page: +b.dataset.page }); }
    if (b.dataset.lab) { close(); app.go('lab', { tool: b.dataset.lab, fromLink: ro }); }
    if (b.dataset.fence3d !== undefined) { close(); app.go('ar', { geometry: data.fence.geometry, model: data.fence.model || undefined }); }
    if (b.dataset.fencemap !== undefined) { close(); app.go('permits', {}); }
    if (b.dataset.send !== undefined) send();
    if (b.dataset.copy !== undefined) { try { await navigator.clipboard.writeText(shareUrl()); toast('Link copied'); } catch { prompt?.('Copy this link', shareUrl()); } }
    if (b.dataset.new !== undefined) { modal(`<h2>Start a new visit?</h2><p style="margin:0;color:var(--dim)">This clears the saved styles, pages, fence and customer details on this device.</p><div class="row"><button class="btn ghost" data-close>Keep it</button><button class="btn primary" id="clearVisit">Clear</button></div>`, { onOpen: (m, c) => { m.querySelector('#clearVisit').onclick = () => { v = blank(); save(); c(); el.remove(); toast('New visit started'); }; } }); }
  };
  const form = el.querySelector('form.lead');
  if (form) {
    form.oninput = () => { const f = new FormData(form); v.customer = { savedAt: v.customer.savedAt, savedSig: v.customer.savedSig, name: f.get('name'), phone: f.get('phone'), email: f.get('email'), address: f.get('address'), reach: f.get('reach') || '', notes: f.get('notes') }; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
    form.onsubmit = e => { e.preventDefault(); form.oninput(); saveLead(form); };
  }
}

async function send() {
  const url = shareUrl(), name = (v.customer.name || '').split(' ')[0];
  const text = `${name ? name + ', here' : 'Here'} are the fence styles we looked at today. Photos, blueprints and 3D are all in the link. Questions? Call or text Ghareeb Fencing Solutions at ${OFFICE}.`;
  try {
    if (navigator.share) await navigator.share({ title: 'Your fence picks · Ghareeb Fencing Solutions', text, url });
    else { await navigator.clipboard.writeText(text + '\n' + url); toast('Message and link copied. Paste it into a text or email.'); }
    v.sent = Date.now(); save();
  } catch (e) { if (e.name !== 'AbortError') toast('Sharing was not available here.'); }
}

function loadLeads() {
  if (window.GFSLeads) return Promise.resolve(window.GFSLeads);
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/assets/js/leads.js?v=showroom'; s.onload = () => window.GFSLeads ? res(window.GFSLeads) : rej(Error('lead helper')); s.onerror = () => rej(Error('offline')); document.head.append(s); });
}
async function saveLead(form) {
  const msg = form.querySelector('.lead-msg'), btn = form.querySelector('[type=submit]'), c = v.customer;
  const bad = [];
  if (!String(c.name || '').trim()) bad.push('Add their name.');
  if (String(c.phone || '').replace(/\D/g, '').length < 10) bad.push('Add a 10-digit phone number.');
  if (!c.reach) bad.push('Pick call, text or email.');
  if (c.reach === 'Email' && !/^\S+@\S+\.\S+$/.test(c.email || '')) bad.push('Add their email, since that is how they want to hear from us.');
  msg.className = 'lead-msg';
  if (bad.length) { msg.classList.add('bad'); msg.textContent = bad.join(' '); form.querySelector(!String(c.name || '').trim() ? '[name=name]' : '[name=phone]')?.focus({ preventScroll: true }); return; }
  const sig = [c.name, c.phone, c.email, c.reach, c.notes, v.styles.join(), v.pages.join(), v.lab.join(), v.fence?.ft].join('|');
  if (v.customer.savedSig === sig) { msg.classList.add('ok'); msg.textContent = 'Already saved. Nothing has changed since.'; return; }
  msg.textContent = 'Saving…'; btn.disabled = true;
  try {
    const L = await loadLeads();
    const styles = v.styles.map(id => D.styleById[id]).filter(Boolean);
    const fam = styles[0] ? D.familyById[styles[0].family].short : '';
    const notes = [c.notes, styles.length ? `Liked: ${styles.map(s => s.name).join(', ')}` : '', v.pages.length ? `Brochure pages: ${v.pages.join(', ')}` : '', v.lab.length ? `Fence Lab: ${v.lab.map(id => LAB_NAME[id]).join(', ')}` : '', `Showroom visit: ${shareUrl()}`].filter(Boolean).join('\n').slice(0, 1900);
    const input = { name: c.name, phone: c.phone, email: c.email, address: c.address || v.address, contactMethod: c.reach, notes, source: 'showroom', heardFrom: 'Showroom visit', fenceType: fam, fenceStyle: v.fence?.model || styles.map(s => s.name).join(', ').slice(0, 190) };
    if (v.fence?.geometry?.lines?.length) { input.geometry = JSON.stringify(v.fence.geometry); input.linearFeet = Math.round(v.fence.ft || 0) || ''; input.singleGates = v.fence.geometry.gates.filter(g => g.type !== 'drive').length; input.doubleGates = v.fence.geometry.gates.filter(g => g.type === 'drive').length; }
    const r = await L.submit(input);
    if (r.ok) { msg.classList.add('ok'); msg.textContent = 'Saved. The lead is on its way to the Executive App.'; v.customer.savedAt = Date.now(); v.customer.savedSig = sig; save(); }
    else { msg.classList.add('bad'); msg.textContent = (r.errors || ['Not saved.']).join(' '); }
  } catch (e) { msg.classList.add('bad'); msg.textContent = navigator.onLine ? 'Could not reach the website. Try again in a moment.' : 'No signal here. The details are kept on this device. Tap Save again when you have signal.'; }
  btn.disabled = false;
}
