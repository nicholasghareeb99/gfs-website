// Inspection visibility only; dimensions, scope, takeoff and saved models are untouched.
export const FENCE_LAYERS=Object.freeze({pickets:'Pickets & panels',rails:'Rails',posts:'Posts',trim:'Caps & trim',hardware:'Hardware',gates:'Gates'});
export function fencePartLayer(kind){
 if(/^(gate|gbrace|gcap|gcorner|gdrop|gframe|ghandle|ghinge|glatch|gpicket|grail|gspear|gstile)$/i.test(kind))return 'gates';
 if(/fastener|bolt|screw|bracket|band|nail|hardware|fabrictie|tensionbar|railend|staple/i.test(kind))return 'hardware';
 if(/fabric|picket|board|panel|mesh|wire|infill|slat|lattice/i.test(kind))return 'pickets';
 if(/rail|stringer/i.test(kind))return 'rails';
 if(/post/i.test(kind)&&!/cap/i.test(kind))return 'posts';
 if(/cap|trim|topper|kick/i.test(kind))return 'trim';
 if(/fastener|bolt|screw|bracket|band|nail|hardware/i.test(kind))return 'hardware';
 return null;
}
const managed=new WeakMap();
export function applyFenceLayers(root,state=root?.userData?.fenceLayers||{}){
 const counts=Object.fromEntries(Object.keys(FENCE_LAYERS).map(k=>[k,0]));if(!root?.traverse)return counts;
 root.userData.fenceLayers=state;
 root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const parts=mesh.userData?.parts;
  const categories=new Set((parts?.length?parts:[{kind:mesh.userData?.fencePartKind}]).map(p=>p.gate===true?'gates':fencePartLayer(p.kind||'')));
  if(categories.size!==1||categories.has(null))return; // Never hide unrelated mixed geometry.
  const layer=[...categories][0];counts[layer]+=mesh.isInstancedMesh?mesh.count:1;
  let entry=managed.get(mesh);if(!entry){entry={base:mesh.visible,hidden:false};managed.set(mesh,entry);}else if(!entry.hidden)entry.base=mesh.visible;
  entry.hidden=state[layer]===false;mesh.visible=entry.hidden?false:entry.base;
 });return counts;
}
export function withCompleteFence(scene,render){
 const restore=[];scene?.traverse?.(mesh=>{const entry=managed.get(mesh);if(entry?.hidden){restore.push([mesh,mesh.visible]);mesh.visible=entry.base;}});
 try{return render();}finally{for(const [mesh,visible]of restore)mesh.visible=visible;}
}
export function mountFenceLayerControls({host,getRoot,redraw,document=globalThis.document,events=globalThis.window}){
 const section=document.createElement('details');section.className='gfs-fence-layers';section.style.cssText='width:100%;flex-basis:100%;min-width:0';
 const heading=document.createElement('summary');heading.textContent='Show / hide fence parts';heading.style.cssText='min-height:44px;cursor:pointer;font-weight:650;padding:10px 0';section.append(heading);
 const wrap=document.createElement('div');wrap.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px';const state={},buttons=new Map();
 function sync(){const counts=applyFenceLayers(getRoot(),state);for(const [key,button]of buttons){button.disabled=!counts[key];button.setAttribute('aria-pressed',String(state[key]!==false));button.textContent=(state[key]===false?'○ ':'● ')+FENCE_LAYERS[key];button.style.opacity=button.disabled?'.45':state[key]===false?'.65':'1';}return counts;}
 for(const key of Object.keys(FENCE_LAYERS)){const b=document.createElement('button');b.type='button';b.style.cssText='min-height:44px;padding:9px 12px;border:1px solid #859bb3;border-radius:8px;background:#edf5ff;color:#163b64;font:600 13px system-ui';b.onclick=()=>{state[key]=state[key]===false;sync();redraw();};buttons.set(key,b);wrap.append(b);}
 const reset=document.createElement('button');reset.type='button';reset.textContent='Show all';reset.style.cssText='min-height:44px;padding:8px 14px;border-radius:8px';reset.onclick=()=>{for(const key of Object.keys(state))delete state[key];sync();redraw();};wrap.append(reset);
 const note=document.createElement('p');note.textContent='Inspection only. Saved images and proposals include the complete fence.';note.style.cssText='font:12px/1.5 system-ui;margin:10px 0';section.append(wrap,note);host.append(section);
 const update=()=>{if(section.isConnected){sync();redraw();}};events?.addEventListener('gfs:fence-rebuilt',update);sync();
 return {sync,close(){events?.removeEventListener('gfs:fence-rebuilt',update);applyFenceLayers(getRoot(),{});section.remove();redraw();}};
}
