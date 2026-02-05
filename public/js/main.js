/**
 * GFS V45 - Complete Inline Editor
 * Edit text, images, links, buttons - EVERYTHING
 * Hidden access: Ctrl+Shift+E or ?edit=1
 */

// ==================== CONFIG ====================
const CONFIG = {
    ADMIN_USER: 'admin',
    ADMIN_PASS: 'admin11',
    PHONE: '(419) 902-8257',
    EMAIL: 'info@ghareebfencing.com',
    FIREBASE: {
        apiKey: "AIzaSyB6TYNujOLqIt1dzzhBkjsCvVgRt53luRE",
        authDomain: "ghareeb-fencing.firebaseapp.com",
        projectId: "ghareeb-fencing",
        storageBucket: "ghareeb-fencing.firebasestorage.app",
        messagingSenderId: "187837905206",
        appId: "1:187837905206:web:1e9a9bc33f745cbeeddb97"
    }
};

// ==================== STATE ====================
const GFS = {
    editMode: false,
    authenticated: false,
    unsavedChanges: false,
    db: null,
    storage: null,
    currentElement: null,
    pageContent: {}
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDropdowns();
    initScrollEffects();
    initFAQ();
    initSecretAccess();
    initFirebase();
    console.log('[GFS] Ready - Ctrl+Shift+E or ?edit=1 for admin');
});

// ==================== FIREBASE ====================
async function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js');
            await loadScript('https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js');
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.FIREBASE);
        }
        GFS.db = firebase.firestore();
        GFS.storage = firebase.storage();
        console.log('[GFS] Firebase connected');
        loadPageContent();
    } catch(e) {
        console.error('[GFS] Firebase error:', e);
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ==================== LOAD SAVED CONTENT ====================
async function loadPageContent() {
    if (!GFS.db) return;
    try {
        const pagePath = window.location.pathname.replace(/\/$/, '') || '/home';
        const docRef = GFS.db.collection('siteContent').doc(pagePath.replace(/\//g, '_') || 'home');
        const doc = await docRef.get();
        if (doc.exists) {
            GFS.pageContent = doc.data();
            applyPageContent();
        }
    } catch(e) {
        console.error('[GFS] Load error:', e);
    }
}

function applyPageContent() {
    // Apply text content
    if (GFS.pageContent.text) {
        Object.entries(GFS.pageContent.text).forEach(([selector, content]) => {
            const el = document.querySelector(`[data-edit="${selector}"]`) || document.getElementById(selector) || document.querySelector(`.${selector}`);
            if (el) el.innerHTML = content;
        });
    }
    // Apply images
    if (GFS.pageContent.images) {
        Object.entries(GFS.pageContent.images).forEach(([selector, url]) => {
            const el = document.querySelector(`[data-edit-img="${selector}"]`) || document.getElementById(selector);
            if (el) {
                if (el.tagName === 'IMG') el.src = url;
                else el.style.backgroundImage = `url(${url})`;
            }
        });
    }
    // Apply links
    if (GFS.pageContent.links) {
        Object.entries(GFS.pageContent.links).forEach(([selector, data]) => {
            const el = document.querySelector(`[data-edit-link="${selector}"]`) || document.getElementById(selector);
            if (el) {
                if (data.text) el.innerText = data.text;
                if (data.href && el.href !== undefined) el.href = data.href;
            }
        });
    }
}

// ==================== NAVIGATION ====================
function initNavigation() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            menu.classList.toggle('active');
        });
    }
}

function initDropdowns() {
    document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
        const trigger = dropdown.querySelector('.nav-link');
        const menu = dropdown.querySelector('.nav-dropdown-menu');
        if (trigger && menu) {
            trigger.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        }
    });
}

function initScrollEffects() {
    let lastScroll = 0;
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (nav) {
            if (currentScroll > 100) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    });
}

function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            const wasActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            if (!wasActive) item.classList.add('active');
        });
    });
}

// ==================== SECRET ACCESS ====================
function initSecretAccess() {
    // URL param ?edit=1
    if (new URLSearchParams(window.location.search).get('edit') === '1') {
        showLoginModal();
    }
    
    // Ctrl+Shift+E (case-insensitive) - WORKS ON ALL PAGES
    document.addEventListener('keydown', (e) => {
        // Check for Ctrl+Shift+E
        if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e' || e.code === 'KeyE')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[GFS] ✓ Edit mode shortcut detected!');
            if (GFS.editMode) {
                exitEditMode();
            } else {
                showLoginModal();
            }
            return false;
        }
        if (e.key === 'Escape' && GFS.editMode) {
            if (GFS.unsavedChanges && !confirm('Unsaved changes. Exit anyway?')) return;
            exitEditMode();
        }
    }, true); // Use capture phase to ensure it fires first
    
    console.log('[GFS] Secret access initialized - Ctrl+Shift+E ready');
}

