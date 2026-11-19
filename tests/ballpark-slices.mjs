// Pieces of public/assets/js/ballpark.js, cut out by marker text and run in
// node:vm with small stand-ins. The page is one browser script with no
// exports, so this is how tests reach its pricing rules and the server-price
// hooks without a browser. A moved marker fails loudly.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

export const SRC = read('public/assets/js/ballpark.js').replace(/\r\n/g, '\n');

export function slice(startPattern, endMarker, src = SRC) {
  const a = typeof startPattern === 'string' ? src.indexOf(startPattern) : src.search(startPattern);
  const b = src.indexOf(endMarker, a + 1);
  assert.ok(a >= 0 && b > a, `markers not found: ${startPattern} .. ${endMarker}`);
  return src.slice(a, b);
}

// The browser's own pricing rules, exactly as written in the page.
export const PRICING_CODE = [
  slice('  const PRICING_FACTORS = {', '  // Financing offers come'),                       // factors, section sizes, rounding, removal rates
  slice('  // `primaryId` prices the same project', '  function formatPrice'),                   // calculatePrice + removal helpers
  slice('  function supportedStyleHeight(name) {', '  function setHeightControl'),
  slice('  // ---- PROJECT PARTS', '  function gateWords'),                                  // sections, projectParts, partHeight, pricePart
  slice('  function comparisonRows() {', '  // ---- POST-UNLOCK ACTIONS'),
  slice('  // Replace FENCE_PRICING in place', '  // Same styles, photos'),                       // installCatalogue, buildStylesFromExecPricing
  slice('  function slugify(name) {', '  // Only explicitly public'),
].join('\n');

export const SERVER_PRICE_CODE = slice('  // -------- SERVER PRICE', '  // Prices are shown only after');

/** A tiny timer queue so debounce and retry can be stepped without waiting. */
export function fakeTimers() {
  let now = 0, seq = 0; const jobs = new Map();
  return {
    setTimeout: (fn, ms) => { const id = ++seq; jobs.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: id => { jobs.delete(id); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...jobs.entries()].filter(([, j]) => j.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        jobs.delete(next[0]); now = next[1].at; next[1].fn();
        for (let i = 0; i < 20; i++) await Promise.resolve();   // let promise chains settle
        await new Promise(r => setImmediate(r));
      }
      for (let i = 0; i < 20; i++) await Promise.resolve();
      await new Promise(r => setImmediate(r));
      now = end;
    },
    pending: () => jobs.size,
    time: () => now,
  };
}

/** Runs `code` plus `exposeCode` in a context with the given globals; returns the context. */
export function run(globals, code) {
  const context = vm.createContext({ console: { log() {}, warn() {}, error() {} }, Object, JSON, Array, Set, Map, Math, Number, String, RegExp, Error, Promise, URL, Date, ...globals });
  vm.runInContext(code, context);
  return context;
}
