import {applicationSteps, contract, days, fenceTypes, formName, maxPayload, normalizeApplication, normalizeStep,
  payByRole, payUnits, reachTimes, reachWays, roles, skills, states} from './careers-contract.mjs';
import {applicationFormData} from './careers-form.mjs';

const form = document.getElementById('application');
const question = document.getElementById('question');
const confirmation = document.getElementById('confirmation');
const progress = document.getElementById('progress');
const count = document.getElementById('step-count');
const error = document.getElementById('form-error');
const back = document.getElementById('back');
const next = document.getElementById('next');
const nextArrow = next.querySelector('[aria-hidden="true"]');
const storageKey = 'gfs-careers-draft-v1';
const yesNo = {yes: 'Yes', no: 'No'};
const roleNotes = {installer: 'Build and install fences', crew: 'Your own truck, tools and insurance',
  sales: 'Measure yards and quote jobs', other: 'Tell us where you’d fit'};
const titles = {
  roles: 'What kind of work?', contact: 'First, how can we find you?', address: 'What’s your home address?',
  reach: 'When should we reach out?', transport: 'Getting to work', experience: 'Tell us about your fence work',
  skills: 'What else can you do?', employment: 'Where have you worked?', crew: 'Tell us about your crew',
  sales: 'Tell us about your sales work', pay: 'What are you looking to earn?', availability: 'When can you work?',
  eligibility: 'Two quick questions', closing: 'Anything else?', review: 'Check your answers',
};
const fields = {
  name: 'Full name', phone: 'Phone number', email: 'Email address', street: 'Street address', city: 'City', state: 'State', zip: 'ZIP code',
  reachWay: 'Best way to reach you', reachTime: 'Best time to reach you', transportation: 'Do you have reliable transportation to job sites?',
  license: 'Do you have a valid driver’s license?', fenceYears: 'Years of fence experience', fenceTypes: 'Fence types you’ve worked with',
  skills: 'Skills you have', otherSkills: 'Other skills (optional)', tools: 'Tools or equipment you own (optional)',
  crewSize: 'Crew size', business: 'Business name', liability: 'Do you have liability insurance?',
  workersComp: 'Do you have workers’ comp or a workers’ comp exemption?', salesYears: 'Years in sales',
  onSiteQuote: 'Are you comfortable measuring yards and quoting on site?', hours: 'Hours wanted per week',
  days: 'Days you’re available', startDate: 'Earliest start date', travel: 'Can you travel for work in northwest Ohio and southeast Michigan?',
  authorized: 'Are you legally authorized to work in the US?', adult: 'Are you at least 18 years old?',
  heardFrom: 'How did you hear about us?', notes: 'Anything else we should know? (optional)',
};
const historyFields = {company: 'Company', role: 'Role', start: 'Start month', end: 'End month (optional)',
  duties: 'What did you do there?', mayContact: 'May we contact them?'};

let answers = {};
let current = 'roles';
let submitted = '';
let submissionId = '';
let sendFingerprint = '';
let busy = false;
let editFromReview = false;

try {
  const saved = sessionStorage.getItem(storageKey);
  if (saved && new TextEncoder().encode(saved).length <= maxPayload + 1000) {
    const draft = JSON.parse(saved);
    if (draft.answers && Object.getPrototypeOf(draft.answers) === Object.prototype) answers = draft.answers;
    if (applicationSteps(answers.roles).includes(draft.current)) current = draft.current;
    if (/^[a-zA-Z0-9_-]{16,80}$/.test(draft.submissionId || '')) submissionId = draft.submissionId;
    if (/^[a-f0-9]{64}$/.test(draft.sendFingerprint || '')) sendFingerprint = draft.sendFingerprint;
    if (/^web_[a-zA-Z0-9_-]{16,80}$/.test(draft.submitted || '')) submitted = draft.submitted;
  }
} catch { /* The form works in memory when storage is unavailable. */ }