// ==================== LOGIN MODAL ====================
function showLoginModal() {
    let modal = document.getElementById('gfsLoginModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gfsLoginModal';
        modal.innerHTML = `
            <style>
                #gfsLoginModal { position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:99999; display:flex; align-items:center; justify-content:center; }
                #gfsLoginModal .login-box { background:#1e293b; padding:40px; border-radius:16px; max-width:360px; width:90%; }
                #gfsLoginModal h3 { color:#fff; margin:0 0 8px; font-size:1.5rem; }
                #gfsLoginModal p { color:#94a3b8; margin:0 0 24px; }
                #gfsLoginModal input { width:100%; padding:14px; margin-bottom:12px; border:2px solid #334155; border-radius:8px; background:#0f172a; color:#fff; font-size:1rem; box-sizing:border-box; }
                #gfsLoginModal input:focus { border-color:#d4af37; outline:none; }
                #gfsLoginModal .error { color:#ef4444; font-size:0.85rem; margin-bottom:12px; display:none; }
                #gfsLoginModal .error.show { display:block; }
                #gfsLoginModal button { width:100%; padding:14px; border:none; border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; }
                #gfsLoginModal .btn-login { background:#d4af37; color:#000; margin-bottom:10px; }
                #gfsLoginModal .btn-cancel { background:#334155; color:#fff; }
            </style>
            <div class="login-box">
                <h3>🔐 Admin Access</h3>
                <p>Enter credentials to edit site content</p>
                <input type="text" id="gfsLoginUser" placeholder="Username" autocomplete="off">
                <input type="password" id="gfsLoginPass" placeholder="Password" autocomplete="off">
                <div class="error" id="gfsLoginError">Invalid credentials</div>
                <button class="btn-login" onclick="window.GFS_checkLogin()">Unlock Editor</button>
                <button class="btn-cancel" onclick="window.GFS_hideLoginModal()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('gfsLoginPass').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') window.GFS_checkLogin();
        });
    }
    modal.style.display = 'flex';
    document.getElementById('gfsLoginUser').value = '';
    document.getElementById('gfsLoginPass').value = '';
    document.getElementById('gfsLoginError').classList.remove('show');
    setTimeout(() => document.getElementById('gfsLoginUser').focus(), 100);
}

window.GFS_hideLoginModal = function() {
    const modal = document.getElementById('gfsLoginModal');
    if (modal) modal.style.display = 'none';
};

window.GFS_checkLogin = function() {
    const user = document.getElementById('gfsLoginUser').value.trim();
    const pass = document.getElementById('gfsLoginPass').value;
    
    if (user === CONFIG.ADMIN_USER && pass === CONFIG.ADMIN_PASS) {
        GFS.authenticated = true;
        window.GFS_hideLoginModal();
        enterEditMode();
    } else {
        document.getElementById('gfsLoginError').classList.add('show');
        document.getElementById('gfsLoginPass').value = '';
        document.getElementById('gfsLoginPass').focus();
    }
};

// ==================== EDIT MODE ====================
function enterEditMode() {
    GFS.editMode = true;
    document.body.classList.add('gfs-editing');
    createEditorToolbar();
    makeEverythingEditable();
    showToast('✏️ Edit mode ON - Click any element to edit');
}

function exitEditMode() {
    GFS.editMode = false;
    GFS.authenticated = false;
    GFS.unsavedChanges = false;
    document.body.classList.remove('gfs-editing');
    removeEditorToolbar();
    makeEverythingReadOnly();
    showToast('Edit mode OFF');
}

function createEditorToolbar() {
    if (document.getElementById('gfsEditorToolbar')) return;
    
    const toolbar = document.createElement('div');
    toolbar.id = 'gfsEditorToolbar';
    toolbar.innerHTML = `
        <style>
            #gfsEditorToolbar { position:fixed; top:0; left:0; right:0; height:60px; background:linear-gradient(135deg,#0f172a,#1e293b); border-bottom:3px solid #d4af37; z-index:99998; display:flex; align-items:center; justify-content:space-between; padding:0 20px; font-family:system-ui,sans-serif; box-shadow:0 4px 20px rgba(0,0,0,0.3); }
            #gfsEditorToolbar .status { color:#d4af37; font-weight:600; font-size:0.95rem; }
            #gfsEditorToolbar .toolbar-section { display:flex; gap:10px; align-items:center; }
            #gfsEditorToolbar .section-label { color:#64748b; font-size:0.75rem; text-transform:uppercase; margin-right:5px; }
            #gfsEditorToolbar button { padding:8px 14px; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.8rem; transition:all 0.2s; display:flex; align-items:center; gap:5px; }
            #gfsEditorToolbar .btn-add { background:#334155; color:#fff; border:1px solid #475569; }
            #gfsEditorToolbar .btn-add:hover { background:#475569; border-color:#d4af37; }
            #gfsEditorToolbar .btn-save { background:#22c55e; color:#fff; }
            #gfsEditorToolbar .btn-save:hover { background:#16a34a; transform:scale(1.02); }
            #gfsEditorToolbar .btn-exit { background:#ef4444; color:#fff; }
            #gfsEditorToolbar .btn-exit:hover { background:#dc2626; }
            body.gfs-editing { padding-top:60px !important; }
            body.gfs-editing #mainNav { top:60px !important; }
            body.gfs-editing .trust-bar { top:60px !important; }
            
            /* Editable highlights */
            body.gfs-editing h1, body.gfs-editing h2, body.gfs-editing h3, body.gfs-editing h4,
            body.gfs-editing p, body.gfs-editing span, body.gfs-editing a, body.gfs-editing li,
            body.gfs-editing img, body.gfs-editing button, body.gfs-editing .btn, body.gfs-editing .cta-btn,
            body.gfs-editing [data-edit], body.gfs-editing [data-edit-img], body.gfs-editing [data-edit-link],
            body.gfs-editing .hero-title, body.gfs-editing .hero-text, body.gfs-editing .card-title,
            body.gfs-editing .card-text, body.gfs-editing .section-title, body.gfs-editing .section-label,
            body.gfs-editing .stat-value, body.gfs-editing .stat-label, body.gfs-editing .style-card,
            body.gfs-editing .fence-gallery img, body.gfs-editing .gallery-img, body.gfs-editing section {
                outline:2px dashed transparent !important;
                transition:outline 0.2s, background 0.2s !important;
                cursor:pointer !important;
            }
            body.gfs-editing h1:hover, body.gfs-editing h2:hover, body.gfs-editing h3:hover, body.gfs-editing h4:hover,
            body.gfs-editing p:hover, body.gfs-editing span:hover, body.gfs-editing a:hover, body.gfs-editing li:hover,
            body.gfs-editing img:hover, body.gfs-editing button:hover, body.gfs-editing .btn:hover, body.gfs-editing .cta-btn:hover,
            body.gfs-editing [data-edit]:hover, body.gfs-editing [data-edit-img]:hover, body.gfs-editing [data-edit-link]:hover,
            body.gfs-editing .hero-title:hover, body.gfs-editing .hero-text:hover, body.gfs-editing .card-title:hover,
            body.gfs-editing .card-text:hover, body.gfs-editing .section-title:hover, body.gfs-editing .section-label:hover,
            body.gfs-editing .stat-value:hover, body.gfs-editing .stat-label:hover, body.gfs-editing .style-card:hover,
            body.gfs-editing .fence-gallery img:hover, body.gfs-editing .gallery-img:hover {
                outline:2px dashed #d4af37 !important;
            }
            body.gfs-editing section:hover { outline:2px dashed #3b82f6 !important; }
            body.gfs-editing .gfs-editing-active {
                outline:3px solid #d4af37 !important;
                background:rgba(212,175,55,0.15) !important;
            }
            body.gfs-editing .gfs-add-zone {
                position:relative;
                min-height:60px;
            }
            body.gfs-editing .gfs-add-zone::after {
                content:'+ Click to add element here';
                position:absolute;
                bottom:10px;
                left:50%;
                transform:translateX(-50%);
                background:#1e3a5f;
                color:#d4af37;
                padding:8px 16px;
                border-radius:20px;
                font-size:0.8rem;
                opacity:0;
                transition:opacity 0.3s;
                pointer-events:none;
            }
            body.gfs-editing .gfs-add-zone:hover::after { opacity:1; }
            
            /* Add Element Panel */
            #gfsAddPanel { position:fixed; top:70px; left:20px; background:#1e293b; padding:20px; border-radius:12px; z-index:99997; width:280px; box-shadow:0 10px 40px rgba(0,0,0,0.5); display:none; }
            #gfsAddPanel.show { display:block; }
            #gfsAddPanel h4 { color:#fff; margin:0 0 15px; font-size:1rem; display:flex; align-items:center; gap:8px; }
            #gfsAddPanel .add-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
            #gfsAddPanel .add-item { background:#0f172a; border:2px solid #334155; border-radius:10px; padding:15px 10px; text-align:center; cursor:pointer; transition:all 0.2s; }
            #gfsAddPanel .add-item:hover { border-color:#d4af37; transform:translateY(-2px); }
            #gfsAddPanel .add-item .icon { font-size:1.5rem; margin-bottom:6px; }
            #gfsAddPanel .add-item .label { color:#e2e8f0; font-size:0.85rem; font-weight:500; }
            #gfsAddPanel .close-btn { position:absolute; top:10px; right:10px; background:none; border:none; color:#64748b; cursor:pointer; font-size:1.2rem; }
        </style>
        <div class="status" id="gfsEditorStatus">✏️ EDIT MODE - Click any element to edit</div>
        <div class="toolbar-section">
            <span class="section-label">Add:</span>
            <button class="btn-add" onclick="window.GFS_showAddPanel()">📝 Text</button>
            <button class="btn-add" onclick="window.GFS_addButton()">🔘 Button</button>
            <button class="btn-add" onclick="window.GFS_addImage()">📷 Photo</button>
            <button class="btn-add" onclick="window.GFS_addPhotoRow()">🖼️ Photo Row</button>
            <button class="btn-add" onclick="window.GFS_addSection()">📦 Section</button>
        </div>
        <div class="toolbar-section">
            <button class="btn-save" onclick="window.GFS_saveAllContent()">💾 Save All</button>
            <button class="btn-exit" onclick="window.GFS_exitEditMode()">✕ Exit</button>
        </div>
    `;
    document.body.appendChild(toolbar);
    
    // Create add panel
    const addPanel = document.createElement('div');
    addPanel.id = 'gfsAddPanel';
    addPanel.innerHTML = `
        <button class="close-btn" onclick="this.parentElement.classList.remove('show')">&times;</button>
        <h4>➕ Add Text Element</h4>
        <div class="add-grid">
            <div class="add-item" onclick="window.GFS_insertText('h2')"><div class="icon">📰</div><div class="label">Heading</div></div>
            <div class="add-item" onclick="window.GFS_insertText('p')"><div class="icon">📝</div><div class="label">Paragraph</div></div>
            <div class="add-item" onclick="window.GFS_insertText('ul')"><div class="icon">📋</div><div class="label">Bullet List</div></div>
            <div class="add-item" onclick="window.GFS_insertText('blockquote')"><div class="icon">💬</div><div class="label">Quote</div></div>
        </div>
    `;
    document.body.appendChild(addPanel);
}

function removeEditorToolbar() {
    document.getElementById('gfsEditorToolbar')?.remove();
    document.getElementById('gfsElementEditor')?.remove();
}

// ==================== MAKE EVERYTHING EDITABLE ====================
function makeEverythingEditable() {
    const selectors = 'h1, h2, h3, h4, h5, h6, p, span, a, li, button, img, [data-edit], [data-edit-img], [data-edit-link], .hero-title, .hero-text, .card-title, .card-text, .section-title, .section-label, .btn, .cta-btn, .stat-value, .stat-label, .style-card, .fence-gallery img, .gallery-img, .gallery-item img, .hero-bg, [style*="background-image"], .card-icon, .benefit-icon, .step-number, .icon, .emoji';
    
    document.querySelectorAll(selectors).forEach(el => {
        if (el.closest('#gfsEditorToolbar') || el.closest('#gfsLoginModal') || el.closest('#gfsElementEditor')) return;
        if (el.closest('nav') && el.tagName === 'A') return; // Skip nav links
        
        el.addEventListener('click', handleElementClick);
    });
}

function makeEverythingReadOnly() {
    document.querySelectorAll('.gfs-editing-active').forEach(el => {
        el.classList.remove('gfs-editing-active');
        el.contentEditable = false;
    });
}

function handleElementClick(e) {
    if (!GFS.editMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Remove previous active
    document.querySelectorAll('.gfs-editing-active').forEach(el => {
        el.classList.remove('gfs-editing-active');
        el.contentEditable = false;
    });
    
    const el = e.currentTarget;
    GFS.currentElement = el;
    el.classList.add('gfs-editing-active');
    
    // Determine element type and show appropriate editor
    const isImage = el.tagName === 'IMG' || el.style.backgroundImage || el.classList.contains('hero-bg') || el.classList.contains('gallery-img');
    const isLink = el.tagName === 'A' || el.classList.contains('btn') || el.classList.contains('cta-btn');
    
    if (isImage) {
        showImageEditor(el);
    } else if (isLink) {
        showLinkEditor(el);
    } else {
        showTextEditor(el);
    }
}

// ==================== TEXT EDITOR ====================
function showTextEditor(el) {
    el.contentEditable = true;
    el.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    GFS.unsavedChanges = true;
    updateEditorStatus();
    
    el.addEventListener('blur', () => {
        el.classList.remove('gfs-editing-active');
        el.contentEditable = false;
    }, { once: true });
}

// ==================== IMAGE EDITOR ====================
function showImageEditor(el) {
    let editor = document.getElementById('gfsElementEditor');
    if (!editor) {
        editor = document.createElement('div');
        editor.id = 'gfsElementEditor';
        document.body.appendChild(editor);
    }
    
    // Get current image
    let currentSrc = '';
    if (el.tagName === 'IMG') {
        currentSrc = el.src;
    } else if (el.style.backgroundImage) {
        currentSrc = el.style.backgroundImage.replace(/url\(['"]?|['"]?\)/g, '');
    }
    
    editor.innerHTML = `
        <style>
            #gfsElementEditor { position:fixed; top:60px; right:20px; background:#1e293b; padding:20px; border-radius:12px; z-index:99997; width:320px; box-shadow:0 10px 40px rgba(0,0,0,0.5); }
            #gfsElementEditor h4 { color:#fff; margin:0 0 15px; font-size:1rem; }
            #gfsElementEditor label { color:#94a3b8; font-size:0.85rem; display:block; margin-bottom:6px; }
            #gfsElementEditor input[type="text"] { width:100%; padding:10px; border:2px solid #334155; border-radius:6px; background:#0f172a; color:#fff; margin-bottom:12px; box-sizing:border-box; }
            #gfsElementEditor input[type="file"] { display:none; }
            #gfsElementEditor .upload-btn { display:block; width:100%; padding:12px; background:#334155; color:#fff; text-align:center; border-radius:6px; cursor:pointer; margin-bottom:12px; }
            #gfsElementEditor .upload-btn:hover { background:#475569; }
            #gfsElementEditor .preview { width:100%; height:120px; background:#0f172a; border-radius:6px; margin-bottom:12px; background-size:cover; background-position:center; border:2px solid #334155; }
            #gfsElementEditor .actions { display:flex; gap:10px; }
            #gfsElementEditor .actions button { flex:1; padding:10px; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
            #gfsElementEditor .btn-apply { background:#d4af37; color:#000; }
            #gfsElementEditor .btn-close { background:#334155; color:#fff; }
        </style>
        <h4>📷 Edit Image</h4>
        <div class="preview" id="gfsImgPreview" style="background-image:url(${currentSrc})"></div>
        <label>Image URL (paste or upload)</label>
        <input type="text" id="gfsImgUrl" value="${currentSrc}" placeholder="https://... or upload below">
        <label class="upload-btn" for="gfsImgUpload">📤 Upload New Image</label>
        <input type="file" id="gfsImgUpload" accept="image/*">
        <div class="actions">
            <button class="btn-apply" onclick="window.GFS_applyImageChange()">✓ Apply</button>
            <button class="btn-close" onclick="window.GFS_closeElementEditor()">✕ Close</button>
        </div>
    `;
    
    document.getElementById('gfsImgUrl').addEventListener('input', (e) => {
        document.getElementById('gfsImgPreview').style.backgroundImage = `url(${e.target.value})`;
    });
    
    document.getElementById('gfsImgUpload').addEventListener('change', handleImageUpload);
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast('📤 Uploading image...');
    
    try {
        if (GFS.storage) {
            const filename = `images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const ref = GFS.storage.ref(filename);
            await ref.put(file);
            const url = await ref.getDownloadURL();
            document.getElementById('gfsImgUrl').value = url;
            document.getElementById('gfsImgPreview').style.backgroundImage = `url(${url})`;
            showToast('✅ Image uploaded!');
        } else {
            // Fallback: base64
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('gfsImgUrl').value = e.target.result;
                document.getElementById('gfsImgPreview').style.backgroundImage = `url(${e.target.result})`;
                showToast('✅ Image loaded');
            };
            reader.readAsDataURL(file);
        }
        GFS.unsavedChanges = true;
        updateEditorStatus();
    } catch(err) {
        console.error('Upload error:', err);
        showToast('❌ Upload failed: ' + err.message);
    }
}

