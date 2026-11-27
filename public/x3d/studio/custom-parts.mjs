// V3-221 Custom pieces and per-part edits for one job's 3D (customer-safe: this file ships with the viewer to the
// app, the customer portal and the website, PORTAL_VIEWER_FILES).
//
// The Model Studio saves a job's own pieces and part edits as DATA on the job, never as code:
//   jobs/<id>.fence3dCustom = {v: 1, edits: [...], pieces: [...], terrain: [...], meshes: [...]}
// and the viewer draws them on top of the fence it builds. This module is the ONLY reader. It is defensive:
//   - every entry is validated; an unknown kind, a bad number or an over-long text is dropped, never guessed;
//   - hard caps on counts and sizes (LIMITS); a value out of range is refused (the entry is dropped), not clamped;
//   - no code, no URLs, no HTML from data: texts are drawn as plain letters on a canvas, colours are numbers, materials
//     are names from a fixed list, shapes are built here from numbers.
//
// Coordinates: positions are feet in the fence group's own space (the space the viewer builds the fence in; it is the
// world space unless the person slid or turned the fence), sizes and part moves are inches along that space's axes,
// rotations degrees about those axes.
//
// Part ids. A part of the built fence is named "r<run>.<kind>.<n>": its run (the viewer's run index, "x" when the part
// has none), its kind (post, rail, picket, ...) and its place among the parts of that kind on that run, counted in the
// order the viewer builds them. The same layout and style always builds the same order, so an id names the same board
// every time. If the style changes how many boards a run has, edits whose id no longer exists are simply not drawn.

export const CUSTOM_VERSION = 1;
export const LIMITS = Object.freeze({
  edits: 400, pieces: 200, drawn: 1500, terrain: 240, meshes: 4, meshVerts: 4000, meshTris: 6000,
  sizeIn: 480, moveIn: 240, posFt: 2000, scale: [0.05, 20], text: 40, label: 60, group: 40, json: 160000,
});
export const MATERIALS = Object.freeze({
  pt: { label: 'Treated pine', color: 0xA08A5F, rough: 0.86, metal: 0 },
  cedar: { label: 'Cedar', color: 0xA5603A, rough: 0.82, metal: 0 },
  white: { label: 'White vinyl', color: 0xF2F1EC, rough: 0.45, metal: 0 },
  tan: { label: 'Tan vinyl', color: 0xD9C8A5, rough: 0.48, metal: 0 },
  gray: { label: 'Gray vinyl', color: 0x9A9C9A, rough: 0.5, metal: 0 },
  black: { label: 'Black powder coat', color: 0x1E2023, rough: 0.5, metal: 0.55 },
  bronze: { label: 'Bronze powder coat', color: 0x4A3A2B, rough: 0.5, metal: 0.5 },
  galv: { label: 'Galvanized steel', color: 0xB4BCC2, rough: 0.4, metal: 0.85 },
  stain: { label: 'Dark stain', color: 0x5C3A22, rough: 0.8, metal: 0 },
  concrete: { label: 'Concrete', color: 0xA9A59C, rough: 0.95, metal: 0 },
  brick: { label: 'Brick', color: 0x8F4A36, rough: 0.92, metal: 0 },
  soil: { label: 'Soil', color: 0x5E4530, rough: 1, metal: 0 },
  glass: { label: 'Solar glass', color: 0x2B3440, rough: 0.15, metal: 0.3 },
});
export const PIECE_KINDS = Object.freeze(['cap', 'finial', 'lattice', 'arbor', 'kick', 'trim', 'arch', 'hinge', 'latch', 'droprod', 'wheel', 'planter', 'plaque', 'board', 'post', 'panel', 'cylinder', 'mesh']);
export const CAP_SHAPES = Object.freeze(['flat', 'pyramid', 'ball', 'gothic', 'solar']);
export const ATTACH_TO = Object.freeze(['posts', 'gateposts', 'lineposts']);
const POST_KINDS = new Set(['post', 'gatepost', 'termpost', 'linepost']);
const IGNORE_KINDS = new Set(['fastener', 'staple', 'fabrictie', 'ring', 'reveal', 'wire']);

