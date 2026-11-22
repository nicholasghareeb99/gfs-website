// Registration never rotates, independently stretches, or guesses a new origin.
// Every segment must agree after one small common scale + translation, including
// straight runs. Feet remain feet; only legacy rounding/projection drift is allowed.
export function registeredSiteFrame(source,target){
 const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=1e6&&Math.abs(p.z)<=1e6;
 const ok=segments=>Array.isArray(segments)&&segments.length>0&&segments.length<=400&&segments.every(s=>Array.isArray(s)&&s.length===2&&s.every(valid)&&Math.hypot(s[1].x-s[0].x,s[1].z-s[0].z)>.001);
 if(!ok(source)||!ok(target)||source.length!==target.length)return null;
 const bounds=segments=>{const points=segments.flat(),xs=points.map(p=>p.x),zs=points.map(p=>p.z),x1=Math.min(...xs),x2=Math.max(...xs),z1=Math.min(...zs),z2=Math.max(...zs);return{x:(x1+x2)/2,z:(z1+z2)/2,w:x2-x1,d:z2-z1};};
 const a=bounds(source),b=bounds(target),axis=a.w>=a.d?'w':'d',scale=b[axis]/a[axis];
 if(!Number.isFinite(scale)||scale<.99||scale>1.01)return null;
 const map=p=>({x:b.x+(p.x-a.x)*scale,z:b.z+(p.z-a.z)*scale});
 const near=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z)<=.11;
 const unused=new Set(target.map((_,i)=>i));
 for(const s of source){const p=map(s[0]),q=map(s[1]);let match=-1;for(const i of unused){const t=target[i];if(near(p,t[0])&&near(q,t[1])||near(p,t[1])&&near(q,t[0])){match=i;break;}}if(match<0)return null;unused.delete(match);}
 return{scale,x:b.x-a.x*scale,z:b.z-a.z*scale,map};
}

// Store the projected origin and feet per zoom-20 tile. The map and model can
// use different origins and bearings, including a rotated drawing background.
export const AERIAL_GRID = 2 ** 20;
export const DEFAULT_AERIAL = 'esri-world-imagery';

export function aerialTransform(frame) {
  const {u, v, x, z, ux, uz, vx, vz} = frame || {};
  if (![u, v, x, z, ux, uz, vx, vz].every(Number.isFinite) ||
      u <= 0 || u >= 1 || v <= 0 || v >= 1 ||
      Math.hypot(ux, uz) > 300 || Math.hypot(vx, vz) > 300 ||
      ux * vz - uz * vx < 1) return null;
  return [ux, uz, vx, vz, x - (u * ux + v * vx) * AERIAL_GRID, z - (u * uz + v * vz) * AERIAL_GRID];
}

const FT_PER_DEG = 6371e3 * Math.PI / 180 * 3.280839895;
const RAD = Math.PI / 180;

function locationPoint(point) {
  const [lat,lng] = Array.isArray(point) ? point : [point?.lat,point?.lng];
  return Number.isFinite(lat) && Math.abs(lat) < 85 &&
    Number.isFinite(lng) && Math.abs(lng) < 180 && (lat || lng) ? {lat,lng} : null;
}

export function positionFrame(point) {
  const position=locationPoint(point);
  if (!position) return null;
  return {lat0:position.lat,lng0:position.lng,ftPerDegLat:FT_PER_DEG,
    ftPerDegLng:FT_PER_DEG*Math.cos(position.lat*RAD)};
}

export function propertyAerial(frame, registration, sourceId = DEFAULT_AERIAL) {
  const {lat0,lng0,ftPerDegLat,ftPerDegLng} = frame || {};
  if (!registration || !locationPoint({lat:lat0,lng:lng0}) ||
      ![ftPerDegLat,ftPerDegLng].every(n => Number.isFinite(n) && n > 0)) return null;
  const origin = registration.map({x:0,z:0});
  const east = registration.map({x:ftPerDegLng*360/AERIAL_GRID,z:0});
  const south = registration.map({x:0,z:ftPerDegLat*Math.cos(lat0*RAD)*360/AERIAL_GRID});
  const aerial = {
    u:(lng0+180)/360,v:(1-Math.asinh(Math.tan(lat0*RAD))/Math.PI)/2,
    x:origin.x,z:origin.z,ux:east.x-origin.x,uz:east.z-origin.z,vx:south.x-origin.x,vz:south.z-origin.z,sourceId,
  };
  return aerialTransform(aerial) ? aerial : null;
}

const identity = {map:point => point};
const hidden = item => item?.staffOnly === true || item?.private === true || item?.hidden === true || item?.internal === true ||
  ['customerVisible','portalVisible','sharedWithCustomer'].some(key => item?.[key] === false) ||
  ['audience','visibility'].some(key => /^(?:staff(?:[-_]only)?|internal|private|crew|office)$/i.test(String(item?.[key] || '').trim()));
