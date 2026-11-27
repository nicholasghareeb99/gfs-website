// Reserved Netlify event filename: Netlify runs this after a deploy succeeds and refuses outside callers.
// After a production deploy it tells IndexNow (Bing, Yandex, Seznam, Naver; Bing feeds DuckDuckGo,
// Copilot and ChatGPT search) which pages exist, so new and changed pages are crawled within days.
// Google does not use IndexNow; Google reads the sitemap through Search Console.
//
// The key is public by design: IndexNow checks that https://ghareebfence.com/<key>.txt holds it.
// No secrets, no customer data. A failure here never affects the deploy.

export const INDEXNOW_KEY = '7eb2c881277817380bb5af24d985cd73';
export const SITE_HOST = 'ghareebfence.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10000;

// Pull <loc> URLs for this host out of a sitemap. Other hosts and non-https links are dropped.
export function sitemapUrls(xml, host = SITE_HOST) {
  const out = new Set();
  for (const m of String(xml ?? '').matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const raw = m[1].replace(/&amp;/g, '&');
    let url;
    try { url = new URL(raw); } catch { continue; }
    if (url.protocol === 'https:' && url.host === host) out.add(url.href);
    if (out.size >= MAX_URLS) break;
  }
  return [...out];
}

export function indexNowBody(urls, host = SITE_HOST, key = INDEXNOW_KEY) {
  return { host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(0, MAX_URLS) };
}

// Only the live production site, never deploy previews or branch deploys.
export function isProductionDeploy(deploy) {
  return !!deploy && deploy.context === 'production' && (deploy.state === undefined || deploy.state === 'ready');
}

export async function pingIndexNow({ fetchImpl = fetch, host = SITE_HOST } = {}) {
  const site = `https://${host}`;
  const sitemap = await fetchImpl(`${site}/sitemap.xml`, { headers: { accept: 'application/xml' } });
  if (!sitemap.ok) throw Error(`sitemap ${sitemap.status}`);
  const urls = sitemapUrls(await sitemap.text(), host);
  if (!urls.length) throw Error('sitemap had no URLs');
  const res = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowBody(urls, host)),
  });
  return { status: res.status, count: urls.length };
}

async function readDeploy(input) {
  try {
    const body = typeof input?.json === 'function' ? await input.json() : JSON.parse(input?.body ?? '{}');
    return body?.payload ?? null;
  } catch { return null; }
}

export default async function deploySucceeded(input) {
  const deploy = await readDeploy(input);
  if (!isProductionDeploy(deploy)) return new Response('skipped: not production', { status: 200 });
  try {
    const { status, count } = await pingIndexNow();
    console.log(`IndexNow: sent ${count} URLs, status ${status}`);
    return new Response(`indexnow ${status} (${count} urls)`, { status: 200 });
  } catch (err) {
    console.log(`IndexNow skipped: ${err.message}`);
    return new Response('indexnow skipped', { status: 200 });
  }
}