// ---------------------------------------------------------------- validation (pure)

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const r3 = n => Math.round(n * 1000) / 1000;
const vec = (v, lo, hi) => Array.isArray(v) && v.length === 3 && v.every(n => num(n, lo, hi)) ? v.map(r3) : null;
/** Plain printable text, at most `max` characters; anything else is refused (''). No markup is ever interpreted. */
export function cleanText(v, max) {
  if (typeof v !== 'string' || v.length > max) return '';
  return /[\u0000-\u001f\u007f<>]/.test(v) ? '' : v.trim();
}
const ID = /^[A-Za-z0-9_.#-]{1,64}$/;
export const PART_ID = /^r(\d{1,3}|x)\.([a-z]{2,16})\.(\d{1,5})$/;
const color = v => Number.isSafeInteger(v) && v >= 0 && v <= 0xFFFFFF ? v : undefined;
const mat = v => typeof v === 'string' && Object.hasOwn(MATERIALS, v) ? v : undefined;

/** One per-part edit, cleaned, or null. Pure. */
export function cleanEdit(e) {
  if (!isObj(e) || typeof e.id !== 'string' || !PART_ID.test(e.id)) return null;
  const out = { id: e.id };
  if (e.hide === true) out.hide = true;
  if (e.move !== undefined) { const m = vec(e.move, -LIMITS.moveIn, LIMITS.moveIn); if (!m) return null; if (m.some(Boolean)) out.move = m }
  if (e.rot !== undefined) { const m = vec(e.rot, -360, 360); if (!m) return null; if (m.some(Boolean)) out.rot = m }
  if (e.scale !== undefined) { const m = vec(e.scale, LIMITS.scale[0], LIMITS.scale[1]); if (!m) return null; if (m.some(s => s !== 1)) out.scale = m }
  if (e.mat !== undefined) { if (!mat(e.mat)) return null; out.mat = e.mat }
  if (e.color !== undefined) { if (color(e.color) === undefined) return null; out.color = e.color }
  return Object.keys(out).length > 1 ? out : null;
}

/** One added piece, cleaned, or null. Pure. */
export function cleanPiece(p, meshCount = 0) {
  if (!isObj(p) || typeof p.id !== 'string' || !ID.test(p.id) || !PIECE_KINDS.includes(p.kind)) return null;
  const size = vec(p.size, 0.05, LIMITS.sizeIn); if (!size) return null;
  const out = { id: p.id, kind: p.kind, size };
  if (p.at !== undefined) { const a = vec(p.at, -LIMITS.posFt, LIMITS.posFt); if (!a) return null; out.at = a } else out.at = [0, 0, 0];
  if (p.rot !== undefined) { const a = vec(p.rot, -360, 360); if (!a) return null; if (a.some(Boolean)) out.rot = a }
  if (p.mat !== undefined) { if (!mat(p.mat)) return null; out.mat = p.mat }
  if (p.color !== undefined) { if (color(p.color) === undefined) return null; out.color = p.color }
  if (p.shape !== undefined) { if (!CAP_SHAPES.includes(p.shape)) return null; out.shape = p.shape }
  if (p.text !== undefined) { const t = cleanText(p.text, LIMITS.text); if (!t) return null; out.text = t }
  if (p.label !== undefined) { const t = cleanText(p.label, LIMITS.label); if (t) out.label = t }
  if (p.group !== undefined) { const t = cleanText(p.group, LIMITS.group); if (t) out.group = t }
  if (p.hide === true) out.hide = true;
  if (p.lock === true) out.lock = true;
  if (p.kind === 'mesh') { if (!Number.isSafeInteger(p.mesh) || p.mesh < 0 || p.mesh >= meshCount) return null; out.mesh = p.mesh }
  if (p.attach !== undefined) {
    const a = p.attach; if (!isObj(a) || !ATTACH_TO.includes(a.to)) return null;
    const every = a.every === undefined ? 1 : a.every; if (!Number.isSafeInteger(every) || every < 1 || every > 50) return null;
    const at = { to: a.to, every };
    if (a.run !== undefined && a.run !== null) { if (!Number.isSafeInteger(a.run) || a.run < 0 || a.run > 999) return null; at.run = a.run }
    out.attach = at;   // `at` is then an offset from the top centre of each post, in feet
  }
  return out;
}

/** An imported mesh, cleaned, or null: {name, v: [x,y,z,...] feet, f: [a,b,c,...]}. Pure. */
export function cleanMesh(m) {
  if (!isObj(m) || !Array.isArray(m.v) || !Array.isArray(m.f)) return null;
  const nv = m.v.length / 3, nt = m.f.length / 3;
  if (!Number.isInteger(nv) || !Number.isInteger(nt) || nv < 3 || nv > LIMITS.meshVerts || nt < 1 || nt > LIMITS.meshTris) return null;
  if (!m.v.every(n => num(n, -200, 200)) || !m.f.every(n => Number.isSafeInteger(n) && n >= 0 && n < nv)) return null;
  return { name: cleanText(m.name, LIMITS.label) || 'Imported part', v: m.v.map(r3), f: m.f.slice() };
}

/** The whole record, cleaned: unknown keys and bad entries are dropped, caps applied (extra entries are dropped, the first
 *  ones kept). Returns null for something that is not a record of this version, or one too big to draw. Pure. */
export function validateCustom(value) {
  if (!isObj(value) || value.v !== CUSTOM_VERSION) return null;
  try { if (JSON.stringify(value).length > LIMITS.json * 2) return null } catch (_) { return null }
  const meshes = (Array.isArray(value.meshes) ? value.meshes : []).slice(0, LIMITS.meshes).map(cleanMesh);
  const meshOk = meshes.filter(Boolean);
  const remap = new Map(); meshes.forEach((m, i) => { if (m) remap.set(i, meshOk.indexOf(m)) });
  const seenE = new Set(), seenP = new Set();
  const edits = (Array.isArray(value.edits) ? value.edits : []).map(cleanEdit).filter(e => e && !seenE.has(e.id) && seenE.add(e.id)).slice(0, LIMITS.edits);
  const pieces = (Array.isArray(value.pieces) ? value.pieces : []).map(p => {
    if (isObj(p) && p.kind === 'mesh') { if (!remap.has(p.mesh)) return null; p = { ...p, mesh: remap.get(p.mesh) } }
    return cleanPiece(p, meshOk.length);
  }).filter(p => p && !seenP.has(p.id) && seenP.add(p.id)).slice(0, LIMITS.pieces);
  const terrain = (Array.isArray(value.terrain) ? value.terrain : []).filter(t => Array.isArray(t) && t.length === 4 && num(t[0], -LIMITS.posFt, LIMITS.posFt) && num(t[1], -LIMITS.posFt, LIMITS.posFt) && num(t[2], 0.5, 60) && num(t[3], -12, 12)).slice(0, LIMITS.terrain).map(t => t.map(n => Math.round(n * 100) / 100));
  const out = { v: CUSTOM_VERSION, edits, pieces };
  if (terrain.length) out.terrain = terrain;
  if (meshOk.length) out.meshes = meshOk;
  if (JSON.stringify(out).length > LIMITS.json) return null;
  return out;
}
/** True when a cleaned record draws nothing. Pure. */
export const isEmptyCustom = c => !c || (!c.edits.length && !c.pieces.length && !(c.terrain || []).length);

// ---------------------------------------------------------------- part ids (pure over a list)

/** Ids for a list of parts in build order: [{kind, run}] -> ["r0.post.0", ...]. Pure. */
export function partIds(parts) {
  const n = new Map();
  return parts.map(p => {
    const kind = String(p && p.kind || 'part').toLowerCase().replace(/[^a-z]/g, '').slice(0, 16) || 'part';
    const run = p && Number.isSafeInteger(p.run) && p.run >= 0 && p.run < 1000 ? String(p.run) : 'x';
    const key = run + '|' + kind, i = n.get(key) || 0; n.set(key, i + 1);
    return `r${run}.${kind}.${i}`;
  });
}
/** Every selectable piece the viewer built, in build order: [{id, object, instanceId, part}]. Reads the viewer's own
 *  userData.parts tags (the same tags the Studio's Select tool reads). */
export function tagParts(group) {
  const list = [];
  if (!group) return list;
  group.traverse(o => {
    if (!o.isMesh) return; const ps = o.userData && o.userData.parts; if (!Array.isArray(ps) || !ps.length) return;
    const n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) { const part = ps[i] || ps[0]; if (!part || IGNORE_KINDS.has(part.kind)) continue; list.push({ object: o, instanceId: i, part }) }
  });
  partIds(list.map(x => x.part)).forEach((id, i) => { list[i].id = id });
  return list;
}

