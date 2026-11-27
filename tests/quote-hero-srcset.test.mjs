import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the quote hero preloads the same responsive source the browser will display', () => {
  const html = readFileSync(new URL('../public/quote/index.html', import.meta.url), 'utf8');
  const preload = html.match(/<link rel="preload" as="image"[^>]*imagesrcset="([^"]+)" imagesizes="([^"]+)"/);
  const photo = html.match(/<div class="ph__bg"[^>]*><img[^>]* srcset="([^"]+)" sizes="([^"]+)"/);
  assert.ok(preload && photo);
  assert.deepEqual(preload.slice(1), photo.slice(1));
});
