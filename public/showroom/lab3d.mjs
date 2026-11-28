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
import { modelOverrides } from '/gfs/website-model.mjs';
import { surfaceMaterial, textureSet, setAnisotropy } from './vendor/exec/real-surfaces.mjs';

export { THREE };
export const IN = 1 / 12;
// The engine reads a style the way the app and the website 3D viewer do: the name, then the settings
// saved for that style (live from the app when the Showroom has them, otherwise the website's copy).
const ENG = new Map();
export function engine(name, specs) {
  const ov = name ? modelOverrides(name, specs) : {}, key = JSON.stringify(ov);
  if (!ENG.has(key)) ENG.set(key, createFenceEngine(THREE, ov));
  return ENG.get(key);
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
export const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

export { webglOK } from './lab3d-ok.mjs';

// ── materials ───────────────────────────────────────────────────
// Made once per page: concrete, steel and dirt from the app's surface library. Each stage makes its
// own ground (below), whose cut face and lawn can have holes punched in them, freeze, and take snow.
let M = null;
const SECTION_HOLES = 6;
const skyMid = new THREE.Color(0xc9dcec);
const NOISE = 'float secH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat secN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(secH(i),secH(i+vec2(1.0,0.0)),f.x),mix(secH(i+vec2(0.0,1.0)),secH(i+vec2(1.0,1.0)),f.x),f.y);}\n';
function groundShader(m, lawn) {
  const u = { uHoles: { value: Array.from({ length: SECTION_HOLES }, () => new THREE.Vector4(0, 0, 0, 0)) }, uFrost: { value: new THREE.Vector3(0, 0, 0) }, uSnow: { value: 0 }, uHaze: { value: skyMid }, uBand: { value: new THREE.Vector2(0, 1) } };
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vSecW; varying vec2 vSecUv;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvSecW = (modelMatrix * vec4(transformed, 1.0)).xyz; vSecUv = uv;');
    let f = sh.fragmentShader;
    if (lawn) {
      f = f.replace('#include <map_fragment>', `
        vec2 w = vSecW.xz;
        vec3 ta = texture2D(map, w / 3.0).rgb, tb = texture2D(map, mat2(0.8, -0.6, 0.6, 0.8) * w / 7.3 + 0.37).rgb;
        float k = smoothstep(0.3, 0.7, secN(w * 0.11));
        vec3 turf = mix(ta, tb, 0.35 + 0.3 * k);
        float big = secN(w * 0.018) * 0.55 + secN(w * 0.07 + 7.3) * 0.3 + secN(w * 0.33 + 2.1) * 0.15;
        float dry = smoothstep(0.62, 0.86, secN(w * 0.025 + 13.7));
        turf *= mix(vec3(0.9, 0.93, 0.86), vec3(1.06, 1.04, 0.96), big);
        turf = mix(turf, turf * vec3(1.22, 1.08, 0.78), dry * 0.45);
        diffuseColor.rgb *= turf;
        if (uSnow > 0.0) { float sn = smoothstep(0.2, 0.8, uSnow + (secN(w * 0.8) - 0.5) * 0.45 + (secN(w * 3.1) - 0.5) * 0.15); vec3 snow = vec3(0.72, 0.76, 0.82) * (0.9 + 0.12 * secN(w * 6.0) + 0.06 * secN(w * 0.4)); diffuseColor.rgb = mix(diffuseColor.rgb, snow, sn); }`)
        .replace('#include <dithering_fragment>', `
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(70.0, 420.0, length(vSecW.xz - cameraPosition.xz)) * 0.85);
        #include <dithering_fragment>`);
    } else {
      // frozen soil: a little paler and bluer down to the freezing front; in wet clay, ice lenses
      // (thin seams of ice) form in bands, thickest just above the front
      // The soil picture repeats every couple of feet, which shows as a grid on a wide cut. Slow changes
      // in tone and faint level bands hide the repeat, the way a real
      // trench wall is never one even colour.
      f = f.replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 q = vSecW.xy;
          float big = secN(q * 0.23) * 0.5 + secN(q * 0.71 + 4.2) * 0.3 + secN(q * 2.3 + 9.1) * 0.2;
          diffuseColor.rgb *= mix(0.84, 1.15, big);
          diffuseColor.rgb *= mix(0.94, 1.05, secN(vec2(q.x * 0.12, q.y * 2.6 + 1.7)));
          diffuseColor.rgb *= mix(0.95, 1.04, secN(q * 5.3 + 1.1)); }
        // What a real cut through a lawn shows. dep is feet below the grass at this spot.
        { float dep = uBand.x + (1.0 - vSecUv.y) * uBand.y, px = fwidth(vSecW.x);
          // Grass roots: a mat of fine roots in the top few inches, and here and there a thicker root
          // going down as far as a foot. Each is a pale thread that wanders and thins out.
          for (int layer = 0; layer < 2; layer++) {
            float cell = layer == 0 ? 0.26 : 0.07, reach = layer == 0 ? 0.95 : 0.3, thick = layer == 0 ? 0.011 : 0.0045, share = layer == 0 ? 0.55 : 0.8;
            float gx = vSecW.x / cell, ix = floor(gx);
            for (int i = -1; i <= 1; i++) { float c = ix + float(i), h = secH(vec2(c, 3.7 + float(layer) * 11.0));
              if (h > share) continue;
              float len = reach * (0.3 + 0.7 * secH(vec2(c, 8.1))); if (dep > len) continue;
              float xr = (c + 0.15 + 0.7 * secH(vec2(c, 1.3))) * cell + (secN(vec2(c * 3.1, dep * 7.0)) - 0.5) * cell * 0.9 * (0.3 + dep / len);
              float t = thick * (1.0 - 0.85 * dep / len), tt = max(t, px * 0.8);
              float a = (1.0 - smoothstep(tt * 0.45, tt, abs(vSecW.x - xr))) * min(1.0, 1.4 * t / tt);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.6, 0.47, 0.32), a * 0.62); } }
          // Stones: a few rounded pebbles, one to three inches across, below the topsoil's first inches.
          vec2 g = vec2(vSecW.x, dep) * 2.4, id = floor(g), fr = fract(g);
          for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 o = vec2(float(i), float(j)), c = id + o;
            if (secH(c + 17.3) < 0.94) continue;
            vec2 ctr = o + 0.15 + 0.7 * vec2(secH(c + 3.1), secH(c + 9.7)), dv = (fr - ctr) / vec2(1.0 + 0.6 * secH(c + 1.9), 1.0);
            float rad = 0.1 + 0.2 * secH(c + 5.5), dd = length(dv) / rad, depC = (id.y + ctr.y) / 2.4;
            if (depC < 0.3) continue;
            float inside = 1.0 - smoothstep(0.82, 1.0, dd), lit = 0.82 + 0.3 * clamp(-dv.y / rad, -1.0, 1.0);
            vec3 tone = mix(vec3(0.34, 0.31, 0.28), vec3(0.52, 0.49, 0.43), secH(c + 7.7)) * (0.9 + 0.2 * secN(g * 6.0));
            diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.28 * smoothstep(1.35, 1.0, dd) * step(0.0, dv.y)), mix(tone, diffuseColor.rgb, 0.3) * lit, inside * 0.85); } }
        if (uFrost.y > uFrost.x && vSecW.y > -uFrost.y && vSecW.y < -uFrost.x) {
          float d = -vSecW.y, front = smoothstep(uFrost.y - 1.0, uFrost.y, d);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.84, 0.92, 1.1) + vec3(0.04, 0.05, 0.07), 0.65);
          float n = secN(vec2(vSecW.x * 1.3, d * 2.0));
          float seam = smoothstep(0.9 - 0.07 * front, 0.985, fract(d * 3.2 + n * 0.8)) * smoothstep(0.35, 0.65, secN(vec2(vSecW.x * 0.9 + 3.1, d * 5.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.83, 0.91, 0.97), seam * uFrost.z);
        }`);
    }
    const test = lawn
      // lawn: round holes (x, z, radius) behind the cut
      ? 'for (int i = 0; i < ' + SECTION_HOLES + '; i++) { vec4 h = uHoles[i]; if (h.w > 0.5 && distance(vSecW.xz, h.xy) < h.z) discard; }'
      // cut face: rectangles from x0 to x1, from grade down to y
      : 'for (int i = 0; i < ' + SECTION_HOLES + '; i++) { vec4 h = uHoles[i]; if (h.w > 0.5 && vSecW.x > h.x && vSecW.x < h.y && vSecW.y > h.z) discard; }';
    sh.fragmentShader = 'varying vec3 vSecW; varying vec2 vSecUv;\nuniform vec4 uHoles[' + SECTION_HOLES + '];\nuniform vec3 uFrost;\nuniform float uSnow;\nuniform vec3 uHaze;\nuniform vec2 uBand;\n' + NOISE + f.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + test);
  };
  m.customProgramCacheKey = () => 'gfsLabGround-' + (lawn ? 'lawn' : 'face5');
  m.userData.u = u; m.userData.holes = u.uHoles.value;
  return m;
}
function groundMaterials() {
  const lawnSet = textureSet(THREE, 'lawn', 1024);
  const lm = lawnSet.map.clone(), lb = lawnSet.bumpMap.clone(); lm.needsUpdate = lb.needsUpdate = true;
  return {
    topsoil: groundShader(surfaceMaterial(THREE, 'soil', 0x4d3a29), false),
    clay: groundShader(surfaceMaterial(THREE, 'soil', 0x7b6650), false),
    lawn: groundShader(new THREE.MeshStandardMaterial({ color: 0xffffff, map: lm, bumpMap: lb, bumpScale: .02, roughnessMap: lb, roughness: 1, metalness: 0, envMapIntensity: .3 }), true),
    maps: [lm, lb]
  };
}
export function mats() {
  if (M) return M;
  M = {};
  M.steel = surfaceMaterial(THREE, 'galv', 0xb8c5ce);
  M.concrete = surfaceMaterial(THREE, 'concrete', 0xa9a7a1);
  M.wetConcrete = surfaceMaterial(THREE, 'concrete', 0x6e6d69);
  // inside of a fresh hole: the same clay, in shade
  M.cavity = surfaceMaterial(THREE, 'soil', 0x4a3c2f); M.cavity.side = THREE.BackSide;
  M.cavityFloor = surfaceMaterial(THREE, 'soil', 0x3b3026);
  M.pile = surfaceMaterial(THREE, 'soil', 0x6e5843);
  M.clod = surfaceMaterial(THREE, 'soil', 0x5f4b39);
  M.bag = new THREE.MeshStandardMaterial({ map: bagTexture(), roughness: .92, metalness: 0 });
  M.tool = new THREE.MeshStandardMaterial({ color: 0xd8742c, roughness: .45, metalness: .25 });
  M.toolDark = new THREE.MeshStandardMaterial({ color: 0x2b3038, roughness: .5, metalness: .55, envMapIntensity: .8 });
  M.toolDarkBoth = M.toolDark.clone(); M.toolDarkBoth.side = THREE.DoubleSide;                                   // the auger's flight is one sheet, seen from both sides
  M.toolWorn = new THREE.MeshStandardMaterial({ color: 0x9aa1a6, roughness: .38, metalness: .85, envMapIntensity: 1 });   // steel rubbed bright
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: .9, metalness: 0 });
  M.line = new THREE.MeshBasicMaterial({ map: dashTexture(), transparent: true, depthWrite: false, toneMapped: false });
  M.tick = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75, depthWrite: false, toneMapped: false });
  return M;
}
function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// An 80 lb bag of concrete mix: brown kraft paper, printed plainly (no brand), sewn shut at both ends.
function bagTexture() {
  return canvasTexture(512, 384, (g, w, h) => {
    g.fillStyle = '#c9b48f'; g.fillRect(0, 0, w, h);
    // the paper: fibres, creases and scuffs
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '70,52,30' : '255,244,220'},${Math.random() * .07})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 14, 1); }
    for (let i = 0; i < 9; i++) { const x = Math.random() * w, y = Math.random() * h; g.strokeStyle = `rgba(60,44,26,${.05 + Math.random() * .08})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 220, y + (Math.random() - .5) * 120); g.stroke(); }
    // the print
    g.fillStyle = '#a3352a'; g.fillRect(w * .1, h * .26, w * .8, h * .4);
    g.fillStyle = '#f3ead8'; g.textAlign = 'center'; g.font = 'bold 74px Helvetica, Arial, sans-serif'; g.fillText('CONCRETE', w / 2, h * .46); g.font = 'bold 46px Helvetica, Arial, sans-serif'; g.fillText('MIX', w / 2, h * .61);
    g.fillStyle = '#4a3f30'; g.font = 'bold 40px Helvetica, Arial, sans-serif'; g.fillText('80 LB', w / 2, h * .82); g.font = '15px Helvetica, Arial, sans-serif'; g.fillText('JUST ADD WATER  ·  0.6 CU FT', w / 2, h * .9);
    g.strokeStyle = '#4a3f30'; g.lineWidth = 3; g.strokeRect(w * .1, h * .1, w * .8, h * .1); g.font = 'bold 22px Helvetica, Arial, sans-serif'; g.fillText('4000 PSI', w / 2, h * .175);
    // sewn ends: a folded band and a row of stitches at each short end
    for (const x of [w * .035, w * .965]) { g.fillStyle = 'rgba(70,52,30,.16)'; g.fillRect(x - w * .035, 0, w * .07, h); g.strokeStyle = 'rgba(245,238,224,.9)'; g.lineWidth = 3; g.setLineDash([9, 7]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.setLineDash([]); }
  });
}
function dashTexture() {
  const t = canvasTexture(64, 8, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, 0, w * .55, h); });
  t.wrapS = THREE.RepeatWrapping; return t;
}

