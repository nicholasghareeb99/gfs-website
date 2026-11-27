// Fence Lab 3D: the stage every 3D Lab tool draws on.
//
// The fences are the Executive App's own models: ./vendor/exec/ is a byte-for-byte copy of the
// Executive App's built fence engine (see vendor/exec/SOURCE.json), so a post, rail or picket here
// is the same size and in the same place as in the app's 3D viewer. Wood, steel, concrete, soil and
// lawn use the app's own photoreal surfaces (real-surfaces.mjs).
//
// What is in the ground is drawn as a section: the yard is cut along a straight line through the
// post centres and we look at the cut face. Following the usual drafting rule, round and square
// stock (posts, pipe) is drawn whole and only the soil and the concrete are cut.
//
// Units are feet; x runs along the fence, y is up (0 = grade), +z is toward the viewer, and the cut
// face is the plane z = 0. Nothing is drawn until something changes (render on demand).
import * as THREE from '/gfs/vendor/three.module.js';
import { createFenceEngine } from './vendor/exec/fence-engine.mjs';
import { surfaceMaterial, textureSet } from './vendor/exec/real-surfaces.mjs';

export { THREE };
export const IN = 1 / 12;
let ENG = null;
export const engine = () => (ENG ||= createFenceEngine(THREE));
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
export const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

export { webglOK } from './lab3d-ok.mjs';

// ── materials ───────────────────────────────────────────────────
// Made once per page. Concrete, soil and steel come from the app's surface library; the cut face of
// the soil and the lawn can each have holes punched in them (a hole being dug, a footing).
let M = null;
const SECTION_HOLES = 6;
const skyMid = new THREE.Color(0xc9dcec);
function holeShader(m, key, lawn) {
  const u = { uHoles: { value: Array.from({ length: SECTION_HOLES }, () => new THREE.Vector4(0, 0, 0, 0)) } };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.uniforms.uHoles = u.uHoles;
    sh.vertexShader = 'varying vec3 vSecW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvSecW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    if (lawn) {
      sh.uniforms.uHaze = { value: skyMid };
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
        vec2 w = vSecW.xz;
        vec3 ta = texture2D(map, w / 3.0).rgb, tb = texture2D(map, mat2(0.8, -0.6, 0.6, 0.8) * w / 7.3 + 0.37).rgb;
        float k = smoothstep(0.3, 0.7, secN(w * 0.11));
        vec3 turf = mix(ta, tb, 0.35 + 0.3 * k);
        float big = secN(w * 0.018) * 0.55 + secN(w * 0.07 + 7.3) * 0.3 + secN(w * 0.33 + 2.1) * 0.15;
        float dry = smoothstep(0.62, 0.86, secN(w * 0.025 + 13.7));
        turf *= mix(vec3(0.9, 0.93, 0.86), vec3(1.06, 1.04, 0.96), big);
        turf = mix(turf, turf * vec3(1.22, 1.08, 0.78), dry * 0.45);
        diffuseColor.rgb *= turf;`).replace('#include <dithering_fragment>', `
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(70.0, 420.0, length(vSecW.xz - cameraPosition.xz)) * 0.85);
        #include <dithering_fragment>`);
      sh.fragmentShader = 'uniform vec3 uHaze;\nfloat secH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat secN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(secH(i),secH(i+vec2(1.0,0.0)),f.x),mix(secH(i+vec2(0.0,1.0)),secH(i+vec2(1.0,1.0)),f.x),f.y);}\n' + sh.fragmentShader;
    }
    const test = lawn
      // lawn: round holes (x, z, radius) behind the cut
      ? 'for (int i = 0; i < ' + SECTION_HOLES + '; i++) { vec4 h = uHoles[i]; if (h.w > 0.5 && distance(vSecW.xz, h.xy) < h.z) discard; }'
      // cut face: rectangles from x0 to x1, from grade down to y
      : 'for (int i = 0; i < ' + SECTION_HOLES + '; i++) { vec4 h = uHoles[i]; if (h.w > 0.5 && vSecW.x > h.x && vSecW.x < h.y && vSecW.y > h.z) discard; }';
    sh.fragmentShader = 'varying vec3 vSecW;\nuniform vec4 uHoles[' + SECTION_HOLES + '];\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + test);
  };
  m.customProgramCacheKey = () => 'gfsLabHoles-' + key;
  m.userData.holes = u.uHoles.value;
  return m;
}
export function mats() {
  if (M) return M;
  M = {};
  M.steel = surfaceMaterial(THREE, 'galv', 0xb8c5ce);
  M.concrete = surfaceMaterial(THREE, 'concrete', 0xa9a7a1);
  M.wetConcrete = surfaceMaterial(THREE, 'concrete', 0x6e6d69);
  M.topsoil = holeShader(surfaceMaterial(THREE, 'soil', 0x4d3a29), 'top', false);
  M.clay = holeShader(surfaceMaterial(THREE, 'soil', 0x7b6650), 'clay', false);
  // inside of a fresh hole: the same clay, in shade
  M.cavity = surfaceMaterial(THREE, 'soil', 0x4a3c2f); M.cavity.side = THREE.BackSide;
  M.cavityFloor = surfaceMaterial(THREE, 'soil', 0x3b3026);
  M.pile = surfaceMaterial(THREE, 'soil', 0x6e5843);
  M.clod = surfaceMaterial(THREE, 'soil', 0x5f4b39);
  const lawn = textureSet(THREE, 'lawn', 1024);
  const lm = lawn.map.clone(), lb = lawn.bumpMap.clone(); lm.needsUpdate = lb.needsUpdate = true;
  M.lawnMaps = [lm, lb];
  M.lawn = holeShader(new THREE.MeshStandardMaterial({ color: 0xffffff, map: lm, bumpMap: lb, bumpScale: .02, roughnessMap: lb, roughness: 1, metalness: 0, envMapIntensity: .3 }), 'lawn', true);
  M.bag = new THREE.MeshStandardMaterial({ map: bagTexture(), roughness: .92, metalness: 0 });
  M.tool = new THREE.MeshStandardMaterial({ color: 0xd8742c, roughness: .45, metalness: .25 });
  M.toolDark = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: .5, metalness: .55, envMapIntensity: .8 });
  M.line = new THREE.MeshBasicMaterial({ map: dashTexture(), transparent: true, depthWrite: false, toneMapped: false });
  M.tick = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75, depthWrite: false, toneMapped: false });
  return M;
}
function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// An 80 lb bag of concrete mix, printed plainly (no brand).
function bagTexture() {
  return canvasTexture(256, 192, (g, w, h) => {
    g.fillStyle = '#d9d3c4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9b2f24'; g.fillRect(0, h * .3, w, h * .34);
    g.fillStyle = '#f4efe4'; g.font = 'bold 44px Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('80 LB', w / 2, h * .56);
    g.fillStyle = '#5b5750'; g.font = 'bold 20px Helvetica, Arial, sans-serif'; g.fillText('CONCRETE MIX', w / 2, h * .85);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
}
function dashTexture() {
  const t = canvasTexture(64, 8, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, 0, w * .55, h); });
  t.wrapS = THREE.RepeatWrapping; return t;
}

