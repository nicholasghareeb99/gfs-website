/* ══════════════════════════════════════════════════════════════════════════
   showroom-ai — fence rule lookup for the GFS Showroom permit map
   ──────────────────────────────────────────────────────────────────────────
   The showroom ships with verified rules for the towns GFS researched. For any
   other address, the salesman taps "Ask AI": this function asks Claude (with
   web search) to find that municipality's residential fence rules and answer
   in a fixed JSON shape, with the sources it used. The app labels the answer
   as an AI lookup to confirm with the zoning office.

   Setup (Netlify → Site configuration → Environment variables):
     ANTHROPIC_API_KEY        required. Without it the function answers 503
                              and the app keeps working with verified rules only.
     SHOWROOM_AI_MODEL        optional, default claude-sonnet-5-5
     SHOWROOM_AI_SEARCH_TOOL  optional, default web_search_20250305

   Only the address, town, county and state are sent. No customer names.
   ══════════════════════════════════════════════════════════════════════════ */

const ALLOWED_ORIGIN = /^https:\/\/(([a-z0-9-]+--)?gfencing\.netlify\.app|(www\.)?ghareebfence\.com)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const recent = new Map(); // ip → [timestamps]
const answers = new Map(); // town key → { at, body }

function headers(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN.test(origin) ? origin : 'https://ghareebfence.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
}
const reply = (status, body, origin) => new Response(JSON.stringify(body), { status, headers: headers(origin) });
const clean = (v, n = 160) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

const SYSTEM = `You research residential fence regulations for a fence contractor in Northwest Ohio and Southeast Michigan.
Use web search to find the CURRENT fence rules of the specific municipality (city, village or township) that governs the address. Prefer the municipality's own code (e.g. American Legal, Municode, eCode360, the town's website) over blogs. Townships in Ohio often use a zoning resolution; Michigan townships use a zoning ordinance.
Return ONLY a JSON object, no prose, with exactly these keys:
{"jurisdiction": string, "frontMaxFt": number|null, "sideMaxFt": number|null, "rearMaxFt": number|null,
 "permitRequired": "yes"|"no"|"unknown", "permitNote": string, "office": string, "phone": string,
 "cornerLot": string, "sightTriangle": string, "setback": string, "materials": string,
 "notes": [string], "sources": [{"title": string, "url": string}], "confidence": "high"|"medium"|"low"}
Rules: heights are residential maximums in feet. Use null when the source does not state a number; never guess. Keep each string under 200 characters, plain language. "notes" has at most 6 items. Every number must come from a source you list. confidence is high only when you read the actual code section.`;

export default async function handler(request) {
  const origin = request.headers.get('origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== 'POST') return reply(405, { error: 'POST only' }, origin);
  if (origin && !ALLOWED_ORIGIN.test(origin)) return reply(403, { error: 'origin' }, origin);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return reply(503, { error: 'not-configured', message: 'The AI lookup needs ANTHROPIC_API_KEY in Netlify.' }, origin);

  const ip = request.headers.get('x-nf-client-connection-ip') || 'anon', now = Date.now();
  const hits = (recent.get(ip) || []).filter(t => now - t < 3600e3);
  if (hits.length >= 30) return reply(429, { error: 'rate', message: 'Too many lookups this hour.' }, origin);
  recent.set(ip, [...hits, now]);

  let input;
  try { input = await request.json(); } catch { return reply(400, { error: 'bad-json' }, origin); }
  const address = clean(input.address, 200), town = clean(input.town, 80), county = clean(input.county, 60), state = clean(input.state, 20);
  if (!address && !town) return reply(400, { error: 'address' }, origin);
  const cacheKey = `${town}|${county}|${state}`.toLowerCase();
  const cached = answers.get(cacheKey);
  if (town && cached && now - cached.at < 7 * 864e5) return reply(200, { ...cached.body, cached: true }, origin);

  const body = {
    model: process.env.SHOWROOM_AI_MODEL || 'claude-sonnet-5-5',
    max_tokens: 1800,
    system: SYSTEM,
    tools: [{ type: process.env.SHOWROOM_AI_SEARCH_TOOL || 'web_search_20250305', name: 'web_search', max_uses: 4,
      user_location: { type: 'approximate', city: 'Toledo', region: 'Ohio', country: 'US', timezone: 'America/New_York' } }],
    messages: [{ role: 'user', content: `Address: ${address}\nMunicipality (from maps, may be the postal city rather than the governing township): ${town || 'unknown'}\nCounty: ${county || 'unknown'}\nState: ${state || 'unknown'}\n\nFirst confirm which municipality governs this address, then find its residential fence rules. Return the JSON object only.` }]
  };
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 55000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctl.signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return reply(502, { error: 'upstream', message: clean(data?.error?.message || res.statusText, 200) }, origin);
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const json = JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]);
    const num = v => (typeof v === 'number' && v > 0 && v <= 12 ? v : null);
    const out = {
      jurisdiction: clean(json.jurisdiction, 120), frontMaxFt: num(json.frontMaxFt), sideMaxFt: num(json.sideMaxFt), rearMaxFt: num(json.rearMaxFt),
      permitRequired: ['yes', 'no'].includes(json.permitRequired) ? json.permitRequired : 'unknown',
      permitNote: clean(json.permitNote, 240), office: clean(json.office, 120), phone: clean(json.phone, 40),
      cornerLot: clean(json.cornerLot, 240), sightTriangle: clean(json.sightTriangle, 240), setback: clean(json.setback, 240), materials: clean(json.materials, 240),
      notes: (Array.isArray(json.notes) ? json.notes : []).slice(0, 6).map(n => clean(n, 220)).filter(Boolean),
      sources: (Array.isArray(json.sources) ? json.sources : []).slice(0, 6).map(s => ({ title: clean(s?.title, 120), url: /^https?:\/\//.test(s?.url || '') ? String(s.url).slice(0, 400) : '' })).filter(s => s.url),
      confidence: ['high', 'medium', 'low'].includes(json.confidence) ? json.confidence : 'low',
      checked: new Date().toISOString().slice(0, 10)
    };
    if (town) answers.set(cacheKey, { at: now, body: out });
    return reply(200, out, origin);
  } catch (e) {
    return reply(504, { error: 'timeout', message: e.name === 'AbortError' ? 'The lookup took too long. Try again.' : clean(e.message, 200) }, origin);
  } finally { clearTimeout(timer); }
}
