/**
 * GFS Site Editor v2.0
 * =====================
 * Site-wide visual editor that saves to GitHub → triggers Netlify rebuild.
 * All visitors see the updated static HTML after rebuild (~30-60 sec).
 *
 * ARCHITECTURE:
 * - Every editable element has a `data-edit="unique.path"` attribute
 * - Editor collects changes as { "unique.path": "new value" }
 * - On save, updates the page's JSON content file in GitHub
 * - Netlify auto-rebuilds from the commit
 *
 * REQUIREMENTS:
 * - Firebase Auth (already set up) for admin login
 * - GitHub Personal Access Token stored in Netlify env var
 * - Content JSON files in src/content/
 *
 * USAGE:
 * Add to BaseLayout.astro:
 *   <script src="/scripts/editor.js" defer></script>
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  const CONFIG = {
    github: {
      owner: 'nicholasghareeb99',
      repo: 'gfs-website',
      branch: 'main',
      // Token fetched from serverless function to keep it secure
      tokenEndpoint: '/api/editor-token'
    },
    firebase: {
      storageBucket: 'gfs-app-6c498.appspot.com'
    },
    selectors: {
      // All elements that should be editable
      text: [
        '[data-edit]',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p:not(nav p):not(footer p)',
        '.hero-title', '.hero-text',
        '.section-title', '.section-label',
        '.card-title', '.card-text',
        '.benefit-card h3', '.benefit-card p',
        '.stat-value', '.stat-label',
        '.faq-item summary', '.faq-item p',
        '.spec-label', '.spec-value',
        '.gbb-card-title', '.gbb-card-subtitle',
        '.gbb-spec-label', '.gbb-spec-value',
        '.gbb-pros li', '.gbb-cons li',
        '.gbb-summary-item strong', '.gbb-summary-item span',
        '.warranty-text',
        '.fence-gallery-label'
      ].join(', '),
      images: [
        '[data-edit-img]',
        'img:not(nav img):not(.logo)',
        '.fence-hero',
        '[style*="background-image"]'
      ].join(', '),
    },
    // Elements to NEVER make editable
    exclude: [
      '#gfs-editor-toolbar',
      '#gfs-editor-modal',
      'nav', 'footer',
      '.gfs-editor-ui',
      'script', 'style', 'link', 'meta'
    ].join(', ')
  };

  // ============================================================
  // STATE
  // ============================================================
  const state = {
    editing: false,
    authenticated: false,
    changes: {},        // { "data-edit-path": newValue }
    imageChanges: {},   // { "data-edit-img-path": newUrl }
    originalContent: {},
    saving: false,
    hasUnsaved: false,
    githubToken: null,
    currentPage: getPageSlug()
  };

  function getPageSlug() {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    return path || 'home';
  }

  // ============================================================
  // AUTO-ASSIGN data-edit IDs TO ALL ELEMENTS
  // ============================================================
  function assignEditIds() {
    let counters = {};

    // Text elements
    document.querySelectorAll(CONFIG.selectors.text).forEach(el => {
      if (el.closest(CONFIG.exclude)) return;
      if (el.dataset.edit) return; // Already has an ID

      // Generate stable ID from tag + class + position
      const tag = el.tagName.toLowerCase();
      const cls = el.className ? '.' + el.className.split(' ')[0].replace(/[^a-zA-Z0-9-_]/g, '') : '';
      const base = tag + cls;
      counters[base] = (counters[base] || 0) + 1;
      el.dataset.edit = `${state.currentPage}.${base}_${counters[base]}`;
    });

    // Image elements
    document.querySelectorAll(CONFIG.selectors.images).forEach(el => {
      if (el.closest(CONFIG.exclude)) return;
      if (el.dataset.editImg) return;

      const tag = el.tagName.toLowerCase();
      const cls = el.className ? '.' + el.className.split(' ')[0].replace(/[^a-zA-Z0-9-_]/g, '') : '';
      const base = 'img_' + tag + cls;
      counters[base] = (counters[base] || 0) + 1;
      el.dataset.editImg = `${state.currentPage}.${base}_${counters[base]}`;
    });
  }

  // ============================================================
  // SNAPSHOT ORIGINAL CONTENT (for change detection)
  // ============================================================
  function snapshotContent() {
    document.querySelectorAll('[data-edit]').forEach(el => {
      state.originalContent[el.dataset.edit] = el.innerHTML;
    });
    document.querySelectorAll('[data-edit-img]').forEach(el => {
      if (el.tagName === 'IMG') {
        state.originalContent[el.dataset.editImg] = el.src;
      } else {
        const bg = el.style.backgroundImage || '';
        state.originalContent[el.dataset.editImg] = bg.replace(/url\(['"]?|['"]?\)/g, '');
      }
    });
  }

  // ============================================================
  // ENTER / EXIT EDIT MODE
  // ============================================================
  function enterEditMode() {
    if (!state.authenticated) {
      showLoginModal();
      return;
    }

    state.editing = true;
    document.body.classList.add('gfs-editing');

    // Make text elements editable
    document.querySelectorAll('[data-edit]').forEach(el => {
      if (el.closest(CONFIG.exclude)) return;
      el.contentEditable = 'true';
      el.addEventListener('input', onTextEdit);
      el.addEventListener('focus', onElementFocus);
      el.addEventListener('blur', onElementBlur);
    });

    // Make images clickable for replacement
    document.querySelectorAll('[data-edit-img]').forEach(el => {
      if (el.closest(CONFIG.exclude)) return;
      el.style.cursor = 'pointer';
      el._editClickHandler = () => openImagePicker(el);
      el.addEventListener('click', el._editClickHandler);
    });

    showToolbar();
    toast('✏️ Edit mode — click any text to edit, click images to replace');
  }

  function exitEditMode() {
    if (state.hasUnsaved) {
      if (!confirm('You have unsaved changes. Exit anyway?')) return;
    }

    state.editing = false;
    document.body.classList.remove('gfs-editing');

    // Remove editable
    document.querySelectorAll('[data-edit]').forEach(el => {
      el.contentEditable = 'false';
      el.removeEventListener('input', onTextEdit);
      el.removeEventListener('focus', onElementFocus);
      el.removeEventListener('blur', onElementBlur);
    });

    // Remove image click handlers
    document.querySelectorAll('[data-edit-img]').forEach(el => {
      el.style.cursor = '';
      if (el._editClickHandler) {
        el.removeEventListener('click', el._editClickHandler);
        delete el._editClickHandler;
      }
    });

    hideToolbar();
    toast('Exited edit mode');
  }

  // ============================================================
  // TEXT EDITING HANDLERS
  // ============================================================
  function onTextEdit(e) {
    const el = e.target;
    const key = el.dataset.edit;
    if (!key) return;

    const newContent = el.innerHTML;
    if (newContent !== state.originalContent[key]) {
      state.changes[key] = newContent;
      markUnsaved();
    } else {
      delete state.changes[key];
      checkIfClean();
    }
  }

  function onElementFocus(e) {
    e.target.classList.add('gfs-edit-active');
  }

  function onElementBlur(e) {
    e.target.classList.remove('gfs-edit-active');
  }

  // ============================================================
  // IMAGE REPLACEMENT
  // ============================================================
  function openImagePicker(el) {
    if (!state.editing) return;

    const modal = document.getElementById('gfs-editor-modal');
    if (modal) modal.remove();

    const currentSrc = el.tagName === 'IMG' ? el.src :
      (el.style.backgroundImage || '').replace(/url\(['"]?|['"]?\)/g, '');

    const m = document.createElement('div');
    m.id = 'gfs-editor-modal';
    m.className = 'gfs-editor-ui';
    m.innerHTML = `
      <div class="gfs-modal-backdrop"></div>
      <div class="gfs-modal-box">
        <div class="gfs-modal-header">
          <h3>Replace Image</h3>
          <button class="gfs-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="gfs-modal-body">
          <div class="gfs-current-preview">
            <img src="${currentSrc}" alt="Current image" style="max-width:100%;max-height:200px;border-radius:8px;margin-bottom:16px;">
          </div>
          <div class="gfs-drop-area" id="gfsDropArea">
            <div style="font-size:32px;margin-bottom:8px;">📁</div>
            <div style="font-weight:600;">Drop image here or click to upload</div>
            <div style="font-size:12px;color:#888;margin-top:4px;">JPG, PNG, WebP — max 5MB</div>
            <input type="file" accept="image/*" id="gfsFileInput" style="display:none;">
          </div>
          <div style="text-align:center;color:#999;font-size:12px;margin:12px 0;">— or paste URL —</div>
          <div style="display:flex;gap:8px;">
            <input type="text" id="gfsImageUrl" placeholder="https://example.com/photo.jpg" 
                   style="flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
            <button id="gfsUrlBtn" style="padding:10px 18px;background:#1a2744;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Add</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    // Event listeners
    m.querySelector('.gfs-modal-backdrop').onclick = () => m.remove();
    m.querySelector('.gfs-modal-close').onclick = () => m.remove();

    const dropArea = m.querySelector('#gfsDropArea');
    const fileInput = m.querySelector('#gfsFileInput');

    dropArea.onclick = () => fileInput.click();
    dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('dragover'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
    dropArea.addEventListener('drop', e => {
      e.preventDefault();
      dropArea.classList.remove('dragover');
      if (e.dataTransfer.files[0]) uploadAndReplace(e.dataTransfer.files[0], el, m);
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files[0]) uploadAndReplace(e.target.files[0], el, m);
    });

    m.querySelector('#gfsUrlBtn').onclick = () => {
      const url = m.querySelector('#gfsImageUrl').value.trim();
      if (url) {
        applyImageChange(el, url);
        m.remove();
      }
    };
  }

  async function uploadAndReplace(file, el, modal) {
    if (!file.type.startsWith('image/')) { toast('Not an image file', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('File too large (max 5MB)', 'error'); return; }

    toast('⏳ Uploading...');

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `site-images/${state.currentPage}/${timestamp}_${safeName}`;

      // Use Firebase Storage REST API or SDK
      const storageRef = firebase.storage().ref(path);
      const snapshot = await storageRef.put(file);
      const downloadUrl = await snapshot.ref.getDownloadURL();

      applyImageChange(el, downloadUrl);
      modal.remove();
      toast('✅ Image uploaded');
    } catch (err) {
      console.error('Upload failed:', err);
      // Fallback: use data URL (works but not ideal for production)
      const reader = new FileReader();
      reader.onload = e => {
        applyImageChange(el, e.target.result);
        modal.remove();
        toast('⚠️ Image saved locally (upload failed)');
      };
      reader.readAsDataURL(file);
    }
  }

  function applyImageChange(el, newUrl) {
    const key = el.dataset.editImg;
    if (el.tagName === 'IMG') {
      el.src = newUrl;
    } else {
      el.style.backgroundImage = `url('${newUrl}')`;
    }
    state.imageChanges[key] = newUrl;
    markUnsaved();
  }

  // ============================================================
  // SAVE TO GITHUB
  // ============================================================
  async function saveChanges() {
    if (state.saving) return;
    if (!state.hasUnsaved) { toast('No changes to save'); return; }

    state.saving = true;
    updateToolbarStatus('saving');
    toast('⏳ Saving & publishing...');

    try {
      // Get GitHub token from serverless function
      if (!state.githubToken) {
        const resp = await fetch(CONFIG.github.tokenEndpoint);
        if (!resp.ok) throw new Error('Could not get editor token');
        const data = await resp.json();
        state.githubToken = data.token;
      }

      // Build the content JSON path for this page
      const contentPath = getContentPath();

      // Fetch current file from GitHub (need SHA for update)
      const fileData = await githubGet(contentPath);
      let content = {};

      if (fileData && fileData.content) {
        content = JSON.parse(atob(fileData.content.replace(/\n/g, '')));
      }

      // Apply text changes
      for (const [key, value] of Object.entries(state.changes)) {
        setNestedValue(content, key, value);
      }

      // Apply image changes
      for (const [key, value] of Object.entries(state.imageChanges)) {
        setNestedValue(content, key, value);
      }

      // Add metadata
      content._updatedAt = new Date().toISOString();
      content._updatedBy = 'editor';

      // Push to GitHub
      const message = `Editor: update ${state.currentPage} content`;
      const sha = fileData ? fileData.sha : undefined;
      await githubPut(contentPath, content, message, sha);

      // Success
      state.changes = {};
      state.imageChanges = {};
      state.hasUnsaved = false;
      snapshotContent(); // Re-snapshot after save

      updateToolbarStatus('published');
      toast('✅ Published! Site rebuilding (~30-60 sec)', 'success');

      // After 3 sec, reset status
      setTimeout(() => updateToolbarStatus('clean'), 3000);

    } catch (err) {
      console.error('Save failed:', err);
      updateToolbarStatus('error');
      toast('❌ Save failed: ' + err.message, 'error');
    } finally {
      state.saving = false;
    }
  }

  function getContentPath() {
    // Map page slugs to content JSON paths
    const slug = state.currentPage;
    const pathMap = {
      'home': 'src/content/home.json',
      'about': 'src/content/about.json',
      'contact': 'src/content/contact.json',
      'gallery': 'src/content/gallery.json',
      'permits': 'src/content/permits.json',
      'quote': 'src/content/quote.json',
      'reviews': 'src/content/reviews.json',
    };

    if (pathMap[slug]) return pathMap[slug];

    // Fence pages: fences/cedar → src/content/fences/cedar.json
    if (slug.startsWith('fences/')) {
      const fenceType = slug.replace('fences/', '');
      return `src/content/fences/${fenceType}.json`;
    }

    // Service areas
    if (slug.startsWith('service-areas/')) {
      return `src/content/service-areas/${slug.replace('service-areas/', '')}.json`;
    }

    // Default
    return `src/content/pages/${slug.replace(/\//g, '_')}.json`;
  }

  // ============================================================
  // GITHUB API HELPERS
  // ============================================================
  async function githubGet(path) {
    const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}?ref=${CONFIG.github.branch}`;
    try {
      const resp = await fetch(url, {
        headers: { 'Authorization': `token ${state.githubToken}` }
      });
      if (resp.status === 404) return null; // File doesn't exist yet
      if (!resp.ok) throw new Error(`GitHub GET failed: ${resp.status}`);
      return await resp.json();
    } catch (err) {
      if (err.message.includes('404')) return null;
      throw err;
    }
  }

  async function githubPut(path, content, message, sha) {
    const url = `https://api.github.com/repos/${CONFIG.github.owner}/${CONFIG.github.repo}/contents/${path}`;
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
      branch: CONFIG.github.branch
    };
    if (sha) body.sha = sha;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${state.githubToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || 'GitHub PUT failed');
    }
    return await resp.json();
  }

  // ============================================================
  // UTILITY: Set nested object value from dot-path key
  // ============================================================
  function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  // ============================================================
  // UNSAVED CHANGES TRACKING
  // ============================================================
  function markUnsaved() {
    state.hasUnsaved = true;
    updateToolbarStatus('unsaved');
  }

  function checkIfClean() {
    if (Object.keys(state.changes).length === 0 && Object.keys(state.imageChanges).length === 0) {
      state.hasUnsaved = false;
      updateToolbarStatus('clean');
    }
  }

  // ============================================================
  // UI: TOOLBAR
  // ============================================================
  function showToolbar() {
    if (document.getElementById('gfs-editor-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'gfs-editor-toolbar';
    bar.className = 'gfs-editor-ui';
    bar.innerHTML = `
      <div class="gfs-toolbar-inner">
        <div class="gfs-toolbar-left">
          <span class="gfs-toolbar-logo">✏️ GFS Editor</span>
          <span class="gfs-toolbar-page">${state.currentPage}</span>
        </div>
        <div class="gfs-toolbar-center">
          <span class="gfs-toolbar-status" id="gfsStatus">
            <span class="gfs-status-dot clean"></span>
            No changes
          </span>
        </div>
        <div class="gfs-toolbar-right">
          <button class="gfs-toolbar-btn" id="gfsUndoBtn" title="Undo all changes" onclick="window._gfsEditor.undoAll()">↩ Undo All</button>
          <button class="gfs-toolbar-btn primary" id="gfsSaveBtn" onclick="window._gfsEditor.save()">💾 Publish</button>
          <button class="gfs-toolbar-btn exit" onclick="window._gfsEditor.exit()">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(bar);
    document.body.style.paddingTop = '52px';
  }

  function hideToolbar() {
    const bar = document.getElementById('gfs-editor-toolbar');
    if (bar) bar.remove();
    document.body.style.paddingTop = '';
  }

  function updateToolbarStatus(status) {
    const el = document.getElementById('gfsStatus');
    if (!el) return;

    const map = {
      clean: { dot: 'clean', text: 'No changes' },
      unsaved: { dot: 'unsaved', text: 'Unsaved changes' },
      saving: { dot: 'saving', text: 'Publishing...' },
      published: { dot: 'published', text: 'Published ✓' },
      error: { dot: 'error', text: 'Save failed' }
    };

    const s = map[status] || map.clean;
    el.innerHTML = `<span class="gfs-status-dot ${s.dot}"></span>${s.text}`;

    // Update save button
    const btn = document.getElementById('gfsSaveBtn');
    if (btn) {
      btn.disabled = status === 'saving';
      btn.classList.toggle('pulse', status === 'unsaved');
    }
  }

  // ============================================================
  // UI: EDIT TOGGLE BUTTON (visible to admin)
  // ============================================================
  function showEditToggle() {
    if (document.getElementById('gfs-edit-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'gfs-edit-toggle';
    btn.className = 'gfs-editor-ui';
    btn.innerHTML = '✏️';
    btn.title = 'Edit this page';
    btn.onclick = () => enterEditMode();
    document.body.appendChild(btn);
  }

  // ============================================================
  // UI: TOAST
  // ============================================================
  function toast(msg, type = '') {
    let el = document.getElementById('gfs-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gfs-toast';
      el.className = 'gfs-editor-ui';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `gfs-editor-ui gfs-toast show ${type}`;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ============================================================
  // UI: LOGIN MODAL
  // ============================================================
  function showLoginModal() {
    // Use Firebase Auth — check if already logged in
    if (typeof firebase !== 'undefined' && firebase.auth) {
      const user = firebase.auth().currentUser;
      if (user) {
        state.authenticated = true;
        enterEditMode();
        return;
      }

      // Show sign-in UI
      const m = document.createElement('div');
      m.id = 'gfs-login-modal';
      m.className = 'gfs-editor-ui';
      m.innerHTML = `
        <div class="gfs-modal-backdrop"></div>
        <div class="gfs-modal-box" style="max-width:360px;">
          <div class="gfs-modal-header">
            <h3>🔐 Admin Login</h3>
            <button class="gfs-modal-close" onclick="this.closest('#gfs-login-modal').remove()">&times;</button>
          </div>
          <div class="gfs-modal-body">
            <input type="email" id="gfsEmail" placeholder="Email" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;margin-bottom:10px;font-size:14px;">
            <input type="password" id="gfsPass" placeholder="Password" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;margin-bottom:16px;font-size:14px;">
            <div id="gfsLoginError" style="color:#ef4444;font-size:13px;margin-bottom:10px;display:none;"></div>
            <button id="gfsLoginBtn" style="width:100%;padding:12px;background:#1a2744;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:14px;cursor:pointer;">Sign In</button>
          </div>
        </div>
      `;
      document.body.appendChild(m);

      m.querySelector('.gfs-modal-backdrop').onclick = () => m.remove();
      m.querySelector('#gfsLoginBtn').onclick = async () => {
        const email = m.querySelector('#gfsEmail').value;
        const pass = m.querySelector('#gfsPass').value;
        const errEl = m.querySelector('#gfsLoginError');

        try {
          await firebase.auth().signInWithEmailAndPassword(email, pass);
          state.authenticated = true;
          m.remove();
          enterEditMode();
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
        }
      };

      // Enter key
      m.querySelector('#gfsPass').addEventListener('keydown', e => {
        if (e.key === 'Enter') m.querySelector('#gfsLoginBtn').click();
      });
    }
  }

  // ============================================================
  // UNDO ALL CHANGES
  // ============================================================
  function undoAll() {
    if (!confirm('Revert all changes to the last saved version?')) return;

    // Restore text
    for (const [key, original] of Object.entries(state.originalContent)) {
      const el = document.querySelector(`[data-edit="${key}"]`);
      if (el) el.innerHTML = original;

      const imgEl = document.querySelector(`[data-edit-img="${key}"]`);
      if (imgEl) {
        if (imgEl.tagName === 'IMG') imgEl.src = original;
        else imgEl.style.backgroundImage = `url('${original}')`;
      }
    }

    state.changes = {};
    state.imageChanges = {};
    state.hasUnsaved = false;
    updateToolbarStatus('clean');
    toast('↩ All changes reverted');
  }

  // ============================================================
  // INJECT EDITOR CSS
  // ============================================================
  function injectStyles() {
    if (document.getElementById('gfs-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'gfs-editor-styles';
    style.textContent = `
      /* Edit mode indicators */
      body.gfs-editing [data-edit]:hover {
        outline: 2px dashed #c8a84e !important;
        outline-offset: 2px;
        cursor: text;
      }
      body.gfs-editing [data-edit].gfs-edit-active {
        outline: 2px solid #c8a84e !important;
        outline-offset: 2px;
        background: rgba(200,168,78,0.06) !important;
      }
      body.gfs-editing [data-edit-img]:hover {
        outline: 2px dashed #3b82f6 !important;
        outline-offset: 2px;
        cursor: pointer;
      }
      body.gfs-editing [data-edit-img]::after {
        content: '📷 Click to replace';
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0,0,0,0.7);
        color: #fff;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        pointer-events: none;
        z-index: 10;
      }
      body.gfs-editing img[data-edit-img] {
        position: relative;
      }

      /* Toolbar */
      #gfs-editor-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 48px;
        background: #1a2744;
        z-index: 10000;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      }
      .gfs-toolbar-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 100%;
        padding: 0 16px;
        max-width: 100%;
      }
      .gfs-toolbar-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .gfs-toolbar-logo {
        color: #fff;
        font-weight: 700;
        font-size: 14px;
      }
      .gfs-toolbar-page {
        color: rgba(255,255,255,0.5);
        font-size: 12px;
      }
      .gfs-toolbar-center {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
      }
      .gfs-toolbar-status {
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .gfs-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
      .gfs-status-dot.clean { background: #6b7280; }
      .gfs-status-dot.unsaved { background: #f59e0b; animation: blink 1s infinite; }
      .gfs-status-dot.saving { background: #3b82f6; animation: blink 0.5s infinite; }
      .gfs-status-dot.published { background: #22c55e; }
      .gfs-status-dot.error { background: #ef4444; }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

      .gfs-toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .gfs-toolbar-btn {
        background: rgba(255,255,255,0.1);
        border: none;
        color: #fff;
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
      }
      .gfs-toolbar-btn:hover { background: rgba(255,255,255,0.2); }
      .gfs-toolbar-btn.primary { background: #22c55e; }
      .gfs-toolbar-btn.primary:hover { background: #16a34a; }
      .gfs-toolbar-btn.primary.pulse { animation: pulse-green 1.5s infinite; }
      .gfs-toolbar-btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
      .gfs-toolbar-btn.exit { background: transparent; font-size: 18px; padding: 6px 10px; }
      .gfs-toolbar-btn.exit:hover { background: rgba(239,68,68,0.3); }
      @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }

      /* Edit toggle button */
      #gfs-edit-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #1a2744;
        color: #fff;
        border: none;
        font-size: 20px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        transition: transform 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #gfs-edit-toggle:hover { transform: scale(1.1); }
      body.gfs-editing #gfs-edit-toggle { display: none; }

      /* Toast */
      .gfs-toast {
        position: fixed;
        top: 60px;
        right: 20px;
        background: #1a2744;
        color: #fff;
        padding: 10px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        z-index: 10001;
        transform: translateX(120%);
        transition: transform 0.25s ease;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      .gfs-toast.show { transform: translateX(0); }
      .gfs-toast.success { background: #22c55e; }
      .gfs-toast.error { background: #ef4444; }

      /* Modal */
      .gfs-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
      }
      .gfs-modal-box {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff;
        border-radius: 12px;
        max-width: 460px;
        width: 90%;
        z-index: 10002;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        overflow: hidden;
      }
      .gfs-modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .gfs-modal-header h3 { font-size: 15px; font-weight: 700; margin: 0; }
      .gfs-modal-close {
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: #888;
        width: 30px;
        height: 30px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gfs-modal-close:hover { background: #f3f3f3; }
      .gfs-modal-body { padding: 20px; }

      .gfs-drop-area {
        border: 2px dashed #ddd;
        border-radius: 10px;
        padding: 32px 16px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        margin-bottom: 12px;
      }
      .gfs-drop-area:hover, .gfs-drop-area.dragover {
        border-color: #3b82f6;
        background: rgba(59,130,246,0.04);
      }

      /* Prevent toolbar/UI from being edited */
      .gfs-editor-ui * { cursor: default !important; }
      .gfs-editor-ui [contenteditable] { cursor: text !important; }

      @media (max-width: 640px) {
        .gfs-toolbar-page { display: none; }
        .gfs-toolbar-center { position: static; transform: none; }
        #gfs-editor-toolbar { height: auto; }
        .gfs-toolbar-inner { flex-wrap: wrap; padding: 8px 12px; gap: 6px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    injectStyles();
    assignEditIds();
    snapshotContent();

    // Check if user is already authenticated
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          state.authenticated = true;
          showEditToggle();
        }
      });
    } else {
      // No Firebase — show toggle for development/testing
      showEditToggle();
    }

    // Warn on page leave with unsaved changes
    window.addEventListener('beforeunload', e => {
      if (state.hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Expose API for toolbar buttons
    window._gfsEditor = {
      save: saveChanges,
      exit: exitEditMode,
      undoAll: undoAll,
      getState: () => state
    };

    console.log('[GFS Editor] Ready — ' + Object.keys(state.originalContent).length + ' editable elements found');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
