// GFS hardware kit — real Nationwide Industries gate hardware in place of the viewer's placeholder boxes.
//
// Same rules as site-kit.mjs: it works only through the viewer's hooks (window.__f3d, __f3dRuns, __f3dStyleSpec,
// _specParse, GFSModelContract.runPatch and the part kinds on each mesh), builds everything into one group it
// owns, records an undo for every change to the viewer's own objects and rebuilds on viewer.onRebuild.
// It adds, never edits: the viewer's placeholder meshes (ghinge, glatch, gdrop, ghandle) are only hidden, and
// clear() puts every one of them back.
//
// What decides what (all PURE and unit-tested with plain objects):
//   hardwareFor(spec, gate)       which catalog hardware a style's gate carries
//   planHardware(cands, runs, fn) which placeholder meshes get replaced, each decided from ITS OWN run's style
//   mountPlane / leafSide / ...   how a placeholder cluster is turned into a mounting point
//
// Where the viewer draws its placeholders (fence3d.html, builders in the generic gate code):
//   buildWoodGate   wood boarded gates AND split-rail / ranch wire gates.  hinge: `nH` knuckle-and-wing hinges
//                   (nH = gHinges clamped 2..4, else 3 when the gate body is >= 5.5 ft, else 2; wire gates draw 2),
//                   at xHinge = dir*(gatePostHalf + GAP/2), z = zHW.  latch: gravity bracket+arm on the leaf, keeper
//                   on the post (single) or the other leaf (double).  handle: ghandle 0 / 1 on the two faces.
//                   drop rod: li === 1 of a double gate.
//   buildVinylGate  vinyl panel gates: 3.5 in square hinge flanges + barrel (3 hinges when gate height > 6.3 ft),
//                   latch body on the post, keeper + striker on the gate stile, handles on both faces.
//   buildGate       everything else (aluminum, chain link, framed gates, vinyl ranch): hinge count
//                   gHinges else (height > 5 ft ? 3 : 2); latch 'fork' (chain), 'magna' (aluminum), else gravity.
// Each placeholder is a plain Mesh in a leaf group; the leaf's root group (a child of the run's builder group)
// carries the run's rotation, so a mesh's own position is already the gate-local ("closed") coordinate.

export const IN = 1 / 12;
const NWI = 'Nationwide Industries';
const WOOD_CAT = 'nwi-wood-catalog.pdf', VINYL_CAT = 'nwi-vinyl-catalog.pdf', ORN_CAT = 'nwi-ornamental-catalog.pdf';

// ---------------------------------------------------------------------------------------------------------------
// Catalog. dims are inches. Every number is either published (read from the NWI catalogs in
// /home/claude/research/suppliers.json -> nationwide.hardware) or listed in `assumed` by key. An assumed
// dimension is a drawing proportion only and is never passed off as a spec.
// ---------------------------------------------------------------------------------------------------------------
const H = (id, name, model, type, families, dims, finish, source, assumed, extra = {}) =>
  ({ id, name, model, maker: NWI, type, families, dims, finish, source, assumed, ...extra });

const TEE_ASSUMED = ['strapW', 'strapT', 'barrelDia', 'barrelLen', 'postPlateW', 'postPlateH'];
const ROD_HD = (len) => H(`NW38305-${len}Q`, `Heavy Duty Drop Rod ${len} in`, `NW38305-${len}Q`, 'dropRod', ['Wood', 'Vinyl', 'Rail'],
  { diaIn: 0.625, lengthIn: len, guides: 2, handleReachIn: 3.5 }, 'black powder coat (zinc variants)', WOOD_CAT, ['handleReachIn']);
const ROD_COM = (len) => H(`NW6270-${len}-BK`, `Commercial Drop Rod ${len} in`, `NW6270-${len}-BK`, 'dropRod', ['Aluminum', 'Chain link'],
  { diaIn: 1, lengthIn: len, guides: 2, handleReachIn: 4 }, 'zinc plated powder coat black', WOOD_CAT, ['guides', 'handleReachIn']);

export const HARDWARE = Object.fromEntries([
  // ---- hinges
  H('NW38937Q', 'Ornamental T Hinge 8 in', 'NW38937Q', 'hinge', ['Wood', 'Rail'],
    { strapLen: 8, strapW: 1.25, strapT: 0.19, barrelDia: 0.6, barrelLen: 3, postPlateW: 2.4, postPlateH: 4 }, 'zinc plate steel, black', WOOD_CAT, TEE_ASSUMED, { style: 'tee' }),
  H('NW38933MDQ', 'Ornamental T Hinge 10 in', 'NW38933MDQ', 'hinge', ['Wood', 'Rail'],
    { strapLen: 10, strapW: 1.4, strapT: 0.19, barrelDia: 0.6, barrelLen: 3, postPlateW: 2.4, postPlateH: 4 }, 'zinc plate steel, black', WOOD_CAT,
    [...TEE_ASSUMED, 'size-to-model pairing follows the order the catalog lists them'], { style: 'tee' }),
  H('NW38935Q', 'Ornamental T Hinge 12 in', 'NW38935Q', 'hinge', ['Wood', 'Rail'],
    { strapLen: 12, strapW: 1.5, strapT: 0.2, barrelDia: 0.65, barrelLen: 3.4, postPlateW: 2.6, postPlateH: 4.5 }, 'zinc plate steel, black', WOOD_CAT,
    [...TEE_ASSUMED, 'size-to-model pairing follows the order the catalog lists them'], { style: 'tee' }),
  H('NW38937HDQ', 'Heavy Duty Self-Closing Ornamental T Hinge 8 in', 'NW38937HDQ', 'hinge', ['Wood', 'Rail'],
    { strapLen: 8, strapW: 1.5, strapT: 0.25, barrelDia: 0.9, barrelLen: 6, postPlateW: 2.6, postPlateH: 5 }, 'zinc plate steel, black', WOOD_CAT, TEE_ASSUMED, { style: 'tee', selfClosing: true }),
  H('RUSH116-BK', 'Rustic Series Strap Hinge 16 in', 'RUSH116-BK', 'hinge', ['Rail', 'Wood'],
    { strapLen: 16, pinDia: 0.625, strapW: 1.5, strapT: 0.19, postStrapLen: 6.5, barrelLen: 2.4 }, 'black powder coat', WOOD_CAT, ['strapW', 'strapT', 'postStrapLen', 'barrelLen'], { style: 'strap' }),
  H('NW171NASC-SSB', 'Stainless Self-Closing Hinge, narrow to narrow', 'NW171NASC-SSB', 'hinge', ['Vinyl', 'Rail'],
    { flangeH: 3.5, flangeW: 3.5, depth: 1.25, flangeT: 0.14, barrelDia: 1.2 }, '300 series stainless, black powder coat', VINYL_CAT, ['flangeT', 'barrelDia'], { style: 'flange', selfClosing: true }),
  H('NW093A', 'Ornamental Self-Closing Aluminum Hinge', 'NW093A-26', 'hinge', ['Aluminum'],
    { flangeW: 1, flangeD: 1, flangeH: 3.4, flangeT: 0.1, barrelDia: 0.8, barrelLen: 3.8 }, 'aluminum, black', ORN_CAT, ['flangeH', 'flangeT', 'barrelDia', 'barrelLen'], { style: 'alu', selfClosing: true }),
  H('HDBY', 'Heavy Duty Sealed Bearing Hinge', 'HDBY-ABB-ABB', 'hinge', ['Chain link'],
    { height: 7.2, ratingLb: 2500, barrelDia: 1.5, leafW: 2, leafT: 0.25 }, 'black e-coat', ORN_CAT, ['barrelDia', 'leafW', 'leafT'], { style: 'butt' }),
  // ---- latches
  H('NW38204Q', 'Standard Gravity Latch', 'NW38204Q', 'latch', ['Wood', 'Rail', 'Aluminum', 'Vinyl'],
    { strikeBar: 0.38, bracketW: 1.5, bracketH: 3.2, plateT: 0.16, armLen: 7.5, armW: 0.95, armT: 0.19 }, 'zinc plate steel, black', WOOD_CAT, ['bracketW', 'bracketH', 'plateT', 'armLen', 'armW', 'armT'], { style: 'gravity' }),
  H('NW38340Q', 'Heavy Duty Gravity Latch', 'NW38340Q', 'latch', ['Wood', 'Rail', 'Chain link', 'Aluminum'],
    { strikeBar: 0.48, bracketW: 1.7, bracketH: 3.6, plateT: 0.2, armLen: 8.5, armW: 1.1, armT: 0.25 }, 'black', WOOD_CAT, ['bracketW', 'bracketH', 'plateT', 'armLen', 'armW', 'armT'], { style: 'gravity' }),
  H('KLADV-P2-BK', 'Keystone Two-Sided Lockable Latch (nylon)', 'KLADV-P2-BK', 'latch', ['Vinyl'],
    { fitMinPostIn: 1.75, fitMaxPostIn: 5, bodyW: 2.5, bodyH: 4.4, bodyD: 1.4, keeperW: 1.6, keeperH: 2.2, keeperD: 0.9 }, 'glass-filled nylon, black', WOOD_CAT,
    ['bodyW', 'bodyH', 'bodyD', 'keeperW', 'keeperH', 'keeperD', 'body proportions taken from the published 2.5 x 5.5 in flange of the stainless NW38308NUA'], { style: 'keystone' }),
  H('MANTA-L-BK', 'Magnetic Latch (Manta)', 'MANTA-L-BK', 'latch', ['Aluminum', 'Vinyl'],
    { fitMinFrameIn: 1.5, fitMaxFrameIn: 5, bodyW: 1.7, bodyH: 4.6, bodyD: 1.25, strikerW: 1.8, strikerH: 1.1 }, 'glass-filled nylon, black', VINYL_CAT,
    ['bodyW', 'bodyH', 'bodyD', 'strikerW', 'strikerH'], { style: 'magnetic' }),
  // ---- drop rods
  ...[18, 24, 36, 48].map(ROD_HD), ...[24, 36, 48].map(ROD_COM),
  // ---- handles
  H('NW257-26Q', 'Standard Gate Handle 6 in', 'NW257-26Q', 'handle', ['Wood'],
    { lengthIn: 6, standoffIn: 1.25, footDia: 1.1, barDia: 0.62 }, 'zinc plate steel, black', WOOD_CAT, ['standoffIn', 'footDia', 'barDia'], { style: 'bar' }),
  H('NW38398Q', 'Standard Gate Handle 9 in', 'NW38398Q', 'handle', ['Wood'],
    { lengthIn: 9, standoffIn: 1.3, footDia: 1.1, barDia: 0.62 }, 'zinc plate steel, black', WOOD_CAT, ['standoffIn', 'footDia', 'barDia'], { style: 'bar' }),
  H('NW314S-BK', 'Nylon Gate Handle', 'NW314S-BK', 'handle', ['Vinyl'],
    { lengthIn: 5, depthIn: 0.75, barW: 0.7, legH: 0.7 }, 'glass-filled nylon, black', WOOD_CAT, ['barW', 'legH'], { style: 'nylon' }),
].map(e => [e.id, e]));

