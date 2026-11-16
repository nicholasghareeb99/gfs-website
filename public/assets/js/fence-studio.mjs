import {catalogNames, catalogSpecs} from '../../gfs/studio-catalog.mjs';
import {buildPreviewSpec, encodePreview, modelOverrides} from '../../gfs/website-model.mjs';
import {resolveModelProfile} from '../../gfs/model-profiles.mjs';
import {ownerModelHeight,ownerModelNote} from '../../gfs/owner-model-corrections.mjs';
import {withStudioStyle,wireStudioQuoteLinks} from './studio-quote-context.mjs';

const lookLabels={privacy:'Privacy / solid',open:'Picket / spaced',shadowbox:'Shadowbox',rail:'Rail',metal:'Open metal'};
export function normalizeStudioSearch(value){return String(value).toLowerCase().replace(/(\d+(?:\.\d+)?)\s*(?:feet|foot|ft\b|['’])/g,'$1ft').replace(/\bp\s*\/?\s*t\b/g,'pressure treated').replace(/[^a-z0-9.]+/g,' ').trim();}
const materialLabels = {wood:'Wood & cedar',vinyl:'Vinyl',aluminum:'Aluminum',chainlink:'Chain link',rail:'Split & ranch rail'};
export function buildStudioCatalog(names=catalogNames,specs=catalogSpecs) {
  return [...new Set(names)].filter(name=>typeof name==='string'&&name.trim()&&name.length<=180).slice(0,2000).map(name=>{
    const heights=[...name.matchAll(/(\d+(?:\.\d+)?)\s*(?:ft\b|'|’)/gi)].map(x=>+x[1]);
    const effective=modelOverrides(name,specs);
    const saved=Number(resolveModelProfile(name,heights.length===1?heights[0]:6,effective).spec.editH);
    const named=heights.length===1?heights[0]:null;
    const height=ownerModelHeight(name)??(saved>=2&&saved<=12?saved:named>=2&&named<=12?named:6);
    const heightKnown=(saved>=2&&saved<=12)||Boolean(named>=2&&named<=12);
    const profile=resolveModelProfile(name,height,effective);
    const material=['split','ranch'].includes(profile.spec.mode)?'rail':profile.spec.mode==='chain'?'chainlink':profile.spec.mode==='alu'?'aluminum':profile.spec.wood?'wood':'vinyl';
    const railMaterial=material==='rail'?(profile.spec.wood?'wood':'vinyl'):null;
    const materialLabel=railMaterial?(railMaterial==='wood'?'Wood rail':'Vinyl rail'):materialLabels[material];
    const mode=profile.spec.mode,look=['solid','bob'].includes(mode)?'privacy':mode==='shadowbox'?'shadowbox':['chain','alu'].includes(mode)?'metal':['split','ranch'].includes(mode)?'rail':'open';
    return {name,height,heightKnown,material,railMaterial,materialLabel,look,lookLabel:lookLabels[look],previewNote:ownerModelNote(name)};
  });
}
export function filterStudioCatalog(rows,{search='',material='all',height='all',look='all'}={}) {
  const terms=normalizeStudioSearch(search).split(/\s+/).filter(Boolean);
  return rows.filter(row=>{
    const haystack=normalizeStudioSearch([row.name,row.material==='wood'?'wood':row.materialLabel,row.lookLabel,row.heightKnown?row.height+'ft':''].join(' '));
    return terms.every(term=>haystack.includes(term))&&(material==='all'||row.material===material||row.railMaterial===material)&&(look==='all'||row.look===look)&&(height==='all'||height==='unspecified'&&!row.heightKnown||row.heightKnown&&String(row.height)===height);
  });
}
export function studioPreview(row,mode='detail',specs=catalogSpecs) {
  const issue=studioModelIssue(row,specs);if(issue)throw Error(issue);
  const spec=buildPreviewSpec({name:row.name,height:row.height,length:24,detail:mode==='detail',overrides:specs});
  spec.job=mode==='detail'?'Illustrative panel detail':'Illustrative 24 ft straight run';
  return {spec,url:'/fence3d.html?embed=1&website=1&studio=1#'+encodePreview(spec),fullUrl:'/fence3d.html?website=1&studio=1#'+encodePreview(spec)};
}
export function studioInstallationMaterial(row){return row.material==='rail'?(row.railMaterial==='vinyl'?'vinyl':'split-rail'):row.material;}

function init() {
  const root=document.getElementById('fence-studio'); if(!root)return;
  const get=id=>root.querySelector('#'+id);
  const ui={search:get('studio-search'),material:get('studio-material'),height:get('studio-height'),select:get('studio-style'),mode:get('studio-view'),status:get('studio-results'),name:get('studio-selected-name'),facts:get('studio-selected-facts'),launch:get('studio-launch'),stop:get('studio-stop'),mount:get('studio-frame'),loading:get('studio-loading'),recovery:get('studio-recovery'),retry:get('studio-retry'),full:get('studio-full'),source:get('studio-source'),reset:get('studio-reset'),controls:get('studio-controls'),fallback:get('studio-fallback'),poster:get('studio-poster')};
  if(Object.values(ui).some(x=>!x))return;
  const entry=new URLSearchParams(location.search);
  let specs=catalogSpecs,rows=buildStudioCatalog(),selected=rows.find(row=>row.name===entry.get('style'))||rows.find(row=>row.name==='Wellington - White 6ft')||rows[0],frame=null,timer=null,active=false;
  const entryMaterial=entry.get('material');
  if([...ui.material.options].some(option=>option.value===entryMaterial))ui.material.value=entryMaterial;
  const requestStyle=get('studio-request-style'),cards=get('studio-cards'),more=get('studio-more'),look=get('studio-look');
  let filteredRows=[],cardLimit=6;
  const materialButtons=[...root.querySelectorAll('[data-studio-material]')];
  const installationLink=get('studio-installation-link');
  const refreshQuoteLinks=wireStudioQuoteLinks(()=>selected?.name||null);
  function option(value,label){const el=document.createElement('option');el.value=value;el.textContent=label;return el;}
  function heightOptions(){const saved=ui.height.value;ui.height.replaceChildren(option('all','Any height'));[...new Set(rows.filter(r=>r.heightKnown).map(r=>r.height))].sort((a,b)=>a-b).forEach(h=>ui.height.append(option(String(h),h+' ft')));if(rows.some(r=>!r.heightKnown))ui.height.append(option('unspecified','Height to discuss'));if([...ui.height.options].some(o=>o.value===saved))ui.height.value=saved;}
  function stop(message='3D paused. Open the preview whenever you are ready.'){
    clearTimeout(timer);timer=null;active=false;if(frame){frame.src='about:blank';frame.remove();frame=null;}ui.poster.hidden=false;ui.stop.disabled=true;ui.launch.textContent='Open interactive 3D';ui.loading.textContent=message;ui.recovery.hidden=true;
  }
  function showSelected(){
    ui.launch.disabled=!selected;
    installationLink.hidden=!selected;
    installationLink.style.display=selected?'inline-flex':'none';
    if(selected){const material=studioInstallationMaterial(selected);installationLink.href='/fences/'+material+'/#project-photos';installationLink.textContent='See our '+(material==='vinyl'?'vinyl':selected.materialLabel.toLowerCase())+' installation photos →';}
    if(requestStyle){requestStyle.hidden=!selected;if(selected)requestStyle.href=withStudioStyle('/quote/form/',location.href,selected.name);}
    refreshQuoteLinks();
    if(!selected){ui.name.textContent='No styles match these filters';ui.facts.textContent='Try a broader search or reset the filters.';ui.full.hidden=true;stop('No preview selected.');return;}
    ui.name.textContent=selected.name;
    ui.facts.textContent=selected.materialLabel+' · '+selected.height+' ft '+(selected.heightKnown?'preview height':'illustrative height — confirm your preferred height');
    if(selected.previewNote)ui.facts.textContent+=' · '+selected.previewNote;
    const issue=studioModelIssue(selected,specs);
    const posterTitle=ui.poster.querySelector('h3'),posterText=ui.poster.querySelector('p');
    if(posterTitle)posterTitle.textContent=issue?'Preview being refined.':'Take a closer look.';
    if(posterText)posterText.textContent=issue||'Choose a style, then open the preview to rotate the design, zoom into the details and compare views.';
    if(issue){stop(issue);ui.launch.disabled=true;ui.full.hidden=true;ui.full.removeAttribute('href');return;}
    const preview=studioPreview(selected,ui.mode.value,specs);ui.full.href=preview.fullUrl;ui.full.hidden=false;
  }
  function choose(row,open=true){
    selected=row;ui.select.value=row.name;showSelected();renderCards();
    ui.status.textContent=filteredRows.length+' matching styles. Selected: '+row.name+'.';
    if(open){launch();ui.name.tabIndex=-1;ui.name.focus({preventScroll:true});ui.name.closest('.studio-preview').scrollIntoView({block:'start',behavior:'auto'});}
  }
  function renderCards(){
    if(!cards)return;
    cards.replaceChildren();
    for(const row of filteredRows.slice(0,cardLimit)){
      const button=document.createElement('button');button.type='button';button.className='studio-style-card';button.setAttribute('aria-pressed',String(row.name===selected?.name));
      const meta=document.createElement('span');meta.className='studio-card-meta';meta.textContent=row.materialLabel+' · '+(row.heightKnown?row.height+' ft':'Height to discuss');
      const name=document.createElement('strong');name.textContent=row.name;
      const detail=document.createElement('span');detail.className='studio-card-detail';detail.textContent=row.lookLabel;
      const action=document.createElement('span');action.className='studio-card-action';action.textContent='View in 3D →';
      button.append(meta,name,detail,action);button.addEventListener('click',()=>choose(row));cards.append(button);
    }
    if(!filteredRows.length){const empty=document.createElement('p');empty.textContent='No matching styles. Try fewer words, another material or Reset filters. Your current preview is kept.';cards.append(empty);}
    if(more){more.hidden=cardLimit>=filteredRows.length;more.textContent='Show '+Math.min(6,filteredRows.length-cardLimit)+' more styles ('+filteredRows.length+' matches)';}
  }
  function filter(){
    filteredRows=filterStudioCatalog(rows,{search:ui.search.value,material:ui.material.value,height:ui.height.value,look:look?.value||'all'});
    // Browsing must not silently change the preview or a quote's chosen style.
    ui.select.replaceChildren(option('','Choose a matching style'),...filteredRows.map(row=>option(row.name,row.name)));
    ui.select.disabled=!filteredRows.length;ui.select.value=filteredRows.some(row=>row.name===selected?.name)?selected.name:'';
    ui.status.textContent=filteredRows.length+' of '+rows.length+' styles match. Choose a card to open its 3D preview.';
    materialButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.studioMaterial===ui.material.value)));
    cardLimit=6;renderCards();showSelected();
  }
  function webglAvailable(){try{const canvas=document.createElement('canvas');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
  function failed(message){clearTimeout(timer);ui.loading.textContent=message;ui.recovery.hidden=false;ui.launch.textContent='Reload 3D preview';}
  function launch(){
    if(!selected)return;
    const issue=studioModelIssue(selected,specs);if(issue){stop(issue);ui.launch.disabled=true;return;}
    if(!webglAvailable()){stop();failed('This browser could not start WebGL. You can still browse the catalog and explore our photo guides below.');return;}
    clearTimeout(timer);if(frame){frame.src='about:blank';frame.remove();}
    const preview=studioPreview(selected,ui.mode.value,specs);frame=document.createElement('iframe');frame.title='Interactive 3D: '+selected.name;frame.allowFullscreen=true;frame.setAttribute('allow','fullscreen');frame.src=preview.url;
    frame.addEventListener('error',()=>failed('The preview could not load. Try again or open it in a full window.'));
    ui.mount.replaceChildren(frame);ui.poster.hidden=true;ui.stop.disabled=false;active=true;ui.recovery.hidden=true;ui.loading.textContent='Loading the interactive '+(ui.mode.value==='detail'?'panel detail':'24 ft sample')+'…';ui.launch.textContent='Reload 3D preview';ui.full.href=preview.fullUrl;
    timer=setTimeout(()=>failed('The 3D preview is taking longer than expected. Try reloading or open it in a full window.'),30000);
  }
  window.addEventListener('message',event=>{if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.type!=='GFS_F3D_READY')return;clearTimeout(timer);ui.recovery.hidden=true;ui.loading.textContent='3D is ready. Drag to rotate, pinch or scroll to zoom, or use the view controls.';});
  ui.search.addEventListener('input',filter);ui.material.addEventListener('change',filter);ui.height.addEventListener('change',filter);
  ui.select.addEventListener('change',()=>{const row=rows.find(row=>row.name===ui.select.value);if(row)choose(row);});
  look?.addEventListener('change',filter);
  materialButtons.forEach(button=>button.addEventListener('click',()=>{ui.material.value=button.dataset.studioMaterial;filter();}));
  more?.addEventListener('click',()=>{const firstNew=cardLimit;cardLimit+=6;renderCards();cards.children[firstNew]?.focus();});
  get('studio-browse-again')?.addEventListener('click',()=>{ui.search.focus({preventScroll:true});ui.search.scrollIntoView({block:'center',behavior:'auto'});});
  ui.mode.addEventListener('change',()=>{showSelected();if(active)launch();});ui.launch.addEventListener('click',launch);ui.retry.addEventListener('click',launch);ui.stop.addEventListener('click',()=>stop());
  ui.reset.addEventListener('click',()=>{ui.search.value='';ui.material.value='all';ui.height.value='all';if(look)look.value='all';filter();ui.search.focus();});
  // The parent integration may supply ONLY a verified public mirror, never settings/global.
  // Matching public model specs extend the bundled defaults rather than discarding them.
  window.GFSFenceStudio=Object.freeze({setPublicCatalog({names,styleSpecs={},updatedAt}={}){
    if(!Array.isArray(names)||names.length>2000||names.some(n=>typeof n!=='string'||!n.trim()||n.length>180)||!styleSpecs||Array.isArray(styleSpecs)||typeof styleSpecs!=='object')return false;
    const merged={...catalogSpecs,...styleSpecs};let candidate;try{candidate=buildStudioCatalog(names,merged);}catch{return false;}if(names.length&&!candidate.length)return false;
    if(active)stop('The catalog was updated. Open the selected preview to see its latest model settings.');
    specs=merged;rows=candidate;selected=rows.find(row=>row.name===selected?.name)||rows[0]||null;heightOptions();filter();ui.source.textContent='Catalog loaded from the Executive App’s public mirror'+(typeof updatedAt==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)?' · '+updatedAt:'')+'. Visual previews use the available model settings; confirm specifications with our team.';return true;
  }});
  heightOptions();filter();ui.controls.hidden=false;ui.fallback.hidden=true;
  window.dispatchEvent(new Event('gfs:fence-studio-ready'));
}
export function studioModelIssue(row,specs=catalogSpecs){
  if(row?.name==='Pressure Treated Lattice Top shadowbox'&&Number(modelOverrides(row.name,specs)[row.name]?.postHIn)===15.75)return 'This model needs a post-dimension review before we can show an accurate preview. You can still request this style.';
  return '';
}
if(typeof document!=='undefined')init();
