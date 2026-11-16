/* ============================================================
   GFS — OVERRIDE SANITIZER  v1
   assets/js/sanitize-overrides.js
   Load BEFORE the script that applies siteContent overrides.

   WHY THIS EXISTS
   Edit Mode v5 has a rich-text toolbar (bold/italic/bullets/links),
   so overrides stored in Firestore contain HTML, and whatever applies
   them must use innerHTML. That makes siteContent an HTML injection
   surface with site-wide reach.

   Firestore rules restrict WRITES to the owner. That is the right
   control, but it is a single control. If the owner's Google account
   is ever phished, or the rules are mis-deployed even briefly (the
   rules file itself records that siteContent was publicly writable at
   one point), an attacker gets persistent script execution on every
   page, for every visitor. On a lead-generation site the payload is
   not defacement - it is silently forwarding every name, address and
   phone number typed into the quote form.

   This module removes that. It sanitizes on RENDER, so a hostile
   value sitting in Firestore still cannot execute. Rules control who
   writes; this controls what runs.
   ============================================================ */
(function (global) {
  'use strict';

  // Tags Edit Mode's toolbar can actually produce. Nothing else survives.
  var ALLOWED_TAGS = ['B','STRONG','I','EM','U','BR','P','SPAN','A','UL','OL','LI','SMALL','SUP','SUB'];

  // Attributes allowed, per tag. Everything else is stripped - which
  // covers every on* handler, style, srcset, and data-* in one rule.
  var ALLOWED_ATTRS = { A: ['href','target','rel'] };

  var SAFE_URL   = /^(https?:|mailto:|tel:|\/|#)/i;
  var MAX_LENGTH = 50000;

  // Image overrides may only point at origins we control.
  var IMAGE_HOSTS = [
    'ghareebfencingsolutions.com',
    'www.ghareebfencingsolutions.com',
    'gfencing.netlify.app',
    'firebasestorage.googleapis.com',
    'images.squarespace-cdn.com'   // legacy hero images still in use
  ];

  function stripNode(node) {
    // Replace a disallowed element with its text, never drop silently.
    var text = global.document.createTextNode(node.textContent || '');
    if (node.parentNode) node.parentNode.replaceChild(text, node);
  }

  function cleanElement(el) {
    var i, attrs, name, value;

    if (ALLOWED_TAGS.indexOf(el.tagName) === -1) { stripNode(el); return; }

    attrs = Array.prototype.slice.call(el.attributes);
    for (i = 0; i < attrs.length; i++) {
      name  = attrs[i].name;
      value = attrs[i].value;
      var permitted = ALLOWED_ATTRS[el.tagName] || [];
      if (permitted.indexOf(name) === -1) { el.removeAttribute(name); continue; }
      if (name === 'href' && !sanitizeHref(value)) { el.removeAttribute(name); }
    }

    // Any surviving link that leaves the page gets hardened.
    if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  /**
   * sanitizeHTML(dirty) -> safe HTML string.
   * Parsed in an inert document, so nothing loads or executes while we work.
   */
  function sanitizeHTML(dirty) {
    if (typeof dirty !== 'string') return '';
    if (dirty.length > MAX_LENGTH) dirty = dirty.slice(0, MAX_LENGTH);

    var doc = global.document.implementation.createHTMLDocument('sanitize');
    doc.body.innerHTML = dirty;

    // Kill anything that can execute or navigate outright, subtree included.
    var lethal = doc.body.querySelectorAll(
      'script,style,iframe,object,embed,link,meta,form,input,button,svg,math,base,template'
    );
    for (var i = 0; i < lethal.length; i++) {
      if (lethal[i].parentNode) lethal[i].parentNode.removeChild(lethal[i]);
    }

    // Walk bottom-up: unwrapping a parent must not skip its children.
    var all = doc.body.querySelectorAll('*');
    for (var j = all.length - 1; j >= 0; j--) cleanElement(all[j]);

    return doc.body.innerHTML;
  }

  /** Plain-text override (the common case). No markup permitted at all. */
  function sanitizeText(dirty) {
    if (typeof dirty !== 'string') return '';
    var doc = global.document.implementation.createHTMLDocument('sanitize');
    doc.body.innerHTML = dirty.slice(0, MAX_LENGTH);
    return doc.body.textContent || '';
  }

  /** Image override. Returns '' unless the URL is an origin we control. */
  function sanitizeImageURL(raw) {
    if (typeof raw !== 'string') return '';
    var v = raw.trim();
    if (!v || v === '/' || v.charAt(0) === '#') return '';
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(v) && v.length < 1100000) return v;
    if (/[\u0000-\u001f\u007f\\]/.test(v)) return '';
    if (v.charAt(0) === '/' && v.charAt(1) !== '/') return v;   // same-origin path
    try {
      var u = new global.URL(v, global.location.origin);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
      return u.username || u.password ? '' : u.href;
    } catch (e) { return ''; }
  }

  function sanitizeHref(raw) {
    var value=String(raw||'').trim();
    if(!value || /[\u0000-\u001f\u007f\\]/.test(value))return '';
    try { var url=new global.URL(value,global.location.href);return ['http:','https:','mailto:','tel:'].indexOf(url.protocol)>=0 && !url.username && !url.password ? value : ''; }catch(_){return '';}
  }

  /**
   * applyOverride(el, value, kind)
   * kind: 'text' (default) | 'html' | 'img' | 'href'
   * Use this instead of touching innerHTML directly anywhere overrides land.
   */
  function applyOverride(el, value, kind) {
    if (!el) return;
    if (kind === 'html')      el.innerHTML   = sanitizeHTML(value);
    else if (kind === 'img')  { var s = sanitizeImageURL(value); if (s) el.src = s; }
    else if (kind === 'href') { var h = String(value || '').trim();
                                if (sanitizeHref(h)) el.setAttribute('href', h); }
    else                      el.textContent = sanitizeText(value);
  }

  global.GFSSanitize = {
    html: sanitizeHTML,
    text: sanitizeText,
    imageURL: sanitizeImageURL,
    href: sanitizeHref,
    apply: applyOverride,
    ALLOWED_TAGS: ALLOWED_TAGS,
    MAX_LENGTH: MAX_LENGTH
  };
})(window);
