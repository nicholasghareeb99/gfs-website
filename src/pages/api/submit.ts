/**
 * Server-side API for form submissions
 * Security: rate limiting, CSRF, input validation, HTML escaping, payload limit
 * Writes to Firestore via REST + API key
 * Data shapes match Executive App's expected format for websiteLeads
 * Writes email doc to 'mail' collection for Firebase Trigger Email extension
 *
 * ✅ SECURITY FIXES applied:
 *   - Added payload size limit (50KB)
 *   - Improved CSRF check with referer fallback
 */

import type { APIRoute } from 'astro';

const PROJECT_ID = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || 'ghareeb-fencing';
const API_KEY = import.meta.env.PUBLIC_FIREBASE_API_KEY;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ============================================================
// RATE LIMITING (in-memory, per IP — resets on cold start)
// ============================================================
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW = 60_000;  // 1 minute window
const RATE_LIMIT = 5;        // max 5 submissions per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(ip);
  }
}, 300_000);

// ============================================================
// SECURITY CONSTANTS
// ============================================================
const MAX_PAYLOAD_BYTES = 50_000; // 50KB max request body
const ALLOWED_ORIGINS = ['ghareebfencing.com', 'localhost', '127.0.0.1'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[\d\s()+-]{7,20}$/;

// Notification email recipient
const NOTIFY_EMAIL = 'nicholasghareeb99@gmail.com';

// ============================================================
// VALIDATION HELPERS
// ============================================================

// Convert JS value to Firestore REST value format
function toFV(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFV) } };
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFV(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Write a document to Firestore via REST with API key
async function writeDoc(collection: string, data: Record<string, any>): Promise<boolean> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toFV(v);
  fields.createdAt = { timestampValue: new Date().toISOString() };

  try {
    const res = await fetch(`${BASE}/${collection}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Firestore write to ${collection} failed (${res.status}):`, err);
    }
    return res.ok;
  } catch (e: any) {
    console.error(`Firestore write error (${collection}):`, e.message);
    return false;
  }
}

// Sanitize string input
function clean(val: any, max = 500): string {
  return val ? String(val).trim().slice(0, max) : '';
}

// Escape HTML entities to prevent injection in email templates
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// CSRF VALIDATION (improved — checks origin + referer fallback)
// ============================================================
function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const source = origin || referer;

  // If no origin/referer at all, allow (same-origin requests may omit these)
  if (!source) return true;

  try {
    const hostname = new URL(source).hostname;
    return ALLOWED_ORIGINS.some(allowed =>
      hostname === allowed || hostname.endsWith('.' + allowed)
    );
  } catch {
    // Malformed URL in origin/referer header
    return false;
  }
}

// Email wrapper template
function emailWrap(title: string, icon: string, body: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
  <div style="background:#1e3a5f;padding:24px 30px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:20px;">${icon} ${title}</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Ghareeb Fencing Solutions</p>
  </div>
  <div style="padding:24px 30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Sent automatically from <a href="https://ghareebfencing.com" style="color:#3b82f6;">ghareebfencing.com</a>
    </p>
  </div>
</div>`;
}

function row(label: string, value: string, highlight = false): string {
  const bg = highlight ? 'background:#f8fafc;' : '';
  return `<tr style="${bg}"><td style="padding:10px 12px;font-weight:600;color:#1e3a5f;white-space:nowrap;vertical-align:top;width:130px;">${label}</td><td style="padding:10px 12px;color:#334155;">${value || '<span style="color:#94a3b8;">—</span>'}</td></tr>`;
}

function table(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">${rows}</table>`;
}

