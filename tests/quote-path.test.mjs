import assert from 'node:assert/strict';
import test, { after, before, mock } from 'node:test';
import { declaredForms, loadLeads } from './helpers.mjs';
import { deliverIntake } from '../netlify/functions/submission-created.mjs';

before(() => {
  mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network call in quote-path tests'); });
});
after(() => mock.restoreAll());

const formPath = '/_netlify-forms.html';
const project = 'quote-path-test';
const receivedAt = new Date('2026-11-17T14:00:00Z');
const photoUrl = 'https://uploads.example.test/property.png';
const photoBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf2sAAAAASUVORK5CYII=', 'base64');
const customer = { name: 'Test Customer', phone: '(419) 555-0142', address: '1 Main St, Toledo, OH' };
const estimate = { ...customer, contactMethod: 'Call', bestTime: 'Morning', fenceType: 'Wood', notes: 'Gate on the left.' };
const drawing = {
  lines: [[{ lat: 41.65, lng: -83.55 }, { lat: 41.6503, lng: -83.55 }]],
  gates: [{ lat: 41.65, lng: -83.55, type: 'walk' }],
  runStyles: [{ run: 1, style: 'Cedar Privacy', height: '6' }],
};
const ballpark = {
  ...customer, contactMethod: 'Text', bestTime: 'Evening', source: 'ballpark-quote-tool',
  fenceType: 'Wood', fenceStyle: 'Cedar Privacy', height: '6', linearFeet: 120, singleGates: 1, doubleGates: 2,
  timeline: 'Next spring', geometry: JSON.stringify(drawing), siteNotes: ['Yard slopes'], heardFrom: 'Friend',
  sections: '80 ft cedar\n40 ft chain link', priceRange: 'Test price range',
};
const booking = {
  ...customer, contactMethod: 'Email', email: 'Customer@Example.test',
  date: '2026-12-01', time: 'Morning (8 am - 12 pm)', notes: 'Use the side gate.',
};

function element(tag = '') {
  const classes = new Set();
  const listeners = new Map();
  return {
    tag, style: {}, dataset: {}, children: [],
    classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
    setAttribute() {},
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatch(type, event) { return listeners.get(type)(event); },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    querySelectorAll(tagName) {
      return this.children.flatMap(child => child.tag === tagName ? [child] : child.querySelectorAll(tagName));
    },
  };
}

function quotePage(kind, input, netlify) {
  const parent = element();
  parent.insertBefore = parent.appendChild;
  const success = element();
  const error = element();
  const submit = { ...element(), textContent: 'Send request' };
  const fields = Object.entries(input).map(([name, value]) => ({
    ...element(), name, value, type: name === 'contactMethod' ? 'radio' : 'text',
    checked: name === 'contactMethod', closest: () => null,
  }));
  const selectors = {
    '[name="contactMethod"]': fields.find(field => field.name === 'contactMethod'),
    '[name="email"]': fields.find(field => field.name === 'email'),
    '[type="submit"]': submit, '.form-success': success, '.form-error': error,
  };
  const form = {
    ...element(), elements: fields, parentElement: parent,
    hasAttribute: name => kind === 'booking' && name === 'data-booking-form',
    querySelector: selector => selectors[selector] || null,
    querySelectorAll: selector => selectors[selector] ? [selectors[selector]] : [],
  };
  const pathname = kind === 'estimate' ? '/quote/form/' : kind === 'booking' ? '/quote/book/' : '/quote/ballpark/';
  const { leads, window } = loadLeads({
    pathname, requestFlow: true, fetcher: netlify.receive, document: { createElement: element },
  });
  const flow = window.GFSRequestFlow;
  if (kind === 'ballpark') {
    // The ballpark page hands its computed project details to this API.
    flow.bindForm(form, kind);
  } else {
    leads.bindForm(form);
  }
  const [panel] = parent.children;
  return {
    success, error, panel,
    async send() {
      if (kind === 'ballpark') {
        const result = await leads.submit(input, flow.optionsFor(form));
        flow.showResult(form, result);
        return result;
      }
      await form.dispatch('submit', { preventDefault() {} });
    },
  };
}

