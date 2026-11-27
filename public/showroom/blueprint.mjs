// Dimensioned GFS blueprints, drawn from the Executive App's own 3D model of each style.
// The model is built in the /x3d/ viewer (same specs the Exec App publishes), every
// post, rail and picket is measured from its real geometry, and the sheet is drawn
// as an 11×17 SVG: front elevation, end view, 3D view, parts list, notes, title block.
// Nothing is typed in by hand, so a model change in the Exec App changes the blueprint.
import { $, esc, icons, toast, clamp } from './ui.mjs';
import { familyOfModel } from './ar.mjs';

const W = 1700, H = 1100;                     // 17 × 11 in at 100 px per inch
const INK = '#102b46', DIM = '#1d5eb6', ACC = '#c96f2c', GRID = '#e6edf5';
const memo = new Map();
let fonts = null, logo = null, overlay = null;

// ── Formatting ───────────────────────────────────────────────────
const FR = ['', '⅛', '¼', '⅜', '½', '⅝', '¾', '⅞'];
export function inch(v) { // inches → 3½"
  let e = Math.round(v * 8), w = Math.floor(e / 8), f = e % 8;
  return (w || !f ? String(w) : '') + FR[f] + '"';
}
export function ftin(v) { // inches → 6'-0" (or 5½" under 2 ft)
  if (Math.abs(v) < 24) return inch(v);
  let e = Math.round(v * 8), ft = Math.floor(e / 96), r = e - ft * 96;
  return `${ft}'-${inch(r / 8)}`;
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };

async function dataUrl(url) {
  const b = await (await fetch(url)).blob();
  return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
}
async function assets() {
  fonts ||= Promise.all([
    dataUrl('/assets/fonts/archivo-latin-wght-normal.woff2'),
    dataUrl('/assets/fonts/source-sans-3-latin-wght-normal.woff2'),
    dataUrl('/assets/fonts/ibm-plex-mono-latin-500-normal.woff2')
  ]).catch(() => ['', '', '']);
  logo ||= (async () => { // the current logo on ghareebfence.com, as a PNG for every viewer
    const img = new Image(); img.src = '/assets/img/performance-v12/ghareeb-logo-396.webp'; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); return c.toDataURL('image/png');
  })().catch(() => '');
  return { fonts: await fonts, logo: await logo };
}

