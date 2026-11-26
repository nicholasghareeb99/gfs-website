/* Ballpark tool, showroom motion layer. Watches the page the main tool
   renders and adds the live readout, step glow, reveal-on-scroll and the
   price count-up. It never changes the tool's own text or state: the price
   count-up runs in an overlay, so anything reading #bp-price-range still
   sees the real range. */
(function () {
  'use strict';
  if (!document.body || !document.querySelector('.ballpark-layout')) return;
  document.body.classList.add('bp-page');
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const bump = node => { if (!node || calm) return; node.classList.remove('bpm-bump'); void node.offsetWidth; node.classList.add('bpm-bump'); };

  // Dark drafting-grid workspace behind the wizard
  const stage = $('.ballpark-layout').closest('section');
  if (stage) stage.classList.add('bpm-stage');

  // Live readout in the hero, fed by the project summary
  const hero = $('.page-header--photo .ph__content');
  const HUD = [['length', 'Length', 'bp-summary-length'], ['style', 'Style', 'bp-summary-style'], ['gates', 'Gates', 'bp-summary-gates'], ['price', 'Range', null]];
  let hud = null;
  if (hero && !$('.bpm-hud')) {
    hud = document.createElement('div');
    hud.className = 'bpm-hud'; hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = HUD.map(([k, label]) => '<div class="bpm-hud__cell" data-k="' + k + '"><span class="bpm-hud__k">' + label + '</span><span class="bpm-hud__v">—</span></div>').join('');
    hero.appendChild(hud);
  }
  const short = (text, n) => { text = String(text || '').trim(); return text.length > n ? text.slice(0, n - 1) + '…' : text; };
  function setHud(key, value) {
    if (!hud) return;
    const cell = $('[data-k="' + key + '"]', hud), v = cell && $('.bpm-hud__v', cell);
    if (!v) return;
    const clean = value && value !== '—' && value !== 'None' ? value : '—';
    if (v.textContent === clean) return;
    v.textContent = clean; cell.classList.toggle('is-set', clean !== '—'); bump(cell);
  }
  const isMoney = text => /^\$\d[\d,]*\s*[–-]\s*\$\d[\d,]*$/.test(String(text || '').trim());
  function syncHud() {
    HUD.forEach(([key, , id]) => { if (id) { const n = document.getElementById(id); if (n) setHud(key, short(n.textContent, key === 'style' ? 22 : 16)); } });
    const range = document.getElementById('bp-price-range');
    setHud('price', range && isMoney(range.textContent) ? range.textContent.trim().replace(/\s*[–-]\s*/, '–') : '—');
  }

  // Rail progress bar + glow on the step you're on
  function syncSteps() {
    const rail = document.getElementById('bp-rail');
    if (rail) {
      const buttons = $$('button', rail), done = buttons.filter(b => b.classList.contains('is-done')).length;
      rail.style.setProperty('--bpm-progress', (buttons.length ? Math.round(done / buttons.length * 100) : 0) + '%');
      const now = buttons.find(b => b.classList.contains('is-now'));
      $$('.bp-step').forEach(step => step.classList.toggle('bpm-now', !!now && now.dataset.step === step.id));
      $$('.bp-step').forEach(step => {
        const isDone = step.classList.contains('is-done');
        if (isDone && step.dataset.bpmDone === '0' && !calm) { step.classList.remove('bpm-done-flash'); void step.offsetWidth; step.classList.add('bpm-done-flash'); }
        step.dataset.bpmDone = isDone ? '1' : '0';
      });
    }
  }

  // Reveal step cards and review lines as they scroll in
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('bpm-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.bpm-stage .bp-step, .bpm-stage .path-quote').forEach(node => {
      const r = node.getBoundingClientRect();
      if (r.top < innerHeight) return; // already on screen: leave it alone
      node.classList.add('bpm-reveal'); io.observe(node);
    });
  }

  // Price count-up in an overlay; the real text underneath never changes
  let lastMoney = '';
  function countUp(range) {
    const text = range.textContent.trim();
    if (!isMoney(text) || text === lastMoney) { if (!isMoney(text)) { lastMoney = ''; range.classList.remove('bpm-money'); } return; }
    lastMoney = text; range.classList.add('bpm-money');
    const card = document.getElementById('bp-price-card');
    if (card && !calm) { card.classList.remove('bpm-reveal-price'); void card.offsetWidth; card.classList.add('bpm-reveal-price'); }
    if (calm) return;
    const [lo, hi] = text.split(/\s*[–-]\s*/).map(s => Number(s.replace(/[^\d]/g, '')));
    const overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    const cs = getComputedStyle(range);
    overlay.style.cssText = 'position:absolute;left:' + range.offsetLeft + 'px;top:' + range.offsetTop + 'px;width:' + range.offsetWidth + 'px;font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';line-height:' + cs.lineHeight + ';font-variant-numeric:tabular-nums;letter-spacing:' + cs.letterSpacing + ';color:#fff;text-shadow:0 0 24px rgba(140,199,255,.55);pointer-events:none;white-space:nowrap';
    range.parentElement.style.position = range.parentElement.style.position || 'relative';
    range.style.color = 'transparent';
    range.parentElement.appendChild(overlay);
    const fmt = n => '$' + (Math.round(n / 10) * 10).toLocaleString('en-US');
    const t0 = performance.now(), dur = 950, ease = t => 1 - Math.pow(1 - t, 4);
    (function frame(now) {
      const t = Math.min(1, (now - t0) / dur), k = ease(t);
      overlay.textContent = t < 1 ? fmt(lo * k) + ' – ' + fmt(hi * k) : text;
      if (t < 1 && range.textContent.trim() === text) requestAnimationFrame(frame);
      else { overlay.remove(); range.style.color = ''; }
    })(t0);
  }

  // Style tiles cascade: give each tile its position for the stagger delay
  function indexTiles() { $$('#bp-fence-options .ballpark-photo-opt').forEach((tile, i) => tile.style.setProperty('--bpm-i', String(Math.min(i, 24)))); }

  // Gate counters and chips: a small bump when the number changes
  document.addEventListener('click', event => {
    const stepper = event.target.closest('[data-stepper] button');
    if (stepper) requestAnimationFrame(() => bump(stepper.parentElement.querySelector('output')));
  });

  let queued = false;
  function sync() {
    queued = false;
    syncSteps(); syncHud(); indexTiles();
    const range = document.getElementById('bp-price-range');
    if (range) countUp(range);
  }
  const mo = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(sync); } });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  sync();
})();
