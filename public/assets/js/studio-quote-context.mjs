const PARAM='studio-style';
const quotePaths=new Set(['/quote/','/quote/form/','/quote/book/','/quote/ballpark/']);
const normalizePath=path=>path.endsWith('/')?path:path+'/';
export function validStudioStyle(value){
  if(typeof value!=='string'||value.length>180||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value))return null;
  const text=value.trim();
  if(!text||text.length>180||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text)||!/[\p{L}\p{N}]/u.test(text)||!/^[\p{L}\p{N} '’‘"().,/#&+–—-]+$/u.test(text))return null;
  return text;
}
export function readStudioStyle(search){
  const values=new URLSearchParams(search).getAll(PARAM);
  return values.length===1?validStudioStyle(values[0]):null;
}
export function withStudioStyle(href,base,style){
  let url,origin;try{url=new URL(href,base);origin=new URL(base).origin;}catch{return href;}
  if(url.origin!==origin||!quotePaths.has(normalizePath(url.pathname)))return href;
  url.searchParams.delete(PARAM);
  const value=validStudioStyle(style);if(value)url.searchParams.set(PARAM,value);
  return url.href;
}
export function wireStudioQuoteLinks(getStyle){
  const refresh=()=>document.querySelectorAll('a[href]').forEach(link=>{const next=withStudioStyle(link.getAttribute('href'),location.href,getStyle());if(next!==link.href)link.setAttribute('href',next);});
  // Capture includes chooser links created after this module initializes.
  document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(!link)return;const next=withStudioStyle(link.getAttribute('href'),location.href,getStyle());if(next!==link.href)link.setAttribute('href',next);},true);
  document.addEventListener('DOMContentLoaded',refresh,{once:true});
  refresh();return refresh;
}
function init(){
  if(!quotePaths.has(normalizePath(location.pathname)))return;
  const mount=document.getElementById('studio-quote-context');if(!mount)return;
  const field=document.querySelector('form[data-lead-form] input[name="fenceStyle"]');
  let selected=readStudioStyle(location.search);
  // Respect browser-restored values and anything already entered by the customer.
  if(field){if(!field.value.trim()&&selected)field.value=selected;else if(field.value.trim())selected=validStudioStyle(field.value);}
  const heading=document.createElement('strong');heading.textContent='Style you’re interested in';
  const name=document.createElement('p');name.className='studio-quote-context__name';
  const note=document.createElement('p');note.className='studio-quote-context__note';
  const isPlanner=normalizePath(location.pathname)==='/quote/ballpark/';
  note.textContent=isPlanner?'This is a style reference from the 3D Studio. It has not changed your calculator selection, saved plan or planning price. Choose your calculator style separately, or send this style for a detailed review.':'We’ll include this as your style preference. Our team will confirm the available specifications and options for your project.';
  const remove=document.createElement('button');remove.type='button';remove.className='studio-quote-context__remove';remove.textContent='Remove style preference';
  mount.replaceChildren(heading,name,note,remove);
  if(isPlanner){const detail=document.createElement('a');detail.href='/quote/form/';detail.textContent='Request this style instead →';mount.append(detail);}
  const current=()=>field?validStudioStyle(field.value):selected;
  const refreshLinks=wireStudioQuoteLinks(current);
  function paint(){selected=current();mount.hidden=!selected;name.textContent=selected||'';refreshLinks();}
  function updateAddress(){const url=new URL(location.href);url.searchParams.delete(PARAM);if(current())url.searchParams.set(PARAM,current());history.replaceState(history.state,'',url.pathname+url.search+url.hash);}
  remove.addEventListener('click',()=>{if(field)field.value='';selected=null;updateAddress();paint();if(field)field.focus();});
  field?.addEventListener('input',paint);field?.addEventListener('change',updateAddress);paint();
}
if(typeof document!=='undefined')init();
