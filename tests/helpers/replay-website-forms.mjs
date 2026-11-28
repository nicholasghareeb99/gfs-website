import assert from 'node:assert/strict';
import handler from '../../netlify/functions/submission-created.mjs';
import {receivedAt, websiteForms} from '../fixtures/website-forms-contract.mjs';

const project = 'website-form-contract-test';
const firestore = 'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents/';

// Run only with node:test. The real entry points get a fake clock and a local
// fetch spy. Return each decoded write with its Firestore collection and ID.
export async function replayWebsiteForms(t, transport) {
  const previousProject = process.env.GFS_FIREBASE_PROJECT_ID;
  process.env.GFS_FIREBASE_PROJECT_ID = project;
  t.after(() => {
    if (previousProject === undefined) delete process.env.GFS_FIREBASE_PROJECT_ID;
    else process.env.GFS_FIREBASE_PROJECT_ID = previousProject;
  });
  t.mock.timers.enable({apis: ['Date'], now: Date.parse(receivedAt)});
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({url: String(url), options});
    return new Response(null, {status: 200});
  });
  const logs = t.mock.method(console, 'info', () => {});
  const warnings = t.mock.method(console, 'warn', () => {});
  const records = [];

  for (const form of websiteForms) {
    const {expected, name} = form;
    const logCount = logs.mock.callCount();
    const warningCount = warnings.mock.callCount();
    if (transport === 'formSubmitted') {
      await handler.formSubmitted(structuredClone(form.event));
    } else {
      assert.equal(transport, 'request');
      const {url, method, headers, body} = form.request;
      const response = await handler(new Request(url, {method, headers, body: JSON.stringify(body)}));
      assert.equal(response.status, 204, name);
    }
    assert.equal(calls.length, 1, name + ' must only send one Firestore request');
    const [call] = calls.splice(0);
    assert.equal(call.url, firestore + expected.collection + '?documentId=' + expected.id, name);
    assert.equal(call.options.method, 'POST', name);
    const body = JSON.parse(call.options.body);
    const fieldType = value => value === null ? 'nullValue' : typeof value === 'number' ? 'doubleValue' : 'stringValue';
    const expectedFields = Object.fromEntries(Object.entries(expected.record).map(([key, value]) => [key, {[fieldType(value)]: value}]));
    const record = Object.fromEntries(Object.entries(body.fields).map(([key, field]) => [key, Object.values(field)[0]]));
    if (name === 'careers') {
      // The app reads JSON answers by key. Property order is immaterial.
      assert.equal(typeof record.meta, 'string');
      assert.deepEqual(JSON.parse(record.meta), JSON.parse(expected.record.meta));
      body.fields.meta.stringValue = expected.record.meta;
      assert.equal(logs.mock.callCount(), logCount, 'no Careers submission log');
      assert.equal(warnings.mock.callCount(), warningCount, 'no Careers warning log');
    }
    assert.deepEqual(body, {fields: expectedFields}, name);
    records.push({id: expected.id, collection: expected.collection, record});
  }
  return records;
}
