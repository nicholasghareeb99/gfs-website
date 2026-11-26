/* /fences/compare/: pick styles to compare, and see a fence height to scale. */
(function () {
  'use strict';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  // ---- Compare picker: tick the styles you want side by side (at least one stays on).
  function initPicker() {
    const boxes = $$('.cmp-picker input[type=checkbox]');
    const sync = () => {
      const on = boxes.filter(b => b.checked);
      if (!on.length) { boxes[0].checked = true; return sync(); }
      boxes.forEach(b => { const card = document.getElementById('cmp-' + b.value); if (card) card.hidden = !b.checked; });
    };
    boxes.forEach(b => b.addEventListener('change', sync));
    sync();
  }

  // ---- Height visualizer. 20 px per foot; grade at y=200.
  const PX = 20, GRADE = 200;
  const READS = {
    4: ['4 ft: waist to chest high', 'Neighbors see right over it. Keeps kids and most dogs in. A common front-yard limit.'],
    5: ['5 ft: shoulder high', 'Blocks the view of someone sitting on a patio. Good for dogs that can clear 4 ft.'],
    6: ['6 ft: above eye level', 'Most people standing can’t see over it. The usual backyard privacy height around Toledo.'],
    8: ['8 ft: full screen', 'Hides a busy road or a two-story view. Many towns need approval above 6 ft, so check your town’s rules first.']
  };
  function initVisualizer() {
    const root = $('#hv');
    if (!root) return;
    const styleButtons = $$('[data-hv-style]', root), heightButtons = $$('[data-hv-height]', root);
    const fence = $('.hv-fence', root), read = $('.hv__read', root), go = $('#hv-go');
    let style = styleButtons[0].dataset.hvStyle, height = 6;
    function heightsFor(btn) { return btn.dataset.hvHeights.split(',').map(Number); }
    function render() {
      const sb = styleButtons.find(b => b.dataset.hvStyle === style);
      const allowed = heightsFor(sb);
      if (!allowed.includes(height)) height = allowed.includes(6) ? 6 : allowed[allowed.length - 1];
      styleButtons.forEach(b => b.setAttribute('aria-pressed', String(b === sb)));
      heightButtons.forEach(b => {
        const h = Number(b.dataset.hvHeight), ok = allowed.includes(h);
        b.disabled = !ok; b.title = ok ? '' : sb.textContent.trim() + ' isn’t offered at ' + h + ' ft';
        b.setAttribute('aria-pressed', String(h === height));
      });
      fence.setAttribute('y', String(GRADE - height * PX));
      fence.setAttribute('height', String(height * PX));
      const [color, open] = sb.dataset.hvColor.split('|');
      fence.setAttribute('fill', color);
      fence.setAttribute('fill-opacity', open ? '0.35' : '1');
      const r = READS[height];
      read.innerHTML = '<strong>' + r[0] + '</strong>' + r[1] + (open ? ' ' + sb.textContent.trim() + ' is see-through, so at any height it keeps kids and pets in rather than blocking the view.' : '');
      if (go) go.href = '/quote/ballpark/?material=' + encodeURIComponent(sb.dataset.hvMaterial) + '&height=' + height;
    }
    styleButtons.forEach(b => b.addEventListener('click', () => { style = b.dataset.hvStyle; render(); }));
    heightButtons.forEach(b => b.addEventListener('click', () => { if (!b.disabled) { height = Number(b.dataset.hvHeight); render(); } }));
    render();
  }

  function init() { initPicker(); initVisualizer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
