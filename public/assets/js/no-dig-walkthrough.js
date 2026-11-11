/* Enhance the existing installation steps; all content remains readable without JS. */
(function () {
  'use strict';
  function init() {
    const list = document.querySelector('.nodig-steps');
    if (!list || list.dataset.walkthroughReady) return;
    const steps = Array.from(list.children);
    if (steps.length !== 6 || steps.some(step => !step.querySelector('h3'))) return;
    const controls = document.querySelector('.nodig-step-controls');
    const status = document.querySelector('.nodig-step-status');
    if (!controls || !status) return;
    const names = ['Plan', 'Site checks', 'Drive posts', 'Align & finish', 'Fence & gates', 'Walkthrough'];
    const buttons = steps.map((step, index) => {
      step.id = 'no-dig-step-' + (index + 1);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = (index + 1) + '. ' + names[index];
      button.setAttribute('aria-controls', step.id);
      button.addEventListener('click', () => show(index, true));
      controls.appendChild(button);
      return button;
    });
    const all = document.createElement('button');
    all.type = 'button';
    all.textContent = 'Show all steps';
    all.className = 'nodig-show-all';
    all.addEventListener('click', () => show(-1, true));
    controls.appendChild(all);
    function show(index, announce) {
      steps.forEach((step, i) => {
        step.hidden = index !== -1 && i !== index;
        buttons[i].setAttribute('aria-pressed', String(i === index));
      });
      all.setAttribute('aria-pressed', String(index === -1));
      list.classList.toggle('nodig-step-focused', index !== -1);
      if (announce) status.textContent = index === -1 ? 'Showing all six installation steps.' : 'Step ' + (index + 1) + ' of 6: ' + steps[index].querySelector('h3').textContent;
    }
    controls.hidden = false;
    list.dataset.walkthroughReady = 'true';
    show(0, false);
    initIllustrations();
  }
  function initIllustrations() {
    if (typeof HTMLDialogElement === 'undefined') return;
    const links = Array.from(document.querySelectorAll('.nodig-system-visual>a, .nodig-process-picture>a, .nodig-comparison>a, .nodig-wood-detail>a'));
    if (!links.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'fence-viewer';
    dialog.setAttribute('aria-label', 'No-dig installation illustrations');
    dialog.innerHTML = '<div class="fence-viewer-bar"><span data-illustration-count aria-live="polite"></span><button type="button" data-illustration-close autofocus>Close ×</button></div><figure><img alt=""><figcaption></figcaption></figure><div class="fence-viewer-nav"><button type="button" data-illustration-previous aria-label="Previous illustration">← Previous</button><button type="button" data-illustration-next aria-label="Next illustration">Next →</button><a target="_blank" rel="noopener">Open full image</a></div>';
    document.body.appendChild(dialog);
    let index = 0, opener = null, oldOverflow = '';
    function render() {
      const link = links[index], source = link.querySelector('img');
      const src = source.getAttribute('src') || link.href;
      dialog.querySelector('img').src = src;
      dialog.querySelector('img').alt = source.alt;
      dialog.querySelector('figcaption').textContent = link.closest('figure').querySelector('figcaption').textContent;
      dialog.querySelector('a').href = src;
      dialog.querySelector('[data-illustration-count]').textContent = 'Illustration ' + (index + 1) + ' of ' + links.length;
    }
    function step(delta) { index = (index + delta + links.length) % links.length; render(); }
    links.forEach((link, i) => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || document.body.matches('.edit-mode,.editing') || document.documentElement.classList.contains('edit-mode')) return;
      event.preventDefault(); index = i; opener = link; render();
      oldOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }));
    dialog.querySelector('[data-illustration-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-illustration-previous]').addEventListener('click', () => step(-1));
    dialog.querySelector('[data-illustration-next]').addEventListener('click', () => step(1));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
    });
    dialog.addEventListener('close', () => { document.body.style.overflow = oldOverflow; if (opener) opener.focus(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
