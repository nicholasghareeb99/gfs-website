// The Showroom's reviews deck must only show real reviews, word for word, from the reviews page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../public/showroom/data.json', import.meta.url), 'utf8'));
const unescape = s => s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const flat = s => unescape(s).replace(/<[^>]+>/g, ' ').replace(/[“”"]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
const page = flat(readFileSync(new URL('../public/reviews/index.html', import.meta.url), 'utf8'));

test('showroom reviews come from the reviews page, word for word', () => {
  assert.ok(data.reviews.length > 0);
  for (const r of data.reviews) {
    const q = flat(r.quote).replace(/^"|"$/g, '').trim();
    assert.ok(page.includes(q), `quote not on the reviews page: ${q.slice(0, 60)}`);
    assert.ok(page.includes(flat(r.name).trim()), `reviewer not on the reviews page: ${r.name}`);
  }
});
