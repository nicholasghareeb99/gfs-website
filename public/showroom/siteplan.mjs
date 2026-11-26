// Permit packet: a branded fence site plan drawn from the permit map — the lot, the
// house, the street, the yard zones, the fence with each run's length, the gates,
// a north arrow and a scale bar, with the town's rules and a GFS title block.
// Drawn on a canvas at letter size (11 × 8.5 in at 200 dpi) and shared as a PNG.
import { $, esc, icons, toast } from './ui.mjs';
import { zoomable } from './blueprint.mjs';

const W = 2200, H = 1700, M = 50, COL = 560;
const INK = '#14202c', DIM = '#5b6a78', COPPER = '#c56f2c', LINE = '#c9d2db';
const FILL = { front: 'rgba(242,180,65,.30)', side: 'rgba(62,207,142,.26)', unknown: 'rgba(140,199,255,.32)', no: 'rgba(239,91,91,.20)' };
const EDGE = { front: '#d39a22', side: '#2fa874', unknown: '#5a9fe0', no: '#d64545' };
const F = { disp: "Archivo, 'Source Sans 3', sans-serif", body: "'Source Sans 3', sans-serif", mono: "'IBM Plex Mono', monospace" };
const FT = 0.3048;
const fmt = v => v == null ? 'Verify' : `${v % 1 ? v.toFixed(1) : v} ft`;
const today = () => new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'long', day: 'numeric', year: 'numeric' });

let logoImg = null;
function loadLogo() {
  logoImg ||= new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = '/assets/img/performance-v12/ghareeb-logo-396.webp'; });
  return logoImg;
}

