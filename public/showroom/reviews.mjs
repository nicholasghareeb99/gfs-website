// Real customer reviews from ghareebfence.com/reviews, word for word, in a swipe deck.
import { $, $$, esc, icons } from './ui.mjs';

export function openReviews(app) {
  const R = app.data.reviews || [];
  const el = document.createElement('div'); el.className = 'rv';
  el.innerHTML = `
    <div class="recap-top"><button class="iconbtn" data-x aria-label="Close">${icons.close}</button>
      <div class="grow"><div class="eyebrow">WHAT CUSTOMERS SAY</div><h2>In their own words</h2></div></div>
    <div class="rv-track">${R.map((r, i) => `
      <article class="rv-card">
        <div class="rv-top"><span class="rv-stars" aria-label="${r.stars} out of 5 stars">${'★'.repeat(r.stars)}</span><span class="rv-plat">${esc(r.platform)}</span></div>
        ${r.topic ? `<div class="eyebrow">${esc(r.topic.toUpperCase())}</div>` : ''}
        <blockquote>${esc(r.quote)}</blockquote>
        <footer><b>${esc(r.name)}</b>${r.note ? `<small>${esc(r.note)}</small>` : ''}${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Read the original on ${esc(r.platform)} ↗</a>` : ''}</footer>
        <span class="rv-n mono">${i + 1} / ${R.length}</span>
      </article>`).join('')}</div>
    <div class="rv-nav"><button class="iconbtn" data-p="-1" aria-label="Previous">${icons.back}</button><button class="iconbtn" data-p="1" aria-label="Next">${icons.next}</button></div>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  const track = $('.rv-track', el);
  const tilt = () => { const mid = track.scrollLeft + track.clientWidth / 2; for (const c of track.children) { const d = (c.offsetLeft + c.offsetWidth / 2 - mid) / c.offsetWidth; c.style.transform = `perspective(1000px) rotateY(${Math.max(-1, Math.min(1, d)) * -18}deg) scale(${1 - Math.min(.1, Math.abs(d) * .1)})`; c.style.opacity = String(1 - Math.min(.6, Math.abs(d) * .5)); } };
  track.addEventListener('scroll', () => requestAnimationFrame(tilt), { passive: true }); tilt();
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 350); };
  el.onclick = e => {
    if (e.target.closest('[data-x]')) return close();
    const p = e.target.closest('[data-p]'); if (p) track.scrollBy({ left: +p.dataset.p * track.firstElementChild.offsetWidth, behavior: 'smooth' });
  };
}
