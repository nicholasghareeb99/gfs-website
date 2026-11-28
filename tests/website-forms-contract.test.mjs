import assert from 'node:assert/strict';
import test from 'node:test';
import {applicationFormData} from '../public/assets/js/careers-form.mjs';
import {declaredForms} from './helpers.mjs';
import {careerAnswers, providerData, transports, websiteForms} from './fixtures/website-forms-contract.mjs';
import {replayWebsiteForms} from './helpers/replay-website-forms.mjs';

test('the Netlify fixture uses declared fields and includes the complete Careers submission', () => {
  const declared = declaredForms();
  for (const {formName, event: {data}} of websiteForms) {
    for (const key of Object.keys(data)) {
      assert.ok(Object.hasOwn(providerData, key) || declared[formName]?.includes(key), formName + ' would drop ' + key);
    }
  }
  const [careers] = websiteForms;
  const {version, ...answers} = careerAnswers;
  const {name, email, phone} = careers.expected.record;
  const application = applicationFormData({...answers, name, email, phone});
  const {subject, intake_kind, gfs_contract, submission_id, 'bot-field': honeypot, ip, user_agent, referrer,
    ...fields} = careers.event.data;
  assert.deepEqual(application, fields);
});

for (const transport of transports) {
  test('Netlify ' + transport + ' writes the shared Firestore records for all four forms', t => replayWebsiteForms(t, transport));
}
