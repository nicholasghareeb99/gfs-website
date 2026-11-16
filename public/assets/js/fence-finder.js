/* Qualitative browsing guidance. No price estimates, scores, storage or lead events. */
(function () {
  'use strict';
  const styles = {
    vinyl: {name:'Vinyl fencing', image:'08-1-thumb.webp', alt:'White privacy fence beside a landscaped planting bed.', care:'Compare the selected product’s cleaning and care instructions; vinyl does not use the same stain routine as wood.'},
    cedar: {name:'Cedar fencing', image:'01-1-thumb.webp', alt:'Lattice-top wood fence beside a landscaped garden.', care:'Decide whether you want a maintained wood finish or a weathered appearance, and confirm the specified cedar species.'},
    wood: {name:'Wood privacy', image:'/assets/img/performance-v12/920a32f61686f645-480.webp', srcset:'/assets/img/performance-v12/920a32f61686f645-480.webp 480w, /assets/img/performance-v12/920a32f61686f645-960.webp 960w', alt:'Long run of pressure-treated wood privacy fencing.', care:'Discuss finishing, drying and ongoing board and hardware care for the treated wood specified in your proposal.'},
    aluminum: {name:'Ornamental aluminum', image:'10-3-thumb.webp', alt:'Black ornamental metal fence beside a green lawn.', care:'An open look without a wood-staining routine. Review coating care, picket spacing and the selected gate hardware.'},
    chainlink: {name:'Chain link', image:'06-1-thumb.webp', alt:'Black chain-link double gate opening into a grassy yard.', care:'Compare galvanized and coated finishes, then review mesh, bottom-edge details and gate hardware.'},
    'split-rail': {name:'Split rail', image:'05-1-thumb.webp', alt:'Three-rail wood fence with wire mesh alongside an open lawn.', care:'A rustic boundary with open space between rails. Discuss rail material, wood care and whether mesh backing is needed.'}
  };
  const priorities = {
    privacy: {label:'backyard privacy', less:['vinyl','cedar'], wood:['wood','cedar','vinyl'], either:['vinyl','wood','cedar'], guidance:'Start with the board or panel layout: full privacy, shadowbox and decorative tops provide different sightlines. Review the view from both sides and the gaps around gates.', why:{vinyl:'Compare full-privacy panels when screening the yard is the main goal.', cedar:'Compare solid-board and overlapping layouts for the wood look and sightlines you want.', wood:'Compare treated-wood board layouts, including how gaps and decorative details affect the view.'}},
    open: {label:'open views', less:['aluminum','chainlink','split-rail'], wood:['split-rail','aluminum','chainlink'], either:['aluminum','split-rail','chainlink'], guidance:'Consider what you want to see through the fence and how strongly you want to define the boundary. An open style does not screen neighboring yards.', why:{aluminum:'See through the fence while giving the boundary an ornamental outline.', chainlink:'An open mesh layout lets you see across the yard; compare how different finishes look in your setting.', 'split-rail':'Wide spaces between rails keep the landscape in view and give the boundary a rustic character.'}},
    pets: {label:'a yard for pets', less:['chainlink','vinyl','aluminum'], wood:['wood','chainlink','vinyl'], either:['chainlink','vinyl','wood'], guidance:'Tell us your pet’s size and whether they dig, climb or jump. Review bottom gaps, openings, gate latches and daily supervision; material alone does not establish containment.', why:{chainlink:'Compare mesh size and the bottom edge against your pet’s size and digging habits.', vinyl:'Privacy panels may help limit outside sightlines; check every opening and the gate arrangement.', aluminum:'Open pickets preserve views, but spacing and lower gaps need particular attention for small pets.', wood:'A privacy layout can screen outside activity; review board gaps, ground clearance and the gate.'}},
    pool: {label:'a pool enclosure', less:['aluminum','vinyl'], wood:['aluminum','vinyl'], either:['aluminum','vinyl'], guidance:'Start with a review of the local pool-barrier requirements and your full enclosure layout. Height, openings, climbability, gate swing, self-closing and self-latching hardware all need review. These suggestions do not certify compliance.', why:{aluminum:'Explore an open-view layout while reviewing the exact picket, rail and gate configuration for the pool.', vinyl:'Compare privacy and open styles against the exact pool-barrier requirements, including the gate and any adjacent structures.'}}
  };
  function recommendations(priority, upkeep) {
    const key = Object.hasOwn(priorities,priority) ? priority : 'privacy';
    const preference = ['less','wood','either'].includes(upkeep) ? upkeep : 'less';
    const row = priorities[key];
    return {priority:key, upkeep:preference, label:row.label, guidance:row.guidance + (key==='pool' && preference==='wood' ? ' Your comfort with wood care can be discussed during review; enclosure and gate requirements come first.' : ''), styles:row[preference].map(id=>({id,...styles[id],why:row.why[id],href:'/fences/'+id+'/'}))};
  }
  // Expose the decision table only to a local Node check; the browser gets no new global.
  if (typeof module === 'object' && module.exports) module.exports = {recommendations};
  if (typeof document === 'undefined') return;
  const root = document.getElementById('fence-finder');
  if (!root) return;
  const priority = root.querySelector('#fence-finder-priority');
  const upkeep = root.querySelector('#fence-finder-upkeep');
  const controls = root.querySelector('.fence-finder__controls');
  const output = root.querySelector('.fence-finder__output');
  const results = root.querySelector('.fence-finder__results');
  const status = root.querySelector('.fence-finder__status');
  const guidance = root.querySelector('.fence-finder__guidance');
  const next = root.querySelector('.fence-finder__next');
  const fallback = root.querySelector('.fence-finder__fallback');
  if (![priority,upkeep,controls,output,results,status,guidance,next,fallback].every(Boolean)) return;
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function render() {
    const choice = recommendations(priority.value,upkeep.value);
    const fragment = document.createDocumentFragment();
    choice.styles.forEach(style=>{
      const card = element('article','fence-finder__card');
      const image = element('img');
      image.src = style.image.startsWith('/') ? style.image : '/assets/img/projects-sept26/'+style.image;
      if(style.srcset){image.srcset=style.srcset;image.sizes='(max-width:600px) calc(100vw - 40px), 400px';}
      image.alt = style.alt; image.width = 800; image.height = 600; image.loading = 'lazy'; image.decoding = 'async';
      const body = element('div','fence-finder__card-body');
      const link = element('a','', 'Explore '+style.name.toLowerCase()+' →'); link.href = style.href;
      body.append(element('h4','',style.name),element('p','',style.why),element('p','',style.care),link);
      card.append(image,body); fragment.append(card);
    });
    results.replaceChildren(fragment);
    guidance.textContent = choice.guidance;
    const guide = choice.priority==='pets' ? ['Read the pet fence planning guide →','/fences/pet-fencing/'] : choice.priority==='pool' ? ['Read the pool fence planning guide →','/fences/pool-fencing/'] : ['Compare all fence styles →','/fences/'];
    const guideLink = element('a','',guide[0]); guideLink.href = guide[1]; next.replaceChildren(guideLink);
    status.textContent = choice.styles.length+' styles to compare for '+choice.label+': '+choice.styles.map(style=>style.name).join(', ')+'.';
  }
  render();
  priority.addEventListener('change',render);
  upkeep.addEventListener('change',render);
  controls.hidden = false; output.hidden = false; fallback.hidden = true;
})();