// ── the yard around the fence: mown grass you can see the blades of, and trees at the back ──
// Grass: tufts of three blades, only in the strip the cameras look at (x0…x1, back to z0); the lawn's
// own texture carries on past it. Blades follow the grade, stay out of holes and off cleared spots,
// and lie down under snow. Trees: a soft line of them past the far edge of the lawn, in the haze.
const GRASS_CLEAR = 8;
function makeScenery({ winter, width, back, lawnU, grade, phone, x0 = -Math.min(width / 2 - 1, 30), x1 = Math.min(width / 2 - 1, 30), z0 = -14, n, tall = 2.4, on = true, trees = true }) {
  const group = new THREE.Group(); group.userData.noCheck = true;
  const rnd = (() => { let a = 20261127; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
  const uClear = { value: Array.from({ length: GRASS_CLEAR }, () => new THREE.Vector3(0, 0, 0)) }; let nClear = 0;
  const uSnow = { value: 0 };
  let grassGeo = null, aY = null, P = null;
  if (on) {
    const area = (x1 - x0) * -z0, N = Math.round(Math.min(n || (phone ? 26000 : 46000), area * 90));
    // one tuft: three blades fanned out, each a thin triangle 1 unit tall
    const pos = [], uv = [];
    for (let b = 0; b < 3; b++) { const a = b * 2.094 + .4, c = Math.cos(a), s = Math.sin(a), o = .35; pos.push(-.5 * c + o * s, 0, -.5 * s - o * c, .5 * c + o * s, 0, .5 * s - o * c, o * s * 2.2, 1, -o * c * 2.2); uv.push(0, 0, 1, 0, .5, 1); }
    grassGeo = new THREE.InstancedBufferGeometry();
    grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); grassGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    grassGeo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(27).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    P = new Float32Array(N * 4); const C = new Float32Array(N * 2); aY = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // a little thicker toward the front, where the camera is closest
      const z = z0 * Math.pow(rnd(), 1.35) - .04;
      P.set([x0 + rnd() * (x1 - x0), z, (tall * (.65 + rnd() * .7)) * IN, rnd() * 6.283], i * 4); C.set([rnd(), rnd()], i * 2);
    }
    grassGeo.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4)); grassGeo.setAttribute('aC', new THREE.InstancedBufferAttribute(C, 2));
    grassGeo.setAttribute('aY', new THREE.InstancedBufferAttribute(aY, 1).setUsage(THREE.DynamicDrawUsage));
    grassGeo.instanceCount = N;
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide, envMapIntensity: .15 });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uHoles: lawnU.uHoles, uClear, uSnow, uBox: { value: new THREE.Vector3(x0, x1, z0) } });
      sh.vertexShader = 'uniform vec3 uBox;\n#define uEdge (smoothstep(0.0, 3.0, aP.x - uBox.x) * smoothstep(0.0, 3.0, uBox.y - aP.x) * smoothstep(0.0, 4.0, aP.y - uBox.z))\nattribute vec4 aP; attribute vec2 aC; attribute float aY; uniform vec4 uHoles[' + SECTION_HOLES + ']; uniform vec3 uClear[' + GRASS_CLEAR + ']; uniform float uSnow; varying vec3 vBlade;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
        .replace('#include <begin_vertex>', `
          float hgt = aP.z * (1.0 - uSnow * .93) * uEdge;
          for (int i = 0; i < ${SECTION_HOLES}; i++) { vec4 h = uHoles[i]; if (h.w > .5 && distance(aP.xy, h.xy) < h.z + .03) hgt = 0.0; }
          for (int i = 0; i < ${GRASS_CLEAR}; i++) { vec3 h = uClear[i]; if (h.z > 0.0 && distance(aP.xy, h.xy) < h.z) hgt = 0.0; }
          float wd = (.0052 + .0034 * aC.x) * (.4 + .6 * uEdge);
          vec3 q = vec3(position.x * wd * 6.0, position.y * hgt, position.z * wd * 6.0);
          float bend = position.y * position.y * hgt;
          q.x += bend * (aC.y - .5) * 1.1; q.z += bend * (fract(aC.y * 7.3) - .5) * 1.1;
          float cr = cos(aP.w), sr = sin(aP.w);
          vec3 transformed = vec3(cr * q.x - sr * q.z + aP.x, q.y + aY, sr * q.x + cr * q.z + aP.y);
          vBlade = vec3(position.y, aC.x, aC.y);`);
      sh.fragmentShader = 'varying vec3 vBlade; uniform float uSnow;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 root = vec3(.05, .12, .03), tip = mix(vec3(.13, .30, .06), vec3(.21, .36, .08), vBlade.y);
          vec3 g = mix(root, tip, smoothstep(0.0, .9, vBlade.x)) * (.8 + .4 * vBlade.z);
          g = mix(g, vec3(.34, .31, .13), step(.95, vBlade.z) * .5);
          diffuseColor.rgb = mix(g, vec3(.80, .84, .9), uSnow * .8);`)
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
    };
    m.customProgramCacheKey = () => 'gfsLabGrass';
    const mesh = new THREE.Mesh(grassGeo, m); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.userData.noCheck = true; mesh.name = 'grass';
    group.add(mesh);
  }
  const regrade = () => { if (!aY) return; for (let i = 0; i < aY.length; i++) aY[i] = grade(P[i * 4]); grassGeo.attributes.aY.needsUpdate = true; };

  // trees
  let canopyMat = null; const leaf = new THREE.Color(), bare = new THREE.Color(0x6a6159);
  if (trees) {
    // one clump of leaves: a ball pushed in and out at three sizes so its outline is ragged like foliage,
    // not lumpy like clay
    const blob = new THREE.IcosahedronGeometry(1, 3), bp = blob.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const k = 1 + .16 * Math.sin(x * 4.1 + y * 3.3 + 1.7) * Math.cos(z * 3.7 + x * 2.1) + .09 * Math.sin(x * 9.3 + z * 8.1) * Math.cos(y * 10.7 + z * 2.9) + .05 * Math.sin(x * 21.0 + y * 17.0) * Math.cos(z * 19.0 + y * 6.0);
      bp.setXYZ(i, x * k, Math.max(y, -.55) * k, z * k);
    }
    { const nn = blob.attributes.normal; for (let i = 0; i < bp.count; i++) { const v = new THREE.Vector3(bp.getX(i), bp.getY(i) + .2, bp.getZ(i)).normalize(); nn.setXYZ(i, v.x, v.y, v.z); } }
    canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: .25, flatShading: false });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3d31, roughness: 1 });
    for (const m of [canopyMat, trunkMat]) { m.onBeforeCompile = sh => { sh.uniforms.uHaze = lawnU.uHaze;
      sh.vertexShader = 'varying vec3 vTW; varying float vUp;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vTW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vUp = position.y;');
      sh.uniforms.uRagged = { value: m === canopyMat ? 1 : 0 }; sh.uniforms.uBare = { value: m === canopyMat && winter ? 1 : 0 };
      sh.fragmentShader = 'varying vec3 vTW; varying float vUp; uniform vec3 uHaze; uniform float uRagged; uniform float uBare;\n' + NOISE + sh.fragmentShader.replace('#include <dithering_fragment>', 'gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(60.0, 520.0, length(vTW.xz - cameraPosition.xz)) * .5);\n#include <dithering_fragment>')
        // foliage: sunlit clumps and shaded gaps at a few sizes, darker underneath each clump; then a leaf-sized
        // dapple whose size follows the distance, so it is a few pixels across near or far and never shimmers
        .replace('#include <color_fragment>', `#include <color_fragment>
          { vec3 w = vTW; float dist = length(vTW - cameraPosition), lf = clamp(230.0 / dist, 0.5, 4.0);
            float n = secN(w.xy * .11 + w.z * .07) * .34 + secN(w.xy * .27 + w.z * .19 + 3.1) * .3 + secN(w.xy * .61 + w.z * .43 + 7.7) * .22 + secN(w.xy * 1.3 + w.z * .9 + 1.3) * .14;
            float leafN = secN(w.xy * lf + vec2(w.z * lf * .37, 5.0)) * .34 + secN(w.zy * lf * 1.1 + vec2(w.x * lf * .41, 3.0)) * .33 + secN(w.xz * lf * 2.1 + vec2(11.0, w.y * lf * .9)) * .33;
            float clump = smoothstep(.3, .72, n), under = smoothstep(-.55, .75, vUp), dapple = smoothstep(.34, .62, leafN);
            diffuseColor.rgb *= (.5 + .85 * clump) * (.6 + .5 * under) * (.62 + .55 * dapple);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.18, 1.12, .78), clump * under * dapple * .5);
            vLeaf = leafN;
            // winter: the leaves are down. What is left of a crown is its twigs, drawn as a net of thin dark
            // lines with sky showing between them.
            if (uBare > .5) { float tf = lf * .42;
              vLeaf = min(abs(secN(w.xy * tf + vec2(w.z * tf * .31, 2.0)) - .5), abs(secN(w.zy * tf * 1.2 + vec2(w.x * tf * .37, 6.0)) - .5));
              diffuseColor.rgb = vec3(.2, .17, .15) * (.75 + .5 * under); } }`)
        // a ragged, leafy outline: along the rim of each clump, the gaps between leaves are see-through
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n if (uBare > .5) { if (vLeaf > .05) discard; } else if (uRagged > .5) { float rim = abs(dot(normalize(normal), normalize(vViewPosition))); if (rim < .42 && vLeaf < .34 + (.42 - rim) * .75) discard; }')
        .replace('void main() {', 'float vLeaf = 1.0;\nvoid main() {'); };
      m.customProgramCacheKey = () => 'gfsLabTree4' + (m === canopyMat ? 'c' : 't'); }
    const spots = [];
    const far = -back - 14;
    for (let x = -width / 2 - back * .6; x < width / 2 + back * .6; x += 9 + rnd() * 10) spots.push([x, far - rnd() * 60]);
    for (const sx of [-1, 1]) for (let z = -45; z > far; z -= 22 + rnd() * 26) spots.push([sx * (Math.max(width / 2, 170) + 16 + rnd() * 30), z]);
    // and across the near side, for views that look from behind the fence
    for (let x = -width / 2 - back * .6; x < width / 2 + back * .6; x += 9 + rnd() * 10) spots.push([x, -far + rnd() * 60]);
    const blobs = [], trunks = [], M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
    for (const [x, z] of spots) {
      const hgt = 26 + rnd() * 22, r = hgt * (.3 + rnd() * .12), hue = rnd();
      trunks.push([x, z, hgt]);
      for (let k = 0; k < 7; k++) blobs.push([x + (rnd() - .5) * r * 1.5, hgt * (.5 + rnd() * .38), z + (rnd() - .5) * r * 1.2, r * (.45 + rnd() * .4), hue, rnd()]);
    }
    // brush along the foot of the trees, so it reads as one hedgerow and not a row of trunks
    for (const [x, z, hgt] of trunks.slice()) for (let k = 0; k < 3; k++) { const r = 5 + rnd() * 6; blobs.push([x + (rnd() - .5) * 26, r * .55, z + Math.sign(-z) * 4 + (rnd() - .5) * 10, r, rnd(), rnd() * .6]); }
    const cm = new THREE.InstancedMesh(blob, canopyMat, blobs.length), tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(.5, .8, 1, 7), trunkMat, trunks.length);
    blobs.forEach(([x, y, z, r, hue, v], i) => { cm.setMatrixAt(i, M4.compose(V.set(x, y, z), Q.setFromEuler(E.set(0, v * 6.28, 0)), S.set(r, r * (.8 + v * .25), r))); cm.setColorAt(i, leaf.setHSL(.26 + hue * .07, .45 + v * .12, .13 + v * .06)); });
    trunks.forEach(([x, z, h], i) => tm.setMatrixAt(i, M4.compose(V.set(x, h * .3, z), Q.identity(), S.set(h * .035, h * .6, h * .035))));
    for (const o of [cm, tm]) { o.userData.noCheck = true; o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; group.add(o); }
    group.userData.canopy = cm; group.userData.leaf = blobs.map(([, , , , hue, v]) => new THREE.Color().setHSL(.26 + hue * .07, .45 + v * .12, .13 + v * .06));
  }
  // winter: the leaves are down, so the tree line is grey-brown and thinner
  if (winter && group.userData.canopy) { const cm = group.userData.canopy, M4 = new THREE.Matrix4(); group.userData.leaf.forEach((c, i) => { cm.setColorAt(i, leaf.copy(bare).multiplyScalar(.75 + .5 * ((i * 37) % 10) / 10)); cm.getMatrixAt(i, M4); M4.scale(new THREE.Vector3(.8, .86, .8)); cm.setMatrixAt(i, M4); }); cm.instanceColor.needsUpdate = true; }
  regrade();
  return {
    group, regrade,
    clear(x, z, r) { if (nClear < GRASS_CLEAR) uClear.value[nClear++].set(x, z, r); },
    snow(k) { uSnow.value = k; }
  };
}

// ── the stage ───────────────────────────────────────────────────
// host: an element to fill. views: [{ id, label }] — one camera each, drawn side by side on wide
// screens and stacked on phones, all turned together by the same finger.
// segPerFt: how finely the ground can bend along the fence. turnWithOneFinger: false leaves one-finger
// drags to the tool (two fingers still pinch, tilt and turn).
// stackAlways: views one above the other at every width; a view's aspect (height ÷ width, with
// minH/maxH in px) sets its own height when stacked.
// ── definition ──────────────────────────────────────────────────
// Wood up close. The app draws its board grain into a 256 × 1024 texture, which is right for a whole
// fence but goes soft when a tool looks at a latch or a joint from a foot away. The Lab asks the app's
// own grain maker for the same grain at twice the size and swaps it in. The bigger texture takes about
// a second to draw on a phone, so it's made after the first picture is up, once per wood on the page.
const SHARP = 2048, sharpWaiting = new Map(), stages = new Set();
let sharpTimer = 0;
function sharpen(group) { group.traverse(o => { if (o.isMesh) sharpenMaterial(o.material, true); }); sharpenSoon(); }
function sharpenMaterial(m, later) {
  const kind = m?.userData?.gfsKind;
  if (!m?.map || !/^(pt|cedar|grain)$/.test(kind) || m.userData.sharp) return;
  m.userData.sharp = true;
  if (!sharpWaiting.has(kind)) sharpWaiting.set(kind, new Set()); sharpWaiting.get(kind).add(m);
  if (!later) sharpenSoon();
}
// A copy of one of the app's wood materials that is its own material: same wood, same colour. Parts that
// share a material and are drawn one after another share one grain direction (the first part's), so a
// tool that builds its own frame from differently-turned pieces gives each piece a copy.
export function woodLike(src) {
  const kind = src?.userData?.gfsKind; if (!/^(pt|cedar)$/.test(kind || '')) return src;
  const m = surfaceMaterial(THREE, 'wood', 0xffffff, { species: kind });
  m.color.copy(src.color); m.roughness = src.roughness; m.bumpScale = src.bumpScale; m.envMapIntensity = src.envMapIntensity;
  if (src.userData.lumber) m.userData.lumber = true;
  sharpenMaterial(m); return m;
}
function sharpenSoon() {
  if (sharpTimer || ![...sharpWaiting.values()].some(set => set.size)) return;
  sharpTimer = setTimeout(function next() {
    sharpTimer = 0;
    const kind = [...sharpWaiting.keys()].find(k => sharpWaiting.get(k).size); if (!kind) return;
    const set = textureSet(THREE, kind, SHARP);            // kept by the app's surface library: made once
    for (const m of sharpWaiting.get(kind)) { m.map = set.map; m.bumpMap = set.bumpMap; m.roughnessMap = set.roughnessMap; m.needsUpdate = true; }
    sharpWaiting.get(kind).clear();
    for (const st of stages) st();
    sharpTimer = setTimeout(next, 60);
  }, 350);
}
// Two things the app's wood models draw for clarity on a small screen that a real fence doesn't have,
// put right for the Lab's close views:
//  • The rails and gate frame are drawn a dark brown so they stand out from the pickets. On a real
//    fence they are the same lumber as the pickets, so they take the pickets' colour, a little darker
//    so the framing still reads at a glance.
//  • The picket nails are drawn as black ⅜ in dots. GFS shoots galvanized coil nails, whose heads are
//    about ¼ in and zinc grey.
const RAIL_TONE = .84;   // rails and gate frames: the pickets' colour, a little darker (Nick, 2026-11-27)
let nailMat = null;
function trueToLumber(group) {
  const kindOf = (o, i = 0) => o.userData.parts?.[i]?.kind, isWood = m => /^(pt|cedar)$/.test(m?.userData?.gfsKind || '');
  let picket = null; group.traverse(o => { if (!picket && o.isMesh && /^g?picket$/.test(kindOf(o) || '') && isWood(o.material)) picket = o.material; });
  const M = new THREE.Matrix4(), K = .72;
  group.traverse(o => {
    if (!o.isMesh) return; const k = kindOf(o) || '';
    if (picket && /^(rail|kick|grail|gstile|gbrace)$/.test(k) && isWood(o.material) && o.material !== picket && !o.material.userData.lumber) {
      o.material.userData.lumber = true; o.material.color.copy(picket.color).multiplyScalar(RAIL_TONE);
    }
    if (k === 'fastener' && picket) {
      nailMat ||= new THREE.MeshStandardMaterial({ color: 0x8f979b, roughness: .5, metalness: .7, envMapIntensity: .9 });
      o.material = nailMat;
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); const e = M.elements; for (const j of [0, 1, 2, 4, 5, 6, 8, 9, 10]) e[j] *= K; o.setMatrixAt(i, M); }
        o.instanceMatrix.needsUpdate = true;
      } else o.scale.multiplyScalar(K);
    }
  });
}
// Framing lumber has eased edges. A 2×4, a 4×4 or a 4×6 leaves the mill with its four long edges rounded
// (about ¼ in), and those rounded edges are what catch the light along a rail or down a post. The
// app's models draw every board as a sharp-cornered box. For framing sizes the Lab swaps in the same
// box with its long edges rounded; the cut ends stay square. Pickets and 1× boards are left alone:
// they are sawn square. (The app's wood takes its grain from each part's box, not from the mesh, so
// the grain stays exactly where the app put it.)
const EASE_IN = .2, easedCache = new Map();
function easedBox(geo) {
  const pos = geo.attributes.position;
  if (geo.type !== 'BoxGeometry' || geo.userData.eased || pos.count !== 24) return geo;
  geo.computeBoundingBox(); const size = geo.boundingBox.getSize(new THREE.Vector3()), ctr = geo.boundingBox.getCenter(new THREE.Vector3());
  const d = size.toArray(), long = d.indexOf(Math.max(...d)), ax = [(long + 1) % 3, (long + 2) % 3], a = d[ax[0]], b = d[ax[1]], L = d[long];
  if (Math.min(a, b) < 1.4 * IN || Math.max(a, b) > 6 * IN || L < 6 * IN) return geo;
  const key = [...d, ...ctr.toArray()].map(v => v.toFixed(4)).join(',');
  if (easedCache.has(key)) return easedCache.get(key);
  const r = Math.min(EASE_IN * IN, a / 4, b / 4), ha = a / 2, hb = b / 2, sh = new THREE.Shape(), q = Math.PI / 2;
  sh.moveTo(-ha + r, -hb); sh.lineTo(ha - r, -hb); sh.absarc(ha - r, -hb + r, r, -q, 0, false); sh.lineTo(ha, hb - r); sh.absarc(ha - r, hb - r, r, 0, q, false);
  sh.lineTo(-ha + r, hb); sh.absarc(-ha + r, hb - r, r, q, 2 * q, false); sh.lineTo(-ha, -hb + r); sh.absarc(-ha + r, -hb + r, r, 2 * q, 3 * q, false);
  let g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -L / 2);
  const E = [0, 1, 2].map(() => new THREE.Vector3()); E[0].setComponent(ax[0], 1); E[1].setComponent(ax[1], 1); E[2].setComponent(long, 1);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(E[0], E[1], E[2]).setPosition(ctr));
  const e = creased(g, 40); e.computeBoundingBox(); e.computeBoundingSphere();
  e.type = 'BoxGeometry'; e.parameters = geo.parameters; e.userData.eased = true;   // still a box to everything that asks
  easedCache.set(key, e); return e;
}
export function easeLumber(root) {
  root.traverse(o => { if (o.isMesh && /^(pt|cedar)$/.test(o.material?.userData?.gfsKind || '') && o.geometry?.type === 'BoxGeometry') o.geometry = easedBox(o.geometry); });
}
// Smooth shading for a curved part: every corner takes the average direction of the faces that meet
// there, except across an edge sharper than `deg`, which stays crisp.
export function creased(geo, deg = 35) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, n = p.count, cos = Math.cos(deg * Math.PI / 180);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), fn = [], at = new Map(), key = i => `${Math.round(p.getX(i) * 2e4)},${Math.round(p.getY(i) * 2e4)},${Math.round(p.getZ(i) * 2e4)}`;
  for (let i = 0; i < n; i += 3) {
    A.fromBufferAttribute(p, i); B.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
    const f = B.sub(A).cross(C.sub(A)).clone(); fn.push(f);                    // length = twice the face's area, so big faces count for more
    for (let k = 0; k < 3; k++) { const q = key(i + k); if (!at.has(q)) at.set(q, []); at.get(q).push(i / 3); }
  }
  const unit = fn.map(f => f.clone().normalize()), out = new Float32Array(n * 3), N = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const me = Math.floor(i / 3); N.set(0, 0, 0);
    for (const f of at.get(key(i))) if (unit[f].dot(unit[me]) >= cos) N.add(fn[f]);
    N.normalize(); out[i * 3] = N.x; out[i * 3 + 1] = N.y; out[i * 3 + 2] = N.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return g;
}

export function createStage(host, { views = [{ id: 'main' }], soilDepth = 14, width = 400, back = 400, segPerFt = 1, turnWithOneFinger = true, stackAlways = false, home = {}, grass = {}, winter = false } = {}) {
  back = Math.max(back, 320);   // the trees at the back of the yard stay well behind the fence
  const mt = mats();
  const wrap = document.createElement('div'); wrap.className = 'l3d'; host.append(wrap);
  const cv = document.createElement('canvas'); cv.className = 'l3d-cv'; wrap.append(cv);
  const over = document.createElement('div'); over.className = 'l3d-over'; wrap.append(over);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  // Two sharpnesses. While something is moving the picture is drawn at the screen's own pixels (at
  // most 2 per point). A quarter second after it comes to rest it is drawn once more, finer: every
  // pixel a phone has, or more pixels than the screen on an iPad or laptop, which smooths the edges
  // of pickets, wire and hardware. The fine picture is held to FINE_PX pixels to stay inside a
  // phone's memory, and is given up for good if the browser ever drops the 3D picture.
  const basePR = Math.min(devicePixelRatio || 1, 2), FINE_PX = 4.5e6;
  let fine = false, fineTimer = 0, fineOff = false; try { fineOff = sessionStorage.getItem('gfs-lab-fine') === 'off'; } catch (e) { /* private mode */ }
  const finePR = () => Math.max(basePR, Math.min(3, Math.max(2, (devicePixelRatio || 1) * 1.5), Math.sqrt(FINE_PX / Math.max(1, cv.clientWidth * cv.clientHeight))));
  const setPR = r => { if (Math.abs(renderer.getPixelRatio() - r) < .01) return; renderer.setPixelRatio(r); renderer.setSize(cv.clientWidth, cv.clientHeight, false); };
  renderer.setPixelRatio(basePR);
  setAnisotropy(THREE, renderer.capabilities.getMaxAnisotropy());   // textures seen at a slant (rails, the lawn, a fence running away) stay sharp
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.setScissorTest(true);
  const scene = new THREE.Scene();

  // Sky: a clear-day gradient with fair-weather clouds and the glow around the sun. It also lights
  // metal and paint. uSun: where the sun is. uCloud: how much of the sky the clouds cover (0–1).
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x4f86c6) }, mid: { value: skyMid }, bot: { value: new THREE.Color(0x6d8758) }, uSun: { value: new THREE.Vector3(-.44, .68, .6).normalize() }, uCloud: { value: .42 } },
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top, mid, bot, uSun; uniform float uCloud; varying vec3 v;\n' + NOISE + `
      float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++) { s += a * secN(p); p = p * 2.03 + 11.3; a *= .5; } return s; }
      void main(){
        vec3 d = normalize(v); float y = d.y;
        vec3 c = y > 0.0 ? mix(mid, top, pow(y, 0.55)) : mix(mid, bot, clamp(-y * 6.0, 0.0, 1.0));
        float s = max(dot(d, uSun), 0.0);
        if (y > 0.0) c += vec3(1.0, .93, .8) * (pow(s, 1400.0) * 8.0 + pow(s, 48.0) * .3 + pow(s, 7.0) * .1);
        if (y > 0.015 && uCloud > 0.0) {
          vec2 p = d.xz / (y + .16) * 1.25;
          float n = fbm(p + vec2(3.7, 1.9)) * .75 + fbm(p * 2.7 + 8.1) * .25;
          float k = smoothstep(1.0 - uCloud * .62, 1.08 - uCloud * .5, n + .32) * smoothstep(.015, .16, y);
          float lit = .78 + .22 * smoothstep(.45, .8, fbm(p * 1.9 - uSun.xz * .25));
          c = mix(c, mix(vec3(.66, .71, .8), vec3(1.0, .99, .97), lit) * (.9 + .1 * s), k * .92);
        }
        gl_FragColor = vec4(c, 1.0);
      }` });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat); sky.renderOrder = -1; sky.userData.noCheck = true; scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat));
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0x4a5a33 })); g.position.y = -2; g.rotation.x = -Math.PI / 2; envScene.add(g); }
  const envRT = pmrem.fromScene(envScene, .04); scene.environment = envRT.texture; pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xdfeaf6, 0x6b5a45, .72));   // open sky fills the shade: shadows are deep, not black
  // Late-morning sun from the viewer's left and in front, so the cut face is lit.
  const sun = new THREE.DirectionalLight(0xfff2df, 2.7); sun.position.set(-22, 34, 30); sun.castShadow = true;
  // shadows: a finer map on a screen big enough to show it (the app's own top setting is 4096 too)
  const shadowPx = Math.min(renderer.capabilities.maxTextureSize, (host.clientWidth || innerWidth) >= 700 ? 4096 : 2048);
  sun.shadow.mapSize.set(shadowPx, shadowPx); sun.shadow.normalBias = .03 * 2048 / shadowPx; sun.shadow.radius = 2;
  const SUN_FT = Math.hypot(22, 34, 30);   // how far the sun's lamp stands from what a view looks at
  scene.add(sun, sun.target);

  // The yard: lawn behind the cut, and the cut face (topsoil over clay) in front.
  // The ground can slope along the fence: grade(x) is its height at x. The lawn and the cut face are
  // made of 1 ft strips (or finer) so they can follow it.
  const SEG = Math.round(width * segPerFt);
  const lawnGeo = new THREE.PlaneGeometry(width, back, SEG, 1); lawnGeo.rotateX(-Math.PI / 2); lawnGeo.translate(0, 0, -back / 2);
  const G = groundMaterials();
  const lawn = new THREE.Mesh(lawnGeo, G.lawn); lawn.receiveShadow = true; lawn.name = 'lawn'; scene.add(lawn);
  for (const t of G.maps) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(width / 3, back / 3); }
  const TOP = 8 * IN;   // topsoil
  const face = (h, y0, m, name) => { const g = new THREE.PlaneGeometry(width, h, SEG, 1); g.translate(0, y0 - h / 2, 0); g.userData.base = g.attributes.position.array.slice(); const f = new THREE.Mesh(g, m); f.receiveShadow = true; f.name = name; scene.add(f); return f; };
  const faces = [face(TOP, 0, G.topsoil, 'topsoil'), face(soilDepth - TOP, -TOP, G.clay, 'clay')];
  G.topsoil.userData.u.uBand.value.set(0, TOP); G.clay.userData.u.uBand.value.set(TOP, soilDepth - TOP);   // where each face sits below the grass
  lawnGeo.userData.base = lawnGeo.attributes.position.array.slice();
  let grade = () => 0;
  function setGrade(fn) {
    grade = fn || (() => 0);
    const pa = lawnGeo.attributes.position, b = lawnGeo.userData.base;
    for (let i = 0; i < pa.count; i++) pa.setY(i, b[i * 3 + 1] + grade(b[i * 3]));
    pa.needsUpdate = true; lawnGeo.computeVertexNormals(); lawnGeo.computeBoundingSphere(); scenery.regrade();
    for (const [k, f] of faces.entries()) {
      const g = f.geometry, p = g.attributes.position, fb = g.userData.base, top = Math.max(...Array.from({ length: p.count }, (_, i) => fb[i * 3 + 1]));
      // the topsoil band rides on the grade top and bottom; the clay's top follows it and its bottom stays put
      for (let i = 0; i < p.count; i++) { const x = fb[i * 3], y = fb[i * 3 + 1], isTop = Math.abs(y - top) < 1e-6; p.setY(i, y + (k === 0 || isTop ? grade(x) : 0)); }
      p.needsUpdate = true; g.computeBoundingSphere();
    }
    dirty();
  }
  const root = new THREE.Group(); scene.add(root);
  const scenery = makeScenery({ winter, width, back, lawnU: G.lawn.userData.u, grade: x => grade(x), phone: (wrap.clientWidth || innerWidth) < 700, ...grass });
  scene.add(scenery.group);
  // A view that looks from the far side (the picket side of a gate) sees the yard on the near side of
  // the cut instead, so that side gets a lawn too. It's only drawn for those views.
  const frontLawn = new THREE.Mesh(new THREE.PlaneGeometry(width, back).rotateX(-Math.PI / 2).translate(0, -.004, back / 2), G.lawn); frontLawn.receiveShadow = true; frontLawn.visible = false; frontLawn.userData.noCheck = true; scene.add(frontLawn);
  // below the horizon the sky takes the colour of far-off ground (hazy green, or snow), so where the
  // lawn runs out there is more yard in the distance and not a dark band
  const farGreen = new THREE.Color(0x6d8758), farSnow = new THREE.Color(0xd9e1e6);
  if (winter) { skyMat.uniforms.uCloud.value = .9; skyMat.uniforms.bot.value.copy(farGreen).lerp(farSnow, .5); }

  // holes: { x0, x1, y } in the cut face, { x, z, r } in the lawn
  const faceHoles = [], lawnHoles = [];
  const syncHoles = () => {
    for (const [list, mats] of [[faceHoles, [G.topsoil, G.clay]], [lawnHoles, [G.lawn]]]) for (const m of mats) m.userData.holes.forEach((v, i) => {
      const h = list[i]; if (!h || !h.on) v.set(0, 0, 0, 0); else if (list === faceHoles) v.set(h.x0, h.x1, h.y, 1); else v.set(h.x, h.z, h.r, 1);
    });
  };
  // a hole r wide in the cut face; its top in the lawn is lawnR (wider where the top of a hole caved in)
  const hole = (x, r, lawnR = r) => { const f = { x0: x - r, x1: x + r, y: 0, on: false }, l = { x, z: 0, r: lawnR, on: false }; faceHoles.push(f); lawnHoles.push(l);
    if (faceHoles.length > SECTION_HOLES) throw Error('Too many holes for the cut face.');
    return { set(depth) { f.on = l.on = depth > 1e-4; f.y = -depth; syncHoles(); }, move(nx, nr, nl = nr) { f.x0 = nx - nr; f.x1 = nx + nr; l.x = nx; l.r = nl; syncHoles(); } }; };

  // ── cameras ──
  const V = views.map(v => ({ ...v, cam: new THREE.PerspectiveCamera(30, 1, .1, 2000), rect: { x: 0, y: 0, w: 1, h: 1 }, target: new THREE.Vector3(), base: { w: 16, h: 12 }, inset: { top: v.label ? 40 : 8, bottom: 8 }, tag: null }));
  const HOME = { yaw: 0, pitch: .13, zoom: 1, ...home };   // home: where the camera starts and double-tap returns
  const orbit = { ...HOME, user: false };
  let stacked = false, solo = -1;
  const aim = new THREE.Vector3();
  const place = v => {
    const c = v.cam, w = v.rect.w, h = v.rect.h, aspect = w / h; c.aspect = aspect;
    // fit the framing box between the label at the top and the status line at the bottom
    const it = v.inset.top, ib = v.inset.bottom, usable = Math.max(.45, (h - it - ib) / h);
    const vf = THREE.MathUtils.degToRad(c.fov), t = Math.tan(vf / 2), fitH = v.base.h / usable / 2 / t, fitW = v.base.w / 2 / t / aspect;
    const d = Math.max(fitH, fitW) * 1.02 / orbit.zoom, ftPerPx = 2 * d * t / h;
    aim.set(v.target.x, v.target.y - (ib - it) / 2 * ftPerPx, v.target.z);
    const yaw = orbit.yaw + (v.yaw0 || 0);
    c.position.set(aim.x + Math.sin(yaw) * Math.cos(orbit.pitch) * d, aim.y + Math.sin(orbit.pitch) * d, aim.z + Math.cos(yaw) * Math.cos(orbit.pitch) * d);
    c.lookAt(aim); c.updateProjectionMatrix();
  };
  const layout = () => {
    const W = wrap.clientWidth || 360, n = V.length;
    // On a phone the Lab gives the picture a fixed height (it stays in view while the controls scroll),
    // and two views go side by side in it so both can be compared without scrolling.
    const fitH = W < 700 && getComputedStyle(host).getPropertyValue('--l3d-fit').trim() === '1' ? host.clientHeight : 0;
    stacked = n > 1 && (W < 700 || stackAlways) && !fitH;
    if (!fitH || n !== 2) solo = -1;
    const own = stacked && V.some(v => v.aspect);
    const hs = own ? V.map(v => Math.round(clamp(W * (v.aspect || 1), v.minH || 160, v.maxH || 560))) : null;
    // On a wide screen (iPad on its side, a laptop) the whole picture and the slider under it should fit
    // on screen without scrolling, so the height is also held to what's left under the tool's heading.
    const room = W >= 700 ? Math.max(300, innerHeight - Math.max(0, host.getBoundingClientRect().top + (host.closest('#v-lab')?.scrollTop || 0)) - 124) : Infinity;
    const cap = W >= 700 ? Math.max(300, Math.min(room, innerHeight - 210)) : Infinity;
    const H = fitH ? fitH : own ? hs.reduce((a, b) => a + b, 0) : stacked ? Math.round(Math.min(W * 1.02, 430) * n) : Math.round(Math.min(cap, n > 1 ? Math.min(W / n * .95, 540) : Math.min(W * (W < 700 ? 1.08 : .62), 560)));
    wrap.style.height = H + 'px'; renderer.setSize(W, H, false);
    let y0 = 0;
    V.forEach((v, i) => { v.off = solo >= 0 && i !== solo; if (solo >= 0) v.rect = { x: 0, y: 0, w: v.off ? 0 : W, h: H }; else if (own) { v.rect = { x: 0, y: y0, w: W, h: hs[i] }; y0 += hs[i]; } else v.rect = stacked ? { x: 0, y: Math.round(H / n * i), w: W, h: Math.round(H / n) } : { x: Math.round(W / n * i), y: 0, w: Math.round(W / n), h: H }; });
    V.forEach((v, i) => { if (!v.tag) return; Object.assign(v.tag.style, { left: v.rect.x + 'px', top: v.rect.y + 'px', width: v.rect.w + 'px', height: v.rect.h + 'px', display: v.off ? 'none' : '' });
      const b = v.tag.querySelector('.l3d-solo'); if (b) { b.classList.toggle('on', solo === i); b.setAttribute('aria-label', solo === i ? 'Show both sides' : 'Make this side bigger'); b.setAttribute('aria-pressed', String(solo === i)); } });
    wrap.classList.toggle('stacked', stacked); wrap.classList.toggle('fit', !!fitH); wrap.classList.toggle('narrow', V.some(v => !v.off && v.rect.w < 260));
    dirty();
  };
  V.forEach((v, i) => { const t = document.createElement('div'); t.className = 'l3d-view'; t.innerHTML = v.label ? `<span class="l3d-tag ${v.tone || ''}">${v.label}</span>` : ''; over.append(t); v.tag = t;
    // two views share a phone's width; this button gives one of them all of it, and gives it back
    if (V.length === 2) { const b = document.createElement('button'); b.type = 'button'; b.className = 'l3d-solo'; b.innerHTML = '<svg viewBox="0 0 24 24" class="one"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><svg viewBox="0 0 24 24" class="both"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 5v14" stroke="currentColor" stroke-width="2.2"/></svg><span>Both</span>'; b.onclick = () => { solo = solo === i ? -1 : i; layout(); }; t.append(b); } });

  stages.add(dirty);
  // ── render on demand ──
  let need = true, raf = 0, alive = true, onscreen = true;
  const ticks = new Set(), afters = new Set();
  function dirty() { need = true; if (fine) { fine = false; setPR(basePR); } clearTimeout(fineTimer); kick(); }
  const refine = () => { if (!alive || fineOff || fine || !onscreen || ticks.size) return; fine = true; setPR(finePR()); need = true; kick(); };
  function kick() { if (!raf && alive && onscreen) raf = requestAnimationFrame(frame); }
  // ── contact shade ──
  // Where two parts meet, less of the sky reaches the corner between them: under a rail, behind a
  // brace, at the foot of a post, in the gap beside a gate. A sun shadow doesn't show that; this does.
  // It is worked out from how far every pixel is from the eye, only for the fine picture at rest: the
  // solid parts are drawn once more for depth alone, then each pixel is darkened a little by how
  // much of the half-ball of space in front of its surface is taken up by something nearer than
  // AO_FT. Grass, trees, labels and anything see-through are left out of it.
  const AO_FT = .3, AO_STRENGTH = .5;
  let aoRT = null;
  const aoDepth = new THREE.MeshBasicMaterial({ colorWrite: false }), aoScene = new THREE.Scene(), aoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const aoMat = new THREE.ShaderMaterial({
    uniforms: { tDepth: { value: null }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2(1, 1) }, uRadius: { value: AO_FT }, uStrength: { value: AO_STRENGTH } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDepth; uniform mat4 uProj, uProjInv; uniform vec2 uRes; uniform float uRadius, uStrength; varying vec2 vUv;
      vec3 eye(vec2 uv) { vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, texture2D(tDepth, uv).x * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
      void main() {
        if (texture2D(tDepth, vUv).x >= 0.99995) { gl_FragColor = vec4(1.0); return; }
        vec2 px = 1.0 / uRes; vec3 p = eye(vUv), r = eye(vUv + vec2(px.x, 0.0)), l = eye(vUv - vec2(px.x, 0.0)), u = eye(vUv + vec2(0.0, px.y)), d = eye(vUv - vec2(0.0, px.y));
        vec3 dx = abs(r.z - p.z) < abs(p.z - l.z) ? r - p : p - l, dy = abs(u.z - p.z) < abs(p.z - d.z) ? u - p : p - d, n = normalize(cross(dx, dy));
        vec3 t = normalize(abs(n.y) < 0.99 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0))), b = cross(n, t);
        float turn = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))), occ = 0.0;
        for (int i = 0; i < 16; i++) {
          float f = (float(i) + 0.5) / 16.0, rr = sqrt(f), a = turn + float(i) * 2.39996323;
          vec3 sp = p + (t * cos(a) * rr + b * sin(a) * rr + n * sqrt(1.0 - f)) * uRadius * mix(0.2, 1.0, f);
          vec4 c = uProj * vec4(sp, 1.0); vec2 suv = c.xy / c.w * 0.5 + 0.5;
          if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
          float sz = eye(suv).z;
          occ += step(sp.z + 0.02 * uRadius, sz) * smoothstep(0.0, 1.0, uRadius / max(abs(p.z - sz), 1e-4));
        }
        gl_FragColor = vec4(vec3(1.0 - uStrength * occ / 16.0), 1.0);
      }`,
    blending: THREE.MultiplyBlending, depthTest: false, depthWrite: false, transparent: true, toneMapped: false
  });
  { const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), aoMat); q.frustumCulled = false; aoScene.add(q); }
  function contactShade(v, y) {
    const r = v.rect, k = Math.min(2, renderer.getPixelRatio()), w = Math.max(2, Math.round(r.w * k)), h = Math.max(2, Math.round(r.h * k));
    if (!aoRT) { aoRT = new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h, THREE.UnsignedIntType), minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); }
    else if (aoRT.width !== w || aoRT.height !== h) aoRT.setSize(w, h);
    const hidden = [];
    scene.traverse(o => {
      if (!o.visible || !(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
      const m = o.material;
      if (o === sky || !o.isMesh || m.transparent || m.depthWrite === false || m.side === THREE.BackSide || m.colorWrite === false) { o.visible = false; hidden.push(o); }
    });
    const sceneryOn = scenery.group.visible; scenery.group.visible = false;
    scene.overrideMaterial = aoDepth; renderer.setRenderTarget(aoRT); renderer.clear(); renderer.render(scene, v.cam);
    scene.overrideMaterial = null; renderer.setRenderTarget(null); scenery.group.visible = sceneryOn; for (const o of hidden) o.visible = true;
    aoMat.uniforms.tDepth.value = aoRT.depthTexture; aoMat.uniforms.uProj.value.copy(v.cam.projectionMatrix); aoMat.uniforms.uProjInv.value.copy(v.cam.projectionMatrixInverse); aoMat.uniforms.uRes.value.set(w, h);
    renderer.setViewport(r.x, y, r.w, r.h); renderer.setScissor(r.x, y, r.w, r.h);
    const auto = renderer.autoClear; renderer.autoClear = false; renderer.render(aoScene, aoCam); renderer.autoClear = auto;
  }
  function frame(now) {
    raf = 0; if (!alive) return;
    let more = false;
    for (const f of [...ticks]) if (f(now) === true) more = true; else ticks.delete(f);
    if (need || more) {
      const H = renderer.domElement.height / renderer.getPixelRatio();
      for (const v of V) {
        if (v.off) continue;
        place(v); const r = v.rect, y = H - r.y - r.h;
        // each view gets its own tight shadow map, centred on what it looks at
        const s = Math.max(v.base.w, v.base.h) * .8;
        // The shadow's depth is measured across only the slice of yard this view shows, and the slack that
        // stops a lit face shadowing itself is a fixed tenth of an inch. (With the slack tied to a deep
        // slice, a brace's shadow started most of an inch away from the brace.)
        const reach = s * 1.5 + 12, near = Math.max(1, SUN_FT - reach), far = SUN_FT + reach + soilDepth;
        Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near, far }); sun.shadow.camera.updateProjectionMatrix();
        sun.shadow.bias = -.1 * IN / (far - near);
        // a view that looks from the far side gets its sun from that side too
        const side = v.yaw0 ? Math.sign(Math.cos(v.yaw0)) || 1 : 1;
        sun.target.position.set(v.target.x, 0, 0); sun.position.set(v.target.x - 22 * side, 34, 30 * side); sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
        skyMat.uniforms.uSun.value.set(-22 * side, 34, 30 * side).normalize(); frontLawn.visible = side < 0;
        renderer.shadowMap.needsUpdate = true;
        renderer.setViewport(r.x, y, r.w, r.h); renderer.setScissor(r.x, y, r.w, r.h);
        renderer.render(scene, v.cam);
        if (fine) contactShade(v, y);
      }
      need = false; for (const f of afters) f();
      clearTimeout(fineTimer); if (!more && !fine && !fineOff) fineTimer = setTimeout(refine, 260);
    }
    if (more) kick();
  }
  const ro = new ResizeObserver(() => layout()); ro.observe(wrap);
  const io = new IntersectionObserver(([e]) => { onscreen = e.isIntersecting; if (onscreen) dirty(); }); io.observe(wrap);
  cv.addEventListener('webglcontextlost', e => { if (!alive) return;   // closing a tool drops its own picture on purpose
    e.preventDefault(); wrap.classList.add('lost'); if (fine) { fineOff = true; try { sessionStorage.setItem('gfs-lab-fine', 'off'); } catch (err) { /* private mode */ } } fine = false; clearTimeout(fineTimer); });
  cv.addEventListener('webglcontextrestored', () => { wrap.classList.remove('lost'); renderer.setPixelRatio(basePR); layout(); });

  // ── touch: one finger sideways turns, two fingers pinch to zoom or drag up/down to tilt; double tap resets ──
  cv.style.touchAction = turnWithOneFinger ? 'pan-y' : 'none';
  const pts = new Map(); let pinch = null, drag = null, lastTap = 0;
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }; };
  cv.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const t = two(); pinch = { ...t, zoom: orbit.zoom, pitch: orbit.pitch, yaw: orbit.yaw }; drag = null; }
    else if (pts.size === 1 && turnWithOneFinger) {
      drag = { x: e.clientX, y: e.clientY, yaw: orbit.yaw, pitch: orbit.pitch, on: false, mouse: e.pointerType === 'mouse' };
      const now = performance.now(); if (now - lastTap < 320) reset(); lastTap = now;
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const t = two(); orbit.zoom = clamp(pinch.zoom * t.d / Math.max(30, pinch.d), .8, 4); orbit.pitch = clamp(pinch.pitch + (t.y - pinch.y) * .004, -.02, .6); if (!turnWithOneFinger) orbit.yaw = clamp(pinch.yaw - (t.x - pinch.x) * .005, -.7, .7); orbit.user = true; dirty(); return; }
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
  // cz: the depth the box is framed at (default the cut plane, z = 0)
  function frameView(id, { cx, cy, w, h, cz = 0 }, ms = 0) {
    const v = V.find(x => x.id === id) || V[0];
    const from = { x: v.target.x, y: v.target.y, z: v.target.z, w: v.base.w, h: v.base.h }, to = { x: cx, y: cy, z: cz, w, h };
    if (!ms || reduce.matches) { v.target.set(cx, cy, cz); v.base = { w, h }; dirty(); return; }
    const t0 = performance.now();
    ticks.add(function f(now) { const k = ease(clamp((now - t0) / ms, 0, 1)); v.target.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, from.z + (to.z - from.z) * k); v.base = { w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k }; need = true; return k < 1; }); kick();
  }

  // ── labels pinned to points in the scene (HTML, so the text stays sharp) ──
  const pins = [];
  const vec = new THREE.Vector3();
  function placePins() {
    for (const p of pins) {
      const v = V.find(x => x.id === p.view) || V[0];
      if (!p.on || v.off) { p.el.style.opacity = 0; continue; }
      p.el.firstElementChild.style.maxWidth = Math.min(240, Math.round(v.rect.w - 12)) + 'px';
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
  // up: px to raise the label above its spot (so labels in a row can be staggered at any zoom)
  function pin(view, at, html, cls = '', { up = 0 } = {}) {
    const el = document.createElement('div'); el.className = 'l3d-pin ' + cls; el.innerHTML = `<span>${html}</span>`; over.append(el);
    if (up) { el.classList.add('up'); el.style.setProperty('--up', up + 'px'); }
    const p = { view, at: at.clone(), el, on: true }; pins.push(p);
    return { set(h) { el.firstElementChild.innerHTML = h; }, show(on) { if (p.on !== !!on) { p.on = !!on; need = true; kick(); } }, move(v) { p.at.copy(v); }, el };
  }

  // the yard's ground: frozen from thawedFt down to depthFt (lens 0–1 = how much ice forms in seams),
  // snow on the lawn (0–1), and the colour of the soil under the topsoil (clay or sand)
  const ground = {
    frost(depthFt, lens = 1, thawedFt = 0) { for (const m of [G.topsoil, G.clay]) m.userData.u.uFrost.value.set(Math.max(0, thawedFt), Math.max(0, depthFt), lens); dirty(); },
    snow(k) { G.lawn.userData.u.uSnow.value = clamp(k, 0, 1); scenery.snow(clamp(k, 0, 1)); skyMat.uniforms.uCloud.value = .42 + .58 * clamp(k * 1.6, 0, 1); skyMat.uniforms.bot.value.copy(farGreen).lerp(farSnow, clamp(k, 0, 1)); dirty(); },
    // keep grass off something that sits in the lawn (a concrete collar): centre x, z and radius, ft
    clearGrass(x, z, r) { scenery.clear(x, z, r); dirty(); },
    subsoil(hex) { const ref = surfaceMaterial(THREE, 'soil', hex); G.clay.color.copy(ref.color); ref.dispose(); dirty(); }
  };

  layout();
  return {
    // where a point on screen lands on the vertical plane z = z0 (or null): { x, y, view }
    pick(clientX, clientY, z0 = 0) {
      const r = cv.getBoundingClientRect(), px = clientX - r.left, py = clientY - r.top;
      const v = V.find(v => !v.off && px >= v.rect.x && px <= v.rect.x + v.rect.w && py >= v.rect.y && py <= v.rect.y + v.rect.h); if (!v) return null;
      const ndc = new THREE.Vector2((px - v.rect.x) / v.rect.w * 2 - 1, -((py - v.rect.y) / v.rect.h * 2 - 1));
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, v.cam);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z0), new THREE.Vector3());
      return hit ? { x: hit.x, y: hit.y, view: v.id } : null;
    },
    THREE, scene, root, renderer, sun, views: V, orbit, wrap, over, ground, setGrade, grade: x => grade(x),
    dirty, tick(f) { ticks.add(f); kick(); }, frameView, reset, hole, pin,
    get stacked() { return stacked; }, get solo() { return solo; }, layout,
    dispose() {
      alive = false; cancelAnimationFrame(raf); clearTimeout(fineTimer); stages.delete(dirty); aoRT?.depthTexture?.dispose(); aoRT?.dispose(); aoMat.dispose(); aoDepth.dispose(); ro.disconnect(); io.disconnect();
      scene.traverse(o => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); });
      for (const m of [G.topsoil, G.clay, G.lawn]) m.dispose(); for (const t of G.maps) t.dispose();
      envRT.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); wrap.remove();
    }
  };
}

