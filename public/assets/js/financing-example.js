/* Financing example on the ballpark price card.
 *
 * When the ballpark tool shows a price range, this adds an example monthly
 * payment under "Considering financing?". The numbers are not ours: they are
 * the illustration Slice by FNBO publishes for its own loans (payments per
 * $10,000 borrowed at one example APR), applied to the range on screen.
 * Source: https://www.fnbo.com/pos-lending/slice/how-financing-works
 * Checked November 17, 2026. FNBO changes its pricing from time to time:
 * re-check the page and update EXAMPLE when it does.
 *
 * It only reads the range the tool already shows. It never sees a per-foot
 * rate and does not change how the price is worked out.
 */
(function (root) {
  'use strict';

  var EXAMPLE = {
    apr: 15.24,
    per: 10000,
    terms: [
      { months: 48, payment: 279.53 },
      { months: 120, payment: 162.81 },
      { months: 240, payment: 133.46 }
    ]
  };
  // The lender does not write loans with a monthly payment below this, so a
  // smaller example would show a payment nobody can actually get.
  var MIN_PAYMENT = 99;
  var DEFAULT_MONTHS = 120;

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  // "$4,200 – $5,600" -> {low: 4200, high: 5600}. Anything else -> null.
  function parseRange(text) {
    var found = String(text || '').match(/\$\s?[\d,]+/g);
    if (!found || !found.length || found.length > 2) return null;
    var nums = found.map(function (part) { return Number(part.replace(/[^\d]/g, '')); });
    if (nums.some(function (n) { return !isFinite(n) || n <= 0; })) return null;
    var low = Math.min.apply(null, nums), high = Math.max.apply(null, nums);
    return { low: low, high: high };
  }

  // The loan lengths that give a real payment for this range, shortest first.
  function options(range) {
    if (!range) return [];
    return EXAMPLE.terms.map(function (term) {
      return {
        months: term.months,
        per: term.payment,
        low: range.low * term.payment / EXAMPLE.per,
        high: range.high * term.payment / EXAMPLE.per
      };
    }).filter(function (option) { return option.low >= MIN_PAYMENT; });
  }

  // The length the person picked if it is still offered, else 120 months,
  // else the longest one that is.
  function pick(list, wanted) {
    if (!list.length) return null;
    var byMonths = function (months) { return list.filter(function (o) { return o.months === months; })[0]; };
    return byMonths(wanted) || byMonths(DEFAULT_MONTHS) || list[list.length - 1];
  }

  function amountText(option) {
    var low = money(option.low), high = money(option.high);
    return low === high ? 'About ' + low : 'About ' + low + ' – ' + high;
  }

  function noteText(option) {
    return 'Example only, at ' + EXAMPLE.apr + '% fixed APR. This is the illustration Slice by FNBO publishes (' +
      option.months + ' monthly payments of $' + option.per.toFixed(2) + ' for each $' + EXAMPLE.per.toLocaleString('en-US') +
      ' borrowed), applied to this price range. Your rate, loan length and payment depend on the offer you qualify for. ' +
      'Loans are made by First National Bank of Omaha and are subject to credit approval.';
  }

  function start(doc) {
    var box = doc.getElementById('bp-finance');
    var rangeEl = doc.getElementById('bp-price-range');
    if (!box || !rangeEl) return null;
    var wanted = DEFAULT_MONTHS;
    var wrap = doc.createElement('div');
    wrap.id = 'bp-finance-example';
    wrap.style.cssText = 'margin:6px 0 4px;';
    var line = doc.createElement('div');
    var amount = doc.createElement('span');
    amount.className = 'num';
    amount.style.cssText = 'font-size:26px;font-weight:600;color:var(--cream);';
    var length = doc.createElement('div');
    length.style.cssText = 'font-size:13px;color:rgba(250,246,239,0.7);margin-top:2px;';
    line.appendChild(amount);
    line.appendChild(length);
    var chooser = doc.createElement('div');
    chooser.setAttribute('role', 'group');
    chooser.setAttribute('aria-label', 'Loan length for the example');
    chooser.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;';
    var note = doc.createElement('p');
    note.style.cssText = 'font-size:12px;color:rgba(250,246,239,0.6);margin:10px 0 0;line-height:1.5;';
    wrap.appendChild(line);
    wrap.appendChild(chooser);
    wrap.appendChild(note);
    var buttons = EXAMPLE.terms.map(function (term) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.textContent = term.months + ' months';
      b.setAttribute('data-months', String(term.months));
      b.style.cssText = 'min-height:44px;padding:0 14px;font-family:var(--mono);font-size:12px;letter-spacing:0.06em;border-radius:4px;cursor:pointer;';
      b.addEventListener('click', function () { wanted = term.months; update(); });
      chooser.appendChild(b);
      return b;
    });
    var link = doc.getElementById('bp-finance-link');
    if (link && link.parentNode === box) box.insertBefore(wrap, link); else box.appendChild(wrap);

    function update() {
      var list = options(parseRange(rangeEl.textContent));
      var chosen = pick(list, wanted);
      if (!chosen) { wrap.style.display = 'none'; return; }
      wrap.style.display = '';
      amount.textContent = amountText(chosen);
      length.textContent = 'a month for ' + chosen.months + ' months';
      note.textContent = noteText(chosen);
      buttons.forEach(function (b) {
        var months = Number(b.getAttribute('data-months'));
        var offered = list.some(function (o) { return o.months === months; });
        var on = months === chosen.months;
        b.style.display = offered ? '' : 'none';
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.style.background = on ? 'var(--gold-bright)' : 'transparent';
        b.style.color = on ? 'var(--navy)' : 'var(--cream)';
        b.style.border = '1px solid ' + (on ? 'var(--gold-bright)' : 'rgba(250,246,239,0.4)');
      });
    }

    if (root.MutationObserver) {
      new root.MutationObserver(update).observe(rangeEl, { childList: true, characterData: true, subtree: true });
    }
    update();
    return { update: update, element: wrap };
  }

  var api = { EXAMPLE: EXAMPLE, MIN_PAYMENT: MIN_PAYMENT, parseRange: parseRange, options: options, pick: pick, amountText: amountText, noteText: noteText, start: start };
  root.GFSFinancingExample = api;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { start(root.document); });
    else start(root.document);
  }
})(typeof window !== 'undefined' ? window : globalThis);
