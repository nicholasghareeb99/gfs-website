// Automated guard for Ghareeb Fencing Solutions business facts.
// Scans page sources, templates, data files, JSON-LD structured data, and email functions.
// Runs under `npm test` (node:test, no external dependencies).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FACTS = {
  phoneDisplay: '(419) 214-2107',
  phoneDigits: '4192142107',
  street: '5242 Tractor Rd Suite C',
  city: 'Toledo',
  state: 'OH',
  zip: '43612',
  address: '5242 Tractor Rd Suite C, Toledo, OH 43612',
  email: 'nick@ghareebfence.com',
  founded: '2022',
  openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  opens: '08:00',
  closes: '18:00',
};

const FORBIDDEN = [
  {
    label: 'owner cell number (419-902-8257)',
    testLine(text) {
      if (/(?:(?:\+?1[\s.\-()\/]*)?419[\s.\-()\/]*902[\s.\-()\/]*8257|(?<!\d)902[\s.\-()]*8257(?!\d))/.test(text)) {
        return true;
      }
      return text.replace(/\D/g, '').includes('419' + '902' + '8257');
    },
  },
  {
    label: 'former address (3823 Bowen Rd)',
    testLine(text) {
      return /\b3823\b[\s,.-]*bowen(?:\s+(?:rd\.?|road))?\b/i.test(text)
        || /\bbowen\s+(?:rd\.?|road)\b/i.test(text);
    },
  },
  {
    label: 'former address (2910 N 109th St)',
    testLine(text) {
      return /\b2910\b[\s,.-]*(?:n\.?|north)\s*109(?:th)?(?:\s+(?:st\.?|street))?\b/i.test(text)
        || /\b2910\b.{0,12}\b109(?:th)?\b/i.test(text);
    },
  },
  {
    label: 'former email (info@ghareebfencingsolutions.com)',
    testLine(text) {
      return /info\s*(?:@|%40|\[at\])\s*ghareebfencingsolutions\.com/i.test(text);
    },
  },
  {
    label: 'former email (ng.ghareebfencingsolutions@outlook.com)',
    testLine(text) {
      return /ng\.ghareebfencingsolutions\s*(?:@|%40|\[at\])\s*outlook\.com/i.test(text);
    },
  },
];

const SCAN_ROOTS = ['public', 'src', 'netlify/functions'];
const TEXT_EXT = /\.(?:html|htm|astro|json|js|mjs|cjs|ts|txt|xml)$/i;
const SKIP_DIRS = new Set(['vendor', 'node_modules', '.git']);

function toRel(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function walkFiles(relDir) {
  const start = path.join(ROOT, relDir);
  if (!fs.existsSync(start)) return [];
  const results = [];
  const stack = [start];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(full);
      } else if (TEXT_EXT.test(entry.name)) {
        results.push({ rel: toRel(full), full });
      }
    }
  }
  return results.sort((a, b) => a.rel.localeCompare(b.rel));
}

function collectSources() {
  return SCAN_ROOTS.flatMap(walkFiles).map((file) => ({
    rel: file.rel,
    text: fs.readFileSync(file.full, 'utf8'),
  }));
}

function stripBase64(line) {
  return line.replace(/data:image\/[^"'\\]+;base64,[A-Za-z0-9+/=]+/g, '[DATA_URI]');
}

function decodeLine(line) {
  let out = stripBase64(line)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;|&#x2013;|&#x2014;/gi, '-')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  try {
    if (/%[0-9a-f]{2}/i.test(out)) out = decodeURIComponent(out);
  } catch {
    // Keep partially decoded text when unrelated percent signs appear.
  }
  return out;
}

function lineNumberAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function findFieldLine(text, key, value, startOffset = 0) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const slice = text.slice(startOffset);
  if (value !== undefined && value !== null) {
    const escapedVal = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = slice.match(new RegExp(`"${escapedKey}"\\s*:\\s*"?${escapedVal}"?`));
    if (exact && exact.index !== undefined) return lineNumberAt(text, startOffset + exact.index);
  }
  const keyOnly = slice.match(new RegExp(`"${escapedKey}"\\s*:`));
  if (keyOnly && keyOnly.index !== undefined) return lineNumberAt(text, startOffset + keyOnly.index);
  return lineNumberAt(text, startOffset);
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const rawBody = match[1];
    const bodyOffset = match.index + match[0].indexOf(rawBody);
    const cleaned = rawBody.replaceAll('<\\/', '</');
    blocks.push({
      raw: rawBody,
      cleaned,
      startOffset: bodyOffset,
      startLine: lineNumberAt(html, bodyOffset),
    });
  }
  return blocks;
}

