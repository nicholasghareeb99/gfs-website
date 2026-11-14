/* ============================================================
   GHAREEB FENCING — PROPERTY LINE TOOLS
   ============================================================
   Pulls the parcel boundary for an address and lets the customer
   trace their fence along it, offset inside the line by a chosen
   setback.

   Why this matters: the single most common source of fence
   disputes and rework is a fence built on or over the property
   line. Showing the real boundary while someone plans the job
   sets expectations before a crew ever mobilises.

   ---------------------------------------------------------------
   PROVIDERS
   ---------------------------------------------------------------
   Parcel geometry comes from county GIS. Most counties publish a
   public ArcGIS REST layer that answers spatial queries without a
   key. Because every county's URL and field names differ, the
   endpoint is configuration, not something hardcoded here.

   Configure in the page (or via Firestore settings/global.parcelService):

     window.GFS_PARCELS = {
       provider: 'arcgis',
       url: 'https://<county-gis-host>/arcgis/rest/services/<Parcels>/MapServer/0',
       fields: { id: 'PARCELID', owner: 'OWNERNAME', acres: 'ACRES', address: 'SITEADDR' }
     };

   To find your county's layer: search "<county> ArcGIS REST parcels"
   or open the county auditor's public GIS map and inspect the
   network requests for a `/arcgis/rest/services/.../MapServer/<n>`
   URL. Confirm it returns JSON in a browser before configuring it.

   NW Ohio / SE Michigan counties to cover for this service area:
   Lucas, Wood, Fulton, Ottawa (OH) and Monroe (MI). Each needs its
   own entry — see GFS_PARCELS.counties below for the multi-county
   form.

   With nothing configured, the property-line button stays hidden
   and every other drawing tool works exactly as before.
   ============================================================ */
