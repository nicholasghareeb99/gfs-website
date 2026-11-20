import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { jsPDF } from 'jspdf';
import { build as buildPDF } from '../../public/assets/js/estimate-pdf.js';
import { canPriceHeight, formatRange, parseRange, pricingRows } from '../../public/assets/js/ballpark-pricing-rules.mjs';
import { accessToken, configuration, docUrl, fetchLead, plain, readPricingProject, takeSlots } from './ballpark-price.mjs';

const RECEIPT = /^web_[a-zA-Z0-9_-]{16,80}$/;
const SUBJECT = 'Your Ghareeb Fencing ballpark estimate';
const REPLY_TO = 'nick@ghareebfence.com';
const REMOVAL_MATERIALS = {
  wood: 'Wood', chain: 'Chain link', vinyl: 'Vinyl', aluminum: 'Aluminum / metal', other: 'Other / mixed materials',
};
const SITE_NOTES = [
  'Dog in the yard', 'Yard slopes', 'Trees or brush on the fence line', 'Tight access to the back yard',
  'Not sure where the property line is', 'HOA approval needed', 'Has permit questions', 'Interested in financing',
];
const TIMELINES = ['As soon as possible', 'Within 1 month', '1 to 3 months', '3 to 6 months', 'Just getting prices'];

function mailConfiguration(env) {
  if (env.GFS_ESTIMATE_EMAIL_ENABLED !== 'true') return null;
  const service = env.GFS_ESTIMATE_EMAILJS_SERVICE_ID;
  const template = env.GFS_ESTIMATE_EMAILJS_TEMPLATE_ID;
  const publicKey = env.GFS_ESTIMATE_EMAILJS_PUBLIC_KEY;
  const privateKey = env.GFS_ESTIMATE_EMAILJS_PRIVATE_KEY;
  return service && template && publicKey && privateKey ? { service, template, publicKey, privateKey } : null;
}

function validEmail(value) {
  if (typeof value !== 'string' || value.length > 200) return false;
  const [local, domain, extra] = value.split('@');
  return extra === undefined && local.length <= 64 && /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i.test(local)
    && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain || '');
}

function readEstimate(fields, receipt) {
  if (plain(fields?.source) !== 'ballpark-email-estimate') return null;
  const metadata = new URLSearchParams();
  for (const field of String(plain(fields.meta) || '').split(' | ')) {
    const at = field.indexOf('=');
    if (at < 1) continue;
    try { metadata.append(field.slice(0, at), decodeURIComponent(field.slice(at + 1))); } catch {}
  }
  if (metadata.get('estimate_email_opt_in') !== 'yes' || !RECEIPT.test(metadata.get('parent_receipt') || '')) return null;
  const email = plain(fields.email);
  const range = parseRange(metadata.get('price_range_shown'));
  const project = readPricingProject(metadata.get('pricing_project'), receipt);
  if (!validEmail(email) || !range || !project) return null;
  const siteNotes = (metadata.get('estimate_email_site_notes') || '').split('; ').filter(note => SITE_NOTES.includes(note));
  const timeline = plain(fields.timeline);
  return { email, range, project, siteNotes, timeline: TIMELINES.includes(timeline) ? timeline : '' };
}

async function publishedStyleNames(fetcher, project, token) {
  const response = await fetcher(docUrl(project, 'settings/public'), {
    headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(4000), redirect: 'error',
  });
  if (!response.ok) throw Error('Could not check the published catalogue');
  const fields = (await response.json()).fields || {};
  const names = (fields.styleNames?.arrayValue?.values || []).map(plain)
    .filter(name => typeof name === 'string').map(name => name.trim());
  return new Set(['Pool Fence', ...names, ...pricingRows(plain(fields.pricing)).map(row => row.name)]);
}

