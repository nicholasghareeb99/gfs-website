// Permit map: type an address, see the lot from above with where a fence may go
// and how tall. Parcel lines come from county GIS (same sources as the website's
// ballpark tool), the house and streets from OpenStreetMap, the rules from GFS's
// verified research, and an AI lookup for towns we haven't verified yet.
import { $, $$, esc, clamp, icons, toast } from './ui.mjs';
import { visit } from './visit.mjs';

let app, root, D, map, L, layers, cur = null, aiCache = new Map();
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
const FT = 0.3048;
const COLORS = { front: '#f2b441', side: '#3ecf8e', no: '#ef5b5b', unknown: '#8cc7ff', parcel: '#ffffff' };

export async function init(a, el) {
  app = a; root = el; D = app.data;
  root.innerHTML = `
    <div id="pmap"></div>
    <div class="p-search">
      <label class="search">${icons.search}<input type="search" placeholder="Customer address" enterkeyhint="search" autocomplete="off" aria-label="Address"><button class="loc" aria-label="Use this device's location">${icons.locate}</button></label>
      <div class="sugg" hidden></div>
    </div>
    <div class="p-empty"><div class="box">${icons.map}<h2>Where can the fence go?</h2><p>Enter the customer's address. You'll see the lot, the house, the street, and the height allowed in each part of the yard.</p></div></div>
    <div class="p-card" hidden></div>`;
  await loadLeaflet();
  window.GFS_PARCELS = window.GFS_PARCELS || { provider: 'arcgis', setbackInches: 6, counties: [
    { name: 'Lucas County OH', url: 'https://lcaudgis.co.lucas.oh.us/gisaudserver/rest/services/AREIS_Web_Map_MIL1/MapServer/3', bbox: [-84.00, 41.41, -83.06, 41.77] },
    { name: 'Wayne County MI', url: 'https://www.waynecounty.com/gisserver/rest/services/ParcelViewer/prcls_fullAdd_parsed_FINAL/MapServer/0', bbox: [-83.57, 42.02, -82.86, 42.47] },
    { name: 'Ohio statewide (best effort)', url: 'https://geo.oit.ohio.gov/arcgis/rest/services/OGRIP_Services/Ohio_Statewide_Parcels/MapServer/0', bbox: [-84.83, 38.4, -80.5, 41.98] }] };
  if (!window.GFSParcels) await new Promise(r => { const s = document.createElement('script'); s.src = '/assets/js/parcels.js'; s.onload = s.onerror = r; document.head.append(s); });
  map = L.map($('#pmap', root), { zoomControl: false, attributionControl: true, maxZoom: 21, zoomSnap: .25, tap: false }).setView([41.66, -83.58], 11);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 21, maxNativeZoom: 19, attribution: 'Imagery © Esri, Maxar, Earthstar' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxZoom: 21, maxNativeZoom: 19, opacity: .55 }).addTo(map);
  layers = L.layerGroup().addTo(map);
  map.on('click', onMapClick);
  bindSearch();
}

export const where = () => ({ opts: {}, label: 'Permits' + (cur?.address && cur.address !== 'Current location' ? ` · ${cur.address.split(',')[0]}` : '') });
export function show(opts = {}) {
  setTimeout(() => map?.invalidateSize(), 60);
  if (opts.town) { const r = D.rules.find(x => x.id === opts.town); if (r) townOnly(r); }
}
export function hide() {}

function loadLeaflet() {
  if (window.L) { L = window.L; return Promise.resolve(); }
  return new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css'; css.crossOrigin = ''; document.head.append(css);
    const s = document.createElement('script'); s.src = LEAFLET + 'leaflet.js'; s.crossOrigin = '';
    s.onload = () => { L = window.L; res(); }; s.onerror = () => { root.querySelector('.p-empty p').textContent = 'The map needs a connection the first time it opens.'; rej(Error('leaflet')); };
    document.head.append(s);
  });
}

// ── Address search (Esri geocoder suggestions, biased to the service area) ──
function bindSearch() {
  const input = $('.p-search input', root), sugg = $('.sugg', root); let t = 0, seq = 0;
  input.addEventListener('input', () => {
    clearTimeout(t); const q = input.value.trim();
    if (q.length < 4) { sugg.hidden = true; return; }
    t = setTimeout(async () => {
      const my = ++seq;
      try {
        const u = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest');
        Object.entries({ f: 'json', text: q, location: '-83.58,41.66', countryCode: 'USA', category: 'Address,Postal', maxSuggestions: 6 }).forEach(([k, v]) => u.searchParams.set(k, v));
        const r = await getJSON(u, 6000); if (my !== seq) return;
        sugg.innerHTML = (r.suggestions || []).map(s => `<button data-key="${esc(s.magicKey)}" data-t="${esc(s.text)}">${esc(s.text.split(',')[0])}<small>${esc(s.text.split(',').slice(1).join(',').trim())}</small></button>`).join('');
        sugg.hidden = !sugg.children.length;
      } catch { sugg.hidden = true; }
    }, 280);
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = sugg.querySelector('button'); if (b) b.click(); else lookupText(input.value); } });
  sugg.onclick = e => { const b = e.target.closest('button'); if (!b) return; input.value = b.dataset.t; sugg.hidden = true; input.blur(); lookupText(b.dataset.t, b.dataset.key); };
  $('.loc', root).onclick = () => {
    if (!navigator.geolocation) return toast('Location is not available on this device.');
    toast('Finding your location…');
    navigator.geolocation.getCurrentPosition(p => lookupPoint(p.coords.latitude, p.coords.longitude, 'Current location'), () => toast('Location was not allowed.'), { enableHighAccuracy: true, timeout: 12000 });
  };
}