// ── the stage ───────────────────────────────────────────────────
// host: an element to fill. views: [{ id, label }] — one camera each, drawn side by side on wide
// screens and stacked on phones, all turned together by the same finger.
export function createStage(host, { views = [{ id: 'main' }], soilDepth = 14, width = 400, back = 400 } = {}) {
  const mt = mats();
  const wrap = document.createElement('div'); wrap.className = 'l3d'; host.append(wrap);
  const cv = document.createElement('canvas'); cv.className = 'l3d-cv'; wrap.append(cv);
  const over = document.createElement('div'); over.className = 'l3d-over'; wrap.append(over);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.setScissorTest(true);
  const scene = new THREE.Scene();

  // Sky: a plain gradient (no sun disc, no clouds), also used to light metal and paint.
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x5d8fc8) }, mid: { value: skyMid }, bot: { value: new THREE.Color(0x3a3027) } },
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 v; void main(){ float y = v.y; vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.6)) : mix(mid, bot, clamp(-y * 6.0, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); sky.renderOrder = -1; sky.userData.noCheck = true; scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x4a5a33 })); g.position.y = -2; g.rotation.x = -Math.PI / 2; envScene.add(g); }
  const envRT = pmrem.fromScene(envScene, .04); scene.environment = envRT.texture; pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xdfeaf6, 0x6b5a45, .55));
  // Late-morning sun from the viewer's left and in front, so the cut face is lit.
  const sun = new THREE.DirectionalLight(0xfff2df, 2.7); sun.position.set(-22, 34, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 2;
  scene.add(sun, sun.target);

  // The yard: lawn behind the cut, and the cut face (topsoil over clay) in front.
  const lawnGeo = new THREE.PlaneGeometry(width, back); lawnGeo.rotateX(-Math.PI / 2); lawnGeo.translate(0, 0, -back / 2);
  const lawn = new THREE.Mesh(lawnGeo, mt.lawn); lawn.receiveShadow = true; lawn.name = 'lawn'; scene.add(lawn);
  for (const t of mt.lawnMaps) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(width / 3, back / 3); }
  const TOP = 8 * IN;   // topsoil
  const face = (h, y0, m, name) => { const g = new THREE.PlaneGeometry(width, h); g.translate(0, y0 - h / 2, 0); const f = new THREE.Mesh(g, m); f.receiveShadow = true; f.name = name; scene.add(f); return f; };
  face(TOP, 0, mt.topsoil, 'topsoil'); face(soilDepth - TOP, -TOP, mt.clay, 'clay');
  const root = new THREE.Group(); scene.add(root);

  // holes: { x0, x1, y } in the cut face, { x, z, r } in the lawn
  const faceHoles = [], lawnHoles = [];
  const syncHoles = () => {
    for (const [list, mats] of [[faceHoles, [mt.topsoil, mt.clay]], [lawnHoles, [mt.lawn]]]) for (const m of mats) m.userData.holes.forEach((v, i) => {
      const h = list[i]; if (!h || !h.on) v.set(0, 0, 0, 0); else if (list === faceHoles) v.set(h.x0, h.x1, h.y, 1); else v.set(h.x, h.z, h.r, 1);
    });
  };
  const hole = (x, r) => { const f = { x0: x - r, x1: x + r, y: 0, on: false }, l = { x, z: 0, r, on: false }; faceHoles.push(f); lawnHoles.push(l);
    if (faceHoles.length > SECTION_HOLES) throw Error('Too many holes for the cut face.');
    return { set(depth) { f.on = l.on = depth > 1e-4; f.y = -depth; syncHoles(); } }; };

  // ── cameras ──
  const V = views.map(v => ({ ...v, cam: new THREE.PerspectiveCamera(30, 1, .1, 2000), rect: { x: 0, y: 0, w: 1, h: 1 }, target: new THREE.Vector3(), base: { w: 16, h: 12 }, inset: { top: v.label ? 40 : 8, bottom: 8 }, tag: null }));
  const orbit = { yaw: 0, pitch: .13, zoom: 1, user: false };
  const HOME = { yaw: 0, pitch: .13, zoom: 1 };
  let stacked = false;
  const aim = new THREE.Vector3();
  const place = v => {
    const c = v.cam, w = v.rect.w, h = v.rect.h, aspect = w / h; c.aspect = aspect;
    // fit the framing box between the label at the top and the status line at the bottom
    const it = v.inset.top, ib = v.inset.bottom, usable = Math.max(.45, (h - it - ib) / h);
    const vf = THREE.MathUtils.degToRad(c.fov), t = Math.tan(vf / 2), fitH = v.base.h / usable / 2 / t, fitW = v.base.w / 2 / t / aspect;
    const d = Math.max(fitH, fitW) * 1.02 / orbit.zoom, ftPerPx = 2 * d * t / h;
    aim.set(v.target.x, v.target.y - (ib - it) / 2 * ftPerPx, v.target.z);
    c.position.set(aim.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * d, aim.y + Math.sin(orbit.pitch) * d, aim.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * d);
    c.lookAt(aim); c.updateProjectionMatrix();
  };
  const layout = () => {
    const W = wrap.clientWidth || 360, n = V.length;
    stacked = n > 1 && W < 700;
    const H = stacked ? Math.round(Math.min(W * 1.02, 430) * n) : Math.round(Math.min(n > 1 ? W / n * .95 : W * .62, 540));
    wrap.style.height = H + 'px'; renderer.setSize(W, H, false);
    V.forEach((v, i) => { v.rect = stacked ? { x: 0, y: Math.round(H / n * i), w: W, h: Math.round(H / n) } : { x: Math.round(W / n * i), y: 0, w: Math.round(W / n), h: H }; });
    V.forEach(v => { if (v.tag) Object.assign(v.tag.style, { left: v.rect.x + 'px', top: v.rect.y + 'px', width: v.rect.w + 'px', height: v.rect.h + 'px' }); });
    wrap.classList.toggle('stacked', stacked);
    dirty();
  };
  V.forEach(v => { const t = document.createElement('div'); t.className = 'l3d-view'; t.innerHTML = v.label ? `<span class="l3d-tag ${v.tone || ''}">${v.label}</span>` : ''; over.append(t); v.tag = t; });

  // ── render on demand ──
  let need = true, raf = 0, alive = true, onscreen = true;
  const ticks = new Set(), afters = new Set();
  function dirty() { need = true; kick(); }
  function kick() { if (!raf && alive && onscreen) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0; if (!alive) return;
    let more = false;
    for (const f of [...ticks]) if (f(now) === true) more = true; else ticks.delete(f);
    if (need || more) {
      const H = renderer.domElement.height / renderer.getPixelRatio();
      for (const v of V) {
        place(v); const r = v.rect, y = H - r.y - r.h;
        // each view gets its own tight shadow map, centred on what it looks at
        const s = Math.max(v.base.w, v.base.h) * .8;
        Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 160 }); sun.shadow.camera.updateProjectionMatrix();
        sun.target.position.set(v.target.x, 0, 0); sun.position.set(v.target.x - 22, 34, 30); sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
        renderer.shadowMap.needsUpdate = true;
        renderer.setViewport(r.x, y, r.w, r.h); renderer.setScissor(r.x, y, r.w, r.h);
        renderer.render(scene, v.cam);
      }
      need = false; for (const f of afters) f();
    }
    if (more) kick();
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
  const io = new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; if (onscreen) dirty(); }); io.observe(wrap);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); wrap.classList.add('lost'); });
  cv.addEventListener('webglcontextrestored', () => { wrap.classList.remove('lost'); dirty(); });

  // ── touch: one finger sideways turns, two fingers pinch to zoom or drag up/down to tilt; double tap resets ──
  cv.style.touchAction = 'pan-y';
  const pts = new Map(); let pinch = null, drag = null, lastTap = 0;
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), y: (a[1] + b[1]) / 2 }; };
  cv.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const t = two(); pinch = { ...t, zoom: orbit.zoom, pitch: orbit.pitch }; drag = null; }
    else if (pts.size === 1) {
      drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch, on: false, mouse: e.pointerType === 'mouse' };
      const now = performance.now(); if (now - lastTap < 320) reset(); lastTap = now;
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const t = two(); orbit.zoom = clamp(pinch.zoom * t.d / Math.max(30, pinch.d), .8, 4); orbit.pitch = clamp(pinch.pitch + (t.y - pinch.y) * .004, -.02, .6); orbit.user = true; dirty(); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on && (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2 || drag.mouse && Math.hypot(dx, dy) > 4)) { drag.on = true; try { cv.setPointerCapture(e.pointerId); } catch { } }
    if (drag.on) { orbit.yaw = clamp(drag.yaw - dx * .005, -.7, .7); if (drag.mouse) orbit.pitch = clamp(drag.pitch + dy * .004, -.02, .6); orbit.user = true; dirty(); }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); orbit.zoom = clamp(orbit.zoom * (1 - e.deltaY * .01), .8, 4); orbit.user = true; dirty(); }, { passive: false });
  function reset() { orbit.user = false; tweenOrbit(HOME, 650); }
  function tweenOrbit(to, ms) {
    const from = { ...orbit }, t0 = performance.now(), dur = reduce.matches ? 1 : ms;
    ticks.add(function f(now) { const k = ease(clamp((now - t0) / dur, 0, 1)); for (const key of ['yaw', 'pitch', 'zoom']) if (to[key] != null) orbit[key] = from[key] + (to[key] - from[key]) * k; need = true; return k < 1; }); kick();
  }
  // Smoothly move one camera's framing: { cx, cy, w, h } in feet.
  function frameView(id, { cx, cy, w, h }, ms = 0) {
    const v = V.find(x => x.id === id) || V[0];
    const from = { x: v.target.x, y: v.target.y, w: v.base.w, h: v.base.h }, to = { x: cx, y: cy, w, h };
    if (!ms || reduce.matches) { v.target.set(cx, cy, 0); v.base = { w, h }; dirty(); return; }
    const t0 = performance.now();
    ticks.add(function f(now) { const k = ease(clamp((now - t0) / ms, 0, 1)); v.target.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, 0); v.base = { w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k }; need = true; return k < 1; }); kick();
  }

  // ── labels pinned to points in the scene (HTML, so the text stays sharp) ──
  const pins = [];
  const vec = new THREE.Vector3();
  function placePins() {
    for (const p of pins) {
      const v = V.find(x => x.id === p.view) || V[0];
      if (!p.on) { p.el.style.opacity = 0; continue; }
      vec.copy(p.at).project(v.cam);
      const x = v.rect.x + (vec.x * .5 + .5) * v.rect.w, y = v.rect.y + (-vec.y * .5 + .5) * v.rect.h;
      const inside = vec.z < 1 && x > v.rect.x + 4 && x < v.rect.x + v.rect.w - 4 && y > v.rect.y + 4 && y < v.rect.y + v.rect.h - 4;
      p.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      p.el.style.opacity = inside ? 1 : 0;
      // keep the whole label inside its view; the pointer still points at the spot
      const sp = p.el.firstElementChild, half = sp.offsetWidth / 2, lo = v.rect.x + 6 + half, hi = v.rect.x + v.rect.w - 6 - half;
      const dx = p.edge === false ? 0 : (x < lo ? lo - x : x > hi ? hi - x : 0);
      sp.style.setProperty('--dx', dx.toFixed(1) + 'px');
    }
    // keep pins from sitting on top of each other: the later one gives way
    const shown = pins.filter(p => p.on && p.el.style.opacity === '1').map(p => ({ p, r: p.el.firstElementChild.getBoundingClientRect() }));
    for (let i = 0; i < shown.length; i++) for (let j = 0; j < i; j++) {
      const a = shown[i].r, b = shown[j].r;
      if (shown[j].p.el.style.opacity === '1' && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) { shown[i].p.el.style.opacity = 0; break; }
    }
  }
  afters.add(placePins);
  function pin(view, at, html, cls = '') {
    const el = document.createElement('div'); el.className = 'l3d-pin ' + cls; el.innerHTML = `<span>${html}</span>`; over.append(el);
    const p = { view, at: at.clone(), el, on: true }; pins.push(p);
    return { set(h) { el.firstElementChild.innerHTML = h; }, show(on) { if (p.on !== !!on) { p.on = !!on; need = true; kick(); } }, move(v) { p.at.copy(v); }, el };
  }

  layout();
  return {
    THREE, scene, root, renderer, sun, views: V, orbit, wrap, over,
    dirty, tick(f) { ticks.add(f); kick(); }, frameView, reset, hole, pin,
    get stacked() { return stacked; }, layout,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      scene.traverse(o => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); });
      envRT.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); wrap.remove();
    }
  };
}

