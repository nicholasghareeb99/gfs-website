// The Showroom's AI fence-rule lookup: the release pipeline's read-only checks must hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/showroom-ai.mjs';
const post = body => new Request('https://ghareebfence.com/.netlify/functions/showroom-ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('GET answers 405 "POST only"', async () => {
  const r = await handler(new Request('https://ghareebfence.com/.netlify/functions/showroom-ai'));
  assert.equal(r.status, 405); assert.deepEqual(await r.json(), { error: 'POST only' });
});
test('without a key the ping answers 503 not-configured and nothing is looked up', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const r = await handler(post({ ping: true }));
  assert.equal(r.status, 503); assert.deepEqual(await r.json(), { error: 'not-configured' });
});
test('with a key the ping answers 200 ok without calling the AI', async t => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  t.after(() => delete process.env.ANTHROPIC_API_KEY);
  const real = globalThis.fetch; let called = false; globalThis.fetch = async () => { called = true; throw Error('no'); };
  t.after(() => { globalThis.fetch = real; });
  const r = await handler(post({ ping: true }));
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }); assert.equal(called, false);
});
test('another site cannot use it', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const r = await handler(new Request('https://ghareebfence.com/.netlify/functions/showroom-ai', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }));
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(r.status, 403);
});
