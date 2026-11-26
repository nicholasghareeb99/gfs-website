// Permit map: type an address, see the lot from above with where a fence may go
// and how tall. Parcel lines come from county GIS (same sources as the website's
// ballpark tool), the house and streets from OpenStreetMap, the rules from GFS's
// verified research, and an AI lookup for towns we haven't verified yet.
import { $, $$, esc, clamp, icons, toast } from './ui.mjs';

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
  bindSearch();
}

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
        const r = await (await fetch(u)).json(); if (my !== seq) return;
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

async function lookupText(text, magicKey) {
  try {
    const u = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
    Object.entries({ f: 'json', SingleLine: text, maxLocations: 1, outFields: 'Match_addr,City,Subregion,Region,RegionAbbr,Postal', location: '-83.58,41.66', ...(magicKey ? { magicKey } : {}) }).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await (await fetch(u)).json(), c = r.candidates?.[0];
    if (!c) return toast('That address was not found.');
    lookupPoint(c.location.y, c.location.x, c.attributes.Match_addr || text, { city: c.attributes.City, county: c.attributes.Subregion, state: c.attributes.RegionAbbr });
  } catch { toast(navigator.onLine ? 'Address search failed. Try again.' : 'Address search needs a connection.'); }
}

// ── Lookup ───────────────────────────────────────────────────────
async function lookupPoint(lat, lng, address, geo = {}) {
  $('.p-empty', root).hidden = true;
  layers.clearLayers(); cur = { lat, lng, address, geo, aiRule: null };
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
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } });
    return (await r.json()).address || {};
  } catch { return {}; }
}
async function overpass(lat, lng) {
  const q = `[out:json][timeout:12];(way(around:70,${lat},${lng})[building];way(around:120,${lat},${lng})[highway~"^(residential|tertiary|secondary|primary|unclassified|living_street|trunk|service)$"];);out geom;`;
  for (const host of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
      const r = await fetch(host, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctl.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); clearTimeout(t);
      const j = await r.json();
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
  const fronts = edges.filter(e => e.len > 4 && e.road && e.road.d < 35 && ang(sub(e.b, e.a), e.road.dir) < 35).sort((x, y) => x.road.d - y.road.d);
  const picked = [];
  for (const e of fronts) {
    if (!picked.length) { picked.push(e); continue; }
    const p0 = picked[0];
    if (picked.length < 2 && ang(sub(e.b, e.a), sub(p0.b, p0.a)) > 45 && e.road.road !== p0.road.road) picked.push(e);
    // merge collinear pieces of the same frontage
    else if (ang(sub(e.b, e.a), sub(p0.b, p0.a)) < 12 && e.road.road === p0.road.road) p0.extra = (p0.extra || []).concat(e);
  }
  // inward normal of each front edge (lot is CCW, so inward is to the left)
  const fronts2 = picked.map(e => {
    const d = sub(e.b, e.a), L2 = len(d), u = [d[0] / L2, d[1] / L2], nrm = [-u[1], u[0]];
    const sd = p => dot(sub(p, e.a), nrm); // distance into the lot
    let depth = house ? Math.min(...house.map(sd)) : 9.1; // front wall of the house, else assume 30 ft
    depth = clamp(depth, 1.5, 60);
    return { e, u, nrm, sd, depth, assumed: !house, road: e.road };
  });
  for (const [i, d] of Object.entries(c.override || {})) if (fronts2[i]) { fronts2[i].depth = d; fronts2[i].assumed = false; }
  return { P, lot, house, roads, fronts: fronts2 };
}

// ── Drawing ──────────────────────────────────────────────────────
function draw() {
  layers.clearLayers();
  const c = cur, A = analyse(); c.A = A;
  const rule = effectiveRule();
  L.circleMarker([c.lat, c.lng], { radius: 5, color: '#fff', weight: 2, fillColor: '#d9823f', fillOpacity: 1 }).addTo(layers);
  if (!A) { if (c.parcel === null) map.flyTo([c.lat, c.lng], 19); return; }
  const back = pts => pts.map(A.P.back);
  const poly = (pts, color, opts = {}) => L.polygon(back(pts), { color, weight: 2, fillColor: color, fillOpacity: .28, ...opts }).addTo(layers);
  const label = (pts, html) => L.tooltip({ permanent: true, direction: 'center', className: 'zone-label', interactive: false }).setLatLng(A.P.back(centroid(pts))).setContent(html).addTo(layers);
  const h = v => v == null ? 'Verify' : `${v % 1 ? v.toFixed(1) : v} ft`;
  // side & rear: lot behind every front building line
  let rear = A.lot; for (const f of A.fronts) rear = rear.length ? clipHalf(rear, p => f.sd(p) - f.depth) : rear;
  if (rear.length) { poly(rear, rule?.side == null ? COLORS.unknown : COLORS.side); label(rear, `Side &amp; rear<span class="mono">max ${h(rule?.side)}</span>`); }
  for (const [i, f] of A.fronts.entries()) {
    const front = clipHalf(A.lot, p => f.depth - f.sd(p));
    if (front.length) { poly(front, rule?.front == null ? COLORS.unknown : COLORS.front); label(front, `${i ? 'Second front' : 'Front yard'}<span class="mono">max ${h(rule?.front)}</span>`); }
    // street right-of-way: between the front lot line and the street
    if (f.road && f.road.d > 1.5) {
      const qa = nearestOnPolyline(f.e.a, f.road.road.pts).q, qb = nearestOnPolyline(f.e.b, f.road.road.pts).q;
      const row = [f.e.a, f.e.b, qb, qa];
      poly(row, COLORS.no, { fillOpacity: .22, dashArray: '6 6' }); label(row, 'No fence<span class="mono">street right-of-way</span>');
    }
    // front building line + drag handle
    const a = [f.e.a[0] + f.nrm[0] * f.depth, f.e.a[1] + f.nrm[1] * f.depth], b = [f.e.b[0] + f.nrm[0] * f.depth, f.e.b[1] + f.nrm[1] * f.depth];
    L.polyline(back([a, b]), { color: '#d9823f', weight: 3, dashArray: '8 7' }).addTo(layers);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m = L.marker(A.P.back(mid), { draggable: true, icon: L.divIcon({ className: '', html: '<div class="handle"></div>', iconSize: [26, 26] }), title: 'Drag to the front of the house' }).addTo(layers);
    m.on('drag', ev => { const ll = ev.target.getLatLng(), p = A.P.to([ll.lng, ll.lat]); f.depth = clamp(f.sd(p), 1, 80); cur.override = cur.override || {}; cur.override[i] = f.depth; });
    m.on('dragend', () => { draw(); renderCard(); });
  }
  // corner clear-vision triangle
  if (rule?.sight && A.fronts.length >= 2) {
    const [f1, f2] = A.fronts, corner = [f1.e.a, f1.e.b].flatMap(p => [f2.e.a, f2.e.b].map(q => ({ p, d: len(sub(p, q)) }))).sort((x, y) => x.d - y.d)[0].p;
    const leg = rule.sight.ft * FT, dir = (f, p) => { const o = len(sub(f.e.a, p)) < len(sub(f.e.b, p)) ? f.e.b : f.e.a, v = sub(o, p), l = len(v); return [p[0] + v[0] / l * leg, p[1] + v[1] / l * leg]; };
    const tri = [corner, dir(f1, corner), dir(f2, corner)];
    poly(tri, COLORS.no, { fillOpacity: .45 }); label(tri, `Clear vision<span class="mono">max ${rule.sight.max} ft</span>`);
  }
  if (A.house) L.polygon(back(A.house), { color: '#0b1622', weight: 1, fillColor: '#0b1622', fillOpacity: .55 }).addTo(layers);
  L.polygon(back(A.lot), { color: '#fff', weight: 3, fill: false, dashArray: '2 7', lineCap: 'round' }).addTo(layers);
  L.polygon(back(A.lot), { color: '#8cc7ff', weight: 9, opacity: .25, fill: false }).addTo(layers);
  if (draw.fitted !== cur) { map.flyToBounds(L.polygon(back(A.lot)).getBounds().pad(.35), { duration: 1.2, maxZoom: 20.5 }); draw.fitted = cur; }
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
  const parcelNote = !c.parcel ? `<p class="warnline">No parcel lines for this address from county GIS, so the yard zones aren't drawn. The rules below still apply.</p>` : A?.fronts.length === 0 ? `<p class="warnline">Couldn't tell which side faces the street. Zones show the whole lot as side/rear.</p>` : A?.fronts.some(f => f.assumed) ? `<p class="warnline">No house outline found. The front building line is set 30 ft back. Drag the copper handle to the front of the house.</p>` : '';
  card(`
    <div class="row" style="align-items:start"><div><div class="eyebrow">${icons.pin.replace('<svg', '<svg width="12" height="12" style="vertical-align:-1px"')} ${esc((c.town || 'Unknown town').toUpperCase())}</div><h2>${esc(c.address)}</h2></div>
      <button class="iconbtn" data-min aria-label="Collapse">${icons.layers}</button></div>
    <div class="where"><label class="chip" style="padding-right:4px">Rules for <select data-town style="background:none;border:0;color:#fff;font:inherit;font-weight:700;max-width:180px"><option value="">Other town</option>${opts}</select></label>${r?.fromAI ? '<span class="chip on">AI numbers on map</span>' : r ? '<span class="chip on">GFS verified</span>' : ''}</div>
    ${parcelNote}
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
  $('[data-town]', el).onchange = e => { cur.rule = D.rules.find(x => x.id === e.target.value) || null; cur.useAI = false; draw(); renderCard(); };
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