const ROD_LENGTHS = { hd: [18, 24, 36, 48], commercial: [24, 36, 48] };
/** The shortest published drop rod that reaches from a ground sleeve to the handle height, else the longest. Pure. */
export function dropRodIdFor(kind, neededIn) {
  const lens = ROD_LENGTHS[kind] || ROD_LENGTHS.hd, len = lens.find(l => l >= neededIn - 1e-6) || lens[lens.length - 1];
  return kind === 'commercial' ? `NW6270-${len}-BK` : `NW38305-${len}Q`;
}

// ---------------------------------------------------------------------------------------------------------------
// Decisions. The only spec keys read here are in the viewer's whitelist (gfs/viewer-model-contract.js `keys`):
// mode wood cedar railKind gStyle gLatch gDrop gHinges gGapIn gRiseIn h.
// ---------------------------------------------------------------------------------------------------------------
export const SPEC_KEYS_READ = ['mode', 'wood', 'cedar', 'railKind', 'gStyle', 'gLatch', 'gDrop', 'gHinges', 'gGapIn', 'gRiseIn', 'h', 'cPost', 'clFrameFinish'];

/** Finish of the gate hardware on a chain link style: 'galvanized' or 'coated' (black). V3-153 (owner, 15 Nov): galvanized
 *  chain link gets galvanized-coloured hinges, latch and drop rod; black chain link keeps black. Same reading as the viewer's
 *  _bpxChainFrameFinish: a saved clFrameFinish of coated or galvanized wins, any other value but auto/empty is galvanized,
 *  otherwise the post colour decides (black 1777188 and green 2906680 are vinyl coated). Pure. */
export function chainHardwareFinish(spec) {
  const s = spec || {};
  if (s.mode !== 'chain') return null;
  if (s.clFrameFinish === 'coated' || s.clFrameFinish === 'galvanized') return s.clFrameFinish;
  if (s.clFrameFinish != null && s.clFrameFinish !== '' && s.clFrameFinish !== 'auto') return 'galvanized';
  return s.cPost === 1777188 || s.cPost === 2906680 ? 'coated' : 'galvanized';
}

/** Which of the viewer's gate builders draws this style's gate. Mirrors buildGate's dispatch. Pure. */
export function gateBuilder(spec) {
  const s = spec || {}, m = s.mode;
  if (s.wood && m !== 'chain' && ((m !== 'split' && m !== 'ranch' && (s.gStyle || 'site') !== 'framed') || m === 'split' || m === 'ranch'))
    return (m === 'split' || m === 'ranch') ? 'wire' : 'wood';
  if (!s.wood && m !== 'chain' && m !== 'alu' && m !== 'split' && m !== 'ranch' && (s.gStyle || 'panel') !== 'framed') return 'vinyl';
  return 'generic';
}
/** Hinges per leaf, as the viewer counts them (fence3d.html): wire gates draw 2; otherwise gHinges clamped to
 *  2..4, else a tall gate gets 3. The height tests are buildWoodGate `gateHFt >= 5.5`, buildVinylGate `gh > 6.3`
 *  and buildGate `gh > 5`. gate.hFt is the gate body height in feet. Pure. */
export function hingeCountFor(spec, gate) {
  const s = spec || {}, b = gateBuilder(s);
  if (b === 'wire') return 2;
  if (s.gHinges != null && s.gHinges !== '' && Number.isFinite(+s.gHinges)) return Math.max(2, Math.min(4, Math.round(+s.gHinges)));
  const g = gate || {}, h = Number.isFinite(g.hFt) ? g.hFt : (Number.isFinite(+s.h) && +s.h > 0 ? +s.h : 6) + (+s.gRiseIn || 0) / 12;
  if (b === 'wood') return h >= 5.5 ? 3 : 2;
  if (b === 'vinyl') return h > 6.3 ? 3 : 2;
  return h > 5 ? 3 : 2;
}
const autoOn = (v, auto) => (v === '1' || v === 1 || v === true) ? true : (v === '0' || v === 0 || v === false) ? false : !!auto;

/** Catalog hardware for one gate of one style. gate = { ft (opening), double, hFt (body height), roundRails }.
 *  Returns ids; dropRod is the family's id at the length a 4 ft rod would need (the kit swaps the length it needs).
 *  Pure. */
export function hardwareFor(spec, gate) {
  const s = spec || {}, g = gate || {}, builder = gateBuilder(s), double = !!g.double;
  const hFt = Number.isFinite(g.hFt) ? g.hFt : (Number.isFinite(+s.h) && +s.h > 0 ? +s.h : 6);
  const tall = hFt >= 5.5, leafFt = (Number.isFinite(g.ft) ? g.ft : double ? 10 : 4) / (double ? 2 : 1);
  const hingeCount = hingeCountFor(s, { hFt });
  let hinge, latch, handle = null, rodKind = 'hd';
  if (s.mode === 'chain') { hinge = 'HDBY'; latch = 'NW38340Q'; rodKind = 'commercial'; }
  else if (s.mode === 'alu') { hinge = 'NW093A'; latch = 'MANTA-L-BK'; rodKind = 'commercial'; }
  else if (builder === 'wire') {
    const round = g.roundRails != null ? !!g.roundRails : (s.railKind === 'round' || (s.railKind !== 'sawn' && !!s.cedar));
    hinge = s.mode === 'split' && round ? 'RUSH116-BK' : 'NW38935Q'; latch = 'NW38204Q';
  }
  else if (builder === 'vinyl') { hinge = 'NW171NASC-SSB'; latch = 'KLADV-P2-BK'; handle = 'NW314S-BK'; }
  else if (!s.wood) { hinge = 'NW171NASC-SSB'; latch = 'NW38204Q'; }                 // vinyl ranch / framed vinyl
  else {                                                                              // boarded or framed wood
    const heavy = s.gStyle === 'steel' || tall || double || leafFt > 4;
    hinge = heavy ? 'NW38937HDQ' : 'NW38937Q'; latch = tall ? 'NW38340Q' : 'NW38204Q'; handle = hFt >= 6 ? 'NW38398Q' : 'NW257-26Q';
  }
  // The one existing select that names a latch: gLatch ('', 'gravity', 'magna', 'fork').
  if (s.gLatch === 'gravity') latch = tall ? 'NW38340Q' : 'NW38204Q';
  else if (s.gLatch === 'fork') latch = 'NW38340Q';              // no fork latch in the published NWI list: closest published latch
  else if (s.gLatch === 'magna') latch = 'MANTA-L-BK';
  const rod = double && autoOn(s.gDrop, true) ? dropRodIdFor(rodKind, Math.min(48, Math.max(18, hFt * 12 * 0.62))) : null;
  return { hinge, latch, dropRod: rod, handle, hingeCount };
}