// ── fences from the Executive App's models ──────────────────────
// Builds one straight run and returns its parts, each instance with its kind, its box and its matrix,
// so a tool can hide, reveal or move single posts, rails and pickets.
export function fence(name, x0, x1, { h = 6, z = 0, noDig } = {}) {
  const E = engine(), lib = new E.MatLib(), B = new E.FenceBuilder(lib);
  const spec = Object.assign({}, E.parse(name) || {}); if (noDig != null) spec.noDig = noDig;
  const run = { pts: [{ x: x0, y: 0, z }, { x: x1, y: 0, z }], spec, h, styleName: name, racked: true, gateOpen: 0, i: 0 };
  E.buildRun(B, run, { gateOpen: 0 });
  const group = B.flush(), parts = [];
  group.updateMatrixWorld(true);
  const m = new THREE.Matrix4();
  group.traverse(o => {
    if (!o.isInstancedMesh) return;
    o.castShadow = o.receiveShadow = true;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      const box = o.geometry.boundingBox.clone().applyMatrix4(m), part = o.userData.parts?.[i] || {};
      parts.push({ mesh: o, i, kind: part.kind, part, geo: o.geometry.type, base: m.clone(), box, cx: (box.min.x + box.max.x) / 2 });
    }
  });
  return { group, parts, spec, run, lib };
}
// Show each part at its own progress (0 hidden, 1 in place); `lift` drops it in from above by that many feet.
const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
export function reveal(parts, progress, lift = 0) {
  const touched = new Set();
  for (const p of parts) {
    const k = progress(p);
    if (k == null) continue;
    if (k <= 0) p.mesh.setMatrixAt(p.i, zero);
    else if (k >= 1 || !lift) p.mesh.setMatrixAt(p.i, p.base);
    else { p.base.decompose(tmpV, tmpQ, tmpS); tmpV.y += (1 - ease(k)) * lift; tmpM.compose(tmpV, tmpQ, tmpS); p.mesh.setMatrixAt(p.i, tmpM); }
    p.shown = k > 0; touched.add(p.mesh);
  }
  for (const m of touched) m.instanceMatrix.needsUpdate = true;
}

