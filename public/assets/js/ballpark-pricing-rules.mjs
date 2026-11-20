// The estimator and Netlify functions use the same catalogue and rounding rules.
export const DEFAULT_REMOVAL_RATES = Object.freeze({ remWood: 5, remChain: 3, remOther: 6 });

export function getSectionSize(name) {
  const style = String(name || '').toLowerCase();
  if (style.includes('midrail')) return 6;
  if (/split[ -]?rail|chain[ -]?link/.test(style)) return 10;
  if (style.includes('vinyl')) return 8;
  if (/aluminum|ornamental/.test(style)) return 6;
  if (/wood|cedar|treated|dog[ -]ear|board[ -]on[ -]board|shadow[ -]?box|hybrid/.test(style)) return 8;
  return 0;
}

export function isChainLink(name) {
  return /\bchain[ -]?link\b/i.test(name);
}

export function isOfferedStyle(name) {
  const text = String(name).replace(/[‘’ʼ´′]/g, "'");
  if (/\b(?:locust|barbed|razor|composite|wrought[- ]iron|snow|electric|invisible|swimming[- ]pool|pool|farm)\b/i.test(text)) return false;
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
    cost += count * rate;
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
