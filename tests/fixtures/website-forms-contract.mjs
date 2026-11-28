// Canonical fixture in gfs-website. Keep the gfence-app test copy identical.
// Netlify's verified form event exposes {data}.
// https://docs.netlify.com/build/functions/trigger-on-events/#form-events
// tests/intake-handler.test.mjs exercises the Request fallback with
// {payload:{form_name,data},site:{name}}. Routing consumes the browser's
// form-name field. Both deliveries can add the metadata in providerData.
// All identities, addresses, IPs, and click IDs in this file are synthetic.

export const receivedAt = '2026-11-27T15:00:00.000Z';
export const transports = ['formSubmitted', 'request'];
export const providerData = {
  ip: '192.0.2.44',
  user_agent: 'Synthetic Netlify form browser',
  referrer: 'https://referrer.example.test/forms/',
};

const received = {createdAt: receivedAt, createdAtMs: Date.parse(receivedAt)};
const contact = {
  name: 'Test Customer',
  phone: '(419) 555-0142',
  email: 'customer@example.test',
  address: '1 Main St, Toledo, OH',
};
const estimateDefaults = {
  status: 'new', fenceType: '', fenceStyle: '', linearFeet: null, height: '',
  singleGates: 0, doubleGates: 0, timeline: '', geometry: '',
};
const visit = {date: '2026-12-08', time: 'Morning (8 am - 12 pm)'};
const geometry = JSON.stringify({
  lines: [[{lat: 0, lng: 0}, {lat: 0, lng: 0.0001}]],
  gates: [{lat: 0, lng: 0.00005, type: 'walk'}],
});

const careerContact = {
  name: 'Test Applicant', phone: '(419) 555-0182', email: 'applicant@example.test',
  street: '1 Main St', city: 'Toledo', state: 'OH', zip: '43612',
};
export const careerAnswers = {
  version: 1,
  street: '1 Main St', city: 'Toledo', state: 'OH', zip: '43612',
  roles: ['installer', 'crew', 'sales', 'other'],
  reachWay: 'Text', reachTime: 'Afternoon', transportation: 'yes', license: 'no',
  fenceYears: 3, fenceTypes: ['Wood', 'Gates'], skills: ['Carpentry', 'Estimating'],
  otherSkills: 'Finish work', tools: 'Hand tools and a level',
  employment: [
    {company: 'Test Employer One', role: 'Installer', start: '2020-01', end: '2023-02', duties: 'Set posts', mayContact: 'no'},
    {company: 'Test Employer Two', role: 'Crew lead', start: '2023-03', end: '2024-04', duties: 'Check layouts', mayContact: 'yes'},
    {company: 'Test Employer Three', role: 'Estimator', start: '2024-05', end: '', duties: 'Review measurements', mayContact: 'no'},
  ],
  crewSize: 2, business: 'Test Crew', liability: 'yes', workersComp: 'no',
  salesYears: 4, onSiteQuote: 'yes',
  pay: {
    installer: {unit: 'hourly', amount: 34},
    crew: {unit: 'foot', amount: 12},
    sales: {unit: 'commission', amount: 5},
    other: {unit: 'salary', amount: 41000},
  },
  hours: 40, days: ['Monday', 'Saturday'], startDate: '2026-12-07', travel: 'no',
  authorized: 'yes', adult: 'yes', heardFrom: 'Friend',
  notes: 'Available most afternoons', consent: true,
};
const careerFields = {
  ...careerContact,
  roles: 'Fence installer, Subcontractor crew, Salesperson, General / other',
  reach_way: 'Text', reach_time: 'Afternoon', transportation: 'yes', license: 'no',
  fence_years: '3', fence_types: 'Wood, Gates', skills: 'Carpentry, Estimating',
  other_skills: 'Finish work', tools: 'Hand tools and a level',
  job_1_company: 'Test Employer One', job_1_role: 'Installer', job_1_start: '2020-01',
  job_1_end: '2023-02', job_1_duties: 'Set posts', job_1_may_contact: 'no',
  job_2_company: 'Test Employer Two', job_2_role: 'Crew lead', job_2_start: '2023-03',
  job_2_end: '2024-04', job_2_duties: 'Check layouts', job_2_may_contact: 'yes',
  job_3_company: 'Test Employer Three', job_3_role: 'Estimator', job_3_start: '2024-05',
  job_3_duties: 'Review measurements', job_3_may_contact: 'no',
  crew_size: '2', business: 'Test Crew', liability: 'yes', workers_comp: 'no',
  sales_years: '4', on_site_quote: 'yes',
  installer_pay_unit: 'Hourly ($/hr)', installer_pay_amount: '34',
  crew_pay_unit: 'Per foot ($/ft)', crew_pay_amount: '12',
  sales_pay_unit: 'Commission (%)', sales_pay_amount: '5',
  other_pay_unit: 'Salary ($/year)', other_pay_amount: '41000',
  hours: '40', days: 'Monday, Saturday', start_date: '2026-12-07', travel: 'no',
  authorized: 'yes', adult: 'yes', heard_from: 'Friend',
  notes: 'Available most afternoons', consent: 'yes',
};

