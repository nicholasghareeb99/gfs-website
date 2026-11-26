// Minimal Google Maps stand-in: enough API surface for ballpark.js, with a
// simple Web Mercator projection so pixel taps map to lat/lng. Markers are
// real DOM nodes so tests can see and "drag" them via google.maps.event.trigger.
(function(){
  const listeners=new WeakMap();
  function on(obj,name,fn){let m=listeners.get(obj);if(!m)listeners.set(obj,m={});(m[name]=m[name]||[]).push(fn);return{obj,name,fn};}
  function fire(obj,name,...a){const m=listeners.get(obj);(m&&m[name]||[]).slice().forEach(f=>f(...a));}
  class LatLng{constructor(a,b){if(typeof a==='object'){this._a=a.lat;this._b=a.lng;}else{this._a=a;this._b=b;}}lat(){return this._a}lng(){return this._b}toJSON(){return{lat:this._a,lng:this._b}}}
  const ll=v=>v instanceof LatLng?v:new LatLng(v);
  class MVCArray{constructor(a=[]){this.a=a.map(ll);}getArray(){return this.a}getLength(){return this.a.length}getAt(i){return this.a[i]}
    push(v){this.a.push(ll(v));fire(this,'insert_at',this.a.length-1);return this.a.length}setAt(i,v){const old=this.a[i];this.a[i]=ll(v);fire(this,'set_at',i,old)}
    insertAt(i,v){this.a.splice(i,0,ll(v));fire(this,'insert_at',i)}removeAt(i){const r=this.a.splice(i,1)[0];fire(this,'remove_at',i,r);return r}
    clear(){while(this.a.length)this.removeAt(this.a.length-1)}addListener(n,f){return on(this,n,f)}forEach(f){this.a.forEach(f)}}
  class MVCObject{addListener(n,f){return on(this,n,f)}setOptions(o){Object.assign(this.opts||(this.opts={}),o);if(o.map!==undefined)this.setMap(o.map)}}
  const all={markers:new Set(),lines:new Set()};
  class Map extends MVCObject{constructor(el,o){super();this.el=el;this.c=ll(o.center);this.z=o.zoom;this.opts=o;window.__gmap=this;
      el.style.position=el.style.position||'relative';
      el.addEventListener('click',e=>{if(e.target.closest('.gstub-marker'))return;const r=el.getBoundingClientRect();fire(this,'click',{latLng:this.fromPx(e.clientX-r.left,e.clientY-r.top)})});}
    scale(){return 256*Math.pow(2,this.z)}
    world(p){const s=Math.sin(p.lat()*Math.PI/180);return{x:(p.lng()+180)/360*this.scale(),y:(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*this.scale()}}
    toPx(p){const c=this.world(this.c),w=this.world(ll(p)),r=this.el.getBoundingClientRect();return{x:w.x-c.x+r.width/2,y:w.y-c.y+r.height/2}}
    fromPx(x,y){const c=this.world(this.c),r=this.el.getBoundingClientRect(),wx=c.x+x-r.width/2,wy=c.y+y-r.height/2,s=this.scale();const lng=wx/s*360-180,n=Math.PI-2*Math.PI*wy/s;return new LatLng(180/Math.PI*Math.atan(.5*(Math.exp(n)-Math.exp(-n))),lng)}
    getCenter(){return this.c}setCenter(c){this.c=ll(c);fire(this,'center_changed');redraw()}panBy(dx,dy){const p=this.toPx(this.c);this.setCenter(this.fromPx(p.x+dx,p.y+dy))}
    getZoom(){return this.z}setZoom(z){this.z=z;redraw()}setTilt(){}fitBounds(){}getDiv(){return this.el}}
  function redraw(){all.markers.forEach(m=>m.draw());all.lines.forEach(l=>l.draw())}
  class Polyline extends MVCObject{constructor(o={}){super();this.opts=o;this.path=o.path instanceof MVCArray?o.path:new MVCArray(o.path||[]);this.map=null;
      this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');this.svg.setAttribute('class','gstub-line');this.svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:1';
      this.p=document.createElementNS('http://www.w3.org/2000/svg','polyline');this.p.setAttribute('fill','none');this.svg.appendChild(this.p);
      ['insert_at','set_at','remove_at'].forEach(n=>on(this.path,n,()=>this.draw()));if(o.map)this.setMap(o.map);}
    getPath(){return this.path}setPath(p){this.path=p instanceof MVCArray?p:new MVCArray(p);['insert_at','set_at','remove_at'].forEach(n=>on(this.path,n,()=>this.draw()));this.draw()}
    setMap(m){this.map=m;if(m){m.el.appendChild(this.svg);all.lines.add(this)}else{this.svg.remove();all.lines.delete(this)}this.draw()}getMap(){return this.map}
    setEditable(v){this.editable=v}getEditable(){return!!this.editable}
    draw(){if(!this.map)return;this.p.setAttribute('points',this.path.getArray().map(q=>{const t=this.map.toPx(q);return t.x+','+t.y}).join(' '));this.p.setAttribute('stroke',(this.opts&&this.opts.strokeColor)||'#00E5A0');this.p.setAttribute('stroke-width',(this.opts&&this.opts.strokeWeight)||4)}}
  class Polygon extends Polyline{}
  class Marker extends MVCObject{constructor(o={}){super();this.opts=o;this.pos=ll(o.position);this.el=document.createElement('div');this.el.className='gstub-marker';this.el.title=o.title||'';
      this.el.style.cssText='position:absolute;z-index:'+(o.zIndex||5)+';transform:translate(-50%,-50%);cursor:pointer';
      if(o.icon&&o.icon.url){const img=document.createElement('img');img.src=o.icon.url;img.width=o.icon.scaledSize?.w||40;img.height=o.icon.scaledSize?.h||40;img.style.pointerEvents='none';this.el.appendChild(img)}
      this.el.addEventListener('click',e=>{e.stopPropagation();fire(this,'click',{latLng:this.pos})});all.markers.add(this);this.el.__marker=this;if(o.map)this.setMap(o.map)}
    getPosition(){return this.pos}setPosition(p){this.pos=ll(p);this.draw()}setMap(m){this.map=m;if(m){m.el.appendChild(this.el);all.markers.add(this)}else{this.el.remove();all.markers.delete(this)}this.draw()}getMap(){return this.map}
    setIcon(i){this.opts.icon=i}setDraggable(){}draw(){if(!this.map)return;const t=this.map.toPx(this.pos);this.el.style.left=t.x+'px';this.el.style.top=t.y+'px'}}
  // Test helper: drag marker from its position to pixel (x,y) relative to the map in steps.
  window.__gstubDrag=(marker,x,y,steps=5)=>{const m=marker.map,a=m.toPx(marker.pos);fire(marker,'dragstart',{latLng:marker.pos});for(let i=1;i<=steps;i++){const p=m.fromPx(a.x+(x-a.x)*i/steps,a.y+(y-a.y)*i/steps);marker.setPosition(p);fire(marker,'drag',{latLng:p})}fire(marker,'dragend',{latLng:marker.pos})};
  window.__gstubMarkers=()=>[...all.markers];
  class LatLngBounds{constructor(){this.pts=[]}extend(p){this.pts.push(ll(p));return this}}
  class Size{constructor(w,h){this.w=w;this.h=h;this.width=w;this.height=h}}
  class Point{constructor(x,y){this.x=x;this.y=y}}
  class Geocoder{async geocode(){return{results:[]}}}
  class Autocomplete extends MVCObject{constructor(){super()}bindTo(){}getPlace(){return null}}
  window.google={maps:{Map,Polyline,Polygon,Marker,LatLng,LatLngBounds,MVCArray,Size,Point,Geocoder,
    MapTypeId:{HYBRID:'hybrid',SATELLITE:'satellite',ROADMAP:'roadmap'},MapTypeControlStyle:{HORIZONTAL_BAR:1},ControlPosition:{BOTTOM_LEFT:1,BOTTOM:2,TOP_RIGHT:3,RIGHT_BOTTOM:4},
    event:{addListener:(o,n,f)=>on(o,n,f),removeListener:h=>{if(!h)return;const m=listeners.get(h.obj);if(m&&m[h.name])m[h.name]=m[h.name].filter(f=>f!==h.fn)},trigger:(o,n,...a)=>fire(o,n,...a),clearInstanceListeners:o=>listeners.delete(o)},
    geometry:{spherical:{computeLength:()=>0,computeDistanceBetween:()=>0}},places:{Autocomplete}}};
})();
