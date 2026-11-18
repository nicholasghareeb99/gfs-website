import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadLeads, read } from './helpers.mjs';

const source = read('public/assets/js/firebase-after-paint.js');
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function startPage(ballpark = false) {
  const requested = [];
  const calls = [];
  const idle = [];
  const planner = new EventTarget();
  const db = {};
  const firebase = {
    initializeApp: config => calls.push(['app', config]),
    firestore: () => db,
    auth: Object.assign(() => ({
      setPersistence: async value => { calls.push(['persistence', value]); },
    }), { Auth: { Persistence: { LOCAL: 'local' } } }),
  };
  const window = Object.assign(new EventTarget(), {
    firebase,
    GFS_FIREBASE_CONFIG: { projectId: 'stub-project' },
    GFSTrackingPolicy: {
      initialize: sdk => {
        assert.equal(sdk, firebase);
        calls.push(['analytics']);
        return null; // The policy denies Analytics until consent.
      },
    },
    requestIdleCallback: callback => idle.push(callback),
  });
  window.addEventListener('gfs-firebase-ready', () => calls.push(['ready', window.GFS_DB]));
  const document = {
    readyState: 'interactive',
    body: { classList: { contains: name => ballpark && name === 'bp-page' } },
    querySelector: () => planner,
    createElement: () => ({}),
    head: { appendChild: script => requested.push(script) },
  };
  vm.runInNewContext(source, { document, window, Event, console });
  return { window, planner, requested, calls, idle, db };
}

test('public pages start Firebase after load and initialize Analytics through the existing policy', async () => {
  const { window, requested, calls, idle, db } = startPage();
  assert.equal(requested.length, 0);
  window.dispatchEvent(new Event('load'));
  assert.equal(requested.length, 0);
  assert.equal(idle.length, 1);

  idle[0]();
  assert.match(requested[0].src, /firebase-app-compat\.js$/);
  requested[0].onload();
  await nextTurn();
  assert.match(requested[1].src, /firebase-firestore-compat\.js$/);
  assert.equal(window.GFS_DB, undefined);

  requested[1].onload();
  await nextTurn();
  assert.deepEqual(calls, [['app', window.GFS_FIREBASE_CONFIG], ['analytics'], ['ready', db]]);
});

test('early planner use and owner sign-in share one Firebase app', async () => {
  const { window, planner, requested, calls, idle, db } = startPage(true);
  const auth = window.GFS_LOAD_AUTH();
  planner.dispatchEvent(new Event('focusin'));
  window.dispatchEvent(new Event('load'));
  idle[0]();
  assert.equal(requested.length, 1);

  requested[0].onload();
  await nextTurn();
  assert.equal(requested.length, 3);
  assert.match(requested[1].src, /firebase-auth-compat\.js$/);
  assert.match(requested[2].src, /firebase-firestore-compat\.js$/);
  requested[1].onload();
  requested[2].onload();
  await auth;
  assert.deepEqual(calls, [
    ['app', window.GFS_FIREBASE_CONFIG], ['analytics'], ['ready', db], ['persistence', 'local'],
  ]);
});

test('an accepted planner request records each conversion once when its tag is ready', async () => {
  const { leads, sent, window } = loadLeads({ pathname: '/quote/ballpark/' });
  const choice = {
    choiceId: 'stub-choice-123456789',
    noticeVersion: 'stub-notice',
    recordedAtClient: Date.now(),
    analytics: true,
    advertising: true,
  };
  window.GFSConsent = { snapshot: () => choice };
  window.GFSTrackingPolicy = {
    contextAllowed: () => true,
    anyAllowed: () => true,
    allowed: () => true,
    safeUrl: () => true,
    safeFields: () => true,
  };
  const calls = [];
  let adsReady = false;
  window.GFSAdsTag = {
    ready: () => adsReady,
    config: () => ({ conversionId: 'AW-123456', label: 'stub' }),
  };
  window.gtag = (...args) => calls.push(args);

  const result = await leads.submit({
    name: 'Example Customer', phone: '(419) 555-0142', address: '1 Main St, Toledo, OH',
    contactMethod: 'Call', fenceType: 'Wood', linearFeet: 150, source: 'ballpark-quote-tool',
  });
  assert.equal(result.ok, true);
  assert.equal(sent.length, 1);
  assert.deepEqual(calls, []);

  adsReady = true;
  leads.retryConversionEvents();
  window.GFS_ANALYTICS = { logEvent: (...args) => calls.push(args) };
  leads.retryConversionEvents();
  leads.retryConversionEvents();

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].slice(0, 2), ['event', 'conversion']);
  assert.equal(calls[0][2].transaction_id, result.id);
  assert.equal(calls[0][2].send_to, 'AW-123456/stub');
  assert.equal(calls[1][0], 'generate_lead');
  assert.equal(calls[1][1].transaction_id, result.id);
});