function* walkBusinessNodes(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) yield* walkBusinessNodes(item);
    return;
  }
  const types = [node['@type']].flat().filter(Boolean).map(String);
  const isBizType = types.some((t) => /LocalBusiness|HomeAndConstructionBusiness|Organization/i.test(t));
  const isGfs = !node.name || /Ghareeb Fencing Solutions/i.test(String(node.name));
  if (isBizType && isGfs) yield node;
  for (const val of Object.values(node)) {
    if (val && typeof val === 'object') yield* walkBusinessNodes(val);
  }
}

function scanForbidden(sources) {
  const issues = [];
  for (const { rel, text } of sources) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const cleaned = stripBase64(lines[i]);
      const decoded = decodeLine(lines[i]);
      for (const rule of FORBIDDEN) {
        if (rule.testLine(cleaned) || rule.testLine(decoded)) {
          issues.push(`${rel}:${i + 1}: forbidden ${rule.label} appears`);
        }
      }
    }
  }
  return issues;
}

function scanPhones(sources) {
  const issues = [];
  const mustHavePhone = new Set([
    'public/index.html',
    'public/contact/index.html',
    'public/llms.txt',
    'public/assets/js/estimate-pdf.js',
    'public/showroom/blueprint.mjs',
    'public/showroom/siteplan.mjs',
    'public/showroom/visit.mjs',
    'src/content/site.json',
    'src/content/contact.json',
    'netlify/functions/ballpark-email.mjs',
  ]);

  for (const { rel, text } of sources) {
    const lines = text.split(/\r?\n/);

    // 1. Check tel: and sms: links and plain-text phone numbers (skip dynamic templates and municipal permit sections).
    if (!rel.endsWith('PermitLookup.astro') && !rel.endsWith('permits.json')) {
      for (let i = 0; i < lines.length; i++) {
        const line = stripBase64(lines[i]);
        for (const match of line.matchAll(/(?:tel|sms):([^"'\s<>?)|]+)/gi)) {
          const target = match[1];
          if (target.includes('${') || target.includes('{') || target === '+') continue;
          const digits = normalizePhone(target);
          if (!digits) continue;
          if (digits !== FACTS.phoneDigits) {
            issues.push(`${rel}:${i + 1}: contact link "${match[0]}" does not match ${FACTS.phoneDisplay}`);
          }
        }
        if (/municipal-permit|data-gfs-sec="fence-rules"|zoning office/i.test(line)) continue;
        for (const match of line.matchAll(/(?<!\d)(?:\+?1[-.\s]?)?\(?([2-9]\d{2})\)?[-.\s](\d{3})[-.\s](\d{4})(?!\d)/g)) {
          const digits = `${match[1]}${match[2]}${match[3]}`;
          if (digits === FACTS.phoneDigits || match[2] === '555') continue;
          issues.push(`${rel}:${i + 1}: unexpected phone number "${match[0]}" (expected ${FACTS.phoneDisplay})`);
        }
      }
    }

    // 2. Check JSON-LD telephone fields on Ghareeb business nodes.
    if (rel.endsWith('.html')) {
      for (const block of extractJsonLdBlocks(text)) {
        let parsed;
        try {
          parsed = JSON.parse(block.cleaned);
        } catch (err) {
          issues.push(`${rel}:${block.startLine}: invalid JSON-LD (${err.message})`);
          continue;
        }
        for (const node of walkBusinessNodes(parsed)) {
          if (node.telephone && normalizePhone(node.telephone) !== FACTS.phoneDigits) {
            const ln = findFieldLine(text, 'telephone', node.telephone, block.startOffset);
            issues.push(`${rel}:${ln}: JSON-LD telephone "${node.telephone}" does not match ${FACTS.phoneDisplay}`);
          }
        }
      }

      // 3. Check page footer phone.
      const footerMatch = text.match(/<footer class="footer">([\s\S]*?)<\/footer>/);
      if (footerMatch) {
        const footerLine = lineNumberAt(text, footerMatch.index);
        if (!footerMatch[1].includes(FACTS.phoneDisplay)) {
          issues.push(`${rel}:${footerLine}: footer is missing phone ${FACTS.phoneDisplay}`);
        }
      }
    }

    // 4. Check structured site and contact data files.
    if (rel === 'src/content/site.json' || rel === 'src/content/contact.json') {
      const data = JSON.parse(text);
      const entries = rel === 'src/content/site.json'
        ? [
            ['phone', data.company?.phone],
            ['phoneRaw', data.company?.phoneRaw],
          ]
        : [
            ['display', data.contactInfo?.phone?.display],
            ['href', data.contactInfo?.phone?.href],
            ['buttonHref', data.callToAction?.buttonHref],
          ];
      for (const [key, val] of entries) {
        if (!val || normalizePhone(val) !== FACTS.phoneDigits) {
          const ln = findFieldLine(text, key, val);
          issues.push(`${rel}:${ln}: ${key} "${val}" does not match ${FACTS.phoneDisplay}`);
        }
      }
    }

    // 5. Check key files that must carry the office phone.
    if (mustHavePhone.has(rel) && !text.includes(FACTS.phoneDisplay)) {
      issues.push(`${rel}:1: expected phone ${FACTS.phoneDisplay} is missing`);
    }
  }
  return issues;
}

function scanEmails(sources) {
  const issues = [];
  const mustHaveEmail = new Set([
    'public/index.html',
    'public/contact/index.html',
    'public/llms.txt',
    'public/assets/js/estimate-pdf.js',
    'public/showroom/blueprint.mjs',
    'public/showroom/siteplan.mjs',
    'src/content/site.json',
    'src/content/contact.json',
    'netlify/functions/ballpark-email.mjs',
  ]);
  const ALLOWED_PLACEHOLDER = /^(?:you|name|john|your\.email|customer|example)@(?:example|email|gmail)\.(?:com|test)$/i;

  for (const { rel, text } of sources) {
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const clean = stripBase64(lines[i]);

      // 1. Check mailto: links (ignoring URL-scheme allowlist regexes like /mailto:|tel:/).
      for (const match of clean.matchAll(/href=["']mailto:([^"'?]+)|mailto:([a-zA-Z0-9._%+-]+@[^"'\s<>?)|]+)/gi)) {
        const addr = match[1] || match[2];
        if (!addr || addr.includes('${') || addr.includes('{')) continue;
        if (addr.toLowerCase() !== FACTS.email) {
          issues.push(`${rel}:${i + 1}: mailto link "mailto:${addr}" does not match ${FACTS.email}`);
        }
      }

      // 2. Any literal @ghareeb* email must be nick@ghareebfence.com; no personal gmail/outlook emails.
      for (const match of clean.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g)) {
        const addr = match[1];
        const lower = addr.toLowerCase();
        if (lower === FACTS.email || ALLOWED_PLACEHOLDER.test(lower)) continue;
        if (/@[a-z0-9.-]*ghareeb[a-z0-9.-]*\./i.test(lower)) {
          issues.push(`${rel}:${i + 1}: unexpected business email "${addr}" (expected ${FACTS.email})`);
        } else if (/@(?:gmail|outlook|hotmail|yahoo)\.com$/i.test(lower)) {
          issues.push(`${rel}:${i + 1}: personal email "${addr}" appears in site source`);
        }
      }
    }

    // 3. Check JSON-LD email fields.
    if (rel.endsWith('.html')) {
      for (const block of extractJsonLdBlocks(text)) {
        let parsed;
        try {
          parsed = JSON.parse(block.cleaned);
        } catch {
          continue;
        }
        for (const node of walkBusinessNodes(parsed)) {
          if (node.email && String(node.email).toLowerCase() !== FACTS.email) {
            const ln = findFieldLine(text, 'email', node.email, block.startOffset);
            issues.push(`${rel}:${ln}: JSON-LD email "${node.email}" does not match ${FACTS.email}`);
          }
        }
      }

      const footerMatch = text.match(/<footer class="footer">([\s\S]*?)<\/footer>/);
      if (footerMatch) {
        const footerLine = lineNumberAt(text, footerMatch.index);
        if (!footerMatch[1].includes(FACTS.email)) {
          issues.push(`${rel}:${footerLine}: footer is missing email ${FACTS.email}`);
        }
      }
    }

    // 4. Check structured data files.
    if (rel === 'src/content/site.json') {
      const data = JSON.parse(text);
      if (data.company?.email !== FACTS.email) {
        issues.push(`${rel}:${findFieldLine(text, 'email', data.company?.email)}: company.email "${data.company?.email}" does not match ${FACTS.email}`);
      }
    }
    if (rel === 'src/content/contact.json') {
      const data = JSON.parse(text);
      for (const [key, val] of [
        ['display', data.contactInfo?.email?.display],
        ['href', data.contactInfo?.email?.href],
      ]) {
        const expected = key === 'href' ? `mailto:${FACTS.email}` : FACTS.email;
        if (val !== expected) {
          issues.push(`${rel}:${findFieldLine(text, key, val)}: contactInfo.email.${key} "${val}" does not match ${expected}`);
        }
      }
    }

    if (mustHaveEmail.has(rel) && !text.includes(FACTS.email)) {
      issues.push(`${rel}:1: expected email ${FACTS.email} is missing`);
    }
  }
  return issues;
}

