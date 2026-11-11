/* Ghareeb intake: validated browser requests go to Netlify Forms.
 * Deploy with _netlify-forms.html and the submission-created function together.
 * Netlify retains the receipt and emails the office; the verified event writes
 * the existing Firestore collections. Browser success means receipt accepted,
 * not appointment confirmed or customer email delivered.
 */

(function() {
  'use strict';

  const CFG = {
    // Legacy runtime settings are accepted for compatibility; intake now uses Netlify.
    // Existing backup keys are retained to recover unsent requests.
    localBackupKey: 'gfs_leads_backup',
  };

  // Allow runtime override
  if (window.GFS_LEADS_CONFIG) Object.assign(CFG, window.GFS_LEADS_CONFIG);

  // ---- UTM & SOURCE TRACKING -----------------------------------
  const clickKeys = ['gclid','gbraid','wbraid','fbclid'];
  const campaignKeys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
  const reportingKeys = ['gfs_campaign_id','gfs_adgroup_id','gfs_ad_id','gfs_geo_physical','gfs_geo_interest'];
  const advertisingKeys = [...clickKeys,...reportingKeys];
  const attributionKeys = [...advertisingKeys, ...campaignKeys];
  let attributionMemory = {}, attributionStorageFailed = false;
  function cleanAttribution(value) {
    const out = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    for (const key of [...attributionKeys,'landing_page','landing_at','touch_page','touch_at']) {
      const text = value[key], limit = clickKeys.includes(key) ? 2048 : campaignKeys.includes(key) ? 200 : 300;
      if (typeof text !== 'string' || !text || text.length > limit || /[\u0000-\u001f\u007f]/.test(text)) continue;
      if (clickKeys.includes(key) && /\s/.test(text)) continue;
      if (reportingKeys.includes(key) && window.GFSTrackingPolicy?.validAttributionId(key,text)!==true) continue;
      if (key.endsWith('_page')) { if (text.startsWith('/') && !text.startsWith('//') && !text.includes('\\')) out[key] = text.split(/[?#]/)[0]; }
      else if (key.endsWith('_at')) { if (/^\d{4}-\d{2}-\d{2}T.*Z$/.test(text) && Number.isFinite(Date.parse(text))) out[key] = text; }
      else out[key] = text;
    }
    return out;
  }
  function attributionAllowed(){return window.GFSTrackingPolicy?.anyAllowed()===true;}
  function adsAllowed(){return window.GFSTrackingPolicy?.allowed('advertising')===true;}
  function scrubAdvertising(value){const out={...value};if(!adsAllowed())for(const key of advertisingKeys)delete out[key];return out;}
  function captureAttribution() {
    if(!attributionAllowed()){attributionMemory={};try{sessionStorage.removeItem('gfs_attribution');}catch{}return;}
    let existing = {};
    try { existing = scrubAdvertising(cleanAttribution(JSON.parse(sessionStorage.getItem('gfs_attribution') || '{}'))); }
    catch { attributionStorageFailed = true; }
    const params = new URLSearchParams(window.location.search), incoming = {};
    const newTouch = attributionKeys.some(key => params.has(key));
    for (const key of attributionKeys) {
      const values = params.getAll(key);
      if (values.length === 1 && (!advertisingKeys.includes(key)||adsAllowed())) incoming[key] = values[0];
    }
    const now = new Date().toISOString(), page = window.location.pathname.slice(0,300);
    // First observed page and the latest explicit campaign touch are distinct.
    // A new touch replaces the entire campaign bundle, never only its new keys.
    attributionMemory = newTouch ? {
      ...cleanAttribution(incoming), touch_page: page, touch_at: now,
      landing_page: existing.landing_page || page, landing_at: existing.landing_at || now
    } : { ...existing, landing_page: existing.landing_page || page, landing_at: existing.landing_at || now };
    try { sessionStorage.setItem('gfs_attribution', JSON.stringify(attributionMemory)); }
    catch { attributionStorageFailed = true; }
  }
  captureAttribution();

  function getAttribution() {
    if(!attributionAllowed())return {};
    if (!attributionStorageFailed) {
      try { attributionMemory = cleanAttribution(JSON.parse(sessionStorage.getItem('gfs_attribution') || JSON.stringify(attributionMemory))); }
      catch { attributionStorageFailed = true; }
    }
    return scrubAdvertising(attributionMemory);
  }

  // ---- BUILD LEAD PAYLOAD --------------------------------------
  // Strict compliance with deployed Firestore rules for the
  // `websiteLeads` collection:
  //   - Required: name (str ≤200), phone (str ≤200), status='new', source (str ≤100)
  //   - Optional: email (str ≤200), address (str ≤500), notes (str ≤2000),
  //               fenceType (str ≤200)
  //   - HARD LIMIT: ≤20 total fields per document (docUnder(20))
  //
  // Staff convert these intake records into jobs in the Executive app.
  // Compose a full name from whatever the form actually provides.
  // The contact, quote and booking forms collect firstName + lastName in
  // separate visible inputs alongside an EMPTY hidden `name` field. Nothing
  // ever combined them, so `name` arrived blank, validation rejected it, and
  // every one of those forms failed for real visitors.
  function resolveName(input) {
    const direct = (input.name || '').trim();
    if (direct) return direct;
    const first = (input.firstName || '').trim();
    const last = (input.lastName || '').trim();
    return (first + ' ' + last).trim();
  }

  function buildLead(input) {
    const fullName = resolveName(input);
    const email = (input.email || '').trim().toLowerCase();
    const phone = normalizePhone(input.phone || '');
    const address = (input.address || '').trim();
    const rawNotes = (input.notes || '').trim();

    // Compile structured project info into a readable notes string.
    // The Executive app's lead inbox displays this as the project summary.
    const detail = [];
    const parentReceipt = input.source === 'ballpark-email-estimate' && typeof input.parentReceipt === 'string' && /^web_[a-zA-Z0-9_-]{16,80}$/.test(input.parentReceipt) ? input.parentReceipt : '';
    if (parentReceipt) detail.push(`Email follow-up to request: ${parentReceipt}`);
    if (input.projectType)     detail.push(`Project: ${input.projectType}`);
    if (input.fenceType)       detail.push(`Fence: ${input.fenceType}`);
    if (input.fenceStyle)      detail.push(`Style: ${input.fenceStyle}`);
    if (input.linearFeet)      detail.push(`Length: ${input.linearFeet} ft`);
    if (input.height)          detail.push(`Height: ${input.height} ft`);
    const gateBits = [];
    if (Number(input.singleGates) > 0) gateBits.push(`${input.singleGates} walk`);
    if (Number(input.doubleGates) > 0) gateBits.push(`${input.doubleGates} drive`);
    if (gateBits.length) detail.push(`Gates: ${gateBits.join(' + ')}`);
    if (input.removeOldFence) detail.push('Remove existing fence');
    if (input.timeline)        detail.push(`Timeline: ${input.timeline}`);
    if (input.heardFrom)       detail.push(`Source: ${input.heardFrom}`);
    const interest = window.GFSProjectContext?.get();
    if (interest) detail.push(`Project interest: ${interest.label}`);
    const projectDetail = detail.join(' · ');
    const compiledNotes = [projectDetail, rawNotes]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 1990);  // safe under the 2000-char rule cap

    // Attribution + page metadata as a single compact string.
    // Lives inside the notes-style fields to keep total field count low.
    // Put the link first so the server's existing metadata length cap cannot
    // trim it away. It is a reference, never authority to change that record.
    const meta = [input.source === 'ballpark-email-estimate' ? 'request_action=email_estimate' : '', parentReceipt ? 'parent_receipt=' + encodeURIComponent(parentReceipt) : '', attributionMeta()].filter(Boolean).join(' | ');

    // FINAL DOCUMENT — exactly the shape your rules validate.
    // Field count: name, phone, status, source, email, address,
    // notes, fenceType, fenceStyle, linearFeet, height, singleGates,
    // doubleGates, timeline, geometry, meta, createdAt, createdAtMs plus optional photo = 19 fields
    return {
      // Required (rules enforce these)
      name: fullName.slice(0, 200),
      phone: phone.slice(0, 50),
      status: 'new',                     // MUST be 'new' (rule literal)
      source: (input.source || 'website').slice(0, 100),
      // Optional but rule-validated
      email: email.slice(0, 200),
      address: address.slice(0, 500),
      notes: compiledNotes,
      fenceType: (input.fenceType || '').slice(0, 200),
      // Structured project data (no rule restrictions, helps owner triage)
      fenceStyle: input.fenceStyle || '',
      linearFeet: input.linearFeet ? Number(input.linearFeet) : null,
      height: input.height || '',
      singleGates: input.singleGates ? Number(input.singleGates) : 0,
      doubleGates: input.doubleGates ? Number(input.doubleGates) : 0,
      timeline: input.timeline || '',
      // Drawn fence geometry from the ballpark map (JSON string of
      // {lat,lng} lines + gates) — the Exec app rebuilds the sketch
      // from this. Empty string when the customer typed a length
      // instead of drawing. Field 18 of 20 allowed.
      photo: typeof input.photo === 'string' ? input.photo : '',
      geometry: typeof input.geometry === 'string' ? input.geometry : '',
      // Attribution + page (single field to stay under 20)
      meta: meta,
      // Timestamps
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
    };
  }

  function attributionMeta(){
    const attr=getAttribution()||{},parts=[];
    // Keep complete click IDs before descriptive campaign data. One bounded
    // metadata field preserves compatibility with the existing intake schema.
    for(const key of ['gclid','gbraid','wbraid','fbclid']){const value=String(attr[key]||'');if(value&&value.length<=2048)parts.push(key+'='+encodeURIComponent(value));}
    for(const key of reportingKeys)if(attr[key])parts.push(key+'='+attr[key]);
    for(const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'])if(attr[key])parts.push(key+'='+encodeURIComponent(String(attr[key]).slice(0,200)));
    parts.push('page='+encodeURIComponent(location.pathname.slice(0,300)));
    if(attr.landing_page)parts.push('landing_page='+encodeURIComponent(String(attr.landing_page).slice(0,300)));
    if(attr.landing_at)parts.push('landing_at='+encodeURIComponent(String(attr.landing_at).slice(0,40)));
    if(attr.touch_page)parts.push('touch_page='+encodeURIComponent(String(attr.touch_page).slice(0,300)));
    if(attr.touch_at)parts.push('touch_at='+encodeURIComponent(String(attr.touch_at).slice(0,40)));
    const interest=window.GFSProjectContext?.get();
    if(interest)parts.push('project_intent='+encodeURIComponent(interest.intent));
    if(document.referrer)try{const ref=new URL(document.referrer);parts.push('ref='+encodeURIComponent((ref.origin+ref.pathname).slice(0,300)));}catch{}
    const privacy=window.GFSConsent?.snapshot();
    parts.push('privacy_context='+ (window.GFSTrackingPolicy?.contextAllowed()?'public':'excluded'));
    parts.push('privacy_state='+ (privacy?.choiceId?'browser_choice_unverified':'not_recorded'));
    if(privacy?.choiceId){parts.push('privacy_choice_id='+encodeURIComponent(privacy.choiceId),'privacy_notice='+encodeURIComponent(privacy.noticeVersion),'privacy_recorded_at_client='+privacy.recordedAtClient,'privacy_analytics='+ (privacy.analytics?'granted':'denied'),'privacy_ads_measurement='+ (privacy.advertising?'granted':'denied'),'privacy_ad_personalization=denied');}
    return parts.join(' | ');
  }

  function normalizePhone(p) {
    return p.replace(/[^\d+]/g, '');
  }

  // ---- VALIDATION ----------------------------------------------
  // These MUST match the field names buildLead() produces (name/phone/email).
  // They previously read customerName/customerPhone/customerEmail, which
  // buildLead never sets — so every submission failed validation and no lead
  // could ever be captured from the website.
  function validate(lead) {
    const errors = [];
    if (!lead.name || lead.name.length < 2) errors.push('Name is required');
    if (!lead.phone || lead.phone.replace(/\D/g,'').length < 10) errors.push('Valid phone number is required');
    if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push('Email is invalid');
    if (lead.photo && (lead.photo.length > 380000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(lead.photo))) errors.push('Choose a smaller JPG, PNG, or WebP photo');
    if (lead.geometry) {
      try {
        if (lead.geometry.length > 45000) throw Error('size');
        const drawing = JSON.parse(lead.geometry);
        const validPoint = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
        if (!drawing || !Array.isArray(drawing.lines) || drawing.lines.length > 100 || drawing.lines.some(line => !Array.isArray(line) || line.length < 2 || !line.every(validPoint)) || drawing.lines.flat().length > 3000 || (drawing.gates !== undefined && (!Array.isArray(drawing.gates) || drawing.gates.length > 200 || drawing.gates.some(gate => !validPoint(gate) || (gate.type !== undefined && !['walk','drive'].includes(gate.type)))))) throw Error('drawing');
      } catch { errors.push('Please simplify or redraw the fence layout before sending. Your drawing has not been submitted.'); }
    }
    return errors;
  }

  // ---- SUBMIT LEAD ---------------------------------------------

  // Netlify retains the submission and emails the office. Its verified event
  // creates the matching Firestore intake independently of the visitor's browser.
  const inflight=new Map();
  async function routeIntake(record,kind,requestScope={}){
    const baseFingerprint=JSON.stringify([kind,record.name,record.phone,record.email,record.address,record.notes,record.geometry,record.photo,record.date,record.time]);
    const fingerprint=requestScope.scope?baseFingerprint+'|flow='+requestScope.scope:baseFingerprint;
    if(inflight.has(fingerprint))return inflight.get(fingerprint);
    const run=(async()=>{
      const storageKey='gfs-intake-pending-v1';let pending=[];
      try{pending=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(pending))pending=[];}catch{}
      let row=requestScope.retryId?pending.find(x=>x.id===requestScope.retryId&&x.fingerprint===fingerprint):pending.find(x=>x.fingerprint===fingerprint);
      if(requestScope.retryId&&!row)return{ok:false,errors:['This saved request changed or is no longer pending. Review the form before sending.']};
      if(!row&&requestScope.scope&&requestScope.legacyRecoveryAllowed)row=pending.find(x=>x.fingerprint===baseFingerprint);
      if(!row){row={id:crypto.randomUUID(),kind,record,fingerprint,at:Date.now(),origin:location.origin};if(requestScope.flowId&&/^[a-f0-9]{64}$/.test(requestScope.key||''))row.flowKey=requestScope.key;pending.push(row);}
      try{localStorage.setItem(storageKey,JSON.stringify(pending.slice(-25)));}catch{}
      // An ambiguous prior acknowledgement must retry the same receipt payload,
      // including its original acquisition, rather than attach a later visit.
      const submittedRecord=row.record;
      if(submittedRecord&&!adsAllowed()&&window.GFSConsent)submittedRecord.meta=window.GFSConsent.redactMeta(submittedRecord.meta);
      if(!submittedRecord||validate(submittedRecord).length)return{ok:false,errors:['This saved request needs review. Re-enter your details before retrying.']};
      const fields={'form-name':'gfs-'+kind,gfs_contract:'gfs-intake-v1',intake_kind:kind,submission_id:row.id,'bot-field':'',...submittedRecord};
      delete fields.photo;
      let body=new URLSearchParams(fields).toString(),headers={'Content-Type':'application/x-www-form-urlencoded'};
      if(submittedRecord.photo){
        const [prefix,encoded]=submittedRecord.photo.split(','),binary=atob(encoded),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
        body=new FormData();for(const [key,value] of Object.entries(fields))body.append(key,String(value??''));
        body.append('photo',new Blob([bytes],{type:prefix.slice(5,prefix.indexOf(';'))}),'customer-property.'+(prefix.includes('jpeg')?'jpg':prefix.includes('png')?'png':'webp'));headers={};
      }
      try{
        const response=await fetch('/_netlify-forms.html',{method:'POST',headers,body,signal:AbortSignal.timeout(18000)});
        if(!response.ok)throw Error('Form delivery failed');
        try{const current=JSON.parse(localStorage.getItem(storageKey)||'[]');localStorage.setItem(storageKey,JSON.stringify(current.filter(x=>x.id!==row.id)));}catch{}
        return {ok:true,id:'web_'+row.id,receipt:'netlify',sync:'pending',acceptedRecord:submittedRecord};
      }catch{return {ok:false,errors:['Your request has not been confirmed. Please retry or call (419) 214-2107. Your details remain on this device.']};}
    })();inflight.set(fingerprint,run);try{return await run;}finally{inflight.delete(fingerprint);}
  }
  async function submitRecordWithFlow(record,kind,options={}){
    let prepared={record,kind,track:record.source!=='ballpark-email-estimate'&&!/(?:request_action=)(?:email_estimate|appointment_request|project_update)(?:\s*\||$)/.test(record.meta||'')};
    try{if(window.GFSRequestFlow)prepared=await window.GFSRequestFlow.prepare(record,kind,options);}catch{return{ok:false,errors:['We could not prepare this project request. Please retry or call our office.']};}
    if(prepared.decision)return{ok:false,requiresDecision:prepared.decision,errors:prepared.errors};
    if(prepared.reuse)return prepared.reuse;
    let delivered;
    try{delivered=await routeIntake(prepared.record,kind,prepared);}catch{window.GFSRequestFlow?.cancel(prepared);return{ok:false,errors:['This request could not be confirmed. Please retry or call our office.']};}
    const {acceptedRecord,...receipt}=delivered;
    const result=window.GFSRequestFlow?window.GFSRequestFlow.commit(prepared,receipt,acceptedRecord):receipt;
    if(result.ok&&prepared.track&&acceptedRecord.source!=='ballpark-email-estimate'){try{fireAnalytics(acceptedRecord,result.id,kind==='booking'?'booking':'lead');}catch{}}
    return result;
  }
  async function submit(input,options={}){const lead=buildLead(input),errors=validate(lead);if(errors.length)return{ok:false,errors};return submitRecordWithFlow(lead,/ballpark/i.test(lead.source)?'ballpark':'estimate',options);}

  // ---- ANALYTICS -----------------------------------------------
  const receiptPattern = /^web_[a-zA-Z0-9_-]{16,80}$/;
  const conversionKey = 'gfs-conversion-invocations-v2', conversionTTL = 30*60*1000;
  let conversionTimer = null, conversionPolls = 0;
  function ownerTraffic(){try{return localStorage.getItem('gfs_owner')==='1';}catch{return false;}}
  function publicTrackingHost(){return ['ghareebfencingsolutions.com','www.ghareebfencingsolutions.com','ghareebfence.com'].includes(location.hostname)&&window.GFSTrackingPolicy?.contextAllowed()===true;}
  let conversions = [], legacyReceipts = [];
  try {
    const saved=window.GFSTrackingPolicy?.anyAllowed()?JSON.parse(sessionStorage.getItem(conversionKey)||'[]'):[];
    if(Array.isArray(saved))conversions=saved.filter(row=>row?.version===2 && receiptPattern.test(row.receipt||'') && row.host===location.hostname && Number.isFinite(row.at) && row.at<=Date.now() && Date.now()-row.at<conversionTTL && row.event?.receipt===row.receipt && row.data?.transaction_id===row.receipt && typeof row.permissions?.analytics==='boolean' && typeof row.permissions?.advertising==='boolean' && row.permissions.choiceId===window.GFSConsent?.snapshot().choiceId && row.permissions.noticeVersion===window.GFSConsent?.noticeVersion).slice(-100);
    const legacy=JSON.parse(sessionStorage.getItem('gfs_conversion_receipts')||'[]');
    if(Array.isArray(legacy))legacyReceipts=legacy.filter(id=>receiptPattern.test(id));
  }catch{}
  // Restore captured receipt context for first-party analytics after navigation.
  const restoredReceipts=window.GFS_ACCEPTED_RECEIPTS=window.GFS_ACCEPTED_RECEIPTS||[];
  for(const row of conversions)if(!restoredReceipts.some(event=>event.receipt===row.receipt))restoredReceipts.push(JSON.parse(JSON.stringify(row.event)));
  if(restoredReceipts.length>100)restoredReceipts.splice(0,restoredReceipts.length-100);
  function persistConversions(){try{sessionStorage.setItem(conversionKey,JSON.stringify(conversions));}catch{}}
  function receiptContext(lead,receipt,kind){
    const values={};
    for(const part of String(lead.meta||'').split(' | ')){
      const at=part.indexOf('='),key=part.slice(0,at);
      if(![...attributionKeys,'page','ref'].includes(key))continue;
      try{values[key]=decodeURIComponent(part.slice(at+1));}catch{}
    }
    const clean=cleanAttribution(values),attribution={};
    for(const key of ['utm_source','utm_medium','utm_campaign'])attribution[key]=String(clean[key]||'').slice(0,60);
    attribution.googlePaid=Boolean(clean.gclid||clean.gbraid||clean.wbraid);
    attribution.facebook=Boolean(clean.fbclid);
    let ref='';try{ref=new URL(values.ref).hostname.slice(0,80);}catch{}
    const submittedPath=typeof values.page==='string'&&values.page.startsWith('/')&&!values.page.startsWith('//')&&!values.page.includes('\\')?values.page.split(/[?#]/)[0]:location.pathname;
    return {receipt,type:kind,label:String(lead.source||'website').slice(0,100),path:submittedPath.slice(0,300),attribution,ref,at:Date.now(),trackingAllowed:!window.GFSTrackingPolicy||(window.GFSTrackingPolicy.safeUrl(values.page||submittedPath)&&(!values.ref||window.GFSTrackingPolicy.safeUrl(values.ref)))};
  }
  function attemptConversion(row,platform,send){
    row.invocations=row.invocations||{};
    if(row.invocations[platform])return;
    // Record before invocation: a throwing tag may already have queued its event.
    // Never equate invocation with platform acceptance or blindly resend it.
    row.invocations[platform]='attempted';persistConversions();
    try{send();row.invocations[platform]='invoked';}catch{row.invocations[platform]='uncertain';}
    persistConversions();
  }
  function flushConversionEvents(){
    if(!publicTrackingHost()||ownerTraffic())return;
    conversions=conversions.filter(row=>row.at<=Date.now()&&Date.now()-row.at<conversionTTL);
    for(const row of conversions){
      const choice=window.GFSConsent?.snapshot();
      if(!choice?.choiceId||row.permissions.choiceId!==choice.choiceId||row.permissions.noticeVersion!==choice.noticeVersion)continue;
      if(legacyReceipts.includes(row.receipt))continue; // Legacy markers cannot identify which platforms ran.
      if(window.GFSTrackingPolicy&&(!window.GFSTrackingPolicy.safeUrl(row.event.path)||!window.GFSTrackingPolicy.safeFields(row.data)))continue;
      if(row.permissions.analytics&&window.GFSTrackingPolicy.allowed('analytics')){
        if(typeof window.GFS_ANALYTICS?.logEvent==='function')attemptConversion(row,'ga',()=>window.GFS_ANALYTICS.logEvent('generate_lead',{...row.data}));
        // A global gtag may belong only to Ads. Keep GA pending until the
        // Firebase Analytics instance can route this receipt to its GA4 stream.
      }
      if(!row.permissions.advertising||!adsAllowed())continue;
      if(!window.GFSAdsTag?.ready())continue;
      const config=window.GFSAdsTag.config();
      if(!row.ads && config){
        row.ads={send_to:config.conversionId+'/'+config.label,transaction_id:row.receipt};
        if(Number.isFinite(config.value)&&config.value>=0){row.ads.value=config.value;row.ads.currency='USD';}
        persistConversions();
      }
      if(row.ads && typeof window.gtag==='function')attemptConversion(row,'ads',()=>window.gtag('event','conversion',{...row.ads}));
      // Meta measurement remains off pending its account and data-use review.
    }
    // Bounded readiness polling. Integrations may also dispatch gfs-tracking-ready
    // or call retryConversionEvents when a tag/configuration becomes available.
    const pending=conversions.some(row=>!legacyReceipts.includes(row.receipt)&&((row.permissions.analytics&&window.GFSTrackingPolicy.allowed('analytics')&&!row.invocations?.ga)||(row.permissions.advertising&&adsAllowed()&&!row.invocations?.ads)));
    if(pending && conversionTimer===null && conversionPolls<12 && typeof setTimeout==='function'){
      conversionPolls++;
      conversionTimer=setTimeout(()=>{conversionTimer=null;flushConversionEvents();},5000);
    }
  }
  function retryConversionEvents(){conversionPolls=0;flushConversionEvents();}
  for(const name of ['load','pageshow','online','gfs-firebase-ready','gfs-tracking-ready'])window.addEventListener?.(name,retryConversionEvents);
  document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')retryConversionEvents();});

  function recordPermissions(record){
    const fields={},duplicates=new Set();
    for(const part of String(record.meta||'').split(' | ')){const at=part.indexOf('='),key=part.slice(0,at);if(!key.startsWith('privacy_'))continue;if(Object.hasOwn(fields,key))duplicates.add(key);try{fields[key]=decodeURIComponent(part.slice(at+1));}catch{duplicates.add(key);}}
    const choice=window.GFSConsent?.snapshot(),sameChoice=duplicates.size===0&&fields.privacy_state==='browser_choice_unverified'&&fields.privacy_context==='public'&&choice?.choiceId&&fields.privacy_choice_id===choice.choiceId;
    return {choiceId:choice?.choiceId||null,noticeVersion:choice?.noticeVersion||null,analytics:Boolean(sameChoice&&fields.privacy_analytics==='granted'&&window.GFSTrackingPolicy.allowed('analytics')),advertising:Boolean(sameChoice&&fields.privacy_ads_measurement==='granted'&&adsAllowed())};
  }
  function fireAnalytics(lead, receipt, kind='lead') {
    if(!window.GFSTrackingPolicy?.anyAllowed())return;
    if(!receiptPattern.test(receipt||'')||ownerTraffic()||/^SYSTEM[ _-]*TEST\b/i.test(lead.name||'')||/system[ _-]*test/i.test(lead.source||''))return;
    const prior=conversions.find(row=>row.receipt===receipt);
    const event=prior?.event||receiptContext(lead,receipt,kind);
    const permissions=prior?.permissions||recordPermissions(lead);
    if(!permissions.analytics&&!permissions.advertising)return;
    event.permissions={...permissions};
    if(event.trackingAllowed===false)return;
    if(window.GFSTrackingPolicy&&(!window.GFSTrackingPolicy.safeUrl(event.path)||!window.GFSTrackingPolicy.safeFields({...event.attribution,label:event.label,fence_type:lead.fenceType})))return;
    const queue=window.GFS_ACCEPTED_RECEIPTS=window.GFS_ACCEPTED_RECEIPTS||[];
    if(!queue.some(row=>row.receipt===receipt))queue.push(event);
    if(queue.length>100)queue.shift();
    try{window.dispatchEvent(new CustomEvent('gfs-intake-accepted',{detail:event}));}catch{}
    if(!publicTrackingHost()||legacyReceipts.includes(receipt))return;
    if(!prior){
      conversions.push({version:2,receipt,permissions,host:location.hostname,at:event.at,event:JSON.parse(JSON.stringify(event)),data:{fence_type:String(lead.fenceType||'').slice(0,200),source:event.label,source_page:event.path,transaction_id:receipt,utm_source:event.attribution.utm_source,utm_medium:event.attribution.utm_medium,utm_campaign:event.attribution.utm_campaign},invocations:{}});
      conversions=conversions.slice(-100);persistConversions();
    }
    retryConversionEvents();
  }

  window.addEventListener?.('gfs-consent-cleared',()=>{
    conversions=[];legacyReceipts=[];
    try{const ids=JSON.parse(sessionStorage.getItem('gfs_conversion_receipts')||'[]');if(Array.isArray(ids))legacyReceipts=ids.filter(id=>receiptPattern.test(id));}catch{}
    window.GFS_ACCEPTED_RECEIPTS=[];attributionMemory={};
    if(conversionTimer!==null&&typeof clearTimeout==='function')clearTimeout(conversionTimer);conversionTimer=null;conversionPolls=0;
    // A later opt-in starts a fresh observed touch. It never revives a queued lead.
    captureAttribution();
  });

  // ---- EXPLICIT RECOVERY OF UNCONFIRMED REQUESTS -------------------
  // Local storage is not a new instruction to transmit an abandoned form.
  // Offer review on intake pages; neither current nor legacy queues auto-send.
  const pendingKey='gfs-intake-pending-v1';
  function recoveryAllowed(){return window.GFSTrackingPolicy?.contextAllowed()===true;}
  function pendingRows(){try{const rows=JSON.parse(localStorage.getItem(pendingKey)||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}}
  function recoveryScope(row){
    try{
    if(!row||!['estimate','ballpark','booking'].includes(row.kind)||!receiptPattern.test('web_'+row.id)||!row.record||typeof row.record!=='object'||validate(row.record).length||(row.origin&&row.origin!==location.origin)||['form-name','gfs_contract','intake_kind','submission_id','bot-field'].some(key=>Object.hasOwn(row.record,key)))return null;
    if(row.kind==='booking'){const date=row.record.date;if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date||!row.record.time)return null;}
    const r=row.record,base=JSON.stringify([row.kind,r.name,r.phone,r.email,r.address,r.notes,r.geometry,r.photo,r.date,r.time]);
    if(row.fingerprint===base)return '';
    const suffix=String(row.fingerprint||'').slice(base.length);
    return String(row.fingerprint||'').startsWith(base)&&/^\|flow=[a-zA-Z0-9_-]{16,80}$/.test(suffix)?suffix.slice(6):null;
    }catch{return null;}
  }
  async function retryPendingRequest(id){
    if(!recoveryAllowed())return{ok:false,errors:['Saved requests can only be reviewed on the public website.']};
    const matches=pendingRows().filter(row=>row?.id===id),row=matches.length===1?matches[0]:null,scope=recoveryScope(row);
    if(scope===null||scope&&!window.GFSRequestFlow)return{ok:false,errors:['This saved request needs manual review. Please call (419) 214-2107 with its reference before sending another request.']};
    // Use the original flow, not whichever project happens to be open now.
    // Missing/expired flows are rejected by prepare; never silently merge them.
    const followup=row.record.source==='ballpark-email-estimate'||/(?:request_action=)(?:email_estimate|appointment_request|project_update)(?:\s*\||$)/.test(row.record.meta||'');
    if(scope&&followup&&!/^[a-f0-9]{64}$/.test(row.flowKey||''))return{ok:false,errors:['This older follow-up needs office review before retrying. Please call (419) 214-2107 with its reference.']};
    let prepared={record:row.record,kind:row.kind,track:!followup};
    try{if(window.GFSRequestFlow)prepared=await window.GFSRequestFlow.prepare(row.record,row.kind,{flowId:scope||undefined,mode:followup?'update':'initial'});}catch{return{ok:false,errors:['We could not prepare this saved request. Please retry or call (419) 214-2107 with its reference.']};}
    if(prepared.decision)return{ok:false,requiresDecision:prepared.decision,errors:prepared.errors};
    if(prepared.reuse)return prepared.reuse.id==='web_'+id?prepared.reuse:{ok:false,errors:['This project already has a different received request. Please call our office before retrying.']};
    if(Boolean(prepared.action)!==followup&&scope){window.GFSRequestFlow?.cancel(prepared);return{ok:false,errors:['This project context changed. Please call our office with the saved reference.']};}
    // prepare reserves the original flow; its decorated follow-up record must
    // not replace the exact payload already sent under this request UUID.
    prepared={...prepared,record:row.record,key:row.flowKey||prepared.key,track:!followup&&prepared.track};
    let delivered;try{delivered=await routeIntake(row.record,row.kind,{...prepared,retryId:id});}catch{window.GFSRequestFlow?.cancel(prepared);return{ok:false,errors:['This saved request could not be confirmed. Please retry or call our office.']};}
    const {acceptedRecord,...receipt}=delivered;
    const result=window.GFSRequestFlow?window.GFSRequestFlow.commit(prepared,receipt,acceptedRecord):receipt;
    if(result.ok&&prepared.track)try{fireAnalytics(acceptedRecord,result.id,row.kind==='booking'?'booking':'lead');}catch{}
    return result;
  }
  function showPendingRecovery(){
    if(!recoveryAllowed()||!document.createElement||!document.querySelector||document.getElementById?.('gfs-pending-recovery'))return;
    const form=document.querySelector('[data-lead-form], #bp-form');if(!form?.parentElement)return;
    const rows=pendingRows();let legacy=[];try{legacy=JSON.parse(localStorage.getItem(CFG.localBackupKey)||'[]');}catch{}
    const legacyCount=Array.isArray(legacy)?legacy.filter(row=>row&&!row.savedToCloud).length:0;
    if(!rows.length&&!legacyCount)return;
    const panel=document.createElement('section');panel.id='gfs-pending-recovery';panel.setAttribute('data-gfs-protected','');panel.setAttribute('aria-label','Saved requests on this device');panel.style.cssText='margin:16px 0;padding:16px;border:1px solid #d6dce1;border-radius:8px;background:#f8fafb;color:#173344;overflow-wrap:anywhere';
    const heading=document.createElement('h2');heading.textContent='Your saved requests';panel.appendChild(heading);
    const note=document.createElement('p');note.textContent='Check each request below for its delivery status. Review the saved details before retrying; nothing will be sent automatically.';panel.appendChild(note);
    for(const row of rows.slice(-25)){
      const scope=recoveryScope(row);if(scope===null)continue;
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Review '+(row.kind==='booking'?'visit':'project')+' request · '+new Date(row.at).toLocaleDateString();details.appendChild(summary);
      const labels={name:'Name',phone:'Phone',email:'Email',address:'Address',fenceType:'Fence',notes:'Project details',date:'Requested date',time:'Requested time'};
      const review=document.createElement('p');review.style.whiteSpace='pre-wrap';review.textContent=['Reference: web_'+row.id,...Object.keys(labels).map(key=>row.record[key]?labels[key]+': '+row.record[key]:'').filter(Boolean),row.record.geometry?'Saved drawing included.':'',row.record.photo?'Saved photo included.':''].filter(Boolean).join('\n');details.appendChild(review);
      const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Delivery not confirmed. Review these details before retrying.';
      const retry=document.createElement('button');retry.type='button';retry.className='btn btn-outline';retry.textContent='Retry this saved request';retry.addEventListener('click',async()=>{
        if(retry.disabled)return;retry.disabled=true;status.textContent='Sending this saved request…';
        let result;try{result=await retryPendingRequest(row.id);}catch{result={ok:false,errors:['This request could not be confirmed. Please call (419) 214-2107.']};}
        status.textContent=result.ok?'Request received. Reference: '+result.id+'. We will contact you about the next step.':(result.requiresDecision?'The original project context needs review. Return to its form and continue the project, or call (419) 214-2107 with the reference before sending another request.':(result.errors||['Please call our office.']).join(' '));
        retry.disabled=Boolean(result.ok);
        if(result.ok){summary.textContent='Received '+(row.kind==='booking'?'visit':'project')+' request · '+new Date(row.at).toLocaleDateString();retry.textContent='Request received';}
      });details.appendChild(retry);details.appendChild(status);panel.appendChild(details);
    }
    if(legacyCount){const legacyNote=document.createElement('p');legacyNote.textContent='An older saved request also needs review. Please call (419) 214-2107 before sending it again; its original delivery reference cannot be verified here.';panel.appendChild(legacyNote);}
    form.parentElement.insertBefore(panel,form);
  }

  // ---- FORM HELPER ---------------------------------------------
  // Hooks up any element with [data-lead-form] to use this system.
  // The form's inputs need name="" matching the lead fields above.
  function bindForm(form) {
    if (form.dataset.bound === 'yes') return;
    form.dataset.bound = 'yes';
    window.GFSRequestFlow?.bindForm(form,form.hasAttribute('data-booking-form')?'booking':'estimate');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {};
      Array.from(form.elements).forEach(el => {
        if (!el.name) return;
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else data[el.name] = el.value;
      });

      const submitBtn = form.querySelector('[type="submit"]');
      if(submitBtn?.disabled)return;
      const successEl = form.querySelector('.form-success');
      const errorEl = form.querySelector('.form-error');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.label = submitBtn.textContent; submitBtn.textContent = 'Sending...'; }
      if (successEl) successEl.classList.remove('show');
      if (errorEl) errorEl.classList.remove('show');
      window.GFSRequestFlow?.setBusy(form,true);

      // Forms marked data-booking-form create an appointment request in
      // /bookings, which the Executive app live-listens to and renders on
      // its booking calendar. Everything else becomes a website lead.
      const isBooking = form.hasAttribute('data-booking-form');
      let result;
      try {
        const options=window.GFSRequestFlow?.optionsFor(form)||{};
        result = isBooking ? await submitBooking(data,options) : await submit(data,options);
      } catch (err) {
        console.error('Submission failed:', err);
        result = { ok: false, errors: ['Something went wrong. Please call (419) 214-2107.'] };
      }

      window.GFSRequestFlow?.setBusy(form,false);
      window.GFSRequestFlow?.showResult(form,result);
      if (result.ok) {
        // A preferred time is a request; only staff confirms or reserves it.
        if (successEl) {
          successEl.textContent = isBooking
            ? '\u2713 We received your preferred date and time. We will contact you to confirm the visit.'
            : '\u2713 Thanks! Your request has been received. We will review your project and contact you about the next step.';
          successEl.classList.add('show');
        }
        if(!window.GFSRequestFlow)form.reset();
        if (form.dataset.redirect && !window.GFSRequestFlow) {
          setTimeout(() => { window.location.href = form.dataset.redirect; }, 1500);
        }
      } else {
        if (errorEl) {
          errorEl.textContent = (result.errors || ['Something went wrong']).join('. ');
          errorEl.classList.add('show');
        }
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.label || 'Submit';
      }
    });
  }

  function init() {
    document.querySelectorAll('[data-lead-form]').forEach(bindForm);
    showPendingRecovery();
    retryConversionEvents();
  }

  // ---- BOOKING SUBMISSION ---------------------------------------
  // Writes to the `bookings` collection for consultation requests.
  // Rules require: name, phone, date, time (all strings).
  // Optional: email, address, notes (rule-validated max lengths).
  async function submitBooking(input,options={}) {
    const booking = {
      name: resolveName(input).slice(0, 200),
      phone: normalizePhone(input.phone || '').slice(0, 50),
      date: (input.date || '').trim().slice(0, 30),
      time: (input.time || '').trim().slice(0, 30),
      email: (input.email || '').trim().toLowerCase().slice(0, 200),
      address: (input.address || '').trim().slice(0, 500),
      notes: buildLead(input).notes,
      meta: attributionMeta(),
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      source: input.source || 'website-booking',
    };

    // Validate required fields
    const errors = validate(booking);
    const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(booking.date) ? new Date(booking.date + 'T12:00:00Z') : null;
    if (!requestedDate || !Number.isFinite(requestedDate.getTime()) || requestedDate.toISOString().slice(0,10) !== booking.date) errors.push('Pick a valid date');
    if (!booking.time) errors.push('Pick a time');
    if (errors.length) return { ok: false, errors };

    // Always back up locally first (last 50 retained)
    try {
      const key = 'gfs_bookings';
      const backup = JSON.parse(localStorage.getItem(key) || '[]');
      backup.push(booking);
      while (backup.length > 50) backup.shift();
      localStorage.setItem(key, JSON.stringify(backup));
    } catch (e) {}

    return submitRecordWithFlow(booking,'booking',options);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  window.GFSLeads = { submit, submitBooking, buildLead, validate, bindForm, getAttribution, retryConversionEvents, retryPendingRequest };
})();