const makeForm = (name, kind, submissionId, fields, collection, record) => {
  const data = {
    ...fields, 'bot-field': '', submission_id: submissionId, intake_kind: kind,
    gfs_contract: name === 'careers' ? 'gfs-careers-v1' : 'gfs-intake-v1',
    ...providerData,
  };
  const formName = 'gfs-' + kind;
  return {
    name, formName,
    event: {data},
    request: {
      url: 'https://forms.example.test/.netlify/functions/submission-created',
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: {payload: {form_name: formName, data}, site: {name: 'synthetic-form-site'}},
    },
    expected: {id: 'web_' + submissionId, collection, record: {...record, ...received}},
  };
};

export const websiteForms = [
  makeForm('careers', 'careers', 'test_contract_careers_01', {
    ...careerFields, subject: 'New GFS careers application',
  }, 'websiteLeads', {
    ...estimateDefaults, name: careerContact.name, phone: careerContact.phone,
    email: careerContact.email, address: '1 Main St, Toledo, OH 43612',
    notes: '', source: 'careers', meta: JSON.stringify(careerAnswers),
  }),
  makeForm('contact', 'estimate', 'test_contract_contact_01', {
    ...contact, source: 'website', subject: 'Test contact request',
    best_way_to_reach: 'Call', notes: 'Best way to reach: Call\nAsk about a walk gate.',
    fenceType: 'Wood', linearFeet: '120', singleGates: '1',
    meta: 'gclid=TestContactClick01 | utm_source=google',
  }, 'websiteLeads', {
    ...contact, ...estimateDefaults, source: 'website',
    notes: 'Best way to reach: Call\nAsk about a walk gate.', fenceType: 'Wood',
    linearFeet: 120, singleGates: 1, meta: 'gclid=TestContactClick01 | utm_source=google',
  }),
  makeForm('ballpark', 'ballpark', 'test_contract_ballpark_01', {
    ...contact, source: 'ballpark-quote-tool', subject: 'Test ballpark request',
    best_way_to_reach: 'Email', notes: 'Best way to reach: Email\nGate on the left.',
    fenceType: 'Vinyl', linearFeet: '80', height: '6', singleGates: '1', geometry,
    meta: 'gclid=TestBallparkClick01 | utm_source=google',
  }, 'websiteLeads', {
    ...contact, ...estimateDefaults, source: 'ballpark-quote-tool',
    notes: 'Best way to reach: Email\nGate on the left.', fenceType: 'Vinyl',
    linearFeet: 80, height: '6', singleGates: 1, geometry,
    meta: 'gclid=TestBallparkClick01 | utm_source=google',
  }),
  makeForm('booking', 'booking', 'test_contract_booking_01', {
    ...contact, ...visit, source: 'website-booking', subject: 'Test site visit request',
    best_way_to_reach: 'Text', notes: 'Best way to reach: Text\nUse the side gate.',
    meta: 'gclid=TestBookingClick01 | utm_source=google',
  }, 'bookings', {
    ...contact, ...visit, source: 'website-booking',
    notes: 'Best way to reach: Text\nUse the side gate.',
    meta: 'gclid=TestBookingClick01 | utm_source=google',
  }),
];