function scanAddresses(sources) {
  const issues = [];
  const warnings = [];
  const mustHaveFullAddress = new Set([
    'public/llms.txt',
    'public/assets/js/estimate-pdf.js',
    'public/showroom/blueprint.mjs',
    'public/showroom/siteplan.mjs',
    'netlify/functions/ballpark-email.mjs',
  ]);

  for (const { rel, text } of sources) {
    // 1. JSON-LD PostalAddress checks.
    if (rel.endsWith('.html')) {
      for (const block of extractJsonLdBlocks(text)) {
        let parsed;
        try {
          parsed = JSON.parse(block.cleaned);
        } catch {
          continue;
        }
        for (const node of walkBusinessNodes(parsed)) {
          const addr = node.address;
          if (!addr || typeof addr !== 'object') continue;
          if (addr.streetAddress !== FACTS.street) {
            const ln = findFieldLine(text, 'streetAddress', addr.streetAddress, block.startOffset);
            issues.push(`${rel}:${ln}: JSON-LD streetAddress "${addr.streetAddress}" must be "${FACTS.street}"`);
          }
          if (addr.addressLocality !== FACTS.city) {
            const ln = findFieldLine(text, 'addressLocality', addr.addressLocality, block.startOffset);
            issues.push(`${rel}:${ln}: JSON-LD addressLocality "${addr.addressLocality}" must be "${FACTS.city}"`);
          }
          if (addr.addressRegion !== FACTS.state) {
            const ln = findFieldLine(text, 'addressRegion', addr.addressRegion, block.startOffset);
            issues.push(`${rel}:${ln}: JSON-LD addressRegion "${addr.addressRegion}" must be "${FACTS.state}"`);
          }
          if (String(addr.postalCode) !== FACTS.zip) {
            const ln = findFieldLine(text, 'postalCode', addr.postalCode, block.startOffset);
            issues.push(`${rel}:${ln}: JSON-LD postalCode "${addr.postalCode}" must be "${FACTS.zip}"`);
          }
        }
      }

      // 2. Footer office address check.
      const footerMatch = text.match(/<footer class="footer">([\s\S]*?)<\/footer>/);
      if (footerMatch) {
        const footerLine = lineNumberAt(text, footerMatch.index);
        if (!footerMatch[1].includes(FACTS.street) || !footerMatch[1].includes(`${FACTS.city}, ${FACTS.state} ${FACTS.zip}`)) {
          issues.push(`${rel}:${footerLine}: footer is missing office address "${FACTS.address}"`);
        }
      }
    }

    // 3. Structured address fields in data files.
    if (rel === 'src/content/contact.json') {
      const addr = JSON.parse(text).contactInfo?.address || {};
      if (addr.street !== FACTS.street) {
        issues.push(`${rel}:${findFieldLine(text, 'street', addr.street)}: contactInfo.address.street "${addr.street}" must be "${FACTS.street}"`);
      }
      if (addr.city !== FACTS.city) {
        issues.push(`${rel}:${findFieldLine(text, 'city', addr.city)}: contactInfo.address.city "${addr.city}" must be "${FACTS.city}"`);
      }
      if (addr.state !== FACTS.state) {
        issues.push(`${rel}:${findFieldLine(text, 'state', addr.state)}: contactInfo.address.state "${addr.state}" must be "${FACTS.state}"`);
      }
      if (String(addr.zip) !== FACTS.zip) {
        issues.push(`${rel}:${findFieldLine(text, 'zip', addr.zip)}: contactInfo.address.zip "${addr.zip}" must be "${FACTS.zip}"`);
      }
    }
    if (rel === 'src/content/site.json') {
      const addr = JSON.parse(text).company?.address || {};
      if (addr.street && addr.street !== FACTS.street) {
        issues.push(`${rel}:${findFieldLine(text, 'street', addr.street)}: company.address.street "${addr.street}" must be "${FACTS.street}"`);
      } else if (!addr.street) {
        warnings.push(`${rel}:${findFieldLine(text, 'address')}: company.address omits street and zip`);
      }
      if (addr.city && addr.city !== FACTS.city) {
        issues.push(`${rel}:${findFieldLine(text, 'city', addr.city)}: company.address.city "${addr.city}" must be "${FACTS.city}"`);
      }
      if (addr.state && addr.state !== FACTS.state) {
        issues.push(`${rel}:${findFieldLine(text, 'state', addr.state)}: company.address.state "${addr.state}" must be "${FACTS.state}"`);
      }
      if (addr.zip && String(addr.zip) !== FACTS.zip) {
        issues.push(`${rel}:${findFieldLine(text, 'zip', addr.zip)}: company.address.zip "${addr.zip}" must be "${FACTS.zip}"`);
      }
    }

    // 4. Any Tractor Rd reference should include Suite C (placeholders flagged instead of failed).
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (/tractor\s+(?:rd\.?|road)/i.test(lines[i]) && !lines[i].includes(FACTS.street)) {
        if (/placeholder=/i.test(lines[i])) {
          warnings.push(`${rel}:${i + 1}: placeholder uses shortened address without "Suite C"`);
        } else {
          issues.push(`${rel}:${i + 1}: address mention does not match "${FACTS.street}"`);
        }
      }
    }

    if (mustHaveFullAddress.has(rel) && !text.includes(FACTS.address)) {
      issues.push(`${rel}:1: expected address "${FACTS.address}" is missing`);
    }
  }
  return { issues, warnings };
}