// ---------------------------------------------------------------- placement maths (pure)

/** Where each attached copy of a piece goes: for "posts" pieces, one per matching post top (every Nth, one run or all),
 *  offset by piece.at. `posts` = [{id, run, kind, top:{x,y,z}, ry}] in build order. Pure. */
export function attachPlacements(piece, posts) {
  if (!piece.attach) return [{ at: piece.at, ry: 0 }];
  const a = piece.attach;
  const pool = posts.filter(p => (a.to === 'posts' || (a.to === 'gateposts' ? p.kind === 'gatepost' : p.kind !== 'gatepost')) && (a.run === undefined || p.run === a.run));
  return pool.filter((_, i) => i % a.every === 0).map(p => ({ at: [p.top.x + piece.at[0], p.top.y + piece.at[1], p.top.z + piece.at[2]], ry: p.ry || 0, post: p.id }));
}

// ---------------------------------------------------------------- drawing (needs the viewer's THREE)

const D2R = Math.PI / 180, IN = 1 / 12;
function material(T, cache, key, colorOverride) {
  const k = (key || 'pt') + ':' + (colorOverride == null ? '' : colorOverride);
  if (cache.has(k)) return cache.get(k);
  const m = MATERIALS[key] || MATERIALS.pt;
  const out = new T.MeshStandardMaterial({ color: colorOverride == null ? m.color : colorOverride, roughness: m.rough, metalness: m.metal });
  if (key === 'glass') { out.emissive = new T.Color(0x0b1a2c); out.emissiveIntensity = 0.6 }
  cache.set(k, out); return out;
}
function textTexture(T, doc, text) {
  const c = doc.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d'); if (!g) return null;
  g.fillStyle = '#1d1f22'; g.fillRect(0, 0, 512, 160);
  g.fillStyle = '#f3efe6'; g.font = '700 84px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 84, 480);   // plain letters only; nothing in the text is interpreted
  const t = new T.CanvasTexture(c); if ('colorSpace' in t && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; return t;
}
/** The meshes of one piece, built at the origin, sized in feet (y up, x along the fence). `T` = THREE. */
export function pieceGeometry(T, piece, { meshes = [], doc = null, mats } = {}) {
  const [w, h, d] = piece.size.map(n => n * IN), out = [];
  const M = mats || ((key, c) => new T.MeshStandardMaterial({ color: c != null ? c : (MATERIALS[key] || MATERIALS.pt).color }));
  const m = M(piece.mat || defaultMat(piece), piece.color);
  const add = (g, x = 0, y = 0, z = 0, mm = m) => { const o = new T.Mesh(g, mm); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; out.push(o); return o };
  const box = (bw, bh, bd, x, y, z, mm) => add(new T.BoxGeometry(bw, bh, bd), x, y, z, mm);
  switch (piece.kind) {
    case 'cap': {
      const shape = piece.shape || 'flat';
      if (shape === 'flat') box(w, h, d, 0, h / 2);
      else if (shape === 'pyramid') { box(w, h * 0.35, d, 0, h * 0.175); const g = new T.ConeGeometry(Math.SQRT1_2 * Math.min(w, d), h * 0.65, 4); g.rotateY(Math.PI / 4); add(g, 0, h * 0.35 + h * 0.325) }
      else if (shape === 'ball') { box(w, h * 0.3, d, 0, h * 0.15); add(new T.SphereGeometry(Math.min(w, d) * 0.42, 20, 14), 0, h * 0.3 + Math.min(w, d) * 0.42) }
      else if (shape === 'gothic') { box(w, h * 0.3, d, 0, h * 0.15); add(new T.CylinderGeometry(0, Math.min(w, d) * 0.45, h * 0.7, 12), 0, h * 0.65) }
      else {
        box(w, h * 0.18, d, 0, h * 0.09);
        box(w * 0.78, h * 0.62, d * 0.78, 0, h * 0.49, 0, M('glass'));
        box(w * 0.94, h * 0.16, d * 0.94, 0, h * 0.88);
        box(w * 0.66, h * 0.04, d * 0.66, 0, h * 0.98, 0, M('black'));
      }
      break;
    }
    case 'finial': { add(new T.CylinderGeometry(w * 0.18, w * 0.3, h * 0.35, 12), 0, h * 0.175); add(new T.SphereGeometry(w * 0.32, 14, 10), 0, h * 0.55); add(new T.ConeGeometry(w * 0.12, h * 0.3, 10), 0, h * 0.85); break }
    case 'lattice': {
      // A framed square lattice: a frame of the piece's size and slats both ways about every 3 in (at most 60 slats).
      const frameT = Math.min(0.12, Math.max(0.05, Math.min(w, h) * 0.05)), slat = Math.max(0.03, frameT * 0.45), inner = [w - 2 * frameT, h - 2 * frameT];
      box(w, frameT, d, 0, frameT / 2); box(w, frameT, d, 0, h - frameT / 2); box(frameT, h, d, -w / 2 + frameT / 2, h / 2); box(frameT, h, d, w / 2 - frameT / 2, h / 2);
      const nx = Math.min(30, Math.max(1, Math.round(inner[0] / 0.25))), ny = Math.min(30, Math.max(1, Math.round(inner[1] / 0.25)));
      for (let i = 1; i < nx; i++) box(slat, inner[1], d * 0.4, -inner[0] / 2 + i * inner[0] / nx, h / 2, d * 0.15);
      for (let i = 1; i < ny; i++) box(inner[0], slat, d * 0.4, 0, frameT + i * inner[1] / ny, -d * 0.15);
      break;
    }
    case 'arbor': {
      const post = Math.max(0.29, d * 0.25);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(post, h, post, sx * (w / 2 - post / 2), h / 2, sz * (d / 2 - post / 2));
      for (const sz of [-1, 1]) box(w + 1.2, 0.46, 0.125, 0, h + 0.23, sz * (d / 2 - post / 2));
      const n = Math.max(3, Math.round(w / 0.75));
      for (let i = 0; i < n; i++) box(0.125, 0.3, d + 1, -w / 2 + (i + 0.5) * w / n, h + 0.55, 0);
      break;
    }
    case 'arch': {
      const tube = Math.max(0.05, d / 2), g = new T.TorusGeometry(w / 2, tube, 8, 32, Math.PI);
      const o = add(g, 0, h - w / 2 > 0 ? h - w / 2 : 0); o.scale.y = Math.min(1, h / (w / 2 || 1));
      break;
    }
    case 'hinge': box(w, h, d, 0, h / 2); add(new T.CylinderGeometry(d * 0.6, d * 0.6, h * 1.05, 12), -w / 2, h / 2); break;
    case 'latch': box(w, h, d, 0, h / 2); add(new T.CylinderGeometry(d * 0.35, d * 0.35, w * 0.8, 10), 0, h * 0.75).rotation.z = Math.PI / 2; break;
    case 'droprod': { const hl = Math.min(0.35, w * 3); add(new T.CylinderGeometry(w / 2, w / 2, h, 12), 0, h / 2); box(hl, w, w, w / 2 + hl / 2, h * 0.8); break }
    case 'wheel': { const o = add(new T.CylinderGeometry(h / 2, h / 2, w, 18), 0, h / 2); o.rotation.z = Math.PI / 2; box(w * 1.4, h * 0.35, d, 0, h + h * 0.17); break }
    case 'planter': {
      const t = Math.min(0.12, w / 8);
      box(w, h, t, 0, h / 2, d / 2 - t / 2); box(w, h, t, 0, h / 2, -d / 2 + t / 2); box(t, h, d, w / 2 - t / 2, h / 2); box(t, h, d, -w / 2 + t / 2, h / 2);
      box(w - 2 * t, 0.05, d - 2 * t, 0, h - 0.12, 0, M('soil'));
      break;
    }
    case 'plaque': {
      const tex = piece.text && doc ? textTexture(T, doc, piece.text) : null;
      box(w, h, d, 0, h / 2);
      if (tex) { const face = new T.Mesh(new T.PlaneGeometry(w * 0.94, h * 0.9), new T.MeshStandardMaterial({ map: tex, roughness: 0.6 })); face.position.set(0, h / 2, d / 2 + 0.003); out.push(face) }
      break;
    }
    case 'cylinder': add(new T.CylinderGeometry(w / 2, w / 2, h, 20), 0, h / 2); break;
    case 'mesh': {
      const src = meshes[piece.mesh]; if (!src) break;
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(src.v, 3)); g.setIndex(src.f); g.computeVertexNormals();
      g.computeBoundingBox(); const bb = g.boundingBox, sz = bb.getSize(new T.Vector3());
      // The imported part is scaled to the piece's size box and sat on its base.
      const o = add(g); o.scale.set(sz.x ? w / sz.x : 1, sz.y ? h / sz.y : 1, sz.z ? d / sz.z : 1);
      o.position.set(-(bb.min.x + sz.x / 2) * o.scale.x, -bb.min.y * o.scale.y, -(bb.min.z + sz.z / 2) * o.scale.z);
      break;
    }
    default: box(w, h, d, 0, h / 2);   // board, post, panel, kick, trim: a box of the exact size
  }
  return out;
}
export function defaultMat(piece) {
  return { hinge: 'black', latch: 'black', droprod: 'galv', wheel: 'black', arch: 'black', plaque: 'black', planter: 'cedar', cap: 'pt', finial: 'black' }[piece.kind] || 'pt';
}

