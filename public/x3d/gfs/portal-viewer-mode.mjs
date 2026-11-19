import './portal-camera-controls.mjs';
// Customer presentation keeps the saved layout and style dimensions fixed.
// Camera, scene quality, image export and AR remain available.
const customer=new URLSearchParams(location.search).get('portal')==='1';
if(customer){
 const install=()=>{
  document.body.classList.add('portal-viewer-mode');
  for(const id of ['styleRow','hRow','lab','adjust']){const node=document.getElementById(id);if(node){node.setAttribute('aria-hidden','true');for(const input of node.querySelectorAll('button,input,select'))input.disabled=true;}}
  for(const id of ['btnLab','btnMove']){const node=document.getElementById(id);if(node)node.disabled=true;}
  const expand=document.getElementById('btnExpand');if(expand)expand.onclick=()=>window.open(location.origin+location.pathname+'?portal=1'+location.hash,'_blank','noopener');
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}