function persist() {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(submitted ? {submitted} : {answers, current, submissionId, sendFingerprint}));
  } catch { /* The current tab still retains its answers. */ }
}
function set(key, value) {
  answers[key] = value;
  if (key === 'roles') {
    if (!value.includes('crew')) for (const field of ['crewSize', 'business', 'liability', 'workersComp']) delete answers[field];
    if (!value.includes('sales')) for (const field of ['salesYears', 'onSiteQuote']) delete answers[field];
    if (answers.pay) answers.pay = Object.fromEntries(Object.entries(answers.pay).filter(([role]) => value.includes(role)));
    progress.max = applicationSteps(value).length;
    count.textContent = 'Step 1 of ' + progress.max;
  }
  if (error.textContent) {
    error.textContent = '';
    for (const control of question.querySelectorAll('[aria-invalid]')) {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
  }
  persist();
}
function node(tag, content, className) {
  const el = document.createElement(tag);
  if (content != null) el.textContent = content;
  if (className) el.className = className;
  return el;
}
function input(key, options = {}, label = fields[key], value = answers[key], onInput = v => set(key, v)) {
  const wrap = node('label', label, 'field');
  const {type = 'text', choices, ...attributes} = options;
  const control = node(choices ? 'select' : type === 'textarea' ? 'textarea' : 'input');
  control.name = key;
  control.dataset.answer = key;
  if (choices) {
    const empty = node('option', 'Choose one');
    empty.value = '';
    control.append(empty);
    for (const [value, label] of Object.entries(choices)) {
      const option = node('option', label);
      option.value = value;
      control.append(option);
    }
  } else if (type !== 'textarea') control.type = type;
  for (const [name, value] of Object.entries(attributes)) control.setAttribute(name, value);
  if (value != null) control.value = value;
  control.addEventListener('input', () => onInput(control.value));
  wrap.append(control);
  return wrap;
}
const optionLabels = values => Object.fromEntries(values.map(value => [value, value]));

function choices(key, options, {label = fields[key], single = false, value = answers[key],
  update = v => set(key, v), notes} = {}) {
  const group = node('fieldset');
  group.append(node('legend', label));
  const list = node('div', null, notes ? 'choices role-grid' : 'choices');
  for (const [valueKey, label] of Object.entries(options)) {
    const row = node('label', null, 'choice');
    const control = node('input');
    control.name = key;
    control.type = single ? 'radio' : 'checkbox';
    control.value = valueKey;
    control.dataset.answer = key;
    control.checked = single ? valueKey === value : Array.isArray(value) && value.includes(valueKey);
    control.onchange = () => {
      update(single ? control.value : [...list.querySelectorAll(':checked')].map(option => option.value));
    };
    const copy = node('span', label);
    if (notes) copy.append(node('small', notes[valueKey]));
    row.append(control, copy);
    list.append(row);
  }
  group.append(list);
  return group;
}
const yes = key => choices(key, yesNo, {single: true});
const check = (key, values) => choices(key, optionLabels(values));
const select = (key, values) => input(key, {choices: optionLabels(values)});
function pair(...children) {
  const row = node('div', null, 'pair');
  row.append(...children);
  return row;
}
function hint(text) { return node('p', text, 'hint'); }

function employment() {
  const list = Array.isArray(answers.employment) ? answers.employment : [];
  const out = [hint('Add up to three jobs. You can skip this if you don’t have any to add.')];
  for (const [index, job] of list.entries()) {
    const group = node('fieldset', null, 'history-row fields');
    group.append(node('legend', 'Job ' + (index + 1)));
    const change = (key, value) => set('employment', answers.employment.map((row, i) => i === index ? {...row, [key]: value} : row));
    const field = (key, options) => input('employment-' + index + '-' + key, options, historyFields[key], job[key], value => change(key, value));
    group.append(field('company', {maxlength: 120}), field('role', {maxlength: 100}),
      pair(field('start', {type: 'month', placeholder: 'YYYY-MM'}), field('end', {type: 'month', placeholder: 'YYYY-MM'})),
      hint('Leave the end month blank if you still work there.'),
      field('duties', {type: 'textarea', rows: 2, maxlength: 600}),
      choices('employment-' + index + '-mayContact', yesNo, {label: historyFields.mayContact, value: job.mayContact,
        single: true, update: value => change('mayContact', value)}));
    const remove = node('button', 'Remove job ' + (index + 1));
    remove.type = 'button';
    remove.onclick = () => { set('employment', answers.employment.filter((_, i) => i !== index)); draw({focus: true}); };
    group.append(remove);
    out.push(group);
  }
  if (list.length < 3) {
    const add = node('button', 'Add a job');
    add.type = 'button';
    add.onclick = () => {
      set('employment', [...(answers.employment || []), {}]);
      draw();
      question.querySelector('[name="employment-' + list.length + '-company"]').focus();
    };
    out.push(add);
  }
  return out;
}
function pay() {
  const blocks = (answers.roles || []).map(role => {
    const group = node('fieldset');
    group.append(node('legend', roles[role]));
    const saved = answers.pay?.[role] || {};
    function change(key, value) {
      const item = answers.pay?.[role] || {};
      set('pay', {...answers.pay, [role]: {...item, [key]: value}});
    }
    const units = Object.fromEntries(payByRole[role].map(unit => [unit, payUnits[unit]]));
    const unit = saved.unit || (payByRole[role].length === 1 ? payByRole[role][0] : '');
    if (unit && !saved.unit) change('unit', unit);
    group.append(pair(
      input('pay-' + role + '-unit', {choices: units}, 'Pay type', unit, v => change('unit', v)),
      input('pay-' + role + '-amount', {type: 'number', min: '0.01', step: '0.01', inputmode: 'decimal'}, 'Amount', saved.amount, v => change('amount', v))));
    return group;
  });
  return [...blocks, input('hours', {type: 'number', min: '1', max: '112', inputmode: 'numeric'})];
}

const blocks = {
  roles: () => [choices('roles', roles, {label: 'Pick one or more roles', notes: roleNotes})],
  contact: () => [input('name', {autocomplete: 'name', minlength: 2, maxlength: 120, autocapitalize: 'words'}),
    input('phone', {type: 'tel', autocomplete: 'tel', maxlength: 36}),
    input('email', {type: 'email', autocomplete: 'email', maxlength: 200})],
  address: () => [input('street', {autocomplete: 'address-line1', maxlength: 160}),
    input('city', {autocomplete: 'address-level2', maxlength: 80}),
    pair(input('state', {choices: optionLabels(states), autocomplete: 'address-level1'}),
      input('zip', {autocomplete: 'postal-code', inputmode: 'numeric', maxlength: 10}))],
  reach: () => [choices('reachWay', optionLabels(reachWays), {single: true}),
    choices('reachTime', optionLabels(reachTimes), {single: true})],
  transport: () => [yes('transportation'), yes('license')],
  experience: () => [input('fenceYears', {type: 'number', min: '0', max: '80', step: '0.01', inputmode: 'decimal'}),
    hint('Enter 0 if you’re new to fence work.'), check('fenceTypes', fenceTypes)],
  skills: () => [check('skills', skills), input('otherSkills', {type: 'textarea', rows: 2, maxlength: 600}),
    input('tools', {type: 'textarea', rows: 2, maxlength: 600})],
  employment,
  crew: () => [input('crewSize', {type: 'number', min: '1', max: '150', inputmode: 'numeric'}),
    input('business', {autocomplete: 'organization', maxlength: 160}), yes('liability'), yes('workersComp')],
  sales: () => [input('salesYears', {type: 'number', min: '0', max: '80', step: '0.01', inputmode: 'decimal'}), yes('onSiteQuote')],
  pay,
  availability: () => [check('days', days), input('startDate', {type: 'date'}), yes('travel')],
  eligibility: () => [yes('authorized'), yes('adult')],
  closing: () => [input('heardFrom', {maxlength: 200}), input('notes', {type: 'textarea', rows: 3, maxlength: 900}),
    hint('Keep Social Security numbers and other sensitive personal details out of your answers.'),
    choices('consent', {yes: 'GFS may contact me by phone, text or email about this application.'},
      {label: 'Contact permission', value: answers.consent ? ['yes'] : [], update: v => set('consent', v.length === 1)})],
};

function display(key, value) {
  if (key === 'roles') return value.map(role => roles[role]).join(', ');
  if (key === 'employment') return value.map(job => job.company + ' · ' + job.role + ', ' + job.start + ' to ' + (job.end || 'present') +
    '\n' + job.duties + '\nMay contact: ' + yesNo[job.mayContact]).join('\n\n');
  if (key === 'pay') return Object.entries(value).map(([role, pay]) => roles[role] + ': ' + pay.amount + ' ' + payUnits[pay.unit]).join('\n');
  if (key === 'consent') return 'Yes';
  if (Array.isArray(value)) return value.join(', ');
  return yesNo[value] || String(value);
}
const reviewNames = {roles: 'Roles', contact: 'Contact details', address: 'Home address', reach: 'Contact preference',
  transport: 'Transportation', experience: 'Fence experience', skills: 'Skills and tools', employment: 'Previous jobs',
  crew: 'Subcontractor crew', sales: 'Sales', pay: 'Pay and hours', availability: 'Availability', eligibility: 'Eligibility', closing: 'Final details'};
function review() {
  const out = [hint('Open any section to check it or make a change. Your application is sent when you tap Send application.')];
  const plan = applicationSteps(answers.roles);
  for (const [title, steps] of [
    ['Contact and roles', ['roles', 'contact', 'address', 'reach']],
    ['Experience and tools', ['transport', 'experience', 'skills', 'employment', 'crew', 'sales']],
    ['Pay and availability', ['pay', 'availability']],
    ['Eligibility and final details', ['eligibility', 'closing']],
  ]) {
    const detail = node('details', null, 'review-group');
    detail.append(node('summary', title));
    for (const step of steps.filter(step => plan.includes(step))) {
      const values = node('dl');
      try {
        for (const [key, value] of Object.entries(normalizeStep(step, answers, answers.roles))) {
          values.append(node('dt', fields[key] || ({roles: 'Roles', employment: 'Jobs', pay: 'Pay', consent: 'Contact permission'})[key]),
            node('dd', display(key, value) || '—'));
        }
      } catch { values.append(node('dt', reviewNames[step]), node('dd', 'This section still needs an answer.')); }
      const edit = node('button', 'Edit ' + reviewNames[step].toLowerCase());
      edit.type = 'button';
      edit.onclick = () => { if (!busy) go(step, 1, true); };
      detail.append(values, edit);
    }
    out.push(detail);
  }
  return out;
}

function draw({focus = false, direction = 0} = {}) {
  const plan = applicationSteps(answers.roles);
  const index = plan.indexOf(current);
  count.textContent = 'Step ' + (index + 1) + ' of ' + plan.length;
  progress.max = plan.length;
  progress.value = index + 1;
  back.disabled = index === 0 && !editFromReview;
  if (current === 'review' || editFromReview) next.replaceChildren(current === 'review' ? 'Send application' : 'Back to review');
  else next.replaceChildren('Next', nextArrow);
  error.textContent = '';
  const heading = node('h2', titles[current]);
  heading.tabIndex = -1;
  question.replaceChildren(heading, ...(current === 'review' ? review() : blocks[current]()));
  if (direction && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    question.animate([{opacity: 0, transform: 'translateX(' + direction * 13 + 'px)'}, {opacity: 1, transform: 'none'}],
      {duration: 180, easing: 'ease-out'});
  }
  if (focus) heading.focus();
}
function go(step, direction, edit = false) {
  current = step;
  editFromReview = edit;
  persist();
  draw({focus: true, direction});
}
function showError(problem) {
  error.textContent = problem.message;
  const controls = [...question.querySelectorAll('[data-answer]')];
  const first = controls.find(input => input.dataset.answer === problem.field) ??
    controls.find(input => input.dataset.answer.startsWith(problem.field + '-'));
  if (first) {
    first.setAttribute('aria-invalid', 'true');
    first.setAttribute('aria-describedby', 'form-error');
    first.focus();
  }
}
function confirmReceipt() {
  form.hidden = true;
  confirmation.hidden = false;
  confirmation.querySelector('.receipt span').textContent = submitted;
  confirmation.querySelector('h2').focus();
}

// A mobile keyboard can resize or pan only the visible viewport, leaving
// sticky controls behind it.
const viewport = window.visualViewport;
if (viewport) {
  const fitActions = () => {
    const overlap = viewport.scale === 1
      ? Math.max(0, document.documentElement.clientHeight - viewport.height - viewport.offsetTop) : 0;
    form.style.setProperty('--keyboard-overlap', Math.round(overlap) + 'px');
  };
  viewport.addEventListener('resize', fitActions);
  viewport.addEventListener('scroll', fitActions);
  fitActions();
}
back.onclick = () => {
  if (busy) return;
  const plan = applicationSteps(answers.roles);
  const prior = editFromReview ? 'review' : plan[plan.indexOf(current) - 1];
  if (prior) go(prior, -1);
};
form.onsubmit = async event => {
  event.preventDefault();
  if (busy) return;
  if (current !== 'review') {
    try {
      const cleaned = normalizeStep(current, answers, answers.roles);
      Object.assign(answers, cleaned);
      const plan = applicationSteps(answers.roles);
      go(editFromReview ? 'review' : plan[plan.indexOf(current) + 1], 1);
    } catch (problem) { showError(problem); }
    return;
  }
  let application;
  try { application = normalizeApplication(answers); }
  catch (problem) {
    const issue = applicationSteps(answers.roles).slice(0, -1).find(step => {
      try { normalizeStep(step, answers, answers.roles); return false; } catch { return true; }
    });
    if (issue) go(issue, -1, true);
    showError(problem);
    return;
  }

  busy = true;
  back.disabled = next.disabled = true;
  question.inert = true;
  next.textContent = 'Sending…';
  error.textContent = '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const payload = JSON.stringify(application);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    const fingerprint = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    if (!submissionId || fingerprint !== sendFingerprint) submissionId = crypto.randomUUID();
    sendFingerprint = fingerprint;
    persist();
    const body = new URLSearchParams({
      'form-name': formName, 'bot-field': form.elements['bot-field'].value, subject: 'New GFS careers application',
      gfs_contract: contract, intake_kind: 'careers', submission_id: submissionId, ...applicationFormData(application),
    });
    const response = await fetch('/_netlify-forms.html', {method: 'POST', body, signal: controller.signal,
      mode: 'same-origin', referrerPolicy: 'no-referrer'});
    if (!response.ok) throw Error();
    submitted = 'web_' + submissionId;
    answers = {};
    submissionId = '';
    sendFingerprint = '';
    persist();
    confirmReceipt();
  } catch {
    error.textContent = 'We couldn’t send the application. Your answers are still here. Try again when you’re connected.';
  } finally {
    clearTimeout(timer);
    busy = false;
    question.inert = false;
    back.disabled = next.disabled = false;
    next.textContent = 'Send application';
  }
};
document.getElementById('start-over').onclick = () => {
  submitted = '';
  current = 'roles';
  persist();
  confirmation.hidden = true;
  form.hidden = false;
  draw({focus: true});
};
document.querySelector('[data-fallback]').hidden = true;
if (submitted) confirmReceipt();
else {
  form.hidden = false;
  draw();
}
