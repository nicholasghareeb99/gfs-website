// Ballpark price, worked out on the server.
//
// The per-foot and per-gate rates live only in Firestore settings/global,
// which visitors cannot read. This function reads them with a read-only
// service account, uses the app’s section and cent rounding, and returns the planning
// range only.
//
// Safe to deploy before it is configured: without the two environment
// variables below it answers 503 {"error":"not-configured"} and the page
// keeps using whatever it did before (see docs/BALLPARK-SERVER-PRICE.md).
//
// Netlify environment variables (set by the owner in the Netlify UI):
//   GFS_FIREBASE_PROJECT_ID       already set for the intake function
//   GFS_PRICING_SERVICE_ACCOUNT   the service account key JSON (raw or base64)
//
// POST /.netlify/functions/ballpark-price   (same-origin, application/json, 8 kB max)
//   { ping:true }                                  -> 200 {ok:true} when configured. No data, no receipt.
//   { receipt, parts:[{style, feet, height, singleGates, doubleGates}],
//     removal:{on, material, feet}, compare:true }       -> 200 {low, high, parts:[{style, feet}], comparisons:[{style, low, high}]}
//                                                     or 200 {needsQuote:true}
//   { renew:true, receipt }                        -> 200 {session, expiresIn}   (a returning customer; see docs)
//   { receipt, session, parts, ... }               -> as above, priced under the session instead of the 24 hour lead age
// A price is only given for a receipt that exists in websiteLeads (and is
// under a day old, or comes with a session this function issued for it), so a
// price always leaves a lead behind. Each receipt gets at most 60 priced ranges
// per 24 hour block of its life (180 in all; a failed or needs-quote answer does
// not count) and 20 attempts a minute, by counters in the ballparkPriceUse
// collection. Over the limit: 429 (with Retry-After for the minute limit).
//
// The answer never carries a total, a per-foot figure, billable feet or
// anything else a rate follows from directly.
import crypto from 'node:crypto';
import { DEFAULT_REMOVAL_RATES, canPriceHeight, formatRange, gateCost, getSectionSize, parseRange, positiveRate, priceBand, pricingRows, roundPrice } from '../../public/assets/js/ballpark-pricing-rules.mjs';

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const MAX_FEET = 2000;
const MAX_BODY = 8192;
const RECEIPT_RE = /^web_[a-zA-Z0-9_-]{16,80}$/;
const RECEIPT_MAX_AGE_MS = 24 * 3600 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;   // a lead stamped slightly in the future is clock skew; further is not trusted
const SETTINGS_TTL = 300; // seconds
// Two separate bounds for one receipt (see countAttempt and takeSlots below).
const DAY_CAP = 60;        // priced ranges actually returned per receipt in one 24 hour block of its life; a comparison list counts as one
const LIFETIME_CAP = 180;  // hard cap on priced ranges for the life of a receipt (three full blocks)
const MINUTE_CAP = 20;     // attempts (any outcome) per receipt in one clock minute
// Returning customers (see "Returning customers" in docs/BALLPARK-SERVER-PRICE.md).
const BLOCK_MS = 24 * 3600 * 1000;             // blocks are counted from the lead's own trusted creation time
const SESSION_MAX_MS = 24 * 3600 * 1000;       // longest a pricing session lives
const RENEW_HORIZON_MS = 180 * 24 * 3600 * 1000; // oldest lead that can still be renewed
const RENEW_DAY_CAP = 3, RENEW_LIFETIME_CAP = 20, RENEW_MINUTE_CAP = 5;
const SESSION_LABEL = 'gfs-ballpark-session-v1';
const SESSION_RE = /^v1\.[A-Za-z0-9_-]{20,400}\.[A-Za-z0-9_-]{43}$/;
const USE_COLLECTION = 'ballparkPriceUse';

