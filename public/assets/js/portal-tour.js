/* Real interface screenshots, separately labeled from installation photography. */
(() => {
  'use strict';
  const shots = [...document.querySelectorAll('a[data-portal-shot]')];
  if (!shots.length || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'portal-screen-viewer';
  dialog.setAttribute('aria-label', 'Customer portal screenshot, sample project');
  dialog.innerHTML = '<div class="portal-viewer-top"><span data-portal-counter aria-live="polite"></span><button type="button" data-portal-close autofocus>Close ×</button></div><div class="portal-zoom-stage" tabindex="0" aria-label="Screenshot; scroll to read when enlarged"><img alt=""></div><p class="portal-viewer-caption"></p><div class="portal-viewer-controls"><button type="button" data-portal-prev aria-label="Previous portal screenshot">← Previous</button><button type="button" data-portal-next aria-label="Next portal screenshot">Next →</button><button type="button" data-portal-zoom aria-pressed="false">Read at full size</button><a target="_blank" rel="noopener">Open image ↗</a></div>';
  document.body.append(dialog);
  const stage = dialog.querySelector('.portal-zoom-stage');
  const zoom = dialog.querySelector('[data-portal-zoom]');
  let index=0, opener=null, oldOverflow='';
  function fit() {
    stage.classList.remove('is-zoomed'); zoom.setAttribute('aria-pressed','false'); zoom.textContent='Read at full size'; stage.scrollTop=0; stage.scrollLeft=0;
  }
  function render() {
    const anchor=shots[index], source=anchor.querySelector('img');
    const url=source?.getAttribute('src') || anchor.href;
    dialog.querySelector('img').src=url;
    dialog.querySelector('img').alt=source?.alt || 'Sample customer portal screenshot';
    const caption=anchor.closest('figure')?.querySelector('figcaption');
    dialog.querySelector('.portal-viewer-caption').textContent=caption ? (caption.children.length ? [...caption.children].map(el=>el.textContent.trim()).join(' — ') : caption.textContent.trim()) : source?.alt;
    dialog.querySelector('a').href=url;
    dialog.querySelector('[data-portal-counter]').textContent=`Sample project · Screenshot ${index+1} of ${shots.length}`;
    for(const button of dialog.querySelectorAll('[data-portal-prev],[data-portal-next]')) button.disabled=shots.length<2;
    fit();
  }
  function step(delta) { index=(index+delta+shots.length)%shots.length; render(); }
  shots.forEach((anchor,i)=>anchor.addEventListener('click',e=>{
    if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||document.body.classList.contains('editing'))return;
    e.preventDefault();index=i;opener=anchor;render();oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();
  }));
  dialog.querySelector('[data-portal-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-portal-prev]').addEventListener('click',()=>step(-1));
  dialog.querySelector('[data-portal-next]').addEventListener('click',()=>step(1));
  zoom.addEventListener('click',()=>{
    const enlarged=stage.classList.toggle('is-zoomed');zoom.setAttribute('aria-pressed',String(enlarged));zoom.textContent=enlarged?'Fit screenshot':'Read at full size';
  });
  dialog.addEventListener('keydown',e=>{
    if(stage.classList.contains('is-zoomed'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}
  });
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;opener?.focus();});
})();
