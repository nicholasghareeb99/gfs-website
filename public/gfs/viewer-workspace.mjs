import {configureQuality,captureFrame} from './studio-rendering.mjs';
import {openAR} from './ar-workspace.mjs';
import {mountFenceLayerControls} from './fence-layers.mjs';
const icons={btnView:'◫',btnReset:'↺',btnMove:'✥',btnOrbit:'⟳',btnCtx:'⌂',btnSnap:'▣',btnLab:'⚙',btnExpand:'⛶'};
function install(){for(const [id,glyph]of Object.entries(icons)){const b=document.getElementById(id);if(b){b.textContent=glyph;b.setAttribute('aria-label',b.title||id);}}
 document.querySelectorAll('select').forEach(s=>{if(!s.getAttribute('aria-label'))s.setAttribute('aria-label','Fence style');});
 let tries=0;const timer=setInterval(()=>{if(window.__f3d&&window.__rend){clearInterval(timer);installScene();}else if(++tries>120)clearInterval(timer);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
function installScene(){
 const api=window.__f3d,T=window.THREE,scene=api.scene,renderer=window.__rend(),cam=window.__cam(),ground=api.ground;
 const studio={scene,renderer,cam,sun:scene.children.find(n=>n.isDirectionalLight&&n.castShadow)};
 const bar=document.createElement('div');bar.className='ws-viewer-controls';bar.innerHTML='<label>Scene<select aria-label="Scene"><option value="showroom">Showroom</option><option value="outdoor">Property context</option></select></label><label>Quality<select aria-label="Render quality"><option value="auto">Auto</option><option value="field">Field · faster</option><option value="presentation">Presentation</option></select></label><button type="button">Export image ↗</button><span role="status"></span>';document.body.append(bar);
 const selects=bar.querySelectorAll('select'),saved={background:scene.background,fog:scene.fog,material:ground.material},visible=new Map();
 const floor=new T.MeshStandardMaterial({color:0xd9ddd7,roughness:.94,metalness:0});
 function backdrop(){
  const showroom=selects[0].value==='showroom';
  for(const n of scene.children){if(n===api.siteGroup||(n.isMesh&&n!==ground&&n!==api.fenceGroup)){if(!visible.has(n))visible.set(n,n.visible);n.visible=showroom?false:visible.get(n);}}
  ground.material=showroom?floor:saved.material;scene.background=showroom?new T.Color(0xe9ede7):saved.background;scene.fog=showroom?new T.Fog(0xe9ede7,300,1200):saved.fog;
  window.__f3dFraming?.syncFog();renderer.shadowMap.needsUpdate=true;renderer.render(scene,cam);
 }
 selects[0].value=api.spec.site?'outdoor':'showroom';selects[0].onchange=backdrop;backdrop();
 scene.addEventListener('childadded',()=>{if(selects[0].value==='showroom')backdrop();});
 let quality=configureQuality(studio);selects[1].onchange=()=>{quality=configureQuality(studio,selects[1].value);renderer.render(scene,cam);};
 bar.querySelector('button').onclick=()=>{const status=bar.querySelector('[role="status"]');try{const png=captureFrame(studio,T,quality.exportWidth),a=document.createElement('a');a.href=png;a.download='Ghareeb-fence-'+quality.exportWidth+'.png';a.click();status.textContent='Image exported';}catch(error){status.textContent=error.message||'Choose Field quality and retry';}};
 const snapshot=document.getElementById('btnSnap');if(snapshot)snapshot.onclick=bar.querySelector('button').onclick;
 const ar=document.createElement('button');ar.type='button';ar.textContent='View in AR';ar.onclick=()=>openAR({getFence:()=>api.fenceGroup,name:api.spec.style||'Fence model'});bar.append(ar);
 mountFenceLayerControls({host:bar,getRoot:()=>api.fenceGroup,redraw(){renderer.shadowMap.needsUpdate=true;renderer.render(scene,window.__cam());}});
 // Keep long project labels and the toolbar clear at every panel width.
 const header=document.querySelector('header'),hud=document.getElementById('hud'),rail=document.getElementById('rail');let layoutFrame=0;
 function fitControls(){layoutFrame=0;const sheet=document.getElementById('sheet');if(sheet)document.body.style.setProperty('--gfs-viewer-sheet-clearance',Math.max(12,innerHeight-sheet.getBoundingClientRect().top+12)+'px');const narrow=innerWidth<=900;document.body.classList.toggle('ws-viewer-stacked',narrow);
  const top=Math.max(44,(header?.getBoundingClientRect().bottom||32)+10);
  if(hud){hud.style.setProperty('top',top+'px','important');hud.style.setProperty('max-width',(narrow?'calc(100vw - 14px)':'calc(100vw - '+(bar.getBoundingClientRect().width+42)+'px)'),'important');}
  const toolTop=narrow?(hud?.getBoundingClientRect().bottom||top)+8:top;
  bar.style.setProperty('top',toolTop+'px','important');const bottom=Math.max(bar.getBoundingClientRect().bottom,hud?.getBoundingClientRect().bottom||0)+8;
  rail?.style.setProperty('top',bottom+'px','important');document.querySelector('.ws-model-review')?.style.setProperty('top',bottom+'px','important');
 }
 function queueLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(fitControls);}
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(queueLayout);for(const el of [header,hud,bar])if(el)observer.observe(el);}
 window.addEventListener('resize',queueLayout);queueLayout();
}
