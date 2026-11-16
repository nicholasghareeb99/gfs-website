// Static diagrams remain readable without this optional enhancement.
// No network, storage, analytics, customer records or quote inputs are touched.
export function boundedAngle(value) {
  const n=Number(value);
  return Number.isFinite(n)?Math.max(0,Math.min(90,n)):45;
}
export function showScene(root, index, announce=false) {
  const buttons=Array.from(root.querySelectorAll('[data-lab-step]'));
  const notes=Array.from(root.querySelectorAll('[data-lab-note]'));
  if(!Number.isInteger(index)||index<0||index>=buttons.length||notes.length!==buttons.length)return false;
  root.dataset.scene=String(index);
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  notes.forEach((note,i)=>{note.hidden=i!==index;});
  const status=root.querySelector('[data-lab-status]');
  if(announce&&status)status.textContent=buttons[index].textContent.trim()+'. '+notes[index].querySelector('p').textContent;
  return true;
}
export function initializeLab(root) {
  if(root.dataset.labReady==='true')return false;
  const buttons=Array.from(root.querySelectorAll('[data-lab-step]'));
  if(buttons.length<2||!showScene(root,0))return false;
  root.dataset.labReady='true';
  buttons.forEach((button,index)=>button.addEventListener('click',()=>showScene(root,index,true)));
  const angle=root.querySelector('[data-lab-angle]');
  const gate=root.querySelector('[data-lab-gate-leaf]');
  const output=root.querySelector('output');
  if(angle&&gate&&output){
    const update=()=>{const value=boundedAngle(angle.value);gate.setAttribute('transform',`rotate(${-value} 125 275)`);output.textContent=value+'°';angle.setAttribute('aria-valuetext',value+' degrees open');};
    angle.addEventListener('input',update);update();
  }
  root.querySelectorAll('[data-lab-controls]').forEach(control=>{control.hidden=false;});
  return true;
}
if(typeof document!=='undefined')document.querySelectorAll('[data-build-lab]').forEach(root=>initializeLab(root));
