import {exportARModel} from './ar-model.mjs';
let active=null;
function loadCSS(){if(document.getElementById('wsARCSS'))return;const l=document.createElement('link');l.id='wsARCSS';l.rel='stylesheet';l.href=new URL('./ar-workspace.css',import.meta.url);document.head.append(l);}
export function openAR({getFence,name='Fence model'}) {
  loadCSS();active?.close();
  const d=document.createElement('dialog');active=d;d.className='ws-ar-sheet';d.setAttribute('aria-labelledby','wsARTitle');
  d.innerHTML='<header><span>ON-SITE PRESENTATION</span><button type="button" data-close aria-label="Close AR preview">×</button></header><div class="ws-ar-body"><div class="ws-ar-symbol" aria-hidden="true">◈</div><h2 id="wsARTitle">See your fence in the yard</h2><p data-name></p><div class="ws-ar-facts"><span>Actual fence geometry</span><span>Feet → metres at 1:1 scale</span></div><p class="ws-ar-note">On iPhone or iPad, open this page in Safari. Prepare the model, then use Apple’s AR viewer to place it on the ground. Keep the viewer at 100% scale.</p><p class="ws-ar-note">Placement is a visual preview. Confirm fence lines, setbacks and measurements separately.</p><div role="status" aria-live="polite">Ready to prepare the current model.</div><div class="ws-ar-actions"><button type="button" data-prepare>Prepare AR model</button><a data-open hidden><img alt="" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M12 2 2 7v10l10 5 10-5V7ZM2 7l10 5 10-5M12 12v10%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272%27/%3E%3C/svg%3E"><span>View in your space</span></a><a data-download hidden>Download AR model</a></div><p class="ws-ar-device"></p></div>';
  d.querySelector('[data-name]').textContent=name;
  const a=d.querySelector('[data-open]'),download=d.querySelector('[data-download]'),status=d.querySelector('[role=status]'),prepare=d.querySelector('[data-prepare]');
  let url=null,generation=0;
  const canAR=!!a.relList?.supports?.('ar');
  d.querySelector('.ws-ar-device').textContent=canAR?'Apple AR viewer is available in this browser.':'This browser can download the model. Open it on an iPhone or iPad for AR placement.';
  const filename=name.replace(/[<>:"/\\|?*]/g,'-').slice(0,100)+'.usdz';
  prepare.onclick=async()=>{
    const ticket=++generation;prepare.disabled=true;status.textContent='Preparing the fence, rails, caps and textures…';
    a.hidden=download.hidden=true;
    try{
      await new Promise(requestAnimationFrame);
      const result=await exportARModel(getFence());if(ticket!==generation||!d.open)return;
      if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(result.blob);
      a.href=url+'#allowsContentScaling=0';a.rel='ar';a.hidden=!canAR;
      download.href=url;download.download=filename;download.hidden=false;
      status.textContent=`Model ready · ${result.count.toLocaleString()} parts · ${(result.blob.size/1048576).toFixed(1)} MB${result.warnings.length?' · '+result.warnings.join(' '):''}`;
      prepare.textContent='Rebuild from current model';
    }catch(e){if(ticket===generation)status.textContent=e.message||'The model could not be prepared. Try a shorter run.';}
    finally{if(ticket===generation)prepare.disabled=false;}
  };
  d.querySelector('[data-close]').onclick=()=>d.close();
  d.addEventListener('close',()=>{generation++;if(url)URL.revokeObjectURL(url);d.remove();if(active===d)active=null;},{once:true});
  document.body.append(d);d.showModal();
}
if(typeof window!=='undefined'){window.addEventListener('gv:view',()=>active?.close());window.addEventListener('pagehide',()=>active?.close());}
