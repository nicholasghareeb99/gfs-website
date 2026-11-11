/* GFS motion: scroll-reveal + nav shadow. Tiny, dependency-free,
   disabled automatically for prefers-reduced-motion. */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js-motion');
  var targets = document.querySelectorAll(
    'main section > .container > *:not(script), main section > .wrap > *:not(script), .fence-card, footer .card');
  var seen = new WeakSet();
  targets.forEach(function (el) {
    if (el.closest('.hero2--photo')) return;   // hero has its own entrance
    // tall blocks (wizards, long articles) must never be opacity-gated:
    // they can't reach a ratio threshold and would sit invisible.
    if (el.offsetHeight > window.innerHeight * 1.2) return;
    el.classList.add('reveal');
  });
  /* ── THE RULE THIS HAS TO SATISFY ───────────────────────────────────────
     An animation must never be able to hide content permanently.

     A page audit across all 57 pages found 10 elements sitting at
     opacity:0 for good, including "Is it as strong as concrete?" on
     /fences/no-dig/, the "Where We Build" section header on the homepage,
     and the "Read All Verified Reviews" call to action. Visitors saw blank
     space where that content should be.

     Two causes, both fixed below:

     1. rootMargin '0px 0px -6% 0px' shrinks the bottom of the root by 6%.
        Anything living in that last 6% never intersects — and if it is the
        last block on the page there is nowhere further to scroll, so it
        stays invisible forever. Now 0px.

     2. An IntersectionObserver only reports what is intersecting when it
        checks. Jump the scroll (an anchor link, a #hash landing, a restored
        position on back-navigation) and everything you flew past is
        off-screen, never seen, never revealed. The page also GROWS after
        parse as images land, moving elements without firing scroll.

     So: observer for the nice case, a sweep that asks where things
     actually are, and a hard backstop. No single mechanism failing can
     hide anything.
     ─────────────────────────────────────────────────────────────────── */
  var pending = [];
  function show(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    el.classList.add('in-view');
    var i = pending.indexOf(el);
    if (i !== -1) pending.splice(i, 1);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !seen.has(en.target)) {
          show(en.target);
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px', threshold: 0 });
    document.querySelectorAll('.reveal').forEach(function (el) {
      pending.push(el);
      io.observe(el);
    });

    /* Layer 2 — sweep. Asks where elements ARE rather than waiting to be
       told they moved, so a jumped scroll cannot skip anything. */
    var ticking = false;
    function sweep() {
      ticking = false;
      var h = window.innerHeight;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        var r = el.getBoundingClientRect();
        if (r.top < h && r.bottom > -h) { io.unobserve(el); show(el); }
        else if (r.bottom <= 0) { io.unobserve(el); show(el); }
      }
      if (!pending.length) teardown();
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sweep);
    }
    function teardown() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onScroll);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('hashchange', onScroll);
    window.addEventListener('load', sweep);
    Array.prototype.forEach.call(document.images, function (img) {
      if (!img.complete) img.addEventListener('load', onScroll, { once: true });
    });
    sweep();

    /* Layer 3 — backstop. Whatever happened, nothing stays invisible.
       Two seconds, not longer: a backstop that fires after the visitor has
       already scrolled past the blank space has not helped them. */
    window.setTimeout(function () {
      while (pending.length) show(pending[0]);
      teardown();
    }, 2000);
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in-view'); });
  }
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