// ── Build the model in the viewer and measure it ─────────────────
async function buildModel(app, name, host, onStep) {
  const mods = await import('/gfs/website-model.mjs');
  const { fencePartLayer } = await import('/gfs/fence-layers.mjs');
  const specs = app.live.specs && app.live.specs[name] ? app.live.specs : undefined;
  const h = (name.match(/(\d+(?:\.\d)?)\s*(?:ft|'|’)/i) || [])[1];
  const spec = mods.buildPreviewSpec({ name, height: h ? +h : 6, overrides: specs, detail: true });
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
  frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;opacity:.01;pointer-events:none';
  host.append(frame);
  onStep(0);
  await new Promise((res, rej) => {
    const t = setTimeout(() => { removeEventListener('message', on); rej(Error(navigator.onLine ? 'The 3D model took too long to build. Try again.' : 'Blueprints need a connection the first time each style is drawn.')); }, 40000);
    const on = e => { if (e.source === frame.contentWindow && e.data?.type === 'GFS_F3D_READY') { clearTimeout(t); removeEventListener('message', on); res(); } };
    addEventListener('message', on);
    frame.src = '/x3d/fence3d.html?embed=1&website=1#' + mods.encodePreview(spec);
  });
  onStep(1);
  const w = frame.contentWindow, T = w.THREE, group = w.__f3d?.fenceGroup;
  if (!T || !group) throw Error('The 3D model did not load.');
  group.updateWorldMatrix(true, true);
  const parts = [], meshes = [], m4 = new T.Matrix4(), box = new T.Box3();
  group.traverseVisible(o => {
    if (!o.isMesh) return;
    o.geometry.boundingBox || o.geometry.computeBoundingBox();
    const n = o.isInstancedMesh ? o.count : 1, kinds = o.userData.parts;
    for (let i = 0; i < n; i++) {
      const world = o.matrixWorld.clone();
      if (o.isInstancedMesh) { o.getMatrixAt(i, m4); world.multiply(m4); }
      box.copy(o.geometry.boundingBox).applyMatrix4(world);
      const p = (kinds && (kinds[i] || kinds[0])) || {};
      const kind = String(p.kind || o.userData.fencePartKind || o.name || 'part');
      const layer = p.gate === true ? 'gates' : fencePartLayer(kind);
      const b = { x0: box.min.x * 12, x1: box.max.x * 12, y0: box.min.y * 12, y1: box.max.y * 12, z0: box.min.z * 12, z1: box.max.z * 12 };
      parts.push({ kind, layer, ...b, w: b.x1 - b.x0, h: b.y1 - b.y0, d: b.z1 - b.z0 });
      meshes.push({ o, i, world, layer, kind });
    }
  });
  if (!parts.length) throw Error('This model has no parts to draw.');
  return { T, frame, spec, parts, meshes };
}

function measure(parts) {
  const fence = parts.filter(p => p.layer && p.layer !== 'hardware');
  const ext = k => [Math.min(...fence.map(p => p[k + '0'])), Math.max(...fence.map(p => p[k + '1']))];
  const [X0, X1] = ext('x'), [Y0, Y1] = ext('y'), [Z0, Z1] = ext('z');
  const posts = fence.filter(p => p.layer === 'posts').sort((a, b) => (a.x0 + a.x1) - (b.x0 + b.x1));
  const rails = [];
  const uprights = fence.filter(p => p.layer === 'rails' && p.h > p.w);
  for (const r of fence.filter(p => p.layer === 'rails' && p.h <= p.w).sort((a, b) => a.y0 - b.y0)) {
    const near = rails.find(x => Math.abs(x.y0 - r.y0) < .3 && Math.abs(x.y1 - r.y1) < .3);
    if (near) { near.x0 = Math.min(near.x0, r.x0); near.x1 = Math.max(near.x1, r.x1); continue; }
    rails.push({ ...r });
  }
  const infill = fence.filter(p => p.layer === 'pickets');
  const narrow = infill.filter(p => p.w <= 14 && p.h > 6 && !/lattice|mesh|wire|fabric/i.test(p.kind));
  let picket = null;
  if (narrow.length >= 2) {
    const width = med(narrow.map(p => p.w)), sorted = [...narrow].sort((a, b) => a.x0 - b.x0);
    const zc = p => (p.z0 + p.z1) / 2, courses = [];
    for (const p of sorted) { const c = courses.find(c => Math.abs(c.z - zc(p)) < .3); c ? c.list.push(p) : courses.push({ z: zc(p), list: [p] }); }
    const main = courses.sort((a, b) => b.list.length - a.list.length)[0].list;
    const pitch = med(main.slice(1).map((p, i) => p.x0 - main[i].x0).filter(d => d > .2));
    const all = med(sorted.slice(1).map((p, i) => p.x0 - sorted[i].x0).filter(d => d > .2));
    picket = { width, gap: pitch - width, courses: courses.length, overlap: courses.length > 1 ? width - all : 0, top: Math.max(...narrow.map(p => p.y1)), bottom: Math.min(...narrow.map(p => p.y0)), thick: med(narrow.map(p => p.d)) };
  }
  const panel = infill.filter(p => p.w > 14 && !(p.h < 12 && !/lattice|mesh|wire|fabric/i.test(p.kind))).sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
  const postA = posts[0], postB = posts.find(p => p !== postA && (p.x0 + p.x1) / 2 - (postA.x0 + postA.x1) / 2 > 12);
  return {
    X0, X1, Y0, Y1, Z0, Z1, rails, picket, panel, posts, uprights,
    boards: infill.filter(p => p.w > 14 && p.h < 12 && !/lattice|mesh|wire|fabric/i.test(p.kind)),
    postW: postA ? postA.w : null, postD: postA ? postA.d : null, postTop: postA ? postA.y1 : null,
    oc: postA && postB ? (postB.x0 + postB.x1) / 2 - (postA.x0 + postA.x1) / 2 : X1 - X0,
    clear: postA && postB ? postB.x0 - postA.x1 : null,
    bottom: Math.min(...infill.map(p => p.y0).concat(Infinity)),
    height: Y1, depth: Z1 - Z0,
    faceZ: infill.length ? med(infill.map(p => (p.z0 + p.z1) / 2)) : null
  };
}

// Parts list for one section, grouped by part and size.
function schedule(parts) {
  const LABEL = { posts: 'Post', rails: 'Rail', pickets: 'Picket / panel', trim: 'Cap / trim', gates: 'Gate' };
  const rows = new Map();
  for (const p of parts) {
    if (!p.layer || p.layer === 'hardware') continue;
    const dims = [p.w, p.h, p.d].map(v => Math.round(v * 8) / 8).sort((a, b) => a - b);
    const PLAIN = { termpost: 'end post', linepost: 'line post', gatepost: 'gate post', toprail: 'top rail', midrail: 'middle rail', botrail: 'bottom rail', fabric: 'chain link fabric', wire: 'welded wire', topper: 'topper' };
    const raw = p.kind.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
    const name = PLAIN[raw.replace(/\s+/g, '')] || raw;
    const key = p.layer + '|' + name + '|' + dims.join('x');
    const r = rows.get(key) || { layer: p.layer, label: name.charAt(0).toUpperCase() + name.slice(1), dims, n: 0 };
    r.n++; rows.set(key, r);
  }
  const order = ['posts', 'rails', 'pickets', 'trim', 'gates'];
  return [...rows.values()].sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer) || b.n - a.n).slice(0, 9)
    .map(r => ({ ...r, size: `${inch(r.dims[0])} × ${inch(r.dims[1])} × ${ftin(r.dims[2])}`, group: LABEL[r.layer] }));
}

// ── Render the views with the viewer's own three.js ──────────────
function renderViews(T, meshes, M, rects) {
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const fill = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const line = new T.LineBasicMaterial({ color: new T.Color(INK) });
  const edgeCache = new Map(), owned = [];
  const lines = new T.Scene(), shaded = new T.Scene();
  for (const { o, world, layer } of meshes) {
    if (!layer || layer === 'hardware') continue;
    const f = new T.Mesh(o.geometry, fill); f.matrixAutoUpdate = false; f.matrix.copy(world); lines.add(f);
    let eg = edgeCache.get(o.geometry.uuid);
    if (!eg) { eg = new T.EdgesGeometry(o.geometry, 28); edgeCache.set(o.geometry.uuid, eg); owned.push(eg); }
    const l = new T.LineSegments(eg, line); l.matrixAutoUpdate = false; l.matrix.copy(world); lines.add(l);
  }
  for (const { o, world, i } of meshes) { // shaded 3D view with the real materials and colors
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    let m = mat;
    if (o.isInstancedMesh && o.instanceColor) { const c = new T.Color(); o.getColorAt(i, c); m = mat.clone(); m.color = (mat.color || new T.Color(1, 1, 1)).clone().multiply(c); owned.push(m); }
    const s = new T.Mesh(o.geometry, m); s.matrixAutoUpdate = false; s.matrix.copy(world); shaded.add(s);
  }
  shaded.add(new T.HemisphereLight(0xffffff, 0x8a8f96, 2.4));
  const sun = new T.DirectionalLight(0xffffff, 2.6); sun.position.set(-6, 10, -8); shaded.add(sun);
  const fillL = new T.DirectionalLight(0xffffff, 1.1); fillL.position.set(8, 4, 6); shaded.add(fillL);

  const ft = v => v / 12;
  const pickFace = M.faceZ != null && M.rails.length ? (M.faceZ > (M.rails[0].z0 + M.rails[0].z1) / 2 ? 1 : -1) : -1;
  M.face = pickFace;
  const out = {};
  const shoot = (key, scene, cam, rect, scale = 2) => {
    renderer.setSize(Math.round(rect.w * scale), Math.round(rect.h * scale), false);
    renderer.setClearColor(0xffffff, 0); renderer.render(scene, cam);
    out[key] = { url: renderer.domElement.toDataURL('image/png'), cam, rect };
  };
  // Front elevation: look at the finished (picket) face, square on.
  {
    const r = rects.front, cx = ft((M.X0 + M.X1) / 2), cy = ft((M.Y0 + M.Y1) / 2);
    const s = Math.min(r.w / ft(M.X1 - M.X0 + 40), r.h / ft(M.Y1 - Math.min(0, M.Y0) + 30));
    const hw = r.w / s / 2, hh = r.h / s / 2;
    const cam = new T.OrthographicCamera(-hw, hw, hh, -hh, .1, 500);
    cam.position.set(cx, cy, pickFace * 100); cam.lookAt(cx, cy, 0); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    shoot('front', lines, cam, r); out.front.pxPerFt = s;
  }
  // End view: look along the fence.
  {
    const r = rects.end, cz = ft((M.Z0 + M.Z1) / 2), cy = ft((M.Y0 + M.Y1) / 2);
    const s = Math.min(r.w / ft(M.Z1 - M.Z0 + 40), r.h / ft(M.Y1 - Math.min(0, M.Y0) + 30));
    const hw = r.w / s / 2, hh = r.h / s / 2;
    const cam = new T.OrthographicCamera(-hw, hw, hh, -hh, .1, 500);
    cam.position.set(ft(M.X1) + 50, cy, cz); cam.lookAt(ft(M.X1), cy, cz); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    shoot('end', lines, cam, r); out.end.pxPerFt = s;
  }
  // 3D view.
  {
    const r = rects.iso, c = new T.Vector3(ft((M.X0 + M.X1) / 2), ft(M.Y1 / 2), ft((M.Z0 + M.Z1) / 2));
    const span = ft(Math.max(M.X1 - M.X0, M.Y1)) * .62;
    const cam = new T.PerspectiveCamera(32, r.w / r.h, .1, 500);
    cam.position.copy(c).add(new T.Vector3(-span * 1.55, span * .62, -pickFace * span * 1.15).multiplyScalar(1.5)); cam.lookAt(c); cam.updateMatrixWorld();
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
    shoot('iso', shaded, cam, r);
  }
  owned.forEach(x => x.dispose()); fill.dispose(); line.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
  // world (inches) → sheet px for a view
  for (const k of ['front', 'end']) {
    const { cam, rect } = out[k];
    out[k].px = (x, y, z) => { const v = new T.Vector3(ft(x), ft(y), ft(z)).project(cam); return [rect.x + (v.x + 1) / 2 * rect.w, rect.y + (1 - v.y) / 2 * rect.h]; };
  }
  return out;
}

// ── SVG drawing helpers ──────────────────────────────────────────
const t = (x, y, s, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" ${o.anchor ? `text-anchor="${o.anchor}"` : ''} ${o.rot ? `transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''} class="${o.cls || 'dim'}">${esc(s)}</text>`;
function dimH(x1, x2, y, label, ext = []) { // horizontal dimension with extension lines from ext y values
  const [a, b] = [Math.min(x1, x2), Math.max(x1, x2)], mid = (a + b) / 2;
  let s = `<g class="d">`;
  for (const [x, y0] of ext) s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y + (y0 > y ? -6 : 6)}" class="ext"/>`;
  s += `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}"/><path d="M${a} ${y - 5}L${a + 0} ${y + 5}M${b} ${y - 5}L${b} ${y + 5}" class="tick"/>`;
  s += `<path d="M${a - 4} ${y + 4}L${a + 4} ${y - 4}M${b - 4} ${y + 4}L${b + 4} ${y - 4}" class="slash"/>`;
  const w = label.length * 7.4 + 12;
  s += `<rect x="${mid - w / 2}" y="${y - 10}" width="${w}" height="20" class="lbg"/>` + t(mid, y + 4.5, label, { anchor: 'middle' });
  return s + '</g>';
}
function dimV(x, y1, y2, label, ext = [], side = 1) {
  const [a, b] = [Math.min(y1, y2), Math.max(y1, y2)], mid = (a + b) / 2;
  let s = `<g class="d">`;
  for (const [y, x0] of ext) s += `<line x1="${x0}" y1="${y}" x2="${x + (x0 > x ? 6 : -6)}" y2="${y}" class="ext"/>`;
  s += `<line x1="${x}" y1="${a}" x2="${x}" y2="${b}"/><path d="M${x + 4} ${a - 4}L${x - 4} ${a + 4}M${x + 4} ${b - 4}L${x - 4} ${b + 4}" class="slash"/>`;
  const w = label.length * 7.4 + 12;
  if (b - a > w + 6) s += `<rect x="${x - 10}" y="${mid - w / 2}" width="20" height="${w}" class="lbg"/>` + t(x + 4.5, mid, label, { anchor: 'middle', rot: -90 });
  else s += t(x + side * 10, mid + 4.5, label, { anchor: side > 0 ? 'start' : 'end' });
  return s + '</g>';
}
function leader(x, y, tx, ty, label, sub) {
  return `<g class="d"><circle cx="${x}" cy="${y}" r="3" class="dot"/><path d="M${x} ${y}L${tx} ${ty}L${tx + (tx > x ? 14 : -14)} ${ty}" class="ldr"/>` +
    t(tx + (tx > x ? 18 : -18), ty + 4.5, label, { anchor: tx > x ? 'start' : 'end', cls: 'call' }) + (sub ? t(tx + (tx > x ? 18 : -18), ty + 20, sub, { anchor: tx > x ? 'start' : 'end', cls: 'callsub' }) : '') + '</g>';
}

function sheet({ name, style, family, code, M, views, rows, notes, assets: A, date }) {
  const F = views.front, E = views.end, I = views.iso.rect, fr = F.rect;
  const P = F.px, pz = M.picket ? (M.picket.thick ? M.Z0 : M.Z0) : M.Z0;
  let dims = '';
  // ground line across the front elevation
  const g0 = P(M.X0 - 18, 0, pz), g1 = P(M.X1 + 18, 0, pz);
  const ground = `<line x1="${g0[0]}" y1="${g0[1]}" x2="${g1[0]}" y2="${g1[1]}" class="grade"/><rect x="${Math.min(g0[0], g1[0])}" y="${g0[1]}" width="${Math.abs(g1[0] - g0[0])}" height="14" fill="url(#earth)"/>` + t(Math.min(g0[0], g1[0]) + 4, g0[1] + 30, 'GRADE', { cls: 'tiny' });
  const top = P(0, M.height, pz)[1], bottomY = g0[1];
  const L = Math.min(P(M.X0, 0, pz)[0], P(M.X1, 0, pz)[0]), R = Math.max(P(M.X0, 0, pz)[0], P(M.X1, 0, pz)[0]);
  // overall height (left)
  dims += dimV(L - 40, bottomY, top, ftin(M.height), [[top, L - 4], [bottomY, L - 4]]);
  // posts on center + clear opening
  if (M.posts.length >= 2) {
    const a = M.posts[0], b = M.posts.find(p => (p.x0 + p.x1) / 2 - (a.x0 + a.x1) / 2 > 12) || M.posts[1];
    const ca = P((a.x0 + a.x1) / 2, a.y1, pz)[0], cb = P((b.x0 + b.x1) / 2, b.y1, pz)[0];
    dims += dimH(ca, cb, top - 44, `${ftin(M.oc)} ON CENTER`, [[ca, P(0, a.y1, pz)[1] - 4], [cb, P(0, b.y1, pz)[1] - 4]]);
    if (M.clear) { const ia = P(a.x1, 0, pz)[0], ib = P(b.x0, 0, pz)[0]; dims += dimH(ia, ib, bottomY + 48, `${ftin(M.clear)} BETWEEN POSTS`, [[ia, bottomY + 4], [ib, bottomY + 4]]); }
  }
  // rails: height to the top of each rail (right side); dashed where they sit behind the pickets
  const behind = p => M.faceZ != null && (M.faceZ - (p.z0 + p.z1) / 2) * (M.face || -1) > .4; // infill sits between the viewer and this part
  const hiddenRails = !!M.picket && M.rails.length > 0 && behind(M.rails[0]);
  for (const p of M.posts) if (behind(p)) { const [ax, ay] = P(p.x0, p.y1, pz), [bx, by] = P(p.x1, 0, pz); dims += `<rect x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}" class="hidden"/>`; }
  if (M.rails.length) {
    const xs = R + 34; let prev = bottomY;
    M.rails.forEach((rl, i) => {
      const y = P(0, rl.y1, pz)[1];
      dims += `<g class="d"><line x1="${R + 4}" y1="${y}" x2="${xs + 6}" y2="${y}" class="ext"/><line x1="${xs}" y1="${prev}" x2="${xs}" y2="${y}"/><path d="M${xs + 4} ${y - 4}L${xs - 4} ${y + 4}" class="slash"/></g>` + t(xs + 12, y + 4.5, `RAIL ${i + 1} · ${ftin(rl.y1)}`);
      if (hiddenRails) { const [ax, ay] = P(rl.x0, rl.y1, pz), [bx, by] = P(rl.x1, rl.y0, pz); dims += `<rect x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}" class="hidden"/>`; }
      prev = y;
    });
    dims += `<path d="M${xs + 4} ${bottomY - 4}L${xs - 4} ${bottomY + 4}" class="slash d"/>` + t(xs + 12, bottomY + 18, 'HEIGHTS TO TOP OF RAIL', { cls: 'tiny' });
  }
  // callouts, stacked down the left side so no leader crosses the drawing
  const calls = [];
  if (M.posts.length) {
    const a = M.posts.reduce((m, p) => (P((p.x0 + p.x1) / 2, 0, pz)[0] < P((m.x0 + m.x1) / 2, 0, pz)[0] ? p : m));
    calls.push({ at: P((a.x0 + a.x1) / 2, a.y1 * .9, pz), label: `${inch(M.postW)} × ${inch(M.postD)} POST`, sub: `${ftin(M.postTop)} above grade` });
  }
  const sx = fx => { const xa = P(M.X0, 0, pz)[0], xb = P(M.X1, 0, pz)[0]; return M.X0 + (M.X1 - M.X0) * (xa < xb ? fx : 1 - fx); };
  if (M.picket) {
    const p = M.picket, sub = p.courses > 1 && p.overlap > .1 ? `two courses · boards overlap ${inch(p.overlap)}` : p.gap > .1 ? `${inch(p.gap)} gap between pickets` : 'tight, no gap';
    calls.push({ at: P(sx(.16), p.bottom + (p.top - p.bottom) * .62, pz), label: `${inch(p.width)} × ${inch(p.thick)} PICKET`, sub });
  } else if (M.boards.length > 2) {
    const b = M.boards, hh = med(b.map(x => x.h)), ys = b.map(x => x.y0).sort((a, c) => a - c), gap = med(ys.slice(1).map((y, i) => y - ys[i]).filter(d => d > .2)) - hh;
    calls.push({ at: P(sx(.2), b[Math.floor(b.length / 2)].y0 + hh / 2, pz), label: `${inch(hh)} × ${inch(med(b.map(x => x.d)))} BOARDS`, sub: `${b.length} per section${gap > .1 ? ` · ${inch(gap)} gap` : ' · tight'}` });
  } else if (M.panel) calls.push({ at: P(sx(.16), M.panel.y0 + M.panel.h * .55, pz), label: `INFILL ${ftin(M.panel.w)} × ${ftin(M.panel.h)}`, sub: M.panel.kind.replace(/[_-]/g, ' ') });
  if (M.uprights.length) { const u = M.uprights[0], cs = [u.w, u.d].sort((a, c) => a - c); calls.push({ at: P((u.x0 + u.x1) / 2, u.y0 + u.h * .3, pz), label: `${inch(cs[0])} × ${inch(cs[1])} UPRIGHT`, sub: `${M.uprights.length} per section · ${ftin(u.h)} tall` }); }
  if (M.rails.length) {
    const rl = M.rails[Math.floor((M.rails.length - 1) / 2)];
    calls.push({ at: P(sx(.1), (rl.y0 + rl.y1) / 2, pz), label: `RAIL ${inch(Math.min(rl.h, rl.d))} × ${inch(Math.max(rl.h, rl.d))}`, sub: `${M.rails.length} per section` });
  }
  if (M.picket && M.picket.bottom > .3) calls.push({ at: P(sx(.3), M.picket.bottom, pz), label: `${inch(M.picket.bottom)} OFF GRADE`, sub: 'bottom of pickets' });
  calls.sort((a, b) => a.at[1] - b.at[1]);
  let lastY = top - 30;
  for (const c of calls) { const ty = Math.max(c.at[1] - 10, lastY + 50); lastY = ty; dims += leader(c.at[0], c.at[1], L - 96, ty, c.label, c.sub); }
  // end view dims
  const EP = E.px, eb = EP(M.X1, 0, M.Z0)[1], ez0 = EP(M.X1, 0, M.Z0)[0], ez1 = EP(M.X1, 0, M.Z1)[0], et = EP(M.X1, M.height, M.Z0)[1];
  const eL = Math.min(ez0, ez1), eR = Math.max(ez0, ez1);
  let edims = `<line x1="${eL - 50}" y1="${eb}" x2="${eR + 50}" y2="${eb}" class="grade"/><rect x="${eL - 50}" y="${eb}" width="${eR - eL + 100}" height="12" fill="url(#earth)"/>`;
  edims += dimH(eL, eR, eb + 40, inch(M.depth), [[eL, eb + 4], [eR, eb + 4]]);
  edims += dimV(eR + 44, eb, et, ftin(M.height), [[et, eR + 4], [eb, eR + 4]], 1);

  const fs = A.fonts, sc = Math.round(1200 / F.pxPerFt);
  const noteLines = notes.map((n, i) => `<text x="742" y="${866 + i * 20}" class="note">${esc(n)}</text>`).join('');
  const rowsSvg = rows.map((r, i) => `<g transform="translate(40 ${864 + i * 21})"><text x="12" y="0" class="cell">${esc(/^(post|rail|picket|cap)$/i.test(r.label) ? r.group : r.label)}</text><text x="430" y="0" class="cellm" text-anchor="end">${r.n}</text><text x="450" y="0" class="cellm">${esc(r.size)}</text></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><style>
${fs[0] ? `@font-face{font-family:A;src:url(${fs[0]}) format('woff2');font-weight:100 900}` : ''}
${fs[1] ? `@font-face{font-family:S;src:url(${fs[1]}) format('woff2');font-weight:200 900}` : ''}
${fs[2] ? `@font-face{font-family:M;src:url(${fs[2]}) format('woff2');font-weight:500}` : ''}
.dim{font:500 12.5px M,'IBM Plex Mono',monospace;fill:${DIM};letter-spacing:.02em}
.tiny{font:500 10.5px M,monospace;fill:#6a7d92;letter-spacing:.08em}
.call{font:500 12.5px M,monospace;fill:${INK}}.callsub{font:400 12px S,sans-serif;fill:#556a80}
.d line{stroke:${DIM};stroke-width:1}.d .ext{stroke:${DIM};stroke-width:.7;opacity:.7}.slash{stroke:${DIM};stroke-width:1.6}.tick{stroke:${DIM};stroke-width:1}
.lbg{fill:#fff}.dot{fill:${ACC}}.ldr{fill:none;stroke:${ACC};stroke-width:1.1}
.grade{stroke:${INK};stroke-width:2}.hidden{fill:none;stroke:${INK};stroke-width:1;stroke-dasharray:7 5;opacity:.55}
.h1{font:800 34px A,Archivo,sans-serif;fill:${INK};letter-spacing:-.01em}.eye{font:500 12px M,monospace;fill:${ACC};letter-spacing:.14em}
.vt{font:700 15px A,sans-serif;fill:${INK}}.vs{font:500 11px M,monospace;fill:#6a7d92;letter-spacing:.06em}
.cell{font:400 13.5px S,sans-serif;fill:${INK}}.cellm{font:500 12.5px M,monospace;fill:${INK}}.th{font:500 10.5px M,monospace;fill:#6a7d92;letter-spacing:.1em}
.note{font:400 13.5px S,sans-serif;fill:#2b3f55}
.tb{font:400 12.5px S,sans-serif;fill:#2b3f55}.tbm{font:500 12px M,monospace;fill:${INK}}.tbl{font:500 9.5px M,monospace;fill:#7d8fa3;letter-spacing:.12em}.tbn{font:800 19px A,sans-serif;fill:${INK}}
</style>
<pattern id="earth" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="${INK}" stroke-width="1" opacity=".35"/></pattern>
<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="${GRID}" stroke-width=".6"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="#fff"/>
<rect x="22" y="22" width="${W - 44}" height="${H - 44}" fill="none" stroke="${INK}" stroke-width="2"/>
<rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="${INK}" stroke-width=".6"/>
${[...'ABCD'].map((c, i) => `<text x="14" y="${160 + i * 260}" class="tiny" text-anchor="middle">${c}</text><text x="${W - 14}" y="${160 + i * 260}" class="tiny" text-anchor="middle">${c}</text>`).join('')}
${[1, 2, 3, 4, 5, 6].map(i => `<text x="${(i - .5) * (W / 6)}" y="16" class="tiny" text-anchor="middle">${i}</text><text x="${(i - .5) * (W / 6)}" y="${H - 8}" class="tiny" text-anchor="middle">${i}</text>`).join('')}
<text x="44" y="62" class="eye">DIMENSIONED BLUEPRINT · ${esc(family.toUpperCase())}</text>
<text x="44" y="98" class="h1">${esc(style || name)}</text>
${style && style !== name ? `<text x="44" y="122" class="vs">3D MODEL: ${esc(name.toUpperCase())}</text>` : ''}
<rect x="${fr.x}" y="${fr.y}" width="${fr.w}" height="${fr.h}" fill="url(#grid)" opacity=".7"/>
<image x="${fr.x}" y="${fr.y}" width="${fr.w}" height="${fr.h}" href="${F.url}"/>
${ground}${dims}
<text x="${fr.x}" y="${fr.y + fr.h + 34}" class="vt">A · Front elevation</text><text x="${fr.x + 160}" y="${fr.y + fr.h + 34}" class="vs">ONE SECTION, FINISHED SIDE · 1:${sc} AT 11 × 17${dims.includes('class="hidden"') ? ' · DASHED LINES = HIDDEN PARTS' : ''}</text>
<rect x="${E.rect.x}" y="${E.rect.y}" width="${E.rect.w}" height="${E.rect.h}" fill="url(#grid)" opacity=".7"/>
<image x="${E.rect.x}" y="${E.rect.y}" width="${E.rect.w}" height="${E.rect.h}" href="${E.url}"/>
${edims}
<text x="${E.rect.x}" y="${E.rect.y + E.rect.h + 34}" class="vt">B · End view</text>
<rect x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}" rx="6" fill="#d9e2ec"/>
<image x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}" href="${views.iso.url}"/>
<text x="${I.x}" y="${I.y + I.h + 26}" class="vt">C · 3D view</text>
<line x1="28" y1="820" x2="${W - 28}" y2="820" stroke="${INK}" stroke-width="1.2"/>
<line x1="720" y1="820" x2="720" y2="${H - 28}" stroke="${INK}" stroke-width=".6"/>
<line x1="1180" y1="820" x2="1180" y2="${H - 28}" stroke="${INK}" stroke-width="1.2"/>
<text x="52" y="842" class="th">PARTS IN ONE SECTION (FROM THE 3D MODEL)</text><text x="470" y="842" class="th" text-anchor="end">QTY</text><text x="490" y="842" class="th">SIZE</text>
${rowsSvg}
<text x="742" y="842" class="th">NOTES</text>
${noteLines}
${A.logo ? `<image x="1200" y="836" width="168" height="112" href="${A.logo}"/>` : ''}
<text x="1386" y="860" class="tbn">Ghareeb Fencing Solutions</text>
<text x="1386" y="882" class="tb">5242 Tractor Rd Suite C, Toledo, OH 43612</text>
<text x="1386" y="902" class="tb">(419) 214-2107 · ghareebfence.com</text>
<text x="1386" y="922" class="tb">nick@ghareebfence.com</text>
<line x1="1180" y1="962" x2="${W - 28}" y2="962" stroke="${INK}" stroke-width=".6"/>
<text x="1200" y="984" class="tbl">STYLE</text><text x="1200" y="1004" class="tbm">${esc((style || name).slice(0, 34))}</text>
<text x="1480" y="984" class="tbl">STYLE CODE</text><text x="1480" y="1004" class="tbm">${esc(code || '—')}</text>
<line x1="1180" y1="1018" x2="${W - 28}" y2="1018" stroke="${INK}" stroke-width=".6"/>
<text x="1200" y="1040" class="tbl">DRAWN</text><text x="1200" y="1060" class="tbm">${esc(date)}</text>
<text x="1330" y="1040" class="tbl">UNITS</text><text x="1330" y="1060" class="tbm">FT-IN</text>
<text x="1440" y="1040" class="tbl">SHEET</text><text x="1440" y="1060" class="tbm">1 OF 1</text>
<text x="1540" y="1040" class="tbl">SOURCE</text><text x="1540" y="1060" class="tbm">GFS 3D</text>
</svg>`;
}

function notesFor(style, M) {
  const n = [];
  if (style) for (const [k, v] of style.specs) if (/post|gate post|nails|built|sections|on slopes|wire|warranty/i.test(k) && !(/slip/i.test(k + v) && !/slip/i.test(M.name || ''))) n.push(`${k}: ${v}`);
  n.push('Fence follows the ground from post to post. It is not stepped.');
  n.push('Drawn to scale from the GFS 3D model of this style.');
  n.push('Final layout, post setting and heights are set in your written quote.');
  const lines = [];
  for (const s of n) { let rest = s, first = true; while (rest) { let cut = rest.length > 66 ? rest.lastIndexOf(' ', 66) : rest.length; if (cut < 20) cut = 66; lines.push((first ? '' : '   ') + rest.slice(0, cut).trim()); rest = rest.slice(cut).trim(); first = false; } }
  return lines.slice(0, 10);
}

// ── Public: make one blueprint (cached) ──────────────────────────
export async function makeBlueprint(app, name, style, host, onStep = () => {}) {
  const specs = app.live.specs?.[name] || null;
  const key = name + '|' + hash(JSON.stringify(specs || {})) + '|v5';
  if (memo.has(key)) return memo.get(key);
  const cacheUrl = '/showroom/blueprints/' + encodeURIComponent(key) + '.svg';
  try { const c = await caches.open('gfs-showroom-blueprints-v1'); const hit = await c.match(cacheUrl); if (hit) { const svg = await hit.text(); memo.set(key, svg); return svg; } } catch {}
  const A = await assets();
  const built = await buildModel(app, name, host, onStep);
  try {
    const M = measure(built.parts); M.name = name;
    onStep(2);
    const rects = { front: { x: 200, y: 150, w: 800, h: 590 }, end: { x: 1100, y: 470, w: 230, h: 270 }, iso: { x: 1100, y: 140, w: 560, h: 290 } };
    const views = renderViews(built.T, built.meshes, M, rects);
    onStep(3);
    const D = app.data;
    style ||= D.styles.find(s => s.models.includes(name)) || null;
    const family = (style ? D.familyById[style.family] : D.familyById[familyOfModel(name)])?.name || 'Fence';
    const svg = sheet({ name, style: style ? `${style.name}` : name, family, code: app.live.codes?.[name], M, views, rows: schedule(built.parts), notes: notesFor(style, M), assets: A, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) });
    memo.set(key, svg);
    try { const c = await caches.open('gfs-showroom-blueprints-v1'); await c.put(cacheUrl, new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })); } catch {}
    return svg;
  } finally { built.frame.remove(); }
}