function fakeNetlify({ loseFirstResponse = false, rejectWrite = false } = {}) {
  const forms = declaredForms();
  const submissions = [];
  const documents = new Map();
  const databaseStatuses = [];

  async function receive(url, { method, headers, body }) {
    assert.equal(url, formPath);
    assert.equal(method, 'POST');
    const multipart = body instanceof FormData;
    const fields = Object.fromEntries(multipart ? body : new URLSearchParams(body));
    assert.deepEqual(Object.entries(headers), multipart ? [] : [['Content-Type', 'application/x-www-form-urlencoded']]);
    const name = fields['form-name'];
    assert.ok(Object.hasOwn(forms, name), 'unknown hidden form ' + name);
    assert.equal(fields['bot-field'], '', 'the honeypot is empty');

    const declared = new Set(forms[name]);
    const data = Object.fromEntries(Object.entries(fields).filter(([field]) => declared.has(field)));
    if (data.photo instanceof File) data.photo = { type: 'file', url: photoUrl };
    submissions.push({ name, fields, data, declared, multipart });
    if (loseFirstResponse && submissions.length === 1) throw new Error('Browser did not receive the response');
    return new Response('', { status: 200 });
  }

  async function sync(submission) {
    const readFields = new Set();
    const data = new Proxy(submission.data, {
      get(target, field) {
        readFields.add(field);
        return target[field];
      },
    });
    const result = await deliverIntake(data, {
      project, now: receivedAt,
      async fetcher(url, { method, body }) {
        assert.equal(method, 'POST');
        const target = new URL(url);
        assert.equal(target.origin + target.pathname.slice(0, target.pathname.lastIndexOf('/')),
          'https://firestore.googleapis.com/v1/projects/' + project + '/databases/(default)/documents');
        const collection = target.pathname.split('/').at(-1);
        const id = target.searchParams.get('documentId');
        const key = collection + '/' + id;
        const record = Object.fromEntries(Object.entries(JSON.parse(body).fields).map(([field, value]) =>
          [field, value.stringValue ?? value.doubleValue ?? value.nullValue],
        ));
        const status = rejectWrite ? 403 : documents.has(key) ? 409 : 200;
        databaseStatuses.push(status);
        if (status === 200) documents.set(key, record);
        Object.assign(submission, { collection, id, record });
        return new Response('', { status });
      },
    });
    return { result, readFields };
  }
  return { receive, sync, submissions, documents, databaseStatuses };
}

const netlifyOnly = new Set(['form-name', 'bot-field', 'subject', 'summary', 'price_range_shown', 'came_from', 'submitted']);
const includedInNotes = {
  best_way_to_reach: (value, notes) => notes.includes('Best way to reach: ' + value),
  best_time_to_reach: (value, notes) => notes.includes(' (' + value + ')'),
  fence_sections: (value, notes) => value.split('\n').every(section => notes.includes(section)),
  site_notes: (value, notes) => notes.includes('Site notes: ' + value),
  heard_from: (value, notes) => notes.includes('Source: ' + value),
};
const numeric = new Set(['linearFeet', 'singleGates', 'doubleGates']);

function fieldDestination(field, value, { collection, id, record }) {
  if (netlifyOnly.has(field)) return ['Netlify only', false, true];
  if (field === 'gfs_contract') return ['contract check', true, value === 'gfs-intake-v1'];
  if (field === 'intake_kind') return ['collection choice', true, collection === (value === 'booking' ? 'bookings' : 'websiteLeads')];
  if (field === 'submission_id') return ['document ID', true, id === 'web_' + value];
  if (field === 'createdAt') return ['server timestamp', false, record.createdAt === receivedAt.toISOString()];
  if (field === 'createdAtMs') return ['server timestamp', false, record.createdAtMs === receivedAt.getTime()];
  if (Object.hasOwn(includedInNotes, field)) return ['notes', false, !value || includedInNotes[field](value, record.notes)];
  if (field === 'page') return ['meta', false, record.meta.split(' | ').includes('page=' + encodeURIComponent(value))];
  if (field === 'map_drawing') return ['geometry', false, !value || Boolean(record.geometry)];
  if (field === 'photo') return ['photo URL', true, record.photo === photoUrl];

  const expected = numeric.has(field) ? (field === 'linearFeet' && !Number(value) ? null : Number(value)) : value;
  return ['record field', true, Object.hasOwn(record, field) && record[field] === expected];
}

function reportFields(t, post, readFields) {
  const mismatches = [];
  const report = new Map();
  for (const [field, value] of Object.entries(post.fields)) {
    const declared = post.declared.has(field);
    const retained = Object.hasOwn(post.data, field);
    const accepted = retained && readFields.has(field);
    const [destination, shouldRead, stored] = fieldDestination(field, value, post);
    const details = [
      'declared ' + (declared ? 'yes' : 'no'),
      'function accepts ' + (accepted ? 'yes' : 'no'),
      stored && retained ? destination : 'missing or changed',
    ].join(', ');
    if (!report.has(details)) report.set(details, []);
    report.get(details).push(field);
    if (!declared || !retained || accepted !== shouldRead || !stored) mismatches.push(field + ' (' + details + ')');
  }
  for (const [details, fields] of report) t.diagnostic(details + ' — ' + fields.join(', '));
  assert.deepEqual(mismatches, [], post.name + ': fields lost or changed unexpectedly');
}