window.GFS_applyImageChange = function() {
    const url = document.getElementById('gfsImgUrl').value;
    if (GFS.currentElement && url) {
        if (GFS.currentElement.tagName === 'IMG') {
            GFS.currentElement.src = url;
        } else {
            GFS.currentElement.style.backgroundImage = `url(${url})`;
        }
        GFS.unsavedChanges = true;
        updateEditorStatus();
        showToast('✅ Image updated');
    }
    window.GFS_closeElementEditor();
};

// ==================== ADD ELEMENT FUNCTIONS ====================
window.GFS_showAddPanel = function() {
    document.getElementById('gfsAddPanel')?.classList.toggle('show');
};

window.GFS_insertText = function(type) {
    document.getElementById('gfsAddPanel')?.classList.remove('show');
    
    // Find the nearest section or container
    const targetSection = document.querySelector('main section:last-of-type .container') || 
                          document.querySelector('main .container') ||
                          document.querySelector('main');
    
    let newEl;
    switch(type) {
        case 'h2':
            newEl = document.createElement('h2');
            newEl.className = 'section-title';
            newEl.innerHTML = 'New <span class="gold">Heading</span>';
            newEl.style.cssText = 'text-align:center; margin:30px 0 15px;';
            break;
        case 'p':
            newEl = document.createElement('p');
            newEl.innerHTML = 'Click to edit this paragraph. Add your content here.';
            newEl.style.cssText = 'color:var(--text-sub); text-align:center; max-width:800px; margin:0 auto 20px;';
            break;
        case 'ul':
            newEl = document.createElement('ul');
            newEl.innerHTML = '<li>First item - click to edit</li><li>Second item</li><li>Third item</li>';
            newEl.style.cssText = 'color:var(--text-sub); max-width:600px; margin:20px auto; padding-left:20px;';
            break;
        case 'blockquote':
            newEl = document.createElement('blockquote');
            newEl.innerHTML = '"Click to add your testimonial or quote here."';
            newEl.style.cssText = 'font-style:italic; color:var(--text-sub); border-left:4px solid var(--gold); padding:15px 20px; margin:30px auto; max-width:700px; background:var(--surface);';
            break;
    }
    
    if (newEl) {
        newEl.setAttribute('data-edit', `added_${type}_${Date.now()}`);
        newEl.contentEditable = true;
        targetSection.appendChild(newEl);
        newEl.focus();
        
        // Select the text
        const range = document.createRange();
        range.selectNodeContents(newEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        
        GFS.unsavedChanges = true;
        updateEditorStatus();
        showToast(`✅ ${type.toUpperCase()} added - edit now!`);
        
        // Scroll to new element
        newEl.scrollIntoView({ behavior:'smooth', block:'center' });
    }
};

window.GFS_addButton = function() {
    const modal = document.createElement('div');
    modal.id = 'gfsButtonModal';
    modal.innerHTML = `
        <style>
            #gfsButtonModal { position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; }
            #gfsButtonModal .modal { background:#1e293b; padding:30px; border-radius:16px; width:90%; max-width:400px; }
            #gfsButtonModal h3 { color:#fff; margin:0 0 20px; }
            #gfsButtonModal label { color:#94a3b8; font-size:0.85rem; display:block; margin-bottom:6px; }
            #gfsButtonModal input, #gfsButtonModal select { width:100%; padding:12px; border:2px solid #334155; border-radius:8px; background:#0f172a; color:#fff; margin-bottom:15px; box-sizing:border-box; }
            #gfsButtonModal .btn-row { display:flex; gap:10px; margin-top:10px; }
            #gfsButtonModal button { flex:1; padding:12px; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
            #gfsButtonModal .btn-create { background:#d4af37; color:#000; }
            #gfsButtonModal .btn-cancel { background:#334155; color:#fff; }
            #gfsButtonModal .preview { margin:15px 0; padding:20px; background:#0f172a; border-radius:8px; text-align:center; }
        </style>
        <div class="modal">
            <h3>🔘 Add New Button</h3>
            <label>Button Text</label>
            <input type="text" id="btnText" value="Get Free Quote" placeholder="Button text">
            <label>Link URL</label>
            <input type="text" id="btnUrl" value="/quote/" placeholder="/page or https://...">
            <label>Button Style</label>
            <select id="btnStyle">
                <option value="primary">Primary (Gold)</option>
                <option value="secondary">Secondary (Outline)</option>
                <option value="cta">CTA (Large Gold)</option>
            </select>
            <div class="preview">
                <a id="btnPreview" href="#" class="cta-btn" style="display:inline-block; padding:12px 24px; background:var(--gold); color:#000; text-decoration:none; border-radius:8px; font-weight:600;">Get Free Quote</a>
            </div>
            <div class="btn-row">
                <button class="btn-create" onclick="window.GFS_createButton()">✓ Add Button</button>
                <button class="btn-cancel" onclick="document.getElementById('gfsButtonModal').remove()">✕ Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Live preview
    document.getElementById('btnText').addEventListener('input', e => {
        document.getElementById('btnPreview').textContent = e.target.value;
    });
    document.getElementById('btnStyle').addEventListener('change', e => {
        const btn = document.getElementById('btnPreview');
        if (e.target.value === 'secondary') {
            btn.style.cssText = 'display:inline-block; padding:12px 24px; background:transparent; color:#d4af37; text-decoration:none; border-radius:8px; font-weight:600; border:2px solid #d4af37;';
        } else if (e.target.value === 'cta') {
            btn.style.cssText = 'display:inline-block; padding:16px 32px; background:var(--gold); color:#000; text-decoration:none; border-radius:12px; font-weight:700; font-size:1.1rem;';
        } else {
            btn.style.cssText = 'display:inline-block; padding:12px 24px; background:var(--gold); color:#000; text-decoration:none; border-radius:8px; font-weight:600;';
        }
    });
};

window.GFS_createButton = function() {
    const text = document.getElementById('btnText').value;
    const url = document.getElementById('btnUrl').value;
    const style = document.getElementById('btnStyle').value;
    
    const targetSection = document.querySelector('main section:last-of-type .container') || document.querySelector('main .container');
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'text-align:center; margin:30px 0;';
    
    const btn = document.createElement('a');
    btn.href = url;
    btn.textContent = text;
    btn.setAttribute('data-edit-link', `added_btn_${Date.now()}`);
    
    if (style === 'secondary') {
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'display:inline-block; padding:12px 24px; background:transparent; color:#d4af37; text-decoration:none; border-radius:8px; font-weight:600; border:2px solid #d4af37;';
    } else if (style === 'cta') {
        btn.className = 'cta-btn';
        btn.style.cssText = 'display:inline-block; padding:16px 32px; background:#d4af37; color:#000; text-decoration:none; border-radius:12px; font-weight:700; font-size:1.1rem;';
    } else {
        btn.className = 'btn';
        btn.style.cssText = 'display:inline-block; padding:12px 24px; background:#d4af37; color:#000; text-decoration:none; border-radius:8px; font-weight:600;';
    }
    
    wrapper.appendChild(btn);
    targetSection.appendChild(wrapper);
    
    document.getElementById('gfsButtonModal').remove();
    GFS.unsavedChanges = true;
    updateEditorStatus();
    showToast('✅ Button added!');
    wrapper.scrollIntoView({ behavior:'smooth', block:'center' });
};

window.GFS_addImage = function() {
    const modal = document.createElement('div');
    modal.id = 'gfsImageModal';
    modal.innerHTML = `
        <style>
            #gfsImageModal { position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; }
            #gfsImageModal .modal { background:#1e293b; padding:30px; border-radius:16px; width:90%; max-width:450px; }
            #gfsImageModal h3 { color:#fff; margin:0 0 20px; }
            #gfsImageModal label { color:#94a3b8; font-size:0.85rem; display:block; margin-bottom:6px; }
            #gfsImageModal input { width:100%; padding:12px; border:2px solid #334155; border-radius:8px; background:#0f172a; color:#fff; margin-bottom:15px; box-sizing:border-box; }
            #gfsImageModal input[type="file"] { display:none; }
            #gfsImageModal .upload-btn { display:block; padding:15px; background:#334155; color:#fff; text-align:center; border-radius:8px; cursor:pointer; margin-bottom:15px; }
            #gfsImageModal .upload-btn:hover { background:#475569; }
            #gfsImageModal .preview { height:180px; background:#0f172a; border-radius:8px; margin-bottom:15px; background-size:cover; background-position:center; border:2px dashed #334155; display:flex; align-items:center; justify-content:center; color:#64748b; }
            #gfsImageModal .btn-row { display:flex; gap:10px; }
            #gfsImageModal button { flex:1; padding:12px; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
            #gfsImageModal .btn-create { background:#d4af37; color:#000; }
            #gfsImageModal .btn-cancel { background:#334155; color:#fff; }
        </style>
        <div class="modal">
            <h3>📷 Add New Photo</h3>
            <label>Image URL (or upload)</label>
            <input type="text" id="newImgUrl" placeholder="https://... or upload below">
            <label class="upload-btn" for="newImgUpload">📤 Upload Image</label>
            <input type="file" id="newImgUpload" accept="image/*">
            <div class="preview" id="newImgPreview">No image selected</div>
            <label>Alt Text (for SEO)</label>
            <input type="text" id="newImgAlt" placeholder="Describe the image">
            <div class="btn-row">
                <button class="btn-create" onclick="window.GFS_createImage()">✓ Add Photo</button>
                <button class="btn-cancel" onclick="document.getElementById('gfsImageModal').remove()">✕ Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('newImgUrl').addEventListener('input', e => {
        const preview = document.getElementById('newImgPreview');
        if (e.target.value) {
            preview.style.backgroundImage = `url(${e.target.value})`;
            preview.textContent = '';
        }
    });
    
    document.getElementById('newImgUpload').addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = ev => {
            document.getElementById('newImgUrl').value = ev.target.result;
            document.getElementById('newImgPreview').style.backgroundImage = `url(${ev.target.result})`;
            document.getElementById('newImgPreview').textContent = '';
        };
        reader.readAsDataURL(file);
    });
};

