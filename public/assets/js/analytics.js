/* ============================================================
   GHAREEB FENCING — FIRST-PARTY ANALYTICS
   ============================================================
   Writes lightweight hit documents to Firestore `siteHits` so the
   owner's /admin/ dashboard can show traffic, sources, and lead
   conversion WITHOUT depending on GA4's UI or a third-party tool.

   Runs alongside Firebase Analytics (GA4) — this does not replace
   it, it gives the admin page queryable first-party data.

   Firestore contract (create-only for the public):
     /siteHits/{autoId}
       t:      'pv' | 'cta' | 'lead' | 'booking' | 'tool'
       path:   location.pathname
       ref:    document.referrer host ('' if none)
       src:    utm_source or inferred ('direct','google','facebook',...)
       med:    utm_medium ('')
       camp:   utm_campaign ('')
       sid:    per-session random id (sessionStorage)
       nv:     true if first pageview of this browser (new visitor)
       dev:    'mobile' | 'desktop'
       label:  event detail (cta text, fence style, ...) ('')
       day:    'YYYY-MM-DD' local
       tsMs:   Date.now()

   The owner's own traffic is excluded once localStorage
   gfs_owner === '1' (set automatically by /admin/ and Edit Mode).
   ============================================================ */
(function () {
  'use strict';

  var MAX = 120;              // hard cap per session — runaway-loop guard
  var sent = 0;

  function ownerDevice() {
    try { return localStorage.getItem('gfs_owner') === '1'; } catch (e) { return false; }
  }

  function sessionId() {
    try {
      var sid = sessionStorage.getItem('gfs_sid');
      if (!sid) {
        sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        sessionStorage.setItem('gfs_sid', sid);
      }
      return sid;
    } catch (e) { return 'nosid'; }
  }

  function isNewVisitor() {
    try {
      if (localStorage.getItem('gfs_seen') === '1') return false;
      localStorage.setItem('gfs_seen', '1');
      return true;
    } catch (e) { return false; }
  }

  function dayKey(at) {
    var d = at === undefined ? new Date() : new Date(at);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function attribution() {
    try { return window.GFSLeads?.getAttribution() || JSON.parse(sessionStorage.getItem('gfs_attribution') || '{}'); }
    catch (e) { return {}; }
  }

  function inferSource() {
    try {
      var p = new URLSearchParams(location.search);
      if (p.get('utm_source')) return p.get('utm_source').slice(0, 60);
      if (p.get('gclid') || p.get('gbraid') || p.get('wbraid')) return 'google-ads';
      var saved=attribution();
      if(saved.utm_source)return String(saved.utm_source).slice(0,60);
      if(saved.gclid||saved.gbraid||saved.wbraid)return 'google-ads';
      if (p.get('fbclid')) return 'facebook';
      var ref = document.referrer;
      if (!ref) return 'direct';
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (host.indexOf(location.hostname.replace(/^www\./, '')) >= 0) return 'internal';
      if (host.indexOf('google') >= 0) return 'google';
      if (host.indexOf('bing') >= 0) return 'bing';
      if (host.indexOf('facebook') >= 0 || host.indexOf('fb.') === 0) return 'facebook';
      if (host.indexOf('instagram') >= 0) return 'instagram';
      if (host.indexOf('nextdoor') >= 0) return 'nextdoor';
      if (host.indexOf('yelp') >= 0) return 'yelp';
      if (host.indexOf('bbb.org') >= 0) return 'bbb';
      return host.slice(0, 60);
    } catch (e) { return 'direct'; }
  }

  function refHost() {
    try { return document.referrer ? new URL(document.referrer).hostname.slice(0, 80) : ''; }
    catch (e) { return ''; }
  }

  function utm(k) {
    try { return (new URLSearchParams(location.search).get(k) || attribution()[k] || '').slice(0, 60); }
    catch (e) { return ''; }
  }

  var SID = null; // initialized only after the collection policy allows this context
  var NV = null; // resolved on first pv

  var receiptWrites = new Set();
  function write(type, label, accepted) {
    if (!window.GFSTrackingPolicy?.allowed()) return;
    const fields=accepted?.attribution||{utm_source:inferSource(),utm_medium:utm('utm_medium'),utm_campaign:utm('utm_campaign')};
    if (!window.GFSTrackingPolicy.safeFields({label:String(label||''),...fields}) || (accepted&&!window.GFSTrackingPolicy.safeUrl(accepted.path||'/'))) return;
    if (!accepted && sent >= MAX) return;
    if (!window.GFS_DB) return;
    if (SID === null) SID = sessionId();
    if (NV === null) NV = isNewVisitor();
    sent++;
    var doc = {
      t: type,
      path: (location.pathname || '/').slice(0, 200),
      ref: refHost(),
      src: inferSource(),
      med: utm('utm_medium'),
      camp: utm('utm_campaign'),
      sid: SID,
      nv: NV,
      dev: (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      label: String(label || '').slice(0, 120),
      day: dayKey(),
      tsMs: Date.now()
    };
    if(accepted){
      doc.path=String(accepted.path||doc.path).slice(0,200);
      var attr=accepted.attribution||{};
      // A delayed receipt uses its captured context, including empty fields.
      // Never fill gaps from a different visit that is current when replay runs.
      doc.ref=String(accepted.ref||'').slice(0,80);
      doc.src=String(attr.utm_source||(attr.googlePaid?'google-ads':attr.facebook?'facebook':doc.ref||'direct')).slice(0,60);
      doc.med=String(attr.utm_medium||'').slice(0,60);
      doc.camp=String(attr.utm_campaign||'').slice(0,60);
      if(Number.isFinite(accepted.at)){doc.tsMs=accepted.at;doc.day=dayKey(accepted.at);}
    }
    // Receipt document IDs make retries idempotent under create-only rules.
    // Fire and forget — analytics must never affect the visitor experience.
    try {
      var collection=window.GFS_DB.collection('siteHits');
      if(accepted){
        if(receiptWrites.has(accepted.receipt))return;
        receiptWrites.add(accepted.receipt);
        collection.doc('receipt_'+accepted.receipt).set(doc).catch(function(){receiptWrites.delete(accepted.receipt);});
      }else collection.add(doc).catch(function () {});
    } catch (e) {}
  }

  window.addEventListener('gfs-consent-cleared',()=>{SID=null;NV=null;receiptWrites.clear();});

  // Public API for other modules
  window.GFSTrack = write;

  function acceptedReceipt(event) {
    var receipt=event?.detail||event;
    const choice=window.GFSConsent?.snapshot();
    if(receipt?.trackingAllowed===false||receipt?.permissions?.analytics!==true||!choice?.choiceId||receipt.permissions.choiceId!==choice.choiceId||receipt.permissions.noticeVersion!==choice.noticeVersion)return;
    if(!receipt || !/^web_[a-zA-Z0-9_-]{16,80}$/.test(receipt.receipt||'') || !['lead','booking'].includes(receipt.type))return;
    write(receipt.type,receipt.label,receipt);
  }
  window.addEventListener('gfs-intake-accepted',acceptedReceipt);
  var started=false;
  function start() {
    if(!window.GFSTrackingPolicy?.allowed()||!window.GFS_DB)return;
    if(started){(window.GFS_ACCEPTED_RECEIPTS||[]).forEach(acceptedReceipt);return;}started=true;
    // 1) Pageview
    write('pv', document.title.slice(0, 100));

    // 2) CTA clicks — phone taps and quote-tool entries (delegated)
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) {
        write('cta', 'call');
      } else if (href.indexOf('/quote/ballpark') >= 0 || href.indexOf('quote/ballpark') >= 0) {
        write('cta', 'ballpark');
      } else if (href.indexOf('/quote/book') >= 0 || href.indexOf('quote/book') >= 0) {
        write('cta', 'book');
      } else if (href.indexOf('/quote/form') >= 0 || href.indexOf('quote/form') >= 0) {
        write('cta', 'estimate-request');
      } else if (/\/?quote\/(?:[?#].*)?$/.test(href)) {
        write('cta', 'quote-options');
      } else if (href.indexOf('slice.fnbo.com') >= 0) {
        write('cta', 'financing');
      }
    }, { passive: true });

    // Catch receipts accepted before Firebase or this script became ready.
    (window.GFS_ACCEPTED_RECEIPTS||[]).forEach(acceptedReceipt);
  }

  for(const event of ['gfs-tracking-ready','pageshow'])window.addEventListener(event,start);

  function boot() {
    if (window.GFS_DB) { start(); return; }
    window.addEventListener('gfs-firebase-ready', start, { once: true });
    // If Firebase never comes up, do nothing — analytics silently off.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