async function toPng(svg, scale = 2) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas'); c.width = W * scale; c.height = H * scale;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

// ── Viewer ───────────────────────────────────────────────────────
const STEPS = ['Building the 3D model', 'Measuring posts, rails and pickets', 'Drawing the views', 'Adding dimensions'];
export async function openBlueprint(app, name, style) {
  overlay?.remove();
  const D = app.data;
  style ||= D.styles.find(s => s.models.includes(name)) || null;
  const others = style?.models || [name];
  const el = overlay = document.createElement('div'); el.className = 'bp';
  el.innerHTML = `
    <div class="bp-top"><button class="iconbtn" data-x aria-label="Close">${icons.close}</button>
      <div class="grow"><div class="eyebrow">BLUEPRINT</div><h3></h3></div>
      <button class="btn sm" data-share disabled>Share</button></div>
    <div class="bp-stage"><div class="bp-sheet"></div>
      <div class="bp-load"><div class="bp-scan"></div><ol>${STEPS.map(s => `<li>${s}</li>`).join('')}</ol></div></div>
    ${others.length > 1 ? `<div class="bp-models chips">${others.map(m => `<button class="chip" data-m="${esc(m)}">${esc(m)}</button>`).join('')}</div>` : ''}`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 350); if (overlay === el) overlay = null; };
  $('[data-x]', el).onclick = close;
  el.addEventListener('keydown', e => e.key === 'Escape' && close());
  let current = null, ticket = 0;
  const show = async m => {
    const my = ++ticket; current = null;
    $('h3', el).textContent = m;
    for (const b of el.querySelectorAll('[data-m]')) b.setAttribute('aria-pressed', String(b.dataset.m === m));
    const load = $('.bp-load', el), sheetEl = $('.bp-sheet', el), steps = [...load.querySelectorAll('li')];
    load.hidden = false; sheetEl.classList.remove('in'); $('[data-share]', el).disabled = true;
    steps.forEach(s => s.className = '');
    try {
      const svg = await makeBlueprint(app, m, style, $('.bp-stage', el), i => { if (my === ticket) steps.forEach((s, j) => s.className = j < i ? 'done' : j === i ? 'on' : ''); });
      if (my !== ticket || !el.isConnected) return;
      steps.forEach(s => s.className = 'done');
      sheetEl.innerHTML = `<img alt="Blueprint of ${esc(m)}" src="${URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))}">`;
      await sheetEl.firstChild.decode().catch(() => {});
      load.hidden = true; sheetEl.classList.add('in'); current = { m, svg }; zoomable(sheetEl);
      // Make the PNG now: iPhone Safari only opens the share sheet if it starts right after the tap.
      const png = await toPng(svg); if (my !== ticket || !el.isConnected) return;
      current.file = new File([png], `GFS blueprint - ${m.replace(/[<>:"/\\|?*]/g, '-')}.png`, { type: 'image/png' }); current.png = png;
      $('[data-share]', el).disabled = false;
    } catch (e) {
      if (my !== ticket) return;
      load.querySelector('ol').innerHTML = `<li class="err">${esc(e.message || 'The blueprint could not be drawn.')}</li>`;
    }
  };
  el.onclick = e => { const b = e.target.closest('[data-m]'); if (b) show(b.dataset.m); };
  $('[data-share]', el).onclick = async () => {
    if (!current?.file) return;
    const { file, png } = current;
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Ghareeb Fencing Solutions · ${current.m}` });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(png); a.download = file.name; a.click(); }
    } catch (e) { if (e.name !== 'AbortError') toast('Sharing was not available here.'); }
  };
  show(name);
}

export function zoomable(box) {
  const img = box.firstChild; let s = 1, x = 0, y = 0; const pts = new Map(); let g = null;
  const apply = () => { img.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
  box.onpointerdown = e => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); const v = [...pts.values()]; g = v.length > 1 ? { d: Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]), s } : { x: e.clientX - x, y: e.clientY - y }; };
  box.onpointermove = e => { if (!pts.has(e.pointerId) || !g) return; pts.set(e.pointerId, [e.clientX, e.clientY]); const v = [...pts.values()];
    if (v.length > 1 && g.d) { s = clamp(g.s * Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]) / g.d, 1, 6); } else if (g.x !== undefined && s > 1) { x = e.clientX - g.x; y = e.clientY - g.y; } apply(); };
  box.onpointerup = box.onpointercancel = e => { pts.delete(e.pointerId); if (!pts.size) { g = null; if (s <= 1.02) { s = 1; x = y = 0; apply(); } } else { const [p] = [...pts.values()]; g = { x: p[0] - x, y: p[1] - y }; } };
  let last = 0; box.ondblclick = null;
  box.addEventListener('pointerup', e => { const n = performance.now(); if (n - last < 300) { if (s > 1) { s = 1; x = y = 0; } else { s = 2.5; const r = box.getBoundingClientRect(); x = (r.width / 2 - (e.clientX - r.left)) * 1.5; y = (r.height / 2 - (e.clientY - r.top)) * 1.5; } img.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)'; apply(); setTimeout(() => img.style.transition = '', 360); last = 0; } else last = n; });
}