const KIND_FIELD = { ghinge: 'hinge', glatch: 'latch', gdrop: 'dropRod', ghandle: 'handle' };
export const HW_KINDS = new Set(Object.keys(KIND_FIELD));

// The two run helpers are site-kit's own: a gate part belongs to its own run, never decided scene-wide.
import { runForPart, distToRun, followFence } from './site-kit.mjs';
export { runForPart, distToRun };

/** Which placeholder meshes become which hardware. candidates = [{ ref, part:{kind,index,gate,run?}, kind, x, z,
 *  size:[x,y,z], gate?:{ft,double,hFt,roundRails} }] (x,z FENCE-LOCAL ft, the frame of the runs' pts: world position through the inverse of fenceGroup.matrixWorld). Only parts whose own run resolves and whose style has
 *  that kind of hardware are returned; everything else is left alone. Pure. */
export function planHardware(candidates, runs, specForRun) {
  const out = [], cache = new Map();
  for (const c of candidates || []) {
    const part = c.part || {}, kind = c.kind || part.kind;
    if (!HW_KINDS.has(kind) || part.gate === false) continue;
    const run = runForPart(runs, part, c.x, c.z); if (!run) continue;
    let spec; try { spec = specForRun(run) } catch (_) { continue } if (!spec) continue;
    const g = c.gate || {}, key = run.i + '|' + (g.double ? 'd' : 's') + '|' + g.ft + '|' + g.hFt + '|' + g.roundRails;
    if (!cache.has(key)) cache.set(key, hardwareFor(spec, g));
    const id = cache.get(key)[KIND_FIELD[kind]];
    if (!id) continue;
    out.push({ ref: c.ref, kind, hardwareId: id, run: run.i });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Mounting points from placeholder clusters. Pure: meshes are { type, vertical, host:'root'|'leaf', box:{min:[x,y,z],max:[x,y,z]} }
// in gate-local ("closed") feet, x along the run away from the hinge post for dir = +1.
// ---------------------------------------------------------------------------------------------------------------
const ctr = b => [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
/** The mesh that carries a hinge pin / drop rod / handle grip: the tallest straight-up cylinder. Pure. */
export function axisMesh(meshes) {
  let best = null;
  for (const m of meshes || []) if (m.vertical && m.type === 'CylinderGeometry' && (!best || m.box.max[1] - m.box.min[1] > best.box.max[1] - best.box.min[1])) best = m;
  return best;
}
/** +1 when the mesh sits on the +z side of the gate body, -1 on the -z side, else the fallback. Pure. */
export function leafSide(z, bodyCenterZ, fallback = 1) { const d = z - bodyCenterZ; return Math.abs(d) < 0.004 ? fallback : d > 0 ? 1 : -1 }
/** Which way the gate body lies from the hinge pin. Pure. */
export function gateDirection(bodyCenterX, pinX, fallback = 1) { const d = bodyCenterX - pinX; return Math.abs(d) < 1e-4 ? fallback : d > 0 ? 1 : -1 }
/** The face plane (z, gate-local) a cluster's plates sit on: the plate-like boxes (thinner than maxThickIn) of the
 *  given host, nearest the gate body on side zs. Null when it has none. Pure. */
export function mountPlane(meshes, host, zs, maxThickIn = 1) {
  let plane = null;
  for (const m of meshes || []) {
    if (m.host !== host || !(m.type === 'BoxGeometry' || m.type === 'ExtrudeGeometry')) continue;
    const th = m.box.max[2] - m.box.min[2], w = m.box.max[0] - m.box.min[0];
    if (th > maxThickIn * IN + 1e-6 || w < 0.9 * IN) continue;
    const inner = zs > 0 ? m.box.min[2] : m.box.max[2];
    if (plane == null || (zs > 0 ? inner < plane : inner > plane)) plane = inner;
  }
  return plane;
}
/** Innermost face over every mesh of a cluster on side zs (handles and rods stand off their face). Pure. */
export function innerFace(meshes, zs) {
  let p = null;
  for (const m of meshes || []) { const v = zs > 0 ? m.box.min[2] : m.box.max[2]; if (p == null || (zs > 0 ? v < p : v > p)) p = v }
  return p;
}
/** Orientation of a canonical part (x toward the gate body, z out of its face, y up) for a gate that has the body
 *  toward `dir` and the hardware on side `zs`. A pure rotation about Y when dir*zs = +1; otherwise the part is built
 *  mirrored. Returns { mirror, rotY }. Pure. */
export function orientFor(dir, zs) {
  if (dir * zs > 0) return { mirror: false, rotY: dir > 0 ? 0 : Math.PI };
  return { mirror: true, rotY: dir < 0 ? 0 : Math.PI };
}

// ---------------------------------------------------------------------------------------------------------------
// Geometry. Built in inches in a canonical frame, merged per material, scaled to feet. Cached per catalog id.
//  Hinge  : pin axis at the origin, +x toward the gate body, +z out of the face, plates' back at z = -standoff.
//  Latch  : origin at the gate's free edge, +x toward the post / other leaf, plates' back at z = 0, y = 0 latch height.
//  Rod    : axis at the origin, y = 0 at the tip, +z the way the handle bends.   Handle: origin at the back plane.
// ---------------------------------------------------------------------------------------------------------------
class Acc {
  constructor(T) { this.T = T; this.by = { steel: [], stainless: [], polymer: [] }; this.m = new T.Matrix4(); this.q = new T.Quaternion(); this.e = new T.Euler(); this.p = new T.Vector3(); this.s = new T.Vector3(1, 1, 1) }
  add(mat, geo, t = {}) {
    this.e.set(t.rx || 0, t.ry || 0, t.rz || 0); this.q.setFromEuler(this.e); this.p.set(t.x || 0, t.y || 0, t.z || 0);
    this.m.compose(this.p, this.q, this.s); geo.applyMatrix4(this.m); this.by[mat].push(geo.index ? geo.toNonIndexed() : geo); if (geo.index) geo.dispose(); return this;
  }
  /** { steel, stainless, polymer } -> BufferGeometry in feet (null when empty) */
  build() {
    const T = this.T, out = {};
    for (const [mat, list] of Object.entries(this.by)) {
      if (!list.length) { out[mat] = null; continue }
      let n = 0; list.forEach(g => n += g.attributes.position.count);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
      for (const g of list) { g.computeVertexNormals && !g.attributes.normal && g.computeVertexNormals(); const P = g.attributes.position.array, N = g.attributes.normal.array; for (let i = 0; i < P.length; i++) { pos[o + i] = P[i] * IN; nor[o + i] = N[i] } o += P.length; g.dispose() }
      const bg = new T.BufferGeometry(); // Float32BufferAttribute copies into the viewer realm's own Float32Array (a page-realm typed array fails its instanceof checks)
      bg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); bg.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); bg.computeBoundingBox(); bg.computeBoundingSphere(); out[mat] = bg;
    }
    return out;
  }
}
/** Mirror in x with the winding turned back so faces still face out. */
function mirrorX(T, geo) {
  const g = geo.clone(), P = g.attributes.position.array, N = g.attributes.normal.array;
  for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i] }
  for (let i = 0; i < P.length; i += 9) for (let k = 0; k < 3; k++) { const a = P[i + 3 + k], b = N[i + 3 + k]; P[i + 3 + k] = P[i + 6 + k]; N[i + 3 + k] = N[i + 6 + k]; P[i + 6 + k] = a; N[i + 6 + k] = b }
  g.attributes.position.needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
