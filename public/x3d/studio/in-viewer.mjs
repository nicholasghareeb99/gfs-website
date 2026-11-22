// Runs INSIDE fence3d.html (executive app, and later portal and website): gives the plain viewer
// the same "below grade" view, steel gate frames and optional photo-real materials the Model
// Studio has, from the same module files. The viewer loads it with one guarded line:
//   import('./studio/in-viewer.mjs').then(m => m.boot(window)).catch(() => {})
// If the file is missing on a site, that import fails quietly and the viewer is unchanged.

import { createSiteKit } from './site-kit.mjs';
import { createHardwareKit } from './hardware-kit.mjs';

export function viewerAdapter(w) {
  const doc = w.document;
  const hooks = () => w.document === doc && w.__f3d ? w : null;
  const listeners = new Set(); let sig = '';
  w.setInterval(() => {
    const fg = hooks()?.__f3d.fenceGroup; if (!fg) return;
    const s = fg.children.length + ':' + (fg.children[0] ? fg.children[0].uuid : '') + ':' + (fg.children.length ? fg.children[fg.children.length - 1].uuid : '');
    if (s !== sig) { sig = s; listeners.forEach(f => { try { f() } catch (_) { } }) }
  }, 250);
  let three = null;
  return {
    hooks,
    three: () => {
      if (!hooks()) return Promise.reject(new Error('The viewer changed while loading.'));
      if (w.THREE?.Mesh) return Promise.resolve(w.THREE);
      return three ||= import(new URL('./gfs/vendor/three.module.js', w.location.href).href);
    },
    ready: () => Promise.resolve(),
    onRebuild(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    redraw() { try { const r = hooks()?.__rend(); if (r?.shadowMap) r.shadowMap.needsUpdate = true } catch (_) { } },
    currentStyle() { return hooks() ? doc.querySelector('#styleRow select')?.value || w.__f3d.spec?.style : undefined },
  };
}

const store = { get(k, d) { try { const v = localStorage.getItem('gfsms.' + k); return v == null ? d : JSON.parse(v) } catch (_) { return d } }, set(k, v) { try { localStorage.setItem('gfsms.' + k, JSON.stringify(v)) } catch (_) { } } };

export async function boot(w) {
  if (w.__gfsSiteKit) return w.__gfsSiteKit;
  const q = new URLSearchParams(w.location.search);
  const hosted = w.parent && w.parent !== w && q.get('embed') === '1';     // inside the Studio or another host page
  const viewer = viewerAdapter(w);
  // Hole sizes set in the Model Studio on this device carry over; the view itself starts closed.
  const kit = createSiteKit(viewer, { ...store.get('kitCfg', {}), xray: false, footings: false });
  w.__gfsSiteKit = kit; w.__gfsViewerAdapter = viewer;
  await kit.enable();                                                      // steel gate frames draw from here on
  // Detailed gate hardware (Nationwide hinges, latches, drop rods). The customer portal keeps the plain
  // hardware until this has been looked over there; host pages (the Model Studio) switch it themselves.
  const hardware = createHardwareKit(viewer, {}); w.__gfsHardwareKit = hardware;
  studioHandles(w, viewer, hosted && q.get('portal') !== '1' && q.get('website') !== '1');   // push / pull modes: only when the Studio page answers (block at the end of this file)
  if (hosted || q.get('portal') === '1') return kit;                       // host pages bring their own buttons
  if (store.get('viewerHardware', true)) { try { await hardware.enable() } catch (e) { console.warn('[gfs] hardware', e) } }
  const rail = w.document.getElementById('rail'); if (!rail) return kit;
  const mk = (label, title, fn) => { const b = w.document.createElement('button'); b.className = 'rbtn'; b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.setAttribute('aria-pressed', 'false'); b.textContent = label; b.addEventListener('click', () => fn(b)); rail.insertBefore(b, rail.firstChild); return b };   // at the top: the rail runs off short screens
  const posts = mk('⏚', 'Below grade: see the posts in the ground and the concrete', b => { const on = !kit.state().config.xray; kit.set({ xray: on, footings: on }); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on) });
  const hw = mk('⚙', 'Detailed gate hardware', async b => { const on = b.getAttribute('aria-pressed') !== 'true'; try { if (on) await hardware.enable(); else hardware.clear(); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); store.set('viewerHardware', on) } catch (e) { console.warn('[gfs] hardware', e) } });
  if (hardware.state().on !== false && store.get('viewerHardware', true)) { hw.setAttribute('aria-pressed', 'true'); hw.classList.add('on') }
  // Photo-real materials are opt-in per device until they have been looked over on real hardware.
  let realism = null;
  const real = mk('◈', 'Photo-real materials (this device)', async b => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    try {
      if (on) { if (!realism) { const m = await import('./realism.mjs'); const pack = store.get('pack', null); realism = m.createRealism(viewer, pack ? { pack } : {}) } await realism.enable() } else if (realism) realism.disable();
      b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); store.set('viewerRealism', on);
    } catch (e) { console.warn('[gfs] materials', e) }
  });
  posts.id='btnViewerPosts'; hw.id='btnViewerHardware'; real.id='btnViewerMaterials';
  if (store.get('viewerRealism', false)) real.click();
  // V3-143 "Model check" chip. Same condition as the rail buttons above (not hosted, not the portal, the viewer has its rail).
  // profile-diagnostics.mjs ships in the executive build only, so on the portal and website this import fails quietly and nothing is shown.
  import('./profile-diagnostics.mjs').then(m => attachModelCheck(w, viewer, m)).catch(() => { });
  return kit;
}

