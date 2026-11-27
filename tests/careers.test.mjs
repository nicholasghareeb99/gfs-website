import assert from 'node:assert/strict';
import {test} from 'node:test';
import {intakeRecord, deliverIntake} from '../netlify/functions/submission-created.mjs';
import {applicationSteps, normalizeApplication, payByRole} from '../public/assets/js/careers-contract.mjs';
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
  gfs_contract: 'gfs-careers-v1', intake_kind: 'careers', submission_id: 'test_application_001', application: JSON.stringify(application)});

test('the applicant form uses a dedicated Netlify event and the existing website intake envelope', () => {
  const post = fields(application(['crew', 'sales']));
  assert.deepEqual(Object.keys(post).sort(), declaredForms()['gfs-careers'].sort());
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
  assert.throws(() => intakeRecord({...post, gfs_contract: 'gfs-intake-v1', intake_kind: 'estimate', source: 'careers'}), /source/);
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
    {...sample, phone: 'invalid'}, {...sample, email: 'test@example'}, {...sample, zip: 'invalid'},
    {...sample, startDate: '2027-02-30'}, {...sample, notes: 'a'.repeat(901)}, {...sample, notes: '000-00-0000'},
    {...sample, pay: {installer: {unit: 'commission', amount: 20}}},
  ];
  for (const input of invalid) assert.throws(() => intakeRecord(fields(input)), /^Error: Careers application failed validation\.$/);
  assert.throws(() => intakeRecord({...fields(sample), photo: {url: 'https://example.test/photo'}}), /failed validation/);
  assert.throws(() => intakeRecord({...fields(sample), application: 'a'.repeat(18001)}), /failed validation/);
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