function estimateMessage(estimate, receipt) {
  const { email, range, project, siteNotes, timeline } = estimate;
  const linearFeet = Number(project.parts.reduce((sum, part) => sum + part.feet, 0).toFixed(2));
  const singleGates = project.parts.reduce((sum, part) => sum + part.singleGates, 0);
  const doubleGates = project.parts.reduce((sum, part) => sum + part.doubleGates, 0);
  const removalMaterial = project.removal.material;
  const message = [
    'Here is the ballpark estimate you asked us to email.',
    '',
    'Planning range: ' + formatRange(range.low, range.high),
    'Total fence length: ' + linearFeet + ' ft',
    '',
    ...project.parts.map(({ style, feet, height, singleGates, doubleGates }) =>
      `- ${style}: ${feet} ft long, ${height} ft tall. Walk gates (4 ft): ${singleGates}. Drive gates (10 ft): ${doubleGates}.`),
    '',
    'Existing fence removal: ' + (project.removal.on ? (REMOVAL_MATERIALS[removalMaterial] + ', ' + linearFeet + ' ft') : 'None selected'),
    ...(timeline ? ['When you want it built: ' + timeline] : []),
    ...(siteNotes.length ? ['Yard notes: ' + siteNotes.join('; ')] : []),
    '',
    'This is a planning estimate. We’ll confirm the price after we measure and review your project.',
    '',
    'Ghareeb Fencing Solutions',
    '(419) 214-2107',
    REPLY_TO,
    '5242 Tractor Rd Suite C, Toledo, OH 43612',
    'Mon–Sat 8 AM–6 PM, closed Sunday',
    '',
    'You received this one-time email because you asked for a copy of your estimate.',
  ].join('\n');
  const pdf = buildPDF({
    priceLow: range.low, priceHigh: range.high, linearFeet, singleGates, doubleGates, timeline, siteNotes,
    removeOldFence: project.removal.on, existingFenceMaterial: removalMaterial,
    parts: project.parts.map(part => ({ ...part, name: part.style })),
    reference: receipt,
  }, null, null, jsPDF);
  return {
    to_email: email, subject: SUBJECT, message, reply_to: REPLY_TO,
    estimate_pdf: Buffer.from(pdf.output('arraybuffer')).toString('base64'),
  };
}

export async function sendWithEmailJS({ config, params, fetcher = fetch }) {
  const response = await fetcher('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.service, template_id: config.template, user_id: config.publicKey,
      accessToken: config.privateKey, template_params: params,
    }),
    signal: AbortSignal.timeout(4500),
    redirect: 'error',
  });
  return response.ok;
}

const reply = status => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handle(request, { ip, fetcher = fetch, env = process.env,
  now = Math.floor(Date.now() / 1000), sender = sendWithEmailJS } = {}) {
  if (request.method !== 'POST') return reply(405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply(403);
  let body;
  try {
    const text = await request.text();
    if (text.length > 512) return reply(400);
    body = JSON.parse(text);
  } catch { return reply(400); }
  if (body?.optIn !== true || typeof body.receipt !== 'string' || !RECEIPT.test(body.receipt)) return reply(400);

  const mail = mailConfiguration(env);
  const firestore = configuration(env);
  if (!mail || !firestore || !isIP(ip || '')) return reply(503);

  const receipt = body.receipt;
  try {
    const token = await accessToken(fetcher, firestore.key, now);
    const lead = await fetchLead(fetcher, firestore.project, token, receipt, now);
    if (lead.status === 'missing') return reply(409); // The verified Forms event is still syncing.
    if (lead.status !== 'ok') return reply(403);
    const estimate = readEstimate(lead.doc.fields, receipt);
    if (!estimate) return reply(403);

    const names = await publishedStyleNames(fetcher, firestore.project, token);
    if (estimate.project.parts.some(({ style, height }) => !names.has(style) || !canPriceHeight(style, height))) return reply(403);

    const hour = Math.floor(now / 3600);
    const hash = value => createHmac('sha256', firestore.key.private_key).update('gfs-ballpark-estimate-email-v1\0' + value).digest('hex');
    const allowed = await takeSlots(fetcher, firestore.project, token, now, [
      { id: 'email_receipt_' + receipt, cap: 1, keep: 2 * 86400 },
      { id: 'email_ip_' + hash(ip) + '_' + hour, cap: 10, keep: 7200 },
      { id: 'email_address_' + hash(estimate.email.toLowerCase()) + '_' + hour, cap: 3, keep: 7200 },
    ]);
    if (!allowed) return reply(429);

    // Once an attempt is reserved, an uncertain provider response must not
    // cause a second email. The linked office request is already on file.
    const accepted = await sender({ config: mail, params: estimateMessage(estimate, receipt), fetcher });
    return reply(accepted ? 202 : 502);
  } catch {
    return reply(503);
  }
}

export default (request, context) => handle(request, { ip: context?.ip });