// The chip never blocks drawing: it reads the finished build after the viewer has been idle, inside try/catch, and only adds one small button.
export function attachModelCheck(w, viewer, diag, { delayMs = 900 } = {}) {
  const doc = w.document; let timer = 0, chip = null, panel = null, issues = [];
  const heightNow = () => { const on = doc.querySelector('#hRow .chip.on'); const n = on ? parseFloat(on.textContent) : NaN; const sp = (w.__f3d && w.__f3d.spec) || {}; return n > 0 ? n : (sp.h || 6) };
  async function run() {
    try {
      const f3d = w.__f3d; if (!f3d || !f3d.fenceGroup) return render([]);
      const T = w.THREE && w.THREE.Matrix4 ? w.THREE : await viewer.three(); if (!T || !T.Matrix4) return render([]);
      const sp = f3d.spec || {}, lines = sp.lines || [];
      // A job with several styles or heights is several models in one group; the Studio checks styles one at a time, so this chip does too.
      if (new Set(lines.map(l => l.s || '')).size > 1 || new Set(lines.map(l => l.h || '')).size > 1) return render([]);
      const style = viewer.currentStyle(), spec = w.__f3dStyleSpec ? w.__f3dStyleSpec(style) : null; if (!style || !spec) return render([]);
      const saved = (sp.ov && sp.ov[style]) || {}, h = heightNow();
      const groundAt = typeof f3d.gy === 'function' ? (x, z) => f3d.gy(x, z) : undefined;   // feet, world: every part then carries the ground under it
      render(diag.diagnose({ style, spec: JSON.parse(JSON.stringify(spec)), saved, h, parts: diag.partsFromGroup(f3d.fenceGroup, T, { groundAt }) }));
    } catch (_) { render([]) }
  }
  function render(list) {
    issues = list;
    if (!list.length) { if (chip) chip.style.display = 'none'; if (panel) panel.style.display = 'none'; return }
    if (!chip) {
      chip = doc.createElement('button'); chip.type = 'button'; chip.id = 'gfsModelCheck'; chip.setAttribute('aria-expanded', 'false');
      chip.style.cssText = 'position:fixed;left:10px;bottom:calc(var(--gfs-viewer-sheet-clearance,12px) + 58px);z-index:44;font:600 12px system-ui,sans-serif;padding:5px 10px;border-radius:999px;border:1px solid #B7791F;background:#FFF8E6;color:#6B4A10;cursor:pointer;opacity:.92';
      chip.addEventListener('click', () => { const open = panel.style.display === 'none'; panel.style.display = open ? 'block' : 'none'; chip.setAttribute('aria-expanded', String(open)) });
      panel = doc.createElement('div'); panel.id = 'gfsModelCheckList'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Model check');
      panel.style.cssText = 'display:none;position:fixed;left:10px;right:10px;max-width:520px;bottom:calc(var(--gfs-viewer-sheet-clearance,12px) + 92px);max-height:40%;overflow:auto;z-index:44;background:#fff;color:#0E1720;border:1px solid #D9D5CB;border-radius:10px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(14,23,32,.2)';
      doc.body.appendChild(panel); doc.body.appendChild(chip);
    }
    chip.style.display = ''; chip.textContent = 'Model check: ' + list.length + (list.length === 1 ? ' issue' : ' issues');
    panel.replaceChildren();
    const head = doc.createElement('strong'); head.textContent = 'Model check for ' + list[0].style; panel.appendChild(head);
    const note = doc.createElement('p'); note.style.cssText = 'margin:4px 0 0;color:#667382;font-size:12px'; note.textContent = 'The 3D shows the saved values as they are. Review and fix them in the Model Studio.'; panel.appendChild(note);
    for (const i of list) { const p = doc.createElement('p'); p.style.cssText = 'margin:8px 0 0'; p.textContent = diag.chipLine(i); panel.appendChild(p) }
  }
  const schedule = () => { w.clearTimeout(timer); timer = w.setTimeout(run, delayMs) };
  viewer.onRebuild(schedule); schedule();
  return { run, issues: () => issues.slice(), chip: () => chip };
}

// ---- BEGIN studio push/pull (Orbit | Move | Resize) -------------------------------------------------------------
// Studio page only. The viewer asks its parent page; only the Model Studio answers, and only then is handles.mjs
// requested (it is not part of the files that ship to the portal / website, so those sites never ask for it).
// No answer, or a missing file: nothing happens and nothing is logged.
function studioHandles(w, viewer, hosted) {
  if (!hosted) return;
  try {
    const parent = w.parent, origin = w.location.origin; let done = false;
    const rx = e => {
      const d = e.data; if (done || e.source !== parent || e.origin !== origin || !d || d.type !== 'GFS_STUDIO_HANDLES_REPLY' || d.op !== 'hello' || !d.ok) return;
      done = true; w.removeEventListener('message', rx);
      import('./handles.mjs').then(m => m.bootHandles(w, viewer)).catch(() => { });
    };
    w.addEventListener('message', rx);
    [0, 1500, 4000].forEach(ms => w.setTimeout(() => { if (!done) try { parent.postMessage({ type: 'GFS_STUDIO_HANDLES', op: 'hello', id: 'hi' + ms }, origin) } catch (_) { } }, ms));
    w.setTimeout(() => w.removeEventListener('message', rx), 9000);
  } catch (_) { }
}
// ---- END studio push/pull ---------------------------------------------------------------------------------------