// Fetch JSON with a time limit, so a weak signal in a yard never leaves the screen waiting forever.
async function getJSON(url, ms, opts = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try { const res = await fetch(url, { ...opts, signal: ctl.signal }); if (!res.ok) throw Error('HTTP ' + res.status); return await res.json(); }
  finally { clearTimeout(t); }
}

async function lookupText(text, magicKey) {
  try {
    const u = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
    Object.entries({ f: 'json', SingleLine: text, maxLocations: 1, outFields: 'Match_addr,City,Subregion,Region,RegionAbbr,Postal', location: '-83.58,41.66', ...(magicKey ? { magicKey } : {}) }).forEach(([k, v]) => u.searchParams.set(k, v));
    const us = new URL(u); us.searchParams.set('locationType', 'street');
    toast('Finding the address…', 1200);
    const [r, rs] = await Promise.all([getJSON(u, 10000), getJSON(us, 10000).catch(() => null)]);
    const c = r.candidates?.[0], s = rs?.candidates?.[0];
    if (!c) return toast('That address was not found.');
    const street = s && Math.hypot(s.location.x - c.location.x, s.location.y - c.location.y) > 0.00004 ? [s.location.y, s.location.x] : null;
    lookupPoint(c.location.y, c.location.x, c.attributes.Match_addr || text, { city: c.attributes.City, county: c.attributes.Subregion, state: c.attributes.RegionAbbr, street });
  } catch { toast(navigator.onLine ? 'Address search failed. Try again.' : 'Address search needs a connection.'); }
}

// ── Lookup ───────────────────────────────────────────────────────
async function lookupPoint(lat, lng, address, geo = {}) {
  $('.p-empty', root).hidden = true;
  layers.clearLayers(); cur = { lat, lng, address, geo, aiRule: null, ...loadEdits(address), ...restoreFence(address) };
  if (address !== 'Current location') visit.setAddress(address);
  L.marker([lat, lng], { icon: L.divIcon({ className: '', html: '<div class="pulse-pin"></div>', iconSize: [18, 18] }) }).addTo(layers);
  map.flyTo([lat, lng], 19, { duration: 1.6 });
  card(`<div class="eyebrow">LOOKING UP</div><h2>${esc(address)}</h2><div class="ai"><div class="think"><i></i><i></i><i></i> Pulling the parcel lines, the house and the street…</div></div>`);
  const [parcel, place, osm] = await Promise.all([
    window.GFSParcels?.lookup(lat, lng).catch(() => null),
    reverse(lat, lng),
    overpass(lat, lng)
  ]);
  if (cur?.lat !== lat) return;
  Object.assign(cur, { parcel: parcel?.ok ? parcel : null, place, osm });
  cur.town = detectTown(cur);
  cur.rule = matchRule(cur.town);
  draw();
  renderCard();
  if (!cur.rule || cur.rule.front == null) askAI(false);
}

