// The financing example on the ballpark price card. It applies the lender's own
// published illustration to the range on screen, never shows a payment below the
// lender's minimum, and always carries the APR and the "example only" note.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './helpers.mjs';

function load(extra = {}) {
  const sandbox = { ...extra };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('public/assets/js/financing-example.js'), sandbox);
  return sandbox.GFSFinancingExample;
}

test('reads the range the tool shows and nothing else', () => {
  const f = load();
  assert.deepEqual({ ...f.parseRange('$4,200 – $5,600') }, { low: 4200, high: 5600 });
  assert.deepEqual({ ...f.parseRange('$12,000') }, { low: 12000, high: 12000 });
  assert.equal(f.parseRange('Your price in 4 quick steps'), null);
  assert.equal(f.parseRange(''), null);
  assert.equal(f.parseRange('$1 $2 $3'), null);
});

test('uses the lender figures exactly: $10,000 gives the published payments', () => {
  const f = load();
  const list = f.options({ low: 10000, high: 10000 });
  assert.equal(JSON.stringify(list.map(o => [o.months, Math.round(o.low * 100) / 100])), '[[48,279.53],[120,162.81],[240,133.46]]');
  assert.equal(f.EXAMPLE.apr, 15.24);
});

test('never shows a payment below the lender minimum', () => {
  const f = load();
  // $5,000: 120 months would be $81 and 240 months $67, so only 48 months is offered.
  assert.equal(f.options({ low: 5000, high: 6500 }).map(o => o.months).join(), '48');
  // Under about $3,542 no example is shown at all.
  assert.equal(f.options({ low: 3000, high: 3800 }).length, 0);
  assert.equal(f.pick([], 120), null);
});

test('120 months is the default; the customer can pick another length that is offered', () => {
  const f = load();
  const list = f.options({ low: 9000, high: 12000 });
  assert.equal(list.map(o => o.months).join(), '48,120,240');
  assert.equal(f.pick(list, 120).months, 120);
  assert.equal(f.pick(list, 240).months, 240);
  const short = f.options({ low: 5000, high: 6500 });
  assert.equal(f.pick(short, 240).months, 48, 'falls back to a length that is offered');
  assert.equal(f.amountText(f.pick(list, 120)), 'About $147 – $195');
  assert.equal(f.amountText(f.options({ low: 12000, high: 12000 })[1]), 'About $195');
});

test('the note always states the APR, that it is an example, and credit approval', () => {
  const f = load();
  const note = f.noteText(f.options({ low: 9000, high: 12000 })[1]);
  assert.match(note, /Example only, at 15\.24% fixed APR/);
  assert.match(note, /120 monthly payments of \$162\.81 for each \$10,000 borrowed/);
  assert.match(note, /depend on the offer you qualify for/);
  assert.match(note, /subject to credit approval/);
  const page = read('public/financing/index.html');
  assert.match(page, /data-editable="f\.pay\.note">Example only, at 15\.24% fixed APR\.[^<]*subject to credit approval/);
});

test('the ballpark page loads the example only when the unlocked price is shown', () => {
  const page = read('public/quote/ballpark/index.html');
  const loader = page.match(/<script>([^<]*financing-example\.js[^<]*)<\/script>/)?.[1];
  assert.ok(loader);
  assert.doesNotMatch(page, /<script src="[^"]*financing-example\.js/);
  assert.ok(page.includes('id="bp-finance"') && page.includes('id="bp-price-range"'));
  assert.doesNotMatch(read('public/assets/js/financing-example.js'), /FENCE_PRICING|pricesLive|linearFeet/);
  const finance = { style: { display: 'none' } };
  const scripts = [];
  let notify;
  let disconnected = false;
  vm.runInNewContext(loader, {
    document: {
      getElementById(id) { assert.equal(id, 'bp-finance'); return finance; },
      createElement(tag) { assert.equal(tag, 'script'); return { remove() { scripts.splice(scripts.indexOf(this), 1); } }; },
      head: { appendChild(script) { scripts.push(script); } }
    },
    MutationObserver: class {
      constructor(callback) { notify = callback; }
      observe(node, options) {
        assert.equal(node, finance);
        assert.equal(options.attributes, true);
        assert.equal(options.attributeFilter.join(), 'style');
      }
      disconnect() { disconnected = true; }
    }
  });
  notify();
  assert.equal(scripts.length, 0);
  finance.style.display = 'block';
  notify();
  notify();
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /^\/assets\/js\/financing-example\.js\?/);
  assert.equal(scripts[0].async, true);
  scripts[0].onerror();
  assert.equal(scripts.length, 0);
  notify();
  assert.equal(scripts.length, 1);
  scripts[0].onload();
  assert.equal(disconnected, true);
});

