// Rendering-only owner design revision, 2026-10-06. Never saves settings or job values.
// Exact requested four-foot profiles: top rail upper edge 48 in, post top 52 in.
// Nominal dressed dimensions are preview defaults, not purchased stock certification.
const requestedCounts=new Map([
 ["4' ranch rail 3 boards blk welded wire",3],["4' ranch rail 4 boards blk welded wire",4],
 ['4ft pt ranch rail 3-rail - black 2x4 welded wire',3],['4ft pt ranch rail 4-rail - black 2x4 welded wire',4]
]);
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export function ownerRanchRailCourses(count,faceIn){
 const top=48-faceIn/2,bottom=(count===3?9.5:5)+faceIn/2;
 return Array.from({length:count},(_,i)=>bottom+(top-bottom)*i/(count-1));
}
export function resolveRanchModelSpec(spec,name,raw=spec,height){
 const count=requestedCounts.get(String(name||'').toLowerCase());
 if(!spec||spec.mode!=='ranch'||spec.wood!==true||!count)return spec;
 const out={...spec},source=raw||{};
 // Known requested mesh only; explicit wire/finish, gauge and roll stay authoritative.
 if(source.wire==null)out.wire='2x4';
 if(source.meshCol==null)out.meshCol='black';
 out.postIn=positive(source.postIn)?source.postIn:3.5;
 out.railWIn=positive(source.railWIn)?source.railWIn:positive(source.boardIn)?source.boardIn:5.5;
 out.railTIn=positive(source.railTIn)?source.railTIn:positive(source.boardTIn)?source.boardTIn:1.5;
 // Actual run height controls eligibility. Parsing a four-foot label alone must
 // never turn a saved 4.5-foot job into a four-foot drawing.
 const customRails=Array.isArray(source.rails)&&source.rails.length>0;
 const sameHeight=height===4&&(!positive(source.h)||source.h===4)&&(!positive(source.editH)||source.editH===4);
 if(sameHeight&&!customRails&&out.railsN===count){
  out.rails=ownerRanchRailCourses(count,out.railWIn);out.editH=4;
  if(!positive(source.postHIn))out.postHIn=52;
 }
 return out;
}
export function ranchModelGeometry(spec,height){
 if(!spec||spec.mode!=='ranch'||spec.wood!==true)return null;
 const faceIn=positive(spec.railWIn)?spec.railWIn:5;
 const depthIn=positive(spec.railTIn)?spec.railTIn:1.2;
 const scale=positive(spec.editH)&&spec.editH!==height?height/spec.editH:1;
 let railsIn;
 if(Array.isArray(spec.rails)&&spec.rails.length)railsIn=scale===1?spec.rails.slice():spec.rails.map(v=>Math.round(v*scale*4)/4);
 else{const n=Number.isInteger(spec.railsN)&&spec.railsN>0?spec.railsN:3;railsIn=Array.from({length:n},(_,i)=>(.18+(.78-.18)*i/Math.max(1,n-1))*height*12);}
 return {faceIn,depthIn,railsIn};
}

// Contacts are computed from existing render thickness, not a supplier wire-gauge claim.
export function ranchWireSandwich(spec,name,postIn,railDepthIn,wireDiameterIn){
 if(!spec||spec.mode!=='ranch'||spec.wood!==true||!requestedCounts.has(String(name||'').toLowerCase())||!['2x4','2x3'].includes(spec.wire))return null;
 const explicit=v=>v!=null&&v!==''&&Number.isFinite(+v);
 if(explicit(spec.railZIn)||explicit(spec.wireZIn)||explicit(spec.meshZIn))return null;
 if(positive(spec.gPostIn)&&Math.abs(spec.gPostIn-postIn)>1e-8)return null;
 if(!positive(postIn)||!positive(railDepthIn)||!positive(wireDiameterIn))return null;
 // Horizontal-wire boxes already use 1.02 times the displayed wire diameter.
 const wireEnvelopeIn=wireDiameterIn*1.02,postFaceIn=postIn/2;
 return{postFaceIn,wireEnvelopeIn,wireCenterIn:postFaceIn+wireEnvelopeIn/2,railBackIn:postFaceIn+wireEnvelopeIn,railCenterIn:postFaceIn+wireEnvelopeIn+railDepthIn/2};
}
