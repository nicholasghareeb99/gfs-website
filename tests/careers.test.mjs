import assert from 'node:assert/strict';
import {test} from 'node:test';
import handler, {intakeRecord, deliverIntake} from '../netlify/functions/submission-created.mjs';
import {applicationSteps, normalizeApplication, normalizeStep, payByRole} from '../public/assets/js/careers-contract.mjs';
import {applicationFormData, applicationFormFields} from '../public/assets/js/careers-form.mjs';
import {declaredForms, read} from './helpers.mjs';

function application(roles = ['installer']) {
  return {roles, name: 'Test Applicant', phone: '(419) 555-0182', email: 'test@example.test', street: '1 Main St',
    city: 'Toledo', state: 'OH', zip: '43612', reachWay: 'Text', reachTime: 'Afternoon', transportation: 'yes', license: 'yes',
    fenceYears: '3', fenceTypes: ['Wood', 'Gates'], skills: ['Carpentry'], otherSkills: 'Finish work', tools: 'Hand tools',
    employment: [{company: 'Test Employer', role: 'Installer', start: '2020-01', end: '', duties: 'Layout', mayContact: 'no'}],
    crewSize: '2', business: 'Test Crew', liability: 'yes', workersComp: 'no', salesYears: '4', onSiteQuote: 'yes',
    pay: Object.fromEntries(roles.map(role => [role, {unit: payByRole[role][0], amount: '34'}])), hours: '40',
    days: ['Monday', 'Saturday'], startDate: '2026-12-07', travel: 'yes', authorized: 'yes', adult: 'yes',
    heardFrom: 'Friend', notes: 'Available most afternoons', consent: true};
}
const fields = application => ({'form-name': 'gfs-careers', 'bot-field': '', subject: 'New GFS careers application',
  gfs_contract: 'gfs-careers-v1', intake_kind: 'careers', submission_id: 'test_application_001',
  ...applicationFormData(normalizeApplication(application))});

test('the applicant form uses a dedicated Netlify event and the existing website intake envelope', () => {
  const post = fields(application(['crew', 'sales']));
  const declared = declaredForms()['gfs-careers'];
  assert.ok(Object.keys(post).every(key => declared.includes(key)));
  assert.deepEqual(declared.slice(6).sort(), [...applicationFormFields].sort());
  assert.equal(post.roles, 'Subcontractor crew, Salesperson');
  assert.equal(post.job_1_company, 'Test Employer');
  assert.equal(post.crew_pay_unit, 'Per foot ($/ft)');
  assert.equal(Object.hasOwn(post, 'application'), false);
  assert.ok(Object.values(post).every(value => typeof value === 'string'));
  const {collection, id, record} = intakeRecord(post, new Date('2026-11-27T15:00:00Z'));
  const {record: existing} = intakeRecord({gfs_contract: 'gfs-intake-v1', intake_kind: 'estimate',
    submission_id: 'test_website_form_001', source: 'website', name: 'Test Customer', phone: '4195550150'});
  assert.deepEqual(Object.keys(record).sort(), Object.keys(existing).sort());
  assert.equal(collection, 'websiteLeads');
  assert.equal(id, 'web_test_application_001');
  assert.equal(record.source, 'careers');
  assert.equal(record.status, 'new');
  assert.equal(JSON.parse(record.meta).version, 1);
  assert.equal(JSON.parse(record.meta).pay.crew.unit, 'foot');
  assert.equal(JSON.parse(record.meta).onSiteQuote, 'yes');
  assert.equal(intakeRecord({...post, 'bot-field': 'filled'}), null);
  assert.throws(() => intakeRecord({...post, 'form-name': 'gfs-estimate', gfs_contract: 'gfs-intake-v1',
    intake_kind: 'estimate', source: 'careers'}), /source/);
});

