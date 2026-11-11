/* Browser privacy choices only. These records are NOT authenticated Ads upload evidence. */
(function(){
  'use strict';
  const KEY='gfs-privacy-choice-v1',DENIED='gfs-privacy-denied-v1',NOTICE='gfs-privacy-2026-09-v1',MAX_AGE=180*24*60*60*1000;
  const CLICK_KEYS=new Set(['gclid','gbraid','wbraid','fbclid','gfs_campaign_id','gfs_adgroup_id','gfs_ad_id','gfs_geo_physical','gfs_geo_interest']);
  let record=null,storageFailed=false,forceDenied=false,panel=null,launcher=null,open=false,error='';
  const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
  function valid(value){return exact(value,['version','noticeVersion','choiceId','revision','recordedAtClient','analytics','advertising','adPersonalization','authority'])&&value.version===1&&value.noticeVersion===NOTICE&&/^[a-zA-Z0-9_-]{16,80}$/.test(value.choiceId||'')&&Number.isSafeInteger(value.revision)&&value.revision>=1&&Number.isFinite(value.recordedAtClient)&&value.recordedAtClient<=Date.now()&&Date.now()-value.recordedAtClient<MAX_AGE&&typeof value.analytics==='boolean'&&typeof value.advertising==='boolean'&&value.adPersonalization===false&&value.authority==='browser_choice_unverified';}
  function read(){if(forceDenied){record=null;return null;}try{const value=JSON.parse(localStorage.getItem(KEY)||'null');record=sessionStorage.getItem(DENIED)==='1'?null:valid(value)?value:null;storageFailed=false;}catch{record=null;storageFailed=true;}return record;}
  function snapshot(){const value=read();return value?{...value}:{version:1,noticeVersion:NOTICE,choiceId:null,revision:0,recordedAtClient:null,analytics:false,advertising:false,adPersonalization:false,authority:'not_recorded'};}
  function allows(purpose){const value=read();return Boolean(value&&value[purpose]===true);}
  function redactMeta(meta){return String(meta||'').split(' | ').filter(part=>!CLICK_KEYS.has(part.slice(0,part.indexOf('=')))).map(part=>{
    if(!part.startsWith('ref='))return part;
    try{const url=new URL(decodeURIComponent(part.slice(4)));return 'ref='+encodeURIComponent(url.origin+url.pathname);}catch{return '';}
  }).filter(Boolean).join(' | ');}
  function clearStorage(name,key){try{globalThis[name].removeItem(key);}catch{try{globalThis[name].setItem(key,'');}catch{}}}
  function purgeAdvertising(){
    clearStorage('sessionStorage','gfs_attribution');
    // Preserve essential retry identity and customer/project data, but a denied
    // choice must not resend advertising IDs from an older failed-send record.
    for(const key of ['gfs-intake-pending-v1','gfs_leads_backup'])try{
      const rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))continue;
      let changed=false;for(const row of rows){const target=key==='gfs-intake-pending-v1'?row.record:row;if(target&&typeof target.meta==='string'){const clean=redactMeta(target.meta);if(clean!==target.meta){target.meta=clean;changed=true;}}}
      if(changed)localStorage.setItem(key,JSON.stringify(rows));
    }catch{}
  }
  function purgeMeasurement(){
    // Receipt-only tombstones retain deduplication without contact, click IDs,
    // campaign details or delayed events that could revive on a later grant.
    try{const old=JSON.parse(sessionStorage.getItem('gfs_conversion_receipts')||'[]'),rows=JSON.parse(sessionStorage.getItem('gfs-conversion-invocations-v2')||'[]');
      const ids=[...(Array.isArray(old)?old:[]),...(Array.isArray(rows)?rows.map(r=>r.receipt):[]),...(window.GFS_ACCEPTED_RECEIPTS||[]).map(r=>r.receipt)].filter(id=>/^web_[a-zA-Z0-9_-]{16,80}$/.test(id||''));
      if(ids.length)sessionStorage.setItem('gfs_conversion_receipts',JSON.stringify([...new Set(ids)].slice(-100)));
    }catch{}
    clearStorage('sessionStorage','gfs-conversion-invocations-v2');window.GFS_ACCEPTED_RECEIPTS=[];
  }
  function signal(before){const after=snapshot();if(!after.advertising)purgeAdvertising();if(!after.analytics){clearStorage('sessionStorage','gfs_sid');clearStorage('localStorage','gfs_seen');}
    if(!before||before.choiceId!==after.choiceId){purgeMeasurement();
      // Clear in-memory delivery queues before policy readiness can enable tags.
      try{window.dispatchEvent(new CustomEvent('gfs-consent-cleared',{detail:{before,after}}));window.dispatchEvent(new CustomEvent('gfs-consent-changed',{detail:{before,after}}));}catch{}
    }
    render();return after;
  }
  function save(choices){
    if(!exact(choices,['analytics','advertising'])||typeof choices.analytics!=='boolean'||typeof choices.advertising!=='boolean')return{ok:false,error:'Choose your privacy preferences.'};
    const before=snapshot();if(before.choiceId&&before.analytics===choices.analytics&&before.advertising===choices.advertising){open=false;render();return{ok:true,record:before};}
    const next={version:1,noticeVersion:NOTICE,choiceId:crypto.randomUUID(),revision:before.revision+1,recordedAtClient:Date.now(),...choices,adPersonalization:false,authority:'browser_choice_unverified'};
    try{localStorage.setItem(KEY,JSON.stringify(next));clearStorage('sessionStorage',DENIED);if(localStorage.getItem(KEY)!==JSON.stringify(next)||sessionStorage.getItem(DENIED)==='1')throw Error('not retained');record=next;storageFailed=false;forceDenied=false;error='';open=false;}
    catch{record=null;storageFailed=true;forceDenied=true;clearStorage('localStorage',KEY);try{sessionStorage.setItem(DENIED,'1');}catch{}error='Your choice could not be saved. Optional tracking is off on this page; you can still request a quote. If this keeps happening, clear this site’s saved data in your browser.';}
    const after=signal(before);return{ok:!storageFailed,record:after,error:storageFailed?error:undefined};
  }
  function surface(){try{let owner=false;try{owner=localStorage.getItem('gfs_owner')==='1';}catch{}return ['http:','https:'].includes(location.protocol)&&(!window.GFSTrackingPolicy||window.GFSTrackingPolicy.safeUrl(location.href||location.pathname))&&!owner&&!document.body?.classList?.contains('editing');}catch{return false;}}
  function element(tag,text){const node=document.createElement(tag);if(text)node.textContent=text;return node;}
  function render(){
    if(!document.body||!document.createElement)return;
    if(!surface()){if(panel)panel.hidden=true;if(launcher)launcher.hidden=true;return;}
    if(!launcher){launcher=element('button','Privacy choices');launcher.type='button';launcher.setAttribute('data-gfs-protected','');launcher.style.cssText='position:fixed;left:12px;bottom:12px;z-index:1100;border:1px solid #d0d8dd;background:#fff;color:#173344;border-radius:20px;padding:8px 13px;font:600 12px system-ui;box-shadow:0 2px 10px #0001;';launcher.addEventListener('click',()=>{open=true;render();});document.body.appendChild(launcher);}
    launcher.hidden=false;
    if(!panel){panel=element('section');panel.setAttribute('role','region');panel.setAttribute('aria-label','Privacy choices');panel.setAttribute('data-gfs-protected','');panel.style.cssText='position:fixed;right:16px;bottom:16px;z-index:1101;width:min(420px,calc(100vw - 32px));max-height:75vh;overflow:auto;box-sizing:border-box;padding:22px;border:1px solid #cdd7de;border-radius:18px;background:#fff;color:#173344;box-shadow:0 16px 60px #132d3d33;font:14px/1.5 system-ui;';document.body.appendChild(panel);}
    const value=snapshot();panel.hidden=Boolean(value.choiceId&&!open&&!error);if(panel.hidden)return;
    panel.replaceChildren();const title=element('h2','Your privacy choices');title.style.cssText='font:700 21px/1.2 system-ui;margin:0 0 10px;';panel.appendChild(title);
    panel.appendChild(element('p','Choose optional measurement below. You can request a quote, use the planner and book a visit either way.'));
    function option(label,checked,help){const wrap=element('label'),box=element('input');box.type='checkbox';box.checked=checked;box.style.marginRight='9px';wrap.style.cssText='display:block;margin:14px 0;font-weight:600;';wrap.appendChild(box);wrap.appendChild(element('span',label));const note=element('small',help);note.style.cssText='display:block;margin-left:24px;font-weight:400;color:#526574;';wrap.appendChild(note);panel.appendChild(wrap);return box;}
    const analytics=option('Website analytics',value.analytics,'Allow Google Analytics and our visit records to help improve pages and tools.');
    const advertising=option('Advertising measurement',value.advertising,'Allow Google advertising measurement, including storing ad click identifiers. Google ad personalization stays off.');
    const actions=element('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;';panel.appendChild(actions);
    function button(label,fn,primary=false){const b=element('button',label);b.type='button';b.style.cssText='border:1px solid #173344;border-radius:9px;padding:10px 12px;font:600 13px system-ui;cursor:pointer;'+(primary?'background:#173344;color:white;':'background:white;color:#173344;');b.addEventListener('click',fn);actions.appendChild(b);}
    button('Only necessary',()=>save({analytics:false,advertising:false}));button('Save choices',()=>save({analytics:analytics.checked,advertising:advertising.checked}),true);
    const link=element('a','Read our privacy policy');link.href='/privacy/';link.style.cssText='display:inline-block;margin-top:14px;color:#315b76;';panel.appendChild(link);
    if(error){const status=element('p',error);status.setAttribute('role','status');panel.appendChild(status);}
  }
  window.GFSConsent=Object.freeze({snapshot,allows,save,redactMeta,refreshUI:render,show:()=>{open=true;render();},noticeVersion:NOTICE});
  read();if(!record?.advertising)purgeAdvertising();if(!record)purgeMeasurement();
  window.addEventListener?.('storage',event=>{if(event?.key&&event.key!==KEY&&event.key!==DENIED&&event.key!=='gfs_owner')return;const before=record?{...record}:null;if(event?.key===KEY||event?.key===DENIED)forceDenied=false;read();signal(before);});
  for(const type of ['gfs-owner-mode-changed','hashchange','popstate','pageshow'])window.addEventListener?.(type,render);
  document.addEventListener?.('DOMContentLoaded',render);if(document.readyState!=='loading')render();
})();