export async function drawSitePlan(d) {
  await Promise.all([document.fonts?.ready, loadLogo()]);
  const logo = await loadLogo();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(M / 2, M / 2, W - M, H - M);

  // ── plan area ──
  const px0 = M, py0 = M, pw = W - COL - M * 2, ph = H - M * 2;
  const pts = [...(d.lot || []), ...d.segs.flatMap(s => [s.a, s.b]), ...d.gates.map(x => x.p), ...d.zones.flatMap(z => z.pts)];
  if (d.house) pts.push(...d.house);
  if (!pts.length) pts.push([0, 0]);
  let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
  const minSpan = 24; if (x1 - x0 < minSpan) { const c = (x0 + x1) / 2; x0 = c - minSpan / 2; x1 = c + minSpan / 2; } if (y1 - y0 < minSpan) { const c = (y0 + y1) / 2; y0 = c - minSpan / 2; y1 = c + minSpan / 2; }
  const s = Math.min(pw / (x1 - x0), ph / (y1 - y0)) * .8, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const T = p => [px0 + pw / 2 + (p[0] - cx) * s, py0 + ph / 2 - (p[1] - cy) * s];
  const path = (ps, close = true) => { g.beginPath(); ps.forEach((p, i) => { const [x, y] = T(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (close) g.closePath(); };

  g.save(); g.beginPath(); g.rect(px0, py0, pw, ph); g.clip();
  // grid, 10 ft
  g.strokeStyle = '#eef2f5'; g.lineWidth = 1;
  const step = 10 * FT * s; for (let x = px0 + ((pw / 2 - cx * s) % step + step) % step; x < px0 + pw; x += step) { g.beginPath(); g.moveTo(x, py0); g.lineTo(x, py0 + ph); g.stroke(); }
  for (let y = py0 + ((ph / 2 + cy * s) % step + step) % step; y < py0 + ph; y += step) { g.beginPath(); g.moveTo(px0, y); g.lineTo(px0 + pw, y); g.stroke(); }
  // streets
  for (const r of d.roads) { g.strokeStyle = '#d7dde3'; g.lineWidth = Math.max(18, 9 * s); g.lineCap = 'round'; g.lineJoin = 'round'; path(r.pts, false); g.stroke(); }
  // zones
  for (const z of d.zones) {
    path(z.pts); g.fillStyle = FILL[z.kind]; g.fill();
    if (z.kind === 'no') { g.save(); path(z.pts); g.clip(); g.strokeStyle = 'rgba(214,69,69,.45)'; g.lineWidth = 2; for (let k = -H; k < W; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); } g.restore(); }
    g.strokeStyle = EDGE[z.kind]; g.lineWidth = 2; g.setLineDash(z.kind === 'no' ? [10, 8] : []); path(z.pts); g.stroke(); g.setLineDash([]);
  }
  // house
  if (d.house) { path(d.house); g.fillStyle = '#c3ccd5'; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
  // front of house line
  for (const l of d.frontLines) { g.strokeStyle = COPPER; g.lineWidth = 3; g.setLineDash([16, 10]); path(l, false); g.stroke(); g.setLineDash([]); }
  // lot line
  if (d.lot) { g.strokeStyle = INK; g.lineWidth = 4; g.setLineDash([28, 8, 4, 8]); path(d.lot); g.stroke(); g.setLineDash([]); }
  // fence
  for (const sg of d.segs) { g.strokeStyle = sg.bad ? '#d64545' : COPPER; g.lineWidth = 9; g.lineCap = 'round'; path([sg.a, sg.b], false); g.stroke(); }
  const posts = new Map(); for (const sg of d.segs) for (const p of [sg.a, sg.b]) posts.set(p.join(), p);
  for (const p of posts.values()) { const [x, y] = T(p); g.beginPath(); g.arc(x, y, 9, 0, 7); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
  g.restore();

  // labels drawn after the clip so text is never cut
  const tag = (x, y, lines, { bg = 'rgba(255,255,255,.92)', fg = INK, size = 22, font = F.disp, weight = 800, border = null } = {}) => {
    g.font = `${weight} ${size}px ${font}`; const w = Math.max(...lines.map(l => g.measureText(l).width)) + 20, h = lines.length * (size + 6) + 10;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 8); g.fill(); if (border) { g.strokeStyle = border; g.lineWidth = 2; g.stroke(); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => { g.font = `${i ? 600 : weight} ${i ? size - 4 : size}px ${i ? F.mono : font}`; g.fillText(l, x, y - h / 2 + 5 + (size + 6) * (i + .5)); });
  };
  const inPlan = ([x, y]) => x > px0 + 40 && x < px0 + pw - 40 && y > py0 + 30 && y < py0 + ph - 30;
  const mid = ps => { const n = ps.length; return [ps.reduce((a, p) => a + p[0], 0) / n, ps.reduce((a, p) => a + p[1], 0) / n]; };
  for (const z of d.zones) { const c = T(mid(z.pts)); if (inPlan(c)) tag(c[0], c[1], z.text, { size: 21, fg: EDGE[z.kind] === '#2fa874' ? '#1d7a53' : z.kind === 'front' ? '#8a6210' : z.kind === 'no' ? '#a52f2f' : '#2d6fb0' }); }
  if (d.house) { const c = T(mid(d.house)); tag(c[0], c[1], ['HOUSE'], { bg: 'transparent', size: 24 }); }
  for (const r of d.roads) { const p = r.pts[Math.floor(r.pts.length / 2)], c = T(p); if (inPlan(c)) tag(c[0], c[1], [r.name.toUpperCase()], { bg: '#d7dde3', size: 20, fg: DIM }); }
  for (const sg of d.segs) {
    if (sg.ft < 2) continue;
    const a = T(sg.a), b = T(sg.b), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, off = 34;
    tag((a[0] + b[0]) / 2 - dy / l * off, (a[1] + b[1]) / 2 + dx / l * off, [`${Math.round(sg.ft)}′`], { size: 24, font: F.mono, weight: 700, fg: sg.bad ? '#a52f2f' : COPPER, border: sg.bad ? '#d64545' : COPPER });
  }
  // Gate tags sit on the other side of the line from the run lengths, so they never cover them.
  const near = p => { let best = null; for (const sg of d.segs) { const ab = [sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]], L2 = ab[0] * ab[0] + ab[1] * ab[1] || 1, t = Math.max(0, Math.min(1, ((p[0] - sg.a[0]) * ab[0] + (p[1] - sg.a[1]) * ab[1]) / L2)), q = [sg.a[0] + ab[0] * t, sg.a[1] + ab[1] * t], dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || dd < best.dd) best = { dd, sg }; } return best?.sg; };
  for (const gt of d.gates) {
    const [x, y] = T(gt.p), sg = near(gt.p); let ox = 0, oy = -38;
    if (sg) { const a = T(sg.a), b = T(sg.b), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; ox = dy / l * 40; oy = -dx / l * 40; }
    g.beginPath(); g.arc(x, y, 13, 0, 7); g.fillStyle = INK; g.fill(); tag(x + ox, y + oy, [gt.type === 'drive' ? 'DRIVE GATE' : 'WALK GATE'], { bg: INK, fg: '#fff', size: 18 });
  }

  // north arrow
  { const x = px0 + 70, y = py0 + 90; g.fillStyle = INK; g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 22, y + 20); g.lineTo(x, y + 8); g.lineTo(x - 22, y + 20); g.closePath(); g.fill(); g.font = `800 28px ${F.disp}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('N', x, y + 56); }
  // scale bar
  { const opts = [10, 20, 25, 50, 100], ft = opts.find(f => f * FT * s > 160) || 100, wpx = ft * FT * s, x = px0 + 30, y = py0 + ph - 40;
    g.fillStyle = INK; for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fff' : INK; g.fillRect(x + wpx / 4 * i, y, wpx / 4, 12); } g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, y, wpx, 12);
    g.fillStyle = INK; g.font = `600 20px ${F.mono}`; g.textAlign = 'left'; g.fillText('0', x - 4, y - 10); g.textAlign = 'right'; g.fillText(`${ft} ft`, x + wpx + 10, y - 10); g.textAlign = 'left'; g.fillText(`Scale 1″ = ${Math.round(200 / s * 3.2808)} ft on a letter print`, x + wpx + 30, y + 12); }

  // ── title column ──
  const cx0 = W - COL - M / 2, cw = COL;
  g.fillStyle = INK; g.fillRect(cx0, M / 2, 4, H - M);
  let y = M + 10; const L = cx0 + 34, R = cx0 + cw - 30;
  if (logo) { const lw = 230, lh = lw * logo.naturalHeight / logo.naturalWidth; g.drawImage(logo, L, y, lw, lh); y += lh + 16; }
  const text = (t, { size = 22, font = F.body, weight = 500, color = INK, gap = 8 } = {}) => {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'top';
    const words = String(t).split(' '); let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (g.measureText(test).width > R - L && line) { g.fillText(line, L, y); y += size * 1.22; line = w; } else line = test; }
    if (line) { g.fillText(line, L, y); y += size * 1.22; } y += gap;
  };
  const rule = (h = 18) => { g.fillStyle = LINE; g.fillRect(L, y + h / 2, R - L, 2); y += h + 4; };
  const kv = (k, v, { color = INK } = {}) => { g.font = `600 19px ${F.mono}`; g.fillStyle = DIM; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(k.toUpperCase(), L, y + 4); g.font = `800 26px ${F.disp}`; g.fillStyle = color; g.textAlign = 'right'; g.fillText(v, R, y); g.textAlign = 'left'; y += 38; };
  text('FENCE SITE PLAN', { size: 38, font: F.disp, weight: 900, gap: 2 });
  text('For the fence permit application', { size: 21, color: DIM, gap: 14 });
  rule();
  text(d.address, { size: 27, font: F.disp, weight: 800, gap: 2 });
  text([d.town, d.state].filter(Boolean).join(', ') || 'Town not set', { size: 21, color: DIM, gap: 10 });
  rule();
  kv('Total fence', `${Math.round(d.ft)} ft`, { color: COPPER });
  kv('Height', d.height ? `${d.height} ft` : '—');
  kv('Walk gates', String(d.gates.filter(x => x.type === 'walk').length));
  kv('Drive gates', String(d.gates.filter(x => x.type === 'drive').length));
  if (d.model) text(d.model, { size: 21, weight: 600, gap: 10 });
  rule();
  text('TOWN LIMITS', { size: 19, font: F.mono, weight: 600, color: DIM, gap: 4 });
  kv('Front yard', fmt(d.rule?.front)); kv('Side yard', fmt(d.rule?.side)); kv('Rear yard', fmt(d.rule?.rear));
  if (d.rule?.sight) kv('Corner clear zone', `${d.rule.sight.ft} ft · max ${d.rule.sight.max} ft`);
  if (d.ruleInfo?.permit) text(`Permit: ${d.ruleInfo.permit}`, { size: 19, gap: 6 });
  if (d.rule?.fromAI) text('Limits from an AI lookup. Confirm with the zoning office.', { size: 18, color: '#a52f2f', gap: 6 });
  for (const i of d.issues) text('⚠ ' + i, { size: 18, color: '#a52f2f', weight: 600, gap: 6 });
  rule();
  // legend
  const sw = (fill, edge, label, dash) => { g.fillStyle = fill; g.fillRect(L, y + 2, 34, 22); g.strokeStyle = edge; g.lineWidth = 2; g.setLineDash(dash || []); g.strokeRect(L, y + 2, 34, 22); g.setLineDash([]); g.font = `500 19px ${F.body}`; g.fillStyle = INK; g.textBaseline = 'top'; g.fillText(label, L + 48, y + 3); y += 32; };
  sw(FILL.front, EDGE.front, 'Front yard'); sw(FILL.side, EDGE.side, 'Side & rear yard'); sw(FILL.no, EDGE.no, 'No fence (right-of-way / clear vision)', [8, 6]);
  { g.strokeStyle = COPPER; g.lineWidth = 8; g.beginPath(); g.moveTo(L, y + 13); g.lineTo(L + 34, y + 13); g.stroke(); g.font = `500 19px ${F.body}`; g.fillStyle = INK; g.fillText('New fence, with run lengths', L + 48, y + 3); y += 32; }
  { g.strokeStyle = INK; g.lineWidth = 3; g.setLineDash([14, 5, 3, 5]); g.beginPath(); g.moveTo(L, y + 13); g.lineTo(L + 34, y + 13); g.stroke(); g.setLineDash([]); g.fillStyle = INK; g.fillText('Property line (county GIS)', L + 48, y + 3); y += 32; }
  { g.strokeStyle = COPPER; g.lineWidth = 3; g.setLineDash([10, 6]); g.beginPath(); g.moveTo(L, y + 13); g.lineTo(L + 34, y + 13); g.stroke(); g.setLineDash([]); g.fillStyle = INK; g.fillText('Front of house', L + 48, y + 3); y += 40; }

  // title block at the bottom
  const by = H - M - 230;
  g.fillStyle = INK; g.fillRect(cx0 + 4, by, cw - 4 + M / 2 - 4, H - M / 2 - by);
  y = by + 24; const tw = (t, size, weight, color, font = F.body) => { g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(t, L, y); y += size * 1.3; };
  tw('GHAREEB FENCING SOLUTIONS', 26, 900, '#fff', F.disp);
  tw('5242 Tractor Rd Suite C, Toledo, OH 43612', 19, 500, '#c9d4de');
  tw('(419) 214-2107 · nick@ghareebfence.com', 19, 500, '#c9d4de');
  y += 6; tw(`Drawn ${today()} · Sheet 1 of 1`, 18, 600, '#f0a865', F.mono);
  y += 4; g.font = `400 15px ${F.body}`; g.fillStyle = '#9fb0bf';
  for (const l of ['Property lines are from county GIS and are approximate. A survey', 'governs. Call ' + (d.state === 'MI' ? 'MISS DIG 811' : '811') + ' before digging. Not legal advice.']) { g.fillText(l, L, y); y += 20; }
  return cv;
}

let overlay = null;
export async function openSitePlan(app, d) {
  overlay?.remove();
  const el = overlay = document.createElement('div'); el.className = 'bp';
  el.innerHTML = `
    <div class="bp-top"><button class="iconbtn" data-x aria-label="Close">${icons.close}</button>
      <div class="grow"><div class="eyebrow">PERMIT PACKET</div><h3>${esc(d.address)}</h3></div>
      <button class="btn sm" data-share disabled>Share</button></div>
    <div class="bp-stage"><div class="bp-sheet"></div><div class="bp-load"><div class="bp-scan"></div><ol><li class="on">Drawing the site plan</li></ol></div></div>`;
  document.body.append(el); requestAnimationFrame(() => el.classList.add('on'));
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 350); if (overlay === el) overlay = null; };
  $('[data-x]', el).onclick = close;
  try {
    const cv = await drawSitePlan(d);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const sheet = $('.bp-sheet', el);
    sheet.innerHTML = `<img alt="Fence site plan for ${esc(d.address)}" src="${URL.createObjectURL(blob)}">`;
    await sheet.firstChild.decode().catch(() => {});
    $('.bp-load', el).hidden = true; sheet.classList.add('in'); zoomable(sheet);
    const share = $('[data-share]', el); share.disabled = false;
    share.onclick = async () => {
      const file = new File([blob], `GFS site plan - ${d.address.replace(/[<>:"/\\|?*]/g, '-')}.png`, { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Fence site plan · ${d.address}` });
        else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); }
      } catch (e) { if (e.name !== 'AbortError') toast('Sharing was not available here.'); }
    };
  } catch (e) {
    $('.bp-load ol', el).innerHTML = `<li class="err">${esc(e.message || 'The site plan could not be drawn.')}</li>`;
  }
}
