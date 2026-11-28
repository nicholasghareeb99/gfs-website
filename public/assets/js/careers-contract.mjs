export const contract = 'gfs-careers-v1';
export const formName = 'gfs-careers';
export const maxPayload = 18000;
export const roles = {installer: 'Fence installer', crew: 'Subcontractor crew', sales: 'Salesperson', other: 'General / other'};
export const payUnits = {hourly: 'Hourly ($/hr)', foot: 'Per foot ($/ft)', salary: 'Salary ($/year)', commission: 'Commission (%)'};
export const payByRole = {installer: ['hourly'], crew: ['foot', 'hourly'], sales: ['salary', 'commission', 'hourly'], other: ['hourly', 'salary']};
export const fenceTypes = ['Wood', 'Vinyl', 'Aluminum', 'Chain link', 'Split rail', 'Gates', 'Post driving / no-dig', 'Concrete'];
export const skills = ['Carpentry', 'Concrete', 'Welding', 'Skid steer / auger', 'Layout / measuring', 'Estimating', 'Customer service'];
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI'.split(' ');
export const reachTimes = ['Morning', 'Afternoon', 'Evening', 'Any time'];
export const reachWays = ['Phone call', 'Text', 'Email'];
const yesNo = ['yes', 'no'];

const fail = (field, message) => { throw Object.assign(new Error(message), {field}); };
function keys(value, allowed, field) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(key => !allowed.includes(key))) {
    fail(field, 'Review the application fields and try again.');
  }
}
function text(value, field, max, optional = false) {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) {
    fail(field, 'Use ' + max + ' characters or fewer.');
  }
  const clean = value.trim();
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(clean)) fail(field, 'Leave Social Security numbers out of the application.');
  if (!clean && !optional) fail(field, 'Fill in this answer.');
  return clean;
}
function choice(value, options, field) {
  if (!options.includes(value)) fail(field, 'Choose an answer.');
  return value;
}
function choices(value, options, field, required = false) {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || value.length > options.length || value.some(item => !options.includes(item)) ||
      new Set(value).size !== value.length || (required && !value.length)) fail(field, 'Choose at least one available answer.');
  return [...value];
}
function number(value, field, {min = 0, max = 100, whole = false} = {}) {
  if ((typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value))) ||
      !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max ||
      (whole && !Number.isInteger(Number(value)))) fail(field, 'Enter a number between ' + min + ' and ' + max + '.');
  return Number(value);
}
function date(value, field, month = false) {
  const pattern = month ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/;
  const full = month ? value + '-01' : value;
  const instant = typeof value === 'string' && pattern.test(value) && Date.parse(full + 'T00:00:00Z');
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== full) {
    fail(field, month ? 'Enter a valid month in YYYY-MM format, like 2025-06.' : 'Enter a valid date.');
  }
  return value;
}
export const employmentKeys = ['company', 'role', 'start', 'end', 'duties', 'mayContact'];
export const applicationKeys = ['roles', 'name', 'phone', 'email', 'street', 'city', 'state', 'zip', 'reachWay', 'reachTime',
  'transportation', 'license', 'fenceYears', 'fenceTypes', 'skills', 'otherSkills', 'tools', 'employment', 'pay',
  'hours', 'days', 'startDate', 'travel', 'authorized', 'adult', 'crewSize', 'business', 'liability', 'workersComp',
  'salesYears', 'onSiteQuote', 'heardFrom', 'notes', 'consent'];

