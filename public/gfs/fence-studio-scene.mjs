// Studio presentation only: no fence geometry or saved material colors change.
export const STUDIO_LIGHTING = Object.freeze({
  daylight: {label:'Daylight',background:0xdce6f0,floor:0x8297ad,key:0xfff5e5,keyPower:1.9,fill:0xd9e7ff,fillPower:.7,front:0xfffaf2,frontPower:1.05,exposure:1.05},
  evening: {label:'Warm evening',background:0xcbd6e4,floor:0x738398,key:0xffd3a0,keyPower:1.95,fill:0xc4dcff,fillPower:.62,front:0xffedda,frontPower:.95,exposure:1}
});
export const studioDefaultQuality = ({coarse=false,width=1200,reducedMotion=false}={}) => coarse || width<=700 || reducedMotion ? 'field' : 'auto';

function installStudio(api,T,renderer,bar){
  if(document.documentElement.dataset.studioReady==='1')return;
  document.documentElement.classList.add('fence-studio-model');
  const css=document.createElement('style');css.id='fence-studio-presentation';
  css.textContent=`
  .fence-studio-model{--navy:#123d67;--gold:#2474ba;background:#dce6f0}
  .fence-studio-model body{background:#dce6f0}
  .studio-caption{position:fixed;top:12px;left:12px;right:12px;z-index:6;pointer-events:none}
  .fence-studio-model .studio-caption #hud{margin:0;padding:9px 12px;border:1px solid #9ab5ce;background:#f6faffed;color:#153e65;box-shadow:0 3px 14px #12375b12;font-size:12px;line-height:1.45;border-radius:9px}
  .fence-studio-model #hud b{color:#153e65}
  .fence-studio-model #hudStyle{max-width:none;white-space:normal;overflow-wrap:anywhere}
  .studio-dock{position:fixed;bottom:max(12px,env(safe-area-inset-bottom));left:12px;right:12px;z-index:8;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;pointer-events:none}
  .studio-dock>*{pointer-events:auto}
  .fence-studio-model .studio-dock #rail{display:flex;flex-direction:row;gap:3px;padding:4px;border:1px solid #a1b9cf;background:#f6fafff5;box-shadow:0 5px 18px #173c6020;border-radius:11px}
  .fence-studio-model .studio-dock #rail .rbtn{width:44px;height:44px;min-width:44px;min-height:44px;color:#164b79;border-radius:7px}
  .fence-studio-model #rail .rbtn:hover,.fence-studio-model #rail .rbtn.on{background:#d8eafa;color:#0d365c}
  .studio-tools{max-width:min(600px,calc(100vw - 24px));border:1px solid #9fb8ce;border-radius:11px;background:#f5fafff5;box-shadow:0 5px 18px #173c6020;color:#164b79}
  .studio-tools>summary{cursor:pointer;min-height:44px;padding:11px 14px;font:650 14px/1.5 system-ui;box-sizing:border-box}
  .fence-studio-model .studio-tools .ws-viewer-controls{display:flex;flex-wrap:wrap;gap:8px 12px;max-height:38dvh;overflow:auto;max-width:100%;margin:0;padding:4px 12px 12px;border:0;box-shadow:none;background:transparent;border-radius:0;color:#254f74;box-sizing:border-box}
  .fence-studio-model .studio-tools .ws-viewer-controls label{display:flex!important;gap:2px;font-size:12px;font-weight:600;min-width:110px;flex:1}
  .fence-studio-model .studio-tools .ws-viewer-controls select{width:100%;max-width:none;min-height:44px;padding:0 7px;border:1px solid #9db7cd;border-radius:6px;background:white;color:#173f65;font:600 14px system-ui}
  .fence-studio-model .studio-tools .ws-viewer-controls button{min-height:44px;border:1px solid #9db7cd;border-radius:6px;background:#e7f1fb;color:#173f65;font:600 13px system-ui;padding:0 10px;flex:1}
  .fence-studio-model .studio-tools [role=status]{color:#244c70;font-size:13px}
  .fence-studio-model :is(button,select,summary):focus-visible{outline:3px solid #136cb7;outline-offset:3px}
  @media(max-width:700px){.studio-caption{top:8px;left:8px;right:8px}.fence-studio-model .studio-caption #hud{padding:7px 10px;font-size:11px}.studio-dock{left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));flex-direction:column;align-items:flex-end;gap:6px}.studio-tools{width:min(100%,350px)}.studio-tools>summary{padding:10px 12px}.fence-studio-model .studio-tools .ws-viewer-controls{gap:8px;max-height:34dvh}.fence-studio-model .studio-tools .ws-viewer-controls label{min-width:120px}}
  @media(prefers-reduced-motion:reduce){.fence-studio-model *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;document.head.append(css);

  // Static positioning inside the dock ignores the original workspace's inline
  // top/left measurements, so its resize observer cannot overlap these controls.
  const dock=document.createElement('div');dock.className='studio-dock';
  const rail=document.getElementById('rail');
  if(rail){rail.style.setProperty('position','static','important');rail.setAttribute('role','toolbar');rail.setAttribute('aria-label','3D camera controls');dock.append(rail);}
  const details=document.createElement('details');details.className='studio-tools';
  const summary=document.createElement('summary');summary.textContent='Lighting & quality';details.append(summary);
  bar.style.setProperty('position','static','important');bar.style.setProperty('width','auto','important');bar.style.setProperty('max-width','100%','important');
  details.append(bar);dock.append(details);document.body.append(dock);
  const hud=document.getElementById('hud');
  if(hud){const caption=document.createElement('div');caption.className='studio-caption';hud.style.setProperty('position','static','important');hud.style.setProperty('width','auto','important');hud.style.setProperty('max-width','100%','important');caption.append(hud);document.body.append(caption);}
  const duplicateSnapshot=document.getElementById('btnSnap');if(duplicateSnapshot)duplicateSnapshot.style.setProperty('display','none','important');
  const labels={btnView:'Change camera view',btnReset:'Reset camera view',btnOrbit:'Start automatic rotation'};
  for(const [id,label]of Object.entries(labels)){const button=document.getElementById(id);if(button){button.setAttribute('aria-label',label);button.title=label;}}

  const lightingLabel=document.createElement('label');lightingLabel.textContent='Lighting';
  const lighting=document.createElement('select');lighting.setAttribute('aria-label','Lighting preset');
  for(const [value,preset]of Object.entries(STUDIO_LIGHTING)){const option=document.createElement('option');option.value=value;option.textContent=preset.label;lighting.append(option);}
  lightingLabel.append(lighting);bar.prepend(lightingLabel);
  const sceneChoice=bar.querySelector('[aria-label="Scene"]');
  const quality=bar.querySelector('[aria-label="Render quality"]');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  if(quality){quality.value=studioDefaultQuality({coarse:matchMedia('(pointer: coarse)').matches,width:innerWidth,reducedMotion:motion.matches});quality.dispatchEvent(new Event('change'));}
  const orbit=document.getElementById('btnOrbit');
  const syncOrbit=()=>{const on=orbit?.classList.contains('on');orbit?.setAttribute('aria-pressed',String(!!on));orbit?.setAttribute('aria-label',on?'Stop automatic rotation':'Start automatic rotation');};
  if(orbit?.classList.contains('on'))orbit.click();syncOrbit();
  orbit?.addEventListener('click',syncOrbit);
  motion.addEventListener('change',()=>{if(motion.matches&&orbit?.classList.contains('on'))orbit.click();});

  // Softer reflection sources preserve surface texture and white panel edges.
  const room=new T.Scene();room.background=new T.Color(0x8b98a8);
  for(const [x,y,z,w,h,power]of [[-32,26,14,24,32,2],[25,20,-20,20,28,1.5]]){
    const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(1,1,1).multiplyScalar(power),side:T.DoubleSide}));
    panel.position.set(x,y,z);panel.lookAt(0,4,0);room.add(panel);
  }
  const generator=new T.PMREMGenerator(renderer),environment=generator.fromScene(room,.06);generator.dispose();
  room.traverse(part=>{part.geometry?.dispose();part.material?.dispose();});
  const showroomFloor=new T.MeshStandardMaterial({color:STUDIO_LIGHTING.daylight.floor,roughness:.93,metalness:0});
  // Broad, unshadowed bounce from both faces keeps boards readable during an
  // orbit, while the existing key light supplies the directional shadows.
  const fenceCenter=new T.Box3().setFromObject(api.fenceGroup).getCenter(new T.Vector3());
  for(const z of [-36,36]){
    const front=new T.DirectionalLight(0xfffaf2,1.05);front.name='Studio soft front fill';front.userData.studioFrontFill=true;
    front.position.copy(fenceCenter).add(new T.Vector3(z<0?-12:12,14,z));front.target.position.copy(fenceCenter);
    api.scene.add(front,front.target);
  }
  function applyLighting(){
    const preset=STUDIO_LIGHTING[lighting.value]||STUDIO_LIGHTING.daylight;
    api.scene.environment=environment.texture;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=preset.exposure;
    const key=api.scene.children.find(light=>light.isDirectionalLight&&light.castShadow);
    for(const light of api.scene.children){
      if(light===key){light.color.setHex(preset.key);light.intensity=preset.keyPower;}
      else if(light.userData?.studioFrontFill){light.color.setHex(preset.front);light.intensity=preset.frontPower;}
      else if(light.isDirectionalLight){light.color.setHex(preset.fill);light.intensity=.2;}
      else if(light.isHemisphereLight){light.color.setHex(preset.fill);light.groundColor.setHex(0x5f7084);light.intensity=preset.fillPower;}
      else if(light.isAmbientLight)light.intensity=.15;
    }
    if(!sceneChoice||sceneChoice.value==='showroom'){
      showroomFloor.color.setHex(preset.floor);api.ground.material=showroomFloor;
      api.scene.background=new T.Color(preset.background);
      if(api.scene.fog)api.scene.fog.color.setHex(preset.background);
    }
    renderer.shadowMap.needsUpdate=true;renderer.render(api.scene,window.__cam());
  }
  lighting.addEventListener('change',applyLighting);sceneChoice?.addEventListener('change',applyLighting);
  for(const id of ['btnReset','btnView'])document.getElementById(id)?.addEventListener('click',()=>requestAnimationFrame(applyLighting));
  applyLighting();document.documentElement.dataset.studioReady='1';
}

if(typeof window!=='undefined'&&new URLSearchParams(location.search).get('studio')==='1'){
  let attempts=0;
  const timer=setInterval(()=>{
    const api=window.__f3d,T=window.THREE,renderer=window.__rend?.(),bar=document.querySelector('.ws-viewer-controls');
    if(document.documentElement.dataset.modelReady==='1'&&api?.ground&&T&&renderer&&bar){
      clearInterval(timer);
      try{installStudio(api,T,renderer,bar);}catch(error){document.documentElement.dataset.studioReady='error';console.warn('[Fence studio] Presentation layer unavailable:',error.message);}
    }else if(++attempts>=200){clearInterval(timer);document.documentElement.dataset.studioReady='timeout';}
  },150);
}
