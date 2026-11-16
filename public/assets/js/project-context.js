/* A project choice follows an estimate request without replacing a saved design. */
(function(){
  'use strict';
  const key='gfs-project-context-v1',ttl=2*60*60*1000;
  const choices={
"milan-mi":{"label":"Fence installation in City of Milan, MI","path":"/service-areas/milan-mi/"},
"carleton-mi":{"label":"Fence installation in Carleton, MI","path":"/service-areas/carleton-mi/"},
"south-rockwood-mi":{"label":"Fence installation in South Rockwood, MI","path":"/service-areas/south-rockwood-mi/"},
"summerfield-township-mi":{"label":"Fence installation in Summerfield Township, MI","path":"/service-areas/summerfield-township-mi/"},
"raisinville-township-mi":{"label":"Fence installation in Raisinville Township, MI","path":"/service-areas/raisinville-township-mi/"},
"frenchtown-township-mi":{"label":"Fence installation in Frenchtown Charter Township, MI","path":"/service-areas/frenchtown-township-mi/"},
"lasalle-township-mi":{"label":"Fence installation in LaSalle Township, MI","path":"/service-areas/lasalle-township-mi/"},
"luna-pier-mi":{"label":"Fence installation in Luna Pier, MI","path":"/service-areas/luna-pier-mi/"},
"washington-township-oh":{"label":"Fence installation in Washington Township, OH","path":"/service-areas/washington-township-oh/"},
"springfield-township-oh":{"label":"Fence installation in Springfield Township, OH","path":"/service-areas/springfield-township-oh/"},
"monclova-township-oh":{"label":"Fence installation in Monclova Township, OH","path":"/service-areas/monclova-township-oh/"},
"ottawa-hills-oh":{"label":"Fence installation in Ottawa Hills, OH","path":"/service-areas/ottawa-hills-oh/"},
"whitehouse-oh":{"label":"Fence installation in Whitehouse, OH","path":"/service-areas/whitehouse-oh/"},
"swanton-oh":{"label":"Fence installation in Swanton, OH","path":"/service-areas/swanton-oh/"},
"lake-township-oh":{"label":"Fence installation in Lake Township, OH","path":"/service-areas/lake-township-oh/"},
"allen-park-mi":{"label":"Fence installation in Allen Park, MI","path":"/service-areas/allen-park-mi/"},
"brownstown-township-mi":{"label":"Fence installation in Brownstown Township, MI","path":"/service-areas/brownstown-township-mi/"},
"ecorse-mi":{"label":"Fence installation in Ecorse, MI","path":"/service-areas/ecorse-mi/"},
"flat-rock-mi":{"label":"Fence installation in Flat Rock, MI","path":"/service-areas/flat-rock-mi/"},
"gibraltar-mi":{"label":"Fence installation in Gibraltar, MI","path":"/service-areas/gibraltar-mi/"},
"grosse-ile-township-mi":{"label":"Fence installation in Grosse Ile Township, MI","path":"/service-areas/grosse-ile-township-mi/"},
"huron-township-mi":{"label":"Fence installation in Huron Township, MI","path":"/service-areas/huron-township-mi/"},
"lincoln-park-mi":{"label":"Fence installation in Lincoln Park, MI","path":"/service-areas/lincoln-park-mi/"},
"riverview-mi":{"label":"Fence installation in Riverview, MI","path":"/service-areas/riverview-mi/"},
"rockwood-mi":{"label":"Fence installation in Rockwood, MI","path":"/service-areas/rockwood-mi/"},
"romulus-mi":{"label":"Fence installation in Romulus, MI","path":"/service-areas/romulus-mi/"},
"southgate-mi":{"label":"Fence installation in Southgate, MI","path":"/service-areas/southgate-mi/"},
"taylor-mi":{"label":"Fence installation in Taylor, MI","path":"/service-areas/taylor-mi/"},
"trenton-mi":{"label":"Fence installation in Trenton, MI","path":"/service-areas/trenton-mi/"},
"woodhaven-mi":{"label":"Fence installation in Woodhaven, MI","path":"/service-areas/woodhaven-mi/"},
"wyandotte-mi":{"label":"Fence installation in Wyandotte, MI","path":"/service-areas/wyandotte-mi/"},
"chainlink":{"label":"Chain-link fencing","family":"chainlink","path":"/fences/chainlink/"},
"split-rail":{"label":"Split-rail fencing","family":"split-rail","path":"/fences/split-rail/"},
"perrysburg-oh":{"label":"Fence installation in Perrysburg, OH","path":"/service-areas/perrysburg-oh/"},
"sylvania-oh":{"label":"Fence installation in Sylvania, OH","path":"/service-areas/sylvania-oh/"},
"maumee-oh":{"label":"Fence installation in Maumee, OH","path":"/service-areas/maumee-oh/"},
"bowling-green-oh":{"label":"Fence installation in Bowling Green, OH","path":"/service-areas/bowling-green-oh/"},
"rossford-oh":{"label":"Fence installation in Rossford, OH","path":"/service-areas/rossford-oh/"},
"northwood-oh":{"label":"Fence installation in Northwood, OH","path":"/service-areas/northwood-oh/"},
"holland-oh":{"label":"Fence installation in Holland, OH","path":"/service-areas/holland-oh/"},
"oregon-oh":{"label":"Fence installation in Oregon, OH","path":"/service-areas/oregon-oh/"},
"waterville-oh":{"label":"Fence installation in Waterville, OH","path":"/service-areas/waterville-oh/"},
"monroe-mi":{"label":"Fence installation in Monroe, MI","path":"/service-areas/monroe-mi/"},
"temperance-mi":{"label":"Fence installation in Temperance, MI","path":"/service-areas/temperance-mi/"},
"lambertville-mi":{"label":"Fence installation in Lambertville, MI","path":"/service-areas/lambertville-mi/"},
"whiteford-mi":{"label":"Fence installation in Whiteford, MI","path":"/service-areas/whiteford-mi/"},
"dundee-mi":{"label":"Fence installation in Dundee, MI","path":"/service-areas/dundee-mi/"},
"erie-mi":{"label":"Fence installation in Erie, MI","path":"/service-areas/erie-mi/"},
"petersburg-mi":{"label":"Fence installation in Petersburg, MI","path":"/service-areas/petersburg-mi/"},
"ida-mi":{"label":"Fence installation in Ida, MI","path":"/service-areas/ida-mi/"},
    toledo:{label:'Fence installation in Toledo',path:'/service-areas/toledo-oh/'},
    vinyl:{label:'Vinyl fencing',family:'vinyl',path:'/fences/vinyl/'},
    wood:{label:'Wood fencing',family:'wood',path:'/fences/wood/'},
    cedar:{label:'Cedar fencing',family:'cedar',path:'/fences/cedar/'},
    aluminum:{label:'Aluminum fencing',family:'aluminum',path:'/fences/aluminum/'},
    'no-dig':{label:'No-dig installation review',path:'/fences/no-dig/'},
    pet:{label:'Backyard fencing for pets',path:'/fences/pet-fencing/'},
    pool:{label:'Pool fencing',path:'/fences/pool-fencing/'},
    replacement:{label:'Fence replacement',path:'/fences/replacement/'}
  };
  let current=null;
  function valid(value){return value&&Object.hasOwn(choices,value.intent)&&Number.isFinite(value.at)&&value.at<=Date.now()&&Date.now()-value.at<ttl;}
  try{
    const params=new URLSearchParams(location.search),requested=params.getAll('project');
    if(requested.length===1&&Object.hasOwn(choices,requested[0])){current={intent:requested[0],at:Date.now()};sessionStorage.setItem(key,JSON.stringify(current));}
    else if(!requested.length){const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(valid(saved))current=saved;}
  }catch{}
  function get(){return valid(current)?{intent:current.intent,...choices[current.intent]}:null;}
  function clear(){current=null;try{sessionStorage.removeItem(key);const url=new URL(location.href);url.searchParams.delete('project');history.replaceState(history.state,'',url.pathname+url.search+url.hash);}catch{}document.getElementById('gfs-project-context')?.remove();}
  function render(){
    const value=get(),main=document.querySelector('main');
    if(!value||!main||!/^\/quote(?:\/|$)/.test(location.pathname)||document.getElementById('gfs-project-context'))return;
    const bar=document.createElement('aside');bar.id='gfs-project-context';bar.className='gfs-project-context';bar.setAttribute('aria-label','Project requested');
    const text=document.createElement('span');text.textContent='Your project: '+value.label;
    const note=document.createElement('small');note.textContent='Included with your estimate request.';
    const remove=document.createElement('button');remove.type='button';remove.textContent='Clear project';remove.onclick=clear;
    bar.append(text,note,remove);main.prepend(bar);
  }
  window.GFSProjectContext={get,clear,render};
  // Shared header/footer quote links carry the same explicit page interest.
  document.addEventListener('click',function(event){
    const link=event.target?.closest?.('a[href]');if(!link)return;
    const intent=Object.keys(choices).find(id=>choices[id].path===location.pathname);if(!intent)return;
    try{const url=new URL(link.href,location.href);if(url.origin!==location.origin||!/^\/quote(?:\/|$)/.test(url.pathname)||url.searchParams.has('project'))return;url.searchParams.set('project',intent);link.href=url.href;}catch{}
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
