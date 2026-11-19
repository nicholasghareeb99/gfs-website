import {captureGateModelReview} from './model-review.mjs';
// One lifecycle owner per document, shared by every retry URL/module instance.
const ownerKey=Symbol.for('gfs.ar-workspace.owner.v3');
const owner=typeof window==='undefined'?{active:null,operation:null,installed:false,model:null,modelTask:null,modelAttempts:0}:(window[ownerKey]??=( {active:null,operation:null,installed:false,model:null,modelTask:null,modelAttempts:0} ));
function loadARModel(signal){
  if(signal?.aborted)return Promise.reject(new DOMException('AR preparation canceled.','AbortError'));
  if(owner.model)return Promise.resolve(owner.model);
  if(owner.modelTask)return owner.modelTask;
  if(owner.modelAttempts>=3)return Promise.reject(Error('AR model tools could not load after three attempts. Reload the page to try again.'));
  const url=new URL('./ar-model.mjs',import.meta.url),attempt=owner.modelAttempts++;
  if(attempt)url.searchParams.set('gfs-ar-retry',String(attempt));
  let timer,onAbort;
  const task=Promise.race([import(url.href),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('AR model tools loading timed out.')),15000);}),new Promise((_,reject)=>{onAbort=()=>{if(owner.modelTask===task)owner.modelTask=null;reject(new DOMException('AR preparation canceled.','AbortError'));};signal?.addEventListener('abort',onAbort,{once:true});})])
    .then(module=>{if(signal?.aborted||owner.modelTask!==task)throw new DOMException('AR preparation canceled.','AbortError');if(typeof module.exportARModel!=='function')throw Error('AR model tools did not initialize.');owner.model=module;return module;})
    .catch(error=>{if(error.name==='AbortError')throw error;console.warn('[AR workspace] Model tools unavailable.',error);throw Error(owner.modelAttempts>=3?'AR model tools could not load after three attempts. Reload the page to try again.':'AR model tools could not load. Tap Prepare AR model to retry.');})
    .finally(()=>{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);if(owner.modelTask===task)owner.modelTask=null;});
  owner.modelTask=task;return task;
}
function loadCSS(){if(document.getElementById('wsARCSS'))return;const l=document.createElement('link');l.id='wsARCSS';l.rel='stylesheet';l.href=new URL('./ar-workspace.css',import.meta.url);document.head.append(l);}
export function openAR({getFence,name='Fence model'}) {
  loadCSS();owner.operation?.abort();owner.active?.close();
  const d=document.createElement('dialog');owner.active=d;d.className='ws-ar-sheet';d.setAttribute('aria-labelledby','wsARTitle');
  d.innerHTML='<header><span>ON-SITE PRESENTATION</span><button type="button" data-close aria-label="Close AR preview">×</button></header><div class="ws-ar-body"><div class="ws-ar-symbol" aria-hidden="true">◈</div><h2 id="wsARTitle">See your fence in the yard</h2><p data-name></p><div class="ws-ar-facts"><span>Actual fence geometry</span><span>Feet → metres at 1:1 scale</span></div><p class="ws-ar-note">On iPhone or iPad, open this page in Safari. Prepare the model, then use Apple’s AR viewer to place it on the ground. Keep the viewer at 100% scale.</p><p class="ws-ar-note">Placement is a visual preview. Confirm fence lines, setbacks and measurements separately.</p><div role="status" aria-live="polite">Ready to prepare the current model.</div><div class="ws-ar-actions"><button type="button" data-prepare>Prepare AR model</button><a data-open hidden aria-label="View in your space"><img alt="" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M12 2 2 7v10l10 5 10-5V7ZM2 7l10 5 10-5M12 12v10%27 fill=%27none%27 stroke=%27white%27 stroke-width=%272%27/%3E%3C/svg%3E"></a><a data-download hidden>Download AR model</a></div><p class="ws-ar-device"></p></div>';
  d.querySelector('[data-name]').textContent=name;
  const a=d.querySelector('[data-open]'),download=d.querySelector('[data-download]'),status=d.querySelector('[role=status]'),prepare=d.querySelector('[data-prepare]');
  let url=null,generation=0,modelFile=null,preparedCheck=null;
  const clearPrepared=()=>{preparedCheck=null;modelFile=null;a.hidden=download.hidden=share.hidden=true;a.removeAttribute('href');download.removeAttribute('href');if(url){URL.revokeObjectURL(url);url=null;}};
  const readyForDelivery=event=>{try{if(!preparedCheck)throw Error('Prepare the current model before opening or sharing it.');preparedCheck();return true;}catch(error){event?.preventDefault();clearPrepared();status.textContent=error.message||'The model changed. Review it and prepare the current model again.';prepare.textContent='Rebuild from current model';return false;}};
  const share=document.createElement('button');share.type='button';share.textContent='Open or share AR file';share.hidden=true;download.after(share);
  const standalone=navigator.standalone===true||window.matchMedia?.('(display-mode: standalone)').matches;
  if(standalone)d.querySelector('.ws-ar-note').textContent='You are using the Home Screen app. Prepare the fence, then tap View in your space. If Apple’s viewer does not open, use Open or share AR file, or open this same viewer in Safari.';
  a.addEventListener('click',event=>{if(readyForDelivery(event))d.dataset.arHandoff='true';});
  download.addEventListener('click',event=>{readyForDelivery(event);});
  share.onclick=async()=>{try{if(!modelFile||!readyForDelivery())return;d.dataset.arHandoff='true';await navigator.share({files:[modelFile],title:name});}catch(e){if(e.name!=='AbortError')status.textContent='This device could not open the share sheet. Download the AR model or open this viewer in Safari.';}finally{delete d.dataset.arHandoff;}};
  const canAR=!!a.relList?.supports?.('ar');
  d.querySelector('.ws-ar-device').textContent=canAR?'Apple AR viewer is available in this browser.':'This browser can download the model. Open it on an iPhone or iPad for AR placement.';
  const filename=name.replace(/[<>:"/\\|?*]/g,'-').slice(0,100)+'.usdz';
  let controller=null;
  prepare.onclick=async()=>{
    if(prepare.disabled)return;
    const ticket=++generation,operation=new AbortController();owner.operation?.abort();controller=operation;owner.operation=operation;
    prepare.disabled=true;status.textContent='Preparing the fence, rails, caps and textures.';
    clearPrepared();
    let timer,onAbort;
    try{
      const fence=getFence(),checkModel=captureGateModelReview(fence);
      const checkPrepared=()=>{if(getFence()!==fence)throw Error('The model changed. Review it and prepare the current model again.');checkModel();};
      const current=()=>{try{return ticket===generation&&d.open&&owner.active===d&&!operation.signal.aborted&&getFence()===fence;}catch{return false;}};
      const work=(async()=>{
        await new Promise(requestAnimationFrame);
        if(!current())throw new DOMException('AR preparation canceled.','AbortError');checkPrepared();
        const {exportARModel}=await loadARModel(operation.signal);
        if(!current())throw new DOMException('AR preparation canceled.','AbortError');checkPrepared();
        return exportARModel(fence,{signal:operation.signal,isCurrent:current});
      })();
      const result=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('Preparation took too long. Tap Prepare AR model to retry.'));operation.abort();},15000);}),new Promise((_,reject)=>{onAbort=()=>reject(new DOMException('AR preparation canceled.','AbortError'));operation.signal.addEventListener('abort',onAbort,{once:true});})]);
      if(!current())return;checkPrepared();preparedCheck=checkPrepared;
      if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(result.blob);
      a.href=url+'#allowsContentScaling=0';a.rel='ar';a.download=filename;a.hidden=!canAR;
      download.href=url;download.download=filename;download.hidden=false;
      modelFile=new File([result.blob],filename,{type:'model/vnd.usdz+zip'});
      share.hidden=!(navigator.share&&navigator.canShare?.({files:[modelFile]}));
      status.textContent=`Model ready · ${result.count.toLocaleString()} parts · ${(result.blob.size/1048576).toFixed(1)} MB${result.warnings.length?' · '+result.warnings.join(' '):''}`;
      prepare.textContent='Rebuild from current model';
    }catch(e){if(ticket===generation&&d.open)status.textContent=e.name==='AbortError'?'The model changed while preparing. Tap Prepare AR model to retry.':e.message||'The model could not be prepared. Try a shorter run.';}
    finally{clearTimeout(timer);operation.signal.removeEventListener('abort',onAbort);if(controller===operation)controller=null;if(owner.operation===operation)owner.operation=null;if(ticket===generation)prepare.disabled=false;}
  };
  d.querySelector('[data-close]').onclick=()=>d.close();
  d.addEventListener('close',()=>{generation++;controller?.abort();clearPrepared();d.remove();if(owner.active===d)owner.active=null;},{once:true});
  document.body.append(d);d.showModal();
}
if(typeof window!=='undefined'&&!owner.installed){
  owner.installed=true;
  window.addEventListener('gv:view',()=>{owner.operation?.abort();owner.active?.close();});
  window.addEventListener('gfs:session-boundary',event=>{if(event.detail?.authorized!==true||event.detail?.paused!==false){owner.operation?.abort();owner.active?.close();}});
  window.addEventListener('pagehide',()=>{if(owner.active?.dataset.arHandoff!=='true'){owner.operation?.abort();owner.active?.close();}});
  window.addEventListener('pageshow',()=>{if(owner.active)delete owner.active.dataset.arHandoff;});
}
