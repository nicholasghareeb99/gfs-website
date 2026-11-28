import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, read } from './helpers.mjs';

const phone = '4192142107';
const email = 'nick@ghareebfence.com';
const street = '5242 Tractor Rd Suite C';
const address = street + ', Toledo, OH 43612';
const founded = '2022';
// SHA-256 of the private number's ten digits. Keep the number out of the source and test output.
const privatePhoneHash = '83eb386c7d425392deb845d9efbac612d3f2c3d9a667d1f36c36ff1c59d4ade7';

const phonePattern = /(?<!\d)(?:\+?1[\s.()/_·-]*)?\(?[2-9]\d{2}[\s.()/_·-]*\d{3}[\s.()/_·-]*\d{4}(?!\d)/g;
const emailPattern = /[\w.%+-]+@[\w-]+(?:\.[\w-]+)+/gi;
const emailSeparator = (symbol, word) =>
  `(?:\\s*\\${symbol}\\s*|\\s*[([{]\\s*${word}\\s*[)\\]}]\\s*|\\s+${word}\\s+)`;
const at = emailSeparator('@', 'at');
const dot = emailSeparator('.', 'dot');
const forbidden = [
  [/\b3823[\s,._+-]+bowen[\s,._+-]+(?:rd\b|road\b)/gi, 'obsolete Bowen Road address'],
  [/\b2910[\s,._+-]+n(?:orth)?[\s,._+-]*109(?:th)?[\s,._+-]+(?:st\b|street\b)/gi, 'obsolete 109th Street address'],
  [new RegExp(`info${at}ghareebfencingsolutions${dot}com\\b`, 'gi'), 'obsolete info email'],
  [new RegExp(`ng${dot}ghareebfencingsolutions${at}outlook${dot}com\\b`, 'gi'), 'obsolete Outlook email'],
];

function normalized(text) {
  const entities = { amp: '&', commat: '@', period: '.', hyphen: '-', minus: '-', nbsp: ' ', ensp: ' ', emsp: ' ', ndash: '–', mdash: '—', lpar: '(', rpar: ')', colon: ':', plus: '+' };
  return text.normalize('NFKC')
    .replace(/(?:%[\da-f]{2})+/gi, match => {
      try {
        return decodeURIComponent(match).replace(/[\r\n]/g, ' ');
      } catch {
        return match;
      }
    })
    .replace(/\\u([\da-f]{4})|\\x([\da-f]{2})/gi, (_, unicode, hex) => {
      const code = Number.parseInt(unicode ?? hex, 16);
      return code < 32 ? ' ' : String.fromCharCode(code);
    })
    .replace(/&(?:#(x[\da-f]+|\d+)|([a-z]+));/gi, (match, numeric, named) => {
      if (named) return entities[named.toLowerCase()] ?? match;
      const code = /^x/i.test(numeric) ? Number.parseInt(numeric.slice(1), 16) : Number(numeric);
      return code < 32 ? ' ' : code <= 0x10ffff ? String.fromCodePoint(code) : match;
    })
    .normalize('NFKC').replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '')
    .replace(/[‐‑‒–—―−]/g, '-');
}

const phoneDigits = value => value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
const addressWords = value => normalized(value).toLowerCase()
  .replace(/\broad\b/g, 'rd').replace(/\bste\b\.?\s*|#\s*/g, 'suite ')
  .replace(/\bohio\b/g, 'oh').replace(/[^a-z0-9]+/g, ' ').trim();
const isFounded = value => /^2022(?:-\d{2}(?:-\d{2})?)?$/.test(String(value));

function visibleText(source) {
  // Keep line breaks for diagnostics and keep separate blocks from running together.
  const strip = (match, separator = ' ') => separator + match.replace(/[^\n]/g, '');
  return source
    .replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, match => strip(match, '\0'))
    .replace(/<\/?([a-z][\w:-]*)\b[^>]*>/gi, (match, tag) =>
      strip(match, /^(?:address|div|footer|h[1-6]|li|p|section|td|tr)$/i.test(tag) ? '\0' : /^br$/i.test(tag) ? ' ' : ''));
}