/** Draws a cleaned record into the viewer `w` (its THREE, fence group and scene). Returns {group, drawn, hidden, missing}.
 *  Runs after every rebuild of the fence (the viewer rebuilds the fence group, which also puts the edited parts back). */
export function drawCustom(w, T, custom, { cache = new Map(), group = null, view = null } = {}) {
  const f3d = w.__f3d, fg = f3d && f3d.fenceGroup, scene = f3d && f3d.scene;
  const stats = { drawn: 0, hidden: 0, missing: 0, edited: 0 };
  if (!fg || !scene || !T) return { group, ...stats };
  if (!group) { group = new T.Group(); group.name = 'gfsCustom'; group.matrixAutoUpdate = false }
  // Put back what the last drawing hid (an edit that was removed must show its part again).
  for (const undo of group.userData.restore || []) { try { undo() } catch (_) { } }
  group.userData.restore = [];
  group.traverse(o => { if (o !== group && o.geometry && !o.userData.keepGeometry) o.geometry.dispose() }); group.clear();
  if (group.parent !== scene) scene.add(group);
  fg.updateWorldMatrix(true, true);
  group.matrix.copy(fg.matrixWorld); group.matrixWorldNeedsUpdate = true;
  const toFence = new T.Matrix4().copy(fg.matrixWorld).invert();
  // `view` (the Model Studio only): parts hidden on screen, or shown alone ({hide: [ids], only: [ids] | null}). Never saved.
  const vHide = new Set(view && Array.isArray(view.hide) ? view.hide : []), vOnly = view && Array.isArray(view.only) && view.only.length ? new Set(view.only) : null;
  const viewHidden = id => vHide.has(id) || (vOnly && !vOnly.has(id));
  if (!custom && !vHide.size && !vOnly) return { group, ...stats };
  custom = custom || { edits: [], pieces: [] };
  const mats = (k, c) => material(T, cache, k, c);
  const tags = tagParts(fg), byId = new Map(tags.map(t => [t.id, t]));
  const hideBuilt = t => {
    if (t.object.isInstancedMesh) {
      const o = t.object, i = t.instanceId, keep = new T.Matrix4(); o.getMatrixAt(i, keep);
      group.userData.restore.push(() => { if (o.parent) { o.setMatrixAt(i, keep); o.instanceMatrix.needsUpdate = true } });
      o.setMatrixAt(i, new T.Matrix4().makeScale(0, 0, 0)); o.instanceMatrix.needsUpdate = true;
    } else { const o = t.object, v = o.visible; group.userData.restore.push(() => { o.visible = v }); o.visible = false }
  };
  const local = t => { const m = new T.Matrix4(); if (t.object.isInstancedMesh) { t.object.getMatrixAt(t.instanceId, m); m.premultiply(t.object.matrixWorld) } else m.copy(t.object.matrixWorld); return m.premultiply(toFence) };
  // ---- per-part edits: the built part is hidden; a moved / turned / resized / recoloured copy is drawn in its place
  const zero = new T.Matrix4().makeScale(0, 0, 0);
  const edited = new Set(custom.edits.map(e => e.id));
  if (vHide.size || vOnly) for (const t of tags) if (!edited.has(t.id) && viewHidden(t.id)) hideBuilt(t);
  for (const e of custom.edits) {
    const t = byId.get(e.id); if (!t) { stats.missing++; continue }
    const m0 = local(t);
    if (t.object.isInstancedMesh) {
      const o = t.object, i = t.instanceId, keep = new T.Matrix4(); o.getMatrixAt(i, keep);
      group.userData.restore.push(() => { if (o.parent) { o.setMatrixAt(i, keep); o.instanceMatrix.needsUpdate = true } });
      o.setMatrixAt(i, zero); o.instanceMatrix.needsUpdate = true;
    } else { const o = t.object, v = o.visible; group.userData.restore.push(() => { o.visible = v }); o.visible = false }
    if (e.hide) { stats.hidden++; continue }
    if (viewHidden(e.id)) continue;
    const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); m0.decompose(p, q, s);
    // move: inches along the fence space's own axes; turn: degrees about those axes, through the part's centre
    if (e.move) p.add(new T.Vector3(e.move[0] * IN, e.move[1] * IN, e.move[2] * IN));
    if (e.rot) q.premultiply(new T.Quaternion().setFromEuler(new T.Euler(e.rot[0] * D2R, e.rot[1] * D2R, e.rot[2] * D2R)));
    if (e.scale) s.multiply(new T.Vector3(e.scale[0], e.scale[1], e.scale[2]));
    const mm = e.mat || e.color != null ? mats(e.mat || 'pt', e.color) : (Array.isArray(t.object.material) ? t.object.material[0] : t.object.material);
    const copy = new T.Mesh(t.object.geometry, mm); copy.matrixAutoUpdate = false; copy.matrix.compose(p, q, s);
    copy.castShadow = copy.receiveShadow = true; copy.userData.parts = [{ ...t.part, edited: e.id }]; copy.userData.customEdit = e.id; copy.userData.keepGeometry = true;
    group.add(copy); stats.edited++;
  }
  // ---- added pieces
  const posts = tags.filter(t => POST_KINDS.has(t.part.kind)).map(t => {
    const m = local(t); if (!t.object.geometry.boundingBox) t.object.geometry.computeBoundingBox();
    const bb = t.object.geometry.boundingBox.clone().applyMatrix4(m), c = bb.getCenter(new T.Vector3());
    const q = new T.Quaternion(), scale = new T.Vector3();
    m.decompose(new T.Vector3(), q, scale);
    const ry = new T.Euler().setFromQuaternion(q, 'YXZ').y;
    const size = t.object.geometry.boundingBox.getSize(new T.Vector3()).multiply(scale);
    return { id: t.id, run: t.part.run, index: t.part.index, kind: t.part.kind,
      top: { x: c.x, y: bb.max.y, z: c.z }, ry, width: size.x / IN, depth: size.z / IN };
  });
  const postsById = new Map(posts.map(post => [post.id, post]));
  const capsByStation = new Map();
  for (const tag of tags) {
    if (tag.part.kind !== 'cap' || tag.part.index == null) continue;
    const key = tag.part.run + ':' + tag.part.index;
    if (!capsByStation.has(key)) capsByStation.set(key, []);
    capsByStation.get(key).push(tag);
  }
  for (const piece of custom.pieces) {
    if (piece.hide || viewHidden('custom.' + piece.id)) continue;
    for (const pl of attachPlacements(piece, posts)) {
      if (stats.drawn >= LIMITS.drawn) break;
      const holder = new T.Group(); holder.matrixAutoUpdate = true;
      holder.position.set(pl.at[0], pl.at[1], pl.at[2]);
      const r = piece.rot || [0, 0, 0]; holder.rotation.set(r[0] * D2R, r[1] * D2R + (pl.ry || 0), r[2] * D2R, 'YXZ');
      let rendered = piece;
      const post = postsById.get(pl.post);
      if (post && piece.kind === 'cap' && piece.at.every(distance => distance === 0) && !piece.rot?.some(Boolean)) {
        // A cap placed directly on a post takes the post's size. Explicitly
        // moved or tilted custom pieces retain their positions and dimensions.
        const skirt = 0.28;
        rendered = { ...piece, size: [post.width + skirt, piece.size[1], post.depth + skirt] };
        const key = post.run + ':' + post.index;
        for (const tag of capsByStation.get(key) || []) {
          if (!edited.has(tag.id) && !viewHidden(tag.id)) hideBuilt(tag);
        }
        capsByStation.delete(key);
      }
      for (const o of pieceGeometry(T, rendered, { meshes: custom.meshes || [], doc: w.document, mats })) holder.add(o);
      holder.traverse(o => { if (o.isMesh) o.userData.parts = [{ kind: 'custom', piece: piece.id, post: pl.post || null }] });
      holder.userData.customPiece = piece.id;
      group.add(holder); stats.drawn++;
    }
  }
  return { group, ...stats };
}