for (const [kind, input, contact] of [
  ['estimate', { ...estimate, photo: 'data:image/png;base64,' + photoBytes.toString('base64') }, 'call'],
  ['ballpark', ballpark, 'text'],
  ['booking', booking, 'email'],
]) {
  test(kind + ' reaches the office with the expected fields', async t => {
    const netlify = fakeNetlify();
    const page = quotePage(kind, input, netlify);
    const result = await page.send();
    if (kind === 'ballpark') {
      assert.equal(result.ok, true, JSON.stringify(result.errors));
      assert.match(page.panel.children[0].textContent, /has been received/);
    } else {
      assert.ok(page.success.classList.contains('show'), page.error.textContent);
      assert.match(page.success.textContent, new RegExp('will ' + (kind === 'booking' ? '' : 'review your project and ') + contact));
    }

    assert.equal(netlify.submissions.length, 1);
    const [post] = netlify.submissions;
    assert.equal(post.name, 'gfs-' + kind);
    assert.equal(post.multipart, kind === 'estimate');
    assert.equal(post.fields.intake_kind, kind);
    assert.equal(post.fields.best_way_to_reach, input.contactMethod);
    const undeclared = Object.keys(post.fields).filter(field => !post.declared.has(field));
    if (undeclared.length) t.diagnostic(post.name + ': Netlify would drop ' + undeclared.join(', '));
    const { result: delivery, readFields } = await netlify.sync(post);
    assert.deepEqual(delivery, { id: 'web_' + post.fields.submission_id, duplicate: false });
    reportFields(t, post, readFields);

    const collection = kind === 'booking' ? 'bookings' : 'websiteLeads';
    assert.deepEqual(netlify.databaseStatuses, [200]);
    const record = netlify.documents.get(collection + '/' + delivery.id);
    assert.ok(record, 'office document exists in ' + collection);
    assert.equal(record.name, customer.name);
    assert.equal(record.phone, '4195550142');
    assert.equal(record.address, customer.address);
    assert.match(record.notes, new RegExp('Best way to reach: ' + input.contactMethod));
    assert.equal(record.createdAt, receivedAt.toISOString());
    assert.equal(record.createdAtMs, receivedAt.getTime());
    if (kind === 'booking') {
      assert.equal(record.email, 'customer@example.test');
      assert.equal(record.date, booking.date);
      assert.equal(record.time, booking.time);
    } else {
      assert.equal(record.status, 'new');
    }
    if (kind === 'ballpark') {
      assert.deepEqual(JSON.parse(record.geometry), drawing);
      assert.equal(record.linearFeet, 120);
      assert.equal(post.data.price_range_shown, ballpark.priceRange);
      assert.match(post.data.map_drawing, /Customer drew 1 fence run and 1 gate/);
    }
    if (kind === 'estimate') {
      assert.equal(record.photo, photoUrl);
      const photo = post.fields.photo;
      assert.equal(photo.name, 'customer-property.png');
      assert.equal(photo.type, 'image/png');
      assert.deepEqual(Buffer.from(await photo.arrayBuffer()), photoBytes);
    }
  });
}

test('an identical retry gets the same receipt after the database reports a duplicate', async () => {
  const netlify = fakeNetlify({ loseFirstResponse: true });
  const page = quotePage('estimate', estimate, netlify);
  await page.send();
  assert.ok(page.error.classList.contains('show'));
  assert.match(page.error.textContent, /has not been confirmed/);
  const [first] = netlify.submissions;
  const initial = await netlify.sync(first);

  await page.send();
  assert.equal(netlify.submissions.length, 2);
  const second = netlify.submissions[1];
  assert.deepEqual(second.fields, first.fields);
  const retry = await netlify.sync(second);
  assert.deepEqual(retry.result, { id: initial.result.id, duplicate: true });
  assert.deepEqual(netlify.databaseStatuses, [200, 409]);
  assert.equal(netlify.documents.size, 1);
  assert.ok(page.success.classList.contains('show'));
  assert.match(page.success.textContent, /request has been received/);
  assert.ok(!page.error.classList.contains('show'));
});

test('a refused office write reports the failure and leaves the request in Netlify', async () => {
  const netlify = fakeNetlify({ rejectWrite: true });
  const page = quotePage('estimate', estimate, netlify);
  await page.send();
  assert.ok(page.success.classList.contains('show'));
  assert.equal(netlify.submissions.length, 1);
  const [post] = netlify.submissions;
  const saved = { ...post.data };
  await assert.rejects(netlify.sync(post), error => {
    assert.ok(error.message.includes('web_' + saved.submission_id));
    assert.match(error.message, /HTTP 403.*remains in Netlify Forms for recovery/);
    return true;
  });
  assert.deepEqual(netlify.databaseStatuses, [403]);
  assert.equal(netlify.documents.size, 0);
  assert.deepEqual(netlify.submissions.map(submission => submission.data), [saved]);
  assert.equal(saved.name, customer.name);
  assert.match(saved.notes, /Gate on the left/);
});