function checkOpeningHoursSpec(spec, rel, text, startOffset) {
  const issues = [];
  const entries = [spec].flat().filter(Boolean);
  const byDay = new Map();
  for (const entry of entries) {
    const days = [entry.dayOfWeek].flat().filter(Boolean).map((d) => String(d).split('/').at(-1));
    for (const day of days) {
      byDay.set(day, { opens: String(entry.opens || ''), closes: String(entry.closes || '') });
    }
  }
  const ln = findFieldLine(text, 'openingHoursSpecification', undefined, startOffset);
  if (byDay.has('Sunday')) {
    const sun = byDay.get('Sunday');
    if (sun.opens !== '00:00' || sun.closes !== '00:00') {
      issues.push(`${rel}:${ln}: JSON-LD openingHoursSpecification lists Sunday as open (${sun.opens}-${sun.closes}); must be closed Sunday`);
    }
    byDay.delete('Sunday');
  }
  for (const day of FACTS.openDays) {
    const slot = byDay.get(day);
    if (!slot) {
      issues.push(`${rel}:${ln}: JSON-LD openingHoursSpecification is missing ${day}`);
    } else if (slot.opens !== FACTS.opens || slot.closes !== FACTS.closes) {
      issues.push(`${rel}:${ln}: JSON-LD openingHoursSpecification for ${day} is ${slot.opens}-${slot.closes} (expected ${FACTS.opens}-${FACTS.closes})`);
    }
  }
  for (const day of byDay.keys()) {
    if (!FACTS.openDays.includes(day)) {
      issues.push(`${rel}:${ln}: JSON-LD openingHoursSpecification has unexpected day "${day}"`);
    }
  }
  return issues;
}

