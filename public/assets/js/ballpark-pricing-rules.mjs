// The estimator and Netlify functions use the same catalogue and rounding rules.
export const DEFAULT_REMOVAL_RATES = Object.freeze({ remWood: 5, remChain: 3, remOther: 6 });

// The section and cent rounding rules mirror gfence-app gfs/quote-core.
// tests/ballpark-quote-core.test.mjs compares against the app's own output.
export function inferStyleCategory(style) {
  const name = String(style || '').toLowerCase();
  if (/\b(rockport|kingston|wellington|danbury|montgomery|whitney|cascade|bedford|hartford|windsor)\b/.test(name) ||
    /\b(vinyl|pvc|bufftech|certainteed)\b/.test(name)) return 'vinyl';
  if (/pool|swimming|boca/.test(name)) return 'poolcode';
  if (/split[ -]?rail|post (?:and|&) rail|ranch/.test(name)) return 'splitrail';
  if (/shadow[ -]?box|neighbor friendly/.test(name)) return 'shadowbox';
  if (/board[ -]on[ -]board|\bbob\b|overlapping/.test(name)) return 'boardonboard';
  if (/aluminum|ornamental|ultra|jerith|specrail/.test(name)) return 'aluminum';
  if (/chain|cyclone|galvanized mesh/.test(name)) return 'chain';
  if (/composite|trex|simtek|ez fence/.test(name)) return 'composite';
  if (/farm|horse|cattle|field fence|barbed|wire fence|no climb/.test(name)) return 'farm';
  if (/wrought|iron/.test(name)) return 'wrought';
  if (/treated|pressure|\bp[ /]?t\b|pine privacy/.test(name)) return 'treated';
  if (/cedar|dog[ -]ear|stockade|privacy wood|flat top|straight top|wood|picket|privacy/.test(name)) return 'cedar';
  return 'custom';
}

export function materialEngineCategory(category) {
  if (['cedar', 'treated', 'shadowbox', 'boardonboard', 'composite', 'farm', 'wrought'].includes(category)) return 'wood';
  return category === 'poolcode' ? 'aluminum' : category === 'chainlink' ? 'chain' : category;
}

const categories = ['wood', 'cedar', 'treated', 'shadowbox', 'boardonboard', 'splitrail', 'vinyl', 'aluminum',
  'chain', 'chainlink', 'composite', 'farm', 'wrought', 'poolcode', 'custom'];
export function sectionSize(style, settings, detectCategory, overrides = {'rockport-midrail': 6, 'rockport midrail': 6, midrail: 6}) {
  if (!style) return 0;
  const name = String(style).toLowerCase();
  for (const [pattern, size] of Object.entries(overrides)) {
    if (name.includes(pattern.toLowerCase())) return size;
  }
  try {
    const category = detectCategory?.(style);
    const material = category === 'chain' ? 'chainlink' : category === 'wood' ? 'cedar' : category;
    const spacing = parseFloat(settings?.materials?.[material]?.postSpacing);
    if (Number.isFinite(spacing) && spacing > 0) return spacing;
  } catch {
    // Use the same name rules if category detection isn't available.
  }
  if (/split[ -]?rail/.test(name) || /chain[ -]?link/.test(name)) return 10;
  if (name.includes('vinyl')) return 8;
  if (name.includes('aluminum') || name.includes('ornamental')) return 6;
  if (['wood', 'cedar', 'treated', 'dog ear', 'dog-ear', 'board on board', 'board-on-board',
    'shadow box', 'shadowbox', 'hybrid'].some(part => name.includes(part))) return 8;
  return 0;
}

export function roundPrice(value) {
  const number = parseFloat(value);
  const [digits, power = 0] = String(Number.isFinite(number) ? number : 0).split('e');
  const cents = Number(digits + 'e' + (Number(power) + 2));
  return Math.round(cents + Number.EPSILON * Math.abs(cents)) / 100;
}

export function getSectionSize(name, settings = {}) {
  return sectionSize(name, settings, style => {
    const map = settings.styleMaterialMap || {};
    const mapped = Object.hasOwn(map, style) && String(map[style] || '').trim();
    return materialEngineCategory(mapped ? categories.includes(map[style]) ? map[style] : 'custom' : inferStyleCategory(style));
  });
}

export function isChainLink(name) {
  return /\bchain[ -]?link\b/i.test(name);
}

export function isOfferedStyle(name) {
  const text = String(name).replace(/[‘’ʼ´′]/g, "'");
  if (/\b(?:locust|barbed|razor|composite|wrought[- ]iron|snow|electric|invisible|farm)\b/i.test(text)) return false;
  if (!isChainLink(text)) return true;

  // A height in a range (e.g. 4–8 ft) also has to be within the catalogue.
  const dimensions = [...text.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:ft\b|feet\b|foot\b|')\s*(?:(\d+)\s*(?:["″]|inches\b|in\b))?/gi)];
  return dimensions.every(([, feet, inches]) => Number(feet) + Number(inches || 0) / 12 <= 6);
}

export function canPriceHeight(name, height) {
  return isOfferedStyle(name) && (!isChainLink(name) || height <= 6);
}

export function positiveRate(value, fallback) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : fallback;
}

export function pricingRows(text) {
  const rows = [];
  for (const line of String(text || '').split('\n')) {
    const [name, rawFoot, rawSingle, rawDouble] = line.split(':').map(value => value.trim());
    if (!name || rawDouble === undefined || !isOfferedStyle(name)) continue;
    const perFoot = Number(rawFoot);
    if (!Number.isFinite(perFoot)) continue;
    const gateRate = (value, fallback) => value && !Number.isNaN(Number(value)) ? Number(value) : fallback;
    rows.push({ name, perFoot, singleGate: gateRate(rawSingle, 150), doubleGate: gateRate(rawDouble, 300) });
  }
  return rows;
}

export function gateCost(single, double, singleRate, doubleRate) {
  let cost = 0;
  for (const [count, rate] of [[single, singleRate], [double, doubleRate]]) {
    if (!Number.isInteger(count) || count < 0) return null;
    if (count === 0) continue;
    if (!Number.isFinite(rate) || rate <= 0) return null;
    cost += roundPrice(count * rate);
  }
  return cost;
}

export function priceBand(total) {
  const low = Math.round(total * 0.95 / 100) * 100;
  const high = Math.round(total * 1.05 / 100) * 100;
  return Number.isFinite(high) && low > 0 && high < 1e9 ? { total: Math.round(total), low, high } : null;
}

export function formatRange(low, high) {
  const dollars = amount => '$' + amount.toLocaleString('en-US');
  return dollars(low) + ' – ' + dollars(high);
}

export function parseRange(text) {
  const match = /^\$(\d{1,3}(?:,\d{3})+|\d+)(?:\s*[–-]\s*\$(\d{1,3}(?:,\d{3})+|\d+))?$/.exec(String(text || '').trim());
  if (!match) return null;
  const [low, high = low] = match.slice(1).filter(Boolean).map(value => Number(value.replace(/,/g, '')));
  return Number.isSafeInteger(low) && Number.isSafeInteger(high) && low > 0 && high >= low && high < 1e9 ? { low, high } : null;
}