window.GFS_createImage = function() {
    const url = document.getElementById('newImgUrl').value;
    const alt = document.getElementById('newImgAlt').value || 'Fence project photo';
    
    if (!url) {
        showToast('❌ Please add an image URL or upload');
        return;
    }
    
    const targetSection = document.querySelector('main section:last-of-type .container') || document.querySelector('main .container');
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin:30px auto; max-width:600px; border-radius:12px; overflow:hidden;';
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.style.cssText = 'width:100%; height:auto; display:block;';
    img.setAttribute('data-edit-img', `added_img_${Date.now()}`);
    
    wrapper.appendChild(img);
    targetSection.appendChild(wrapper);
    
    document.getElementById('gfsImageModal').remove();
    GFS.unsavedChanges = true;
    updateEditorStatus();
    showToast('✅ Photo added!');
    wrapper.scrollIntoView({ behavior:'smooth', block:'center' });
};

window.GFS_addPhotoRow = function() {
    const targetSection = document.querySelector('main section:last-of-type .container') || document.querySelector('main .container');
    
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:16px; margin:30px 0;';
    
    for (let i = 1; i <= 3; i++) {
        const imgWrapper = document.createElement('div');
        imgWrapper.style.cssText = 'border-radius:12px; overflow:hidden; aspect-ratio:4/3;';
        
        const img = document.createElement('img');
        img.src = `https://placehold.co/600x450/1e3a5f/d4af37?text=Photo+${i}`;
        img.alt = `Project photo ${i}`;
        img.style.cssText = 'width:100%; height:100%; object-fit:cover;';
        img.setAttribute('data-edit-img', `added_row_${Date.now()}_${i}`);
        
        imgWrapper.appendChild(img);
        row.appendChild(imgWrapper);
    }
    
    targetSection.appendChild(row);
    GFS.unsavedChanges = true;
    updateEditorStatus();
    showToast('✅ Photo row added - click images to replace!');
    row.scrollIntoView({ behavior:'smooth', block:'center' });
};

