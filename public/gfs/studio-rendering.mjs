// Shared by the workspace and the customer-facing standalone viewer.
// All measurements remain in the existing builders; materials only affect appearance.
import {requireCompleteGateModel} from './model-review.mjs';
import {withCompleteFence} from './fence-layers.mjs';
export const RENDER_VERSION = 'studio-7-wellington-lawn';
export function qualityProfile(mode = 'auto', {dpr = 1, mobile = false, maxTextureSize = 4096} = {}) {
  const field = mode === 'field' || (mode === 'auto' && mobile);
  return {mode, pixelRatio: Math.min(dpr, field ? 1.25 : mode === 'presentation' ? 2 : 1.75),
    shadowSize: Math.min(maxTextureSize, field ? 1024 : 2048),
    exportWidth: Math.min(maxTextureSize, mode === 'field' ? 1600 : mobile ? 2400 : 3840)};
}
export function autoBoolean(value, fallback = false) {
  if (value == null || value === '' || value === 'auto') return !!fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
}
export function shotKey(name, height, options = {}, spec = {}) {
  return JSON.stringify([RENDER_VERSION, name, height, options, spec]);
}
const textureSets = new WeakMap();
function random(seed) { return () => ((seed = Math.imul(seed ^ seed >>> 15, 1 | seed) + 0x6d2b79f5 | 0) >>> 0) / 4294967296; }
function textures(T) {
  if (textureSets.has(T)) return textureSets.get(T);
  const cache = new Map();
  function make(kind, channel) {
    // Height and roughness use identical neutral grain: share the same GPU texture.
    const key = kind + (channel === 'color' ? 'color' : 'surface');
    if (cache.has(key)) return cache.get(key);
    const wood = kind === 'wood' || kind === 'grain', S = wood ? 1024 : 512;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), rand = random(wood ? 2841 : 9137);
    const data = channel !== 'color';
    g.fillStyle = data ? '#bdbdbd' : '#ffffff'; g.fillRect(0, 0, S, S);
    if (wood) {
      // Neutral, continuous long grain. Saved cedar/PT/vinyl colors supply the albedo.
      const knots = Array.from({length: 8}, () => ({x: rand()*S, y: rand()*S, r: 10+rand()*19}));
      for (let i=0; i<1100; i++) {
        const x=rand()*S, phase=rand()*6.28;
        g.strokeStyle=`rgba(0,0,0,${data ? .05+rand()*.18 : .018+rand()*.065})`;
        g.lineWidth=.35+rand()*1.7; g.beginPath();
        for (let y=0; y<=S; y+=8) {
          let bend = Math.sin(y/S*6.28+phase)*2.2;
          for (const k of knots) {const dx=x-k.x, dy=y-k.y; bend += Math.sign(dx)*k.r*.7*Math.exp(-dx*dx/(k.r*k.r*5)-dy*dy/(k.r*k.r*14));}
          if (!y) g.moveTo(x+bend,y); else g.lineTo(x+bend,y);
        }
        g.stroke();
      }
      if (kind === 'wood') for (const k of knots) {
        for (let i=1; i<9; i++) {
          g.strokeStyle=`rgba(0,0,0,${data ? .11 : .045})`; g.lineWidth=.7;
          g.beginPath(); g.ellipse(k.x,k.y,k.r*i/9*.32,k.r*i/9*1.8,0,0,Math.PI*2); g.stroke();
        }
      }
    } else {
      for(let i=0;i<18000;i++) {const a=rand()*(data?.09:.018);g.fillStyle=`rgba(0,0,0,${a})`;g.fillRect(rand()*S,rand()*S,1,1);}
      if (kind === 'galv') for(let i=0;i<300;i++) {
        const x=rand()*S,y=rand()*S,r=4+rand()*19;
        g.fillStyle=`rgba(0,0,0,${data?.08+rand()*.18:.025+rand()*.07})`;g.beginPath();
        for(let j=0;j<6;j++){const a=j*Math.PI/3,rr=r*(.6+rand()*.4);g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();
      }
    }
    const t = new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;
    t.colorSpace=data?T.NoColorSpace:T.SRGBColorSpace;t.anisotropy=8;
    t.repeat.set(wood?1:3,wood?.42:3); cache.set(key,t);return t;
  }
  textureSets.set(T,make);return make;
}
export function enhanceMaterials(MatLib, T) {
  const p=MatLib.prototype;if(p._studio4)return;p._studio4=true;
  const tex=textures(T);
  function surface(kind,hex) {
    const wood=kind==='wood',grain=kind==='grain',vinyl=kind==='vinyl',galv=kind==='galv';
    return new T.MeshPhysicalMaterial({color:hex,map:tex(kind,'color'),
      bumpMap:tex(kind,'height'),bumpScale:wood?.007:grain?.002:.00035,
      roughnessMap:tex(kind,'roughness'),roughness:wood?.91:grain?.54:vinyl?.48:galv?.48:.64,
      metalness:galv?.88:kind==='metal'?.18:0,envMapIntensity:wood?.4:galv?1:.7,
      clearcoat:vinyl||grain?.12:0,clearcoatRoughness:.5});
  }
  for(const [method,kind] of [['wood','wood'],['vinyl','vinyl'],['vinylGrain','grain'],['alu','metal'],['galv','galv']]) {
    p[method]=function(hex){return this._mk(RENDER_VERSION+kind+hex,()=>surface(kind,hex));};
  }
}
export function configureQuality(studio, mode = 'auto') {
  const r=studio.renderer;
  const profile=qualityProfile(mode,{dpr:globalThis.devicePixelRatio||1,
    mobile:globalThis.matchMedia?.('(pointer: coarse)').matches||false,maxTextureSize:r.capabilities.maxTextureSize});
  studio.quality=profile;r.setPixelRatio(profile.pixelRatio);
  if(studio.sun) {
    const shadow=studio.sun.shadow;
    if(shadow.mapSize.x!==profile.shadowSize) {shadow.map?.dispose();shadow.map=null;shadow.mapSize.set(profile.shadowSize,profile.shadowSize);}
    shadow.normalBias=.012;shadow.bias=-.00015;
  }
  studio._resize?.();studio.shadowsDirty?.();return profile;
}
export function setShadowVisibility(studio, on) {
  studio.opts.shadows=!!on;studio.renderer.shadowMap.enabled=!!on;
  studio.shadowsDirty();
}
export function captureFrame(studio,T,width,format='png',quality=.92) {
  requireCompleteGateModel(studio.scene);
  const r=studio.renderer, W=Math.max(320,Math.min(Math.round(width||2000),r.capabilities.maxTextureSize)),H=Math.round(W*9/16);
  const sz=r.getSize(new T.Vector2()),ratio=r.getPixelRatio(),cam=studio.cam;
  const old={aspect:cam.aspect,left:cam.left,right:cam.right};
  try {
    r.setPixelRatio(1);r.setSize(W,H,false);
    if(cam.isOrthographicCamera){const half=Math.abs(cam.top-cam.bottom)/2;cam.left=-half*W/H;cam.right=half*W/H;}else cam.aspect=W/H;
    cam.updateProjectionMatrix();studio._sizeLabels?.();r.shadowMap.needsUpdate=true;
    return withCompleteFence(studio.scene,()=>{r.render(studio.scene,cam);return r.domElement.toDataURL(format==='jpeg'?'image/jpeg':'image/png',quality);});
  } finally {
    r.setPixelRatio(ratio);r.setSize(sz.x,sz.y,false);
    if(cam.isOrthographicCamera){cam.left=old.left;cam.right=old.right;}else cam.aspect=old.aspect;
    cam.updateProjectionMatrix();studio._resize?.();r.shadowMap.needsUpdate=true;studio.invalidate?.();
  }
}
