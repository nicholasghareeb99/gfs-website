/* Review candidate: explicit browser project flows; references are advisory, never staff authority. */
(function(){
  'use strict';
  const KEY='gfs-request-flows-v1',MAX_AGE=2*60*60*1000,ID=/^[a-zA-Z0-9_-]{16,80}$/,RECEIPT=/^web_[a-zA-Z0-9_-]{16,80}$/;
  const forms=new WeakMap(),inflight=new Set();let flows=[],pageFlow=null,storageFailed=false;
  const CONTACT_LIMITS={name:200,phone:50,email:200,address:500};let contactTimer=null;
  try{const value=JSON.parse(sessionStorage.getItem(KEY)||'[]');if(Array.isArray(value))flows=value.filter(valid).slice(-8);}catch{storageFailed=true;}
  function valid(f){return f&&f.v===1&&ID.test(f.id||'')&&Number.isFinite(f.at)&&f.at>0&&f.at<=Date.now()&&Array.isArray(f.receipts)&&f.receipts.length<=20&&f.receipts.every(r=>RECEIPT.test(r.id||'')&&/^[a-f0-9]{64}$/.test(r.key||'')&&['estimate','ballpark','booking'].includes(r.kind)&&[null,'email_estimate','appointment_request','project_update'].includes(r.action)&&['websiteLeads','bookings'].includes(r.collection))&&(!f.original||RECEIPT.test(f.original.id||'')&&['websiteLeads','bookings'].includes(f.original.collection));}
  function save(){try{sessionStorage.setItem(KEY,JSON.stringify(flows.slice(-8)));}catch{storageFailed=true;}}
  function validContact(c){return c&&Object.keys(c).every(k=>['at','receipt',...Object.keys(CONTACT_LIMITS)].includes(k))&&Number.isFinite(c.at)&&c.at>0&&c.at<=Date.now()&&Date.now()-c.at<MAX_AGE&&RECEIPT.test(c.receipt||'')&&Object.entries(CONTACT_LIMITS).every(([key,max])=>typeof c[key]==='string'&&c[key].length<=max)&&c.name.length>=2&&c.phone.length>=10;}
  function purgeContacts(){let changed=false;for(const f of flows)if(f.contact&&(!validContact(f.contact)||expired(f)||!f.receipts.some(r=>r.id===f.contact.receipt))){delete f.contact;changed=true;}if(changed)save();}
  function armContactExpiry(){if(contactTimer!==null&&typeof clearTimeout==='function')clearTimeout(contactTimer);const expiry=flows.filter(f=>f.contact).map(f=>Math.min(f.at,f.contact.at)+MAX_AGE);if(expiry.length&&typeof setTimeout==='function')contactTimer=setTimeout(()=>{contactTimer=null;purgeContacts();armContactExpiry();},Math.max(1,Math.min(...expiry)-Date.now()+1));}
  function rememberContact(flow,record,receipt){
    if(!record)return;const contact={at:Date.now(),receipt};for(const key of Object.keys(CONTACT_LIMITS))contact[key]=typeof record[key]==='string'?record[key]:'';
    if(validContact(contact)){flow.contact=contact;armContactExpiry();}
  }
  function explicitFlow(id){try{const ids=new URLSearchParams(location.search).getAll('projectFlow');return ids.length===1&&ids[0]===id;}catch{return false;}}
  function prefillBooking(form,context,flow){
    purgeContacts();if(context.kind!=='booking'||flow.unresolvedHandoff||!flow.original||!explicitFlow(flow.id)||!validContact(flow.contact))return;
    for(const key of Object.keys(CONTACT_LIMITS)){
      const field=Array.from(form.elements||[]).find(el=>el.name===key&&el.type!=='hidden');
      if(!field||String(field.value||'').trim()||!flow.contact[key])continue;
      field.value=flow.contact[key];context.carried.set(field,field.value);field.addEventListener?.('input',()=>context.carried.delete(field));
    }
  }
  function clearCarried(context){for(const [field,value] of context.carried)if(field.value===value)field.value='';context.carried.clear();}
  function get(id){return flows.find(f=>f.id===id)||null;}
  function create(explicitNew=false){const f={v:1,id:crypto.randomUUID(),at:Date.now(),original:null,receipts:[],explicitNew};flows.push(f);flows=flows.slice(-8);save();return f;}
  function resolvePage(){
    if(pageFlow&&get(pageFlow))return get(pageFlow);
    let selected=null,handoffRequested=false;
    try{const q=new URLSearchParams(location.search),ids=q.getAll('projectFlow');handoffRequested=q.has('projectFlow');if(ids.length===1&&ID.test(ids[0]))selected=get(ids[0]);}catch{}
    // A missing explicit handoff must never fall back to an unrelated saved project.
    if(handoffRequested&&!selected){selected=create();selected.unresolvedHandoff=true;save();}
    if(!selected&&!storageFailed){try{selected=get(sessionStorage.getItem(KEY+':'+location.pathname));}catch{storageFailed=true;}}
    if(!selected)selected=create();pageFlow=selected.id;
    try{sessionStorage.setItem(KEY+':'+location.pathname,pageFlow);}catch{storageFailed=true;}
    return selected;
  }
  function selectPage(f){pageFlow=f.id;try{sessionStorage.setItem(KEY+':'+location.pathname,f.id);}catch{storageFailed=true;}}
  function expired(f){return Date.now()-f.at>MAX_AGE;}
  function optionsFor(form){const context=forms.get(form);return context?{flowId:context.flowId,mode:context.mode}:{};}
  function summary(form){const f=get(forms.get(form)?.flowId);return f?.original?{receipt:f.original.id,collection:f.original.collection,flowId:f.id}:null;}
  async function digest(record,kind){
    // Full canonical fields, without generated timestamps or later marketing touches.
    const keys=Object.keys(record).filter(k=>!['createdAt','createdAtMs','meta'].includes(k)).sort();
    const text=JSON.stringify([kind,...keys.map(k=>[k,record[k]])]);
    const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function relationship(record,action,parent){
    const parts=String(record.meta||'').split(' | ').filter(p=>!['request_action','parent_receipt','parent_collection'].includes(p.slice(0,p.indexOf('='))));
    const meta=['request_action='+action,'parent_receipt='+encodeURIComponent(parent.id),'parent_collection='+parent.collection,...parts.filter(Boolean)].join(' | ');
    if(meta.length>30000)throw Error('This request contains too much tracking detail. Please call or start a fresh request.');
    const label=action==='appointment_request'?'Visit follow-up to request: ':action==='project_update'?'Project update to request: ':'Email follow-up to request: ';
    return {...record,meta,notes:(label+parent.id+'\n'+String(record.notes||'')).slice(0,2000)};
  }
  async function prepare(record,kind,options){
    purgeContacts();
    if(!options?.flowId)return {record,kind,track:!(/(?:request_action=)(?:email_estimate|appointment_request|project_update)(?:\s*\||$)/.test(record.meta||'')),scope:null};
    const flow=get(options.flowId);
    if(!flow)return {decision:'missing',errors:['This project context is no longer available. Start another project to send these details.']};
    if(flow.unresolvedHandoff)return {decision:'missing',errors:['The earlier project reference is unavailable in this browser. Return to the original project page, or choose Start another project to make a separate request.']};
    if(expired(flow))return {decision:'expired',errors:['Continue the earlier project or start another project before sending.']};
    if(record.source==='ballpark-email-estimate'&&!flow.original)return {decision:'missing',errors:['Please submit this project first so the email request can be linked to the correct reference.']};
    const key=await digest(record,kind);
    if(inflight.has(flow.id))return {decision:'inflight',errors:['This project request is still being sent. Please wait for its result.']};
    // An original acquisition cannot be replaced by a later response or a different flow.
    const latest=flow.receipts.slice().reverse().find(r=>kind==='booking'?r.kind==='booking':record.source==='ballpark-email-estimate'?r.action==='email_estimate':r.collection==='websiteLeads'&&r.action!=='email_estimate');
    if(latest&&latest.key===key&&latest.kind===kind)return {reuse:{ok:true,id:latest.id,receipt:'netlify',sync:'pending',reused:true,flowId:flow.id,acquisitionReceipt:flow.original?.id||latest.id,requestAction:latest.action||null},flowId:flow.id};
    let action=null;
    if(flow.original){
      if(kind==='booking')action='appointment_request';
      else if(record.source==='ballpark-email-estimate')action='email_estimate';
      else if(options.mode==='update')action='project_update';
      else return {decision:'update_or_new',errors:['Are these changes for this project, or are you starting another project?']};
    }
    const outgoing=action?relationship(record,action,flow.original):record;
    inflight.add(flow.id);
    return {record:outgoing,kind,key,flowId:flow.id,scope:flow.id,legacyRecoveryAllowed:!flow.explicitNew,action,track:!action&&record.source!=='ballpark-email-estimate'};
  }
  function commit(prepared,result,acceptedRecord){
    if(prepared.flowId)inflight.delete(prepared.flowId);
    if(!prepared.flowId||!result.ok||!RECEIPT.test(result.id||''))return result;
    const flow=get(prepared.flowId);if(!flow)return {...result,contextUnavailable:true};
    const collection=prepared.kind==='booking'?'bookings':'websiteLeads';
    if(!flow.receipts.some(r=>r.id===result.id))flow.receipts.push({id:result.id,key:prepared.key,kind:prepared.kind,collection,action:prepared.action||null});
    flow.receipts=flow.receipts.slice(-20);
    if(!flow.original&&!prepared.action)flow.original={id:result.id,collection};
    rememberContact(flow,acceptedRecord,result.id);
    save();return {...result,flowId:flow.id,acquisitionReceipt:flow.original?.id||result.id,requestAction:prepared.action||null};
  }
  function bookingUrl(form){const f=get(forms.get(form)?.flowId);if(!f?.original)return '/quote/book/';const q=new URLSearchParams();q.set('projectFlow',f.id);const interest=window.GFSProjectContext?.get()?.intent;if(interest)q.set('project',interest);return '/quote/book/?'+q;}
  function bindForm(form,kind,callbacks={}){
    if(!form||forms.has(form)||!document.createElement||!form.parentElement)return;
    const f=resolvePage(),context={flowId:f.id,mode:'initial',kind,callbacks,carried:new Map(),panel:document.createElement('section')};
    const panel=context.panel;panel.className='gfs-request-context';panel.setAttribute('data-gfs-protected','');panel.setAttribute('aria-live','polite');panel.style.cssText='margin:16px 0;padding:16px;border:1px solid #d6dce1;border-radius:8px;background:#f8fafb;color:#173344;';
    forms.set(form,context);prefillBooking(form,context,f);form.parentElement.insertBefore(panel,form.nextSibling);render(form);
  }
  function render(form,result){
    const context=forms.get(form),flow=get(context?.flowId);if(!context||!flow)return;
    const panel=context.panel;panel.replaceChildren();
    const show=Boolean(flow.original||flow.unresolvedHandoff||result?.requiresDecision||result?.contextUnavailable);
    panel.style.display=show?'block':'none';if(!show)return;
    const text=document.createElement('p');text.style.margin='0 0 10px';
    text.textContent=flow.unresolvedHandoff?'The earlier project reference is unavailable in this browser. Return to the original project page, or start another project to make a separate request.':result?.requiresDecision==='update_or_new'?'Are these changes for this project, or are you starting another project?':expired(flow)?'Continue the earlier project or start another project.':result?.ok===false?'This submission has not been confirmed. Review the message on the form before retrying.':result?.reused?'This request has already been received.':result?.requestAction==='project_update'?'Your project update has been received for review.':'Your project request has been received.';
    if(context.kind==='booking'&&flow.original&&!flow.unresolvedHandoff&&!expired(flow)&&result?.ok!==false){
      const hasVisit=flow.receipts.some(r=>r.kind==='booking');
      text.textContent=!hasVisit?'Your earlier project request has been received. Choose a preferred date and time below; no visit has been requested or confirmed yet.':result?.ok?'Your visit request has been received. Our team will contact you to confirm availability.':'Your earlier visit request has been received. Any changes need office confirmation.';
    }
    panel.appendChild(text);
    if(context.carried.size){const note=document.createElement('p');note.textContent='Your contact details were carried from this project’s last received request. Please review them before sending.';panel.appendChild(note);}
    if(flow.original){const ref=document.createElement('small');ref.textContent='Reference: '+flow.original.id;ref.style.cssText='display:block;overflow-wrap:anywhere;margin-bottom:10px';panel.appendChild(ref);}
    const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';panel.appendChild(buttons);
    function button(label,fn){const b=document.createElement('button');b.type='button';b.className='btn btn-outline btn-sm';b.textContent=label;b.addEventListener('click',()=>{if(!context.busy)fn();});buttons.appendChild(b);}
    if(!flow.unresolvedHandoff)button(expired(flow)?'Continue this project':context.kind==='booking'?'Edit visit request':'Update this project',()=>{
      flow.at=Date.now();save();context.mode='update';form.style.display='';context.callbacks.onUpdate?.();
      text.textContent=context.kind==='booking'?'Review the visit details, then submit your request.':'Edit the details, then submit the update for this project.';
      const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=false;submit.textContent=context.kind==='booking'?'Request visit for this project':'Send project update';}
      form.scrollIntoView?.({block:'center',behavior:'smooth'});
    });
    button('Start another project',()=>{
      clearCarried(context);delete flow.contact;save();armContactExpiry();
      const fresh=create(true);selectPage(fresh);context.flowId=fresh.id;context.mode='initial';form.style.display='';context.callbacks.onNew?.();
      const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=false;submit.textContent=context.kind==='booking'?'Request my visit':'Send new project request';}
      render(form);panel.style.display='block';const note=document.createElement('p');note.textContent='You are starting another project. Review the address and fence details before sending.';panel.appendChild(note);form.scrollIntoView?.({block:'center',behavior:'smooth'});
    });
    if(flow.original&&context.kind!=='booking'&&!expired(flow)){
      const a=document.createElement('a');a.className='btn btn-primary btn-sm';a.textContent='Request a visit for this project';a.href=bookingUrl(form);buttons.appendChild(a);
    }
    if(storageFailed){const note=document.createElement('small');note.textContent='Keep this page open. This browser cannot retain the project reference after navigation.';panel.appendChild(note);}
  }
  function showResult(form,result){const context=forms.get(form);if(!context)return;if(result?.ok)context.mode='initial';render(form,result);}
  function setBusy(form,busy){const context=forms.get(form);if(!context)return;context.busy=!!busy;for(const b of context.panel.querySelectorAll('button'))b.disabled=!!busy;}
  function cancel(prepared){if(prepared?.flowId)inflight.delete(prepared.flowId);}
  purgeContacts();armContactExpiry();
  window.GFSRequestFlow={bindForm,optionsFor,prepare,commit,showResult,summary,bookingUrl,setBusy,cancel};
})();