window.GFS_addSection = function() {
    const targetMain = document.querySelector('main');
    
    const section = document.createElement('section');
    section.className = 'section';
    section.style.cssText = 'padding:60px 0; background:var(--surface);';
    section.innerHTML = `
        <div class="container">
            <h2 class="section-title" style="text-align:center; margin-bottom:15px;" data-edit="new_section_title_${Date.now()}">New <span class="gold">Section Title</span></h2>
            <p style="text-align:center; color:var(--text-sub); margin-bottom:30px; max-width:700px; margin-left:auto; margin-right:auto;" data-edit="new_section_text_${Date.now()}">Add your content here. Click to edit this text.</p>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                <div class="card" style="padding:25px; background:var(--bg); border-radius:12px; border:1px solid var(--border);">
                    <h4 style="color:var(--gold); margin-bottom:10px;" data-edit="new_card1_title_${Date.now()}">Feature 1</h4>
                    <p style="color:var(--text-sub); font-size:0.95rem;" data-edit="new_card1_text_${Date.now()}">Describe your first feature or benefit here.</p>
                </div>
                <div class="card" style="padding:25px; background:var(--bg); border-radius:12px; border:1px solid var(--border);">
                    <h4 style="color:var(--gold); margin-bottom:10px;" data-edit="new_card2_title_${Date.now()}">Feature 2</h4>
                    <p style="color:var(--text-sub); font-size:0.95rem;" data-edit="new_card2_text_${Date.now()}">Describe your second feature or benefit here.</p>
                </div>
                <div class="card" style="padding:25px; background:var(--bg); border-radius:12px; border:1px solid var(--border);">
                    <h4 style="color:var(--gold); margin-bottom:10px;" data-edit="new_card3_title_${Date.now()}">Feature 3</h4>
                    <p style="color:var(--text-sub); font-size:0.95rem;" data-edit="new_card3_text_${Date.now()}">Describe your third feature or benefit here.</p>
                </div>
            </div>
        </div>
    `;
    
    // Insert before footer or at end of main
    const footer = document.querySelector('footer');
    if (footer) {
        targetMain.insertBefore(section, footer);
    } else {
        targetMain.appendChild(section);
    }
    
    GFS.unsavedChanges = true;
    updateEditorStatus();
    showToast('✅ New section added!');
    section.scrollIntoView({ behavior:'smooth', block:'center' });
    
    // Re-initialize editable elements
    makeEverythingEditable();
};