(function () {
  'use strict';

  const BUILD = 'parcels-v1.0-2026-08-09';

  // ---- CONFIG ------------------------------------------------------
  const CFG = Object.assign({
    provider: null,          // 'arcgis' | null
    url: '',                 // single-layer form
    counties: [],            // [{ name, url, fields, bbox:[w,s,e,n] }]
    fields: { id: 'PARCELID', owner: 'OWNER', acres: 'ACRES', address: 'ADDRESS' },
    setbackInches: 6,        // how far inside the line the fence sits
    timeoutMs: 9000,
  }, window.GFS_PARCELS || {});

  const state = {
    parcel: null,      // { rings: [[ [lng,lat], ... ]], attrs: {} }
    overlay: null,     // drawn boundary on the map
    offsetOverlay: null,
    setbackInches: CFG.setbackInches,
  };

  function configured() {
    return !!(CFG.provider === 'arcgis' && (CFG.url || (CFG.counties && CFG.counties.length)));
  }

  // ---- PROVIDER: ArcGIS REST --------------------------------------
  // Standard `query` operation with a point geometry and
  // spatialRel=esriSpatialRelIntersects, returning GeoJSON.
  function layerForPoint(lat, lng) {
    if (CFG.url) return { url: CFG.url, fields: CFG.fields };
    for (const c of CFG.counties || []) {
      if (!c.bbox) return { url: c.url, fields: c.fields || CFG.fields };
      const [w, s, e, n] = c.bbox;
      if (lng >= w && lng <= e && lat >= s && lat <= n) {
        return { url: c.url, fields: c.fields || CFG.fields };
      }
    }
    return null;
  }

  const parcelPending=new Map(),parcelRecent=new Map();
  async function parcelJson(url,timeoutMs){
    const controller=new AbortController();let timer;
    try{
      return await Promise.race([
        (async()=>{const response=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{Accept:'application/geo+json,application/json'}});if(!response.ok)return {ok:false,reason:'http-'+response.status};try{return {ok:true,data:await response.json()};}catch{return {ok:false,reason:'bad-geometry'};}})(),
        new Promise(resolve=>{timer=setTimeout(()=>{controller.abort();resolve({ok:false,reason:'timeout'});},timeoutMs);})
      ]);
    }catch(error){return {ok:false,reason:error?.name==='AbortError'?'timeout':'network'};}
    finally{clearTimeout(timer);controller.abort();}
  }
  async function fetchParcel(lat,lng){
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return {ok:false,reason:'bad-geometry'};
    const layer=layerForPoint(lat,lng);if(!layer)return {ok:false,reason:'no-coverage'};
    let target;
    try{
      target=new URL(layer.url);
      if(target.protocol!=='https:'||target.username||target.password||target.hash||!/\/(?:MapServer|FeatureServer)\/\d+\/?$/.test(target.pathname))throw Error('layer');
      target.pathname=target.pathname.replace(/\/$/,'')+'/query';
      const params={f:'geojson',geometry:JSON.stringify({x:lng,y:lat,spatialReference:{wkid:4326}}),geometryType:'esriGeometryPoint',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'*',returnGeometry:'true',resultRecordCount:'8'};
      for(const [key,value] of Object.entries(params))target.searchParams.set(key,value);
    }catch{return {ok:false,reason:'no-coverage'};}
    const key=target.href,recent=parcelRecent.get(key);
    if(recent&&recent.until>Date.now())return recent.result;
    if(parcelPending.has(key))return parcelPending.get(key);
    const pending=(async()=>{
      const started=Date.now(),budget=Math.max(1,Math.min(20000,Number(CFG.timeoutMs)||9000));
      let result=await parcelJson(target.href,Math.min(3000,Math.max(1,budget/3)));
      // A received HTTP/ArcGIS failure is not a CORS problem. Do not amplify it.
      if(!result.ok&&['timeout','network'].includes(result.reason)&&Date.now()-started<budget){
        const relay=new URL('/.netlify/functions/parcel-proxy',window.location.origin);relay.searchParams.set('url',target.href);
        result=await parcelJson(relay.href,Math.max(1,budget-(Date.now()-started)));
      }
      let answer=result;
      if(result.ok){
        const data=result.data;
        if(data?.error)answer={ok:false,reason:'provider-error'};
        else if(!Array.isArray(data?.features)||!data.features.length)answer={ok:false,reason:'not-found'};
        else{
          let match=null;
          for(const feature of data.features.slice(0,8)){
            const rings=normaliseRings(feature?.geometry,[lng,lat]);
            if(rings.length){match={ok:true,rings,attrs:feature.properties||{},fields:layer.fields};break;}
          }
          answer=match||{ok:false,reason:'bad-geometry'};
        }
      }
      parcelRecent.set(key,{result:answer,until:Date.now()+(answer.ok?300000:60000)});
      if(parcelRecent.size>80)parcelRecent.delete(parcelRecent.keys().next().value);
      return answer;
    })();
    parcelPending.set(key,pending);
    try{return await pending;}finally{if(parcelPending.get(key)===pending)parcelPending.delete(key);}
  }

  function normaliseRings(geom,at){
    const validPoint=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
    const validRing=ring=>Array.isArray(ring)&&ring.length>=4&&ring.length<=20000&&ring.every(validPoint)&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1];
    if(!validPoint(at))return [];
    function contains(ring){
      let inside=false;
      for(let i=0,j=ring.length-1;i<ring.length;j=i++){
        const a=ring[j],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],cross=(at[0]-a[0])*dy-(at[1]-a[1])*dx;
        if(Math.abs(cross)<1e-12&&at[0]>=Math.min(a[0],b[0])-1e-10&&at[0]<=Math.max(a[0],b[0])+1e-10&&at[1]>=Math.min(a[1],b[1])-1e-10&&at[1]<=Math.max(a[1],b[1])+1e-10)return true;
        if((a[1]>at[1])!==(b[1]>at[1])&&at[0]<(b[0]-a[0])*(at[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      return inside;
    }
    const polygons=geom?.type==='Polygon'?[geom.coordinates]:geom?.type==='MultiPolygon'?geom.coordinates:[];
    if(!Array.isArray(polygons)||polygons.length>100)return [];
    for(const polygon of polygons){
      if(!Array.isArray(polygon)||!polygon.length||!polygon.every(validRing))continue;
      if(contains(polygon[0])&&!polygon.slice(1).some(contains))return polygon.map(ring=>ring.map(p=>p.slice(0,2)));
    }
    return [];
  }


  // ---- GEOMETRY ----------------------------------------------------
  const R = 6378137;
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  // Local metre-space projection about an origin, so offsetting is done in
  // real distances rather than degrees (which distort badly with latitude).
  function toMetres(ring) {
    const lat0 = toRad(ring[0][1]);
    const mPerLng = R * Math.cos(lat0) * Math.PI / 180;
    const mPerLat = R * Math.PI / 180;
    return {
      pts: ring.map(([lng, lat]) => [lng * mPerLng, lat * mPerLat]),
      back: ([x, y]) => [x / mPerLng, y / mPerLat],
    };
  }

  function signedArea(pts) {
    let a = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
    }
    return a / 2;
  }

  /**
   * Shrink a closed ring inward by `metres`.
   *
   * Offsets each edge along its inward normal and intersects consecutive
   * edges. Good enough for residential lots, which are near-convex; it is
   * not a general-purpose polygon offset and will misbehave on badly
   * re-entrant shapes, so the result is only ever a starting point the
   * customer can drag.
   */
  function offsetRingInward(ring, metres) {
    if (!ring || ring.length < 4 || !metres) return ring;
    const proj = toMetres(ring);
    let pts = proj.pts.slice();
    if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) {
      pts.push(pts[0]);
    }
    const inward = signedArea(pts) > 0 ? 1 : -1;

    const edges = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const nx = (-dy / len) * inward, ny = (dx / len) * inward;
      edges.push([
        [x1 + nx * metres, y1 + ny * metres],
        [x2 + nx * metres, y2 + ny * metres],
      ]);
    }
    if (edges.length < 3) return ring;

    const out = [];
    for (let i = 0; i < edges.length; i++) {
      const prev = edges[(i - 1 + edges.length) % edges.length];
      const cur = edges[i];
      const p = intersect(prev[0], prev[1], cur[0], cur[1]);
      out.push(p || cur[0]);
    }
    out.push(out[0]);
    return out.map(proj.back).map(([lng, lat]) => [lng, lat]);
  }

  function intersect(a1, a2, b1, b2) {
    const d = (a2[0] - a1[0]) * (b2[1] - b1[1]) - (a2[1] - a1[1]) * (b2[0] - b1[0]);
    if (Math.abs(d) < 1e-9) return null;   // parallel
    const t = ((b1[0] - a1[0]) * (b2[1] - b1[1]) - (b1[1] - a1[1]) * (b2[0] - b1[0])) / d;
    return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])];
  }

  function ringPerimeterFeet(ring) {
    let m = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      m += haversine(ring[i], ring[i + 1]);
    }
    return Math.round(m * 3.28084);
  }

  function haversine(a, b) {
    const dLat = toRad(b[1] - a[1]);
    const dLng = toRad(b[0] - a[0]);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // ---- PUBLIC API --------------------------------------------------
  window.GFSParcels = {
    version: BUILD,
    isConfigured: configured,
    lookup: fetchParcel,
    offsetRingInward: offsetRingInward,
    ringPerimeterFeet: ringPerimeterFeet,
    normaliseRings: normaliseRings,
    state: state,
    config: CFG,
  };

  console.log('[Ghareeb Parcels] ' + BUILD +
    (configured() ? ' — provider ready' : ' — no parcel service configured (property-line tools hidden)'));
})();
