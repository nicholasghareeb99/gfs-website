/* ============================================================
   GHAREEB FENCING — SHARED SITE INTERACTIONS
   ============================================================ */
(function() {
  'use strict';

  function init() {
    // Keep conversion controls out of the way while customers use a form.
    if ('IntersectionObserver' in window) {
      const visibleForms = new Set();
      const formObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.isIntersecting ? visibleForms.add(entry.target) : visibleForms.delete(entry.target));
        document.body.classList.toggle('mobile-form-visible', visibleForms.size > 0);
      });
      document.querySelectorAll('main form').forEach(form => formObserver.observe(form));
    }
    // ---- Mobile nav drawer -------------------------------------
    // Handled as a proper dialog: state is mirrored to aria-expanded,
    // Escape closes it, focus moves into the drawer and returns to the
    // toggle on close, and background scrolling is locked while open.
    const navToggle = document.getElementById('navToggle');
    const drawerClose = document.getElementById('drawerClose');
    const drawer = document.getElementById('mobileDrawer');

    // Compact the existing links without replacing them or changing their URLs.
    // The static list remains the fallback when JavaScript is unavailable.
    const drawerList = drawer?.querySelector('ul');
    if (drawerList && !drawerList.querySelector('.mobile-fence-disclosure')) {
      const fenceItems = Array.from(drawerList.children).filter(item => {
        const link = item.querySelector(':scope > a[href]');
        if (!link) return false;
        try {
          const target = new URL(link.getAttribute('href'), window.location.href);
          return target.origin === window.location.origin && /^\/fences(?:\/|$)/.test(target.pathname);
        } catch (_) { return false; }
      });
      if (fenceItems.length) {
        const item = document.createElement('li');
        item.className = 'mobile-fence-menu';
        const details = document.createElement('details');
        details.className = 'mobile-fence-disclosure';
        const summary = document.createElement('summary');
        summary.className = 'mobile-fence-summary';
        summary.textContent = 'Fence styles';
        const links = document.createElement('ul');
        links.className = 'mobile-fence-links';
        drawerList.insertBefore(item, fenceItems[0]);
        fenceItems.forEach(fenceItem => links.appendChild(fenceItem));
        details.append(summary, links);
        item.appendChild(details);
      }
    }

    function openDrawer() {
      if (!drawer) return;
      drawer.classList.add('open');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      drawer.setAttribute('aria-label', 'Main menu');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'Close menu');
      }
      document.body.style.overflow = 'hidden';
      // Move focus into the drawer so keyboard/screen-reader users land there
      const first = drawerClose || drawer.querySelector('a');
      if (first) first.focus();
    }

    function closeDrawer(returnFocus) {
      if (!drawer) return;
      drawer.classList.remove('open');
      drawer.removeAttribute('aria-modal');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
        if (returnFocus) navToggle.focus();
      }
      document.body.style.overflow = '';
    }

    if (navToggle && drawer) navToggle.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', () => closeDrawer(true));
    if (drawer) {
      drawer.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => closeDrawer(false)));

      // Escape closes; Tab is kept inside the drawer while it's open
      document.addEventListener('keydown', (e) => {
        if (!drawer.classList.contains('open')) return;
        if (e.key === 'Escape') { closeDrawer(true); return; }
        if (e.key !== 'Tab') return;
        const focusables = Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), summary'))
          .filter(element => element.getClientRects().length > 0);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      });
    }

    // Resolve relative links against this page before marking navigation.
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-links a, .mobile-drawer a').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      let target;
      try { target = new URL(href, window.location.href); } catch (_) { return; }
      if (target.origin !== window.location.origin) return;
      const hp = target.pathname.replace(/\/$/, '') || '/';
      const exact = path === hp;
      if (exact || (hp !== '/' && path.startsWith(hp + '/'))) a.classList.add('active');
      if (exact) a.setAttribute('aria-current', 'page');
    });

    // Scroll-based reveal
    if ('IntersectionObserver' in window) {
      const els = document.querySelectorAll('.fade-up');
      if (els.length) {
        const io = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.12 });
        els.forEach(e => io.observe(e));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