function scanText(source, { report, warn, plainText }) {
  const raw = normalized(source);
  const visible = normalized(visibleText(source));
  for (const text of new Set([raw, visible])) {
    for (const [pattern, problem] of forbidden) {
      for (const match of text.matchAll(pattern)) report(text, match.index, problem);
    }
    for (const match of text.matchAll(phonePattern)) {
      const digits = phoneDigits(match[0]);
      if (digits !== phone && createHash('sha256').update(digits).digest('hex') === privatePhoneHash) {
        report(text, match.index, 'private phone number');
      }
    }
  }

  for (const match of raw.matchAll(/\btel:([+\d()./ \t–—-]+)/gi)) {
    if (phoneDigits(match[1]) !== phone) report(raw, match.index, 'phone link must use (419) 214-2107');
  }
  for (const match of raw.matchAll(/\bmailto:([\w.%+-]+@[\w-]+(?:\.[\w-]+)+)/gi)) {
    if (match[1].toLowerCase() !== email) report(raw, match.index, `email link must use ${email}`);
  }
  if (plainText) {
    for (const match of visible.matchAll(/^[ \t]*(?:-\s+)?Email:[ \t]*([^\s<>"']+)/gim)) {
      if (match[1].toLowerCase() !== email) report(visible, match.index, `business email must be ${email}`);
    }
  }
  for (const match of raw.matchAll(/(<a\b[^>]*\bhref\s*=\s*["'](?:tel|mailto):[^"']+["'][^>]*>)([\s\S]*?)<\/a\s*>/gi)) {
    const text = visibleText(match[2]);
    const linesBefore = lineAt(raw, match.index + match[1].length) - 1;
    for (const displayed of text.matchAll(phonePattern)) {
      if (phoneDigits(displayed[0]) !== phone) report(text, displayed.index, 'link text must use (419) 214-2107', linesBefore);
    }
    for (const displayed of text.matchAll(emailPattern)) {
      if (displayed[0].toLowerCase() !== email) report(text, displayed.index, `link text must use ${email}`, linesBefore);
    }
  }
  for (const match of visible.matchAll(emailPattern)) {
    if (/@(?:ghareebfence|ghareebfencingsolutions)\.com$/i.test(match[0]) && match[0].toLowerCase() !== email) {
      report(visible, match.index, `business email must be ${email}`);
    }
  }
  const foundingClaim = /(?:\b(?:founded|established)(?: Ghareeb Fencing Solutions)?\s+(?:in\s+)?|\best\.\s*|\b(?:family[ -]owned(?:\s*·\s*Toledo\s*·)?|locally owned|fence contractor|serving [\w &-]+)\s+since\s+|(?:^|[\0\n])[ \t]*since\s+)((?:19|20)\d{2})\b/gi;
  for (const match of visible.matchAll(foundingClaim)) {
    if (match[1] !== founded) report(visible, match.index + match[0].lastIndexOf(match[1]), 'founding year must be 2022');
  }
  for (const match of visible.matchAll(phonePattern)) {
    if (phoneDigits(match[0]) === phone) continue;
    const before = visible.slice(Math.max(0, match.index - 50), match.index);
    if (/\b(?:call or text|call us|text us)\s+(?:at\s+)?$|\b(?:our (?:phone|number)|Ghareeb Fencing Solutions)[:\s]*$/i.test(before) ||
        (plainText && /(?:^|\n)[ \t]*(?:-\s+)?Phone:[ \t]*$/i.test(before))) {
      report(visible, match.index, 'business phone must be (419) 214-2107');
    }
  }
  // A street address in a site footer or a marked business address is a contact fact.
  for (const area of raw.matchAll(/<(footer|address)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]+(?:itemprop=["']address["']|data-editable=["']contact\.address["'])[^>]*>[\s\S]*?<\/[^>]+>|^[ \t]*(?:-\s+)?(?:Business )?(?:Address|Office):[^\r\n]*/gim)) {
    const text = visibleText(area[0]);
    const streetAddress = /\b\d{1,6} +[\w][\w .'-]{1,65}?\b(?:rd|road|st|street|ave|avenue|dr|drive|blvd|boulevard|ln|lane|ct|court|way|pl|place|pkwy|parkway)\b[^\0<]*/gi;
    for (const match of text.matchAll(streetAddress)) {
      if (addressWords(match[0]) !== addressWords(address)) {
        report(text, match.index, `business address must be ${address}`, lineAt(raw, area.index) - 1);
      }
    }
  }

  for (const match of visible.matchAll(/\b(?:mon(?:day)?\s*(?:-|to|through|thru)\s*sat(?:urday)?|(?:business\s+)?hours\s*:|sun(?:day)?\s*(?=[:·-]?\s*(?:closed|open|\d)))[^\0\n"'<>]{0,90}/gi)) {
    if (!/\d|\b(?:closed|open)\b/i.test(match[0])) continue;
    if (/^sun(?:day)?\s*[:·-]?\s*closed\b/i.test(match[0])) continue;
    if (!/\b0?8(?::00)?\s*a\.?m\.?\s*(?:[-–—]|to|through)\s*0?6(?::00)?\s*p\.?m\b/i.test(match[0]) ||
        /\b(?:sun(?:day)?\s*[:·-]?\s*(?:open|\d)|open\s+sun(?:day)?|7 days)\b/i.test(match[0])) {
      warn(visible, match.index, 'check the wording of these business hours');
    }
  }
}

function lineAt(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

// JSON.parse reads the values. Walk the JSON tokens as well to retain each field's source location.
function jsonLocations(source) {
  const tokens = source.matchAll(/"(?:\\.|[^"\\])*"|[{}\[\]:,]|[^\s{}\[\]:,"]+/g);
  const locations = new Map();
  let token = tokens.next().value;
  const advance = () => { token = tokens.next().value; };
  function scan(path) {
    locations.set(JSON.stringify(path), token.index);
    if (token[0] === '{') {
      advance();
      while (token[0] !== '}') {
        const key = token;
        advance(); // colon
        advance(); // value
        const child = [...path, JSON.parse(key[0])];
        scan(child);
        locations.set(JSON.stringify(child), key.index);
        if (token[0] === ',') advance();
      }
      advance();
    } else if (token[0] === '[') {
      advance();
      for (let i = 0; token[0] !== ']'; i++) {
        scan([...path, i]);
        if (token[0] === ',') advance();
      }
      advance();
    } else {
      advance();
    }
  }
  scan([]);
  return path => locations.get(JSON.stringify(path)) ?? 0;
}

const week = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const asArray = value => Array.isArray(value) ? value : [value];

function daysListed(value) {
  return asArray(value).flatMap(item => String(item).split(',')).flatMap(item => {
    const day = name => {
      const label = name.trim().toLowerCase().split('/').at(-1);
      return dayNames.some(full => full.startsWith(label)) && label.length >= 2 ? week.indexOf(label.slice(0, 2)) : -1;
    };
    const range = normalized(item).split(/\s*(?:-|\b(?:to|through|thru)\b)\s*/i).map(day);
    if (range.includes(-1) || range.length > 2) return [-1];
    if (range.length === 1) return range;
    const [start, end] = range;
    return start <= end ? week.slice(start, end + 1).map((_, i) => i + start) : [-1];
  });
}

function matchesSchedule(rows) {
  const openDays = new Set();
  for (const { days, opens, closes, closed } of rows) {
    const isClosed = closed || (/^00:00(?::00)?$/.test(opens) && /^00:00(?::00)?$/.test(closes));
    for (const day of daysListed(days)) {
      if (day < 0 || isClosed !== (day === 6)) return false;
      if (!isClosed) {
        if (!/^0?8:00(?::00)?$/.test(opens) || !/^18:00(?::00)?$/.test(closes)) return false;
        openDays.add(day);
      }
    }
  }
  return openDays.size === 6;
}

function checkAddress(value, check, { partial = false } = {}) {
  if (typeof value === 'string') {
    check([], addressWords(value) === addressWords(address), `business address must be ${address}`);
    return;
  }
  const keys = [
    [['streetAddress', 'street'], street],
    [['addressLocality', 'city'], 'Toledo'],
    [['addressRegion', 'state'], 'OH'],
    [['postalCode', 'zip'], '43612'],
  ];
  for (const [aliases, expected] of keys) {
    const present = aliases.filter(key => Object.hasOwn(value ?? {}, key));
    if (!present.length && !partial) check([], false, `business address is missing ${aliases[0]}`);
    for (const key of present) {
      check([key], addressWords(String(value[key])) === addressWords(expected), `${key} must be ${expected}`);
    }
  }
  if (value?.addressCountry !== undefined) {
    check(['addressCountry'], /^(?:us|usa|united states(?: of america)?)$/i.test(value.addressCountry), 'address country must be US');
  }
}

function scanData(data, check) {
  function walk(value, path = [], business = false) {
    if (!value || typeof value !== 'object') return;
    const name = String(value.name ?? '');
    const isBusiness = /^(?:ghareeb fencing\b|ghareebfence)/i.test(name) ||
      /^(?:https?:\/\/)?(?:www\.)?ghareeb(?:fence|fencingsolutions)\.com(?:[\/#?]|$)/i.test(String(value.url ?? value['@id'] ?? ''));
    const contactPoint = path.at(-1) === 'contactPoint' || path.at(-2) === 'contactPoint';
    if (isBusiness || (business && contactPoint)) {
      for (const key of ['telephone', 'phone', 'phoneRaw']) {
        if (typeof value[key] !== 'undefined') {
          check([...path, key], asArray(value[key]).every(item => typeof item === 'string' && phoneDigits(item) === phone),
            `${key} must use (419) 214-2107`);
        }
      }
      if (value.email !== undefined) {
        check([...path, 'email'], asArray(value.email).every(item => /^((mailto:)?nick@ghareebfence\.com)$/i.test(item)), `email must be ${email}`);
      }
      if (value.address !== undefined) {
        checkAddress(value.address, (keys, valid, message) => check([...path, 'address', ...keys], valid, message),
          { partial: !value['@type'] });
      }
      for (const key of ['foundingDate', 'foundingYear', 'founded', 'foundedYear', 'yearFounded', 'established']) {
        if (value[key] !== undefined) check([...path, key], isFounded(value[key]), `${key} must be 2022`);
      }
      for (const key of ['openingHours', 'openingHoursSpecification']) {
        if (value[key] === undefined) continue;
        const rows = asArray(value[key]).map(item => {
          if (key === 'openingHoursSpecification') return {
            days: item?.dayOfWeek, opens: item?.opens, closes: item?.closes,
          };
          const parts = String(item).match(/^(.+?)\s+(?:(\d\d?:\d\d)(?::00)?\s*[-–—]\s*(\d\d?:\d\d)(?::00)?|(closed))$/i);
          return { days: parts?.[1], opens: parts?.[2], closes: parts?.[3], closed: Boolean(parts?.[4]) };
        });
        check([...path, key], matchesSchedule(rows), 'hours must be Monday–Saturday 08:00–18:00, closed Sunday');
      }
    }
    for (const [key, child] of Object.entries(value)) {
      // Use numeric paths for array entries, as in the JSON locations.
      walk(child, [...path, Array.isArray(value) ? Number(key) : key], isBusiness || (business && contactPoint));
    }
  }
  walk(data);

  const timeline = data?.history?.timeline;
  if (Array.isArray(timeline)) {
    timeline.forEach((entry, index) => {
      if (/\b(?:company founded|founding|company established)\b/i.test(entry.title ?? '')) {
        check(['history', 'timeline', index, 'year'], isFounded(entry.year), 'founding entry must be dated 2022');
      }
    });
  }
  const contact = data?.contactInfo;
  if (contact?.address) {
    checkAddress(contact.address, (keys, valid, message) => check(['contactInfo', 'address', ...keys], valid, message));
  }
  for (const key of ['phone', 'email']) {
    const entry = contact?.[key];
    if (entry?.display !== undefined) {
      const valid = key === 'phone' ? phoneDigits(String(entry.display)) === phone : String(entry.display).toLowerCase() === email;
      check(['contactInfo', key, 'display'], valid, key === 'phone' ? 'business phone must be (419) 214-2107' : `business email must be ${email}`);
    }
  }
  if (Array.isArray(data?.businessHours?.hours)) {
    const rows = data.businessHours.hours.map(({ days, time }) => {
      const times = normalized(String(time)).match(/^\s*0?8(?::00)?\s*a\.?m\.?\s*(?:-|to|through|thru)\s*0?6(?::00)?\s*p\.?m\.?\s*$/i);
      return { days, opens: times && '08:00', closes: times && '18:00', closed: /^closed$/i.test(time) };
    });
    check(['businessHours', 'hours'], matchesSchedule(rows), 'hours must be Monday–Saturday 8 AM–6 PM, closed Sunday');
  }
}

function inspect(file, source) {
  const problems = new Set();
  const warnings = new Set();
  const record = target => (text, offset, message, linesBefore = 0) =>
    target.add(`${file}:${linesBefore + lineAt(text, offset)}: ${message}`);
  const report = record(problems);
  scanText(source, { report, warn: record(warnings), plainText: /\.(?:mdx?|txt)$/i.test(file) });
  function inspectJson(json, start) {
    let data;
    try {
      data = JSON.parse(json);
    } catch {
      report(source, start, 'could not read business facts in invalid JSON');
      return;
    }
    const locate = jsonLocations(json);
    scanData(data, (path, valid, message) => {
      if (!valid) report(source, start + locate(path), message);
    });
  }
  if (file.endsWith('.json')) inspectJson(source.replace(/^\ufeff/, ' '), 0);
  if (/\.(?:html?|astro)$/i.test(file)) {
    const script = /(<script\b[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json(?=[\s>]))[^>]*>)([\s\S]*?)<\/script\s*>/gi;
    for (const match of source.matchAll(script)) {
      // Astro set:html values are built from the separately scanned source data.
      if (!file.endsWith('.astro') || !/\bset:html\s*=/.test(match[1])) {
        inspectJson(match[2], match.index + match[1].length);
      }
    }
  }
  return { problems: [...problems], warnings: [...warnings] };
}

function* siteFiles(directory) {
  for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = `${directory}/${entry.name}`;
    if (path === 'src/pages/api') continue;
    if (entry.isDirectory()) yield* siteFiles(path);
    if (entry.isFile() && /\.(?:astro|cjs|css|html?|js|json|jsx|mdx?|mjs|svg|ts|tsx|txt|webmanifest|xml|ya?ml)$/i.test(path)) yield path;
  }
}

test('website sources use the approved business facts', t => {
  const problems = [];
  for (const file of [...siteFiles('public'), ...siteFiles('src')].sort()) {
    const result = inspect(file, read(file));
    problems.push(...result.problems);
    for (const warning of result.warnings) t.diagnostic(warning);
  }
  assert.equal(problems.length, 0, '\n' + problems.join('\n'));
});

test('the guard finds old contact details across source formats and keeps their line numbers', () => {
  const html = [
    '<main>',
    '<p>3823 <strong>Bowen</strong> Road</p>',
    '<p>2910 North 109th Street</p>',
    '<p>info&#64;ghareebfencingsolutions&period;com</p>',
    '<p>ng [dot] ghareebfencingsolutions [at] outlook [dot] com</p>',
    '</main>',
  ].join('\n');
  assert.deepEqual(inspect('fixture.html', html).problems.sort(), [
    'fixture.html:2: obsolete Bowen Road address',
    'fixture.html:3: obsolete 109th Street address',
    'fixture.html:4: business email must be nick@ghareebfence.com',
    'fixture.html:4: obsolete info email',
    'fixture.html:5: obsolete Outlook email',
  ]);
});

test('the guard rejects wrong structured facts and skips unrelated organizations', () => {
  const schema = {
    '@graph': [
      { '@type': 'Organization', name: 'Example Permits Office', telephone: '419-555-0100' },
      {
        '@type': 'LocalBusiness',
        url: 'https://ghareebfence.com/',
        telephone: '419-555-0101',
        email: 'shop@example.test',
        address: { streetAddress: street, addressLocality: 'Example City', addressRegion: 'OH', postalCode: '43612' },
        foundingDate: '2020-10-10',
        openingHoursSpecification: [
          { dayOfWeek: 'Mo-Sa', opens: '08:00', closes: '18:00' },
          { dayOfWeek: 'Sunday', opens: '10:00', closes: '12:00' },
        ],
      },
    ],
  };
  const json = JSON.stringify(schema, null, 2);
  const html = `<script type="application/ld+json">\n${json}\n</script>`;
  const { problems } = inspect('fixture.html', html);
  assert.deepEqual(problems, [
    'fixture.html:12: telephone must use (419) 214-2107',
    'fixture.html:13: email must be nick@ghareebfence.com',
    'fixture.html:16: addressLocality must be Toledo',
    'fixture.html:20: foundingDate must be 2022',
    'fixture.html:21: hours must be Monday–Saturday 08:00–18:00, closed Sunday',
  ]);
});

test('the guard accepts equivalent facts and warns about confusing display hours', () => {
  const html = [
    '<footer>',
    '<address>5242 Tractor Road, Ste. C<br>Toledo, Ohio 43612</address>',
    '<a href="tel:%2B1%20%28419%29%20214%E2%80%912107">Call us</a>',
    '<p>Mon–Sat 8 AM–6 PM. Sunday open by chance.</p>',
    '</footer>',
    '<script type=application/ld+json>',
    '{"name":"Example Fencing","url":"https://ghareebfence.com/","openingHours":["Mo-Fr 08:00-18:00","Sa 08:00-18:00","Su Closed"]}',
    '</script>',
  ].join('\n');
  assert.deepEqual(inspect('fixture.html', html), {
    problems: [],
    warnings: ['fixture.html:4: check the wording of these business hours'],
  });
});
