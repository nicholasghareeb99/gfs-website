// Ballpark price, worked out on the server.
//
// The per-foot rates live only in Firestore settings/global, which the
// browser cannot read once the public mirror stops copying `pricing`.
// This function reads them with a service account, prices the project the
// same way the ballpark page does, and returns ranges only.
//
// A price is only given for a request that already exists in
// websiteLeads (the receipt the page gets after the contact step), so the
// endpoint cannot be used to scrape rates without leaving a lead behind.
//
// Netlify environment variables (set by the owner in the Netlify UI):
//   GFS_FIREBASE_PROJECT_ID       already set for the intake function
//   GFS_PRICING_SERVICE_ACCOUNT   the service account key JSON (raw or base64)
//
// POST /.netlify/functions/ballpark-price
//   { receipt, parts:[{style, feet, singleGates, doubleGates}],
//     removal:{on, material}, compare:true }
// -> { low, high, total, parts:[{style, feet, billableFeet, sectionSize, waste}],
//      comparisons:[{style, low, high}] }
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const MAX_FEET = 2000;

// ---- pricing math (kept in step with assets/js/ballpark.js) ----------------
export function parsePricing(text) {
  const styles = new Map();
  for (const raw of String(text || '').split('\n')) {
    const parts = raw.split(':').map(s => s.trim());
    if (parts.length < 4 || !parts[0]) continue;
    const perFoot = parseFloat(parts[1]);
    if (!Number.isFinite(perFoot)) continue;
    styles.set(norm(parts[0]), { name: parts[0], perFoot, singleGate: parseFloat(parts[2]) || 0, doubleGate: parseFloat(parts[3]) || 0 });
  }
  return styles;
}
export function norm(name) { return String(name || '').toLowerCase().replace(/[‘’ʼ´′]/g, "'").replace(/\s+/g, ' ').trim(); }
export function sectionSize(name) {
  const s = String(name || '').toLowerCase();
  if (s.includes('midrail')) return 6;
  if (/split[ -]?rail|splitrail/.test(s)) return 10;
  if (/chain[ -]?link/.test(s)) return 10;
  if (s.includes('vinyl')) return 8;
  if (s.includes('aluminum') || s.includes('ornamental')) return 6;
  if (/wood|cedar|treated|dog[ -]ear|board[ -]on[ -]board|shadow ?box|hybrid/.test(s)) return 8;
  return 0;
}
function removalRate(factors, material) {
  if (material === 'wood') return num(factors.remWood, 5);
  if (material === 'chain') return num(factors.remChain, 3);
  return num(factors.remOther, 2);
}
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
const band = total => ({ total: Math.round(total), low: Math.round(total * 0.95 / 100) * 100, high: Math.round(total * 1.05 / 100) * 100 });

// Returns null when any part cannot be priced: a missing rate is not a free fence.
export function priceProject(styles, factors, request, mainOverride) {
  const parts = request.parts.map((part, i) => ({ ...part, style: i === 0 && mainOverride ? mainOverride : part.style }));
  let fence = 0, gates = 0;
  const lines = [];
  for (const part of parts) {
    const style = styles.get(norm(part.style));
    if (!style || !(style.perFoot > 0) || !(part.feet > 0)) return null;
    const size = sectionSize(style.name);
    const billable = size ? Math.ceil(part.feet / size) * size : part.feet;
    fence += billable * style.perFoot;
    gates += part.singleGates * style.singleGate + part.doubleGates * style.doubleGate;
    lines.push({ style: style.name, feet: part.feet, billableFeet: billable, sectionSize: size, waste: billable - part.feet });
  }
  const totalFeet = parts.reduce((s, p) => s + p.feet, 0);
  const removal = request.removal.on ? totalFeet * removalRate(factors, request.removal.material) : 0;
  return { ...band(fence + gates + removal), parts: lines };
}

