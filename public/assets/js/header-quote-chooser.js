/* Header navigation only. Real links retain the existing quote routes. */
(function () {
  'use strict';
  function init() {
    if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
    const triggers = document.querySelectorAll('[data-quote-chooser]');
    if (!triggers.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'header-quote-dialog'; dialog.id = 'header-quote-dialog';
    dialog.setAttribute('aria-labelledby','header-quote-title');
    dialog.setAttribute('aria-describedby','header-quote-intro');
    dialog.innerHTML = '<div class="header-quote-dialog__head"><p class="header-quote-dialog__eyebrow">Three ways to get started</p><button type="button" class="header-quote-dialog__close" aria-label="Close quote options">×</button></div><h2 id="header-quote-title">How would you like your quote?</h2><p id="header-quote-intro">Start with a planning range, send us the details or request an on-site estimate.</p><div class="header-quote-dialog__options"><a href="/quote/ballpark/"><span class="header-quote-dialog__number" aria-hidden="true">01</span><span><strong>Get a ballpark range</strong><span>Sketch your fence or enter an approximate length with our Fence Planning Calculator.</span><b>Measure my fence →</b></span></a><a href="/quote/form/"><span class="header-quote-dialog__number" aria-hidden="true">02</span><span><strong>Send a detailed quote request</strong><span>Share your fence style, project details and timing for our team to review.</span><b>Request my quote →</b></span></a><a href="/quote/book/"><span class="header-quote-dialog__number" aria-hidden="true">03</span><span><strong>Request a free site visit</strong><span>Tell us your preferred visit window. Our team will confirm availability.</span><b>Request a visit →</b></span></a></div><p class="header-quote-dialog__note">Planning ranges are preliminary. Site review confirms measurements and final scope; a visit request is not a confirmed appointment.</p>';
    document.body.append(dialog);
    let returnFocus = null;
    let priorOverflow = '';
    triggers.forEach(trigger=>{
      trigger.setAttribute('aria-haspopup','dialog');
      trigger.setAttribute('aria-controls',dialog.id);
      trigger.addEventListener('click',event=>{
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || document.body.classList.contains('editing')) return;
        if (dialog.open) {event.preventDefault(); return;}
        returnFocus = trigger.closest('.mobile-drawer') ? document.getElementById('nav-quote') : trigger;
        priorOverflow = document.body.style.overflow;
        try { dialog.showModal(); } catch { return; }
        event.preventDefault();
        document.body.style.overflow = 'hidden';
        dialog.querySelector('button').focus();
      });
    });
    dialog.querySelector('button').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{
      document.body.style.overflow = priorOverflow;
      if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    });
    dialog.addEventListener('keydown',event=>{
      if(event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll('button,a[href]')];
      const first = items[0], last = items[items.length - 1];
      if(event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if(!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    });
    // Native dialog supplies Escape dismissal and an inert background.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