// ==================== LINK EDITOR ====================
function showLinkEditor(el) {
    let editor = document.getElementById('gfsElementEditor');
    if (!editor) {
        editor = document.createElement('div');
        editor.id = 'gfsElementEditor';
        document.body.appendChild(editor);
    }
    
    editor.innerHTML = `
        <style>
            #gfsElementEditor { position:fixed; top:60px; right:20px; background:#1e293b; padding:20px; border-radius:12px; z-index:99997; width:320px; box-shadow:0 10px 40px rgba(0,0,0,0.5); }
            #gfsElementEditor h4 { color:#fff; margin:0 0 15px; font-size:1rem; }
            #gfsElementEditor label { color:#94a3b8; font-size:0.85rem; display:block; margin-bottom:6px; }
            #gfsElementEditor input { width:100%; padding:10px; border:2px solid #334155; border-radius:6px; background:#0f172a; color:#fff; margin-bottom:12px; box-sizing:border-box; }
            #gfsElementEditor .actions { display:flex; gap:10px; }
            #gfsElementEditor .actions button { flex:1; padding:10px; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
            #gfsElementEditor .btn-apply { background:#d4af37; color:#000; }
            #gfsElementEditor .btn-close { background:#334155; color:#fff; }
        </style>
        <h4>🔗 Edit Button/Link</h4>
        <label>Button Text</label>
        <input type="text" id="gfsLinkText" value="${el.innerText.trim()}">
        <label>Link URL</label>
        <input type="text" id="gfsLinkUrl" value="${el.href || el.getAttribute('onclick')?.match(/location.*['"]([^'"]+)['"]/)?.[1] || ''}" placeholder="/page or https://...">
        <div class="actions">
            <button class="btn-apply" onclick="window.GFS_applyLinkChange()">✓ Apply</button>
            <button class="btn-close" onclick="window.GFS_closeElementEditor()">✕ Close</button>
        </div>
    `;
}

