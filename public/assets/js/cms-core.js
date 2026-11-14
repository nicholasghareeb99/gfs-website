(function (global) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const stable = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, k) => { o[k] = v[k]; return o; }, {}) : v);
  function merge(base = {}, local = {}, remote = {}) {
    const result = copy(remote);
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw Error('Invalid page field.');
      if (stable(base[key]) === stable(local[key])) continue;
      if (stable(remote[key]) !== stable(base[key]) && stable(remote[key]) !== stable(local[key])) throw Object.assign(Error('This page changed on another device. Your draft is kept; reload to review the latest page.'), {code:'cms/conflict',field:key});
      if (Object.hasOwn(local, key)) result[key] = copy(local[key]);
      else delete result[key];
    }
    return result;
  }
  function sizeCheck(value) {
    if (new TextEncoder().encode(JSON.stringify(value)).length > 800 * 1024) throw Error('This page has too much embedded image data. Replace large photos with uploaded files or hosted image links. Your draft is kept.');
  }
  async function publish({db, collection, pageId, base, local, chromeBase, chromeLocal, chromeChanged, check}) {
    const page = db.collection(collection).doc(pageId), chrome = db.collection(collection).doc('_chrome');
    return db.runTransaction(async tx => {
      check();
      const p = await tx.get(page);
      const c = chromeChanged ? await tx.get(chrome) : null;
      check();
      const data = merge(base, local, p.exists ? p.data() : {});
      const shared = chromeChanged ? merge(chromeBase, chromeLocal, c.exists ? c.data() : {}) : chromeLocal;
      sizeCheck(data); if(chromeChanged) sizeCheck(shared);
      tx.set(page, data);
      if(chromeChanged) tx.set(chrome, shared);
      return {page:data, chrome:shared};
    });
  }
  function imageSettings(value = {}) {
    const number = (v, fallback) => Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Number(v))) : fallback;
    return {alt:String(value.alt || '').slice(0,500), x:number(value.x,50), y:number(value.y,50), fit:value.fit === 'contain' ? 'contain' : 'cover', ratio:['original','16/9','4/3','1/1','3/4'].includes(value.ratio) ? value.ratio : 'original', width:Math.max(25,number(value.width,100)), align:['left','center','right'].includes(value.align)?value.align:'center'};
  }
  function styleImage(img, data) {
    if(!img)return;
    const s=imageSettings(data);
    img.alt=s.alt; img.style.objectPosition=s.x+'% '+s.y+'%'; img.style.objectFit=s.fit;
    if(s.ratio !== 'original'){img.style.aspectRatio=s.ratio;img.style.height='auto';img.style.width='100%';}
    else {img.style.aspectRatio='';img.style.height='';}
    // Only apply layout when explicitly saved; legacy crops keep their layout.
    if(Object.hasOwn(data,'width') || Object.hasOwn(data,'align')){
      img.style.width=s.width+'%';img.style.maxWidth='100%';img.style.display='block';
      if(s.ratio==='original')img.style.height='auto';
      img.style.marginLeft=s.align==='left'?'0':'auto';img.style.marginRight=s.align==='right'?'0':'auto';
    }
  }
  let storageReady;
  async function preparePhoto(file){
    if(!file || !file.type.startsWith('image/') || file.size>30*1024*1024)throw Error('Choose an image smaller than 30 MB.');
    const url=URL.createObjectURL(file),image=new Image();
    try{
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This photo could not be read. Try JPEG, PNG or WebP.'));image.src=url;});
      if(image.naturalWidth*image.naturalHeight>80000000)throw Error('Choose a photo smaller than 80 megapixels.');
      const ratio=Math.min(1,2560/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
      return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('This photo could not be prepared.')),'image/jpeg',0.86));
    }finally{URL.revokeObjectURL(url);}
  }
  async function uploadPhoto(file, uid) {
    if(!uid || !global.firebase?.auth().currentUser || global.firebase.auth().currentUser.uid !== uid) throw Error('Sign in with your authorized Google account to upload photos.');
    if(!global.firebase.storage){
      storageReady ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js';script.onload=resolve;script.onerror=()=>{storageReady=null;reject(Error('Photo storage could not load. Check your connection and retry.'));};document.head.appendChild(script);});
      await storageReady;
    }
    if(global.firebase.auth().currentUser?.uid !== uid)throw Error('Your account changed. Reopen the photo editor.');
    const id=global.crypto.randomUUID(), ref=global.firebase.storage().ref('site-media/'+uid+'/'+id+'.jpg');
    await ref.put(file,{contentType:'image/jpeg',cacheControl:'public,max-age=31536000,immutable'});
    if(global.firebase.auth().currentUser?.uid !== uid)throw Error('Your account changed. Reopen the photo editor.');
    return ref.getDownloadURL();
  }
  global.GFSCMS = {merge, sizeCheck, publish, imageSettings, styleImage, preparePhoto, uploadPhoto};
})(typeof window !== 'undefined' ? window : globalThis);
