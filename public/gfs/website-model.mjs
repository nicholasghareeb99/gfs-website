import {catalogSpecs} from './studio-catalog.mjs';
import {resolveModelProfile} from './model-profiles.mjs';
import {applyOwnerModelCorrection,ownerModelHeight} from './owner-model-corrections.mjs';

const validPoint=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function modelOverrides(name,live){
 const source=live&&typeof live==='object'?live[name]||{}:catalogSpecs[name]||{};
 const result={};
 for(const [key,value] of Object.entries(source)){
  if(!/^[a-zA-Z][a-zA-Z0-9_]{0,60}$/.test(key)||['constructor','prototype','__proto__'].includes(key))continue;
  const primitive=v=>v===null||typeof v==='boolean'||typeof v==='string'&&v.length<160||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=16777215;
  if(primitive(value)||Array.isArray(value)&&value.length<=32&&value.every(primitive))result[key]=value;
 }
 return {[name]:applyOwnerModelCorrection(name,result)};
}
function nearest(lines,x,z){
 let found=null;
 for(const line of lines){const dx=line.x2-line.x1,dz=line.z2-line.z1,len=Math.hypot(dx,dz);if(!len)continue;
  const at=Math.max(0,Math.min(len,((x-line.x1)*dx+(z-line.z1)*dz)/len));
  const px=line.x1+dx*at/len,pz=line.z1+dz*at/len,distance=Math.hypot(px-x,pz-z);
  if(!found||distance<found.distance)found={line,len,at,ux:dx/len,uz:dz/len,distance};
 }return found;
}
export function buildPreviewSpec({name,height=6,length=24,geometry,singleGates=0,doubleGates=0,overrides,detail=false}){
 if(typeof name!=='string'||!name.trim())throw Error('Choose a fence style first.');
 height=ownerModelHeight(name)??height;
 if(!Number.isFinite(+height)||+height<2||+height>12)throw Error('Choose a supported fence height.');
 const ov=modelOverrides(name,overrides),section=resolveModelProfile(name,+height,ov).defaults.secFt;
 const spec={job:detail?'Panel detail':'Your fence layout',style:name,h:+height,ov,alts:[],lines:[],gates:[]};
 let drawing=typeof geometry==='string'?JSON.parse(geometry||'null'):geometry;
 if(!detail&&drawing?.lines?.length){
  if(drawing.lines.length>100||drawing.lines.some(line=>!Array.isArray(line)||line.length<2||!line.every(validPoint)))throw Error('The drawing needs review before it can be shown in 3D.');
  const points=drawing.lines.flat();if(points.length>3000)throw Error('Please simplify the drawing first.');
  const origin={lat:points.reduce((n,p)=>n+p.lat,0)/points.length,lng:points.reduce((n,p)=>n+p.lng,0)/points.length};
  const scale=6378137*Math.PI/180/.3048,cos=Math.cos(origin.lat*Math.PI/180);
  const project=p=>({x:(p.lng-origin.lng)*scale*cos,z:-(p.lat-origin.lat)*scale});
  for(const run of drawing.lines)for(let i=1;i<run.length;i++){const a=project(run[i-1]),b=project(run[i]);const ft=Math.hypot(b.x-a.x,b.z-a.z);if(ft>.01)spec.lines.push({x1:a.x,z1:a.z,x2:b.x,z2:b.z,ft});}
  for(const gate of drawing.gates||[]){
   if(!validPoint(gate))throw Error('A gate location needs review.');
   const point=project(gate),near=nearest(spec.lines,point.x,point.z),d=gate.type==='drive'||gate.d===true;
   const ft=Number(gate.widthFt)||(d?10:4);if(!near||near.distance>6||ft<=0||ft>near.len)throw Error('Place each gate on a fence run long enough for its opening.');
   const start=Math.max(0,Math.min(near.len-ft,near.at-ft/2));
   spec.gates.push({x:near.line.x1+near.ux*start,z:near.line.z1+near.uz*start,rot:Math.atan2(near.uz,near.ux),ft,d});
  }
 }else{
  const ft=detail?section:Number(length);if(!Number.isFinite(ft)||ft<1||ft>10000)throw Error('Enter the fence length before opening 3D.');
  spec.lines=[{x1:-ft/2,z1:0,x2:ft/2,z2:0,ft}];
  if(!detail){
   const widths=[...Array(Math.max(0,Math.min(100,Math.floor(Number(singleGates)||0)))).fill(4),...Array(Math.max(0,Math.min(100,Math.floor(Number(doubleGates)||0)))).fill(10)];
   const openings=widths.reduce((a,b)=>a+b,0);if(openings>ft)throw Error('The gate openings are wider than the fence length.');
   let at=-ft/2;const gap=(ft-openings)/(widths.length+1);
   for(const width of widths){at+=gap;spec.gates.push({x:at,z:0,rot:0,ft:width,d:width===10});at+=width;}
  }
 }
 if(!spec.lines.length)throw Error('Draw a fence line before opening 3D.');
 return spec;
}
export const encodePreview=spec=>btoa(unescape(encodeURIComponent(JSON.stringify(spec))));
