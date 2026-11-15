// Runs INSIDE fence3d.html (executive app, and later portal and website): gives the plain viewer
// the same "below grade" view, steel gate frames and optional photo-real materials the Model
// Studio has, from the same module files. The viewer loads it with one guarded line:
//   import('./studio/in-viewer.mjs').then(m => m.boot(window)).catch(() => {})
// If the file is missing on a site, that import fails quietly and the viewer is unchanged.

import { createSiteKit } from './site-kit.mjs';
import { createHardwareKit } from './hardware-kit.mjs';

export function viewerAdapter(w) {
  const listeners = new Set(); let sig = '';
  w.setInterval(() => {
    const fg = w.__f3d && w.__f3d.fenceGroup; if (!fg) return;
    const s = fg.children.length + ':' + (fg.children[0] ? fg.children[0].uuid : '') + ':' + (fg.children.length ? fg.children[fg.children.length - 1].uuid : '');
    if (s !== sig) { sig = s; listeners.forEach(f => { try { f() } catch (_) { } }) }
  }, 250);
  let three = null;
  return {
    hooks: () => (w.__f3d ? w : null),
    three: () => three || (three = import(new URL('./gfs/vendor/three.module.js', w.location.href).href)),
    ready: () => Promise.resolve(),
    onRebuild(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    redraw() { try { const r = w.__rend(); if (r.shadowMap) r.shadowMap.needsUpdate = true } catch (_) { } },
    currentStyle() { const sel = w.document.querySelector('#styleRow select'); return sel ? sel.value : (w.__f3d.spec || {}).style },
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
  if (hosted || q.get('portal') === '1') return kit;                       // host pages bring their own buttons
  if (store.get('viewerHardware', true)) { try { await hardware.enable() } catch (e) { console.warn('[gfs] hardware', e) } }
  const rail = w.document.getElementById('rail'); if (!rail) return kit;
  const mk = (label, title, fn) => { const b = w.document.createElement('button'); b.className = 'rbtn'; b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.setAttribute('aria-pressed', 'false'); b.textContent = label; b.addEventListener('click', () => fn(b)); rail.insertBefore(b, rail.firstChild); return b };   // at the top: the rail runs off short screens
  mk('⏚', 'Below grade: see the posts in the ground and the concrete', b => { const on = !kit.state().config.xray; kit.set({ xray: on, footings: on }); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on) });
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
  if (store.get('viewerRealism', false)) real.click();
  return kit;
}
