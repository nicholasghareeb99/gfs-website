/* Searchable installation archive; all photo links remain usable without JS. */
(()=>{
 'use strict';
 const grid=document.querySelector('#gallery-grid');if(!grid)return;
 const cards=[...grid.querySelectorAll('.gallery-item')],chips=[...document.querySelectorAll('[data-gfilter]')];
 const controls=document.querySelector('[data-gallery-controls]'),more=document.querySelector('[data-gallery-more]');if(!controls||!more)return;
 controls.hidden=false;const search=controls.querySelector('input'),status=controls.querySelector('p');
 let material='all',limit=18,active=cards;
 const editing=()=>document.body.classList.contains('editing')||document.body.classList.contains('edit-mode')||document.documentElement.classList.contains('edit-mode');
 function render(){
  const terms=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  active=cards.filter(card=>(material==='all'||card.dataset.type===material)&&terms.every(term=>(card.textContent+' '+card.querySelector('img')?.alt).toLowerCase().includes(term)));
  cards.forEach(card=>card.hidden=!editing()&&(!active.includes(card)||active.indexOf(card)>=limit));
  const shown=editing()?cards.length:Math.min(limit,active.length);
  status.textContent=active.length?`Showing ${shown} of ${editing()?cards.length:active.length} installation photos. All project photography is our own work.`:'No photos match. Try another detail or choose All Projects.';
  const remaining=Math.min(18,active.length-shown);more.hidden=editing()||shown>=active.length;more.textContent=`Show ${remaining} more photo${remaining===1?'':'s'}`;
  chips.forEach(chip=>{const yes=chip.dataset.gfilter===material;chip.setAttribute('aria-pressed',String(yes));chip.style.background=yes?'var(--navy)':'';chip.style.color=yes?'var(--cream)':'';});
 }
 chips.forEach(chip=>chip.addEventListener('click',()=>{material=chip.dataset.gfilter;limit=18;render();}));
 search.addEventListener('input',()=>{limit=18;render();});
 more.addEventListener('click',()=>{const first=active[limit];limit+=18;render();first?.querySelector('a')?.focus({preventScroll:true});});
 new MutationObserver(render).observe(document.body,{attributes:true,attributeFilter:['class']});render();
 if(typeof HTMLDialogElement==='undefined')return;
 const dialog=document.createElement('dialog');dialog.className='catalogue-viewer';dialog.setAttribute('aria-label','Our installation photos');dialog.setAttribute('data-gfs-protected','');
 dialog.innerHTML='<div class="catalogue-viewer-bar"><span aria-live="polite"></span><button type="button" data-close autofocus>Close ×</button></div><figure><img alt=""><figcaption></figcaption></figure><div class="catalogue-viewer-nav"><button type="button" data-prev>← Previous</button><button type="button" data-next>Next →</button><a target="_blank" rel="noopener">Open full image</a></div>';
 document.body.append(dialog);let index=0,opener=null,overflow='';
 function show(){const card=active[index],img=card.querySelector('img'),link=card.querySelector('a');const src=img.getAttribute('src');const full=src===img.dataset.photoThumbnail&&img.dataset.photoOriginal?img.dataset.photoOriginal:src?.includes('-thumb.webp')&&link.href.includes(src.replace('-thumb.webp','.webp'))?link.href:(src||link.href);dialog.querySelector('img').src=full;dialog.querySelector('img').alt=img.alt;const caption=dialog.querySelector('figcaption');caption.textContent=card.querySelector('.gallery-item-tag')?.textContent.trim()||'';caption.hidden=!caption.textContent;dialog.querySelector('a').href=full;dialog.querySelector('span').textContent=`Photo ${index+1} of ${active.length}`;dialog.querySelectorAll('[data-prev],[data-next]').forEach(b=>b.disabled=active.length<2);}
 const step=d=>{index=(index+d+active.length)%active.length;show();};
 grid.addEventListener('click',event=>{const link=event.target.closest('.gallery-item a');if(!link||editing()||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const i=active.indexOf(link.closest('.gallery-item'));if(i<0)return;event.preventDefault();index=i;opener=link;overflow=document.body.style.overflow;show();document.body.style.overflow='hidden';dialog.showModal();});
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-prev]').onclick=()=>step(-1);dialog.querySelector('[data-next]').onclick=()=>step(1);
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
 dialog.addEventListener('close',()=>{document.body.style.overflow=overflow;opener?.focus({preventScroll:true});});
})();
