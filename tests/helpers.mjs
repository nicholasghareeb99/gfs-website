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
 * Loads leads.js in a stand-in browser page. The default fetch records form
 * posts in sent. A caller can supply a page, request-flow.js and its own fetch fake.
 */
export function loadLeads({ pathname = '/quote/form/', requestFlow = false, fetcher, document: page = {} } = {}) {
  const sent = [];
  const window = {
    location: { pathname, search: '', href: 'https://ghareebfence.com' + pathname, hostname: 'ghareebfence.com', origin: 'https://ghareebfence.com' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    sessionStorage: storage(), localStorage: storage(),
    navigator: { onLine: true, userAgent: 'node-test' },
    crypto: globalThis.crypto,
    fetch: fetcher ?? (async (url, options = {}) => {
      sent.push({ url: String(url), fields: Object.fromEntries(new URLSearchParams(String(options.body || ''))) });
      return new Response('', { status: 200 });
    }),
  };
  const document = {
    readyState: 'complete', referrer: '', title: 'Test page', cookie: '',
    addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    ...page,
  };
  const context = vm.createContext({
    window, document, console, URL, URLSearchParams, FormData, Blob, File, Response, TextEncoder, AbortSignal, atob, btoa,
    setTimeout: (...args) => setTimeout(...args).unref(), clearTimeout,
    location: window.location, navigator: window.navigator, sessionStorage: window.sessionStorage, localStorage: window.localStorage,
    crypto: globalThis.crypto, fetch: window.fetch, CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
  });
  if (requestFlow) vm.runInContext(read('public/assets/js/request-flow.js'), context, { filename: 'request-flow.js' });
  vm.runInContext(read('public/assets/js/leads.js'), context, { filename: 'leads.js' });
  return { leads: window.GFSLeads, sent, window };
}
