/* Real map coordinates throughout. Gate widths describe openings within the full run. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GFSMapGeometry=factory();})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const R=6378137,M_PER_FT=.3048,RAD=Math.PI/180;
  function point(value){
    const lat=typeof value?.lat==='function'?value.lat():value?.lat;
    const lng=typeof value?.lng==='function'?value.lng():value?.lng;
    return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
  }
  function distanceFeet(a,b){
    a=point(a);b=point(b);if(!a||!b)throw Error('Unusable map coordinate.');
    const dlat=(b.lat-a.lat)*RAD,dlng=(b.lng-a.lng)*RAD;
    const h=Math.sin(dlat/2)**2+Math.cos(a.lat*RAD)*Math.cos(b.lat*RAD)*Math.sin(dlng/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))/M_PER_FT;
  }
  function segments(paths){
    const out=[];
    (paths||[]).forEach((path,line)=>{
      if(!Array.isArray(path))throw Error('Unusable fence path.');
      path.forEach(p=>{if(!point(p))throw Error('Unusable map coordinate.');});
      for(let i=1;i<path.length;i++){
        const a=point(path[i-1]),b=point(path[i]),feet=distanceFeet(a,b);
        if(feet>.001)out.push({line,segment:i-1,a,b,feet});
      }
    });
    return out;
  }
  function projection(segment,value){
    const p=point(value);if(!p)return null;
    const a=segment.a,b=segment.b,scale=R*RAD/M_PER_FT,cos=Math.cos((a.lat+b.lat)*RAD/2);
    const dx=(b.lng-a.lng)*scale*cos,dy=(b.lat-a.lat)*scale,len=Math.hypot(dx,dy);
    if(!(len>0))return null;
    const px=(p.lng-a.lng)*scale*cos,py=(p.lat-a.lat)*scale;
    const at=(px*dx+py*dy)/len,t=Math.max(0,Math.min(1,at/len));
    return {at:at*segment.feet/len,t,distance:Math.hypot(px-dx*t,py-dy*t),point:{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}};
  }
  const widthFor=type=>type==='drive'?10:4;
  function snapGate({paths,point:value,type='walk',gates=[],maxDistanceFeet=8}={}){
    const p=point(value),widthFeet=widthFor(type);if(!p)return {ok:false,reason:'coordinate'};
    let nearest=null;
    for(const segment of segments(paths)){
      const hit=projection(segment,p);
      if(hit&&(!nearest||hit.distance<nearest.distance))nearest={...hit,...segment};
    }
    if(!nearest||nearest.distance>maxDistanceFeet)return {ok:false,reason:'off-line'};
    if(nearest.feet+1e-6<widthFeet)return {ok:false,reason:'short-run',widthFeet};
    const at=Math.max(widthFeet/2,Math.min(nearest.feet-widthFeet/2,nearest.at)),t=at/nearest.feet;
    const result={ok:true,point:{lat:nearest.a.lat+(nearest.b.lat-nearest.a.lat)*t,lng:nearest.a.lng+(nearest.b.lng-nearest.a.lng)*t},line:nearest.line,segment:nearest.segment,at,widthFeet,start:at-widthFeet/2,end:at+widthFeet/2};
    // Checking each existing opening in this segment's coordinate frame also catches
    // overlapping copies of a collinear run, without moving existing markers.
    for(const gate of gates){
      const hit=projection(nearest,gate.point||gate);if(!hit||hit.distance>.25)continue;
      const width=widthFor(gate.type);
      if(Math.min(result.end,hit.at+width/2)-Math.max(result.start,hit.at-width/2)>.02)return {ok:false,reason:'overlap'};
    }
    return result;
  }
  function summary(paths,gates=[]){
    const rows=segments(paths),totalFeet=rows.reduce((n,row)=>n+row.feet,0),issues=[];
    let openingsFeet=0;
    gates.forEach((gate,index)=>{
      const placed=snapGate({paths,point:gate.point||gate,type:gate.type,gates:gates.slice(0,index),maxDistanceFeet:.15});
      // An endpoint-clamped proposal is not an existing opening that fits.
      if(!placed.ok||distanceFeet(placed.point,gate.point||gate)>.15)issues.push(index);
      else openingsFeet+=placed.widthFeet;
    });
    return {segments:rows,totalFeet,openingsFeet,netFenceFeet:Math.max(0,totalFeet-openingsFeet),issues};
  }
  function format(feet,unit='ft'){return unit==='m'?(feet*M_PER_FT).toFixed(1)+' m':feet.toFixed(1)+' ft';}
  return Object.freeze({point,distanceFeet,segments,projection,widthFor,snapGate,summary,format});
});
