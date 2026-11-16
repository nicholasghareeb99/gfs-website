/* Progressive enhancement: photos and links work without JavaScript. */
(() => {
  'use strict';
  const collection = document.querySelector('[data-fence-collection]');
  if (!collection) return;
  const cards = [...collection.querySelectorAll('[data-fence-photo]')];
  const filters = collection.querySelector('.fence-filters');
  const count = collection.querySelector('[data-photo-count]');
  let active = cards;
  let limit = 12;
  const grid=collection.querySelector('.fence-photo-grid');
  const more=collection.querySelector('[data-fence-more]')||document.createElement('button');more.type='button';more.className='btn btn-outline catalogue-more';
  if(!more.isConnected)grid.after(more);
  const inEditor = () => document.body.classList.contains('edit-mode') || document.body.classList.contains('editing') || document.documentElement.classList.contains('edit-mode');
  function paint(){
    cards.forEach(card=>card.hidden=!inEditor()&&(!active.includes(card)||active.indexOf(card)>=limit));
    const shown=inEditor()?cards.length:Math.min(limit,active.length);
    count.textContent=`Showing ${shown} of ${inEditor()?cards.length:active.length} project photographs. Select a photo for a closer look.`;
    const remaining=Math.min(12,active.length-shown);more.hidden=inEditor()||shown>=active.length;more.textContent=`Show ${remaining} more photo${remaining===1?'':'s'}`;
  }
  more.addEventListener('click',()=>{const first=active[limit];limit+=12;paint();first?.querySelector('a')?.focus({preventScroll:true});});
  new MutationObserver(paint).observe(document.body,{attributes:true,attributeFilter:['class']});
  if (filters) {
    for(const tag of [...new Set(cards.map(card=>card.dataset.photoTag))].filter(Boolean)){
      if([...filters.querySelectorAll('button')].some(b=>b.dataset.photoFilter===tag))continue;
      const button=document.createElement('button');button.type='button';button.dataset.photoFilter=tag;button.textContent=tag;button.setAttribute('aria-pressed','false');filters.append(button);
    }
    filters.hidden = false;
    const mobileLabel=document.createElement('label');
    mobileLabel.className='fence-mobile-filter';
    mobileLabel.textContent='Show photos';
    const select=document.createElement('select');
    select.setAttribute('aria-label','Show fence photos');
    for(const button of filters.querySelectorAll('[data-photo-filter]')){
      const option=document.createElement('option');option.value=button.dataset.photoFilter;option.textContent=button.textContent;select.append(option);
    }
    mobileLabel.append(select);filters.after(mobileLabel);
    function applyFilter(button) {
      const value = button.dataset.photoFilter;
      select.value=value;
      for (const item of filters.querySelectorAll('button')) item.setAttribute('aria-pressed', String(item === button));
      active = cards.filter(card => value==='all'||card.dataset.photoTag===value);limit=12;paint();
    }
    filters.addEventListener('click', e => {
      const button = e.target.closest('[data-photo-filter]');
      if (button) applyFilter(button);
    });
    select.addEventListener('change',()=>{
      const button=[...filters.querySelectorAll('[data-photo-filter]')].find(b=>b.dataset.photoFilter===select.value);
      if(button)applyFilter(button);
    });
  }
  paint();
  if (typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'fence-viewer';
  dialog.setAttribute('aria-label', 'Our fence installation photographs');
  dialog.innerHTML = '<div class="fence-viewer-bar"><span data-viewer-count aria-live="polite"></span><button type="button" data-viewer-close autofocus>Close ×</button></div><figure><img alt=""><figcaption></figcaption></figure><div class="fence-viewer-nav"><button type="button" data-viewer-previous aria-label="Previous photo">← Previous</button><button type="button" data-viewer-next aria-label="Next photo">Next →</button><a target="_blank" rel="noopener">Open full image</a></div>';
  document.body.append(dialog);
  let index = 0, opener = null, oldOverflow = '';
  function render() {
    const card = active[index], image = card.querySelector('img'), anchor = card.querySelector('a');
    // Use the current image, including owner edits, rather than a stale catalog URL.
    const src = image.getAttribute('src');
    const full=src===image.dataset.photoThumbnail&&image.dataset.photoOriginal?image.dataset.photoOriginal:src?.includes('-thumb.webp')&&anchor.href.includes(src.replace('-thumb.webp','.webp'))?anchor.href:(src||anchor.href);
    dialog.querySelector('img').src = full;
    dialog.querySelector('img').alt = image.alt;
    const caption = dialog.querySelector('figcaption');
    caption.textContent = card.querySelector('figcaption')?.textContent.trim() || '';
    caption.hidden = !caption.textContent;
    dialog.querySelector('a').href = full;
    dialog.querySelector('[data-viewer-count]').textContent = `Our work · Photo ${index + 1} of ${active.length}`;
    for (const button of dialog.querySelectorAll('[data-viewer-previous],[data-viewer-next]')) button.disabled = active.length < 2;
  }
  const step = delta => { index = (index + delta + active.length) % active.length; render(); };
  collection.addEventListener('click', e => {
    const anchor = e.target.closest('[data-fence-photo] a');
    if (!anchor || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || inEditor()) return;
    e.preventDefault(); opener = anchor;
    index = active.indexOf(anchor.closest('[data-fence-photo]'));
    if (index < 0) return;
    render(); oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.showModal();
  });
  dialog.querySelector('[data-viewer-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-viewer-previous]').addEventListener('click', () => step(-1));
  dialog.querySelector('[data-viewer-next]').addEventListener('click', () => step(1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  });
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = oldOverflow; opener?.focus(); });
})();