// ---- pricing math: same section spacing and cents as the quote core ---
export function slugify(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

// Same reading of the "Name : perFoot : single : double" list as the page.
// Keyed by slug in a plain object so ordering matches the page's catalogue.
export function parsePricing(text) {
  return Object.fromEntries(pricingRows(text).filter(row => slugify(row.name)).map(row => [slugify(row.name), row]));
}

export { getSectionSize };

export function supportedStyleHeight(name) {
  const text = String(name || '').replace(/[‘’ʼ´′]/g, "'");
  const matches = Array.from(text.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:ft\b|feet\b|foot\b|')/gi));
  const heights = [...new Set(matches.map(match => Number(match[1])))];
  if (heights.length !== 1 || /\d\s*(?:\/|-|–|—|to)\s*\d/i.test(text) || /(?:ft\b|feet\b|foot\b|')\s*\d+(?:\.\d+)?\s*(?:["″]|inches\b|in\b)/i.test(text)) return null;
  return heights[0] >= 2 && heights[0] <= 12 ? heights[0] : null;
}
const partHeight = (name, requested) => { const named = supportedStyleHeight(name); return named !== null ? named : Number(requested); };

function removalRate(factors, material) {
  if (material === 'wood') return factors.remWood;
  if (material === 'chain') return factors.remChain;
  return factors.remOther;
}
export function readFactors(raw, { materials = raw?.materials, styleMaterialMap = raw?.styleMaterialMap } = {}) {
  const removal = Object.fromEntries(Object.entries(DEFAULT_REMOVAL_RATES).map(([key, fallback]) => [key, positiveRate(raw?.[key], fallback)]));
  return { ...removal, materials, styleMaterialMap };
}

function pricePart(styles, factors, part, styleName) {
  const id = slugify(styleName);
  const fence = Object.hasOwn(styles, id) ? styles[id] : null;
  if (!fence || !Number.isFinite(fence.perFoot) || fence.perFoot <= 0) return null;
  if (!Number.isFinite(part.feet) || part.feet <= 0) return null;
  const named = supportedStyleHeight(fence.name), height = partHeight(fence.name, part.height);
  if (!canPriceHeight(fence.name, height) || (named === null && ![4, 5, 6, 8].includes(height))) return null;
  const size = getSectionSize(fence.name, factors);
  const billable = size ? Math.ceil(part.feet / size) * size : part.feet;
  const gates = gateCost(part.singleGates, part.doubleGates, fence.singleGate, fence.doubleGate);
  return gates === null ? null : { fenceCost: roundPrice(billable * fence.perFoot), gateCost: gates };
}

// null whenever the project cannot be priced: a missing rate is not a free fence.
export function projectAmount(styles, factors, request, mainStyle) {
  const parts = request.parts;
  // The page sends the whole length too (the main part is that length less
  // the added styles, rounded to 0.01 ft); removal is priced on the whole length.
  const sum = parts.reduce((s, p) => s + p.feet, 0);
  const totalFeet = request.removal.feet || sum;
  if (!Number.isFinite(totalFeet) || totalFeet <= 0 || totalFeet > MAX_FEET) return null;
  const priced = parts.map((part, i) => pricePart(styles, factors, part, i === 0 && mainStyle ? mainStyle : part.style));
  if (priced.some(p => !p)) return null;
  if (request.removal.on && !['wood', 'chain', 'vinyl', 'aluminum', 'other'].includes(request.removal.material)) return null;
  // Removal is allowed for the same run length as the new fence.
  const removal = request.removal.on ? roundPrice(totalFeet * removalRate(factors, request.removal.material)) : 0;
  const total = priced.reduce((s, p) => s + p.fenceCost, 0) + priced.reduce((s, p) => s + p.gateCost, 0) + removal;
  return roundPrice(total);
}

export function priceProject(styles, factors, request, mainStyle) {
  const total = projectAmount(styles, factors, request, mainStyle);
  return total === null ? null : priceBand(total);
}

// Other styles priced for the same project: same height as the customer's
// main style (a style that names no height is always included), cheapest first.
export function compareStyles(styles, factors, request) {
  const mainStyle = request.parts[0].style, mainId = slugify(mainStyle);
  const height = partHeight(mainStyle, request.parts[0].height);
  return Object.entries(styles).map(([id, fence]) => {
    const named = supportedStyleHeight(fence.name);
    if (id !== mainId && named !== null && named !== height) return null;
    const price = priceProject(styles, factors, request, fence.name);
    return price ? { style: fence.name, low: price.low, high: price.high, total: price.total } : null;
  }).filter(Boolean).sort((a, b) => a.total - b.total).map(({ style, low, high }) => ({ style, low, high }));
}

// ---- request checks -------------------------------------------------------
const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
const onlyKeys = (obj, keys) => Object.keys(obj).every(k => keys.includes(k));
const wholeNumber = (v, max) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

// Returns {ping:true}, {renew:true, receipt}, a clean request, or null. Never throws.
export function readRequest(body) {
  let data;
  try { data = JSON.parse(body); } catch { return null; }
  if (!isObject(data)) return null;
  if (data.ping === true) return Object.keys(data).length === 1 ? { ping: true } : null;
  if (data.renew === true) return onlyKeys(data, ['renew', 'receipt']) && typeof data.receipt === 'string' && RECEIPT_RE.test(data.receipt) ? { renew: true, receipt: data.receipt } : null;
  if (!onlyKeys(data, ['receipt', 'parts', 'removal', 'compare', 'session', 'saved'])) return null;
  if (typeof data.receipt !== 'string' || !RECEIPT_RE.test(data.receipt)) return null;
  if (data.session !== undefined && (typeof data.session !== 'string' || !SESSION_RE.test(data.session))) return null;
  if (!Array.isArray(data.parts) || !data.parts.length || data.parts.length > 4) return null;
  const parts = [];
  for (const p of data.parts) {
    if (!isObject(p) || !onlyKeys(p, ['style', 'feet', 'height', 'singleGates', 'doubleGates'])) return null;
    if (typeof p.style !== 'string' || !p.style.trim() || p.style.length > 200) return null;
    if (typeof p.feet !== 'number' || !Number.isFinite(p.feet) || p.feet <= 0 || p.feet > MAX_FEET) return null;
    if (typeof p.height !== 'number' || !Number.isFinite(p.height) || p.height < 2 || p.height > 12) return null;
    if (!wholeNumber(p.singleGates, 50) || !wholeNumber(p.doubleGates, 50)) return null;
    parts.push({ style: p.style.trim(), feet: p.feet, height: p.height, singleGates: p.singleGates, doubleGates: p.doubleGates });
  }
  const sum = parts.reduce((s, p) => s + p.feet, 0);
  if (sum > MAX_FEET + 0.005) return null;
  const removal = data.removal === undefined ? { on: false } : data.removal;
  if (!isObject(removal) || !onlyKeys(removal, ['on', 'material', 'feet']) || typeof removal.on !== 'boolean') return null;
  if (removal.feet !== undefined && (typeof removal.feet !== 'number' || !(removal.feet > 0) || removal.feet > MAX_FEET || Math.abs(removal.feet - sum) > 0.011)) return null;
  if (removal.on && !['wood', 'chain', 'vinyl', 'aluminum', 'other'].includes(removal.material)) return null;
  if (data.compare !== undefined && typeof data.compare !== 'boolean') return null;
  if (data.saved !== undefined && typeof data.saved !== 'boolean') return null;
  return { receipt: data.receipt, session: data.session, parts, removal: { on: removal.on, material: removal.on ? removal.material : '', feet: removal.feet }, compare: data.compare === true, saved: data.saved === true };
}

// ---- Google access with the service account -------------------------------
// Returns the key or null. Never throws, so a bad value reads as "not configured".
function serviceAccount(env) {
  try {
    let raw = env.GFS_PRICING_SERVICE_ACCOUNT || '';
    if (raw && !raw.trim().startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf8');
    const key = raw ? JSON.parse(raw) : null;
    return key && typeof key.client_email === 'string' && typeof key.private_key === 'string' ? key : null;
  } catch { return null; }
}
export function configuration(env) {
  const project = env.GFS_FIREBASE_PROJECT_ID;
  const key = serviceAccount(env);
  return project && /^[a-z][a-z0-9-]{4,62}$/.test(project) && key ? { project, key } : null;
}
const b64url = v => Buffer.from(v).toString('base64url');
let tokenCache = null;
export async function accessToken(fetcher, key, now) {
  if (tokenCache && tokenCache.exp > now + 60 && tokenCache.who === key.client_email) return tokenCache.token;
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signature = crypto.createSign('RSA-SHA256').update(head + '.' + claims).sign(key.private_key).toString('base64url');
  const res = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claims + '.' + signature, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Error('Google sign-in failed (HTTP ' + res.status + ')');
  const json = await res.json();
  if (!json || typeof json.access_token !== 'string') throw Error('Google sign-in gave no token');
  tokenCache = { token: json.access_token, exp: now + (Number(json.expires_in) || 3600), who: key.client_email };
  return tokenCache.token;
}
export function docUrl(project, path) { return 'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/' + path; }
export function plain(field) {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('doubleValue' in field) return field.doubleValue;
  if ('integerValue' in field) return Number(field.integerValue);
  return undefined;
}
let settingsCache = null;
async function loadSettings(fetcher, project, token, now) {
  if (settingsCache && settingsCache.project === project && settingsCache.at > now - SETTINGS_TTL) return settingsCache.value;
  async function readDocument(name, optional = false) {
    const response = await fetcher(docUrl(project, 'settings/' + name), {
      headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000),
    });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Error('Could not read pricing settings (HTTP ' + response.status + ')');
    return (await response.json()).fields || {};
  }
  const [fields, materials, styleMaterialMap] = await Promise.all([
    readDocument('global'), readDocument('materials', true), readDocument('styleMaterialMap', true),
  ]);
  const spacingFields = materials ?? fields.materials?.mapValue?.fields ?? {};
  const value = {
    styles: parsePricing(plain(fields.pricing)),
    factors: readFactors({ remWood: plain(fields.remWood), remChain: plain(fields.remChain), remOther: plain(fields.remOther) }, {
      materials: Object.fromEntries(Object.entries(spacingFields).map(([name, field]) =>
        [name, { postSpacing: plain(field.mapValue?.fields?.postSpacing) }])),
      styleMaterialMap: Object.fromEntries(Object.entries(styleMaterialMap || {}).map(([name, field]) => [name, plain(field)])),
    }),
  };
  settingsCache = { at: now, project, value };
  return value;
}
// Netlify intake prices once before it creates a server-priced lead. The
// price endpoint later returns that saved range even if settings have changed.
export function readPricingProject(raw, receipt) {
  try {
    const payload = JSON.parse(raw);
    if (!isObject(payload) || !onlyKeys(payload, ['parts', 'removal'])) return null;
    return readRequest(JSON.stringify({ ...payload, receipt }));
  } catch { return null; }
}

function projectKey(input) {
  return JSON.stringify([input.parts, input.removal]);
}

export async function estimateForIntake(input, { fetcher, env, now }) {
  const config = configuration(env);
  if (!config) return '';
  const token = await accessToken(fetcher, config.key, now);
  const { styles, factors } = await loadSettings(fetcher, config.project, token, now);
  const price = priceProject(styles, factors, input);
  return price ? formatRange(price.low, price.high) : '';
}

function savedEstimate(lead, input) {
  const meta = String(plain(lead.doc.fields?.meta) || '');
  const lookup = key => {
    const entry = meta.split(' | ').find(value => value.startsWith(key + '='));
    try { return entry ? decodeURIComponent(entry.slice(key.length + 1)) : ''; }
    catch { return ''; }
  };
  const project = readPricingProject(lookup('pricing_project'), input.receipt);
  if (!project || projectKey(project) !== projectKey(input)) return null;
  return parseRange(lookup('price_range_shown'));
}

// How old the lead is, from the best time we can trust. Firestore's own
// createTime (set by the database when the document was created, so the
// sender cannot choose it) wins when the REST answer carries it. Otherwise the
// createdAtMs the intake function wrote (also server time) is used. Anything
// missing, not a number, zero or negative, or more than a few minutes in the
// future is refused: an unreadable age never authorises a price.
// Returns 'ok', 'expired' or 'invalid'.
// The lead's trusted creation time in ms, or null when it cannot be trusted.
export function leadMadeAt(doc, nowMs) {
  let made;
  if (doc && doc.createTime !== undefined) made = typeof doc.createTime === 'string' ? Date.parse(doc.createTime) : NaN;
  else {
    const field = doc && doc.fields ? doc.fields.createdAtMs : undefined;
    made = field && typeof plain(field) === 'number' ? plain(field) : NaN;
  }
  return !Number.isFinite(made) || made <= 0 || made > nowMs + CLOCK_SKEW_MS ? null : made;
}
export function leadAgeStatus(doc, nowMs) {
  const made = leadMadeAt(doc, nowMs);
  if (made === null) return 'invalid';
  return nowMs - made > RECEIPT_MAX_AGE_MS ? 'expired' : 'ok';
}
// {status:'missing'|'invalid'|'ok'|'expired', made, doc}. A fresh receipt is good for a day;
// a session (or a renewal) may use an older one, within the horizon.
export async function fetchLead(fetcher, project, token, receipt, now) {
  const res = await fetcher(docUrl(project, 'websiteLeads/' + encodeURIComponent(receipt)), { headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (res.status === 404) return { status: 'missing' };
  if (!res.ok) throw Error('Could not check the request (HTTP ' + res.status + ')');
  const doc = await res.json();
  const made = leadMadeAt(doc, now * 1000);
  return made === null ? { status: 'invalid' } : { status: now * 1000 - made > RECEIPT_MAX_AGE_MS ? 'expired' : 'ok', made, doc };
}
// One atomic increment of a counter document in a collection of its own (not
// the lead, which the Executive app reads). The commit's increment transform
// returns the new value, so there is no read-modify-write to race: two requests
// at once each get their own number. expireAt lets a Firestore TTL policy clean
// the small documents up. Needs write access to this one collection
// (docs/BALLPARK-SERVER-PRICE.md).
async function increment(fetcher, project, token, id, now, keepSeconds, delta = 1) {
  const name = 'projects/' + project + '/databases/(default)/documents/' + USE_COLLECTION + '/' + id;
  const res = await fetcher('https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents:commit', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{
      update: { name, fields: { expireAt: { timestampValue: new Date((now + keepSeconds) * 1000).toISOString() } } },
      updateMask: { fieldPaths: ['expireAt'] },
      updateTransforms: [{ fieldPath: 'count', increment: { integerValue: String(delta) } }],
    }] }), signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw Error('Could not count the request (HTTP ' + res.status + ')');
  const results = (await res.json()).writeResults || [];
  const n = Number(((results[0] || {}).transformResults || [])[0] && results[0].transformResults[0].integerValue);
  if (!Number.isFinite(n)) throw Error('Count was not returned');
  return n;
}
// Attempt throttle: every request that gets this far (a real, fresh lead)
// counts in this clock minute, whatever its outcome. It only bounds how fast a
// receipt can ask; it never touches the lifetime allowance.
const countAttempt = (fetcher, project, token, receipt, now) => increment(fetcher, project, token, receipt + '_m' + Math.floor(now / 60), now, 3600);
// Allowance slots (priced ranges, renewals): each is one atomic increment sent
// only after the answer is worked out and nothing is left that can fail. The
// returned number is this request's own place in line, so of any number of
// simultaneous requests only those numbered 1..cap get a slot. Slots are taken in
// the order given (the narrower window first); if a later one is refused or its
// commit fails, the earlier ones are handed back (best effort) so a denied or
// failed request keeps nothing. Returns true when every slot was taken.
export async function takeSlots(fetcher, project, token, now, slots) {
  const held = [];
  const giveBack = async () => { for (const s of held) { try { await increment(fetcher, project, token, s.id, now, s.keep, -1); } catch { /* a slot left taken is the safe side */ } } };
  try {
    for (const s of slots) {
      if (await increment(fetcher, project, token, s.id, now, s.keep) > s.cap) { await giveBack(); return false; }
      held.push(s);
    }
    return true;
  } catch (e) { await giveBack(); throw e; }
}
const blockOf = (made, now) => Math.max(0, Math.floor((now * 1000 - made) / BLOCK_MS));
const KEEP_LIFE = Math.ceil((RENEW_HORIZON_MS + 3 * BLOCK_MS) / 1000);   // the lifetime counters must outlive the longest renewable receipt
const pricedSlots = (receipt, made, now) => [
  { id: receipt + '_d' + blockOf(made, now), cap: DAY_CAP, keep: 3 * 86400 },
  { id: receipt, cap: LIFETIME_CAP, keep: KEEP_LIFE },
];
const renewSlots = (receipt, made, now) => [
  { id: receipt + '_rd' + blockOf(made, now), cap: RENEW_DAY_CAP, keep: 3 * 86400 },
  { id: receipt + '_rl', cap: RENEW_LIFETIME_CAP, keep: KEEP_LIFE },
];

// ---- pricing sessions -----------------------------------------------------
// A session is not a login. It is a receipt for "this lead was checked and may be
// priced until expiresAt": base64url JSON {r receipt, i issuedAt, e expiresAt, n nonce}
// plus an HMAC-SHA256 of that text. The HMAC key is derived from the service account
// private key the function already holds (HMAC of the key with a fixed label), so
// there is no new secret to manage and the key itself never leaves the function.
// Rotating the service account key ends every session, which is the intended effect.
const sessionSecret = key => crypto.createHmac('sha256', key.private_key).update(SESSION_LABEL).digest();
export function mintSession(key, receipt, nowSec) {
  const payload = b64url(JSON.stringify({ r: receipt, i: nowSec, e: nowSec + SESSION_MAX_MS / 1000, n: crypto.randomBytes(12).toString('base64url') }));
  return 'v1.' + payload + '.' + crypto.createHmac('sha256', sessionSecret(key)).update(payload).digest('base64url');
}
// 'ok', 'expired' or 'invalid'. Constant-time comparison of the MAC; the receipt
// inside must be the one asked about.
export function checkSession(key, token, receipt, nowSec) {
  if (typeof token !== 'string' || !SESSION_RE.test(token)) return 'invalid';
  const [, payload, mac] = token.split('.');
  const want = crypto.createHmac('sha256', sessionSecret(key)).update(payload).digest();
  // Compare the text exactly: base64url has spare bits, so different text could decode to the same bytes.
  const got = Buffer.from(mac), wantText = Buffer.from(want.toString('base64url'));
  if (got.length !== wantText.length || !crypto.timingSafeEqual(got, wantText)) return 'invalid';
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return 'invalid'; }
  if (!isObject(data) || data.r !== receipt || !Number.isInteger(data.i) || !Number.isInteger(data.e)) return 'invalid';
  if (data.e - data.i > SESSION_MAX_MS / 1000 || data.i > nowSec + CLOCK_SKEW_MS / 1000) return 'invalid';
  return nowSec >= data.e ? 'expired' : 'ok';
}
export function resetCaches() { tokenCache = null; settingsCache = null; }

// ---- handler --------------------------------------------------------------
const reply = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });

export async function handle(request, { fetcher = fetch, env = process.env, now = Math.floor(Date.now() / 1000) } = {}) {
  if (request.method !== 'POST') return reply(405, { error: 'POST only' });
  const config = configuration(env);
  if (!config) return reply(503, { error: 'not-configured' });
  // Same-origin only: a page on another site cannot call this, and no CORS
  // headers are ever sent. Requests without an Origin header (not browsers) pass this check.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply(403, { error: 'Not allowed' });
  if (!/^application\/json\b/i.test(request.headers.get('content-type') || '')) return reply(415, { error: 'Send JSON' });
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY) return reply(413, { error: 'Too large' });
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY) return reply(413, { error: 'Too large' });
  const input = readRequest(body);
  if (!input) return reply(400, { error: 'Check the project details and try again.' });
  if (input.ping) return reply(200, { ok: true });
  // A session is checked before any network call: it is a signature, not a lookup.
  let session = false;
  if (input.session) {
    const status = checkSession(config.key, input.session, input.receipt, now);
    if (status !== 'ok') return reply(403, { error: status === 'expired' ? 'Session expired' : 'Session not valid' });
    session = true;
  }
  try {
    const token = await accessToken(fetcher, config.key, now);
    // The intake function writes the lead a few seconds after the form is
    // sent; the page retries on 409.
    const lead = await fetchLead(fetcher, config.project, token, input.receipt, now);
    if (lead.status === 'missing') return input.renew ? reply(404, { error: 'Request not found' }) : reply(409, { error: 'Request not found yet' });
    if (lead.status === 'invalid') return reply(403, { error: 'Request not valid' });
    const limited = env.GFS_PRICING_LIMIT !== 'off';
    if (input.renew) return await renew(input, { fetcher, config, token, lead, now, limited });
    // A fresh receipt is good for a day. A session this function issued for the receipt replaces that
    // age check (its own expiry applies), but the lead must still be within the renewal horizon.
    if (session ? now * 1000 - lead.made > RENEW_HORIZON_MS + SESSION_MAX_MS : lead.status === 'expired') return reply(403, { error: 'Request too old' });
    if (limited && await countAttempt(fetcher, config.project, token, input.receipt, now) > MINUTE_CAP) {
      return reply(429, { error: 'Too many price requests for this project. Please try again in a minute.' }, { 'Retry-After': String(60 - (now % 60)) });
    }
    const saved = input.saved ? savedEstimate(lead, input) : null;
    if (input.saved && !saved) return reply(200, { needsQuote: true });
    let settings;
    if (!saved || input.compare) {
      try { settings = await loadSettings(fetcher, config.project, token, now); }
      catch (error) {
        if (!saved) throw error;
        // The customer's saved range remains available during a catalogue outage.
      }
    }
    const price = saved || priceProject(settings.styles, settings.factors, input);
    if (!price) return reply(200, { needsQuote: true });
    // Echo the priced layout so the page can disregard a stale answer.
    const out = { low: price.low, high: price.high, parts: input.parts.map(p => ({
      style: settings?.styles[slugify(p.style)]?.name || p.style, feet: p.feet,
    })) };
    if (input.compare) {
      out.comparisons = settings ? compareStyles(settings.styles, settings.factors, input) : [];
      // A fresh comparison may otherwise price the customer's own style a
      // second time after a settings change. The saved selection is the card.
      if (saved) {
        const ownStyle = slugify(input.parts[0].style);
        out.comparisons = out.comparisons.filter(row => slugify(row.style) !== ownStyle);
        out.comparisons.push({ style: input.parts[0].style, low: saved.low, high: saved.high });
        out.comparisons.sort((a, b) => a.low - b.low || a.high - b.high);
      }
    }
    // Only now, with the range in hand and nothing left that can fail, take the allowance slots.
    if (limited && !await takeSlots(fetcher, config.project, token, now, pricedSlots(input.receipt, lead.made, now))) {
      return reply(429, { error: 'Too many price requests for this project. We will send your price.' });
    }
    return reply(200, out);
  } catch (e) {
    console.error('ballpark-price', e && e.message);
    return reply(503, { error: 'Pricing is unavailable right now.' });
  }
}