function scanHours(sources) {
  const issues = [];
  const warnings = [];
  let footerShortHoursCount = 0;
  let firstFooterShortHours = null;

  for (const { rel, text } of sources) {
    // 1. Strict check: JSON-LD openingHoursSpecification and openingHours.
    if (rel.endsWith('.html')) {
      for (const block of extractJsonLdBlocks(text)) {
        let parsed;
        try {
          parsed = JSON.parse(block.cleaned);
        } catch {
          continue;
        }
        for (const node of walkBusinessNodes(parsed)) {
          if (node.openingHoursSpecification) {
            issues.push(...checkOpeningHoursSpec(node.openingHoursSpecification, rel, text, block.startOffset));
          }
          if (node.openingHours) {
            const raw = [node.openingHours].flat().join('; ');
            if (!/^Mo-Sa\s+0?8:00-18:00$/i.test(raw.trim())) {
              const ln = findFieldLine(text, 'openingHours', undefined, block.startOffset);
              issues.push(`${rel}:${ln}: JSON-LD openingHours "${raw}" does not match Mon-Sat 08:00-18:00`);
            }
          }
        }
      }
    }

    // 2. Strict check: structured businessHours in src/content/contact.json.
    if (rel === 'src/content/contact.json') {
      const hours = JSON.parse(text).businessHours?.hours;
      if (Array.isArray(hours)) {
        const monSat = hours.find((h) => /^monday\s*[-–—to]+\s*saturday$/i.test(String(h.days || '').trim()));
        const sun = hours.find((h) => /^sunday$/i.test(String(h.days || '').trim()));
        const ln = findFieldLine(text, 'businessHours');
        if (!monSat || !/^8(?::00)?\s*am\s*[-–—to]+\s*6(?::00)?\s*pm$/i.test(String(monSat.time || '').trim())) {
          issues.push(`${rel}:${ln}: businessHours.hours must list Monday - Saturday 8:00 AM - 6:00 PM`);
        }
        if (!sun || !/^closed$/i.test(String(sun.time || '').trim())) {
          issues.push(`${rel}:${ln}: businessHours.hours must list Sunday Closed`);
        }
      }
    }

    // 3. Flag odd hours wording in templates, data files, and pages (do NOT fail on wording).
    if (rel.endsWith('permits.json')) continue;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/openingHoursSpecification|municipal-permit/.test(line)) continue;
      if (/<li>Mon[–-]Sat\s*·\s*8am\s*[–-]\s*6pm<\/li>/i.test(line)) {
        footerShortHoursCount++;
        if (!firstFooterShortHours) firstFooterShortHours = `${rel}:${i + 1}`;
        continue;
      }
      if (/\b(?:mon(?:day)?\s*[-–—to]+\s*fri(?:day)?|mon(?:day)?\s*[-–—to]+\s*sun(?:day)?|closed\s+sat(?:urday)?|open\s+sun(?:day)?|7\s*days\s*a\s*week|24\/7)\b/i.test(line)) {
        warnings.push(`${rel}:${i + 1}: odd hours wording: ${line.trim().slice(0, 120)}`);
      }
    }
  }

  if (footerShortHoursCount > 0) {
    warnings.push(`${firstFooterShortHours} (+${footerShortHoursCount - 1} other page footers): hours say "Mon–Sat · 8am – 6pm" without explicitly noting "Closed Sunday"`);
  }

  return { issues, warnings };
}

