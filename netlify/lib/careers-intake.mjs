import {contract, formName, maxPayload, normalizeApplication} from '../../public/assets/js/careers-contract.mjs';
import {answersFromForm, applicationFormFields} from '../../public/assets/js/careers-form.mjs';

const providerFields = new Set(['ip', 'user_agent', 'referrer']);
const formFields = new Set(['form-name', 'bot-field', 'subject', 'gfs_contract', 'intake_kind', 'submission_id', ...applicationFormFields]);
const utf8 = new TextEncoder();

export function careersRecord(data, now) {
  try {
    if (data.gfs_contract !== contract || data.intake_kind !== 'careers' ||
        typeof data.submission_id !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(data.submission_id) ||
        (Object.hasOwn(data, 'form-name') && data['form-name'] !== formName)) throw Error();
    let bytes = 0;
    for (const [key, value] of Object.entries(data)) {
      // Netlify injects these after submission. A missing referrer can be null.
      if (providerFields.has(key) && (typeof value === 'string' || value === null)) continue;
      if (!formFields.has(key) || typeof value !== 'string') throw Error();
      bytes += utf8.encode(value).length;
      if (bytes > maxPayload) throw Error();
    }
    if (data['bot-field']?.trim()) return null;
    const {name, phone, email, street, city, state, zip, ...answers} = normalizeApplication(answersFromForm(data));
    return {id: 'web_' + data.submission_id, collection: 'websiteLeads', record: {
      name, phone, email, address: street + ', ' + city + ', ' + state + ' ' + zip, notes: '',
      source: 'careers', status: 'new', createdAt: now.toISOString(), createdAtMs: now.getTime(),
      fenceType: '', fenceStyle: '', linearFeet: null, height: '', singleGates: 0, doubleGates: 0,
      timeline: '', geometry: '', meta: JSON.stringify({version: 1, street, city, state, zip, ...answers}),
    }};
  } catch {
    // The reserved event handler can log thrown errors. Use one message that
    // never contains any submitted fields, including malformed input.
    throw Error('Careers application failed validation.');
  }
}
