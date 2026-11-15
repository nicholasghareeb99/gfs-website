// Shared helpers for the site tests. No dependencies: run with `npm test`.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

/** Field names each hidden Netlify form declares. Netlify drops anything else. */
export function declaredForms() {
  const forms = {};
  for (const match of read('public/_netlify-forms.html').matchAll(/<form name="([^"]+)"[^>]*>(.*?)<\/form>/gs)) {
    forms[match[1]] = [...match[2].matchAll(/\sname="([^"]+)"/g)].map(found => found[1]);
  }
  return forms;
}

function storage() {
  const data = new Map();
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: key => { data.delete(key); },
  };
}

/**
 * Loads the real public/assets/js/leads.js in a bare stand-in for a browser
 * page and returns its GFSLeads API plus every request it tried to send.
 */
export function loadLeads({ pathname = '/quote/form/' } = {}) {
  const sent = [];
  const window = {
    location: { pathname, search: '', href: 'https://ghareebfence.com' + pathname, hostname: 'ghareebfence.com', origin: 'https://ghareebfence.com' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    sessionStorage: storage(), localStorage: storage(),
    navigator: { onLine: true, userAgent: 'node-test' },
    crypto: globalThis.crypto,
    fetch: async (url, options = {}) => {
      sent.push({ url: String(url), fields: Object.fromEntries(new URLSearchParams(String(options.body || ''))) });
      return new Response('', { status: 200 });
    },
  };
  const document = {
    readyState: 'complete', referrer: '', title: 'Test page', cookie: '',
    addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
  };
  const context = vm.createContext({
    window, document, console, URL, URLSearchParams, FormData, Blob, File, Response, TextEncoder, AbortSignal, atob, btoa, setTimeout, clearTimeout,
    location: window.location, navigator: window.navigator, sessionStorage: window.sessionStorage, localStorage: window.localStorage,
    crypto: globalThis.crypto, fetch: window.fetch, CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
  });
  vm.runInContext(read('public/assets/js/leads.js'), context, { filename: 'leads.js' });
  return { leads: window.GFSLeads, sent, window };
}

// ---- stand-in for Google (token, settings/global, websiteLeads) -------------
import crypto from 'node:crypto';
/** Environment for the price function with a throwaway key; no real account. */
export function priceFunctionEnv(extra = {}) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    GFS_FIREBASE_PROJECT_ID: 'test-project',
    GFS_PRICING_SERVICE_ACCOUNT: Buffer.from(JSON.stringify({ client_email: 'test@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) })).toString('base64'),
    ...extra,
  };
}
export function fakeGoogle({ pricing, receipts = [], factors = { remWood: 5, remChain: 3, remOther: 6 }, createdAtMs = Date.now(), commitStatus = 200, leadDelay = 0, leadDoc = null, commitFor = null, onCommit = null }) {
  const calls = [], counts = new Map(), commits = [];
  let leadChecks = 0;
  const fetcher = async (url, options = {}) => {
    calls.push(url);
    if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }));
    if ((options.headers || {}).Authorization !== 'Bearer token') return new Response('', { status: 403 });
    if (url.endsWith('settings/global')) {
      return new Response(JSON.stringify({ fields: { pricing: { stringValue: pricing }, remWood: { integerValue: String(factors.remWood) }, remChain: { doubleValue: factors.remChain }, remOther: { stringValue: String(factors.remOther) } } }));
    }
    if (url.endsWith('documents:commit')) {
      const body = JSON.parse(options.body);
      commits.push(body);
      const forced = commitFor ? commitFor(body, commits.length) : commitStatus;
      if (forced !== 200) return new Response('{}', { status: forced });
      if (onCommit) await onCommit(body);
      return new Response(JSON.stringify({ writeResults: body.writes.map(w => {
        const id = w.update.name.split('/').pop();
        counts.set(id, (counts.get(id) || 0) + 1);
        return { transformResults: [{ integerValue: String(counts.get(id)) }] };
      }) }));
    }
    const lead = decodeURIComponent(url.split('websiteLeads/')[1] || '');
    // leadDelay: the lead document does not exist yet for the first few checks (the intake function is slow).
    if (receipts.includes(lead) && ++leadChecks <= leadDelay) return new Response('{}', { status: 404 });
    if (leadDoc && receipts.includes(lead)) { const doc = leadDoc(lead); if (doc) return new Response(JSON.stringify(doc)); }
    return receipts.includes(lead) ? new Response(JSON.stringify({ fields: { createdAtMs: { doubleValue: createdAtMs } } })) : new Response('{}', { status: 404 });
  };
  return { calls, fetcher, counts, commits };
}