const triCount = geos => Object.values(geos).reduce((n, g) => n + (g ? g.attributes.position.count / 3 : 0), 0);

function roundRect(T, w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/** Plate with rounded corners and screw holes, extruded +z from its back (z = 0..t). */
function plate(T, w, h, t, r, holes = [], hr = 0.1) {
  const s = roundRect(T, w, h, r);
  for (const [hx, hy] of holes) { const p = new T.Path(); p.absarc(hx, hy, hr, 0, Math.PI * 2, true); s.holes.push(p) }
  return new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 3 });
}
/** Strap along +x from x = 0, tapering from w0 to w1 with a rounded tip. */
function strap(T, len, w0, w1, t, holes = [], hr = 0.09) {
  const s = new T.Shape(); s.moveTo(0, -w0 / 2); s.lineTo(len - w1 / 2, -w1 / 2); s.absarc(len - w1 / 2, 0, w1 / 2, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, w0 / 2); s.closePath();
  for (const [hx, hy] of holes) { const p = new T.Path(); p.absarc(hx, hy, hr, 0, Math.PI * 2, true); s.holes.push(p) }
  return new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 4 });
}
const cyl = (T, r, h, seg = 12, r2) => new T.CylinderGeometry(r, r2 == null ? r : r2, h, seg, 1);
const R90 = Math.PI / 2;
/** Round screw head on a plate: axis +z, at (x,y) on plane z. */
function screw(T, A, x, y, z, r = 0.17) { A.add('stainless', cyl(T, r, 0.07, 8), { x, y, z: z + 0.035, rx: R90 }) }

function buildHinge(T, e, v = []) {
  const d = e.dims, post = new Acc(T), gate = new Acc(T);
  if (e.style === 'tee') {
    const R = d.barrelDia / 2, s = R, t = d.strapT, Hb = d.barrelLen, kh = (Hb - 0.08) / 3;
    const pw = d.postPlateW, ph = d.postPlateH, L = d.strapLen;
    const hl = [[pw / 2 - 0.7, ph / 2 - 0.75], [-pw / 2 + 0.7, ph / 2 - 0.75], [pw / 2 - 0.7, -ph / 2 + 0.75], [-pw / 2 + 0.7, -ph / 2 + 0.75]], pcx = -pw / 2 - 0.15;
    post.add('steel', plate(T, pw, ph, t, 0.3, hl, 0.1), { x: pcx, z: -s });
    for (const [hx, hy] of hl) screw(T, post, pcx + hx, hy, -s + t);
    if (e.selfClosing) {                                                         // spring housing body, the strap rides a collar
      post.add('steel', cyl(T, R * 1.04, Hb, 14), { y: 0 });
      post.add('steel', cyl(T, R * 1.2, 0.18, 14), { y: Hb / 2 - 0.09 }); post.add('steel', cyl(T, R * 1.2, 0.18, 14), { y: -Hb / 2 + 0.09 });
      gate.add('steel', cyl(T, R * 1.12, 1.4, 14), { y: 0 });
    } else {
      post.add('steel', cyl(T, R, kh, 12), { y: Hb / 2 - kh / 2 }); post.add('steel', cyl(T, R, kh, 12), { y: -Hb / 2 + kh / 2 });
      gate.add('steel', cyl(T, R, kh, 12), { y: 0 });
    }
    post.add('stainless', cyl(T, R * 0.62, 0.14, 10), { y: Hb / 2 + 0.07 });
    gate.add('steel', strap(T, L, d.strapW, d.strapW * 0.7, t, [0.35, 0.62, 0.88].map(f => [L * f, 0]), 0.1), { x: 0, z: -s });
    for (const f of [0.35, 0.62, 0.88]) screw(T, gate, L * f, 0, -s + t);
    return { post, gate, s };
  }
  if (e.style === 'strap') {
    const R = d.pinDia / 2 + 0.03, s = R, t = d.strapT, Hb = d.barrelLen, kh = (Hb - 0.06) / 3, L = d.strapLen, Lp = d.postStrapLen;
    gate.add('steel', strap(T, L, d.strapW, d.strapW * 0.62, t, [0.3, 0.55, 0.8].map(f => [L * f, 0]), 0.11), { z: -s });
    // post strap runs toward -x: extrude it, flip it about y (x and z both flip), and put its back at z = -s again
    post.add('steel', strap(T, Lp, d.strapW, d.strapW * 0.8, t, [0.35, 0.72].map(f => [Lp * f, 0]), 0.11), { z: -s + t, ry: Math.PI });
    gate.add('steel', cyl(T, R, kh, 12), { y: 0 }); post.add('steel', cyl(T, R, kh, 12), { y: kh + 0.03 }); post.add('steel', cyl(T, R, kh, 12), { y: -kh - 0.03 });
    post.add('stainless', cyl(T, R * 0.6, 0.12, 8), { y: Hb / 2 + 0.06 });
    for (const f of [0.3, 0.55, 0.8]) gate.add('stainless', new T.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, R90), { x: L * f, y: 0, z: -s + t, rx: R90 });
    for (const f of [0.35, 0.72]) post.add('stainless', new T.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, R90), { x: -Lp * f, y: 0, z: -s + t, rx: R90 });
    return { post, gate, s };
  }
  if (e.style === 'flange') {                                                    // NW171NASC: two 3.5 in square flanges, barrel standing 1.25 in proud
    const fw = d.flangeW, fh = d.flangeH, t = d.flangeT, Rb = d.barrelDia / 2, s = d.depth - Rb;
    const holes = [[-fw / 2 + 0.55, fh / 2 - 0.55], [fw / 2 - 0.55, fh / 2 - 0.55], [-fw / 2 + 0.55, -fh / 2 + 0.55], [fw / 2 - 0.55, -fh / 2 + 0.55]];
    const gx = 0.55 + fw / 2, px = -(0.65 + fw / 2);
    gate.add('steel', plate(T, fw, fh, t, 0.3, holes, 0.1), { x: gx, z: -s }); post.add('steel', plate(T, fw, fh, t, 0.3, holes, 0.1), { x: px, z: -s });
    for (const [h0, A, cx] of [[0, gate, gx], [1, post, px]]) for (const [hx, hy] of holes) screw(T, A, cx + hx, hy, -s + t, 0.2);
    gate.add('steel', new T.BoxGeometry(1.2, fh * 0.62, 0.9), { x: 0.75, z: -s + 0.45 }); post.add('steel', new T.BoxGeometry(1.2, fh * 0.62, 0.9), { x: -0.75, z: -s + 0.45 });
    const bh = fh * 0.96;
    gate.add('steel', cyl(T, Rb, bh, 18), { y: 0 });
    gate.add('stainless', cyl(T, Rb * 0.55, 0.3, 12), { y: bh / 2 + 0.15 }); gate.add('stainless', cyl(T, Rb * 0.8, 0.12, 14), { y: bh / 2 + 0.02 });
    post.add('stainless', cyl(T, Rb * 0.5, 0.2, 10), { y: -bh / 2 - 0.1 });
    return { post, gate, s };
  }
  if (e.style === 'alu') {                                                       // NW093A: 1 in flanges clamped to the 2x2 post and the gate frame
    const Rb = d.barrelDia / 2, s = Rb, fw = d.flangeW * 1.3, fh = d.flangeH, t = d.flangeT * 2.4;
    gate.add('steel', new T.BoxGeometry(fw, fh, t), { x: Rb + fw / 2 - 0.1, z: -s + t / 2 }); post.add('steel', new T.BoxGeometry(fw, fh, t), { x: -(Rb + fw / 2 - 0.1), z: -s + t / 2 });
    gate.add('steel', cyl(T, Rb, d.barrelLen, 14), { y: 0 });
    gate.add('stainless', cyl(T, Rb * 0.5, 0.25, 10), { y: d.barrelLen / 2 + 0.12 }); gate.add('stainless', cyl(T, Rb * 1.05, 0.1, 14), { y: d.barrelLen / 2 - 0.05 });
    post.add('steel', cyl(T, Rb * 1.02, 0.5, 14), { y: -d.barrelLen / 2 + 0.25 });
    for (const sy of [-1, 1]) { screw(T, gate, Rb + fw / 2, sy * fh * 0.3, -s + t, 0.14); screw(T, post, -(Rb + fw / 2), sy * fh * 0.3, -s + t, 0.14) }
    return { post, gate, s };
  }
  if (e.style === 'butt') {                                                      // HDBY: sealed bearing barrel; straps welded to clamp bands on the two pipes
    const Hh = d.height, Rb = d.barrelDia / 2, t = d.leafT, [postRel, frameRel, postR, frameR] = v;
    gate.add('steel', cyl(T, Rb, Hh, 18), { y: 0 });
    post.add('stainless', cyl(T, Rb * 0.6, 0.22, 12), { y: Hh / 2 + 0.11 }); post.add('stainless', cyl(T, Rb * 0.45, 0.4, 10), { y: -Hh / 2 - 0.2 });
    for (const sy of [-1, 1]) {
      const y = sy * (Hh / 2 - 1.3), gl = Math.abs(frameRel) - Rb * 0.4, pl = Math.abs(postRel) - Rb * 0.4;
      gate.add('steel', new T.BoxGeometry(gl, 2, t), { x: (Rb * 0.4 + frameRel) / 2, y });
      gate.add('steel', new T.CylinderGeometry(frameR + 0.14, frameR + 0.14, 2.2, 18, 1, true), { x: frameRel, y });
      post.add('steel', new T.BoxGeometry(pl, 2, t), { x: (-Rb * 0.4 + postRel) / 2, y });
      post.add('steel', new T.CylinderGeometry(postR + 0.14, postR + 0.14, 2.2, 18, 1, true), { x: postRel, y });
    }
    return { post, gate, s: 0 };
  }
  throw new Error('no hinge style ' + e.style);
}