function linkPhone(p: string): string { return p ? `<a href="tel:${esc(p)}" style="color:#3b82f6;text-decoration:none;">${esc(p)}</a>` : '—'; }
function linkEmail(e: string): string { return e ? `<a href="mailto:${esc(e)}" style="color:#3b82f6;text-decoration:none;">${esc(e)}</a>` : '—'; }

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    // ── Payload size limit ──
    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers });
    }

    // ── CSRF: Check origin/referer header ──
    if (!isValidOrigin(request)) {
      console.error(`CSRF blocked: origin=${request.headers.get('origin')} referer=${request.headers.get('referer')}`);
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
    }

    // ── Rate limiting ──
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             || request.headers.get('x-nf-client-connection-ip')
             || 'unknown';
    if (isRateLimited(ip)) {
      console.error(`Rate limited: ${ip}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), { status: 429, headers });
    }

    const body = await request.json();
    const { type } = body;

    // ── Honeypot: reject if hidden field filled ──
    if (body.website || body.company_name) {
      return new Response(JSON.stringify({ success: true, message: 'Submission received' }), { status: 200, headers });
    }

    if (!type) {
      return new Response(JSON.stringify({ error: 'Missing submission type' }), { status: 400, headers });
    }

    let success = false;
    let emailSubject = '';
    let emailHtml = '';

    switch (type) {
      // =========================================================
      // CONTACT FORM
      // =========================================================
      case 'contact': {
        const name = clean(body.name, 200);
        const phone = clean(body.phone, 50);
        const email = clean(body.email, 200);
        const message = clean(body.message, 2000);
        const fenceType = clean(body.fenceType || body.subject, 100);
        const address = clean(body.address, 500);

        if (!name || !phone) {
          return new Response(JSON.stringify({ error: 'Name and phone required' }), { status: 400, headers });
        }
        if (!PHONE_RE.test(phone)) {
          return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers });
        }
        if (email && !EMAIL_RE.test(email)) {
          return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
        }

        success = await writeDoc('websiteLeads', {
          name, phone, email, address,
          fenceType,
          notes: message,
          source: 'contact-form',
          status: 'new'
        });

        emailSubject = `New Contact Form: ${esc(name)}`;
        emailHtml = emailWrap('New Contact Submission', '📩', `
          ${table(
            row('Name', esc(name)) +
            row('Phone', linkPhone(phone), true) +
            row('Email', linkEmail(email)) +
            row('Fence Interest', esc(fenceType) || '—', true) +
            row('Message', esc(message) || '—')
          )}
        `);
        break;
      }

      // =========================================================
      // APPOINTMENT BOOKING
      // =========================================================
      case 'booking': {
        const name = clean(body.name, 200);
        const phone = clean(body.phone, 50);
        const email = clean(body.email, 200);
        const address = clean(body.address, 500);
        const date = clean(body.date, 20);
        const time = clean(body.time, 20);
        const project = clean(body.project, 200);
        const notes = clean(body.notes, 2000);

        if (!name || !phone || !date || !time) {
          return new Response(JSON.stringify({ error: 'Name, phone, date, and time required' }), { status: 400, headers });
        }
        if (!PHONE_RE.test(phone)) {
          return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers });
        }
        if (email && !EMAIL_RE.test(email)) {
          return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
        }

        success = await writeDoc('bookings', {
          name, phone, email, address, project, notes,
          date, time,
          source: 'website-booking',
          status: 'pending'
        });

        if (success) {
          await writeDoc('websiteLeads', {
            name, phone, email, address,
            fenceType: project,
            appointmentDate: date,
            appointmentTime: time,
            notes,
            source: 'website-booking',
            status: 'new'
          });
        }

        emailSubject = `New Booking: ${esc(name)} — ${esc(date)} at ${esc(time)}`;
        emailHtml = emailWrap('New Appointment Booking', '📅', `
          <div style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#059669;">📅 ${esc(date)}</div>
            <div style="font-size:18px;color:#065f46;margin-top:4px;">at ${esc(time)}</div>
          </div>
          ${table(
            row('Name', esc(name)) +
            row('Phone', linkPhone(phone), true) +
            row('Email', linkEmail(email)) +
            row('Address', esc(address), true) +
            row('Project', esc(project) || '—') +
            row('Notes', esc(notes) || '—', true)
          )}
        `);
        break;
      }

      // =========================================================
      // BALLPARK CALCULATOR LEAD
      // =========================================================
      case 'lead': {
        const name = clean(body.name, 200);
        const phone = clean(body.phone, 50);
        const email = clean(body.email, 200);
        const address = clean(body.address, 500);
        const notes = clean(body.notes, 2000);
        const fenceType = clean(body.fenceType, 100);
        const fenceHeight = Number(body.fenceHeight) || 6;
        const fenceLength = Number(body.fenceLength) || 0;
        const singleGates = Number(body.singleGates) || 0;
        const doubleGates = Number(body.doubleGates) || 0;
        const estimateLow = Number(body.estimateLow) || 0;
        const estimateHigh = Number(body.estimateHigh) || 0;
        const estimatedRange = clean(body.estimatedRange, 50);

        if (!name || !phone) {
          return new Response(JSON.stringify({ error: 'Name and phone required' }), { status: 400, headers });
        }
        if (!PHONE_RE.test(phone)) {
          return new Response(JSON.stringify({ error: 'Invalid phone number' }), { status: 400, headers });
        }
        if (email && !EMAIL_RE.test(email)) {
          return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
        }

        success = await writeDoc('websiteLeads', {
          name, phone, email, address,
          fenceType,
          ballparkQuote: {
            low: estimateLow,
            high: estimateHigh,
            feet: fenceLength,
            type: fenceType,
            height: fenceHeight,
            sg: singleGates,
            dg: doubleGates
          },
          notes,
          source: 'ballpark-calculator',
          status: 'new'
        });

        emailSubject = `New Ballpark Lead: ${esc(name)} — ${esc(fenceType)}`;
        emailHtml = emailWrap('New Ballpark Calculator Lead', '💰', `
          <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
            <div style="font-size:14px;color:#1e40af;text-transform:uppercase;letter-spacing:1px;">Estimated Range</div>
            <div style="font-size:28px;font-weight:700;color:#1e3a5f;margin-top:4px;">${esc(estimatedRange)}</div>
          </div>
          <h3 style="color:#1e3a5f;margin:20px 0 10px;font-size:15px;">👤 Contact Info</h3>
          ${table(
            row('Name', esc(name)) +
            row('Phone', linkPhone(phone), true) +
            row('Email', linkEmail(email)) +
            row('Address', esc(address), true)
          )}
          <h3 style="color:#1e3a5f;margin:20px 0 10px;font-size:15px;">🏗️ Quote Details</h3>
          ${table(
            row('Fence Type', esc(fenceType)) +
            row('Height', fenceHeight + ' ft', true) +
            row('Length', fenceLength ? fenceLength + ' ft' : '—') +
            row('Walk Gates', String(singleGates), true) +
            row('Drive Gates', String(doubleGates)) +
            row('Estimate', `<strong style="color:#059669;font-size:16px;">${esc(estimatedRange)}</strong>`, true)
          )}
          ${notes ? `<p style="margin:16px 0 0;color:#475569;"><strong>Notes:</strong> ${esc(notes)}</p>` : ''}
        `);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown submission type' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
    }

    // Write email doc to 'mail' collection (Firebase Trigger Email extension)
    if (success && emailSubject) {
      const emailOk = await writeDoc('mail', {
        to: NOTIFY_EMAIL,
        message: { subject: emailSubject, html: emailHtml }
      });
      if (!emailOk) console.error('Failed to queue email notification');
    }

    return new Response(JSON.stringify({
      success,
      message: success ? 'Submission received' : 'Failed to save'
    }), {
      status: success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Submit API error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
