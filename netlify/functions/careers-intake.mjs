import {contract, maxPayload, normalizeApplication} from '../../public/assets/js/careers-contract.mjs';

export function careersRecord(data, now) {
  try {
    if (data.gfs_contract !== contract || data.intake_kind !== 'careers' ||
        typeof data.submission_id !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(data.submission_id) ||
        typeof data.application !== 'string' || new TextEncoder().encode(data.application).length > maxPayload) throw Error();
    const allowed = ['form-name', 'bot-field', 'subject', 'gfs_contract', 'intake_kind', 'submission_id', 'application'];
    if (Object.keys(data).some(key => !allowed.includes(key))) throw Error();
    const {name, phone, email, street, city, state, zip, ...answers} = normalizeApplication(JSON.parse(data.application));
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