function buildLatch(T, e, gapIn, bracketX, strikeX) {
  const d = e.dims, gate = new Acc(T), post = new Acc(T), g = Math.max(0.25, gapIn);
  if (e.style === 'gravity') {
    const bw = d.bracketW, bh = d.bracketH, pt = d.plateT, bx = Number.isFinite(bracketX) ? -bracketX : -2.4;
    gate.add('steel', plate(T, bw, bh, pt, 0.22, [[0, bh / 2 - 0.65], [0, -bh / 2 + 0.65]], 0.1), { x: bx, z: 0 });
    screw(T, gate, bx, bh / 2 - 0.65, pt); screw(T, gate, bx, -bh / 2 + 0.65, pt);
    gate.add('stainless', cyl(T, 0.24, 0.5, 10), { x: bx, y: 0, z: pt + 0.25, rx: R90 });                   // pivot rivet
    const sx = g + (Number.isFinite(strikeX) ? strikeX : 1.7), x0 = bx - 0.7, x1 = sx + 1.4, aL = x1 - x0, az = pt + 0.5 + d.armT / 2;
    gate.add('steel', new T.BoxGeometry(aL, d.armW, d.armT), { x: (x0 + x1) / 2, y: 0, z: az });
    gate.add('steel', new T.BoxGeometry(0.28, d.armW * 1.5, d.armT), { x: x1 - 0.14, y: d.armW * 0.38, z: az });    // lift tab
    gate.add('stainless', cyl(T, 0.24, 0.1, 10), { x: bx, y: 0, z: az + d.armT / 2 + 0.05, rx: R90 });
                                                                                                               // post side: plate, seat bar (the strike bar) and an upper lip
    post.add('steel', plate(T, 1.5, 2.9, pt, 0.2, [[0, 0.95], [0, -0.95]], 0.09), { x: sx, z: 0 });
    screw(T, post, sx, 0.95, pt); screw(T, post, sx, -0.95, pt);
    const zEnd = az + d.armT / 2 + 0.35, by = -(d.armW / 2 + d.strikeBar / 2);
    post.add('steel', cyl(T, d.strikeBar / 2, zEnd - pt, 8), { x: sx, y: by, z: (zEnd + pt) / 2, rx: R90 });
    post.add('steel', new T.BoxGeometry(1.3, 0.24, zEnd - pt), { x: sx, y: d.armW / 2 + 0.12 + 0.02, z: (zEnd + pt) / 2 });
    return { gate, post };
  }
  if (e.style === 'keystone') {                                                  // body on the post, keeper + striker on the gate
    const bw = d.bodyW, bh = d.bodyH, bd = d.bodyD, bx = g + 0.15 + bw / 2;
    post.add('polymer', plate(T, bw, bh, bd, 0.4, [], 0.1), { x: bx, z: 0 });
    post.add('stainless', cyl(T, 0.42, 0.12, 14), { x: bx, y: -0.8, z: bd + 0.06, rx: R90 });
    post.add('polymer', new T.BoxGeometry(0.1, 0.34, 0.14), { x: bx, y: -0.8, z: bd + 0.14, rz: 0.5 });
    post.add('polymer', new T.BoxGeometry(bw * 0.72, 0.3, bd * 0.8), { x: bx, y: bh / 2 + 0.12, z: bd * 0.5 });                            // thumb lever
    post.add('stainless', cyl(T, 0.1, bw * 0.6, 8), { x: bx, y: bh / 2 + 0.1, z: bd * 0.5, rz: R90 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) screw(T, post, bx + sx * (bw / 2 - 0.4), sy * (bh / 2 - 0.45), bd, 0.14);
    const kw = d.keeperW, kh = d.keeperH, kd = d.keeperD;
    gate.add('polymer', plate(T, kw, kh, kd, 0.25, [], 0.1), { x: -kw / 2 - 0.12, z: 0 });
    gate.add('polymer', new T.BoxGeometry(0.5, 0.7, 0.14), { x: -kw / 2 - 0.12, y: 0, z: kd + 0.05 });
    gate.add('stainless', cyl(T, 0.2, g + 0.15 + 1.1, 10), { x: (g + 0.15 - 1.0) / 2 - 0.0, y: 0, z: kd * 0.55, rz: R90 });                      // striker pin across the gap
    for (const sy of [-1, 1]) screw(T, gate, -kw / 2 - 0.12, sy * (kh / 2 - 0.4), kd, 0.13);
    return { gate, post };
  }
  if (e.style === 'magnetic') {
    const bw = d.bodyW, bh = d.bodyH, bd = d.bodyD, bx = g + 0.15 + bw / 2;
    post.add('polymer', plate(T, bw, bh, bd, 0.35, [], 0.1), { x: bx, z: 0 });
    post.add('polymer', cyl(T, 0.36, 0.9, 12), { x: bx, y: bh / 2 + 0.45, z: bd * 0.5 });
    post.add('stainless', cyl(T, 0.42, 0.08, 12), { x: bx, y: bh / 2 + 0.04, z: bd * 0.5 });
    for (const sy of [-1, 1]) screw(T, post, bx, sy * (bh / 2 - 0.5), bd, 0.14);
    gate.add('polymer', new T.BoxGeometry(d.strikerW, d.strikerH, 0.55), { x: -d.strikerW / 2 - 0.1, z: 0.275 });
    gate.add('stainless', cyl(T, 0.28, 0.06, 10), { x: -d.strikerW / 2 - 0.1, y: 0, z: 0.58, rx: R90 });
    return { gate, post };
  }
  throw new Error('no latch style ' + e.style);
}

/** Drop rod on a gate face: rod with the bent handle, two guide brackets, and a ground sleeve at grade.
 *  Parts: leaf (rod + guides) in the gate leaf's frame, sleeve in the root's. y = 0 is the rod tip. */
function buildRod(T, e, standoffIn, tipBelowGradeIn) {
  const d = e.dims, r = d.diaIn / 2, L = d.lengthIn, leaf = new Acc(T), sleeve = new Acc(T), so = Math.max(0.35, standoffIn);
  leaf.add('steel', cyl(T, r, L, 10), { y: L / 2 });
  leaf.add('steel', cyl(T, r, 1.2, 10), { y: -0.0, x: 0 }); leaf.add('steel', cyl(T, r * 0.7, 0.5, 8), { y: -0.25 });                      // tip
  leaf.add('steel', new T.SphereGeometry(r, 8, 6), { y: L });
  leaf.add('steel', cyl(T, r, d.handleReachIn, 10), { y: L, z: d.handleReachIn / 2, rx: R90 });
  leaf.add('steel', new T.SphereGeometry(r * 1.15, 8, 6), { y: L, z: d.handleReachIn });
  const gys = [L * 0.2 + tipBelowGradeIn * 0, L * 0.74];
  for (const gy of gys) {
    const w = 1.3, h = 2.3, t = 0.12;
    leaf.add('steel', plate(T, w, h, t, 0.25, [[0, h / 2 - 0.5], [0, -h / 2 + 0.5]], 0.08), { y: gy, z: -so });
    leaf.add('steel', new T.BoxGeometry(0.55, 0.7, so + r + 0.1 - t), { y: gy, z: -so + t + (so + r + 0.1 - t) / 2 });
    leaf.add('steel', new T.TorusGeometry(r + 0.16, 0.15, 6, 12), { y: gy, rx: R90 });
    screw(T, leaf, 0, gy + h / 2 - 0.5, -so + t, 0.15); screw(T, leaf, 0, gy - h / 2 + 0.5, -so + t, 0.15);
  }
  leaf.add('stainless', cyl(T, r * 1.5, 0.45, 10), { y: L * 0.5 });                                                            // stop collar
  // ground sleeve: a ring at grade with the dark opening the rod drops into
  sleeve.add('steel', new T.TorusGeometry(r + 0.5, 0.2, 6, 14), { y: 0.0, rx: R90 });
  sleeve.add('polymer', cyl(T, r + 0.46, 0.04, 14), { y: -0.18 });
  return { leaf, sleeve };
}

function buildHandle(T, e) {
  const d = e.dims, A = new Acc(T);
  if (e.style === 'bar') {
    const L = d.lengthIn, so = d.standoffIn, rb = d.barDia / 2, legY = L / 2 - 0.65;
    for (const sy of [-1, 1]) {
      A.add('steel', cyl(T, d.footDia / 2, 0.14, 14), { y: sy * legY, z: 0.07, rx: R90 });
      A.add('steel', cyl(T, 0.26, so, 10), { y: sy * legY, z: so / 2, rx: R90 });
      A.add('stainless', cyl(T, 0.13, 0.06, 8), { y: sy * legY, z: 0.17, rx: R90 });
      A.add('steel', new T.SphereGeometry(rb, 8, 6), { y: sy * L / 2, z: so + rb * 0.6 });
    }
    A.add('steel', cyl(T, rb, L, 12), { y: 0, z: so + rb * 0.6 });
    return A;
  }
  const L = d.lengthIn, D = d.depthIn, bw = d.barW, lh = d.legH;                 // nylon D-pull
  A.add('polymer', new T.BoxGeometry(bw, L - 2 * lh + 0.2, D * 0.55), { z: D - D * 0.275 });
  for (const sy of [-1, 1]) { A.add('polymer', new T.BoxGeometry(bw, lh, D), { y: sy * (L / 2 - lh / 2), z: D / 2 }); A.add('polymer', new T.BoxGeometry(bw * 1.5, lh * 0.55, 0.1), { y: sy * (L / 2 - lh * 0.5), z: 0.05 }) }
  return A;
}

// ---------------------------------------------------------------------------------------------------------------
// The kit.
// ---------------------------------------------------------------------------------------------------------------
// V3-138: vinyl gates now leave the same 1 in as the wood gate (a gate's stated width is the clear opening); chain link keeps 1.5 in.
export const DEFAULTS = { hideStock: true, vinylGapIn: 1, chainGapIn: 1.5, defaultGapIn: 1, sleeveBelowGradeIn: 2.5 };
const HW_PART_KINDS = HW_KINDS;

export function createHardwareKit(viewer, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  let T = null, doc = null, group = null, mats = null, unsub = null, on = false, gen = 0;
  const geoCache = new Map(), undo = [];
  let last = emptyStats();
  function emptyStats() { return { hinges: 0, latches: 0, dropRods: 0, handles: 0, byId: {}, skipped: 0, triangles: 0, trianglesById: {} } }
  const restoreAll = () => { while (undo.length) { try { undo.pop()() } catch (_) { } } };
  const dropCaches = () => { geoCache.forEach(v => v.geos && Object.values(v.geos).forEach(m => Object.values(m).forEach(g => g && g.dispose && g.dispose()))); geoCache.clear(); mats = null };
  function clearGroup() { if (!group) return; group.traverse(o => { if (o.userData && o.userData.hwOwn && o.geometry) o.geometry.dispose() }); group.clear() }

  function materials() {
    if (mats && mats.T === T) return mats;
    mats = {
      T,
      steel: new T.MeshStandardMaterial({ color: 0x17181a, roughness: 0.5, metalness: 0.6 }),
      galvanized: new T.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.46, metalness: 0.7 }),   // the chain link post colour (10134701)
      stainless: new T.MeshStandardMaterial({ color: 0xc7ccd1, roughness: 0.3, metalness: 0.9 }),
      polymer: new T.MeshStandardMaterial({ color: 0x131415, roughness: 0.6, metalness: 0 }),
    };
    return mats;
  }
  // cached per catalog id (and the few variant parameters that change the shape); mirrored copies made on demand
  function parts(id, variant = '') {
    const key = id + '|' + variant; let c = geoCache.get(key);
    if (!c) {
      const e = HARDWARE[id]; let raw;
      if (e.type === 'hinge') raw = buildHinge(T, e, variant ? variant.split(',').map(Number) : []);
      else if (e.type === 'latch') { const [gp, bx, sx] = variant.split(',').map(Number); raw = buildLatch(T, e, gp || 1, bx, sx) }
      else if (e.type === 'dropRod') { const [so, tb] = variant.split(',').map(Number); raw = buildRod(T, e, so, tb) }
      else raw = { handle: buildHandle(T, e) };
      const geos = {}, tri = {}; let s = raw.s;
      for (const [name, A] of Object.entries(raw)) if (A instanceof Acc) { geos[name] = A.build(); tri[name] = triCount(geos[name]) }
      c = { geos, mirrored: {}, tris: Object.values(tri).reduce((a, b) => a + b, 0), s }; geoCache.set(key, c);
    }
    return c;
  }
  const geosOf = (c, name, mirror) => {
    if (!mirror) return c.geos[name];
    if (!c.mirrored[name]) { const o = {}; for (const [m, g] of Object.entries(c.geos[name])) o[m] = g ? mirrorX(T, g) : null; c.mirrored[name] = o }
    return c.mirrored[name];
  };

  const M4 = () => new T.Matrix4();
  // anchor is in gate-local (root) coordinates; a leaf-hosted part is moved into the leaf's own frame first
  function place(geos, G, host, anchor, dir, zs) {
    const o = orientFor(dir, zs), m = M4().makeRotationY(o.rotY), off = host === 'leaf' ? G.leafOff : { x: 0, y: 0, z: 0 };
    m.setPosition(anchor[0] - off.x, anchor[1] - off.y, anchor[2] - off.z); m.premultiply(host === 'leaf' ? G.leaf.matrixWorld : G.root.matrixWorld);
    const M = materials();
    const galv = chainHardwareFinish(G && G.spec) === 'galvanized';
    for (const [mat, g] of Object.entries(geos)) {
      if (!g) continue;
      const mesh = new T.Mesh(g, galv && mat === 'steel' ? M.galvanized : M[mat]); mesh.matrixAutoUpdate = false; mesh.matrix.copy(m); mesh.matrixWorldNeedsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true; mesh.userData.hw = true; group.add(mesh);
    }
  }

  async function build() {
    const my = ++gen, w = viewer.hooks(); if (!w || !on) return;
    const Tn = await viewer.three(); if (my !== gen || !on) return;
    const w2 = viewer.hooks(); if (!w2) return;
    // A new viewer document means every THREE object cached from the old one is dead.
    if (Tn !== T || w2.document !== doc) { restoreAll(); dropCaches(); group = null; undo.length = 0; T = Tn; doc = w2.document }
    restoreAll(); clearGroup();
    if (!group) { group = new T.Group(); group.name = 'gfsHardwareKit' }
    const sc = w2.__f3d.scene, fg = w2.__f3d.fenceGroup;
    if (group.parent !== sc) sc.add(group);
    followFence(w2, T, group);   // the viewer can slide and turn the whole fence; the hardware goes with it
    const stats = emptyStats(); last = stats;
    const specOf = name => { try { return w2.__f3dStyleSpec(name) || {} } catch (_) { return {} } };
    const runs = (() => { try { return w2.__f3dRuns() || [] } catch (_) { return [] } })();
    const curName = (() => { const sel = w2.document.querySelector('#styleRow select'); return sel ? sel.value : (w2.__f3d.spec || {}).style })();
    const runSpec = r => { try { return Object.assign({}, w2._specParse(r.styleName || curName) || {}, w2.GFSModelContract.runPatch(w2.__f3d.spec, r.styleName || curName, r.ri, r.sourceStyleName)) } catch (_) { return specOf(r.styleName || curName) } };
    const PAL = w2._bpxPAL || {};
    fg.updateWorldMatrix(true, true);
    const gates = analyze(T, fg);
    // The round-rail (cedar split rail) test uses the palette the viewer itself uses, resolved per run.
    const roundByRun = new Map(runs.map(r => { const sp = runSpec(r); return [r.i, sp.railKind === 'round' || (sp.railKind !== 'sawn' && (!!sp.cedar || (PAL.cedar != null && sp.cPanel === PAL.cedar) || (PAL.cedartone != null && sp.cPanel === PAL.cedartone)))] }));
    const cands = [];
    for (const G of gates.values()) for (const c of G.cands) { const run = runForPart(runs, c.part, c.x, c.z); c.gate = { ...G.descr, roundRails: run ? roundByRun.get(run.i) : undefined }; cands.push(c) }
    const plan = planHardware(cands, runs, runSpec), byRef = new Map(plan.map(p => [p.ref, p]));
    for (const G of gates.values()) {
      G.planned = G.cands.filter(c => byRef.has(c.ref)); G.idOf = k => { const c = G.planned.find(x => x.kind === k); return c ? byRef.get(c.ref).hardwareId : null };
      stats.skipped += G.cands.length - G.planned.length;
      const c0 = G.cands[0], run = c0 && runForPart(runs, c0.part, c0.x, c0.z); G.spec = run ? runSpec(run) : {}; G.builder = gateBuilder(G.spec);
    }
    stats.gates = [...gates.values()].map(G => ({ dir: G.dir, double: G.descr.double, ft: +G.descr.ft.toFixed(2), hFt: +G.descr.hFt.toFixed(2), builder: G.builder, planned: G.planned.length, free: G.freeW.toArray().map(v => +v.toFixed(3)), body: G.body.min.concat(G.body.max).map(v => +v.toFixed(3)) }));
    const count = (kind, id) => { const f = { hinge: 'hinges', latch: 'latches', dropRod: 'dropRods', handle: 'handles' }[kind]; stats[f]++; stats.byId[id] = (stats.byId[id] || 0) + 1 };
    const tri = (id, c) => { stats.triangles += c.tris; stats.trianglesById[id] = Math.max(stats.trianglesById[id] || 0, c.tris) };

    for (const G of gates.values()) {
      if (!G.planned.length) continue;
      const dir = G.dir;
      // ---- hinges
      const hIdx = new Map(); G.planned.filter(c => c.kind === 'ghinge').forEach(c => { const k = c.part.index || 0; (hIdx.get(k) || hIdx.set(k, []).get(k)).push(c) });
      const hid = G.idOf('ghinge');
      if (hid) for (const cl of hIdx.values()) {
        const pin = axisMesh(cl.map(c => c.m)), bb = unionBox(cl.map(c => c.m.box)), cc = ctr(bb);
        const px = pin ? ctr(pin.box)[0] : cc[0], pz = pin ? ctr(pin.box)[2] : cc[2];
        const zs = leafSide(pz, G.centerZ, G.zsDefault), e = HARDWARE[hid];
        let hv = '';
        if (e.style === 'butt') {                                    // chain link: the straps clamp to the two pipes, so their offsets are needed
          const edge = dir > 0 ? G.body.min[0] : G.body.max[0], frameR = 0.81, postR = ((+G.spec.clGateIn > 0 ? +G.spec.clGateIn : (G.descr.double || G.descr.ft > 6 ? 2.875 : 2.375))) / 2;
          hv = [-(px * dir) / IN, ((edge + dir * frameR * IN) - px) * dir / IN, postR, frameR].map(n => n.toFixed(2)).join(',');
        }
        const c = parts(hid, hv);
        const gp = mountPlane(cl.map(c2 => c2.m), 'leaf', zs), pp = mountPlane(cl.map(c2 => c2.m), 'root', zs);
        const face = zs > 0 ? G.body.max[2] : G.body.min[2];
        const s = c.s || 0, zOf = (plane, fallback) => (s === 0 ? pz : (plane != null ? plane : fallback) + zs * s);
        const zg = zOf(gp, face), zp = zOf(pp != null ? pp : gp, face);
        place(geosOf(c, 'gate', orientFor(dir, zs).mirror), G, 'leaf', [px, cc[1], zg], dir, zs);
        place(geosOf(c, 'post', orientFor(dir, zs).mirror), G, 'root', [px, cc[1], zp], dir, zs);
        count('hinge', hid); tri(hid, c);
      }
      // ---- handles
      const hdid = G.idOf('ghandle');
      if (hdid) {
        const hm = new Map(); G.planned.filter(c => c.kind === 'ghandle').forEach(c => { const k = c.part.index || 0; (hm.get(k) || hm.set(k, []).get(k)).push(c) });
        for (const cl of hm.values()) {
          const grip = axisMesh(cl.map(c => c.m)); if (!grip) continue;
          const gc = ctr(grip.box), zs = leafSide(gc[2], G.centerZ, 1), plane = innerFace(cl.map(c => c.m), zs), c = parts(hdid);
          place(geosOf(c, 'handle', orientFor(dir, zs).mirror), G, 'leaf', [gc[0], gc[1], plane], dir, zs);
          count('handle', hdid); tri(hdid, c);
        }
      }
      // ---- drop rod
      const rid0 = G.idOf('gdrop');
      if (rid0) {
        const cl = G.planned.filter(c => c.kind === 'gdrop'), rod = axisMesh(cl.map(c => c.m));
        if (rod) {
          const rc = ctr(rod.box), zs = leafSide(rc[2], G.centerZ, 1), top = rod.box.max[1];
          const kind = HARDWARE[rid0].families.includes('Chain link') ? 'commercial' : 'hd', tipIn = cfg.sleeveBelowGradeIn;
          const rid = dropRodIdFor(kind, top / IN + tipIn), plane = mountPlane(cl.map(c => c.m), 'leaf', zs);
          const so = Math.min(3, Math.max(0.5, plane != null ? Math.abs(rc[2] - plane) / IN : 0.8)), c = parts(rid, so.toFixed(2) + ',' + tipIn);
          const o = orientFor(dir, zs).mirror;
          place(geosOf(c, 'leaf', o), G, 'leaf', [rc[0], -tipIn * IN, rc[2]], dir, zs);
          place(geosOf(c, 'sleeve', o), G, 'root', [rc[0], 0, rc[2]], dir, zs);
          count('dropRod', rid); tri(rid, c);
        }
      }
    }
    // ---- latches: one per gate (single) or per pair (double: body on the active leaf, strike on the other)
    const done = new Set();
    for (const G of gates.values()) {
      if (done.has(G)) continue; done.add(G);
      const mate = G.mate && gates.get(G.mate) || null; if (mate) done.add(mate);
      const pair = mate ? [G, mate] : [G];
      if (!pair.some(x => x.planned.some(c => c.kind === 'glatch'))) continue;
      // active leaf: the one that does not carry the drop rod; of two equals, the one hinged on the low side (dir = +1)
      let A = pair.find(x => x.dir > 0) || G; if (mate) { const withRod = pair.filter(x => x.cands.some(c => c.kind === 'gdrop')); if (withRod.length === 1) A = pair.find(x => x !== withRod[0]) }
      let B = mate ? pair.find(x => x !== A) : null;
      const lid = (A.idOf('glatch') || (B && B.idOf('glatch'))); if (!lid) continue;
      // Keystone and magnetic latches carry their body on the receiving side: that body goes on the active leaf, the keeper on the rod leaf.
      if (B && (HARDWARE[lid].style === 'keystone' || HARDWARE[lid].style === 'magnetic')) { const t = A; A = B; B = t }
      const lcl = pair.flatMap(x => x.planned.filter(c => c.kind === 'glatch')), body = lcl.filter(c => c.m.host === 'leaf').map(c => c.m), ys = (body.length ? body : lcl.map(c => c.m)).map(m => ctr(m.box)[1]);
      const ly = ys.reduce((a, b) => a + b, 0) / ys.length, dir = A.dir;
      const zs = leafSide(ctr(unionBox((body.length ? body : lcl.map(c => c.m)).map(m => m.box)))[2], A.centerZ, A.zsDefault);
      const gPlane = mountPlane(lcl.map(c => c.m), 'leaf', zs) ?? (zs > 0 ? A.body.max[2] : A.body.min[2]);
      let pPlane = B ? (mountPlane(B.cands.map(c => c.m), 'leaf', -zs) ?? gPlane) : (mountPlane(lcl.map(c => c.m), 'root', zs) ?? gPlane);
      if (!B && A.spec.mode === 'chain') pPlane = gPlane + zs * 0.36 * IN;                   // 2-3/8 in post vs 1.66 in gate frame: the round faces differ by their radii
      const gapIn = B ? A.freeW.distanceTo(B.freeW) / IN : (+A.spec.gGapIn > 0 ? +A.spec.gGapIn : A.builder === 'vinyl' ? cfg.vinylGapIn : A.spec.mode === 'chain' ? cfg.chainGapIn : cfg.defaultGapIn);
      const bx = A.spec.mode === 'chain' ? 0.9 : A.builder === 'wire' ? 1.2 : 2.4;           // where the gate-side bracket sits behind the free edge
      const c = parts(lid, (Math.round(gapIn * 8) / 8) + ',' + bx + ',' + (A.spec.mode === 'chain' ? 1.19 : 1.7)), o = orientFor(dir, zs).mirror;
      place(geosOf(c, 'gate', o), A, 'leaf', [A.freeX, ly, gPlane], dir, zs);
      if (!B) place(geosOf(c, 'post', o), A, 'root', [A.freeX, ly, pPlane], dir, zs);
      else {  // the strike rides the other leaf: anchor the same canonical frame at A's free edge, in B's gate-local coordinates
        const wp = new T.Vector3(A.freeX, ly, pPlane).applyMatrix4(A.root.matrixWorld), lp = wp.applyMatrix4(new T.Matrix4().copy(B.root.matrixWorld).invert());
        place(geosOf(c, 'post', o), B, 'leaf', [lp.x, lp.y, lp.z], dir, zs);
      }
      count('latch', lid); tri(lid, c);
    }
    // hide the stock placeholders that were replaced; each one is put back by clear()
    for (const G of gates.values()) for (const c of G.planned) {
      const o = c.ref, was = o.visible; if (!was) continue;
      if (cfg.hideStock) { o.visible = false; undo.push(() => { o.visible = was }) }
    }
    try { const r = w2.__rend(); if (r.shadowMap) r.shadowMap.needsUpdate = true } catch (_) { }
    viewer.redraw && viewer.redraw();
  }

  const api = {
    async enable() { on = true; T = await viewer.three(); if (!unsub) unsub = viewer.onRebuild(() => setTimeout(() => { build().catch(e => console.warn('[hardware-kit]', e)) }, 60)); await build(); return api.state() },
    clear() { on = false; gen++; if (unsub) { unsub(); unsub = null } restoreAll(); clearGroup(); if (group && group.parent) group.parent.remove(group); viewer.redraw && viewer.redraw() },
    set(patch) { Object.assign(cfg, patch || {}); if (on) return build().then(() => api.state()); return api.state() },
    refresh() { return build() },
    state: () => ({ on, config: { ...cfg }, built: { ...last, byId: { ...last.byId } } }),
  };
  return api;
}

