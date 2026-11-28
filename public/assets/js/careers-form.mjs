import {applicationKeys, employmentKeys, payUnits, roles} from './careers-contract.mjs';

// Netlify also uses these fields for its office email. Keep them readable there
// and reconstruct the structured record only after the verified event arrives.
const fieldName = key => key.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
const listKeys = ['fenceTypes', 'skills', 'days'];
const groupedKeys = ['roles', ...listKeys, 'employment', 'pay', 'consent'];
const scalarKeys = applicationKeys.filter(key => !groupedKeys.includes(key));
const jobIndices = [0, 1, 2];
const roleKeys = Object.keys(roles);
const payKeys = ['unit', 'amount'];
const jobName = (index, key) => 'job_' + (index + 1) + '_' + fieldName(key);
const payName = (role, key) => role + '_pay_' + key;
const inverse = mapping => Object.fromEntries(Object.entries(mapping).map(([key, label]) => [label, key]));
const roleIds = inverse(roles);
const payIds = inverse(payUnits);
const mapFields = (keys, read) => Object.fromEntries(keys.map(key => [key, read(key)]));
const list = value => value ? value.split(', ') : [];

export const applicationFormFields = [
  ...scalarKeys.map(fieldName), 'roles', ...listKeys.map(fieldName), 'consent',
  ...jobIndices.flatMap(index => employmentKeys.map(key => jobName(index, key))),
  ...roleKeys.flatMap(role => payKeys.map(key => payName(role, key))),
];

export function applicationFormData(application) {
  const data = Object.fromEntries(scalarKeys.map(key => [fieldName(key), String(application[key] ?? '')]));
  data.roles = application.roles.map(role => roles[role]).join(', ');
  for (const key of listKeys) data[fieldName(key)] = application[key].join(', ');
  data.consent = application.consent ? 'yes' : 'no';
  for (const [index, job] of application.employment.entries()) {
    for (const key of employmentKeys) data[jobName(index, key)] = job[key];
  }
  for (const [role, pay] of Object.entries(application.pay)) {
    data[payName(role, 'unit')] = payUnits[pay.unit];
    data[payName(role, 'amount')] = String(pay.amount);
  }
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== ''));
}

export function answersFromForm(data) {
  const input = mapFields(scalarKeys, key => data[fieldName(key)]);
  for (const key of listKeys) input[key] = list(data[fieldName(key)]);
  input.roles = list(data.roles).map(label => roleIds[label]);
  input.consent = data.consent === 'yes';
  input.employment = jobIndices.map(index => mapFields(employmentKeys, key => data[jobName(index, key)]))
    .filter(job => Object.values(job).some(Boolean));
  input.pay = mapFields(input.roles.filter(role => Object.hasOwn(roles, role)), role => ({
    unit: payIds[data[payName(role, 'unit')]], amount: data[payName(role, 'amount')],
  }));
  return input;
}
