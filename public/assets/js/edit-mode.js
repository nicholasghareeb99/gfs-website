/* ============================================================
   GHAREEB FENCING — EDIT MODE CMS  (v2)
   ============================================================
   Marks any element with these attributes for inline editing:
     data-editable="<unique-key>"            → text content
     data-editable-img="<unique-key>"        → image src
     data-editable-caption="<unique-key>"    → image caption text
     data-editable-href="<unique-key>"       → link URL

   v2 changes:
     - CLOUD PUBLISH IS AUTH-GATED. Only an authorized signed-in
       Google account can write to Firestore. The password fallback
       is now explicitly LOCAL-ONLY (this-browser preview) — the
       password ships in page source, so it must never be able to
       change what other visitors see.
     - Dropped/browsed images are compressed client-side (canvas,
       max 1600px, JPEG) before save, and oversized results are
       rejected with a clear message instead of silently blowing
       past Firestore's 1 MB document limit.
     - Link (href) editing uses a proper modal, not window.prompt
       (prompt is unreliable in iOS standalone/PWA contexts).
     - Dynamic pages: published pages created in /admin/ (Firestore
       `sitePages`, nav: true) are injected into the nav + mobile
       drawer on every static page, so new pages appear site-wide
       without a redeploy.
     - "+ Page" and "Admin" controls in the edit bar.
     - Marks this device as the owner's (localStorage gfs_owner)
       so analytics.js stops counting your own visits.
   ============================================================ */