export function normalizeStep(step, input, selected = []) {
  switch (step) {
    case 'roles': return {roles: choices(input.roles, Object.keys(roles), 'roles', true)};
    case 'contact': {
      const name = text(input.name, 'name', 120);
      if (name.length < 2) fail('name', 'Enter at least two characters for your name.');
      const phone = text(input.phone, 'phone', 36);
      const maxEmailLength = 200;
      const email = text(input.email, 'email', maxEmailLength);
      const lowerEmail = email.toLowerCase();
      if (!/^\+?[\d(). -]+$/.test(phone) || !/^(?:\d{10}|\+?1\d{10}|\+[2-9]\d{9,14})$/.test(phone.replace(/[^\d+]/g, ''))) {
        fail('phone', 'Enter a valid phone number.');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('email', 'Enter a valid email address.');
      // Unicode lowercasing can expand an address past the Firestore limit.
      return {name, phone, email: lowerEmail.length <= maxEmailLength ? lowerEmail : email};
    }
    case 'reach': return {reachWay: choice(input.reachWay, reachWays, 'reachWay'), reachTime: choice(input.reachTime, reachTimes, 'reachTime')};
    case 'address': {
      const zip = text(input.zip, 'zip', 10);
      if (!/^\d{5}(?:-\d{4})?$/.test(zip)) fail('zip', 'Enter a five-digit ZIP code.');
      return {street: text(input.street, 'street', 160), city: text(input.city, 'city', 80),
        state: choice(input.state, states, 'state'), zip};
    }
    case 'transport': return {transportation: choice(input.transportation, yesNo, 'transportation'), license: choice(input.license, yesNo, 'license')};
    case 'experience': return {fenceYears: number(input.fenceYears, 'fenceYears', {max: 80}),
      fenceTypes: choices(input.fenceTypes, fenceTypes, 'fenceTypes')};
    case 'skills': return {skills: choices(input.skills, skills, 'skills'), otherSkills: text(input.otherSkills, 'otherSkills', 600, true),
      tools: text(input.tools, 'tools', 600, true)};
    case 'employment': {
      const list = input.employment ?? [];
      if (!Array.isArray(list) || list.length > 3) fail('employment', 'Add up to three previous jobs.');
      return {employment: list.map((row, index) => {
        const field = key => 'employment-' + index + '-' + key;
        keys(row, employmentKeys, field('company'));
        const company = text(row.company, field('company'), 120);
        const role = text(row.role, field('role'), 100);
        const start = date(row.start, field('start'), true);
        const end = row.end === undefined || row.end === '' ? '' : date(row.end, field('end'), true);
        if (end && end < start) fail(field('end'), 'An end month cannot be before the start month.');
        return {company, role, start, end, duties: text(row.duties, field('duties'), 600),
          mayContact: choice(row.mayContact, yesNo, field('mayContact'))};
      })};
    }
    case 'crew': return {crewSize: number(input.crewSize, 'crewSize', {min: 1, max: 150, whole: true}),
      business: text(input.business, 'business', 160), liability: choice(input.liability, yesNo, 'liability'),
      workersComp: choice(input.workersComp, yesNo, 'workersComp')};
    case 'sales': return {salesYears: number(input.salesYears, 'salesYears', {max: 80}), onSiteQuote: choice(input.onSiteQuote, yesNo, 'onSiteQuote')};
    case 'pay': {
      keys(input.pay ?? {}, Object.keys(roles), 'pay');
      const pay = {};
      for (const role of selected) {
        const field = key => 'pay-' + role + '-' + key;
        const entry = input.pay?.[role] ?? {};
        keys(entry, ['unit', 'amount'], field('unit'));
        const unit = choice(entry.unit, payByRole[role], field('unit'));
        pay[role] = {unit, amount: number(entry.amount, field('amount'), {min: 0.01, max: unit === 'commission' ? 100 : 1000000})};
      }
      return {pay, hours: number(input.hours, 'hours', {min: 1, max: 112, whole: true})};
    }
    case 'availability': return {days: choices(input.days, days, 'days', true), startDate: date(input.startDate, 'startDate'),
      travel: choice(input.travel, yesNo, 'travel')};
    case 'eligibility': return {authorized: choice(input.authorized, yesNo, 'authorized'), adult: choice(input.adult, yesNo, 'adult')};
    case 'closing':
      if (input.consent !== true) fail('consent', 'Check the box if we can contact you about your application.');
      return {heardFrom: text(input.heardFrom, 'heardFrom', 200), notes: text(input.notes, 'notes', 900, true), consent: true};
    default: return {};
  }
}

export function applicationSteps(selected = []) {
  return ['roles', 'contact', 'address', 'reach', 'transport', 'experience', 'skills', 'employment',
    ...(['crew', 'sales'].filter(role => selected.includes(role))), 'pay', 'availability', 'eligibility', 'closing', 'review'];
}

export function normalizeApplication(input) {
  keys(input, applicationKeys, 'application');
  const selected = normalizeStep('roles', input).roles;
  const result = Object.assign({}, ...applicationSteps(selected).map(step => normalizeStep(step, input, selected)));
  if (new TextEncoder().encode(JSON.stringify(result)).length > maxPayload) fail('application', 'Shorten your written answers and try again.');
  return result;
}