const addressKey = value => typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]+/g,'') : '';
export function viewerMapAddress(value) {
  if (typeof value !== 'string') return '';
  const address = value.trim();
  const complete = /^\d+\s+[^,]+,\s*[^,]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?$/i;
  const withZip = /^\d+\s+\S.*\b[A-Z]{2}\s+\d{5}(?:-\d{4})?$/i;
  return address.length <= 200 && (complete.test(address) || withZip.test(address)) ? address : '';
}

function mapDrawing(siteMap) {
  const doc = siteMap?.doc || siteMap;
  if (!doc || hidden(siteMap) || hidden(doc) || !Array.isArray(doc.items) || doc.items.length > 1000) return null;
  const rings = doc.items.filter(item => !hidden(item) && ['fence','deed','structure','rect'].includes(item?.type))
    .flatMap(item => {
      if (!Array.isArray(item.latlngs) || item.latlngs.length < 2 || item.latlngs.length > 500) return [];
      const points = item.latlngs.map(locationPoint);
      return points.every(Boolean) ? [{item,points}] : [];
    });
  const fence = rings.filter(ring => ring.item.type === 'fence');
  const points = (fence.length ? fence : rings).flatMap(ring => ring.points);
  if (!points.length) return null;
  const center = {
    lat:points.reduce((sum,p) => sum+p.lat,0)/points.length,
    lng:points.reduce((sum,p) => sum+p.lng,0)/points.length,
  };
  return {rings, fence, center};
}

function registerDrawing(drawing, lines) {
  if (!drawing) return null;
  const frame = positionFrame(drawing.center);
  if (!frame) return null;
  const local = p => ({x:(p.lng-frame.lng0)*frame.ftPerDegLng,z:(frame.lat0-p.lat)*frame.ftPerDegLat});
  const pairs = drawing.fence.flatMap(({points}) => points.slice(1).map((p,i) => [local(points[i]),local(p)]));
  const target = lines.map(l => [{x:l.x1,z:l.z1},{x:l.x2,z:l.z2}]);
  const registration = registeredSiteFrame(pairs,target);
  const aerial = propertyAerial(frame,registration);
  if (!aerial) return null;
  const buildings = [];
  let lot;
  for (const {item,points} of drawing.rings) {
    if (points.length < 3 || item.type === 'fence') continue;
    const ring = points.map(p => {
      const at = registration.map(local(p));
      return [at.x,at.z];
    });
    if (item.type === 'deed') {
      if (!lot) lot = ring;
    } else if (buildings.length < 24) {
      const kind = ['house','garage','shed'].includes(item.meta?.kind) ? item.meta.kind : 'structure';
      buildings.push({kind,pts:ring});
    }
  }
  return {aerial,aligned:true,buildings,...(lot ? {lot} : {})};
}

function inlineDrawing(lines) {
  return lines.some(line => Array.isArray(line.latlngs)) ?
    {items:lines.map(line => ({type:'fence',latlngs:line.latlngs}))} : null;
}

// Used by staff and by the already-authorized portal job projection. The link
// receives the aerial and public outlines in model feet, never the raw map.
export function recoverJobSite(spec, job) {
  if (!spec || ['sample','style-only'].includes(spec.previewKind) || !Array.isArray(spec.lines) || !spec.lines.length) return null;
  const site = spec.site || {};
  if (aerialTransform(site.aerial)) return site;
  const address = viewerMapAddress(job?.data?.cAddr || job?.cAddr || spec.mapAddress || spec.addr);
  const map = job?.siteMap || spec.siteMap || inlineDrawing(spec.lines);
  const drawing = mapDrawing(map);
  const matched = registerDrawing(drawing,spec.lines);
  if (matched) return {...site,...matched,approximate:false,
    buildings:matched.buildings.length ? matched.buildings : site.buildings || []};
  const savedFrame = spec.mapFrame || site.frame || (spec.fromSitePlan && !hidden(map) ? map?.frame : null);
  const fromFrame = propertyAerial(savedFrame,identity);
  if (fromFrame) return {...site,aerial:fromFrame,aligned:true,approximate:false};

  const staleGeo = !job?.geoPinned && address && job?.geoMeta?.addr && addressKey(job.geoMeta.addr) !== addressKey(address);
  const pos = drawing?.center || (!hidden(map) && !hidden(map?.doc) && locationPoint(map?.doc?.center || map?.center)) ||
    (staleGeo ? null : locationPoint(job?.geo) || locationPoint(spec.geo));
  const aerial = propertyAerial(positionFrame(pos),identity);
  if (aerial) return {...site,aerial,aligned:true,approximate:true};
  return address ? {...site,mapAddress:address} : null;
}

export function withRecoveredJobSite(spec, job) {
  const site = recoverJobSite(spec,job);
  return site && site !== spec.site ? {...spec,site} : spec;
}