function scanFounded(sources, { requireHomeAndAbout = true } = {}) {
  const issues = [];
  const warnings = [];
  let homeHasSchemaFounded = false;

  for (const { rel, text } of sources) {
    // 1. JSON-LD foundingDate.
    if (rel.endsWith('.html')) {
      for (const block of extractJsonLdBlocks(text)) {
        let parsed;
        try {
          parsed = JSON.parse(block.cleaned);
        } catch {
          continue;
        }
        for (const node of walkBusinessNodes(parsed)) {
          if (node.foundingDate !== undefined) {
            if (String(node.foundingDate) !== FACTS.founded) {
              const ln = findFieldLine(text, 'foundingDate', node.foundingDate, block.startOffset);
              issues.push(`${rel}:${ln}: JSON-LD foundingDate "${node.foundingDate}" must be "${FACTS.founded}"`);
            } else if (rel === 'public/index.html') {
              homeHasSchemaFounded = true;
            }
          }
        }
      }
    }

    // 2. Structured founded year in src/content/about.json.
    if (rel === 'src/content/about.json') {
      const data = JSON.parse(text);
      if (data.company?.established !== undefined && String(data.company.established) !== FACTS.founded) {
        const ln = findFieldLine(text, 'established', data.company.established);
        issues.push(`${rel}:${ln}: company.established is ${data.company.established} (must be ${FACTS.founded})`);
      }
      if (Array.isArray(data.history?.timeline)) {
        for (const item of data.history.timeline) {
          const aboutFounding = /\bfounded\b/i.test(`${item.title || ''} ${item.description || ''}`);
          if (aboutFounding && String(item.year) !== FACTS.founded) {
            const ln = findFieldLine(text, 'year', item.year);
            issues.push(`${rel}:${ln}: history.timeline "${item.title}" lists founding year ${item.year} (must be ${FACTS.founded})`);
          } else if (Number(item.year) < Number(FACTS.founded)) {
            const ln = findFieldLine(text, 'year', item.year);
            warnings.push(`${rel}:${ln}: history.timeline includes pre-${FACTS.founded} milestone (${item.year}: "${item.title}")`);
          }
        }
      }
      if (/decade|10\s+year/i.test(String(data.history?.headline || ''))) {
        warnings.push(`${rel}:${findFieldLine(text, 'headline')}: history.headline "${data.history.headline}" conflicts with founded ${FACTS.founded}`);
      }
    }

    // 3. Text claims of founded/since/established year.
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const clean = stripBase64(lines[i]);
      for (const match of clean.matchAll(/\b(?:founded(?:\s+ghareeb\s+fencing\s+solutions)?\s+in|established\s+in|est\.?\s*|since)\s+(20\d{2}|19\d{2})\b/gi)) {
        if (match[1] !== FACTS.founded) {
          issues.push(`${rel}:${i + 1}: "${match[0]}" conflicts with founded year ${FACTS.founded}`);
        }
      }
    }
  }

  if (requireHomeAndAbout) {
    if (!homeHasSchemaFounded) {
      issues.push(`public/index.html:1: home JSON-LD is missing foundingDate "${FACTS.founded}"`);
    }
    const aboutPage = sources.find((s) => s.rel === 'public/about/index.html');
    if (aboutPage && !/founded\s+Ghareeb\s+Fencing\s+Solutions\s+in\s+2022/i.test(aboutPage.text)) {
      issues.push('public/about/index.html:1: About page does not state founded in 2022');
    }
    const llms = sources.find((s) => s.rel === 'public/llms.txt');
    if (llms && !/Founded in 2022/i.test(llms.text)) {
      issues.push('public/llms.txt:1: llms.txt does not state Founded in 2022');
    }
  }

  return { issues, warnings };
}

