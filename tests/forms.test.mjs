// The path a customer request takes: the page's lead script builds it, the
// hidden Netlify form has to declare every field (Netlify drops the rest),
// and the intake function has to accept what arrives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { declaredForms, loadLeads } from './helpers.mjs';
import { intakeRecord } from '../netlify/functions/submission-created.mjs';

// Sent with every request but not form fields: Netlify's own routing and
// spam fields, and `status`, which the intake function sets itself.
const NOT_FORM_FIELDS = new Set(['form-name', 'bot-field', 'status']);

const customer = { name: 'Test Customer', phone: '(419) 555-0142', email: '', address: '1 Main St, Toledo, OH' };
const quote = { ...customer, source: 'website', fenceType: 'Wood', fenceStyle: 'Cedar Privacy', linearFeet: 150, height: '6', notes: 'Gate on the left side.' };
const drawing = JSON.stringify({
  lines: [[{ lat: 41.65, lng: -83.55 }, { lat: 41.6503, lng: -83.55 }], [{ lat: 41.6503, lng: -83.55 }, { lat: 41.6503, lng: -83.5496 }]],
  gates: [], runStyles: [{ run: 1, style: 'Galv Chain Link 4ft', height: '4' }],
});
const ballpark = {
  ...customer, source: 'ballpark-quote-tool', fenceType: 'Vinyl', fenceStyle: 'Kingston - White 6ft', linearFeet: 220, height: '6',
  singleGates: 2, doubleGates: 1, timeline: 'Within 1 to 3 months', geometry: drawing, siteNotes: ['Dog in the yard', 'Yard slopes'],
  sections: '140 ft of Kingston - White 6ft, 2 walk gates\n80 ft of Galv Chain Link 4ft, 1 drive gate', priceRange: '$9,900–$10,900',
};

/** What Netlify would keep of a request, in the shape its function receives. */
function received(fields, form) {
  const declared = new Set(declaredForms()[form]);
  return Object.fromEntries(Object.entries(fields).filter(([key]) => declared.has(key)));
}

test('the three hidden forms exist and put the subject first', () => {
  const forms = declaredForms();
  assert.deepEqual(Object.keys(forms).sort(), ['gfs-ballpark', 'gfs-booking', 'gfs-estimate']);
  for (const [name, fields] of Object.entries(forms)) {
    const visible = fields.filter(field => field !== 'form-name' && field !== 'bot-field');
    assert.equal(visible[0], 'subject', name + ' starts with the subject');
    for (const needed of ['name', 'phone', 'best_way_to_reach', 'summary', 'notes', 'submission_id']) assert.ok(fields.includes(needed), name + ' declares ' + needed);
  }
});

test('a request with no contact preference is refused and nothing is sent', async () => {
  const { leads, sent } = loadLeads();
  const result = await leads.submit(quote);
  assert.equal(result.ok, false);
  assert.equal(result.field, 'contactMethod');
  assert.match(result.errors[0], /best way to reach you/i);
  assert.equal(sent.length, 0);
  const booking = await leads.submitBooking({ ...customer, date: '2026-11-18', time: 'Morning (8 am - 12 pm)' });
  assert.equal(booking.ok, false);
  assert.equal(booking.field, 'contactMethod');
  assert.equal(sent.length, 0);
});

test('choosing Email requires an email address', async () => {
  const { leads, sent } = loadLeads();
  const result = await leads.submit({ ...quote, contactMethod: 'Email' });
  assert.equal(result.ok, false);
  assert.equal(sent.length, 0);
  const fixed = await leads.submit({ ...quote, contactMethod: 'Email', email: 'customer@example.com' });
  assert.equal(fixed.ok, true);
  assert.equal(sent.length, 1);
});

for (const [label, form, collection, send] of [
  ['detailed quote', 'gfs-estimate', 'websiteLeads', leads => leads.submit({ ...quote, contactMethod: 'Call', bestTime: 'Morning' })],
  ['ballpark tool', 'gfs-ballpark', 'websiteLeads', leads => leads.submit({ ...ballpark, contactMethod: 'Text', bestTime: 'Evening' })],
  ['site visit booking', 'gfs-booking', 'bookings', leads => leads.submitBooking({ ...customer, contactMethod: 'Text', date: '2026-11-18', time: 'Morning (8 am - 12 pm)', notes: 'Side gate is unlocked.' })],
]) {
  test(label + ': every field sent is declared, and the intake function accepts it', async () => {
    const { leads, sent } = loadLeads({ pathname: form === 'gfs-ballpark' ? '/quote/ballpark/' : form === 'gfs-booking' ? '/quote/book/' : '/quote/form/' });
    const result = await send(leads);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.match(result.id, /^web_/);
    assert.equal(sent.length, 1);
    const fields = sent[0].fields;
    assert.equal(sent[0].url, '/_netlify-forms.html');
    assert.equal(fields['form-name'], form);

    const declared = new Set(declaredForms()[form]);
    const dropped = Object.keys(fields).filter(key => !declared.has(key) && !NOT_FORM_FIELDS.has(key));
    assert.deepEqual(dropped, [], 'fields Netlify would drop');

    assert.ok(fields.subject.length <= 140, 'subject fits an email subject line');
    assert.match(fields.subject, /Test Customer/);
    assert.match(fields.best_way_to_reach, /^(Call|Text|Email)$/);
    assert.match(fields.notes, /^Best way to reach: (Call|Text|Email)/);
    assert.doesNotMatch(fields.summary + fields.subject, /https?:\/\//, 'no links in the office email summary');

    const intake = intakeRecord(received(fields, form), new Date('2026-11-13T12:00:00Z'));
    assert.equal(intake.collection, collection);
    assert.equal(intake.id, result.id);
    assert.ok(Object.keys(intake.record).length <= 20, 'record stays within the 20-field limit');
    assert.match(intake.record.notes, /Best way to reach/);
  });
}

test('ballpark tool: added styles, yard notes, price range and drawing reach the office', async () => {
  const { leads, sent } = loadLeads({ pathname: '/quote/ballpark/' });
  await leads.submit({ ...ballpark, contactMethod: 'Text' });
  const fields = sent[0].fields;
  assert.match(fields.fence_sections, /140 ft of Kingston/);
  assert.match(fields.fence_sections, /80 ft of Galv Chain Link/);
  assert.match(fields.site_notes, /Dog in the yard/);
  assert.equal(fields.price_range_shown, '$9,900–$10,900');
  assert.ok(fields.map_drawing, 'a plain-words line about the drawing');
  assert.deepEqual(JSON.parse(fields.geometry).runStyles, [{ run: 1, style: 'Galv Chain Link 4ft', height: '4' }]);
  const intake = intakeRecord(received(fields, 'gfs-ballpark'), new Date('2026-11-13T12:00:00Z'));
  assert.equal(JSON.parse(intake.record.geometry).lines.length, 2, 'the drawing is stored for the Executive app');
});