// ---- request checks -------------------------------------------------------
export function readRequest(body) {
  let data;
  try { data = JSON.parse(body || ''); } catch { return null; }
  if (!data || typeof data !== 'object') return null;
  const receipt = String(data.receipt || '');
  if (!/^web_[a-zA-Z0-9_-]{16,80}$/.test(receipt)) return null;
  if (!Array.isArray(data.parts) || !data.parts.length || data.parts.length > 4) return null;
  const parts = data.parts.map(p => ({
    style: String(p && p.style || '').slice(0, 200),
    feet: Math.round(Number(p && p.feet) * 100) / 100,
    singleGates: Math.floor(Number(p && p.singleGates) || 0),
    doubleGates: Math.floor(Number(p && p.doubleGates) || 0),
  }));
  const total = parts.reduce((s, p) => s + p.feet, 0);
  if (parts.some(p => !p.style || !(p.feet > 0) || p.singleGates < 0 || p.singleGates > 12 || p.doubleGates < 0 || p.doubleGates > 6) || total > MAX_FEET) return null;
  const material = ['wood', 'chain', 'vinyl', 'aluminum', 'other'].includes(data.removal && data.removal.material) ? data.removal.material : 'other';
  return { receipt, parts, removal: { on: !!(data.removal && data.removal.on), material }, compare: !!data.compare };
}

// ---- Google access with the service account -------------------------------
function serviceAccount() {
  let raw = process.env.GFS_PRICING_SERVICE_ACCOUNT || '';
  if (raw && !raw.trim().startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
  const key = raw ? JSON.parse(raw) : null;
  if (!key || !key.client_email || !key.private_key) throw Error('Set GFS_PRICING_SERVICE_ACCOUNT for this deployment');
  return key;
}
const b64url = v => Buffer.from(v).toString('base64url');
let tokenCache = null;
async function accessToken(fetcher, now) {
  if (tokenCache && tokenCache.exp > now + 60) return tokenCache.token;
  const key = serviceAccount();
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signature = crypto.createSign('RSA-SHA256').update(head + '.' + claims).sign(key.private_key).toString('base64url');
  const res = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claims + '.' + signature, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Error('Google sign-in failed (HTTP ' + res.status + ')');
  const json = await res.json();
  tokenCache = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return tokenCache.token;
}
function docUrl(project, path) { return 'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/' + path; }
function plain(field) {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('doubleValue' in field) return field.doubleValue;
  if ('integerValue' in field) return Number(field.integerValue);
  return undefined;
}
let settingsCache = null;
async function loadSettings(fetcher, project, token, now) {
  if (settingsCache && settingsCache.at > now - 300) return settingsCache.value;
  const res = await fetcher(docUrl(project, 'settings/global'), { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Error('Could not read pricing (HTTP ' + res.status + ')');
  const fields = (await res.json()).fields || {};
  const factors = {};
  for (const k of ['remWood', 'remChain', 'remOther']) factors[k] = plain(fields[k]);
  const value = { styles: parsePricing(plain(fields.pricing)), factors };
  settingsCache = { at: now, value };
  return value;
}
async function leadExists(fetcher, project, token, receipt) {
  const res = await fetcher(docUrl(project, 'websiteLeads/' + encodeURIComponent(receipt)), { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return false;
  if (!res.ok) throw Error('Could not check the request (HTTP ' + res.status + ')');
  return true;
}

// ---- handler --------------------------------------------------------------
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function handle(request, { fetcher = fetch, project = process.env.GFS_FIREBASE_PROJECT_ID, now = Math.floor(Date.now() / 1000) } = {}) {
  if (request.method !== 'POST') return reply(405, { error: 'POST only' });
  const input = readRequest(await request.text());
  if (!input) return reply(400, { error: 'Check the project details and try again.' });
  try {
    const token = await accessToken(fetcher, now);
    // The intake function writes the lead a few seconds after the form is
    // sent; the page retries on 409.
    if (!(await leadExists(fetcher, project, token, input.receipt))) return reply(409, { error: 'Request not found yet' });
    const { styles, factors } = await loadSettings(fetcher, project, token, now);
    const price = priceProject(styles, factors, input);
    if (!price) return reply(200, { needsQuote: true });
    const out = { low: price.low, high: price.high, total: price.total, parts: price.parts };
    if (input.compare) {
      const mainHeight = (input.parts[0].style.match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i) || [])[1];
      out.comparisons = [...styles.values()]
        .filter(s => { const h = (s.name.match(/(\d+(?:\.\d+)?)\s*(?:ft|')/i) || [])[1]; return !h || !mainHeight || h === mainHeight; })
        .map(s => { const p = priceProject(styles, factors, input, s.name); return p && { style: s.name, low: p.low, high: p.high, total: p.total }; })
        .filter(Boolean).sort((a, b) => a.total - b.total).map(({ total, ...rest }) => rest);
    }
    return reply(200, out);
  } catch (e) {
    console.error('ballpark-price', e.message);
    return reply(503, { error: 'Pricing is unavailable right now.' });
  }
}

export default handle;