(function() {
  'use strict';

  // ---- CONFIG ---------------------------------------------------
  const CFG = {
    password: window.GFS_EDIT_PASSWORD || 'ghareeb2026',
    storageKey: 'gfs_content_v1',
    sessionKey: 'gfs_edit_session',
    firestoreEnabled: !!(window.GFS_FIREBASE_CONFIG || (window.GFS_LEADS_CONFIG && window.GFS_LEADS_CONFIG.firestoreEnabled)),
    firestoreCollection: (window.GFS_LEADS_CONFIG && window.GFS_LEADS_CONFIG.contentSyncCollection) || 'siteContent',
    pagesCollection: 'sitePages',
    authorizedEmails: (window.GFS_AUTHORIZED_EMAILS || []).map(e => String(e).toLowerCase().trim()),
    imgMaxDim: 2560,
    imgQuality: 0.82,
    imgMaxBytes: 800 * 1024,
    navCacheKey: 'gfs_dynpages_v1',
    navCacheTtlMs: 10 * 60 * 1000,
  };

  function authMode() {
    const canLoadAuth = (typeof window.GFS_LOAD_AUTH === 'function') ||
                        (typeof firebase !== 'undefined' && !!firebase.auth);
    return (CFG.firestoreEnabled && canLoadAuth) ? 'firebase' : 'password';
  }

  // ---- STATE ----------------------------------------------------
  const state = {
    editing: false,
    pending: {},
    saved: {},
    currentImg: null,
    currentImgKey: null,
    currentHrefEl: null,
    saving: false, cloudLoaded: false, cloudPage: {}, editUid: null,
  };

  const pathKey=window.location.pathname.replace(/\/$/,'')||'/';
  const pageSlug=/^\/p(?:\/|$)/.test(pathKey)?(new URLSearchParams(location.search).get('page')||location.hash.slice(1)||decodeURIComponent(pathKey.split('/')[2]||'')):'';
  const pageKey=pageSlug?'/p/'+pageSlug.replace(/[^a-z0-9-]/gi,''):pathKey;
  // Legacy /p edits were shared by every dynamic page. Keep them stored for
  // owner recovery, but never guess which customer-facing page they belong to.

  // ---- UTIL -----------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(CFG.storageKey);
      state.saved = raw ? JSON.parse(raw) : {};
    } catch (e) { state.saved = {}; }
  }
  function persistToStorage() {
    try {
      localStorage.setItem(CFG.storageKey, JSON.stringify(state.saved));
      return true;
    } catch (e) { return false; }
  }
  function markOwnerDevice() {
    try { localStorage.setItem('gfs_owner', '1'); } catch (e) {}
    window.GFSTrackingPolicy?.enforce();
    window.dispatchEvent(new Event('gfs-owner-mode-changed'));
  }

  // ---- HYDRATE CONTENT ON LOAD ----------------------------------
  // Layout editing must never clone, hide or replace a working intake control.
  function protectedContent(el) {
    if(!el)return false;
    if(el.closest?.('form,[data-gfs-protected],#gfs-project-context'))return true;
    const controls='form,input,select,textarea,canvas,button,[data-gfs-protected],#gfs-project-context';
    const editorControl=node=>node.closest?.('.gfs-sec-handle,.gfs-insert-bar,.gfs-block-bar,#gfs-edit-ui');
    return (!!el.matches?.(controls)&&!editorControl(el)) || Array.from(el.querySelectorAll?.(controls)||[]).some(node=>!editorControl(node));
  }
  function applyContent() {
    restoreOriginals();
    const pageData = (state.editing ? state.pending : state.saved)[pageKey] || {};
    applyDupes();
    applySectionOrder(pageData._sectionOrder);
    applyMoves();
    applyStyles(false);
    renderBlocks(pageData._blocks);
    Object.entries(pageData).forEach(([key, entry]) => {
      if(!entry || typeof entry!=='object')return;
      if (key.charAt(0) === '_') return;   // reserved: _blocks, _sectionOrder
      let el;
      if (entry.type === 'text') {
        el = document.querySelector(`[data-editable="${cssEscape(key)}"]`);
        if (el && !protectedContent(el)) el.innerHTML = safeHTML(entry.value);
      } else if (entry.type === 'img') {
        el = document.querySelector(`[data-editable-img="${cssEscape(key)}"]`);
        if (el && el.tagName === 'IMG') {const url=safeImage(entry.value);if(url){el.removeAttribute('srcset');el.removeAttribute('sizes');el.src=url;}}
        else if (el) {
          const img = el.querySelector('img');
          if (img) {const url=safeImage(entry.value);if(url){img.removeAttribute('srcset');img.removeAttribute('sizes');img.src=url;}}
        }
      } else if (entry.type === 'caption') {
        el = document.querySelector(`[data-editable-caption="${cssEscape(key)}"]`);
        if (el) el.textContent = entry.value;
      } else if (entry.type === 'href') {
        el = document.querySelector(`[data-editable-href="${cssEscape(key)}"]`);
        if (el && safeHref(entry.value)) el.setAttribute('href', safeHref(entry.value));
      }
    });
    applyImageSettings();
  }
  function applyImageSettings(){
    const data=(state.editing?state.pending:state.saved)[pageKey]||{};
    Object.entries(data._images||{}).forEach(([key,options])=>{const el=document.querySelector('[data-editable-img="'+cssEscape(key)+'"]');window.GFSCMS.styleImage(el?.tagName==='IMG'?el:el?.querySelector('img'),options);});
  }
  let originals=[];let originalParents=[];
  function captureOriginals(){
    originals=$$('[data-editable],[data-editable-caption],[data-editable-img],[data-editable-href]').filter(el=>!protectedContent(el)).map(el=>({el,html:el.hasAttribute('data-editable')?el.innerHTML:null,text:el.hasAttribute('data-editable-caption')?el.textContent:null,href:el.getAttribute('href'),img:el.tagName==='IMG'?el:el.querySelector('img')})).map(o=>({...o,src:o.img?.getAttribute('src'),srcset:o.img?.getAttribute('srcset'),sizes:o.img?.getAttribute('sizes'),alt:o.img?.alt,imgStyle:o.img?.style.cssText}));
    originalParents=$$('main,main *').filter(el=>el.children.length).map(el=>({el,children:Array.from(el.childNodes),style:el.style.cssText}));
  }
  function restoreOriginals(){
    document.querySelectorAll('[data-gfsdup],.gfs-block').forEach(el=>el.remove());
    document.querySelectorAll('.gfs-hidden-edit').forEach(el=>el.classList.remove('gfs-hidden-edit'));
    for(const o of originalParents){if(o.el.isConnected){for(const child of o.children)if(child.parentNode===o.el)o.el.appendChild(child);o.el.style.cssText=o.style;}}
    for(const o of originals){if(!o.el.isConnected)continue;if(o.html!==null)o.el.innerHTML=o.html;if(o.text!==null)o.el.textContent=o.text;if(o.href!==null)o.el.setAttribute('href',o.href);if(o.img){o.img.setAttribute('src',o.src||'');for(const attr of ['srcset','sizes']){if(o[attr]===null||o[attr]===undefined)o.img.removeAttribute(attr);else o.img.setAttribute(attr,o[attr]);}o.img.alt=o.alt||'';o.img.style.cssText=o.imgStyle||'';}}
  }
  const safeHTML=value=>window.GFSSanitize.html(String(value||''));
  const safeImage=value=>window.GFSSanitize.imageURL(String(value||''));
  const safeHref=value=>window.GFSSanitize.href(String(value||''));
  function cssEscape(v) { return String(v).replace(/[\\"]/g, '\\$&'); }

  // ---- AUTH -----------------------------------------------------
  let currentUser = null;

  function isAuthorized(user) {
    if (!user || !user.email) return false;
    if (!CFG.authorizedEmails.length) return true;
    return CFG.authorizedEmails.includes(user.email.toLowerCase());
  }

  // Cloud publish permission — ONLY a signed-in authorized Google user.
  function canPublish() {
    return !!currentUser && isAuthorized(currentUser);
  }

  function isLoggedIn() {
    if (authMode() === 'firebase') {
      return !!currentUser && isAuthorized(currentUser);
    }
    return sessionStorage.getItem(CFG.sessionKey) === 'yes';
  }

  function showLogin() {
    $('#edit-login').classList.add('visible');
    if (authMode() === 'firebase') {
      $('#edit-login-firebase').style.display = 'block';
      $('#edit-login-password').style.display = 'none';
    } else {
      $('#edit-login-firebase').style.display = 'none';
      $('#edit-login-password').style.display = 'block';
      setTimeout(() => $('#edit-pw') && $('#edit-pw').focus(), 50);
    }
  }
  function hideLogin() { $('#edit-login').classList.remove('visible'); }

  // ---- FIREBASE AUTH FLOW ---------------------------------------
  async function ensureAuthLoaded() {
    if (window.firebase && window.firebase.auth) return true;
    if (typeof window.GFS_LOAD_AUTH !== 'function') return false;
    try { await window.GFS_LOAD_AUTH(); } catch (e) {
      console.error('[GFSEdit] auth SDK failed to load:', e);
      return false;
    }
    return !!(window.firebase && window.firebase.auth);
  }

  async function signInWithGoogle() {
    const ready = await ensureAuthLoaded();
    if (!ready) {
      toast('Sign-in library could not load. Check your connection or content blocker.', 'error');
      return;
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      if (!isAuthorized(user)) {
        await firebase.auth().signOut();
        toast(user.email + ' is not authorized to edit this site.', 'error');
        return;
      }
      markOwnerDevice();
    } catch (e) {
      console.error('Google sign-in failed:', e);
      const code = (e && e.code) || 'unknown';
      let msg;
      switch (code) {
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          msg = 'Sign-in cancelled.';
          break;
        case 'auth/popup-blocked':
          msg = 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
          break;
        case 'auth/unauthorized-domain':
          msg = 'This domain is not authorized in Firebase. Firebase Console → Authentication → Settings → Authorized domains → add: ' + window.location.hostname;
          break;
        case 'auth/operation-not-allowed':
          msg = 'Google sign-in is not enabled in Firebase. Console → Authentication → Sign-in method → Google → Enable.';
          break;
        case 'auth/network-request-failed':
          msg = 'Network error during sign-in. Check your connection and try again.';
          break;
        default:
          msg = 'Sign-in failed: ' + code + '. ' + (e.message || '');
      }
      toast(msg, 'error');
    }
  }

  function watchAuthState() {
    if (authMode() !== 'firebase') return;
    if (!(window.firebase && window.firebase.auth)) return;
    if (watchAuthState._bound) return;
    watchAuthState._bound = true;
    firebase.auth().onAuthStateChanged((user) => {
      currentUser = user;
      if (user && isAuthorized(user)) {
        markOwnerDevice();
        $('#edit-trigger').classList.add('visible');
        hideLogin();
      } else {
        $('#edit-trigger').classList.remove('visible');
        if (state.editing) exitEditMode();
      }
    });
  }

  // ---- PASSWORD FALLBACK FLOW (LOCAL-ONLY) ----------------------
  function attemptPasswordLogin(pw) {
    if (pw === CFG.password) {
      sessionStorage.setItem(CFG.sessionKey, 'yes');
      hideLogin();
      enterEditMode();
      toast('Local preview mode — changes save to this browser only. Sign in with Google to publish live.', 'error');
    } else {
      toast('Wrong password', 'error');
    }
  }

  function logout() {
    if (authMode() === 'firebase' && currentUser) {
      if (window.firebase && window.firebase.auth) firebase.auth().signOut();
    }
    sessionStorage.removeItem(CFG.sessionKey);
    exitEditMode();
    toast('Logged out');
  }

  // ---- ENTER / EXIT EDIT MODE -----------------------------------
  async function enterEditMode() {
    if(pageSlug&&window.GFS_PAGE_PUBLISHED!==true)return toast('Publish this page from Admin before using inline editing.','error');
    if (!isLoggedIn()) return showLogin();
    if(state.editing || state.entering)return;
    if(CFG.firestoreEnabled){
      state.entering=true;const owner=currentUser?.uid;
      editorStatus('Loading the latest published version…');
      try {
        const loaded=await Promise.all([loadFromFirestore(true),loadChrome(true)]);
        if(currentUser?.uid!==owner || !canPublish())throw Error('Your account changed. Sign in again.');
        if(!loaded.every(Boolean))throw Error('Could not load the latest published version. Check your connection and try Edit Mode again. Your saved draft is kept.');
      } catch(e){toast(e.message,'error');return;} finally{state.entering=false;}
    }
    state.editUid = currentUser?.uid || 'local';
    state.editBase=JSON.parse(JSON.stringify(state.cloudPage));
    state.editBaseLoaded=state.cloudLoaded;
    state.editChromeBase=JSON.parse(JSON.stringify(chromeSaved));
    chromePending=JSON.parse(JSON.stringify(chromeSaved));
    state.editing = true;
    state.pending = JSON.parse(JSON.stringify(state.saved));
    try { const draft=JSON.parse(localStorage.getItem(draftKey())||'null'); if(draft && confirm('Restore your unpublished changes for this page?')) {state.pending[pageKey]=draft.page;chromePending=draft.chrome||{};state.editBase=draft.base||{};state.editChromeBase=draft.chromeBase||{};state.editBaseLoaded=draft.baseLoaded===true;} } catch (_) {}
    document.body.classList.add('editing');
    if (window.innerWidth < 768) document.body.classList.add('editing-mobile');
    $('#edit-bar').classList.add('visible');
    $('#edit-trigger').classList.remove('visible');
    bindEditables();
    $$('[data-editable], [data-editable-caption]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
    });
    renderBlocks(currentBlocks());
    buildInsertBars();
    buildSectionHandles();
    if(!chromePending || !Object.keys(chromePending).length) chromePending = JSON.parse(JSON.stringify(chromeSaved));
    bindChrome();
    maybeTour();
    stampDom();
    applyMoves();
    refreshFromPending();
    updateCounter();
  }
  function exitEditMode() {
    if(state.editing && pendingCount()) keepDraft();
    state.editing = false;
    document.body.classList.remove('editing', 'editing-mobile');
    $('#edit-bar').classList.remove('visible');
    if (isLoggedIn()) $('#edit-trigger').classList.add('visible');
    $$('[data-editable], [data-editable-caption]').forEach(el => {
      el.setAttribute('contenteditable', 'false');
    });
    setSelectMode(false);
    document.querySelectorAll('.gfs-insert-bar, .gfs-sec-handle, .gfs-block-bar').forEach(el => el.remove());
    document.querySelectorAll('.gfs-hidden-edit').forEach(el => el.classList.remove('gfs-hidden-edit'));
    unbindChromeEditing();
    applyContent();
    applyChrome();
    $$('.edited').forEach(el => el.classList.remove('edited'));
  }

  // ---- BIND EDITABLE ELEMENTS -----------------------------------
  function bindEditables() {
    $$('[data-editable]').forEach(el => {
      if (protectedContent(el)) return;
      if (el.dataset.bound === 'yes') return;
      el.dataset.bound = 'yes';
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('blur', () => recordTextChange(el));
      el.addEventListener('input', () => {if(state.editing)recordTextChange(el);});
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
    });
    $$('[data-editable-caption]').forEach(el => {
      if (protectedContent(el)) return;
      if (el.dataset.bound === 'yes') return;
      el.dataset.bound = 'yes';
      el.setAttribute('contenteditable', 'true');
      el.addEventListener('blur', () => recordCaptionChange(el));
      el.addEventListener('input', () => {if(state.editing)recordCaptionChange(el);});
      el.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
      });
    });
    $$('[data-editable-img]').forEach(el => {
      if (el.dataset.bound === 'yes') return;
      el.dataset.bound = 'yes';
      el.addEventListener('click', (e) => {
        if (!state.editing) return;
        e.preventDefault();
        openImageModal(el);
      });
    });
    $$('[data-editable-href]').forEach(el => {
      if (el.dataset.bound === 'yes') return;
      el.dataset.bound = 'yes';
      el.addEventListener('click', (e) => {
        if (!state.editing) return;
        e.preventDefault();
        openHrefModal(el);
      });
    });
  }

  function recordTextChange(el) {
    if(!state.editing)return;
    const key = el.getAttribute('data-editable');
    setPending(key, 'text', el.innerHTML.trim());
    el.classList.add('edited');
  }
  function recordCaptionChange(el) {
    if(!state.editing)return;
    const key = el.getAttribute('data-editable-caption');
    setPending(key, 'caption', el.textContent.trim());
    el.classList.add('edited');
  }
  function recordImageChange(key, newUrl) {
    setPending(key, 'img', newUrl);
  }
  function recordHrefChange(el) {
    const key = el.getAttribute('data-editable-href');
    setPending(key, 'href', el.getAttribute('href') || '');
    el.classList.add('edited');
  }

  function setPending(key, type, value) {
    if(!state.editing || state.pending[pageKey]?.[key]?.value===value)return;
    snapshotForUndo();
    if (!state.pending[pageKey]) state.pending[pageKey] = {};
    const savedEntry = (state.saved[pageKey] || {})[key];
    if (savedEntry && savedEntry.value === value) {
      state.pending[pageKey][key] = JSON.parse(JSON.stringify(savedEntry));
    } else {
      state.pending[pageKey][key] = { type, value, updatedAt: new Date().toISOString() };
    }
    updateCounter();
  }

  function updateCounter() {
    const pending = pendingCount();
    const counter = $('#edit-counter');
    if (counter) counter.textContent = pending + ' change' + (pending === 1 ? '' : 's');
    const saveBtn = $('#edit-save');
    if (saveBtn) {saveBtn.disabled = state.saving || pending === 0;saveBtn.textContent=state.saving?'Publishing…':CFG.firestoreEnabled?'Publish changes':'Save local preview';}
    if(state.editing && pending){const kept=keepDraft();if(!state.saving)editorStatus(kept?'Draft saved on this device · not published yet':'Device storage is full · keep this page open');}
    else if(!state.saving)editorStatus(state.lastPublished?'Published · '+new Date(state.lastPublished).toLocaleTimeString():'No unpublished changes');
  }
  function pendingCount() {
    const pageData = state.pending[pageKey] || {};
    const savedData = state.saved[pageKey] || {};
    let n = 0;
    [...new Set([...Object.keys(pageData),...Object.keys(savedData)])].forEach(k => {
      if (k.charAt(0) === '_') return;
      if (JSON.stringify(savedData[k]?.value) !== JSON.stringify(pageData[k]?.value)) n++;
    });
    if (JSON.stringify(pageData._blocks || []) !== JSON.stringify(savedData._blocks || [])) n++;
    if (JSON.stringify(pageData._sectionOrder || []) !== JSON.stringify(savedData._sectionOrder || [])) n++;
    if (JSON.stringify(pageData._domOrder || {}) !== JSON.stringify(savedData._domOrder || {})) n++;
    if (JSON.stringify(pageData._hidden || []) !== JSON.stringify(savedData._hidden || [])) n++;
    if (JSON.stringify(pageData._styles || {}) !== JSON.stringify(savedData._styles || {})) n++;
    if (JSON.stringify(pageData._dupes || []) !== JSON.stringify(savedData._dupes || [])) n++;
    if (JSON.stringify(pageData._images || {}) !== JSON.stringify(savedData._images || {})) n++;
    n += chromePendingCount();
    return n;
  }

  function editorStatus(message){const el=$('#edit-publish-status');if(el)el.textContent=message;}
  function flushActiveDraft(){if(!state.editing)return;document.activeElement?.blur();if(pendingCount())keepDraft();}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushActiveDraft();});
  window.addEventListener('pagehide',flushActiveDraft);
  function draftKey(){return 'gfs_page_draft:'+state.editUid+':'+pageKey;}
  function keepDraft(){try {localStorage.setItem(draftKey(),JSON.stringify({page:state.pending[pageKey]||{},chrome:chromePending,base:state.editBase,baseLoaded:state.editBaseLoaded,chromeBase:state.editChromeBase,at:Date.now()}));return true;}catch(_){return false;}}
  window.addEventListener('beforeunload',e=>{if(state.editing && pendingCount()){keepDraft();e.preventDefault();e.returnValue='';}});
  // ---- HREF MODAL -----------------------------------------------
  function openHrefModal(el) {
    state.currentHrefEl = el;
    $('#edit-href-input').value = el.getAttribute('href') || '';
    $('#edit-href-modal').classList.add('visible');
    setTimeout(() => $('#edit-href-input').focus(), 50);
  }
  function closeHrefModal() {
    $('#edit-href-modal').classList.remove('visible');
    $('#edit-href-text-wrap').style.display = 'none';
    chromeModalKey = null;
    state.currentHrefEl = null;
  }
  function applyHref() {
    if (chromeModalKey) { applyChromeModal(); $('#edit-href-modal').classList.remove('visible'); return; }
    const el = state.currentHrefEl;
    if (!el) return closeHrefModal();
    const raw = $('#edit-href-input').value.trim();
    const next = safeHref(raw);
    if(raw && !next) return toast('Use an https, email, phone or site link.','error');
    if (next && next !== el.getAttribute('href')) {
      el.setAttribute('href', next);
      el.classList.add('edited');
      recordHrefChange(el);
      toast('Link updated — remember to Save Changes');
    }
    closeHrefModal();
  }

  // ---- IMAGE MODAL ----------------------------------------------
  function imageForm(data={},url=''){
    const value=window.GFSCMS.imageSettings(data);
    for(const name of ['alt','x','y','fit','ratio','width','align']) $('#edit-img-'+name).value=value[name];
    $('#edit-img-url').value=url;
    $('#edit-img-preview').src=url;$('#edit-img-preview').classList.toggle('visible',!!url);
    const block=state.currentImgKey?.startsWith('_block:')?currentBlocks().find(b=>b.id===state.currentImgKey.slice(7)):null;
    $('#edit-img-placement-wrap').hidden=!block;
    const placement=$('#edit-img-placement');placement.replaceChildren();
    if(block)tagSections().filter(sec=>!protectedContent(sec)).forEach(sec=>{
      const option=document.createElement('option');option.value=sec.dataset.gfsSec;
      option.textContent=(sec.querySelector('h1,h2,h3')?.textContent||'Page section').trim().slice(0,100);
      option.selected=option.value===block.anchor;placement.appendChild(option);
    });
    imagePreview();
  }
  function imageValue(){return window.GFSCMS.imageSettings(Object.fromEntries(['alt','x','y','fit','ratio','width','align'].map(k=>[k,$('#edit-img-'+k).value])));}
  function imagePreview(){
    const value=imageValue(),img=$('#edit-img-preview');window.GFSCMS.styleImage(img,value);
    img.classList.toggle('visible',!!img.getAttribute('src'));
    $('#edit-img-width-value').textContent=value.width+'%';
    $('#edit-img-x-value').textContent=Math.round(value.x)+'%';$('#edit-img-y-value').textContent=Math.round(value.y)+'%';
  }
  function openImageModal(el) {
    state.currentImg = el;
    state.currentImgKey = el.getAttribute('data-editable-img');
    $('#edit-img-url').value = '';
    $('#edit-img-preview').classList.remove('visible');
    const image=el.tagName==='IMG'?el:el.querySelector('img');
    imageForm(((state.pending[pageKey]||{})._images||{})[state.currentImgKey]||{alt:image?.alt||''}, image?.getAttribute('src')||'');
    $('#edit-img-modal').classList.add('visible');
  }
  function closeImageModal() {
    $('#edit-img-modal').classList.remove('visible');
    state.currentImg = null; state.currentImgKey = null;
  }
  function applyImageFromUrl(url) {
    url=safeImage(url);
    if (!url) return toast('Choose an image file or a valid image URL.','error');
    snapshotForUndo();
    const imageOptions=imageValue();
    // v3 inserted-image blocks use a pseudo key '_block:<id>'
    if (state.currentImgKey && state.currentImgKey.indexOf('_block:') === 0) {
      if (url.startsWith('data:') && url.length > CFG.imgMaxBytes * 1.4) {
        toast('That image is too large to publish. Use a smaller photo or paste a hosted URL.', 'error');
        return;
      }
      const bid = state.currentImgKey.slice(7);
      const blocks = currentBlocks();
      const blk = blocks.find(x => x.id === bid);
      if (blk) { blk.value = url; blk.image = imageOptions; if($('#edit-img-placement').value)blk.anchor=$('#edit-img-placement').value; markBlocksChanged(); renderBlocks(blocks); buildInsertBars(); }
      closeImageModal();
      toast('Photo added \u2014 remember to Save Changes');
      return;
    }
    if (!state.currentImg) return;
    if (url.startsWith('data:') && url.length > CFG.imgMaxBytes * 1.4) {
      toast('That image is too large to publish (' + Math.round(url.length / 1024) + ' KB). Use a smaller photo or paste a hosted URL.', 'error');
      return;
    }
    const target = state.currentImg.tagName === 'IMG'
      ? state.currentImg
      : state.currentImg.querySelector('img');
    if (target) {target.removeAttribute('srcset');target.removeAttribute('sizes');target.src = url;}
    state.currentImg.classList.add('edited');
    recordImageChange(state.currentImgKey, url);
    (state.pending[pageKey]._images ||= {})[state.currentImgKey]=imageOptions;
    window.GFSCMS.styleImage(target,imageOptions);
    updateCounter();
    closeImageModal();
    toast('Image replaced — remember to Save Changes');
  }

  // Compress a dropped/browsed file with canvas before storing it.
  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let width = img.width, height = img.height;
        const maxDim = CFG.imgMaxDim;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        let q = CFG.imgQuality;
        let out = canvas.toDataURL('image/jpeg', q);
        while (out.length > CFG.imgMaxBytes * 1.37 && q > 0.5) {
          q -= 0.08;
          out = canvas.toDataURL('image/jpeg', q);
        }
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }

  async function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('Please drop an image file', 'error');
      return;
    }
    toast('Compressing image…');
    try {
      const imageKey=state.currentImgKey, owner=currentUser?.uid;
      const dataUrl = await compressImageFile(file);
      if (dataUrl.length > CFG.imgMaxBytes * 1.4) {
        toast('Image is still too large after compression. Use a smaller photo or paste a hosted URL.', 'error');
        return;
      }
      let imageUrl=dataUrl;
      if(canPublish()){
        toast('Uploading photo…');
        const bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),c=>c.charCodeAt(0));
        imageUrl=await window.GFSCMS.uploadPhoto(new Blob([bytes],{type:'image/jpeg'}),owner);
      }
      if(state.currentImgKey!==imageKey || !$('#edit-img-modal').classList.contains('visible'))return;
      $('#edit-img-preview').src = imageUrl;
      $('#edit-img-preview').classList.add('visible');
      $('#edit-img-url').value = imageUrl;
      imagePreview();
      toast('Ready — click Apply (' + Math.round(dataUrl.length * 0.73 / 1024) + ' KB)');
    } catch (e) {
      toast('Could not process that image: ' + e.message, 'error');
    }
  }

  // ---- v3.1: SITE-WIDE CHROME EDITING (nav + footer) ------------
  // Nav links, mobile-drawer links, and footer text/links are shared
  // across every page, so their edits live in ONE doc:
  //   siteContent/_chrome  { 'nav:0': {text,href}, 'foot-text:2': {text}, ... }
  // Every page loads it (cached 10 min) and applies it; editing any
  // page's header/footer updates the whole site on Save.

  const CHROME_DOC = '_chrome';
  const CHROME_CACHE = 'gfs_chrome_v1';
  let chromeSaved = {};
  let chromePending = {};
  let chromeOriginals=[];
  function restoreChrome(){for(const o of chromeOriginals){if(o.href!==null)o.el.setAttribute('href',o.href);if(o.el.innerHTML!==o.html)o.el.innerHTML=o.html;}applyTheme({});}

  function chromeEls() {
    const map = {};
    document.querySelectorAll('.nav-links a:not([data-dyn])').forEach((el, i) => { map['nav:' + i] = el; });
    document.querySelectorAll('.mobile-drawer a:not([data-dyn])').forEach((el, i) => { map['drawer:' + i] = el; });
    const foot = document.querySelector('footer');
    if (foot) {
      foot.querySelectorAll('a').forEach((el, i) => { map['foot-link:' + i] = el; });
      foot.querySelectorAll('p, li, h3, h4, h5, span.footer-tagline').forEach((el, i) => {
        if (!el.querySelector('a')) map['foot-text:' + i] = el;
      });
    }
    const brandEl = document.querySelector('.logo .logo__name');
    if (brandEl) map['brand'] = brandEl;
    const brandTag = document.querySelector('.logo small.spec');
    if (brandTag) map['brand-tag'] = brandTag;
    return map;
  }

  function applyChrome() {
    restoreChrome();
    applyTheme(chromeSaved && chromeSaved._theme);
    const map = chromeEls();
    Object.entries(chromeSaved).forEach(([key, entry]) => {
      if (key === '_theme') return;
      const el = map[key];
      if (!el || !entry) return;
      if (entry.text != null && entry.text !== '') el.textContent = entry.text;
      if (entry.href != null && entry.href !== '' && el.tagName === 'A') el.setAttribute('href', safeHref(entry.href) || '#');
    });
  }

  async function loadChrome(force=false) {
    if(state.editing)return false;
    try {
      const raw = localStorage.getItem(CHROME_CACHE);
      if (raw) {
        const c = JSON.parse(raw);
        if (!force && c && c.data) { chromeSaved = c.data; applyChrome(); }
      }
    } catch (e) {}
    if (!window.GFS_DB) return;
    try {
      const doc = await readWithDeadline(window.GFS_DB.collection(CFG.firestoreCollection).doc(CHROME_DOC),force);
      if(state.editing)return false;
      {
        chromeSaved = doc.exists ? doc.data() || {} : {};
        applyChrome();
        try { localStorage.setItem(CHROME_CACHE, JSON.stringify({ ts: Date.now(), data: chromeSaved })); } catch (e) {}
      }
      return true;
    } catch (e) {return false;}
  }

  function chromePendingCount() {
    return [...new Set([...Object.keys(chromePending),...Object.keys(chromeSaved)])].filter(k =>
      JSON.stringify(chromePending[k]) !== JSON.stringify(chromeSaved[k] || null)).length;
  }

  function bindChrome() {
    const map = chromeEls();
    Object.entries(map).forEach(([key, el]) => {
      if(el.tagName!=='A')el.setAttribute('contenteditable','true');
      if (el.dataset.chromeBound === 'yes') return;
      el.dataset.chromeBound = 'yes';
      el.classList.add('gfs-chrome-editable');
      if (el.tagName === 'A') {
        el.addEventListener('click', (e) => {
          if (!state.editing) return;
          e.preventDefault(); e.stopPropagation();
          openChromeModal(key, el);
        });
      } else {
        el.setAttribute('contenteditable', 'true');
        const record=()=>{if(!state.editing)return;chromePending[key]={text:el.textContent.trim()};el.classList.add('edited');updateCounter();};
        el.addEventListener('blur',record);el.addEventListener('input',record);
        el.addEventListener('paste', (e) => {
          e.preventDefault();
          const t = (e.clipboardData || window.clipboardData).getData('text/plain');
          document.execCommand('insertText', false, t);
        });
      }
    });
  }

  function unbindChromeEditing() {
    document.querySelectorAll('.gfs-chrome-editable').forEach(el => {
      el.setAttribute('contenteditable', 'false');
      el.classList.remove('gfs-chrome-editable');
    });
  }

  let chromeModalKey = null;
  function openChromeModal(key, el) {
    chromeModalKey = key;
    $('#edit-href-text-wrap').style.display = 'block';
    $('#edit-href-text').value = el.textContent.trim();
    $('#edit-href-input').value = el.getAttribute('href') || '';
    $('#edit-href-modal').classList.add('visible');
    setTimeout(() => $('#edit-href-text').focus(), 50);
  }
  function applyChromeModal() {
    if (!chromeModalKey) return false;
    const map = chromeEls();
    const el = map[chromeModalKey];
    const text = $('#edit-href-text').value.trim();
    const href = $('#edit-href-input').value.trim();
    if (el) {
      if (text) el.textContent = text;
      if (href) el.setAttribute('href', href);
      el.classList.add('edited');
    }
    chromePending[chromeModalKey] = { text: text, href: href };
    chromeModalKey = null;
    $('#edit-href-text-wrap').style.display = 'none';
    updateCounter();
    toast('Header/footer change staged \u2014 saves site-wide');
    return true;
  }

  // ---- v3: INSERTED BLOCKS + SECTION REORDER --------------------
  // Owner-added content blocks live in the page's siteContent doc under
  // the reserved key `_blocks`: [{id, anchor, type:'text'|'img', value,
  // caption}] rendered after their anchor <section> for EVERY visitor.
  // `_sectionOrder` is an array of section ids persisting section moves.

  function tagSections() {
    const secs = document.querySelectorAll('main section');
    secs.forEach((s, i) => { if (!s.dataset.gfsSec) s.dataset.gfsSec = 's' + i; });
    return Array.from(secs);
  }

  function applySectionOrder(order) {
    if (!Array.isArray(order) || !order.length) { tagSections(); return; }
    const main = document.querySelector('main');
    if (!main) return;
    // Older pages may have fewer section IDs. Keep their chosen order first,
    // then retain newly added sections in source order. Working forms stay put.
    const sections=tagSections().filter(sec=>sec.parentElement===main&&!protectedContent(sec));
    const arranged=[];
    for(const id of order){const sec=sections.find(node=>node.dataset.gfsSec===id);if(sec&&!arranged.includes(sec))arranged.push(sec);}
    arranged.push(...sections.filter(sec=>!arranged.includes(sec)));
    const slots=sections.map(sec=>{const marker=document.createComment('section slot');sec.before(marker);return marker;});
    slots.forEach((slot,i)=>slot.replaceWith(arranged[i]));
  }

  function currentBlocks() {
    const store = state.editing ? state.pending : state.saved;
    if (!store[pageKey]) store[pageKey] = {};
    if (!Array.isArray(store[pageKey]._blocks)) store[pageKey]._blocks = [];
    return store[pageKey]._blocks;
  }

  function markBlocksChanged() {
    if (!state.pending[pageKey]) state.pending[pageKey] = {};
    updateCounter();
  }

  function renderBlocks(blocks) {
    document.querySelectorAll('.gfs-block').forEach(el => el.remove());
    if (!Array.isArray(blocks)) return;
    tagSections();
    blocks.forEach(blk => {
      const anchor = document.querySelector('section[data-gfs-sec="' + blk.anchor + '"]');
      if (!anchor) return;
      const wrap = document.createElement('div');
      wrap.className = 'gfs-block';
      wrap.dataset.bid = blk.id;
      wrap.style.cssText = 'max-width:860px;margin:24px auto;padding:0 20px;position:relative;';
      if (blk.type === 'img') {
        const imageURL = safeImage(blk.value);
        if (!imageURL && !state.editing) return;
        const layout=window.GFSCMS.imageSettings(blk.image||{});
        if(blk.image && ('width' in blk.image || 'align' in blk.image)){
          wrap.style.width=layout.width+'%';wrap.style.maxWidth='1200px';wrap.style.boxSizing='border-box';
          wrap.style.marginLeft=layout.align==='left'?'0':'auto';wrap.style.marginRight=layout.align==='right'?'0':'auto';
        }
        const img = document.createElement('img');
        if (imageURL) img.src = imageURL;
        if(blk.image) window.GFSCMS.styleImage(img,{...blk.image,width:100});
        img.alt = blk.image?.alt || blk.caption || '';
        img.loading = 'lazy';
        img.style.cssText = 'width:100%;border-radius:6px;display:block;';
        if(blk.image) window.GFSCMS.styleImage(img,{...blk.image,width:100});
        if (imageURL) wrap.appendChild(img);
        else {
          const placeholder = document.createElement('p');
          placeholder.textContent = 'Choose a photo for this image block.';
          placeholder.style.cssText = 'padding:32px;background:#edf4fb;color:#163c60;text-align:center;';
          wrap.appendChild(placeholder);
        }
        if (blk.caption || state.editing) {
          const cap = document.createElement('div');
          cap.className = 'gfs-block-caption';
          cap.textContent = blk.caption || '';
          cap.style.cssText = 'margin-top:8px;font-size:13px;color:#5C6873;text-align:center;min-height:1em;';
          if (state.editing && !blk.caption) {
            cap.textContent = 'Add a caption\u2026';
            cap.style.opacity = '0.55';
          }
          wrap.appendChild(cap);
        }
      } else if (blk.type === 'btn') {
        const wrapBtn = document.createElement('div');
        wrapBtn.style.cssText = 'text-align:center;';
        const aEl = document.createElement('a');
        aEl.href = safeHref(blk.href) || '#';
        aEl.textContent = blk.value || 'Button';
        aEl.className = 'btn btn-primary btn-lg';
        aEl.style.cssText = 'display:inline-block;';
        if (state.editing) aEl.addEventListener('click', (e) => {
          e.preventDefault();
          const label = prompt('Button text:', blk.value || '');
          if (label === null) return;
          const href = prompt('Link:', blk.href || '');
          if (href === null) return;
          const blocks = currentBlocks();
          const b2b = blocks.find(x => x.id === blk.id);
          if (b2b) { b2b.value = label || b2b.value; b2b.href = href || b2b.href; markBlocksChanged(); renderBlocks(blocks); buildInsertBars(); }
        });
        wrapBtn.appendChild(aEl);
        wrap.appendChild(wrapBtn);
      } else {
        const txt = document.createElement('div');
        txt.className = 'gfs-block-text';
        txt.innerHTML = safeHTML(blk.value || '');
        txt.style.cssText = 'font-size:17px;line-height:1.7;';
        wrap.appendChild(txt);
      }
      // insert after anchor, after any earlier blocks with the same anchor
      let after = anchor;
      let sib = anchor.nextElementSibling;
      while (sib && sib.classList && sib.classList.contains('gfs-block')) { after = sib; sib = sib.nextElementSibling; }
      after.parentNode.insertBefore(wrap, after.nextElementSibling);
      if (state.editing) decorateBlock(wrap, blk);
    });
  }

  function decorateBlock(wrap, blk) {
    wrap.style.outline = '2px dashed #B8945A';
    wrap.style.outlineOffset = '4px';
    const bar = document.createElement('div');
    bar.className = 'gfs-block-bar';
    bar.style.cssText = 'position:absolute;top:-14px;right:20px;display:flex;gap:4px;z-index:50;';
    bar.innerHTML =
      '<button data-act="up" title="Move up" style="' + BLOCK_BTN + '">\u2191</button>' +
      '<button data-act="down" title="Move down" style="' + BLOCK_BTN + '">\u2193</button>' +
      (blk.type === 'img' ? '<button data-act="img" title="Edit photo size, crop and placement" aria-label="Edit photo size, crop and placement" style="' + BLOCK_BTN + '">\uD83D\uDDBC</button>' : '') +
      '<button data-act="del" title="Delete block" style="' + BLOCK_BTN + 'background:#B3261E;">\u2715</button>';
    wrap.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const act = e.target && e.target.dataset ? e.target.dataset.act : null;
      if (!act) return;
      e.preventDefault(); e.stopPropagation();
      snapshotForUndo();
      const blocks = currentBlocks();
      const idx = blocks.findIndex(x => x.id === blk.id);
      if (idx < 0) return;
      if (act === 'del') {
        blocks.splice(idx, 1);
      } else if (act === 'up' || act === 'down') {
        // swap with neighbouring block sharing the same anchor
        const dir = act === 'up' ? -1 : 1;
        let j = idx + dir;
        while (j >= 0 && j < blocks.length && blocks[j].anchor !== blk.anchor) j += dir;
        if (j >= 0 && j < blocks.length) {
          const t = blocks[idx]; blocks[idx] = blocks[j]; blocks[j] = t;
        } else {
          const sections=tagSections(), anchorIndex=sections.findIndex(sec=>sec.dataset.gfsSec===blk.anchor), target=sections[anchorIndex+dir];
          if(target) blk.anchor=target.dataset.gfsSec;
        }
      } else if (act === 'img') {
        state.currentImg = null;
        state.currentImgKey = '_block:' + blk.id;
        imageForm(blk.image||{alt:blk.caption||''},blk.value||'');
        $('#edit-img-modal').classList.add('visible');
        return;
      }
      markBlocksChanged();
      renderBlocks(blocks);
    });
    if (blk.type === 'img') {
      const cap = wrap.querySelector('.gfs-block-caption');
      if (cap) {
        cap.setAttribute('contenteditable', 'true');
        cap.addEventListener('focus', () => {
          if (cap.style.opacity === '0.55') { cap.textContent = ''; cap.style.opacity = '1'; }
        });
        cap.addEventListener('blur', () => {
          const blocks = currentBlocks();
          const b2 = blocks.find(x => x.id === blk.id);
          const val = cap.textContent.trim();
          if (b2 && val !== 'Add a caption\u2026') { b2.caption = val; markBlocksChanged(); }
          if (!val) { cap.textContent = 'Add a caption\u2026'; cap.style.opacity = '0.55'; }
        });
        cap.addEventListener('paste', (e) => {
          e.preventDefault();
          const t = (e.clipboardData || window.clipboardData).getData('text/plain');
          document.execCommand('insertText', false, t);
        });
      }
    }
    if (blk.type === 'text') {
      const txt = wrap.querySelector('.gfs-block-text');
      txt.setAttribute('contenteditable', 'true');
      txt.addEventListener('blur', () => {
        const blocks = currentBlocks();
        const b2 = blocks.find(x => x.id === blk.id);
        if (b2) { b2.value = txt.innerHTML.trim(); markBlocksChanged(); }
      });
      txt.addEventListener('paste', (e) => {
        e.preventDefault();
        const t = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, t);
      });
    }
  }

  const BLOCK_BTN = 'background:#1A2E40;color:#FBFAF7;border:none;border-radius:4px;min-width:44px;height:44px;cursor:pointer;font-size:16px;';

  function buildInsertBars() {
    document.querySelectorAll('.gfs-insert-bar').forEach(el => el.remove());
    if (!state.editing) return;
    tagSections().forEach(sec => {
      if (protectedContent(sec)) return;
      const bar = document.createElement('div');
      bar.className = 'gfs-insert-bar';
      bar.style.cssText = 'max-width:860px;margin:10px auto;text-align:center;';
      bar.innerHTML =
        '<button data-ins="text" style="' + INS_BTN + '">\uFF0B Text</button> ' +
        '<button data-ins="img" style="' + INS_BTN + '">\uFF0B Photo</button> ' +
        '<button data-ins="btn" style="' + INS_BTN + '">\uFF0B Button</button>';
      bar.addEventListener('click', (e) => {
        const kind = e.target && e.target.dataset ? e.target.dataset.ins : null;
        if (!kind) return;
        snapshotForUndo();
        const blocks = currentBlocks();
        const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        if (kind === 'text') {
          blocks.push({ id, anchor: sec.dataset.gfsSec, type: 'text', value: 'New text \u2014 click to edit\u2026' });
          markBlocksChanged();
          renderBlocks(blocks);
          buildInsertBars();
        } else if (kind === 'btn') {
          const label = prompt('Button text:', 'Get my free estimate');
          if (!label) return;
          const href = prompt('Where should it link? (https://\u2026 or /quote/ballpark/)', '/quote/ballpark/');
          if (!href) return;
          blocks.push({ id, anchor: sec.dataset.gfsSec, type: 'btn', value: label, href: href });
          markBlocksChanged();
          renderBlocks(blocks);
          buildInsertBars();
        } else {
          blocks.push({ id, anchor: sec.dataset.gfsSec, type: 'img', value: '', caption: '' });
          markBlocksChanged();
          state.currentImg = null;
          state.currentImgKey = '_block:' + id;
          imageForm();
          $('#edit-img-modal').classList.add('visible');
        }
      });
      sec.parentNode.insertBefore(bar, sec.nextElementSibling);
    });
  }

  const INS_BTN = 'background:none;border:1px dashed #B8945A;color:#8a6a33;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:12.5px;font-weight:600;';

  function buildSectionHandles() {
    document.querySelectorAll('.gfs-sec-handle').forEach(el => el.remove());
    if (!state.editing) return;
    tagSections().forEach(sec => {
      if (protectedContent(sec)) return;
      sec.style.position = sec.style.position || 'relative';
      const h = document.createElement('div');
      h.className = 'gfs-sec-handle';
      h.style.cssText = 'position:absolute;top:6px;right:6px;z-index:60;display:flex;gap:4px;';
      h.innerHTML =
        '<button data-mv="-1" title="Move section up" style="' + BLOCK_BTN + '">\u2191</button>' +
        '<button data-mv="1" title="Move section down" style="' + BLOCK_BTN + '">\u2193</button>';
      h.addEventListener('click', (e) => {
        const mv = e.target && e.target.dataset ? parseInt(e.target.dataset.mv, 10) : 0;
        if (!mv) return;
        e.preventDefault(); e.stopPropagation();
        const main = sec.parentNode;
        const secs = Array.from(main.querySelectorAll('section'));
        const i = secs.indexOf(sec);
        const j = i + mv;
        if (j < 0 || j >= secs.length) return;
        if (mv < 0) main.insertBefore(sec, secs[j]);
        else main.insertBefore(secs[j], sec);
        // persist new order
        const order = Array.from(main.querySelectorAll('section')).map(s => s.dataset.gfsSec);
        if (!state.pending[pageKey]) state.pending[pageKey] = {};
        state.pending[pageKey]._sectionOrder = order;
        markBlocksChanged();
        renderBlocks(currentBlocks());
        buildInsertBars();
        buildSectionHandles();
        sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      sec.appendChild(h);
    });
  }

  // ---- v5.1: SITE-WIDE COLOR THEME ------------------------------
  // Edit your brand colors once, everywhere. Stored in the shared
  // _chrome doc under _theme and applied for every visitor on load.
  const THEME_VARS = [
    ['navy',  'Primary (headers, buttons)', '--navy',  '#1e3a5f'],
    ['gold',  'Accent (highlights)',        '--gold',  '#c9a227'],
    ['cedar', 'Cedar accent',               '--cedar', '#A4552B'],
    ['bg',    'Page background',            '--cream', '#FBFAF7'],
  ];
  function applyTheme(theme) {
    theme ||= {};
    const r = document.documentElement.style;
    for(const cssVar of ['--navy','--gold','--cedar','--cream','--vellum','--ink-2'])r.removeProperty(cssVar);
    THEME_VARS.forEach(([key, _label, cssVar]) => {
      if (theme[key]) {
        r.setProperty(cssVar, theme[key]);
        if (cssVar === '--cream') { r.setProperty('--vellum', theme[key]); }
        if (cssVar === '--navy')  { r.setProperty('--ink-2', theme[key]); }
      }
    });
  }
  function openThemePanel() {
    let p = document.getElementById('gfs-theme-panel');
    if (p) { p.style.display = 'block'; return; }
    p = document.createElement('div');
    p.id = 'gfs-theme-panel';
    p.style.cssText = 'position:fixed;bottom:70px;right:16px;z-index:99999;background:#0E1720;color:#FBFAF7;padding:16px 18px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.4);width:270px;font-size:13px;';
    const cur = (chromePending && chromePending._theme) || (chromeSaved && chromeSaved._theme) || {};
    p.innerHTML = '<div style="font-weight:800;margin-bottom:10px;">\uD83C\uDFA8 Site colors \u2014 changes everywhere</div>' +
      THEME_VARS.map(([key, label, _v, def]) =>
        '<label style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;">' + label +
        '<input type="color" data-theme="' + key + '" value="' + (cur[key] || def) + '" style="width:44px;height:30px;border:none;border-radius:5px;background:none;cursor:pointer;"></label>').join('') +
      '<div style="display:flex;gap:8px;margin-top:12px;">' +
      '<button id="gfs-theme-reset" style="' + BLOCK_BTN + 'width:auto;padding:0 12px;background:#B3261E;">Reset</button>' +
      '<button id="gfs-theme-done" style="' + BLOCK_BTN + 'width:auto;padding:0 12px;background:#1A7A4A;flex:1;">Done \u2014 save with Publish changes</button></div>';
    document.body.appendChild(p);
    p.addEventListener('input', (e) => {
      const i = e.target.closest('[data-theme]');
      if (!i) return;
      if (!chromePending._theme) chromePending._theme = {};
      chromePending._theme[i.dataset.theme] = i.value;
      applyTheme(chromePending._theme);
      updateCounter();
    });
    p.querySelector('#gfs-theme-done').addEventListener('click', () => { p.style.display = 'none'; });
    p.querySelector('#gfs-theme-reset').addEventListener('click', () => {
      delete chromePending._theme;
      THEME_VARS.forEach(([_k, _l, cssVar]) => document.documentElement.style.removeProperty(cssVar));
      document.documentElement.style.removeProperty('--vellum');
      document.documentElement.style.removeProperty('--ink-2');
      p.querySelectorAll('[data-theme]').forEach((i, idx) => { i.value = THEME_VARS[idx][3]; });
      updateCounter();
      toast('Colors reset to the original palette');
    });
  }

  // ---- v5.1: FIRST-RUN EDIT TOUR --------------------------------
  function maybeTour() {
    let seen = false;
    try { seen = localStorage.getItem('gfs_edit_tour') === '1'; } catch (e) {}
    if (seen) return;
    try { localStorage.setItem('gfs_edit_tour', '1'); } catch (e) {}
    const steps = [
      'Tap any text on the page to rewrite it \u2014 a formatting bar appears while you type',
      '\u26F6 Select: tap ANY element to move it, style it, duplicate it, or hide it',
      '\uD83C\uDFA8 Colors: change your whole site\u2019s palette \u00b7 \uD83D\uDC41 Preview shows the visitor view',
    ];
    steps.forEach((s, i) => setTimeout(() => toast(s), 700 + i * 3200));
  }

  // ---- v5: RICH-TEXT MINI TOOLBAR -------------------------------
  // Floats above whichever editable text you're typing in: bold,
  // italic, bullet list, link, clear formatting.
  let rtToolbar = null;
  function ensureRtToolbar() {
    if (rtToolbar) return rtToolbar;
    rtToolbar = document.createElement('div');
    rtToolbar.id = 'gfs-rt-toolbar';
    rtToolbar.style.cssText = 'position:absolute;z-index:99997;display:none;gap:2px;background:#0E1720;padding:4px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.35);';
    const btn = (cmd, label, title) =>
      '<button data-rt="' + cmd + '" title="' + title + '" style="' + BLOCK_BTN + 'min-width:30px;">' + label + '</button>';
    rtToolbar.innerHTML =
      btn('bold', '<b>B</b>', 'Bold') +
      btn('italic', '<i>I</i>', 'Italic') +
      btn('insertUnorderedList', '\u2022', 'Bullet list') +
      btn('link', '\uD83D\uDD17', 'Turn selection into a link') +
      btn('removeFormat', '\u2715', 'Clear formatting');
    rtToolbar.addEventListener('mousedown', (e) => e.preventDefault());
    rtToolbar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rt]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const cmd = b.dataset.rt;
      if (cmd === 'link') {
        const url = prompt('Link URL (https://\u2026 or /page/):');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
    });
    document.body.appendChild(rtToolbar);
    return rtToolbar;
  }
  function showRtToolbar(target) {
    const tb = ensureRtToolbar();
    const r = target.getBoundingClientRect();
    tb.style.display = 'flex';
    tb.style.left = Math.max(8, r.left + window.scrollX) + 'px';
    tb.style.top = Math.max(8, r.top + window.scrollY - 40) + 'px';
  }
  function hideRtToolbar() { if (rtToolbar) rtToolbar.style.display = 'none'; }
  document.addEventListener('focusin', (e) => {
    if (!state.editing || previewing) return;
    const t = e.target;
    if (t && t.isContentEditable && !t.closest('#gfs-edit-ui')) showRtToolbar(t);
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || !a.isContentEditable) hideRtToolbar();
    }, 150);
  });

  // ---- v5: PREVIEW-AS-VISITOR TOGGLE ----------------------------
  let previewing = false;
  function togglePreview() {
    previewing = !previewing;
    document.querySelectorAll('.gfs-insert-bar, .gfs-sec-handle, .gfs-block-bar, #gfs-rt-toolbar, #gfs-select-toolbar, #gfs-style-panel').forEach(el => {
      el.style.display = previewing ? 'none' : '';
    });
    if (previewing) { deselect(); hideRtToolbar(); }
    else { buildInsertBars(); buildSectionHandles(); renderBlocks(currentBlocks()); }
    const b = document.getElementById('edit-preview');
    if (b) b.textContent = previewing ? '\u270E Back to editing' : '\uD83D\uDC41 Preview';
    toast(previewing ? 'Previewing as a visitor \u2014 unsaved edits are safe' : 'Editing again');
  }

  // ---- v5: SITE PHOTO LIBRARY -----------------------------------
  async function collectSiteImages() {
    const seen = new Set();
    const out = [];
    const scan = (data) => {
      Object.values(data || {}).forEach(v => {
        if (v && v.type === 'img' && v.value && !seen.has(v.value)) { seen.add(v.value); out.push(v.value); }
      });
      ((data || {})._blocks || []).forEach(b => {
        if (b.type === 'img' && b.value && !seen.has(b.value)) { seen.add(b.value); out.push(b.value); }
      });
    };
    Object.values(state.saved).forEach(scan);
    Object.values(state.pending).forEach(scan);
    // Include the supplied project photographs, even before the first owner edit.
    try {
      const response=await fetch('/assets/data/site-photo-library.json?v=20260920-expanded');
      if(response.ok){const items=await response.json();for(const item of items){const url=safeImage(item.src);if(url&&!seen.has(url)){seen.add(url);out.push(url);}}}
    } catch(e) {}
    if (CFG.firestoreEnabled && window.GFS_DB && canPublish()) {
      try {
        const snap = await window.GFS_DB.collection(CFG.firestoreCollection).get();
        snap.forEach(doc => scan(doc.data()));
      } catch (e) {}
    }
    return out.slice(0, 240);
  }
  async function openPhotoLibrary() {
    let lib = document.getElementById('gfs-photo-lib');
    if (lib) lib.remove();
    lib = document.createElement('div');
    lib.id = 'gfs-photo-lib';
    lib.style.cssText = 'margin-top:12px;max-height:220px;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;';
    lib.innerHTML = '<div style="grid-column:1/-1;font-size:12px;color:#5C6873;">Loading your photo library\u2026</div>';
    const applyBtn = document.getElementById('edit-img-apply');
    applyBtn.parentNode.parentNode.insertBefore(lib, applyBtn.parentNode);
    const imgs = await collectSiteImages();
    if (!imgs.length) { lib.innerHTML = '<div style="grid-column:1/-1;font-size:12px;color:#5C6873;">No published photos yet \u2014 upload one above and it joins the library.</div>'; return; }
    lib.innerHTML = imgs.map((u, i) =>
      '<img data-lib="' + i + '" src="' + u.replace(/"/g, '&quot;') + '" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:5px;cursor:pointer;" loading="lazy">').join('');
    lib.__imgs = imgs;
    lib.addEventListener('click', (e) => {
      const im = e.target.closest('[data-lib]');
      if (!im) return;
      applyImageFromUrl(lib.__imgs[Number(im.dataset.lib)]);
    });
  }

  // ---- v4: UNDO + FULL PENDING REFRESH --------------------------
  // Every mutating edit snapshots the pending state first; Undo pops
  // the stack and re-renders the whole page from pending data.
  const undoStack = [];
  const origStyles = {};   // path -> original style.cssText (for _styles resets)

  function snapshotForUndo() {
    if (!state.editing) return;
    try {
      undoStack.push(JSON.stringify({
        page: state.pending[pageKey] || {},
        chrome: chromePending || {}
      }));
      if (undoStack.length > 40) undoStack.shift();
      const b = $('#edit-undo');
      if (b) b.disabled = false;
    } catch (e) {}
  }

  function undo() {
    if (!undoStack.length) return;
    const snap = JSON.parse(undoStack.pop());
    state.pending[pageKey] = snap.page;
    chromePending = snap.chrome;
    refreshFromPending();
    updateCounter();
    const b = $('#edit-undo');
    if (b) b.disabled = undoStack.length === 0;
    toast('Undone');
  }

  // Re-render the live DOM entirely from PENDING data (edit mode only).
  function refreshFromPending() {
    applyContent();bindEditables();buildInsertBars();buildSectionHandles();
    restoreChrome();
    applyTheme(chromePending._theme);
    const map=chromeEls();Object.entries(chromePending).forEach(([k,v])=>{const el=map[k];if(!el||!v)return;if(v.text!=null)el.textContent=v.text;if(v.href && safeHref(v.href))el.setAttribute('href',safeHref(v.href));});
    deselect();
  }

  // ---- v4: PER-ELEMENT STYLES ------------------------------------
  // _styles: { elementPath: { fs, fw, ta, col, bg } } applied inline
  // for every visitor at load, editable via the 🎨 panel in Select.
  function styleStore() {
    const store = state.editing ? state.pending : state.saved;
    if (!store[pageKey]) store[pageKey] = {};
    if (!store[pageKey]._styles) store[pageKey]._styles = {};
    return store[pageKey]._styles;
  }

  function applyOneStyle(el, s) {
    if (protectedContent(el)) return;
    const path = pathOf(el);
    if (path && !(path in origStyles)) origStyles[path] = el.style.cssText;
    if (s.fs) el.style.fontSize = s.fs;
    else el.style.fontSize = '';
    el.style.fontWeight = s.fw || '';
    el.style.textAlign = s.ta || '';
    el.style.color = s.col || '';
    el.style.backgroundColor = s.bg || '';
    if (s.bg) { el.style.padding = el.style.padding || '12px 16px'; el.style.borderRadius = '6px'; }
  }

  function applyStyles(resetFirst) {
    stampDom();
    if (resetFirst) {
      Object.entries(origStyles).forEach(([p, css]) => { const el = elByPath(p); if (el) el.style.cssText = css; });
    }
    const styles = (state.editing ? state.pending : state.saved)[pageKey];
    Object.entries((styles && styles._styles) || {}).forEach(([p, s]) => {
      const el = elByPath(p);
      if (el) applyOneStyle(el, s);
    });
  }

  let stylePanelPath = null;
  function openStylePanel(el) {
    const path = pathOf(el);
    if (path === null) { toast('This element can\u2019t be styled', 'error'); return; }
    stylePanelPath = path;
    let p = document.getElementById('gfs-style-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'gfs-style-panel';
      p.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:99999;background:#0E1720;color:#FBFAF7;padding:12px 14px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.4);display:flex;flex-wrap:wrap;gap:8px;align-items:center;max-width:94vw;font-size:12px;';
      const swatches = ['', '#1e3a5f', '#c9a227', '#A4552B', '#FBFAF7', '#B3261E'];
      p.innerHTML =
        '<span style="opacity:0.7;">Size</span>' +
        ['0.85em','1em','1.25em','1.6em'].map((v,i)=>'<button data-st="fs" data-v="'+(i===1?'':v)+'" style="'+STYLE_BTN+'">'+['S','M','L','XL'][i]+'</button>').join('') +
        '<button data-st="fw" data-v="800" style="'+STYLE_BTN+'font-weight:800;">B</button>' +
        '<span style="opacity:0.7;margin-left:6px;">Align</span>' +
        ['left','center','right'].map(v=>'<button data-st="ta" data-v="'+v+'" style="'+STYLE_BTN+'">'+v[0].toUpperCase()+'</button>').join('') +
        '<span style="opacity:0.7;margin-left:6px;">Text</span>' +
        swatches.map(c=>'<button data-st="col" data-v="'+c+'" style="'+STYLE_BTN+'width:22px;background:'+(c||'transparent')+';border:1.5px solid #5C6873;">'+(c?'':'\u2715')+'</button>').join('') +
        '<span style="opacity:0.7;margin-left:6px;">Fill</span>' +
        swatches.map(c=>'<button data-st="bg" data-v="'+c+'" style="'+STYLE_BTN+'width:22px;background:'+(c||'transparent')+';border:1.5px dashed #5C6873;">'+(c?'':'\u2715')+'</button>').join('') +
        '<button id="gfs-style-clear" style="'+STYLE_BTN+'background:#B3261E;width:auto;padding:0 10px;">clear</button>' +
        '<button id="gfs-style-close" style="'+STYLE_BTN+'background:#1A7A4A;">\u2713</button>';
      document.body.appendChild(p);
      p.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        if (b.id === 'gfs-style-close') { p.style.display = 'none'; return; }
        const styles = styleStore();
        snapshotForUndo();
        if (b.id === 'gfs-style-clear') {
          delete styles[stylePanelPath];
          const el = elByPath(stylePanelPath);
          if (el && stylePanelPath in origStyles) el.style.cssText = origStyles[stylePanelPath];
        } else {
          const cur = styles[stylePanelPath] || {};
          const k = b.dataset.st, v = b.dataset.v;
          if (k === 'fw') cur.fw = cur.fw ? '' : '800';
          else cur[k] = (cur[k] === v) ? '' : v;
          styles[stylePanelPath] = cur;
          const el = elByPath(stylePanelPath);
          if (el) applyOneStyle(el, cur);
        }
        updateCounter();
      });
    }
    p.style.display = 'flex';
  }
  const STYLE_BTN = 'background:#2C3E4E;color:#FBFAF7;border:none;border-radius:5px;height:24px;min-width:26px;cursor:pointer;font-size:11.5px;';

  // ---- v4: DUPLICATE ELEMENT --------------------------------------
  // _dupes: [{src: path, n: copies}] — clones re-created at load with
  // editable keys rewritten (~2, ~3 …) so copies are independently
  // editable and their text persists like any other key.
  function rewriteKeys(clone, suffix) {
    ['data-editable','data-editable-img','data-editable-caption','data-editable-href'].forEach(attr => {
      clone.querySelectorAll('['+attr+']').forEach(el => el.setAttribute(attr, el.getAttribute(attr) + '~' + suffix));
      if (clone.hasAttribute && clone.hasAttribute(attr)) clone.setAttribute(attr, clone.getAttribute(attr) + '~' + suffix);
    });
    clone.querySelectorAll('[data-gfsn]').forEach(el => el.removeAttribute('data-gfsn'));
    if (clone.removeAttribute) clone.removeAttribute('data-gfsn');
    clone.querySelectorAll('[data-bound]').forEach(el => el.removeAttribute('data-bound'));
    clone.querySelectorAll('[data-chrome-bound]').forEach(el => el.removeAttribute('data-chrome-bound'));
  }

  function applyDupes() {
    const pageData = (state.editing ? state.pending : state.saved)[pageKey] || {};
    (pageData._dupes || []).forEach(d => {
      const srcEl = elByPath(d.src);
      if (!srcEl || protectedContent(srcEl)) return;
      for (let i = 2; i <= (d.n + 1); i++) {
        const marker = 'dup-' + d.src.replace(/[^a-z0-9]/gi, '') + '-' + i;
        if (document.querySelector('[data-gfsdup="' + marker + '"]')) continue;
        const clone = srcEl.cloneNode(true);
        clone.removeAttribute("data-bound");
        rewriteKeys(clone, i);
        clone.setAttribute('data-gfsdup', marker);
        srcEl.parentNode.insertBefore(clone, srcEl.nextElementSibling);
      }
    });
  }

  function duplicateSelected(el) {
    if (protectedContent(el)) { toast('Forms and interactive tools stay fixed so they keep working.', 'error'); return; }
    const path = pathOf(el);
    if (path === null) { toast('This element can\u2019t be duplicated', 'error'); return; }
    snapshotForUndo();
    if (!state.pending[pageKey]) state.pending[pageKey] = {};
    const dupes = state.pending[pageKey]._dupes = state.pending[pageKey]._dupes || [];
    let rec = dupes.find(x => x.src === path);
    if (!rec) { rec = { src: path, n: 0 }; dupes.push(rec); }
    rec.n++;
    applyDupes();
    stampDom();
    if (state.editing) { bindEditables(); }
    updateCounter();
    toast('Duplicated \u2014 the copy\u2019s text is editable. To remove it, press Undo.');
  }

  // ---- v4: HIDDEN-ITEMS MANAGER + PAGE RESET ----------------------
  function openPageMenu() {
    const pd = state.pending[pageKey] || {};
    const hidden = pd._hidden || [];
    let msg = 'Hidden on this page: ' + hidden.length + ' item' + (hidden.length === 1 ? '' : 's') + '\n\n';
    if (hidden.length && confirm(msg + 'UNHIDE ALL hidden items on this page?')) {
      snapshotForUndo();
      pd._hidden = [];
      refreshFromPending();
      updateCounter();
      toast('All items unhidden');
      return;
    }
    if (confirm('RESET PAGE: permanently remove every saved change on this page (text, images, moves, styles, added blocks) and return it to the original design for ALL visitors?\n\nThis happens immediately and cannot be undone.')) {
      if (!(CFG.firestoreEnabled && window.GFS_DB && canPublish())) {
        toast('Sign in first (the cloud button) so the reset can be published', 'error');
        return;
      }
      window.GFS_DB.collection(CFG.firestoreCollection).doc(encodeURIComponent(pageKey)).delete()
        .then(() => { toast('Page reset \u2014 reloading\u2026'); setTimeout(() => window.location.reload(), 600); })
        .catch((e) => toast('Reset failed: ' + (e.message || e), 'error'));
    }
  }

  // ---- v3.2: SELECT / MOVE TOOL ---------------------------------
  // Tap ANY element inside <main>, then: move up/down among its
  // siblings, widen the selection to its container, or hide it.
  // Persistence model (per page, in the siteContent doc):
  //   _domOrder: { parentPath: [childKey, ...] }   sibling order
  //   _hidden:   [elementPath, ...]                hidden elements
  // Elements are identified by structural stamps (tag:index within
  // parent, ignoring edit-mode UI), assigned once per load BEFORE
  // any moves apply, so identities survive reordering.

  let selectMode = false;
  let selectedEl = null;

  function isGfsUi(el) {
    return el.closest && (el.closest('#gfs-edit-ui') || (el.hasAttribute && el.hasAttribute('data-gfsdup')) || (el.closest && el.closest('[data-gfsdup]')) || el.classList.contains('gfs-block')
      || el.classList.contains('gfs-insert-bar') || el.classList.contains('gfs-sec-handle')
      || el.closest('.gfs-block') || el.id === 'gfs-select-toolbar');
  }

  function stampDom() {
    const main = document.querySelector('main');
    if (!main) return;
    const walk = (parent) => {
      const counts = {};
      Array.from(parent.children).forEach(ch => {
        if (isGfsUi(ch)) return;
        // duplicates are re-created at load; they must never consume a
        // stamp slot or siblings after them get shifted identities,
        // breaking saved moves/styles/hides.
        if (ch.hasAttribute && ch.hasAttribute('data-gfsdup')) return;
        const tag = ch.tagName.toLowerCase();
        counts[tag] = (counts[tag] || 0) + 1;
        if (!ch.dataset.gfsn) ch.dataset.gfsn = tag + ':' + counts[tag];
        walk(ch);
      });
    };
    walk(main);
  }

  function pathOf(el) {
    const parts = [];
    let cur = el;
    const main = document.querySelector('main');
    while (cur && cur !== main && cur.dataset && cur.dataset.gfsn) {
      parts.unshift(cur.dataset.gfsn);
      cur = cur.parentElement;
    }
    return cur === main ? parts.join('>') : null;
  }

  function elByPath(path) {
    let cur = document.querySelector('main');
    if (!cur || !path) return null;
    for (const key of path.split('>')) {
      cur = Array.from(cur.children).find(ch => ch.dataset && ch.dataset.gfsn === key);
      if (!cur) return null;
    }
    return cur;
  }

  function applyMoves() {
    const pageData = (state.editing ? state.pending : state.saved)[pageKey] || {};
    stampDom();
    const orders = pageData._domOrder || {};
    Object.entries(orders).forEach(([parentPath, keys]) => {
      const parent = parentPath === '' ? document.querySelector('main') : elByPath(parentPath);
      if (!parent || !Array.isArray(keys) || (parent.tagName !== 'MAIN' && protectedContent(parent))) return;
      keys.forEach(k => {
        const ch = Array.from(parent.children).find(c => c.dataset && c.dataset.gfsn === k);
        if (ch && !protectedContent(ch)) parent.appendChild(ch);
      });
      // re-append any gfs blocks/bars so they stay after their anchors
    });
    (pageData._hidden || []).forEach(p => {
      const el = elByPath(p);
      if (!el || protectedContent(el)) return;
      if (state.editing) { el.classList.add('gfs-hidden-edit'); el.style.display = ''; }
      else el.style.display = 'none';
    });
  }

  function persistParentOrder(parent) {
    snapshotForUndo();
    const parentPath = parent === document.querySelector('main') ? '' : pathOf(parent);
    if (parentPath === null) return;
    const keys = Array.from(parent.children)
      .filter(ch => !isGfsUi(ch) && ch.dataset && ch.dataset.gfsn)
      .map(ch => ch.dataset.gfsn);
    if (!state.pending[pageKey]) state.pending[pageKey] = {};
    if (!state.pending[pageKey]._domOrder) state.pending[pageKey]._domOrder = {};
    state.pending[pageKey]._domOrder[parentPath] = keys;
    updateCounter();
  }

  // ---- v5.2: DRAG TO MOVE ---------------------------------------
  // Grab the ✥ handle on a selected element and drag it up or down —
  // a gold line shows where it will land among its siblings. Works
  // with mouse and touch; persists exactly like the arrow buttons.
  let dragState = null;
  function dropIndicator() {
    let d = document.getElementById('gfs-drop-line');
    if (!d) {
      d = document.createElement('div');
      d.id = 'gfs-drop-line';
      d.style.cssText = 'position:absolute;height:4px;background:#c9a227;border-radius:2px;z-index:99996;display:none;box-shadow:0 0 0 2px rgba(201,162,39,0.3);pointer-events:none;';
      document.body.appendChild(d);
    }
    return d;
  }
  function startDrag(e) {
    if (!selectedEl) return;
    e.preventDefault(); e.stopPropagation();
    const sibs = Array.from(selectedEl.parentElement.children).filter(c => !isGfsUi(c) && c !== selectedEl);
    dragState = { el: selectedEl, sibs, target: null, before: false };
    selectedEl.style.opacity = '0.45';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onDrag, { passive: false });
    window.addEventListener('pointerup', endDrag, { once: true });
  }
  function onDrag(e) {
    if (!dragState) return;
    e.preventDefault();
    const y = e.clientY;
    let best = null, bestDist = Infinity, before = false;
    dragState.sibs.forEach(sib => {
      const r = sib.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < bestDist) { bestDist = dist; best = sib; before = y < mid; }
    });
    dragState.target = best; dragState.before = before;
    const line = dropIndicator();
    if (best) {
      const r = best.getBoundingClientRect();
      line.style.display = 'block';
      line.style.left = (r.left + window.scrollX) + 'px';
      line.style.width = r.width + 'px';
      line.style.top = ((before ? r.top : r.bottom) + window.scrollY - 2) + 'px';
    } else line.style.display = 'none';
    // auto-scroll near viewport edges
    if (y < 70) window.scrollBy(0, -14);
    else if (y > innerHeight - 70) window.scrollBy(0, 14);
  }
  function endDrag() {
    window.removeEventListener('pointermove', onDrag);
    dropIndicator().style.display = 'none';
    document.body.style.userSelect = '';
    if (!dragState) return;
    const { el, target, before } = dragState;
    el.style.opacity = '';
    if (target && target !== el) {
      snapshotForUndo();
      if (before) target.parentElement.insertBefore(el, target);
      else target.parentElement.insertBefore(el, target.nextElementSibling);
      persistParentOrder(el.parentElement);
      positionToolbar(el);
      toast('Moved \u2014 saves with Save Changes');
    }
    dragState = null;
  }

  function selToolbar() {
    let tb = document.getElementById('gfs-select-toolbar');
    if (tb) return tb;
    tb = document.createElement('div');
    tb.id = 'gfs-select-toolbar';
    tb.style.cssText = 'position:absolute;z-index:99998;display:none;gap:4px;background:#0E1720;padding:5px;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.35);';
    tb.innerHTML =
      '<button data-sel="drag" title="Drag to move \u2014 hold and pull up or down" style="' + BLOCK_BTN + 'cursor:grab;touch-action:none;">\u2725</button>' +
            '<button data-sel="up" title="Move up/left" style="' + BLOCK_BTN + '">\u2191</button>' +
      '<button data-sel="down" title="Move down/right" style="' + BLOCK_BTN + '">\u2193</button>' +
      '<button data-sel="parent" title="Select the whole container" style="' + BLOCK_BTN + 'width:auto;padding:0 8px;">\u2B1A bigger</button>' +
      '<button data-sel="style" title="Style: size, color, alignment" style="' + BLOCK_BTN + '">\uD83C\uDFA8</button>' +
      '<button data-sel="dup" title="Duplicate this element" style="' + BLOCK_BTN + '">\u29C9</button>' +
      '<button data-sel="hide" title="Hide element" style="' + BLOCK_BTN + 'background:#B4530F;width:auto;padding:0 8px;">hide</button>' +
      '<button data-sel="done" title="Deselect" style="' + BLOCK_BTN + 'background:#1A7A4A;">\u2713</button>';
    tb.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('[data-sel="drag"]');
      if (h) startDrag(e);
    });
    tb.addEventListener('click', (e) => {
      const act = e.target && e.target.dataset ? e.target.dataset.sel : null;
      if (!act || act === 'drag' || !selectedEl) return;
      e.preventDefault(); e.stopPropagation();
      const el = selectedEl;
      if (act === 'up' || act === 'down') {
        const sibs = Array.from(el.parentElement.children).filter(c => !isGfsUi(c));
        const i = sibs.indexOf(el);
        const j = i + (act === 'up' ? -1 : 1);
        if (j < 0 || j >= sibs.length) return;
        if (act === 'up') el.parentElement.insertBefore(el, sibs[j]);
        else el.parentElement.insertBefore(sibs[j], el);
        persistParentOrder(el.parentElement);
        positionToolbar(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (act === 'parent') {
        const p = el.parentElement;
        if (p && p.tagName !== 'MAIN' && p.dataset && p.dataset.gfsn) selectEl(p);
      } else if (act === 'style') {
        openStylePanel(el);
        return;
      } else if (act === 'dup') {
        duplicateSelected(el);
        return;
      } else if (act === 'hide') {
        snapshotForUndo();
        const path = pathOf(el);
        if (path !== null) {
          if (!state.pending[pageKey]) state.pending[pageKey] = {};
          if (!Array.isArray(state.pending[pageKey]._hidden)) state.pending[pageKey]._hidden = [];
          if (state.pending[pageKey]._hidden.indexOf(path) < 0) state.pending[pageKey]._hidden.push(path);
          el.classList.add('gfs-hidden-edit');
          updateCounter();
          toast('Hidden \u2014 visitors won\u2019t see it after Save. Tap it again to unhide.');
        }
        deselect();
      } else if (act === 'done') {
        deselect();
      }
    });
    document.body.appendChild(tb);
    return tb;
  }

  function positionToolbar(el) {
    const tb = selToolbar();
    const r = el.getBoundingClientRect();
    tb.style.display = 'flex';
    tb.style.left = Math.max(8, r.left + window.scrollX) + 'px';
    tb.style.top = Math.max(8, r.top + window.scrollY - 38) + 'px';
  }

  function selectEl(el) {
    if (protectedContent(el)) { toast('Forms and interactive tools stay fixed so they keep working.'); return; }
    deselect();
    selectedEl = el;
    el.classList.add('gfs-selected');
    positionToolbar(el);
  }

  function deselect() {
    if (selectedEl) selectedEl.classList.remove('gfs-selected');
    selectedEl = null;
    const tb = document.getElementById('gfs-select-toolbar');
    if (tb) tb.style.display = 'none';
  }

  function onSelectClick(e) {
    if (!selectMode || !state.editing) return;
    const main = document.querySelector('main');
    if (!main) return;
    let t = e.target;
    if (t.closest('#gfs-select-toolbar')) return;      // toolbar handles itself
    if (!main.contains(t) || isGfsUi(t)) { return; }
    e.preventDefault(); e.stopPropagation();
    // unhide flow: tapping a hidden (ghosted) element unhides it
    const hiddenAncestor = t.closest('.gfs-hidden-edit');
    if (hiddenAncestor) {
      const path = pathOf(hiddenAncestor);
      const arr = (state.pending[pageKey] || {})._hidden || [];
      const i = arr.indexOf(path);
      if (i >= 0) { arr.splice(i, 1); updateCounter(); }
      hiddenAncestor.classList.remove('gfs-hidden-edit');
      toast('Unhidden');
      return;
    }
    // choose a sensible unit: the nearest stamped element
    while (t && t !== main && !(t.dataset && t.dataset.gfsn)) t = t.parentElement;
    if (t && t !== main) selectEl(t);
  }

  function setSelectMode(on) {
    selectMode = on;
    document.body.classList.toggle('gfs-selecting', on);
    const btn = document.getElementById('edit-select-tool');
    if (btn) {
      btn.style.background = on ? '#1A7A4A' : 'none';
      btn.textContent = on ? '\u2713 Select: ON' : '\u26F6 Select';
    }
    if (!on) deselect();
    else { stampDom(); toast('Select tool: tap anything on the page to move or hide it'); }
  }

  // ---- SAVE / DISCARD -------------------------------------------
  async function save() {
    if(state.saving)return;
    document.activeElement?.blur();
    const owner=currentUser?.uid||'local';
    if(owner!==state.editUid)return toast('Your account changed. Reopen Edit mode.','error');
    const intent=JSON.parse(JSON.stringify(state.pending[pageKey]||{})), shared=JSON.parse(JSON.stringify(chromePending));
    const draftKept=keepDraft();state.saving=true;updateCounter();editorStatus('Publishing to the live website…');
    const slowPublish=setTimeout(()=>editorStatus('Still waiting for the server · keep this page open'),10000);
    try {
      window.GFSCMS.sizeCheck(intent);
      if(CFG.firestoreEnabled){
        if(!window.GFS_DB || !canPublish())throw Error('Your draft is kept on this device. Sign in with Google to publish.');
        if(!state.editBaseLoaded)throw Error('The published page had not loaded when editing started. Keep this page open, copy your changes, then reopen Edit mode after reconnecting.');
        const check=()=>{if(currentUser?.uid!==owner || !canPublish())throw Error('Your account changed. Reopen Edit mode.');};
        const result=await window.GFSCMS.publish({db:window.GFS_DB,collection:CFG.firestoreCollection,pageId:encodeURIComponent(pageKey),base:state.editBase,local:intent,chromeBase:state.editChromeBase,chromeLocal:shared,chromeChanged:JSON.stringify(shared)!==JSON.stringify(state.editChromeBase),check});
        check();state.cloudPage=result.page;state.saved[pageKey]=result.page;chromeSaved=result.chrome;
        state.pending[pageKey]=window.GFSCMS.merge(intent,state.pending[pageKey]||{},result.page);
        chromePending=window.GFSCMS.merge(shared,chromePending,result.chrome);
        state.editBase=JSON.parse(JSON.stringify(result.page));state.editChromeBase=JSON.parse(JSON.stringify(result.chrome));
        state.lastPublished=Date.now();
        try{localStorage.setItem('gfs_last_publish',JSON.stringify({page:pageKey,at:state.lastPublished,owner}));}catch(_){}
        toast('Published — live for all visitors. No Netlify upload needed.');
      } else {
        state.saved[pageKey]=intent;chromeSaved=shared;toast('Saved to this browser');
      }
      persistToStorage();try{localStorage.setItem(CHROME_CACHE,JSON.stringify({ts:Date.now(),data:chromeSaved}));}catch(_){}
      if(!pendingCount())localStorage.removeItem(draftKey());else keepDraft();
      $$('.edited').forEach(el=>el.classList.remove('edited'));
    } catch(e){toast((e.message||'Publishing failed.')+(!draftKept?' Keep this page open; device storage is full.':''),'error');}
    finally{clearTimeout(slowPublish);state.saving=false;updateCounter();}
  }
  function discard() {
    if (!confirm('Discard all unsaved changes on this page?')) return;
    state.pending = JSON.parse(JSON.stringify(state.saved));
    chromePending=JSON.parse(JSON.stringify(chromeSaved));
    localStorage.removeItem(draftKey());undoStack.length=0;
    refreshFromPending();
    $$('.edited').forEach(el => el.classList.remove('edited'));
    updateCounter();
    toast('Changes discarded');
  }

  // ---- TOAST ----------------------------------------------------
  function toast(msg, kind) {
    const el = $('#gfs-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (kind || '');
    const duration = (kind === 'error') ? 9000 : 2400;
    requestAnimationFrame(() => el.classList.add('visible'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('visible'), duration);
  }

  // ---- KEYBOARD SHORTCUT ----------------------------------------
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      ensureAuthLoaded().then(() => {
        watchAuthState();
        if (!isLoggedIn()) { showLogin(); return; }
        state.editing ? exitEditMode() : enterEditMode();
      });
    }
    if (e.key === 'Escape') {
      if ($('#edit-img-modal') && $('#edit-img-modal').classList.contains('visible')) closeImageModal();
      if ($('#edit-href-modal') && $('#edit-href-modal').classList.contains('visible')) closeHrefModal();
    }
  });

  // ---- DYNAMIC PAGES: NAV INJECTION -----------------------------
  function rootPrefix() {
    const depth = pageKey.split('/').filter(Boolean).length;
    return depth === 0 ? './' : '../'.repeat(depth);
  }

  function injectNavLinks(pages) {
    if (!pages || !pages.length) return;
    const prefix = rootPrefix();
    const navUl = document.querySelector('.nav-links');
    const drawerUl = document.querySelector('.mobile-drawer ul');
    pages.forEach(p => {
      const href = prefix + 'p/?page=' + encodeURIComponent(p.slug);
      const label = p.navLabel || p.title || p.slug;
      if (navUl && !navUl.querySelector('[data-dyn="' + p.slug + '"]')) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href; a.setAttribute('data-dyn', p.slug); a.textContent = label;
        li.appendChild(a);
        navUl.appendChild(li);
      }
      if (drawerUl && !drawerUl.querySelector('[data-dyn="' + p.slug + '"]')) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href; a.setAttribute('data-dyn', p.slug); a.textContent = label;
        li.appendChild(a);
        drawerUl.insertBefore(li, drawerUl.lastElementChild);
      }
    });
  }

  async function loadDynamicNav() {
    try {
      const raw = localStorage.getItem(CFG.navCacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && Array.isArray(cached.pages)) injectNavLinks(cached.pages);
        // Cached links render immediately; always check the latest published pages.
      }
    } catch (e) {}
    if (!window.GFS_DB) return;
    try {
      const snap = await window.GFS_DB.collection(CFG.pagesCollection)
        .where('published', '==', true)
        .where('nav', '==', true)
        .get();
      const pages = [];
      snap.forEach(d => {
        const v = d.data() || {};
        pages.push({ slug: d.id, title: v.title || d.id, navLabel: v.navLabel || '' });
      });
      injectNavLinks(pages);
      try { localStorage.setItem(CFG.navCacheKey, JSON.stringify({ ts: Date.now(), pages: pages })); } catch (e) {}
    } catch (e) {
      // Rules not deployed yet, or offline — nav stays static.
    }
  }

  // ---- INJECT EDIT UI ON DOM READY ------------------------------
  function buildUI() {
    const prefix = rootPrefix();
    const html = '' +
      '<button id="edit-trigger" class="edit-mode-trigger" type="button">✏️ Edit Mode</button>' +

      '<div id="edit-bar" class="edit-bar" role="toolbar" aria-label="Edit toolbar">' +
        '<div class="edit-bar-brand">Edit Mode <span id="edit-counter" class="edit-bar-counter">0 changes</span><small id="edit-publish-status" role="status" style="display:block;font-size:11px;font-weight:400;margin-top:4px;max-width:280px">Changes publish directly to the website</small></div>' +
        '<div class="edit-bar-actions">' +
          '<button id="edit-undo" class="btn btn-ghost btn-sm" type="button" disabled style="color:var(--cream);border:1px solid var(--cream);border-radius:4px;">\u21A9 Undo</button>' +
                    '<button id="edit-select-tool" class="btn btn-ghost btn-sm" type="button" style="color:var(--cream);border:1px solid var(--cream);border-radius:4px;">\u26F6 Select</button>' +
          '<button id="edit-theme" class="btn btn-ghost btn-sm" type="button" style="color:var(--cream);border:1px solid var(--cream);border-radius:4px;">\uD83C\uDFA8 Colors</button>' +
          '<button id="edit-preview" class="btn btn-ghost btn-sm" type="button" style="color:var(--cream);border:1px solid var(--cream);border-radius:4px;">\uD83D\uDC41 Preview</button>' +
          '<button id="edit-page-menu" class="btn btn-ghost btn-sm" type="button" style="color:var(--cream);border:1px solid var(--cream);border-radius:4px;" title="Hidden items / reset page">\u22EF</button>' +
          '<button id="edit-save" class="btn btn-gold btn-sm" type="button" disabled>Save Changes</button>' +
          '<button id="edit-discard" class="btn btn-outline btn-sm" type="button" style="color:var(--cream);border-color:var(--cream);">Discard</button>' +
          '<a id="edit-admin" class="btn btn-ghost btn-sm" href="' + prefix + 'admin/" style="color:var(--cream);">Admin</a>' +
          '<a id="edit-newpage" class="btn btn-ghost btn-sm" href="' + prefix + 'admin/#pages" style="color:var(--gold-bright, #E3C08A);">＋ Page</a>' +
          '<button id="edit-exit" class="btn btn-ghost btn-sm" type="button" style="color:var(--cream);">Exit</button>' +
          '<button id="edit-logout" class="btn btn-ghost btn-sm" type="button" style="color:var(--gold-bright, #E3C08A);">Logout</button>' +
        '</div>' +
      '</div>' +

      '<div id="edit-login" class="edit-login" role="dialog" aria-modal="true">' +
        '<div class="edit-login-box">' +
          '<div id="edit-login-firebase" style="display:none;">' +
            '<h3>Owner Access</h3>' +
            '<p>Sign in with your authorized Google account to edit this site.</p>' +
            '<button id="edit-google-signin" type="button" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;background:#fff;color:#1f2937;border:1px solid #d1d5db;border-radius:4px;font-weight:600;cursor:pointer;font-size:15px;">' +
              '<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>' +
              'Sign in with Google</button>' +
            '<p style="margin-top:14px;font-size:12px;color:#6b7280;text-align:center;">Only authorized email addresses can edit. Unauthorized accounts will be signed out.</p>' +
            '<div class="edit-modal-actions" style="margin-top:16px;"><button id="edit-login-cancel-fb" class="btn btn-outline btn-sm" type="button">Cancel</button></div>' +
          '</div>' +
          '<div id="edit-login-password" style="display:none;">' +
            '<h3>Owner Access</h3>' +
            '<p>Enter the edit password for local preview mode.</p>' +
            '<input id="edit-pw" type="password" class="form-input" placeholder="Password" autocomplete="current-password">' +
            '<div class="edit-modal-actions" style="margin-top:16px;">' +
              '<button id="edit-login-cancel" class="btn btn-outline btn-sm" type="button">Cancel</button>' +
              '<button id="edit-login-submit" class="btn btn-primary btn-sm" type="button">Unlock</button>' +
            '</div>' +
            '<p style="margin-top:14px;font-size:11px;color:#6b7280;text-align:center;">Local-only preview — changes here never publish to the live site.</p>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="edit-img-modal" class="edit-modal-backdrop" role="dialog" aria-modal="true">' +
        '<div class="edit-modal">' +
          '<h3>Edit photo</h3>' +
          '<div id="edit-drop-zone" class="edit-drop-zone">' +
            '<strong>Drag &amp; drop an image</strong>' +
            '<p>or click to browse — photos are compressed automatically</p>' +
            '<input id="edit-file-input" type="file" accept="image/*" hidden>' +
          '</div>' +
          '<div class="gfs-photo-preview-stage"><img id="edit-img-preview" class="edit-preview" alt="Preview" draggable="false"></div>' +
          '<p class="gfs-photo-hint">Choose a frame, then drag the photo to adjust its crop. The sliders also work with a keyboard.</p>' +
          '<button id="edit-img-lib" type="button" class="btn btn-ghost btn-sm" style="margin:4px 0 10px;">\uD83D\uDDC2 My photos \u2014 reuse anything already on the site</button>' +
          '<label class="form-label">Or paste image URL</label>' +
          '<input id="edit-img-url" type="text" class="form-input" placeholder="https://...">' +
          '<label class="form-label" for="edit-img-alt">Photo description (alt text)</label><input id="edit-img-alt" class="form-input" maxlength="500">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px"><label>Frame<select id="edit-img-ratio" class="form-input"><option value="original">Original</option><option value="16/9">Wide</option><option value="4/3">Landscape</option><option value="1/1">Square</option><option value="3/4">Portrait</option></select></label><label>Fit<select id="edit-img-fit" class="form-input"><option value="cover">Fill frame</option><option value="contain">Show whole photo</option></select></label></div>' +
          '<label class="form-label" for="edit-img-x">Focus left / right <output id="edit-img-x-value"></output></label><input id="edit-img-x" type="range" min="0" max="100" value="50" style="width:100%">' +
          '<label class="form-label" for="edit-img-y">Focus up / down <output id="edit-img-y-value"></output></label><input id="edit-img-y" type="range" min="0" max="100" value="50" style="width:100%">' +
          '<label class="form-label" for="edit-img-width">Photo width <output id="edit-img-width-value"></output></label><input id="edit-img-width" type="range" min="25" max="100" step="1" value="100" style="width:100%">' +
          '<label class="form-label" for="edit-img-align">Position on page</label><select id="edit-img-align" class="form-input"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>' +
          '<div id="edit-img-placement-wrap" hidden><label class="form-label" for="edit-img-placement">Place photo after</label><select id="edit-img-placement" class="form-input"></select></div>' +
          '<button id="edit-img-reset" type="button" class="btn btn-ghost btn-sm">Reset size and crop</button>' +
          '<div class="edit-modal-actions">' +
            '<button id="edit-img-cancel" class="btn btn-outline btn-sm" type="button">Cancel</button>' +
            '<button id="edit-img-apply" class="btn btn-primary btn-sm" type="button">Apply</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="edit-href-modal" class="edit-modal-backdrop" role="dialog" aria-modal="true">' +
        '<div class="edit-modal">' +
          '<h3>Edit Link</h3>' +
          '<div id="edit-href-text-wrap" style="display:none;"><label class="form-label">Link text</label>' +
          '<input id="edit-href-text" type="text" class="form-input" placeholder="Label"></div>' +
          '<label class="form-label">Link URL</label>' +
          '<input id="edit-href-input" type="text" class="form-input" placeholder="https://... or /quote/">' +
          '<div class="edit-modal-actions">' +
            '<button id="edit-href-cancel" class="btn btn-outline btn-sm" type="button">Cancel</button>' +
            '<button id="edit-href-apply" class="btn btn-primary btn-sm" type="button">Apply</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="gfs-toast" class="toast" role="status" aria-live="polite"></div>';
    const wrap = document.createElement('div');
    wrap.id = 'gfs-edit-ui';
    wrap.innerHTML = html;
    const photoStyle=document.createElement('style');photoStyle.textContent='#edit-img-modal .edit-modal{max-height:90dvh;overflow:auto;width:min(620px,calc(100vw - 24px))}.gfs-photo-preview-stage{background:#eef1f4;padding:12px;min-height:80px;border-radius:8px}.gfs-photo-preview-stage #edit-img-preview{max-height:none;max-width:100%;touch-action:none;cursor:grab;margin-top:0}.gfs-photo-hint{font-size:14px;line-height:1.5;color:#435566}#edit-img-modal .form-label{font-size:14px}#edit-img-modal input[type=range]{min-height:36px}#edit-img-modal output{float:right;font-variant-numeric:tabular-nums}';wrap.appendChild(photoStyle);
    document.body.appendChild(wrap);
  }

  function wireUI() {
    $('#edit-img-reset').addEventListener('click',()=>{for(const [key,value] of Object.entries({x:50,y:50,width:100,align:'center',ratio:'original',fit:'cover'}))$('#edit-img-'+key).value=value;imagePreview();});
    const crop=$('#edit-img-preview');let drag=null;
    crop.addEventListener('pointerdown',e=>{
      if(e.button!==0 || imageValue().fit!=='cover')return;
      const rect=crop.getBoundingClientRect(),scale=Math.max(rect.width/crop.naturalWidth,rect.height/crop.naturalHeight);
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,value:imageValue(),overflowX:crop.naturalWidth*scale-rect.width,overflowY:crop.naturalHeight*scale-rect.height};
      crop.setPointerCapture(e.pointerId);e.preventDefault();
    });
    crop.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      if(drag.overflowX>1)$('#edit-img-x').value=Math.max(0,Math.min(100,drag.value.x-(e.clientX-drag.x)*100/drag.overflowX));
      if(drag.overflowY>1)$('#edit-img-y').value=Math.max(0,Math.min(100,drag.value.y-(e.clientY-drag.y)*100/drag.overflowY));
      imagePreview();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])crop.addEventListener(event,()=>{drag=null;});
    for(const k of ['alt','x','y','fit','ratio','width','align']) $('#edit-img-'+k).addEventListener('input',imagePreview);
    $('#edit-img-url').addEventListener('change',()=>{$('#edit-img-preview').src=safeImage($('#edit-img-url').value)||'';imagePreview();});
    $('#edit-trigger').addEventListener('click', () => {
      if (isLoggedIn()) { enterEditMode(); return; }
      // Firebase mode: the trigger is only visible when signed in, but if a
      // session expired mid-view, fall back to the login sheet.
      ensureAuthLoaded().then(() => { watchAuthState(); if (!isLoggedIn()) showLogin(); });
    });
    $('#edit-save').addEventListener('click', save);
    $('#edit-select-tool').addEventListener('click', () => setSelectMode(!selectMode));
    $('#edit-undo').addEventListener('click', undo);
    $('#edit-page-menu').addEventListener('click', openPageMenu);
    $('#edit-preview').addEventListener('click', togglePreview);
    $('#edit-theme').addEventListener('click', openThemePanel);
    document.addEventListener('click', onSelectClick, true);
    $('#edit-discard').addEventListener('click', discard);
    $('#edit-exit').addEventListener('click', exitEditMode);
    $('#edit-logout').addEventListener('click', logout);

    $('#edit-login-submit').addEventListener('click', () => attemptPasswordLogin($('#edit-pw').value));
    $('#edit-login-cancel').addEventListener('click', hideLogin);
    $('#edit-login-cancel-fb').addEventListener('click', hideLogin);
    $('#edit-google-signin').addEventListener('click', signInWithGoogle);
    $('#edit-pw').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptPasswordLogin($('#edit-pw').value);
    });

    $('#edit-img-cancel').addEventListener('click', closeImageModal);
    $('#edit-img-lib').addEventListener('click', openPhotoLibrary);
    $('#edit-img-apply').addEventListener('click', () => {
      applyImageFromUrl($('#edit-img-url').value.trim());
    });
    $('#edit-img-url').addEventListener('input', (e) => {
      const v = e.target.value.trim();
      if (v && /^https?:\/\//.test(v)) {
        $('#edit-img-preview').src = v;
        $('#edit-img-preview').classList.add('visible');
      }
    });
    const dz = $('#edit-drop-zone');
    const fi = $('#edit-file-input');
    dz.addEventListener('click', () => fi.click());
    fi.addEventListener('change', (e) => handleImageFile(e.target.files[0]));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault(); dz.classList.remove('drag-over');
      handleImageFile(e.dataTransfer.files[0]);
    });

    $('#edit-href-cancel').addEventListener('click', closeHrefModal);
    $('#edit-href-apply').addEventListener('click', applyHref);
    $('#edit-href-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyHref();
    });
  }

  // ---- LOAD FROM FIRESTORE (all visitors) -----------------------
  function readWithDeadline(ref,force){
    let timer;return Promise.race([ref.get(force?{source:'server'}:undefined),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Content load timed out')),10000);})]).finally(()=>clearTimeout(timer));
  }
  async function loadFromFirestore(force=false) {
    if (!CFG.firestoreEnabled) return false;
    if (!window.GFS_DB) {
      await new Promise((resolve) => {
        const handler = () => { window.removeEventListener('gfs-firebase-ready', handler); resolve(); };
        window.addEventListener('gfs-firebase-ready', handler);
        setTimeout(resolve, 1500);
      });
    }
    if (!window.GFS_DB) return false;
    try {
      const doc = await readWithDeadline(window.GFS_DB.collection(CFG.firestoreCollection).doc(encodeURIComponent(pageKey)),force);
      const remote=doc.exists ? doc.data()||{} : {};
      state.cloudLoaded=doc.metadata?.fromCache!==true;state.cloudPage=JSON.parse(JSON.stringify(remote));
      if(state.editing)return false;
      state.saved[pageKey]=remote;persistToStorage();return true;
    } catch (e) {
      console.warn('Edit Mode: Firestore load failed, falling back to local cache.', e);
    }
    return false;
  }

  // ---- INIT -----------------------------------------------------
  async function init() {
    captureOriginals();
    chromeOriginals=Object.values(chromeEls()).map(el=>({el,href:el.getAttribute('href'),html:el.innerHTML}));
    loadFromStorage();
    applyContent();
    buildUI();
    wireUI();

    if (authMode() === 'password' && isLoggedIn()) {
      $('#edit-trigger').classList.add('visible');
    } else {
      const params = new URLSearchParams(window.location.search);
      let ownerDevice=false;try{ownerDevice=localStorage.getItem('gfs_owner')==='1';}catch(_){}
      if(params.has('edit')||ownerDevice)ensureAuthLoaded().then(()=>{watchAuthState();if(params.has('edit')&&!currentUser)showLogin();});
    }

    if (CFG.firestoreEnabled && !window.GFS_DB) {
      window.addEventListener('gfs-firebase-ready', () => {
        watchAuthState();
        loadFromFirestore().then(updated => { if (updated) applyContent(); });
        loadDynamicNav();
        loadChrome();
      }, { once: true });
      loadDynamicNav();  // cache-only pass for instant nav
      loadChrome();      // cache-only pass for instant chrome
    } else {
      watchAuthState();
      const updated = await loadFromFirestore();
      if (updated) applyContent();
      loadDynamicNav();
      loadChrome();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('gfs:page-rendered',()=>{captureOriginals();if(window.GFS_PAGE_PUBLISHED===true)applyContent();});

  // Public API
  window.GFSEdit = {
    enter: enterEditMode,
    exit: exitEditMode,
    showLogin: showLogin,
    logout: logout,
    refresh: function() {
      applyContent();
      if (state.editing) bindEditables();
    }
  };
})();
