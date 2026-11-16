// Anonymous visual catalog only. Never read staff settings or copy a price list.
const fields=['styleNames','styleSpecs','publishedAt','catalogRevision','schemaVersion'];
export const PUBLIC_CATALOG_URL='https://firestore.googleapis.com/v1/projects/ghareeb-fencing/databases/(default)/documents/settings/public?'+fields.map(field=>'mask.fieldPaths='+field).join('&');
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const safeKey=key=>/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(key)&&!['constructor','prototype','__proto__'].includes(key);
function primitive(value){
  if(!value||typeof value!=='object')return undefined;
  if(own(value,'nullValue')&&(value.nullValue===null||value.nullValue==='NULL_VALUE'))return null;
  if(own(value,'booleanValue')&&typeof value.booleanValue==='boolean')return value.booleanValue;
  if(own(value,'stringValue')&&typeof value.stringValue==='string'&&value.stringValue.length<160)return value.stringValue;
  const raw=own(value,'integerValue')?value.integerValue:own(value,'doubleValue')?value.doubleValue:undefined;
  if(raw!==undefined&&raw!==null&&raw!==''){const number=Number(raw);if(Number.isFinite(number)&&Math.abs(number)<=16777215)return number;}
  return undefined;
}
export function decodePublicCatalog(document){
  const values=document?.fields?.styleNames?.arrayValue;
  if(!values||typeof values!=='object'||(own(values,'values')&&!Array.isArray(values.values)))throw Error('No published visual catalog.');
  const raw=values.values||[];
  if(raw.length>2000)throw Error('Catalog is too large.');
  const names=raw.map(value=>value?.stringValue);
  if(names.some(name=>typeof name!=='string'||!name.trim()||name.length>180||/[\u0000-\u001f\u007f]/.test(name)))throw Error('Invalid style names.');
  const unique=[...new Set(names)],styleSpecs=Object.create(null);
  const supplied=document.fields.styleSpecs?.mapValue?.fields||{};
  for(const name of unique){
    if(!own(supplied,name))continue;
    const spec=supplied[name]?.mapValue?.fields;if(!spec||typeof spec!=='object')continue;
    const clean=Object.create(null);
    for(const [key,value]of Object.entries(spec).slice(0,160)){
      if(!safeKey(key))continue;
      const direct=primitive(value);
      if(direct!==undefined){clean[key]=direct;continue;}
      const array=value?.arrayValue?.values;
      if(Array.isArray(array)&&array.length<=32){const items=array.map(primitive);if(items.every(item=>item!==undefined))clean[key]=items;}
    }
    styleSpecs[name]=clean;
  }
  const stamp=document.fields.publishedAt?.timestampValue||document.updateTime;
  const updatedAt=typeof stamp==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(stamp)&&Number.isFinite(Date.parse(stamp))?stamp.slice(0,10):undefined;
  return {names:unique,styleSpecs,updatedAt};
}
export async function readPublicCatalog(fetcher=fetch){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetcher(PUBLIC_CATALOG_URL,{signal:controller.signal,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
    if(!response.ok)throw Error('Published catalog unavailable.');
    const body=await response.text();if(body.length>2000000)throw Error('Catalog is too large.');
    return decodePublicCatalog(JSON.parse(body));
  }finally{clearTimeout(timer);}
}

function install(){
  const api=window.GFSFenceStudio,button=document.getElementById('studio-refresh'),notice=document.getElementById('studio-sync-status');
  if(!api||!button||!notice)return;
  let busy=false;
  async function refresh(){
    if(busy)return;busy=true;button.disabled=true;notice.textContent='Checking for catalog updates…';
    try{
      const catalog=await readPublicCatalog();
      if(!api.setPublicCatalog(catalog))throw Error('Catalog could not be displayed.');
      notice.textContent='Latest published catalog loaded.';
    }catch{notice.textContent='Catalog update unavailable. The catalog shown below is still available to browse.';}
    finally{busy=false;button.disabled=false;}
  }
  button.addEventListener('click',refresh);button.hidden=false;
  // Keep the saved catalog useful while this one bounded public request settles.
  refresh();
}
if(typeof window!=='undefined'){
  if(window.GFSFenceStudio)install();
  else window.addEventListener('gfs:fence-studio-ready',install,{once:true});
}