/* Shared collection gate. Request delivery, authentication and Firestore intake stay independent. */
(function(){
  'use strict';
  const PRIVATE_KEYS=new Set(['edit','token','access_token','id_token','idtoken','oobcode','email','phone','name','address','customer','customerid','job','jobid','share','sharetoken','portal','quotetoken']);
  const attributionIdKeys=Object.freeze(['gfs_campaign_id','gfs_adgroup_id','gfs_ad_id','gfs_geo_physical','gfs_geo_interest']);
  function validAttributionId(key,value){
    // Only these typed Google reporting fields can contain long numeric IDs.
    // Treat IDs as strings: Google IDs can exceed JavaScript's safe integers.
    if(!attributionIdKeys.includes(key)||typeof value!=='string'||! /^[1-9]\d{0,19}$/.test(value))return false;
    if(key.startsWith('gfs_geo_'))return value.length<=10;
    return value.length<20||value<='18446744073709551615';
  }
  function sensitive(value){
    const text=decodeURIComponent(String(value||''));
    return /[^\s/@]+@[^\s/@]+\.[^\s/@]+/.test(text)||/(?:^|\D)(?:\+?1[\s().-]*)?(?:\d[\s().-]*){10}(?:$|\D)/.test(text);
  }
  function safeUrl(value){
    try{
      const url=new URL(value,location.href||('https://'+location.hostname+'/'));
      if(sensitive(url.pathname)||/^\/(?:admin|portal|review|job|share)(?:\/|$)/i.test(decodeURIComponent(url.pathname)))return false;
      for(const [key,value] of url.searchParams){
        if(PRIVATE_KEYS.has(key.toLowerCase()))return false;
        if(attributionIdKeys.includes(key)){
          // Google may leave unavailable location macros empty; keep them unknown.
          if(url.searchParams.getAll(key).length!==1||(value!==''&&!validAttributionId(key,value)))return false;
        }else if(sensitive(value))return false;
      }
      const hash=decodeURIComponent(url.hash);
      if(sensitive(hash)||/^#\/?(?:admin|portal|review|job|share)(?:[/?=&]|$)/i.test(hash))return false;
      for(const part of hash.replace(/^#/,'').split(/[?&]/)){const at=part.indexOf('=');if(at>=0&&PRIVATE_KEYS.has(part.slice(0,at).toLowerCase()))return false;}
      return true;
    }catch{return false;}
  }
  function safeFields(value){
    try{return Object.entries(value||{}).every(([key,v])=>typeof v!=='string'||(key==='transaction_id'&&/^web_[a-zA-Z0-9_-]{16,80}$/.test(v))||(!sensitive(v)&&!/^https?:\/\//i.test(v)));}catch{return false;}
  }
  function contextAllowed(){
    try{
      if(location.protocol!=='https:'||!['ghareebfencingsolutions.com','www.ghareebfencingsolutions.com','ghareebfence.com'].includes(location.hostname))return false;
      if(window.GFS_TRACKING_CONFIG?.internalTest===true||/^\/(?:tests?|__test)(?:\/|$)/i.test(location.pathname))return false;
      const testParams=new URLSearchParams(location.search);if(testParams.has('gfs_test')||testParams.has('system_test'))return false;
      if(!safeUrl(location.href||location.pathname+location.search+(location.hash||'')))return false;
      if(document.referrer&&!safeUrl(document.referrer))return false;
      if(localStorage.getItem('gfs_owner')==='1'||document.body?.classList?.contains('editing'))return false;
      return window.GFS_TRACKING_CONFIG?.analyticsEnabled!==false;
    }catch{return false;}
  }
  function allowed(purpose='analytics'){return contextAllowed()&&window.GFSConsent?.allows(purpose)===true;}
  function anyAllowed(){return allowed('analytics')||allowed('advertising');}
  function consentSignals(kind='update'){
    const context=contextAllowed();
    if(!context&&!window.dataLayer&&typeof window.fbq!=='function')return;
    // Basic consent: commands are local until an allowed tag is initialized.
    window.dataLayer=window.dataLayer||[];
    (function(){window.dataLayer.push(arguments);})('consent',kind,{analytics_storage:allowed('analytics')?'granted':'denied',ad_storage:allowed('advertising')?'granted':'denied',ad_user_data:allowed('advertising')?'granted':'denied',ad_personalization:'denied'});
    // Meta measurement stays disabled until its separate account/data-use review.
    if(typeof window.fbq==='function')window.fbq('consent','revoke');
  }
  function enforce(){
    const enabled=allowed(),id=window.GFS_FIREBASE_CONFIG?.measurementId;
    if(id)window['ga-disable-'+id]=!enabled;
    if(window.GFS_ANALYTICS?.setAnalyticsCollectionEnabled){try{window.GFS_ANALYTICS.setAnalyticsCollectionEnabled(enabled);}catch{}}
    return enabled;
  }
  function initialize(firebase){
    if(!enforce()||!window.GFS_FIREBASE_CONFIG?.measurementId||typeof firebase?.analytics!=='function')return null;
    return window.GFS_ANALYTICS||firebase.analytics();
  }
  function refresh(){
    window.GFSConsent?.refreshUI();
    enforce();consentSignals();
    if(anyAllowed()){
      if(!window.GFS_ANALYTICS&&window.GFS_DB&&typeof firebase!=='undefined')window.GFS_ANALYTICS=initialize(firebase);
      if(typeof Event==='function')window.dispatchEvent(new Event('gfs-tracking-ready'));
    }
  }
  window.GFSTrackingPolicy={allowed,anyAllowed,contextAllowed,enforce,initialize,safeUrl,safeFields,attributionIdKeys,validAttributionId};consentSignals('default');enforce();
  for(const event of ['storage','gfs-consent-changed','gfs-owner-mode-changed','hashchange','popstate','pageshow'])window.addEventListener?.(event,refresh);
  document.addEventListener?.('DOMContentLoaded',()=>{
    enforce();if(typeof MutationObserver==='function'&&document.body)new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});
  });
})();

/* Consent-gated Ads destination only. Conversion events remain owned by leads.js. */
(function(){
  'use strict';
  if(window.GFSAdsTag)return;
  let destination=null,configured=false,loading=false,failed=false,loader=null;
  const observed=new WeakSet();
  function config(){
    const value=window.GFS_ADS;
    if(!value||typeof value.conversionId!=='string'||!/^AW-[1-9]\d{5,19}$/.test(value.conversionId)||typeof value.label!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(value.label))return null;
    const result={conversionId:value.conversionId,label:value.label};
    if(Number.isFinite(value.value)&&value.value>=0)result.value=value.value;
    return result;
  }
  function permitted(){return window.GFSTrackingPolicy?.allowed('advertising')===true;}
  function ready(){const value=config();return Boolean(permitted()&&value&&configured&&destination===value.conversionId&&typeof window.gtag==='function');}
  function command(){
    window.dataLayer=window.dataLayer||[];
    if(typeof window.gtag!=='function')window.gtag=function(){window.dataLayer.push(arguments);};
    return window.gtag;
  }
  function consent(){
    command()('consent','update',{
      analytics_storage:window.GFSTrackingPolicy?.allowed('analytics')?'granted':'denied',
      ad_storage:permitted()?'granted':'denied',ad_user_data:permitted()?'granted':'denied',ad_personalization:'denied'
    });
  }
  function configure(){
    loading=false;
    const value=config();
    if(!permitted()||!value||destination!==value.conversionId||configured||failed)return;
    // Defaults were queued by the policy before this initializer. Refresh the
    // choice after download too, so a withdrawal during loading cannot enable Ads.
    try{
      consent();
      const alreadyConfigured=Array.isArray(window.dataLayer)&&window.dataLayer.some(row=>row?.[0]==='config'&&row[1]===destination);
      if(!alreadyConfigured)command()('config',destination,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
      configured=true;
      window.dispatchEvent(new Event('gfs-tracking-ready'));
    }catch{failed=true;} // Do not retry a command that may already have queued.
  }
  function existingLoader(){
    return Array.from(document.querySelectorAll?.('script[src]')||[]).find(script=>{
      try{const url=new URL(script.src,location.href);return url.hostname==='www.googletagmanager.com'&&url.pathname==='/gtag/js';}catch{return false;}
    });
  }
  function loaded(script){
    if(script.dataset.gfsTagLoaded==='1')return true;
    try{
      const id=new URL(script.src,location.href).searchParams.get('id');
      return Boolean(id&&typeof window.gtag==='function'&&window.google_tag_manager?.[id]);
    }catch{return false;}
  }
  function observe(script){
    if(observed.has(script))return;observed.add(script);
    script.addEventListener('load',()=>{script.dataset.gfsTagLoaded='1';configure();},{once:true});
    script.addEventListener('error',()=>{loading=false;failed=true;},{once:true});
  }
  function refresh(){
    const value=config();
    if(!permitted()||!value||failed)return;
    // An account switch requires a page reload; never configure two destinations
    // in one document or retarget receipts already accepted on that document.
    if(destination&&destination!==value.conversionId)return;
    if(configured)return;
    destination=value.conversionId;
    if(loader){if(loaded(loader))configure();return;}
    loader=existingLoader();
    if(loader){
      observe(loader);
      // A pre-existing Google runtime can be shared (for example Firebase GA4).
      // A gtag queue stub alone is insufficient evidence that it has loaded.
      if(loaded(loader))configure();
      else loading=true;
      return;
    }
    if(!document.head?.appendChild)return;
    const script=document.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(destination);
    script.dataset.gfsAdsLoader='1';loader=script;loading=true;observe(script);
    try{command();consent();command()('js',new Date());document.head.appendChild(script);}catch{loading=false;failed=true;}
  }
  window.GFSAdsTag=Object.freeze({ready,config,refresh,status:()=>({configured,loading,failed,destination})});
  for(const name of ['gfs-tracking-ready','gfs-consent-changed','gfs-owner-mode-changed','pageshow','hashchange','popstate','storage'])window.addEventListener?.(name,refresh);
  document.addEventListener?.('DOMContentLoaded',refresh);refresh();
})();