/** Puts a saved terrain (Gaussian bumps [x, z, r, h], feet) on the viewer's own ground (window.__gfsShape), the same way
 *  the Studio's ground brush shapes it. Returns true when the viewer has a ground the fence follows. */
export function applyTerrain(w, terrain) {
  const S = w.__gfsShape, tools = w.__gfsShapeTools;
  if (!S || !tools || !Array.isArray(S.SC) || typeof tools.build !== 'function') return false;
  S.SC.length = 0; for (const [x, z, r, h] of terrain || []) S.SC.push({ x, z, r, h });
  try { tools.build(); if (typeof tools.bump === 'function') tools.bump(0, 0, 6, 0) } catch (_) { return false }
  for (let i = S.SC.length - 1; i >= 0; i--) if (Math.abs(S.SC[i].h) < 0.005) S.SC.splice(i, 1);
  return true;
}

/** Inside the viewer: draw `spec.custom` now and after every rebuild of the fence. `viewer` is in-viewer.mjs's adapter.
 *  window.__gfsCustom.refresh() redraws (the Model Studio calls it after it changes spec.custom). */
export function attachCustom(w, viewer) {
  if (w.__gfsCustom) return w.__gfsCustom;
  let group = null, terrainSig = '', raf = 0, last = null, baseSC = null;
  const cache = new Map();
  async function refresh() {
    try {
      const f3d = w.__f3d; if (!f3d || !f3d.fenceGroup) return null;
      const T = w.THREE && w.THREE.Mesh ? w.THREE : await viewer.three();
      const custom = validateCustom(f3d.spec && f3d.spec.custom);
      // a saved ground replaces the viewer's own ground bumps; taking it away puts back what the viewer had
      const sig = JSON.stringify(custom && custom.terrain || []);
      if (sig !== terrainSig) {
        terrainSig = sig;
        if (custom && custom.terrain) { if (baseSC == null && w.__gfsShape && Array.isArray(w.__gfsShape.SC)) baseSC = w.__gfsShape.SC.map(b => [b.x, b.z, b.r, b.h]); applyTerrain(w, custom.terrain) }
        else if (baseSC != null) { applyTerrain(w, baseSC); baseSC = null }
      }
      const r = drawCustom(w, T, custom, { cache, group, view: w.__gfsCustomView || null }); group = r.group; last = { drawn: r.drawn, hidden: r.hidden, missing: r.missing, edited: r.edited };
      if (!raf && group && !isEmptyCustom(custom)) {   // follow a slid or turned fence only when there is something to carry
        const follow = () => { try { const fg = w.__f3d && w.__f3d.fenceGroup; if (fg && group) { fg.updateWorldMatrix(true, false); group.matrix.copy(fg.matrixWorld); group.matrixWorldNeedsUpdate = true } } catch (_) { } raf = w.requestAnimationFrame(follow) };
        raf = w.requestAnimationFrame(follow);
      }
      viewer.redraw && viewer.redraw();
      return last;
    } catch (e) { try { console.warn('[gfs] custom pieces', e && e.message) } catch (_) { } return null }
  }
  viewer.onRebuild(() => { refresh() });
  const api = { refresh, state: () => last, group: () => group };
  w.__gfsCustom = api;
  refresh();
  return api;
}