// ── fences from the Executive App's models ──────────────────────
// Builds one straight run and returns its parts, each instance with its kind, its box and its matrix,
// so a tool can hide, reveal or move single posts, rails and pickets.
// grade(x): ground height along the run (the fence follows it); level: keep each section level and
// step it, the way a store panel goes up on a slope.
export function fence(name, x0, x1, { h = 6, z = 0, noDig, specs, grade, level = false, gates, extra, pts } = {}) {
  const E = engine(name, specs), lib = new E.MatLib(), B = new E.FenceBuilder(lib);
  const spec = Object.assign({}, E.parse(name) || {}, extra || {}); if (noDig != null) spec.noDig = noDig;
  const gy = grade || (() => 0);
  // pts: [[x, y], …] runs the fence through each point (a post at each), instead of x0 → x1 on the grade
  const run = { pts: pts ? pts.map(([x, y, pz]) => ({ x, y, z: pz ?? z })) : [{ x: x0, y: gy(x0), z }, { x: x1, y: gy(x1), z }], spec, h, styleName: name, racked: !level, gateOpen: 0, i: 0, ...(gates ? { gates } : {}) };
  E.buildRun(B, run, { gateOpen: 0 });
  const group = B.flush(), parts = [];
  trueToLumber(group);
  easeLumber(group);
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
  sharpen(group);
  return { group, parts, spec, run, lib };
}
// On a slope the app's model sets the flat top 2×4 a hair low, so its downhill corner dips into the
// square-cut top of a box (about ¼ in at 1 in 12). This rests each rail on what it sits on instead.
export function settleRails(F) {
  const L = solids(F.group), rails = L.filter(s => s.kind === 'rail'), posts = L.filter(s => s.kind === 'post'), M = new THREE.Matrix4();
  let moved = 0;
  for (const r of rails) {
    let up = 0; for (const p of posts) { const k = sink(r, p); if (k > 0 && p.c.y < r.c.y) up = Math.max(up, k / Math.max(.2, r.axes[1].y)); }
    if (up > 1e-5) { r.ref.mesh.getMatrixAt(r.ref.i, M); M.elements[13] += up + 1e-4; r.ref.mesh.setMatrixAt(r.ref.i, M); r.ref.mesh.instanceMatrix.needsUpdate = true; moved++;
      const part = F.parts.find(p => p.mesh === r.ref.mesh && p.i === r.ref.i); if (part) { part.base.copy(M); part.box.translate(new THREE.Vector3(0, up, 0)); } }
  }
  return moved;
}
// Where a fence changes slope at a post, the square-cut ends of the two bays' rails meet at an angle
// and their corners reach into each other (a carpenter would trim one). Trims each such end back
// along its own length just enough to clear.
export function trimRailJoints(F, kinds = ['rail', 'kick', 'reveal']) {
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), M = new THREE.Matrix4();
  let trimmed = 0;
  for (let pass = 0; pass < 4; pass++) {
    const rails = solids(F.group).filter(s => kinds.includes(s.kind)); let any = false;
    for (let i = 0; i < rails.length; i++) for (let j = i + 1; j < rails.length; j++) {
      const a = rails[i], b = rails[j], k = sink(a, b); if (k <= 1e-5) continue;
      const pa = a.ref.mesh.userData.parts?.[a.ref.i], pb = b.ref.mesh.userData.parts?.[b.ref.i];
      if (!pa || !pb || pa.bay === pb.bay || pa.kind !== pb.kind) continue;
      const mid = a.c.clone().add(b.c).multiplyScalar(.5);
      for (const r of [a, b]) {
        const ax = r.axes[0], toward = Math.sign(mid.clone().sub(r.c).dot(ax)) || 1, len = r.half[0] * 2, d = k / 2 + 1e-4;
        r.ref.mesh.getMatrixAt(r.ref.i, M); M.decompose(P, Q, S); S.x *= (len - d) / len; P.addScaledVector(ax, -toward * d / 2); M.compose(P, Q, S);
        r.ref.mesh.setMatrixAt(r.ref.i, M); r.ref.mesh.instanceMatrix.needsUpdate = true;
      }
      any = true; trimmed++;
    }
    if (!any) break;
  }
  return trimmed;
}
// Lifts each `what` part (pickets) off a `on` part (a kickboard) it reaches into: on a slope a square-cut
// picket bottom meets a sloped kickboard at one corner.
export function settleOn(F, what, on) {
  let moved = 0;
  for (let pass = 0; pass < 4; pass++) { const n = settleOnce(F, what, on); moved += n; if (!n) break; }
  return moved;
}
function settleOnce(F, what, on) {
  const L = solids(F.group), A = L.filter(s => s.kind === what), B = L.filter(s => s.kind === on), M = new THREE.Matrix4();
  let moved = 0;
  for (const a of A) { let up = 0; for (const b of B) { const k = sink(a, b); if (k > 0 && b.c.y < a.c.y) up = Math.max(up, k / Math.max(.2, a.axes[1].y)); }
    if (up > 1e-5) { a.ref.mesh.getMatrixAt(a.ref.i, M); M.elements[13] += up + 1e-4; a.ref.mesh.setMatrixAt(a.ref.i, M); a.ref.mesh.instanceMatrix.needsUpdate = true; moved++; } }
  return moved;
}
// On a slope the app's racked vinyl keeps each post the height it has on flat ground, so where the
// sloped top rail runs into a post its upper edge reaches into the cap. On a real slope the post is cut
// taller to suit; this does the same: each such post (and its caps) is raised until the cap clears.
export function settleCaps(F) {
  const L = solids(F.group), caps = L.filter(s => s.kind === 'cap'), rails = L.filter(s => s.kind === 'rail'), posts = L.filter(s => s.kind === 'post'), M = new THREE.Matrix4();
  const need = new Map();   // post x → how much taller
  for (const c of caps) for (const r of rails) { const k = sink(c, r); if (k > 0) { const key = Math.round(c.c.x * 48); need.set(key, Math.max(need.get(key) || 0, k + 1e-3)); } }
  const P = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
  for (const [key, up] of need) {
    for (const c of caps.filter(c => Math.round(c.c.x * 48) === key)) { c.ref.mesh.getMatrixAt(c.ref.i, M); M.elements[13] += up; c.ref.mesh.setMatrixAt(c.ref.i, M); c.ref.mesh.instanceMatrix.needsUpdate = true; }
    for (const p of posts.filter(p => Math.round(p.c.x * 48) === key)) { const m = p.ref.mesh; m.getMatrixAt(p.ref.i, M); M.decompose(P, Q, S); const h = p.half[1] * 2; S.y *= (h + up) / h; P.y += up / 2; M.compose(P, Q, S); m.setMatrixAt(p.ref.i, M); m.instanceMatrix.needsUpdate = true; }
  }
  return need.size;
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
  const m = new THREE.Mesh(/^(pt|cedar)$/.test(material?.userData?.gfsKind || '') ? easedBox(g) : g, material); m.castShadow = m.receiveShadow = true; return m;
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
// A two-man post-hole auger: a helical flight on a shaft with a fishtail point and two cutting blades,
// a gearbox and small engine on top, and a tube handle frame with a grip at each corner.
export function auger(diaIn = 10) {
  const g = new THREE.Group(), R = diaIn / 2 * IN, L = 4, turns = 6, r0 = .07, N = 360, spin = new THREE.Group();
  const dark = mats().toolDark, paint = mats().tool, worn = mats().toolWorn, rubber = mats().rubber;
  // the flight: a ribbon wound from the shaft out to the hole's radius, with a bright worn edge
  const P = [], I = [], edge = [];
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2 * turns, y = -i / N * (L - .25) - .12, c = Math.cos(a), sn = Math.sin(a), ro = R - .012;
    P.push(r0 * c, y, r0 * sn, ro * c, y - .02, ro * sn); edge.push(new THREE.Vector3(ro * c, y - .02, ro * sn));
    if (i) { const k = i * 2; I.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const ribbon = new THREE.BufferGeometry(); ribbon.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); ribbon.setIndex(I); ribbon.computeVertexNormals();
  const flight = new THREE.Mesh(ribbon, mats().toolDarkBoth), rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), N, .011, 5), worn);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, L + .2, 18), dark); shaft.position.y = -L / 2 + .1;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.075, .32, 4), worn); tip.rotation.x = Math.PI; tip.position.y = -L - .06;       // fishtail point
  const blades = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.BoxGeometry(R - .03, .03, .16), worn); m.position.set((k ? -1 : 1) * (R + .02) / 2, -L + .08, 0); m.rotation.x = (k ? -1 : 1) * .5; return m; });
  for (const m of [flight, rim]) m.userData.roundR = R; shaft.userData.roundR = r0; tip.userData.roundR = .08;   // what each sweeps as it spins
  spin.add(flight, rim, shaft, tip, ...blades);
  // the powerhead
  const at = (m, x, y, z) => { m.position.set(x, y, z); return m; }, cyl = (r, h, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  const coupler = at(cyl(.1, .22, dark), 0, .12, 0), gearbox = at(cyl(.24, .26, paint, 28), 0, .36, 0);
  const engine = at(new THREE.Mesh(creased(new THREE.BoxGeometry(.46, .4, .44, 3, 3, 3), 60), paint), 0, .69, 0);
  { const p = engine.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / .23, y = p.getY(i) / .2, z = p.getZ(i) / .22, k = 1 - .06 * (Math.abs(x * y) + Math.abs(y * z) + Math.abs(x * z)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } engine.geometry.computeVertexNormals(); }
  const tank = at(cyl(.15, .34, dark, 22), 0, .98, 0); tank.rotation.z = Math.PI / 2;
  const cap = at(cyl(.045, .05, worn, 14), .06, 1.14, 0), recoil = at(cyl(.15, .06, dark, 22), 0, .7, .25); recoil.rotation.x = Math.PI / 2;
  const muffler = at(cyl(.07, .22, worn, 14), -.28, .72, 0); muffler.rotation.x = Math.PI / 2;
  // handle frame: two bars across, joined at the ends, with rubber grips
  const HX = 1.12, HZ = .34, HY = .4, bar = (len, mat, r = .032) => cyl(r, len, mat, 12), frame = [];
  for (const z of [-HZ, HZ]) { const b = at(bar(HX * 2, dark), 0, HY, z); b.rotation.z = Math.PI / 2; frame.push(b); for (const x of [-HX, HX]) { const gr = at(bar(.42, rubber, .045), x - Math.sign(x) * .25, HY, z); gr.rotation.z = Math.PI / 2; frame.push(gr); } }
  for (const x of [-HX, HX, -.3, .3]) { const b = at(bar(HZ * 2, dark), x, HY, 0); b.rotation.x = Math.PI / 2; frame.push(b); }
  g.add(spin, coupler, gearbox, engine, tank, cap, recoil, muffler, ...frame); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.spin = spin; g.userData.L = L; return g;
}
// A gas post driver: the barrel that drops over the pipe, a collar at its mouth, a handle each side
// and the small engine on top.
export function driver() {
  const g = new THREE.Group(), dark = mats().toolDark, paint = mats().tool, worn = mats().toolWorn, rubber = mats().rubber;
  const cyl = (r0, r1, h, mat, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat), at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
  const body = at(cyl(.19, .19, 1.7, paint), 0, .85, 0), collar = at(cyl(.2, .2, .1, dark), 0, .05, 0), band = at(cyl(.195, .195, .06, dark), 0, 1.2, 0);
  const top = at(cyl(.13, .19, .22, dark), 0, 1.81, 0), engine = at(new THREE.Mesh(new THREE.BoxGeometry(.3, .26, .28), dark), 0, 2.03, 0), tank = at(cyl(.1, .1, .26, paint, 18), 0, 2.2, 0); tank.rotation.z = Math.PI / 2;
  const pull = at(cyl(.09, .09, .05, worn, 18), 0, 2.03, .16); pull.rotation.x = Math.PI / 2;
  const parts = [body, collar, band, top, engine, tank, pull];
  for (const sx of [-1, 1]) {       // a D handle each side, with a rubber grip
    const d = at(new THREE.Mesh(new THREE.TorusGeometry(.2, .028, 8, 22, Math.PI), dark), sx * .19, .95, 0); d.rotation.z = -sx * Math.PI / 2;
    const grip = at(cyl(.04, .04, .22, rubber, 12), sx * .39, .95, 0); parts.push(d, grip);
  }
  g.add(...parts); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
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
// Every solid that is showing, as an oriented box (its own bounding box turned the way the part is
// turned), so a rail sloped along the grade is tested as the sloped board it is. Boards that touch
// are fine; two boxes that sink into each other by more than `tolIn` inches (the least they would
// have to move apart; 1/16 in, a carpenter's tolerance) are reported. Pass pairs that are meant to meet (a nail in a board, a vinyl
// rail into its post) in `allow(a, b)`.
export function solids(root) {
  const out = [], m = new THREE.Matrix4(), b = new THREE.Box3(), c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh || !o.visible || o.userData.noCheck) return;
    for (let p = o.parent; p; p = p.parent) if (!p.visible) return;
    if (!o.geometry.attributes.position?.count) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const gb = o.geometry.boundingBox, n = o.isInstancedMesh ? o.count : 1;
    for (let i = 0; i < n; i++) {
      if (o.isInstancedMesh) { o.getMatrixAt(i, m); if (Math.abs(m.determinant()) < 1e-12) continue; m.premultiply(o.matrixWorld); } else m.copy(o.matrixWorld);
      b.copy(gb).applyMatrix4(m);
      const e = m.elements, cols = [0, 4, 8].map(k => new THREE.Vector3(e[k], e[k + 1], e[k + 2])), len = cols.map(v => v.length());
      let axes = cols.map((v, k) => v.multiplyScalar(1 / (len[k] || 1))), half = [0, 1, 2].map(k => (gb.max.getComponent(k) - gb.min.getComponent(k)) / 2 * len[k]);
      gb.getCenter(c).applyMatrix4(m);
      // a part that spins about its own upright axis (an auger bit) reaches only its radius, at any angle
      if (o.userData.roundR) { const r = o.userData.roundR * m.getMaxScaleOnAxis(); c.setFromMatrixPosition(m).y = (b.min.y + b.max.y) / 2; axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]; half = [r, (b.max.y - b.min.y) / 2, r]; b.min.x = c.x - r; b.max.x = c.x + r; b.min.z = c.z - r; b.max.z = c.z + r; }
      const part = o.userData.parts?.[i];
      out.push({ ref: { mesh: o, i }, name: o.userData.what || part?.kind || o.name || o.geometry.type, kind: part?.kind || o.userData.what || '', unit: o.userData.unit || '',
        flat: Math.min(...half) < 5e-5, min: b.min.clone(), max: b.max.clone(), c: c.clone(), axes, half });
    }
  });
  return out;
}
// how far two oriented boxes sink into each other (ft); 0 or less means they don't
export function sink(a, b) {
  const d = b.c.clone().sub(a.c), axes = [...a.axes, ...b.axes];
  for (const u of a.axes) for (const v of b.axes) { const w = u.clone().cross(v); if (w.lengthSq() > 1e-8) axes.push(w.normalize()); }
  let least = Infinity;
  for (const L of axes) {
    const ra = a.half.reduce((s, h, k) => s + h * Math.abs(a.axes[k].dot(L)), 0), rb = b.half.reduce((s, h, k) => s + h * Math.abs(b.axes[k].dot(L)), 0);
    least = Math.min(least, ra + rb - Math.abs(d.dot(L)));
    if (least <= 0) return least;
  }
  return least;
}
export function overlaps(list, { tolIn = 1 / 16, allow = () => false } = {}) {
  const tol = tolIn * IN, bad = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (a.flat || b.flat) continue;
    if (a.min.x > b.max.x || b.min.x > a.max.x || a.min.y > b.max.y || b.min.y > a.max.y || a.min.z > b.max.z || b.min.z > a.max.z) continue;
    if (allow(a, b) || allow(b, a)) continue;
    const k = sink(a, b);
    if (k > tol) bad.push({ a: a.name, b: b.name, inches: +(k * 12).toFixed(3), at: [a.c.x, a.c.y, a.c.z].map(v => +(v * 12).toFixed(2)) });
  }
  return bad;
}
// ── concrete in the cut face, any outline ───────────────────────
// outline: the footing's side in the cut, as [x, y] inches (x across, y up from its bottom), convex.
// The square post (width 2a in) stands in it down to postBotIn; the post is drawn whole, so the cut
// is the outline less that strip.
function clipPoly(poly, axis, v, keepBelow) {
  const out = [], inside = p => keepBelow ? p[axis] <= v + 1e-9 : p[axis] >= v - 1e-9;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (v - a[axis]) / (b[axis] - a[axis]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
export function concreteCut(outlineIn, postHalfIn, postBotIn, material) {
  const pieces = [clipPoly(outlineIn, 0, -postHalfIn, true), clipPoly(outlineIn, 0, postHalfIn, false), clipPoly(clipPoly(clipPoly(outlineIn, 0, -postHalfIn, false), 0, postHalfIn, true), 1, postBotIn, true)].filter(p => p.length >= 3);
  const pos = [], uv = [], idx = [];
  for (const poly of pieces) { const k = pos.length / 3; for (const [x, y] of poly) { pos.push(x * IN, y * IN, 0); uv.push(x * IN, y * IN); } for (let i = 1; i + 1 < poly.length; i++) idx.push(k, k + i, k + i + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 2 ? 1 : 0), 3)); g.setIndex(idx); g.computeBoundingBox(); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, material); m.receiveShadow = true; m.position.z = .004; return m;
}
// The part of a footing that has been pushed up out of the ground: its back half, as a short wall.
export function collar(rIn, material) {
  const g = new THREE.CylinderGeometry(rIn * IN, rIn * IN, 1, 28, 1, true, Math.PI / 2, Math.PI); g.translate(0, .5, 0);
  const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true;
  m.userData.set = h => { m.visible = h > 1e-3; m.scale.y = Math.max(1e-3, h); }; m.userData.set(0); return m;
}
// A flat rectangle in the cut face (a gap, or slumped soil), set by its bottom and height in feet.
export function facePatch(wFt, material) {
  const g = new THREE.PlaneGeometry(wFt, 1); g.translate(0, .5, 0);
  const m = new THREE.Mesh(g, material); m.position.z = .003; m.receiveShadow = true;
  m.userData.set = (y0, h) => { m.visible = h > 1e-3; m.position.y = y0; m.scale.y = Math.max(1e-3, h); }; m.userData.set(0, 0); return m;
}
// Small arrows drawn on the cut face: frost gripping (up) and unfrozen soil holding (down).
export function arrows(color) {
  const s = new THREE.Shape(); s.moveTo(0, .5); s.lineTo(-.45, -.05); s.lineTo(-.16, -.05); s.lineTo(-.16, -.5); s.lineTo(.16, -.5); s.lineTo(.16, -.05); s.lineTo(.45, -.05); s.closePath();
  const im = new THREE.InstancedMesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }), 240);
  im.count = 0; im.renderOrder = 4; im.frustumCulled = false; im.userData.noCheck = true;
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Quaternion(), down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  im.userData.draw = list => { im.count = 0; for (const a of list) { P.set(a.x, a.y, .012); S.setScalar(a.s); M4.compose(P, a.down ? down : up, S); im.setMatrixAt(im.count++, M4); } im.instanceMatrix.needsUpdate = true; };
  return im;
}
