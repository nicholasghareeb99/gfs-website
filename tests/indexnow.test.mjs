import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import deploySucceeded, { INDEXNOW_KEY, sitemapUrls, indexNowBody, isProductionDeploy, pingIndexNow } from '../netlify/functions/deploy-succeeded.mjs';

test('IndexNow key file is published with exactly the key', () => {
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{32}$/);
  assert.equal(fs.readFileSync(`public/${INDEXNOW_KEY}.txt`, 'utf8'), INDEXNOW_KEY);
});

test('sitemap URLs: own https host only, no duplicates', () => {
  const xml = `<urlset><url><loc>https://ghareebfence.com/</loc></url><url><loc> https://ghareebfence.com/fences/compare/ </loc></url>
    <url><loc>https://ghareebfence.com/</loc></url><url><loc>https://evil.example/x</loc></url><url><loc>http://ghareebfence.com/old</loc></url></urlset>`;
  assert.deepEqual(sitemapUrls(xml), ['https://ghareebfence.com/', 'https://ghareebfence.com/fences/compare/']);
});

test('real sitemap feeds every listed page and nothing private', () => {
  const urls = sitemapUrls(fs.readFileSync('public/sitemap.xml', 'utf8'));
  assert.ok(urls.length > 50);
  assert.ok(urls.some(u => u.endsWith('/service-areas/waterville-oh/')));
  assert.ok(!urls.some(u => /\/(admin|portal|p|review|showroom|x3d)\//.test(new URL(u).pathname)));
  const body = indexNowBody(urls);
  assert.equal(body.keyLocation, `https://ghareebfence.com/${INDEXNOW_KEY}.txt`);
});

test('only production deploys ping', () => {
  assert.equal(isProductionDeploy({ context: 'production', state: 'ready' }), true);
  assert.equal(isProductionDeploy({ context: 'deploy-preview', state: 'ready' }), false);
  assert.equal(isProductionDeploy({ context: 'branch-deploy' }), false);
  assert.equal(isProductionDeploy(null), false);
});

test('ping posts the sitemap to IndexNow', async () => {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.endsWith('/sitemap.xml')) return new Response('<loc>https://ghareebfence.com/</loc><loc>https://ghareebfence.com/faq/</loc>');
    return new Response('', { status: 202 });
  };
  const r = await pingIndexNow({ fetchImpl });
  assert.deepEqual(r, { status: 202, count: 2 });
  assert.equal(calls[1].url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(calls[1].opts.body).urlList, ['https://ghareebfence.com/', 'https://ghareebfence.com/faq/']);
});

test('preview deploy event does nothing and never fails', async () => {
  const req = new Request('https://x/', { method: 'POST', body: JSON.stringify({ payload: { context: 'deploy-preview' } }) });
  const res = await deploySucceeded(req);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /skipped/);
  assert.equal((await deploySucceeded(new Request('https://x/', { method: 'POST', body: 'not json' }))).status, 200);
});
