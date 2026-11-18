/* hero-rotator.js - GFS, Nov 2026
   Rotates the home hero: photo + copy + dots. Pauses on hover, focus, touch and
   when the tab is hidden. No autoplay for people who ask for reduced motion. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSHeroRotator = factory();
  if (typeof document !== 'undefined') {
    var go = function () { root.GFSHeroRotator.start(document); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var DELAY = 6500;

  function next(i, n) { return (i + 1) % n; }

  function start(doc) {
    var hero = doc.querySelector('[data-hero-rotator]');
    if (!hero || hero.getAttribute('data-hero-ready')) return null;
    var slides = [].slice.call(hero.querySelectorAll('.hero-slide'));
    var bgs = [].slice.call(hero.querySelectorAll('.hero-bg'));
    var count = hero.querySelector('[data-hero-count]');
    var prevBtn = hero.querySelector('[data-hero-prev]'), nextBtn = hero.querySelector('[data-hero-next]');
    var pauseBtn = hero.querySelector('[data-hero-pause]');
    if (slides.length < 2) return null;
    hero.setAttribute('data-hero-ready', '1');

    var win = doc.defaultView || window;
    var reduced = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var index = 0, timer = null, userPaused = reduced, hold = false;

    function show(i) {
      index = (i + slides.length) % slides.length;
      load(index);
      slides.forEach(function (s, k) {
        var on = k === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      bgs.forEach(function (b, k) { b.classList.toggle('is-active', k === index); });
      if (count) count.textContent = String(index + 1);
      load(next(index, slides.length));
    }
    /* Photos after the first are fetched one slide ahead, not at page load. */
    function load(i) {
      var im = bgs[i] && bgs[i].querySelector('img[data-src]');
      if (!im) return;
      im.setAttribute('srcset', im.getAttribute('data-srcset'));
      im.setAttribute('src', im.getAttribute('data-src'));
      im.removeAttribute('data-src'); im.removeAttribute('data-srcset');
    }
    function stop() { if (timer) { win.clearTimeout(timer); timer = null; } }
    function schedule() {
      stop();
      if (userPaused || hold || doc.hidden) return;
      timer = win.setTimeout(function () { show(next(index, slides.length)); schedule(); }, DELAY);
    }
    function setPaused(p) {
      userPaused = p;
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
        pauseBtn.setAttribute('aria-label', p ? 'Play the slideshow' : 'Pause the slideshow');
        var t = pauseBtn.querySelector('span'); if (t) t.textContent = p ? 'Play' : 'Pause';
      }
      schedule();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1); schedule(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); schedule(); });
    if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!userPaused); });

    var content = hero.querySelector('.hero2__content') || hero;
    content.addEventListener('mouseenter', function () { hold = true; stop(); });
    content.addEventListener('mouseleave', function () { hold = false; schedule(); });
    content.addEventListener('focusin', function () { hold = true; stop(); });
    content.addEventListener('focusout', function () { hold = false; schedule(); });
    doc.addEventListener('visibilitychange', schedule);

    var x0 = null, y0 = null;
    hero.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { show(index + (dx < 0 ? 1 : -1)); schedule(); }
    }, { passive: true });

    setPaused(userPaused);
    if (win.requestIdleCallback) win.requestIdleCallback(function () { load(1); }); else win.setTimeout(function () { load(1); }, 2500);
    return { show: show, get index() { return index; } };
  }

  return { start: start, next: next, DELAY: DELAY };
});