test('the Firestore Careers receipt meets the live websiteLeads public create rule', async () => {
  const applicant = application(['installer', 'crew', 'sales', 'other']);
  const name = 'N'.repeat(120);
  const phone = '(419)' + ' '.repeat(23) + '555-0182';
  const email = 'İ' + 'a'.repeat(186) + '@example.test';
  const notes = 'N'.repeat(900);
  assert.equal(email.length, 200);
  assert.equal(email.toLowerCase().length, 201);
  const post = {...fields(applicant), name, phone, email, notes,
    street: 'S'.repeat(160), city: 'C'.repeat(80), zip: '43612-0000',
    job_1_duties: 'D'.repeat(600), other_skills: 'S'.repeat(600), tools: 'T'.repeat(600)};
  let receipt;
  const result = await deliverIntake(post, {project: 'synthetic-gfs', fetcher: async (url, options) => {
    assert.match(url, /\/websiteLeads\?documentId=web_test_application_001$/);
    receipt = JSON.parse(options.body).fields;
    return new Response(null, {status: 200});
  }});
  assert.equal(result.duplicate, false);
  assert.equal(Object.keys(receipt).length, 18, 'the live rule allows at most 20 fields');
  for (const [field, max] of Object.entries({name: 200, phone: 50, source: 100})) {
    const value = receipt[field]?.stringValue;
    assert.equal(typeof value, 'string', field);
    assert.ok(value.length >= 1 && value.length <= max, field);
  }
  assert.equal(receipt.status.stringValue, 'new');
  assert.equal(receipt.source.stringValue, 'careers');
  for (const [field, max] of Object.entries({email: 200, address: 500, notes: 2000, fenceType: 200, geometry: 45000})) {
    const value = receipt[field]?.stringValue;
    assert.equal(typeof value, 'string', field);
    assert.ok(value.length <= max, field);
  }
  assert.equal(receipt.name.stringValue, name);
  assert.equal(receipt.phone.stringValue, phone);
  assert.equal(receipt.email.stringValue, email);
  assert.equal(receipt.address.stringValue.length, 257);
  assert.equal(receipt.notes.stringValue, '');
  assert.ok(receipt.meta.stringValue.length > 2000);
  assert.equal(JSON.parse(receipt.meta.stringValue).notes, notes);
});

test('both Netlify event entry points save an application and discard provider metadata', async t => {
  const previousProject = process.env.GFS_FIREBASE_PROJECT_ID;
  process.env.GFS_FIREBASE_PROJECT_ID = 'synthetic-gfs';
  t.after(() => {
    if (previousProject === undefined) delete process.env.GFS_FIREBASE_PROJECT_ID;
    else process.env.GFS_FIREBASE_PROJECT_ID = previousProject;
  });
  const writes = [];
  const logs = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    writes.push({url, record: JSON.parse(options.body).fields});
    return new Response(null, {status: 200});
  });
  t.mock.method(console, 'info', (...args) => logs.push(args));
  t.mock.method(console, 'warn', (...args) => logs.push(args));
  const metadata = {ip: '192.0.2.44', user_agent: 'Synthetic Agent', referrer: 'https://example.test/careers/'};
  const data = {...fields(application()), ...metadata};
  delete data['form-name']; // The actual Netlify payload identifies the form outside data.
  const call = data => handler(new Request('https://example.test/.netlify/functions/submission-created', {
    method: 'POST', body: JSON.stringify({payload: {form_name: 'gfs-careers', data}}),
  }));
  assert.equal((await call(data)).status, 204);
  await handler.formSubmitted({data});
  for (const {url, record} of writes) {
    assert.match(url, /\/websiteLeads\?documentId=web_test_application_001$/);
    assert.equal(record.source.stringValue, 'careers');
    assert.equal(record.name.stringValue, 'Test Applicant');
    for (const [key, value] of Object.entries(metadata)) {
      assert.equal(Object.hasOwn(record, key), false);
      assert.ok(!JSON.stringify(record).includes(value));
    }
  }
  assert.equal(writes.length, 2);
  assert.ok(intakeRecord({...data, referrer: null}));
  const file = {filename: 'attachment.pdf', url: 'https://example.test/attachment.pdf'};
  for (const rejected of [{name: file}, {referrer: file}, {'bot-field': file}, {upload: file}, {notes: ['text']}]) {
    await assert.rejects(call({...data, ...rejected}), /Careers application failed validation/);
    await assert.rejects(handler.formSubmitted({data: {...data, ...rejected}}), /Careers application failed validation/);
  }
  assert.equal(writes.length, 2, 'only the two valid events wrote a record');
  assert.deepEqual(logs, []);
});