const ALL_SOURCES = collectSources();
const PUBLISHED_SOURCES = ALL_SOURCES.filter((s) => s.rel.startsWith('public/') || s.rel.startsWith('netlify/'));
const TEMPLATE_AND_DATA_SOURCES = ALL_SOURCES.filter((s) => s.rel.startsWith('src/'));

test('forbidden phone, addresses and emails never appear in any format', () => {
  const issues = scanForbidden(ALL_SOURCES);
  assert.deepEqual(issues, [], `Forbidden business details found:\n${issues.join('\n')}`);
});

test('phone numbers in links, structured data, data files and page footers match (419) 214-2107', () => {
  const issues = scanPhones(ALL_SOURCES);
  assert.deepEqual(issues, [], `Phone number violations found:\n${issues.join('\n')}`);
});

test('business email in links, structured data, data files and page footers is nick@ghareebfence.com', () => {
  const issues = scanEmails(ALL_SOURCES);
  assert.deepEqual(issues, [], `Email violations found:\n${issues.join('\n')}`);
});

test('business address in structured data, data files and page footers is 5242 Tractor Rd Suite C, Toledo, OH 43612', (t) => {
  const { issues, warnings } = scanAddresses(ALL_SOURCES);
  for (const note of warnings) t.diagnostic(`address note: ${note}`);
  assert.deepEqual(issues, [], `Address violations found:\n${issues.join('\n')}`);
});

test('structured business hours are Mon-Sat 8 AM-6 PM, closed Sunday (odd wording flagged, not failed)', (t) => {
  const { issues, warnings } = scanHours(ALL_SOURCES);
  for (const note of warnings) t.diagnostic(`hours wording flag: ${note}`);
  assert.deepEqual(issues, [], `Structured hours violations found:\n${issues.join('\n')}`);
});

test('founded year in published pages and JSON-LD is 2022', (t) => {
  const { issues, warnings } = scanFounded(PUBLISHED_SOURCES, { requireHomeAndAbout: true });
  for (const note of warnings) t.diagnostic(`founded note: ${note}`);
  assert.deepEqual(issues, [], `Published founded year violations found:\n${issues.join('\n')}`);
});

test('founded year in repo templates and data files is 2022', (t) => {
  const { issues, warnings } = scanFounded(TEMPLATE_AND_DATA_SOURCES, { requireHomeAndAbout: false });
  for (const note of warnings) t.diagnostic(`founded note: ${note}`);
  assert.deepEqual(issues, [], `Template/data founded year violations found:\n${issues.join('\n')}`);
});