// ── what is in the ground ───────────────────────────────────────
// A square post (sizes in inches) carried down below grade, drawn whole.
export function squarePost(material, wIn, dIn, topIn, bottomIn) {
  const g = new THREE.BoxGeometry(wIn * IN, (topIn - bottomIn) * IN, dIn * IN); g.translate(0, (topIn + bottomIn) / 2 * IN, 0);
  const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true; return m;
}
// Schedule 40 pipe: outside diameter and wall in inches, length in inches from its bottom end.
export function pipe(odIn = 2.375, wallIn = .154, lenIn = 96) {
  const r = odIn / 2 * IN, ri = r - wallIn * IN, L = lenIn * IN, g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 32, 1, true), mats().steel); outer.position.y = L / 2;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, L, 32, 1, true), mats().steel); inner.material = mats().steel.clone(); inner.material.side = THREE.BackSide; inner.position.y = L / 2;
  const rim = new THREE.Mesh(new THREE.RingGeometry(ri, r, 32).rotateX(-Math.PI / 2), mats().steel); rim.position.y = L;
  const rim2 = rim.clone(); rim2.rotation.x = Math.PI; rim2.position.y = 0;
  for (const o of [outer, inner, rim, rim2]) { o.castShadow = true; o.receiveShadow = true; g.add(o); }
  g.userData = { r, L }; return g;
}
// A concrete footing in the cut face: the hole (diaIn across, depthIn deep; an auger hole is the
// bit's size all the way down) less a square post postWIn wide whose bottom is postBotIn down,
// filled from the bottom to `fill` (0–1).
export function footingCut(diaIn, depthIn, postWIn, postBotIn, material) {
  const R = diaIn / 2 * IN, D = depthIn * IN, a = postWIn / 2 * IN, pb = -postBotIn * IN;
  const geo = new THREE.BufferGeometry(), mesh = new THREE.Mesh(geo, material); mesh.receiveShadow = true; mesh.position.z = .004;
  mesh.userData.set = (fill, post = true) => {
    const top = -D + D * clamp(fill, 0, 1), rects = [];
    if (fill > 0) {
      if (!post || top <= pb) rects.push([-R, -D, R, top]);
      else rects.push([-R, -D, -a, top], [a, -D, R, top], [-a, -D, a, pb]);
    }
    const pos = [], uv = [], idx = [];
    for (const [x0, y0, x1, y1] of rects) { const k = pos.length / 3; pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0); uv.push(x0, y0, x1, y0, x1, y1, x0, y1); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 2 ? 1 : 0), 3)); geo.setIndex(idx);
    geo.computeBoundingBox(); geo.computeBoundingSphere(); mesh.visible = rects.length > 0;
  };
  mesh.userData.set(0); return mesh;
}
// The top of a finished footing at grade, behind the cut: a half disc less the post.
export function footingTop(diaIn, postWIn, postDIn, material) {
  // drawn in the x/y plane, then laid flat: shape y becomes world -z (behind the cut), facing up
  const R = diaIn / 2 * IN, a = postWIn / 2 * IN, b = postDIn / 2 * IN, s = new THREE.Shape();
  s.moveTo(R, 0); s.absarc(0, 0, R, 0, Math.PI, false);
  if (a > 0) { s.lineTo(-a, 0); s.lineTo(-a, b); s.lineTo(a, b); s.lineTo(a, 0); }
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 24); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material); m.position.y = .006; m.receiveShadow = true; return m;
}
// The back half of an open hole, seen through the cut face.
export function cavity(diaIn) {
  const r = diaIn / 2 * IN, g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 28, 1, true, Math.PI / 2, Math.PI), mats().cavity); wall.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 28, 0, Math.PI).rotateX(-Math.PI / 2), mats().cavityFloor);
  g.add(wall, floor);
  g.userData.set = depth => { g.visible = depth > 1e-3; wall.scale.y = Math.max(1e-3, depth); wall.position.y = -depth / 2; floor.position.y = -depth + .002; };
  g.userData.set(0); return g;
}
// Loose dirt heaped at its angle of repose (35° for loose moist clay). Volume in cu ft; seed varies the lumps.
export const REPOSE = 35 * Math.PI / 180;
export function pileSize(ft3) { const t = Math.tan(REPOSE), R = Math.cbrt(3 * ft3 / (Math.PI * t)); return { R, H: R * t }; }
export function pile(seed = 1) {
  const rnd = (k => () => (k = (k * 48271) % 2147483647) / 2147483647)(seed * 7919 + 17);
  // a unit cone (radius 1, height tan 35°) with a rounded top and lumpy sides; volume ≈ unit cone's
  const seg = 40, ring = 14, pos = [], idx = [], t = Math.tan(REPOSE);
  const bumps = Array.from({ length: 6 }, () => [rnd() * Math.PI * 2, .012 + rnd() * .018, 2 + Math.floor(rnd() * 4)]);
  for (let j = 0; j <= ring; j++) {
    const rr = 1 - j / ring;
    for (let i = 0; i < seg; i++) {
      const a = i / seg * Math.PI * 2;
      let k = 1; for (const [ph, amp, f] of bumps) k += Math.sin(a * f + ph) * amp * Math.sin(rr * Math.PI);
      const r = rr * k, y = j === 0 ? 0 : t * (1 - rr) * (1 - .18 * (1 - rr) ** 4) * (1 + (rnd() - .5) * .04 * Math.sin(rr * Math.PI));
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  pos.push(0, t * .82, 0); const apex = pos.length / 3 - 1;
  for (let j = 0; j < ring; j++) for (let i = 0; i < seg; i++) { const a = j * seg + i, b = j * seg + (i + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  for (let i = 0; i < seg; i++) idx.push(ring * seg + i, apex, ring * seg + (i + 1) % seg);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // the mound's own volume (its open base lies on y = 0, so it adds nothing) and its widest reach
  let vol = 0, rmax = 0, hmax = 0; const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) { A.fromArray(pos, idx[i] * 3); B.fromArray(pos, idx[i + 1] * 3); C.fromArray(pos, idx[i + 2] * 3); vol += A.dot(B.cross(C)) / 6; }
  for (let i = 0; i < pos.length; i += 3) { rmax = Math.max(rmax, Math.hypot(pos[i], pos[i + 2])); hmax = Math.max(hmax, pos[i + 1]); }
  vol = Math.abs(vol);
  const m = new THREE.Mesh(g, mats().pile); m.castShadow = m.receiveShadow = true;
  // scale so the mound holds exactly `ft3` cubic feet of loose dirt
  m.userData.setVolume = ft3 => { const k = Math.cbrt(Math.max(ft3, 1e-9) / vol); m.visible = ft3 > 1e-3; m.scale.setScalar(k); m.userData.R = rmax * k; m.userData.H = hmax * k; };
  m.userData.reach = ft3 => { const k = Math.cbrt(ft3 / vol); return { R: rmax * k, H: hmax * k }; };
  m.userData.setVolume(0); return m;
}
// Clods thrown out by an auger: plain ballistics (g = 32.2 ft/s²), worked out from time so the
// picture is the same whether it plays or is scrubbed.
export function clods(n) {
  const geo = new THREE.IcosahedronGeometry(.045, 0), im = new THREE.InstancedMesh(geo, mats().clod, n); im.castShadow = true; im.count = 0; im.frustumCulled = false;
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  im.userData.draw = list => {   // list: [{ p0, v, t, s, spin }] with t = seconds since thrown
    im.count = 0;
    for (const c of list) { if (c.t < 0 || c.t > c.T) continue; P.set(c.p0.x + c.v.x * c.t, c.p0.y + c.v.y * c.t - 16.1 * c.t * c.t, c.p0.z + c.v.z * c.t); E.set(c.spin * c.t, c.spin * .7 * c.t, 0); Q.setFromEuler(E); S.setScalar(c.s); M4.compose(P, Q, S); im.setMatrixAt(im.count++, M4); }
    im.instanceMatrix.needsUpdate = true;
  };
  return im;
}
// 80 lb bags of concrete mix (24 × 16 × 4.5 in), stacked three to a layer.
export function bagStack(n) {
  const g = new THREE.Group(), geo = new THREE.BoxGeometry(2, .375, 1.333, 12, 3, 8), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / 1, nz = pos.getZ(i) / .6665, e = Math.max(nx ** 4, nz ** 4);
    pos.setY(i, pos.getY(i) * (1 - .5 * e)); pos.setX(i, pos.getX(i) * (1 - .03 * nz ** 4)); pos.setZ(i, pos.getZ(i) * (1 - .04 * nx ** 4));
  }
  geo.computeVertexNormals();
  // brick pattern: three across, then two sitting on the joints
  const r = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(11);
  for (let i = 0, layer = 0, c = 0; i < n; i++) {
    const across = layer % 2 ? 2 : 3, m = new THREE.Mesh(geo, mats().bag);
    m.position.set((layer % 2) * .1 - .05, .17 + layer * .3, (c - (across - 1) / 2) * 1.34);
    m.rotation.y = (r() - .5) * .06; m.castShadow = m.receiveShadow = true; g.add(m);
    if (++c >= across) { c = 0; layer++; }
  }
  return g;
}
// A hydraulic auger: a 10 in bit (flight on a center shaft, 4 ft long) under its drive head.
export function auger(diaIn = 10) {
  const g = new THREE.Group(), R = diaIn / 2 * IN, L = 4, turns = 6, pts = [];
  for (let i = 0; i <= 240; i++) { const a = i / 240 * Math.PI * 2 * turns, y = -i / 240 * (L - .2); pts.push(new THREE.Vector3(Math.cos(a) * (R - .03), y - .1, Math.sin(a) * (R - .03))); }
  const spin = new THREE.Group();
  const flight = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, .03, 6), mats().toolDark);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, L + .2, 14), mats().toolDark); shaft.position.y = -L / 2 + .1;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.09, .3, 10), mats().toolDark); tip.rotation.x = Math.PI; tip.position.y = -L - .05;
  flight.userData.roundR = R; shaft.userData.roundR = .08; tip.userData.roundR = .09;
  spin.add(flight, shaft, tip);
  const head = new THREE.Mesh(new THREE.BoxGeometry(.75, .62, .62), mats().tool); head.position.y = .45;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .14, 18), mats().toolDark); cap.position.y = .83;
  g.add(spin, head, cap); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.spin = spin; g.userData.L = L; return g;
}
// A post driver sitting on a pipe: a heavy sleeve with two handles.
export function driver() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, 1.7, 22), mats().tool); body.position.y = .85;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.13, .19, .22, 22), mats().toolDark); top.position.y = 1.81;
  const grip = new THREE.Mesh(new THREE.TorusGeometry(.42, .035, 8, 28, Math.PI), mats().toolDark); grip.position.y = 1.05; grip.rotation.y = Math.PI / 2;
  g.add(body, top, grip); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