// A returning customer asks for a pricing session for the lead they already have.
// Nothing is written but counters. Who may renew: anyone who holds the receipt id
// (unguessable, as for a fresh lead) of a website lead (never a booking) that the
// database created within the horizon. Allowance: 5 attempts a minute, 3 sessions per
// 24 hour block of the lead's life, 20 in all; a slot is taken only once the session
// is ready, so an outage or a refused request costs nothing.
async function renew(input, { fetcher, config, token, lead, now, limited }) {
  const f = lead.doc && lead.doc.fields ? lead.doc.fields : {};
  if (f.date !== undefined || f.time !== undefined) return reply(403, { error: 'Request not valid' });   // shaped like a visit booking
  if (now * 1000 - lead.made > RENEW_HORIZON_MS) return reply(403, { error: 'Request too old to continue' });
  if (limited && await increment(fetcher, config.project, token, input.receipt + '_rm' + Math.floor(now / 60), now, 3600) > RENEW_MINUTE_CAP) {
    return reply(429, { error: 'Too many requests. Please try again in a minute.' }, { 'Retry-After': String(60 - (now % 60)) });
  }
  const session = mintSession(config.key, input.receipt, now);
  if (limited && !await takeSlots(fetcher, config.project, token, now, renewSlots(input.receipt, lead.made, now))) {
    return reply(429, { error: 'Too many requests for this project. We will send your price.' });
  }
  return reply(200, { session, expiresIn: SESSION_MAX_MS / 1000 });
}

export default request => handle(request);