window.GFS_applyLinkChange = function() {
    if (GFS.currentElement) {
        const text = document.getElementById('gfsLinkText').value;
        const url = document.getElementById('gfsLinkUrl').value;
        
        if (text) GFS.currentElement.innerText = text;
        if (url && GFS.currentElement.href !== undefined) {
            GFS.currentElement.href = url;
        }
        
        GFS.unsavedChanges = true;
        updateEditorStatus();
        showToast('✅ Link updated');
    }
    window.GFS_closeElementEditor();
};

window.GFS_closeElementEditor = function() {
    document.getElementById('gfsElementEditor')?.remove();
    if (GFS.currentElement) {
        GFS.currentElement.classList.remove('gfs-editing-active');
        GFS.currentElement.contentEditable = false;
    }
};

// ==================== SAVE CONTENT ====================
window.GFS_saveAllContent = async function() {
    if (!GFS.db) {
        showToast('❌ Database not connected. Changes saved locally only.');
        return;
    }
    
    showToast('💾 Saving...');
    
    try {
        const content = {
            text: {},
            images: {},
            links: {},
            updatedAt: new Date().toISOString(),
            page: window.location.pathname
        };
        
        // Collect all text
        let textIndex = 0;
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, li, .hero-title, .hero-text, .card-title, .card-text, .section-title, .section-label, .stat-value, .stat-label').forEach(el => {
            if (el.closest('#gfsEditorToolbar') || el.closest('#gfsLoginModal') || el.closest('#gfsElementEditor') || el.closest('nav')) return;
            const key = el.getAttribute('data-edit') || el.id || el.className.split(' ')[0] || `text_${textIndex++}`;
            content.text[key] = el.innerHTML;
        });
        
        // Collect all images
        let imgIndex = 0;
        document.querySelectorAll('img, [style*="background-image"], .hero-bg, .gallery-img').forEach(el => {
            if (el.closest('#gfsEditorToolbar') || el.closest('#gfsLoginModal') || el.closest('#gfsElementEditor')) return;
            const key = el.getAttribute('data-edit-img') || el.id || el.className.split(' ')[0] || `img_${imgIndex++}`;
            if (el.tagName === 'IMG' && el.src) {
                content.images[key] = el.src;
            } else if (el.style.backgroundImage) {
                content.images[key] = el.style.backgroundImage.replace(/url\(['"]?|['"]?\)/g, '');
            }
        });
        
        // Collect all links/buttons
        let linkIndex = 0;
        document.querySelectorAll('a.btn, a.cta-btn, button, .btn, .cta-btn').forEach(el => {
            if (el.closest('#gfsEditorToolbar') || el.closest('#gfsLoginModal') || el.closest('#gfsElementEditor') || el.closest('nav')) return;
            const key = el.getAttribute('data-edit-link') || el.id || `link_${linkIndex++}`;
            content.links[key] = {
                text: el.innerText.trim(),
                href: el.href || ''
            };
        });
        
        // Save to Firebase
        const pagePath = window.location.pathname.replace(/\/$/, '') || '/home';
        const docId = pagePath.replace(/\//g, '_') || 'home';
        await GFS.db.collection('siteContent').doc(docId).set(content, { merge: true });
        
        GFS.unsavedChanges = false;
        updateEditorStatus();
        showToast('✅ All changes saved!');
        
    } catch(e) {
        console.error('Save error:', e);
        showToast('❌ Save failed: ' + e.message);
    }
};

window.GFS_exitEditMode = function() {
    if (GFS.unsavedChanges && !confirm('You have unsaved changes. Exit anyway?')) return;
    exitEditMode();
};

function updateEditorStatus() {
    const status = document.getElementById('gfsEditorStatus');
    if (status) {
        status.textContent = GFS.unsavedChanges ? '⚠️ UNSAVED CHANGES - Click Save' : '✏️ EDIT MODE - Click any element to edit';
        status.style.color = GFS.unsavedChanges ? '#ef4444' : '#d4af37';
    }
}

// ==================== TOAST ====================
function showToast(message) {
    let toast = document.getElementById('gfsToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'gfsToast';
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;z-index:99999;font-family:system-ui;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.3s;';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 3000);
}
