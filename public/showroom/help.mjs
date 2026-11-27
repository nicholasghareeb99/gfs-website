// "How to use this screen": a sheet with little animated hands, one per screen and per Lab tool.
// Opens from the ? button in the top bar, and on its own the first time each screen is used.
import { $, esc, icons, gesture } from './ui.mjs';

export const HELP = {
  brochure: { title: 'Brochure', steps: [
    ['swipe', '<b>Swipe</b> the page, or drag its corner, to turn it.'],
    ['tap', '<b>Tap</b> a photo on the page to see it big. Tap <b>Try it</b> to open that page in the Fence Lab.'],
    ['dtap', '<b>Double-tap</b> to zoom in on a spot. Double-tap again, or tap <b>Fit</b>, to see the whole page.'],
    ['pinchin', '<b>Pinch in</b> to see every page as a book. Tap a page to open it, or ✕ to go back.'],
    ['tap', '<b>Tap the middle</b> of the page to hide the buttons. Tap again, or <b>Show buttons</b>, to bring them back.']
  ], note: 'The ‹ › buttons turn pages too. The book button shows every page with search.' },
  styles: { title: 'Styles', steps: [
    ['swipe', '<b>Swipe</b> left or right to see each style.'],
    ['swipev', '<b>Swipe up or down</b>, or tap Wood, Vinyl, Aluminum…, to change material.'],
    ['tap', '<b>Tap a card</b> for photos, specs, colors and the brochure page. Tap ‹ to come back.'],
    ['tap', '<b>Tap ♥</b> to save a style to this visit. Tap <b>Compare</b>, then pick up to 3 styles.']
  ] },
  ar: { title: '3D · AR', steps: [
    ['swipe', '<b>Drag</b> on the fence to spin it. <b>Pinch</b> to zoom in on the posts and rails.'],
    ['tap', '<b>Tap</b> the chips under it to change color, gate and how long a run to show.'],
    ['tap', 'On iPhone or iPad, <b>Save AR file</b> stands the fence in their yard at real size.'],
    ['tap', '<b>All models</b> lists every fence we can show in 3D.']
  ] },
  permits: { title: 'Permits', steps: [
    ['type', '<b>Type</b> their address, or tap the target to use where you are standing.'],
    ['tap', 'The map shows the lot and where a fence can go. Tap <b>Rules for</b> to change the town.'],
    ['tap', 'Tap <b>Draw the fence</b>, then tap the map at each corner post. Tap <b>+ Walk gate</b> or <b>+ Drive gate</b>, then tap the line where it goes.'],
    ['drag', '<b>Drag</b> a post to move it. <b>Undo</b> takes back the last post. Tap <b>Done</b> to finish.']
  ] },
  lab: { title: 'Fence Lab', steps: [
    ['tap', '<b>Tap a tool</b> to open it. Each one shows a part of how a fence is built, and why ours lasts.'],
    ['tap', 'Tap <b>All tools</b> to come back here, or ‹ › to go to the next tool.'],
    ['tap', 'Tap <b>Show the math</b> at the bottom of a tool for the numbers and where they come from.']
  ] }
};

// Per-tool steps live with the tools (lab.mjs passes them in).
export function openHelp(key, extra) {
  const h = extra || HELP[key]; if (!h) return;
  document.querySelector('.help-sheet')?.remove();
  const el = document.createElement('div'); el.className = 'help-sheet';
  el.innerHTML = `<div class="hs" role="dialog" aria-modal="true" aria-label="How to use ${esc(h.title)}">
    <div class="hs-top"><div class="grow"><div class="eyebrow">HOW TO USE</div><h2>${esc(h.title)}</h2></div><button class="iconbtn" data-x aria-label="Close">${icons.close}</button></div>
    <ul class="hs-list">${h.steps.map(([g, t]) => `<li>${gesture(g)}<p>${t}</p></li>`).join('')}</ul>
    ${h.note ? `<p class="hs-note">${h.note}</p>` : ''}
    <div class="hs-foot"><button class="btn primary" data-x>Got it</button></div></div>`;
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 320); removeEventListener('keydown', key2); };
  const key2 = e => { if (e.key === 'Escape') close(); };
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-x]')) close(); });
  addEventListener('keydown', key2);
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  $('.hs-foot .btn', el)?.focus({ preventScroll: true });
}

// First visit to a screen: show its help once on this device.
export function helpOnce(key, extra) {
  const k = 'gfs-showroom-help-' + key;
  try { if (localStorage.getItem(k)) return; } catch { return; }
  // wait for the splash screen to finish, then a beat
  let n = 0; const t = setInterval(() => { if (document.getElementById('splash')?.classList.contains('done') || ++n > 20) { clearInterval(t); setTimeout(() => {
    // Not over something else (a customer's link opens their summary first) and not if they've moved on.
    if (document.querySelector('.recap, .help-sheet, .px, .bp, .cmp, .rv, .modal, .overview.on') || (window.GFSShowroom?.mode && !window.GFSShowroom.mode.startsWith(key.split('-')[0]))) return;
    try { localStorage.setItem(k, '1'); } catch {}
    openHelp(key, extra);
  }, 600); } }, 300);
}