function unionBox(boxes) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], b.min[i]); mx[i] = Math.max(mx[i], b.max[i]) }
  return { min: mn, max: mx };
}

/** Finds every gate leaf that has hardware placeholders and what is needed to place hardware on it. */
function analyze(T, fg) {
  const gates = new Map(), box = new T.Box3(), v = new T.Vector3();
  const rootOf = o => {
    const chain = []; let a = o.parent; while (a && a !== fg) { chain.push(a); a = a.parent }
    for (let i = 0; i + 1 < chain.length; i++) if (chain[i + 1].children.some(c => c.isInstancedMesh)) return chain[i];
    return chain[Math.max(0, chain.length - 2)] || o.parent;
  };
  fg.traverse(o => {
    const part = o.userData && o.userData.parts && o.userData.parts[0];
    if (!o.isMesh || o.isInstancedMesh || !part || !part.gate || !HW_PART_KINDS.has(part.kind) || !o.geometry) return;
    const root = rootOf(o); if (!root) return;
    let G = gates.get(root); if (!G) { G = { root, cands: [] }; gates.set(root, G) }
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrix), host = o.parent === root ? 'root' : 'leaf';
    o.getWorldPosition(v); fg.worldToLocal(v);   // runs are fence-local; placement below uses matrixWorld, so it stays where the viewer drew the gate
    const m = { type: o.geometry.type, vertical: Math.abs(o.rotation.x) < 1e-6 && Math.abs(o.rotation.z) < 1e-6, host, box: { min: [b.min.x, b.min.y, b.min.z], max: [b.max.x, b.max.y, b.max.z] } };
    G.cands.push({ ref: o, part, kind: part.kind, x: v.x, z: v.z, size: [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z], m });
  });
  const isHW = o => { const p = o.userData && o.userData.parts && o.userData.parts[0]; return p && p.gate && HW_PART_KINDS.has(p.kind) };
  for (const G of gates.values()) {
    const root = G.root;
    // the leaf: the group under the root that holds the gate body (most mesh children)
    let leaf = root, best = root.children.filter(c => c.isMesh).length;
    root.traverse(o => { if (o !== root && o.type === 'Group') { const n = o.children.filter(c => c.isMesh).length; if (n > best) { best = n; leaf = o } } });
    G.leaf = leaf; leaf.updateWorldMatrix(true, true);
    // Gate-local ("closed") coordinates are the ROOT's. A leaf sits at the sum of the group positions between it and the
    // root when closed (wood: pivot and leaf cancel to 0; framed gates: the leaf is set in from the post by `ins0`).
    const off = new T.Vector3(); for (let a = leaf; a && a !== root; a = a.parent) off.add(a.position);
    G.leafOff = off;
    for (const c of G.cands) if (c.m.host === 'leaf') for (let i = 0; i < 3; i++) { c.m.box.min[i] += off.getComponent(i); c.m.box.max[i] += off.getComponent(i) }
    const inv = new T.Matrix4().copy(leaf.matrixWorld).invert(), bb = new T.Box3(); let any = false;
    leaf.traverse(o => {
      if (!o.isMesh || isHW(o) || !o.geometry || o.userData.hwOwn) return;
      const pk = o.userData && o.userData.parts && o.userData.parts[0]; if (pk && (pk.kind === 'gcap' || pk.kind === 'gspear')) return;      // pyramid caps and finials overhang the stile
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)); bb.union(b); any = true;
    });
    G.body = any ? { min: [bb.min.x + off.x, bb.min.y + off.y, bb.min.z + off.z], max: [bb.max.x + off.x, bb.max.y + off.y, bb.max.z + off.z] } : { min: [-2, 0, -.1], max: [2, 5, .1] };
    const bc = ctr(G.body); G.centerZ = bc[2];
    const hinge = G.cands.filter(c => c.kind === 'ghinge'), pin = axisMesh(hinge.map(c => c.m));
    const px = pin ? ctr(pin.box)[0] : (hinge.length ? ctr(unionBox(hinge.map(c => c.m.box)))[0] : 0), pz = pin ? ctr(pin.box)[2] : 0;
    G.dir = root.userData.gateLeafDirection || gateDirection(bc[0], px, 1);
    G.zsDefault = leafSide(pz, G.centerZ, 1);
    G.freeX = G.dir > 0 ? G.body.max[0] : G.body.min[0];
    G.freeW = new T.Vector3(G.freeX, 0, 0).applyMatrix4(G.root.matrixWorld);
    G.alongW = new T.Vector3(G.dir, 0, 0).transformDirection(root.matrixWorld);          // along the run, toward the free edge
  }
  // doubles: two leaves whose free edges face each other
  const list = [...gates.values()];
  for (const a of list) for (const b of list) {
    if (a === b || a.dir === b.dir) continue;
    const d = a.freeW.distanceTo(b.freeW);
    const facing = a.alongW.dot(b.freeW.clone().sub(a.freeW)) > -0.25;
    if (d < 3 && facing && (!a.mate || a.mate === b.root)) { a.mate = b.root; b.mate = a.root }
  }
  for (const G of list) {
    const leafW = G.body.max[0] - G.body.min[0];
    G.descr = { double: !!G.mate, ft: leafW * (G.mate ? 2 : 1) + 0.2, hFt: G.body.max[1] - G.body.min[1] };
  }
  return gates;
}