async function reverse(lat, lng) {
  try {
    return (await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`, 8000, { headers: { Accept: 'application/json' } })).address || {};
  } catch { return {}; }
}
async function overpass(lat, lng) {
  const q = `[out:json][timeout:12];(way(around:70,${lat},${lng})[building];way(around:120,${lat},${lng})[highway~"^(residential|tertiary|secondary|primary|unclassified|living_street|trunk|service)$"];);out geom;`;
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const j = await getJSON(host, 9000, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      return {
        buildings: j.elements.filter(e => e.tags?.building && e.geometry?.length > 3).map(e => e.geometry.map(p => [p.lon, p.lat])),
        roads: j.elements.filter(e => e.tags?.highway && e.tags.highway !== 'service' && e.geometry?.length > 1).map(e => ({ name: e.tags.name || '', pts: e.geometry.map(p => [p.lon, p.lat]) }))
      };
    } catch {}
  }
  return { buildings: [], roads: [] };
}

function detectTown(c) {
  const a = c.place || {}, attrs = c.parcel?.attrs || {};
  // Parcel records often name the taxing district or township; prefer them.
  for (const [k, v] of Object.entries(attrs)) if (/twp|township|jurisd|munic|polit|taxdist|tax_dist|district|city/i.test(k) && typeof v === 'string' && /[a-z]/i.test(v) && v.length < 60) {
    const m = matchRule(v); if (m) return v;
  }
  const parts = [a.township && a.township + ' township', a.municipality, a.city, a.town, a.village, a.hamlet, c.geo.city].filter(Boolean);
  for (const p of parts) if (matchRule(p)) return p;
  return parts[0] || c.geo.city || '';
}
function matchRule(town) {
  const t = String(town || '').toLowerCase(); if (!t) return null;
  return D.rules.find(r => r.match.some(m => t.includes(m)) && !(r.notMatch || []).some(m => t.includes(m))) || null;
}
const stateOf = c => (c.geo.state || (c.place?.state === 'Michigan' ? 'MI' : c.place?.state === 'Ohio' ? 'OH' : '') || cur.rule?.state || '');

// ── Geometry (local metres) ───────────────────────────────────────
function projector(lat0, lng0) {
  const k = Math.cos(lat0 * Math.PI / 180), m = 111320;
  return { to: ([lng, lat]) => [(lng - lng0) * m * k, (lat - lat0) * m], back: ([x, y]) => [lat0 + y / m, lng0 + x / (m * k)] };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]);
function segDist(p, a, b) { const ab = sub(b, a), t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1); return len(sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t])); }
function nearestOnPolyline(p, pts) { let best = { d: 1e9 }; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], ab = sub(b, a), t = clamp(dot(sub(p, a), ab) / (dot(ab, ab) || 1), 0, 1), q = [a[0] + ab[0] * t, a[1] + ab[1] * t], d = len(sub(p, q)); if (d < best.d) best = { d, q, dir: ab }; } return best; }
function area(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
function inside(p, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
// keep the part of poly where f(p) >= 0 (f is linear)
function clipHalf(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out.length >= 3 ? out : [];
}
const centroid = poly => { const n = poly.length; return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]; };

function analyse() {
  const c = cur, P = projector(c.lat, c.lng);
  const ring = c.parcel?.rings?.[0]; if (!ring) return null;
  let lot = ring.slice(0, -1).map(P.to); if (area(lot) < 0) lot.reverse(); // counter-clockwise
  const home = [0, 0];
  const roads = (c.osm?.roads || []).map(r => ({ name: r.name, pts: r.pts.map(P.to) }));
  const houses = (c.osm?.buildings || []).map(b => b.slice(0, -1).map(P.to)).filter(b => b.length >= 3);
  let house = houses.find(b => inside(home, b)) || houses.filter(b => inside(centroid(b), lot)).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0] || null;
  // front lot lines: parcel edges that run along a street
  const edges = lot.map((a, i) => { const b = lot[(i + 1) % lot.length], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; let best = null; for (const r of roads) { const n = nearestOnPolyline(mid, r.pts); if (!best || n.d < best.d) best = { ...n, road: r }; } return { a, b, i, mid, len: len(sub(b, a)), road: best }; });
  const ang = (u, v) => { const c2 = Math.abs(dot(u, v)) / (len(u) * len(v) || 1); return Math.acos(clamp(c2, 0, 1)) * 180 / Math.PI; };
  const fronts = edges.filter(e => e.len > 3 && e.road && e.road.d < 45 && ang(sub(e.b, e.a), e.road.dir) < 40).sort((x, y) => x.road.d - y.road.d);
  // The geocoder's street-side point sits on the street in front of the address: the lot line facing it is the front.
  const streetPt = c.geo.street ? P.to([c.geo.street[1], c.geo.street[0]]) : null;
  if (streetPt) {
    const facing = edges.filter(e => e.len > 3).map(e => { const d = sub(e.b, e.a), n = [-d[1] / e.len, d[0] / e.len]; return { e, out: -dot(sub(streetPt, e.a), n), dist: segDist(streetPt, e.a, e.b) }; })
      .filter(x => x.out > 0).sort((a, b) => a.dist - b.dist)[0];
    if (facing) { const i = fronts.indexOf(facing.e); if (i > 0) fronts.splice(i, 1); if (i !== 0) fronts.unshift(facing.e); }
  }
  let picked = [];
  if (Array.isArray(c.frontPick)) picked = c.frontPick.map(i => edges[i]).filter(Boolean);
  else for (const e of fronts) {
    if (!picked.length) { picked.push(e); continue; }
    const p0 = picked[0];
    if (picked.length < 2 && e.road && ang(sub(e.b, e.a), sub(p0.b, p0.a)) > 45 && e.road.road !== p0.road?.road) picked.push(e);
  }
  // inward normal of each front edge (lot is CCW, so inward is to the left)
  const fronts2 = picked.map(e => {
    const d = sub(e.b, e.a), L2 = len(d), u = [d[0] / L2, d[1] / L2], nrm = [-u[1], u[0]];
    const sd = p => dot(sub(p, e.a), nrm); // distance into the lot
    // Front wall of the house. With no outline, the address point is about the middle of the
    // house, so the front wall is taken as ~15 ft closer to the street than that point.
    let depth = house ? Math.min(...house.map(sd)) : sd(home) > 6 ? sd(home) - 4.6 : 9.1;
    depth = clamp(depth, 1.5, 60);
    return { e, u, nrm, sd, depth, assumed: !house, road: e.road?.d < 45 ? e.road : null };
  });
  for (const [i, d] of Object.entries(c.override || {})) if (fronts2[i]) { fronts2[i].depth = d; fronts2[i].assumed = false; }
  return { P, lot, house, roads, edges, fronts: fronts2 };
}

// The salesman's corrections (street side, front of house) are kept per address on this device.
const editKey = a => 'gfs-showroom-front:' + String(a).toLowerCase();
function loadEdits(address) { try { const v = JSON.parse(localStorage.getItem(editKey(address)) || 'null'); return v ? { frontPick: v.pick ?? undefined, override: v.override || undefined } : {}; } catch { return {}; } }
function saveEdits() { try { if (Array.isArray(cur.frontPick) || cur.override) localStorage.setItem(editKey(cur.address), JSON.stringify({ pick: cur.frontPick ?? null, override: cur.override || null })); else localStorage.removeItem(editKey(cur.address)); } catch {} }

// ── Drawing ──────────────────────────────────────────────────────
function draw() {
  layers.clearLayers();
  const c = cur, A = analyse(); c.A = A;
  const rule = effectiveRule();
  L.circleMarker([c.lat, c.lng], { radius: 5, color: '#fff', weight: 2, fillColor: '#d9823f', fillOpacity: 1 }).addTo(layers);
  if (!A) { drawFence(null); if (c.parcel === null) map.flyTo([c.lat, c.lng], 19); return; }
  const back = pts => pts.map(A.P.back);
  const poly = (pts, color, opts = {}) => L.polygon(back(pts), { color, weight: 2, fillColor: color, fillOpacity: .28, ...opts }).addTo(layers);
  const label = (pts, html) => L.tooltip({ permanent: true, direction: 'center', className: 'zone-label', interactive: false }).setLatLng(A.P.back(centroid(pts))).setContent(html).addTo(layers);
  const h = v => v == null ? 'Verify' : `${v % 1 ? v.toFixed(1) : v} ft`;
  for (const z of zones(A, rule)) { poly(z.pts, COLORS[z.kind], z.kind === 'no' ? { fillOpacity: .22, dashArray: '6 6' } : {}); label(z.pts, z.label); }
  for (const [i, f] of A.fronts.entries()) {
    // front building line + drag handle
    const a = [f.e.a[0] + f.nrm[0] * f.depth, f.e.a[1] + f.nrm[1] * f.depth], b = [f.e.b[0] + f.nrm[0] * f.depth, f.e.b[1] + f.nrm[1] * f.depth];
    L.polyline(back([a, b]), { color: '#d9823f', weight: 3, dashArray: '8 7' }).addTo(layers);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m = L.marker(A.P.back(mid), { draggable: true, icon: L.divIcon({ className: '', html: '<div class="handle"></div>', iconSize: [26, 26] }), title: 'Drag to the front of the house' }).addTo(layers);
    m.on('drag', ev => { const ll = ev.target.getLatLng(), p = A.P.to([ll.lng, ll.lat]); f.depth = clamp(f.sd(p), 1, 80); cur.override = cur.override || {}; cur.override[i] = f.depth; });
    m.on('dragend', () => { saveEdits(); draw(); renderCard(); });
    m.bindTooltip('Front of the house', { direction: 'top', offset: [0, -14], className: 'zone-label' });
  }
  if (cur.picking) {
    const on = new Set(A.fronts.map(f => f.e.i));
    for (const e of A.edges) {
      const sel = on.has(e.i);
      L.polyline(back([e.a, e.b]), { color: sel ? '#d9823f' : '#ffffff', weight: sel ? 9 : 6, opacity: sel ? 1 : .8, dashArray: sel ? null : '2 10', lineCap: 'round' }).addTo(layers);
      L.polyline(back([e.a, e.b]), { color: '#000', weight: 34, opacity: 0, interactive: true })
        .on('click', () => { const s = new Set(on); s.has(e.i) ? s.delete(e.i) : s.add(e.i); cur.frontPick = [...s]; cur.override = undefined; saveEdits(); draw(); renderCard(); })
        .addTo(layers);
    }
  }
  drawFence(A);
  if (A.house) L.polygon(back(A.house), { color: '#0b1622', weight: 1, fillColor: '#0b1622', fillOpacity: .55 }).addTo(layers);
  L.polygon(back(A.lot), { color: '#fff', weight: 3, fill: false, dashArray: '2 7', lineCap: 'round' }).addTo(layers);
  L.polygon(back(A.lot), { color: '#8cc7ff', weight: 9, opacity: .25, fill: false }).addTo(layers);
  if (draw.fitted !== cur) { map.flyToBounds(L.polygon(back(A.lot)).getBounds().pad(.35), { duration: 1.2, maxZoom: 20.5 }); draw.fitted = cur; }
}
// Yard zones in local metres: [{kind:'front'|'side'|'no'|'unknown', pts, label, text}]
function zones(A, rule) {
  const out = [], h = v => v == null ? 'Verify' : `${v % 1 ? v.toFixed(1) : v} ft`;
  let rear = A.lot; for (const f of A.fronts) rear = rear.length ? clipHalf(rear, p => f.sd(p) - f.depth) : rear;
  if (rear.length) out.push({ kind: rule?.side == null ? 'unknown' : 'side', pts: rear, label: `Side &amp; rear<span class="mono">max ${h(rule?.side)}</span>`, text: ['SIDE & REAR', `max ${h(rule?.side)}`] });
  for (const [i, f] of A.fronts.entries()) {
    const front = clipHalf(A.lot, p => f.depth - f.sd(p));
    if (front.length) out.push({ kind: rule?.front == null ? 'unknown' : 'front', pts: front, label: `${i ? 'Second front' : 'Front yard'}<span class="mono">max ${h(rule?.front)}</span>`, text: [i ? 'SECOND FRONT' : 'FRONT YARD', `max ${h(rule?.front)}`] });
    // street right-of-way: between the front lot line and the street
    if (f.road && f.road.d > 1.5) {
      const qa = nearestOnPolyline(f.e.a, f.road.road.pts).q, qb = nearestOnPolyline(f.e.b, f.road.road.pts).q;
      out.push({ kind: 'no', pts: [f.e.a, f.e.b, qb, qa], label: 'No fence<span class="mono">street right-of-way</span>', text: ['NO FENCE', 'right-of-way'] });
    }
  }
  // corner clear-vision triangle
  if (rule?.sight && A.fronts.length >= 2) {
    const [f1, f2] = A.fronts, corner = [f1.e.a, f1.e.b].flatMap(p => [f2.e.a, f2.e.b].map(q => ({ p, d: len(sub(p, q)) }))).sort((x, y) => x.d - y.d)[0].p;
    const leg = rule.sight.ft * FT, dir = (f, p) => { const o = len(sub(f.e.a, p)) < len(sub(f.e.b, p)) ? f.e.b : f.e.a, v = sub(o, p), l = len(v); return [p[0] + v[0] / l * leg, p[1] + v[1] / l * leg]; };
    out.push({ kind: 'no', sight: true, pts: [corner, dir(f1, corner), dir(f2, corner)], label: `Clear vision<span class="mono">max ${rule.sight.max} ft</span>`, text: ['CLEAR VISION', `max ${rule.sight.max} ft`] });
  }
  return out;
}

// ── Drawing the fence ───────────────────────────────────────────
// Kept in lat/lng in the ballpark tool's format so the 3D viewer and the Executive App can read it.
const blankFence = () => ({ runs: [[]], gates: [] });
const fenceHeight = n => { const m = String(n || '').match(/(\d+(?:\.\d)?)\s*(?:ft|'|’)/i); return m ? +m[1] : null; };
function restoreFence(address) {
  const v = visit.get();
  let model = v.fence?.model || null;
  if (!model) try { model = JSON.parse(localStorage.getItem('gfs-showroom-ar') || 'null')?.model || null; } catch {}
  if (v.address === address && v.fence?.geometry?.lines?.length) {
    const g = v.fence.geometry;
    return { fence: { runs: g.lines.map(r => r.map(p => ({ lat: p.lat, lng: p.lng }))), gates: (g.gates || []).map(x => ({ ...x })) }, fenceModel: model };
  }
  return { fence: blankFence(), fenceModel: model };
}
const fenceEmpty = (f = cur?.fence) => !f || !f.runs.some(r => r.length > 1);
export function fenceGeometry(f = cur.fence) { return { lines: f.runs.filter(r => r.length > 1).map(r => r.map(p => ({ lat: p.lat, lng: p.lng }))), gates: f.gates.map(g => ({ lat: g.lat, lng: g.lng, type: g.type })) }; }
function fenceStats() {
  const P = projector(cur.lat, cur.lng), segs = [];
  for (const [ri, r] of cur.fence.runs.entries()) for (let i = 1; i < r.length; i++) {
    const a = P.to([r[i - 1].lng, r[i - 1].lat]), b = P.to([r[i].lng, r[i].lat]);
    segs.push({ ri, i, a, b, ft: len(sub(b, a)) / FT });
  }
  const ft = segs.reduce((s, x) => s + x.ft, 0);
  return { P, segs, ft, walk: cur.fence.gates.filter(g => g.type === 'walk').length, drive: cur.fence.gates.filter(g => g.type === 'drive').length };
}
// Where each piece of fence sits: 'front' (front yard), 'row' (past the front lot line), 'ok'.
function placeOf(p, A) {
  if (!A) return 'ok';
  for (const f of A.fronts) { const d = f.sd(p), along = dot(sub(p, f.e.a), f.u); if (along > -1 && along < f.e.len + 1) { if (d < -0.3) return 'row'; if (d < f.depth - 0.3) return 'front'; } }
  return 'ok';
}
function fenceIssues(A, rule) {
  if (fenceEmpty() || !A) return [];
  const st = fenceStats(), hgt = fenceHeight(cur.fenceModel), out = new Set();
  for (const s of st.segs) for (const t of [.1, .5, .9]) {
    const p = [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t], k = placeOf(p, A);
    if (k === 'row') out.add('Part of the fence is past the front property line, in the street right-of-way. Fences are not allowed there.');
    if (k === 'front' && hgt && rule?.front != null && hgt > rule.front) out.add(`Part of the fence is in the front yard, where the limit is ${rule.front} ft. This style is ${hgt} ft. Move that part behind the front of the house or pick a shorter style.`);
  }
  return [...out];
}
function segBad(s, A, rule) {
  const hgt = fenceHeight(cur.fenceModel), p = [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2], k = placeOf(p, A);
  return k === 'row' || (k === 'front' && hgt && rule?.front != null && hgt > rule.front);
}
function drawFence(A) {
  const f = cur.fence; if (!f) return;
  const st = fenceStats(), rule = effectiveRule();
  for (const s of st.segs) {
    const ll = [st.P.back(s.a), st.P.back(s.b)], bad = segBad(s, A, rule);
    L.polyline(ll, { color: '#06101a', weight: 11, opacity: .55, interactive: false }).addTo(layers);
    L.polyline(ll, { color: bad ? COLORS.no : '#d9823f', weight: 6, interactive: false, lineCap: 'round' }).addTo(layers);
    if (s.ft >= 3) L.tooltip({ permanent: true, direction: 'center', className: 'seg-label', interactive: false }).setLatLng(st.P.back([(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2])).setContent(`${Math.round(s.ft)}′`).addTo(layers);
  }
  for (const [ri, r] of f.runs.entries()) for (const [i, p] of r.entries()) {
    const last = ri === f.runs.length - 1 && i === r.length - 1;
    const m = L.marker([p.lat, p.lng], { draggable: !!cur.drawing, icon: L.divIcon({ className: '', html: `<div class="vtx${last && cur.drawing ? ' last' : ''}"></div>`, iconSize: [18, 18] }), keyboard: false }).addTo(layers);
    m.on('drag', e => { const ll = e.target.getLatLng(); p.lat = ll.lat; p.lng = ll.lng; });
    m.on('dragend', () => { saveFence(); draw(); renderCard(); });
  }
  for (const g of f.gates) {
    const m = L.marker([g.lat, g.lng], { icon: L.divIcon({ className: '', html: `<div class="gate-pin ${g.type}">${g.type === 'drive' ? 'DRIVE' : 'WALK'}</div>`, iconSize: [54, 22], iconAnchor: [27, 34] }), keyboard: false }).addTo(layers);
    m.on('click', () => { if (!cur.drawing) return; f.gates = f.gates.filter(x => x !== g); saveFence(); draw(); renderCard(); });
  }
}
function onMapClick(e) {
  if (!cur?.drawing) return;
  const ll = { lat: e.latlng.lat, lng: e.latlng.lng };
  if (cur.gateMode) {
    const st = fenceStats(), p = st.P.to([ll.lng, ll.lat]);
    let best = null; for (const s of st.segs) { const n = nearestOnPolyline(p, [s.a, s.b]); if (!best || n.d < best.d) best = { ...n, s }; }
    if (!best || best.d > 4) { toast('Tap on the fence line to put the gate there.'); return; }
    const at = st.P.back(best.q); cur.fence.gates.push({ lat: at[0], lng: at[1], type: cur.gateMode });
    cur.gateMode = null;
  } else cur.fence.runs.at(-1).push(ll);
  saveFence(); draw(); renderCard();
}
function saveFence() {
  visit.setFence(fenceEmpty() ? null : { geometry: fenceGeometry(), model: cur.fenceModel, ft: Math.round(fenceStats().ft), address: cur.address });
}
function setDrawing(on) {
  cur.drawing = on; cur.gateMode = null;
  if (on) { cur.picking = false; map.doubleClickZoom.disable(); $('.p-card', root).classList.add('drawing'); }
  else { map.doubleClickZoom.enable(); $('.p-card', root).classList.remove('drawing'); const r = cur.fence.runs; if (r.length > 1 && r.at(-1).length < 2) r.pop(); for (const x of r) if (x.length === 1) x.length = 0; cur.fence.runs = r.filter(x => x.length) ; if (!cur.fence.runs.length) cur.fence.runs = [[]]; saveFence(); }
  draw(); renderCard();
}
function fenceHTML(A, rule) {
  if (!cur.parcel && !cur.lat) return '';
  const empty = fenceEmpty(), st = fenceStats();
  const opts = D.styles.map(s => `<optgroup label="${esc(s.name)}">${s.models.map(m => `<option ${m === cur.fenceModel ? 'selected' : ''}>${esc(m)}</option>`).join('')}</optgroup>`).join('');
  const sum = empty ? '' : `<div class="fence-sum"><b class="mono">${Math.round(st.ft)} ft</b><span>${st.walk ? `${st.walk} walk gate${st.walk > 1 ? 's' : ''}` : ''}${st.walk && st.drive ? ' · ' : ''}${st.drive ? `${st.drive} drive gate${st.drive > 1 ? 's' : ''}` : ''}${!st.walk && !st.drive ? 'No gates' : ''}</span></div>`;
  const issues = fenceIssues(A, rule).map(x => `<p class="warnline">${esc(x)}</p>`).join('');
  const style = `<label class="chip fence-style">Style <select data-fmodel><option value="">Pick a style…</option>${opts}</select></label>`;
  if (!cur.drawing) return `<div class="fence-box">${sum}${empty ? '' : style}${issues}<div class="where"><button class="btn sm ${empty ? 'primary' : ''}" data-draw>${icons.pen} ${empty ? 'Draw the fence' : 'Edit fence'}</button>${empty ? '' : `<button class="btn sm primary" data-3d>${icons.cube} See it in 3D</button><button class="btn sm" data-packet>${icons.blueprint} Permit packet</button>`}</div></div>`;
  return `<div class="fence-box on">
    <p class="warnline" style="color:var(--copper-lt)">${cur.gateMode ? `Tap the fence line where the ${cur.gateMode} gate goes.` : empty && !cur.fence.runs.at(-1).length ? 'Tap the map where the first post goes.' : empty ? 'Now tap where the next corner post goes.' : 'Keep tapping to add corner posts, or add a gate. Drag a post to move it.'}</p>
    ${sum}${style}${issues}
    <div class="where tools-row">
      <button class="btn sm" data-undo>Undo</button>
      <button class="btn sm" data-run>New run</button>
      <button class="btn sm ${cur.gateMode === 'walk' ? 'primary' : ''}" data-gate="walk">+ Walk gate</button>
      <button class="btn sm ${cur.gateMode === 'drive' ? 'primary' : ''}" data-gate="drive">+ Drive gate</button>
      <button class="btn sm ghost" data-clear>Clear</button>
      <button class="btn sm primary" data-done>Done</button>
    </div></div>`;
}
function bindFence(el) {
  const on = (s, f) => { const b = $(s, el); if (b) b.onclick = f; };
  on('[data-draw]', () => setDrawing(true));
  on('[data-done]', () => setDrawing(false));
  on('[data-undo]', () => { if (fenceEmpty() && !cur.fence.runs.at(-1).length) return toast('Nothing to undo yet.'); const r = cur.fence.runs; if (!r.at(-1).length && r.length > 1) r.pop(); else if (r.at(-1).length) r.at(-1).pop(); else cur.fence.gates.pop(); saveFence(); draw(); renderCard(); });
  on('[data-run]', () => { if (cur.fence.runs.at(-1).length < 2) return toast('Put down at least two posts first. A new run starts a separate line of fence.'); cur.fence.runs.push([]); renderCard(); toast('Tap to start the next run.'); });
  on('[data-clear]', () => { if (fenceEmpty() && !cur.fence.runs.at(-1).length) return toast('Nothing to clear yet.'); cur.fence = blankFence(); saveFence(); draw(); renderCard(); });
  for (const b of $$('[data-gate]', el)) b.onclick = () => { if (fenceEmpty()) return toast('Tap at least two posts to make a line of fence first, then add the gate on it.'); cur.gateMode = cur.gateMode === b.dataset.gate ? null : b.dataset.gate; renderCard(); };
  const sel = $('[data-fmodel]', el); if (sel) sel.onchange = () => { cur.fenceModel = sel.value || null; saveFence(); draw(); renderCard(); };
  on('[data-3d]', () => { if (!cur.fenceModel) { toast('Pick a style first.'); return; } app.go('ar', { geometry: fenceGeometry(), model: cur.fenceModel }); });
  on('[data-packet]', async () => {
    const { openSitePlan } = await import('./siteplan.mjs');
    openSitePlan(app, packetData());
  });
}
// Everything the permit packet needs, in local metres (y up) plus the text.
function packetData() {
  const A = cur.A, rule = effectiveRule(), st = fenceStats();
  return {
    address: cur.address, town: cur.town, state: stateOf(cur), rule, ruleInfo: cur.rule,
    lot: A?.lot || null, house: A?.house || null, zones: A ? zones(A, rule) : [],
    roads: (A?.roads || []).filter(r => r.name), frontLines: (A?.fronts || []).map(f => [[f.e.a[0] + f.nrm[0] * f.depth, f.e.a[1] + f.nrm[1] * f.depth], [f.e.b[0] + f.nrm[0] * f.depth, f.e.b[1] + f.nrm[1] * f.depth]]),
    segs: st.segs.map(s => ({ a: s.a, b: s.b, ft: s.ft, bad: segBad(s, A, rule) })), ft: st.ft,
    gates: cur.fence.gates.map(g => ({ type: g.type, p: st.P.to([g.lng, g.lat]) })),
    model: cur.fenceModel, height: fenceHeight(cur.fenceModel), issues: fenceIssues(A, rule),
    dig: D.dig[stateOf(cur)] || '', source: cur.rule ? `${cur.rule.source} · checked ${D.rulesChecked}` : ''
  };
}
// ── Rules & card ─────────────────────────────────────────────────
function effectiveRule() {
  const r = cur.rule ? { ...cur.rule } : null, ai = cur.aiRule;
  if (cur.useAI && ai) return { ...(r || {}), front: ai.frontMaxFt, side: ai.sideMaxFt ?? ai.rearMaxFt, rear: ai.rearMaxFt ?? ai.sideMaxFt, sight: r?.sight, fromAI: true };
  return r;
}
function card(html) { const c = $('.p-card', root); c.hidden = false; c.innerHTML = html; c.classList.remove('min'); }

function renderCard() {
  const c = cur, r = effectiveRule(), st = stateOf(c), A = c.A;
  const h = v => v == null ? '—' : `${v % 1 ? v.toFixed(1) : v} ft`;
  const opts = D.rules.map(x => `<option value="${x.id}" ${c.rule?.id === x.id ? 'selected' : ''}>${esc(x.name)}, ${x.state}</option>`).join('');
  const parcelNote = !c.parcel ? `<p class="warnline">No parcel lines for this address from county GIS, so the yard zones aren't drawn. The rules below still apply.</p>`
    : c.picking ? `<p class="warnline" style="color:var(--copper-lt)">Tap each property line that runs along a street (two on a corner lot). Then drag the copper handle to the front wall of the house.</p>`
    : A?.fronts.length === 0 ? `<p class="warnline">Couldn't tell which side faces the street. Tap “Set street side” and tap that property line.</p>`
    : A?.fronts.some(f => f.assumed) ? `<p class="warnline">No house outline on the map. The front-of-house line is estimated from the address point. Drag the copper handle to the front wall of the house.</p>` : '';
  const edited = Array.isArray(c.frontPick) || c.override;
  const tools = c.parcel ? `<div class="where"><button class="btn sm ${c.picking ? 'primary' : ''}" data-pick>${c.picking ? 'Done' : 'Set street side'}</button>${edited ? '<button class="btn sm ghost" data-auto>Back to automatic</button>' : ''}<span class="src" style="align-self:center">${edited ? 'Your changes are saved for this address' : 'Automatic'}</span></div>` : '';
  card(`
    <div class="row" style="align-items:start"><div><div class="eyebrow">${icons.pin.replace('<svg', '<svg width="12" height="12" style="vertical-align:-1px"')} ${esc((c.town || 'Unknown town').toUpperCase())}</div><h2>${esc(c.address)}</h2></div>
      <button class="iconbtn" data-min aria-label="Collapse">${icons.layers}</button></div>
    <div class="where"><label class="chip" style="padding-right:4px">Rules for <select data-town style="background:none;border:0;color:#fff;font:inherit;font-weight:700;max-width:180px"><option value="">Other town</option>${opts}</select></label>${r?.fromAI ? '<span class="chip on">AI numbers on map</span>' : r ? '<span class="chip on">GFS verified</span>' : ''}</div>
    ${parcelNote}${c.drawing ? '' : tools}
    ${fenceHTML(A, r)}
    <div class="legend">
      <div><i style="background:${COLORS.front}"></i><span><b>${h(r?.front)}</b><small>Front yard</small></span></div>
      <div><i style="background:${COLORS.side}"></i><span><b>${h(r?.side)}</b><small>Side yard</small></span></div>
      <div><i style="background:${COLORS.side}"></i><span><b>${h(r?.rear)}</b><small>Rear yard</small></span></div>
      <div><i style="background:${COLORS.no}"></i><span><b>None</b><small>Right-of-way${r?.sight ? ` · ${r.sight.ft} ft corner` : ''}</small></span></div>
    </div>
    ${c.rule ? `<div><b>Permit:</b> ${esc(c.rule.permit)}</div><ul class="notes">${c.rule.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p style="margin:0;color:var(--dim)">GFS hasn\'t verified this town\'s fence rules yet.</p>'}
    <div class="kv" style="grid-template-columns:auto 1fr">
      ${st ? `<dt>Call before digging</dt><dd style="font-family:var(--font);text-align:left">${esc(D.dig[st] || '')}</dd>` : ''}
      ${c.rule?.frost ? `<dt>Frost depth</dt><dd style="text-align:left">${esc(c.rule.frost)}</dd>` : ''}
    </div>
    ${c.rule ? `<div class="src">${esc(c.rule.source)} · checked ${esc(D.rulesChecked)} · A summary, not legal advice. The zoning office has the final word, and GFS pulls the permit.</div>` : ''}
    <div class="ai" id="aiBox">${aiHTML()}</div>`);
  const el = $('.p-card', root);
  $('[data-min]', el).onclick = () => el.classList.toggle('min');
  const pick = $('[data-pick]', el); if (pick) pick.onclick = () => { cur.picking = !cur.picking; cur.drawing = false; if (cur.picking && !Array.isArray(cur.frontPick)) cur.frontPick = (cur.A?.fronts || []).map(f => f.e.i); if (!cur.picking) saveEdits(); draw(); renderCard(); };
  const auto = $('[data-auto]', el); if (auto) auto.onclick = () => { cur.frontPick = undefined; cur.override = undefined; cur.picking = false; saveEdits(); draw(); renderCard(); };
  $('[data-town]', el).onchange = e => { cur.rule = D.rules.find(x => x.id === e.target.value) || null; cur.useAI = false; draw(); renderCard(); };
  bindFence(el);
  bindAI();
}

function aiHTML() {
  const a = cur.ai;
  if (!a) return `<h3>${icons.spark} AI rule check</h3><p style="margin:0;color:var(--dim);font-size:14px">Search this town's current fence code and cite the sources.</p><button class="btn sm" data-ai>${icons.spark} ${cur.rule?.front != null ? 'Double-check with AI' : 'Find the rules with AI'}</button>`;
  if (a.loading) return `<h3>${icons.spark} AI rule check</h3><div class="think"><i></i><i></i><i></i> Reading ${esc(cur.town || 'the town')}'s fence code…</div>`;
  if (a.error) return `<h3>${icons.spark} AI rule check</h3><p class="warnline" style="margin:0">${esc(a.error)}</p><button class="btn sm" data-ai>Try again</button>`;
  const h = v => v == null ? '—' : `${v} ft`;
  return `<h3>${icons.spark} AI found · ${esc(a.jurisdiction || cur.town)} <span class="mono" style="font-size:11px;color:var(--mute);margin-left:auto">${esc(a.confidence.toUpperCase())} CONFIDENCE</span></h3>
    <div class="legend"><div><span><b>${h(a.frontMaxFt)}</b><small>Front</small></span></div><div><span><b>${h(a.sideMaxFt)}</b><small>Side</small></span></div><div><span><b>${h(a.rearMaxFt)}</b><small>Rear</small></span></div></div>
    ${a.permitNote ? `<div><b>Permit:</b> ${esc(a.permitRequired === 'yes' ? 'Required. ' : a.permitRequired === 'no' ? 'Not required. ' : '')}${esc(a.permitNote)}</div>` : ''}
    <ul class="notes">${[a.cornerLot, a.sightTriangle, a.setback, a.materials, ...a.notes].filter(Boolean).map(n => `<li>${esc(n)}</li>`).join('')}</ul>
    ${a.office || a.phone ? `<div style="font-size:14px;color:var(--dim)">${esc(a.office)} ${esc(a.phone)}</div>` : ''}
    <div class="src">${a.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a>`).join('<br>')}</div>
    <div class="src">AI lookup ${esc(a.checked)}. Confirm with the zoning office before quoting heights.</div>
    ${(a.frontMaxFt ?? a.sideMaxFt ?? a.rearMaxFt) != null ? `<button class="btn sm ${cur.useAI ? '' : 'blue'}" data-useai>${cur.useAI ? 'Show GFS verified numbers' : 'Put these numbers on the map'}</button>` : ''}`;
}
function bindAI() {
  const box = $('#aiBox', root); if (!box) return;
  box.onclick = e => {
    if (e.target.closest('[data-ai]')) askAI(true);
    if (e.target.closest('[data-useai]')) { cur.useAI = !cur.useAI; draw(); renderCard(); }
  };
}

async function askAI(force) {
  const c = cur, key = `${c.town}|${stateOf(c)}`;
  if (!force && aiCache.has(key)) { c.ai = aiCache.get(key); if (c.rule?.front == null) c.useAI = true; draw(); renderCard(); return; }
  c.ai = { loading: true }; const box = $('#aiBox', root); if (box) box.innerHTML = aiHTML();
  try {
    if (!navigator.onLine) throw Error('The AI lookup needs a connection.');
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 62000);
    const res = await fetch('/.netlify/functions/showroom-ai', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: c.address, town: c.town, county: c.place?.county || c.geo.county || '', state: stateOf(c) }) });
    clearTimeout(t);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(j.error === 'not-configured' || res.status === 404 ? 'The AI lookup isn’t switched on yet. It needs an Anthropic API key added in Netlify.' : j.message || 'The AI lookup failed.');
    if (cur !== c) return;
    c.ai = j; aiCache.set(key, j);
    if (c.rule?.front == null && (j.frontMaxFt ?? j.sideMaxFt) != null) c.useAI = true;
    draw(); renderCard();
  } catch (e) {
    if (cur !== c) return;
    c.ai = { error: e.name === 'AbortError' ? 'The lookup took too long. Try again.' : e.message };
    const b = $('#aiBox', root); if (b) { b.innerHTML = aiHTML(); bindAI(); }
  }
}

// A town picked from search (no address): show its rules only.
function townOnly(r) {
  $('.p-empty', root).hidden = true; layers.clearLayers();
  cur = { lat: 0, lng: 0, address: `${r.name}, ${r.state}`, geo: { state: r.state }, rule: r, town: r.name, parcel: null, A: null };
  renderCard();
  const w = $('.warnline', root); if (w) w.textContent = 'Enter an address to see the lot and where each height applies.';
}
