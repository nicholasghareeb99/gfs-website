/* Progressive material comparison. Source guidance stays in the page HTML. */
(function(){
  'use strict';
  const ids=['cedar','wood','vinyl','aluminum','chainlink','split-rail'];
  function init(){
    const root=document.querySelector('[data-material-compare]');
    if(!root||root.dataset.compareReady==='true')return;
    const controls=root.querySelector('[data-compare-controls]'),first=root.querySelector('#compare-first'),second=root.querySelector('#compare-second'),status=root.querySelector('[data-compare-status]'),all=root.querySelector('[data-compare-all]'),grid=root.querySelector('#material-comparison-results');
    const cards=ids.map(id=>root.querySelector('[data-material="'+id+'"]'));
    if(!controls||!first||!second||!status||!all||!grid||cards.some(card=>!card))return;
    let pair=['cedar','vinyl'];
    function show(announce=true){
      first.value=pair[0];second.value=pair[1];
      root.dataset.compareView='pair';
      cards.forEach((card,i)=>{const visible=pair.includes(ids[i]);card.hidden=!visible;card.classList.remove('compare-enter');if(visible)card.classList.add('compare-enter');});
      // Keep visible and assistive-technology reading order aligned with the
      // First/Second labels. Move existing nodes; retain editor content and links.
      [...pair,...ids.filter(id=>!pair.includes(id))].forEach(id=>grid.appendChild(cards[ids.indexOf(id)]));
      all.setAttribute('aria-pressed','false');
      if(announce)status.textContent='Comparing '+first.options[first.selectedIndex].text+' and '+second.options[second.selectedIndex].text+'.';
    }
    function change(index){
      const requested=[first.value,second.value][index];
      if(!ids.includes(requested)){show();return;}
      const previous=pair[index],other=1-index;
      if(pair[other]===requested)pair[other]=previous;
      pair[index]=requested;show();
    }
    first.addEventListener('change',()=>change(0));second.addEventListener('change',()=>change(1));
    all.addEventListener('click',()=>{
      if(root.dataset.compareView==='all'){show();return;}
      root.dataset.compareView='all';cards.forEach(card=>{card.hidden=false;card.classList.remove('compare-enter');grid.appendChild(card);});
      all.setAttribute('aria-pressed','true');status.textContent='Showing all six materials. Choose either material to return to a two-material comparison.';
    });
    root.dataset.compareReady='true';show(false);controls.hidden=false;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