// A thin dashed line across the cut face (the frost line), and depth ticks.
export function dashLine(x0, x1, y) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, .035), mats().line.clone()); m.material.map = m.material.map.clone(); m.material.map.repeat.set((x1 - x0) / .5, 1); m.material.map.needsUpdate = true;
  m.position.set((x0 + x1) / 2, y, .008); m.renderOrder = 3; return m;
}
export function ticks(x, depthFt) {
  const g = new THREE.Group();
  for (let f = 0; f <= depthFt; f++) { const t = new THREE.Mesh(new THREE.PlaneGeometry(f ? .35 : .5, .03), mats().tick); t.position.set(x, -f, .008); t.renderOrder = 3; g.add(t); }
  const v = new THREE.Mesh(new THREE.PlaneGeometry(.03, depthFt), mats().tick); v.position.set(x - .16, -depthFt / 2, .008); v.renderOrder = 3; g.add(v);
  return g;
}

// ── checking the geometry ───────────────────────────────────────
// Every solid that is showing, as world boxes. Boards that touch are fine; a box that sinks into
// another by more than `tolIn` inches on all three axes is reported. Pass pairs that are meant to
// meet (a nail in a board, a post in its concrete) in `allow(a, b)`.
export function solids(root) {
  const out = [], m = new THREE.Matrix4(), b = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh || !o.visible || o.userData.noCheck) return;
    for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
    if (!o.geometry.attributes.position?.count) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, m); if (Math.abs(m.determinant()) < 1e-12) continue; m.premultiply(o.matrixWorld); } else m.copy(o.matrixWorld);
      b.copy(o.geometry.boundingBox).applyMatrix4(m);
      // a part that spins about its own upright axis (an auger bit) reaches only its radius, at any angle
      if (o.userData.roundR) { const c = new THREE.Vector3().setFromMatrixPosition(m), r = o.userData.roundR * m.getMaxScaleOnAxis(); b.min.x = c.x - r; b.max.x = c.x + r; b.min.z = c.z - r; b.max.z = c.z + r; }
      const s = b.getSize(new THREE.Vector3());
      out.push({ name: o.userData.what || o.name || (o.userData.parts?.[i]?.kind) || o.geometry.type, kind: o.userData.parts?.[i]?.kind || o.userData.what || '', unit: o.userData.unit || '', flat: Math.min(s.x, s.y, s.z) < 1e-4, min: b.min.clone(), max: b.max.clone() });
    }
  });
  return out;
}
export function overlaps(list, { tolIn = 1 / 32, allow = () => false } = {}) {
  const tol = tolIn * IN, bad = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (a.flat || b.flat) continue;
    const dx = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x), dy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y), dz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
    if (dx > tol && dy > tol && dz > tol && !allow(a, b) && !allow(b, a)) bad.push({ a: a.name, b: b.name, inches: [dx, dy, dz].map(v => +(v * 12).toFixed(3)), at: [a.min.x, a.min.y, a.min.z].map(v => +(v * 12).toFixed(2)) });
  }
  return bad;
}