test('applications can branch for one or several roles and omit answers outside those roles', () => {
  for (const role of ['installer', 'other', 'crew', 'sales']) {
    const result = normalizeApplication(application([role]));
    assert.deepEqual(result.roles, [role]);
    assert.equal(Object.hasOwn(result, 'crewSize'), role === 'crew');
    assert.equal(Object.hasOwn(result, 'salesYears'), role === 'sales');
  }
  assert.ok(applicationSteps(['crew', 'sales']).includes('sales'));
  assert.ok(applicationSteps(['crew', 'sales']).includes('crew'));
});

test('the server refuses prohibited fields, invalid answers, overlong text and missing consent', () => {
  const sample = application();
  const invalid = [
    {...sample, dateOfBirth: '2000-01-01'}, {...sample, consent: false},
    {...sample, employment: [...sample.employment, {...sample.employment[0], ssn: 'invalid'}]},
    {...sample, employment: Array(4).fill(sample.employment[0])},
    {...sample, name: ' A '}, {...sample, phone: 'invalid'}, {...sample, email: 'test@example'}, {...sample, zip: 'invalid'},
    {...sample, startDate: '2027-02-30'}, {...sample, notes: 'a'.repeat(901)}, {...sample, notes: '000-00-0000'},
    {...sample, pay: {installer: {unit: 'commission', amount: 20}}},
  ];
  for (const input of invalid) assert.throws(() => normalizeApplication(input));
  const post = fields(sample);
  for (const invalid of [{name: ' A '}, {name: 'N'.repeat(201)}, {phone: '(419)' + ' '.repeat(38) + '555-0182'},
    {email: 'a'.repeat(188) + '@example.test'}, {street: 'S'.repeat(501)},
    {consent: 'no'}, {date_of_birth: '2000-01-01'}, {job_1_start: '2020-19'},
    {installer_pay_amount: 'abc'}, {notes: '000-00-0000'}, {notes: 'a'.repeat(18001)}, {application: '{}'}]) {
    assert.throws(() => intakeRecord({...post, ...invalid}), /^Error: Careers application failed validation\.$/);
  }
});

test('employment and pay validation identify the exact field, including the second job or role', () => {
  const first = application().employment[0];
  for (const [key, value, message] of [['company', '', /fill in/i], ['start', '2020-19', /YYYY-MM/],
    ['end', '2019-07', /before the start/], ['mayContact', '', /choose/i]]) {
    assert.throws(() => normalizeStep('employment', {employment: [first, {...first, [key]: value}]}),
      error => error.field === 'employment-1-' + key && message.test(error.message));
  }
  const sample = application(['installer', 'sales']);
  assert.throws(() => normalizeStep('pay', {...sample, pay: {installer: sample.pay.installer}}, sample.roles),
    {field: 'pay-sales-unit'});
  assert.throws(() => normalizeStep('pay', {...sample, pay: {...sample.pay, sales: {unit: 'commission', amount: '101'}}}, sample.roles),
    {field: 'pay-sales-amount'});
  assert.throws(() => normalizeStep('contact', {...sample, name: ' A '}), {field: 'name'});
});

test('duplicate event delivery has the same Firestore document ID and never triggers an Ads request', async () => {
  const calls = [];
  const options = {project: 'synthetic-gfs', fetcher: async (url, options) => {
    calls.push({url, method: options.method, record: JSON.parse(options.body).fields});
    return new Response(null, {status: calls.length === 1 ? 200 : 409});
  }};
  assert.deepEqual(await deliverIntake(fields(application()), options), {id: 'web_test_application_001', duplicate: false});
  assert.deepEqual(await deliverIntake(fields(application()), options), {id: 'web_test_application_001', duplicate: true});
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.match(call.url, /^https:\/\/firestore\.googleapis\.com\/.*\/websiteLeads\?documentId=web_test_application_001$/);
    assert.equal(call.method, 'POST');
    assert.equal(call.record.source.stringValue, 'careers');
    assert.equal('gclid' in call.record, false);
  }
});

test('Careers has a sitemap entry and a local-only application page', () => {
  const html = read('public/careers/index.html');
  assert.match(read('public/sitemap.xml'), /https:\/\/ghareebfence\.com\/careers\//);
  assert.doesNotMatch(html, /JobPosting|type="file"|<script[^>]*src="https?:/);
  assert.match(html, /equal opportunity employer/);
  assert.deepEqual([...new Set([...html.matchAll(/tel:([^"]+)/g)].map(match => match[1]))], ['+14192142107']);
});