test('guard catches forbidden and wrong business facts with file and line (synthetic fixtures)', () => {
  const badCell = ['419', '902', '8257'];
  const badBowen = ['3823', 'Bowen', 'Rd'].join(' ');
  const badNorth = ['2910', 'N', '109th', 'St'].join(' ');
  const badInfo = ['info', 'ghareebfencingsolutions.com'].join('@');
  const badOutlook = ['ng.ghareebfencingsolutions', 'outlook.com'].join('@');

  const syntheticForbidden = [
    {
      rel: 'synthetic/contact.html',
      text: [
        '<p>Jordan Example Fence</p>',
        `<p>Call (${badCell[0]}) ${badCell[1]}-${badCell[2]}</p>`,
        `<a href="tel:+1${badCell.join('')}">Call</a>`,
        `<p>Shop: ${badBowen}</p>`,
        `<p>Old yard: ${badNorth}</p>`,
        `<p>Mail: ${badInfo}</p>`,
        `<p>Backup: ${badOutlook}</p>`,
      ].join('\n'),
    },
  ];
  const forbiddenHits = scanForbidden(syntheticForbidden);
  assert.equal(forbiddenHits.length, 6, forbiddenHits.join('\n'));
  assert.match(forbiddenHits[0], /^synthetic\/contact\.html:2:/);
  assert.match(forbiddenHits[1], /^synthetic\/contact\.html:3:/);
  assert.match(forbiddenHits[2], /^synthetic\/contact\.html:4:/);
  assert.match(forbiddenHits[3], /^synthetic\/contact\.html:5:/);
  assert.match(forbiddenHits[4], /^synthetic\/contact\.html:6:/);
  assert.match(forbiddenHits[5], /^synthetic\/contact\.html:7:/);

  const syntheticSchema = [
    {
      rel: 'synthetic/page.html',
      text: [
        '<html><head>',
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "LocalBusiness",',
        '  "name": "Ghareeb Fencing Solutions",',
        '  "telephone": "+1-419-555-0199",',
        '  "email": "alex@ghareebfence.com",',
        '  "foundingDate": "2018",',
        '  "address": {',
        '    "@type": "PostalAddress",',
        '    "streetAddress": "100 Sample Rd",',
        '    "addressLocality": "Toledo",',
        '    "addressRegion": "OH",',
        '    "postalCode": "43604"',
        '  },',
        '  "openingHoursSpecification": [{',
        '    "@type": "OpeningHoursSpecification",',
        '    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Sunday"],',
        '    "opens": "09:00",',
        '    "closes": "17:00"',
        '  }]',
        '}',
        '</script></head>',
        '<body><p>Open Mon-Fri 9am-5pm</p><p>Call (419) 214-2199</p></body></html>',
      ].join('\n'),
    },
  ];

  const phoneHits = scanPhones(syntheticSchema);
  assert.ok(phoneHits.some((m) => m.startsWith('synthetic/page.html:7:')), phoneHits.join('\n'));
  assert.ok(phoneHits.some((m) => m.startsWith('synthetic/page.html:25:')), phoneHits.join('\n'));

  const emailHits = scanEmails(syntheticSchema);
  assert.ok(emailHits.some((m) => m.startsWith('synthetic/page.html:8:')), emailHits.join('\n'));

  const { issues: addrHits } = scanAddresses(syntheticSchema);
  assert.ok(addrHits.some((m) => m.startsWith('synthetic/page.html:12:')), addrHits.join('\n'));
  assert.ok(addrHits.some((m) => m.startsWith('synthetic/page.html:15:')), addrHits.join('\n'));

  const { issues: hourHits, warnings: hourWarnings } = scanHours(syntheticSchema);
  assert.ok(hourHits.some((m) => m.startsWith('synthetic/page.html:17:') && m.includes('Sunday')), hourHits.join('\n'));
  assert.ok(hourHits.some((m) => m.startsWith('synthetic/page.html:17:') && m.includes('Saturday')), hourHits.join('\n'));
  assert.ok(hourWarnings.some((m) => m.startsWith('synthetic/page.html:25:')), hourWarnings.join('\n'));

  const { issues: foundedHits } = scanFounded(syntheticSchema, { requireHomeAndAbout: false });
  assert.ok(foundedHits.some((m) => m.startsWith('synthetic/page.html:9:')), foundedHits.join('\n'));

  // Odd hours wording alone produces a warning, not a failure.
  const wordingOnly = [{ rel: 'synthetic/hours.html', text: '<p>Usually Mon-Fri 8am-5pm</p>' }];
  const wordingCheck = scanHours(wordingOnly);
  assert.deepEqual(wordingCheck.issues, []);
  assert.equal(wordingCheck.warnings.length, 1);
  assert.match(wordingCheck.warnings[0], /^synthetic\/hours\.html:1:/);
});