// The owner chose to offer the 18-month promotion (Nov 18, 2026). It is deferred interest, so it is
// never called 0% APR or 0% interest, and wherever it is named the catch is stated beside it.
// Lender-internal figures (dealer fees, rates by credit score, other plans) never appear anywhere public.
test('the 18-month promotion is always stated with its conditions, and nothing internal is public', () => {
  const offerPages = ['public/index.html', 'public/contact/index.html', 'public/financing/index.html', 'public/faq/index.html', 'public/llms.txt'];
  const files = [...offerPages, 'public/quote/ballpark/index.html', 'public/assets/js/financing-example.js'];
  for (const file of files) {
    const text = read(file);
    for (const banned of [/0% (APR|interest)/i, /zero interest/i, /interest[- ]free/i, /same as cash/i, /12 months/i, /dealer fee/i, /merchant fee/i, /FICO/i, /9\.99%/, /12\.99%/, /auto-?pay discount/i]) {
      assert.ok(!banned.test(text), file + ' contains ' + banned);
    }
    if (offerPages.includes(file)) {
      const offer = 'No interest if paid in full within 18 months.';
      const mentions = text.split(offer);
      assert.ok(mentions.length > 1, file + ': missing the exact offer');
      assert.doesNotMatch(mentions.join(''), /no interest/i, file);
      for (const following of mentions.slice(1)) {
        const conditions = following.slice(0, 440);
        assert.match(conditions, /Interest builds from the start/, file);
        assert.match(conditions, /balance is left after 18 months/, file);
        assert.match(conditions, /monthly payments are required/i, file);
      }
    }
  }
  const f = load();
  assert.equal(f.PROMO.months, 18);
  assert.match(f.promoTerms(), /Interest builds from the start/);
  assert.match(f.promoTerms(), /18\.99% fixed from then on/);
  assert.match(f.promoTerms(), /Monthly payments are required/);
  assert.match(f.promoTerms(), /subject to credit approval/);
  assert.equal(f.payoffText({ low: 9000, high: 12600 }), 'To pay this off in 18 months: budget $500.00 – $700.00 a month.');
  assert.equal(f.payoffText(null), '');
});

test('no page still promises 0% APR or a 60-second application', () => {
  for (const page of ['public/contact/index.html', 'public/financing/index.html', 'public/faq/index.html', 'public/quote/ballpark/index.html']) {
    const html = read(page);
    assert.ok(!/0% APR/i.test(html), page + ' says 0% APR');
    assert.ok(!/60 seconds/i.test(html), page + ' says 60 seconds');
  }
});

test('eighteen payments cover each endpoint with the smallest whole-cent payment', () => {
  const f = load();
  for (const [principal, cents] of [[100, 556], [7700, 42778], [8500, 47223], [10000, 55556], [12600, 70000]]) {
    assert.ok(cents * 18 >= principal * 100);
    assert.ok((cents - 1) * 18 < principal * 100);
    const payment = (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    assert.ok(f.payoffText({ low: principal, high: principal }).includes(payment + ' a month.'));
  }
  assert.equal(f.parseRange('$8,500 – $7,700'), null);
  assert.equal(f.parseRange('$0 – $100'), null);
});
