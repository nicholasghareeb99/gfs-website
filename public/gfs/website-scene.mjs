// Website presentation only. Geometry remains the executive viewer's exact code.
if(new URLSearchParams(location.search).get('studio')==='1')import('./fence-studio-scene.mjs').catch(error=>console.warn('[Fence studio] Presentation module unavailable:',error.message));
if(new URLSearchParams(location.search).has('website')){
 document.documentElement.classList.add('website-model');
 const css=document.createElement('style');css.textContent=`.website-model #c{width:100vw;height:100dvh;display:block}.website-model header,.website-model #sheet,.website-model #btnMove,.website-model #btnExpand{display:none!important}.website-model #hud{top:12px;left:12px;max-width:calc(100vw - 345px);padding:10px 13px;background:#fffffff0;border:1px solid #d7ddd2;border-radius:9px}.website-model #hudStyle{max-width:30vw}.website-model .ws-viewer-controls{top:10px;right:12px;background:#fffffff0}.website-model #rail{top:82px;right:12px}.website-model .ws-viewer-controls button{min-height:38px}.website-model #hud b{color:#3a644a}@media(max-width:700px){.website-model .gfs-fence-layers>div{grid-template-columns:repeat(2,minmax(0,1fr))!important}.website-model .gfs-fence-layers button{min-width:0;white-space:normal}.website-model #hud{top:10px;left:10px;right:10px;max-width:none;font-size:10px}.website-model #hudStyle{max-width:54vw}.website-model #rail{top:67px;right:10px}.website-model .ws-viewer-controls{top:auto;bottom:12px;left:10px;right:auto;max-width:calc(100vw - 20px);padding:5px 8px}.website-model .ws-viewer-controls select{min-height:36px;font-size:11px}.website-model .ws-viewer-controls label:first-child{display:none}.website-model .ws-viewer-controls button{min-height:40px}.website-model #rail .rbtn{width:40px;height:42px}}`;document.head.append(css);
 let tries=0;const timer=setInterval(()=>{
  const api=window.__f3d,T=window.THREE,renderer=window.__rend?.(),controls=document.querySelector('.ws-viewer-controls');
  if(!api||!T||!renderer||!controls){if(++tries>120)clearInterval(timer);return;}
  clearInterval(timer);
  // The dedicated studio installs its own lighting; avoid duplicate PMREM allocation.
  if(new URLSearchParams(location.search).get('studio')!=='1'){
  // Large softboxes give vinyl and metal natural highlights without changing their saved colors.
  const room=new T.Scene();room.background=new T.Color(0x7c857f);
  for(const [x,y,z,w,h,power] of [[-35,30,10,28,35,3.5],[28,22,-18,22,28,2.5],[0,55,0,45,45,2]]){
   const material=new T.MeshBasicMaterial({color:new T.Color(1,1,.96).multiplyScalar(power),side:T.DoubleSide});
   const panel=new T.Mesh(new T.PlaneGeometry(w,h),material);panel.position.set(x,y,z);panel.lookAt(0,5,0);room.add(panel);
  }
  const generator=new T.PMREMGenerator(renderer),environment=generator.fromScene(room,.025);generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  api.scene.environment=environment.texture;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  for(const z of [-24,24]){const fill=new T.DirectionalLight(0xffffff,2.2);fill.position.set(-12,22,z);api.scene.add(fill);}
  }
  const camera=window.__cam(),bounds=new T.Box3().setFromObject(api.fenceGroup);
  function frameFence(){
   camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   let extentX=0,extentY=0;
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new T.Vector3(x,y,z).project(camera);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));
   }
   camera.zoom=Math.max(.2,Math.min(12,.72/Math.max(.001,extentX),.68/Math.max(.001,extentY)));
   camera.updateProjectionMatrix();renderer.render(api.scene,camera);
  }
  for(const id of ['btnReset','btnView'])document.getElementById(id)?.addEventListener('click',frameFence);
  window.addEventListener('resize',()=>requestAnimationFrame(frameFence));frameFence();
  const quality=controls.querySelector('[aria-label="Render quality"]');
  function enhance(){
   if(quality.value==='presentation'){
    const pixelBudget=4000000,ratio=Math.min(2,Math.sqrt(pixelBudget/(innerWidth*innerHeight)));
    renderer.setPixelRatio(Math.max(1,ratio));renderer.setSize(innerWidth,innerHeight,false);
    const sun=api.scene.children.find(o=>o.isDirectionalLight&&o.castShadow),size=Math.min(renderer.capabilities.maxTextureSize,matchMedia('(pointer: coarse)').matches?2048:4096);
    if(sun&&sun.shadow.mapSize.x!==size){sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.mapSize.set(size,size);}
   }
   renderer.shadowMap.needsUpdate=true;renderer.render(api.scene,window.__cam());
  }
  quality.value=new URLSearchParams(location.search).get('studio')==='1'?'auto':'presentation';quality.dispatchEvent(new Event('change'));quality.addEventListener('change',enhance);window.addEventListener('resize',enhance);enhance();document.documentElement.dataset.modelReady='1';
 },150);
}
