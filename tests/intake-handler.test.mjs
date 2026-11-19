// The website's form handler must work however the site was deployed.
// 16-18 Nov 2026: the default export was an object, the site was deployed through the Netlify API (which
// does not register the formSubmitted handler), and Netlify's file-name fallback called the default export
// as a function. Every submission failed with "e.default is not a function" and no lead reached the office.
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import handler from '../netlify/functions/submission-created.mjs';

const project = 'intake-handler-test';
const data = {
  gfs_contract: 'gfs-intake-v1', intake_kind: 'ballpark', submission_id: 'abcdefgh-1234-5678-9abc',
  name: 'Test Customer', phone: '(419) 555-0142', address: '1 Main St, Toledo, OH', source: 'ballpark-quote-tool',
  fenceType: 'Wood', linearFeet: '120', meta: '{}',
};
let calls;
let status;
let savedProject;
beforeEach(() => {
  calls = []; status = 200;
  savedProject = process.env.GFS_FIREBASE_PROJECT_ID;
  process.env.GFS_FIREBASE_PROJECT_ID = project;
  mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url: String(url), options }); return new Response('', { status }); });
  mock.method(console, 'info', () => {});
  mock.method(console, 'warn', () => {});
});
afterEach(() => {
  mock.restoreAll();
  if (savedProject === undefined) delete process.env.GFS_FIREBASE_PROJECT_ID; else process.env.GFS_FIREBASE_PROJECT_ID = savedProject;
});
const post = body => new Request('https://ghareebfence.com/.netlify/functions/submission-created', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body),
});
const savedFields = () => JSON.parse(calls[0].options.body).fields;

test('the default export is a function, so a CLI or API deploy can call it', () => {
  assert.equal(typeof handler, 'function');
  assert.equal(typeof handler.formSubmitted, 'function');
});

test('file-name call: a Request carrying {payload:{data}} saves the lead once', async () => {
  const reply = await handler(post({ payload: { form_name: 'gfs-ballpark', data }, site: { name: 'gfencing' } }));
  assert.equal(reply.status, 204);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/websiteLeads?documentId=web_' + data.submission_id);
  assert.equal(savedFields().name.stringValue, 'Test Customer');
  assert.equal(savedFields().linearFeet.doubleValue, 120);
});

test('registered-handler call: formSubmitted(event) saves the same lead', async () => {
  await handler.formSubmitted({ data });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /websiteLeads\?documentId=web_abcdefgh-1234-5678-9abc$/);
});

test('a second delivery of the same submission is accepted as already saved', async () => {
  status = 409;
  assert.equal((await handler(post({ payload: { data } }))).status, 204);
});

test('a photo uploaded through Netlify Forms keeps its link in either receipt shape', async () => {
  const url = 'https://uploads.example.test/yard.jpg';
  await handler(post({ payload: { data: { ...data, photo: { filename: 'yard.jpg', type: 'image/jpeg', size: 10, url } } } }));
  assert.equal(savedFields().photo.stringValue, url);
  await handler.formSubmitted({ data: { ...data, submission_id: 'abcdefgh-1234-5678-9abd', photo: { type: 'file', url } } });
  assert.equal(JSON.parse(calls[1].options.body).fields.photo.stringValue, url);
});

test('file-name call: fields placed straight on the payload are read too', async () => {
  assert.equal((await handler(post({ payload: data }))).status, 204);
  assert.equal(calls.length, 1);
});

test('a form that is not a GFS intake is ignored without a database call', async () => {
  assert.equal((await handler(post({ payload: { data: { name: 'Someone' } } }))).status, 204);
  assert.equal(calls.length, 0);
});

test('a body that is not a form submission is refused without a database call', async () => {
  assert.equal((await handler(post('not json'))).status, 400);
  assert.equal((await handler(post({ payload: {} }))).status, 400);
  assert.equal((await handler(post({}))).status, 400);
  assert.equal(calls.length, 0);
});

test('a database refusal still fails loudly, so Netlify records the failed delivery', async () => {
  status = 403;
  await assert.rejects(() => handler(post({ payload: { data } })), /could not sync to Firestore \(HTTP 403\)/);
});
