import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';

const run = promisify(execFile);
const routes = ['/', '/quote/', '/quote/ballpark/', '/fences/wood/'];
const contentTypes = {
  '.avif': 'image/avif', '.css': 'text/css', '.gif': 'image/gif',
  '.html': 'text/html', '.ico': 'image/x-icon', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.js': 'text/javascript', '.json': 'application/json',
  '.mjs': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2',
};
// Keep visits to the local build out of the live database and ad reports.
const blocked = [
  '*://firestore.googleapis.com/*', '*://identitytoolkit.googleapis.com/*',
  '*://securetoken.googleapis.com/*', '*://www.googletagmanager.com/*',
  '*://*.google-analytics.com/*', '*://*.doubleclick.net/*',
];

const root = resolve('dist');
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const type = contentTypes[extname(file)] ?? 'application/octet-stream';
    const headers = { 'Content-Type': type, Vary: 'Accept-Encoding' };
    let body = await readFile(file);
    if (/^(text\/|application\/json|image\/svg)/.test(type) && /\bgzip\b/.test(request.headers['accept-encoding'] ?? '')) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    response.writeHead(200, headers).end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
});

function kibibytes(bytes) {
  return `${Math.round(bytes / 1024)} KiB`;
}

function summarize(route, origin, report) {
  if (report.runtimeError) throw new Error(report.runtimeError.message);
  const { audits, categories } = report;
  const requests = audits['network-requests'].details.items;
  const biggest = requests.filter(request => /^https?:/.test(request.url))
    .sort((first, second) => second.transferSize - first.transferSize).slice(0, 3);
  return {
    Page: route,
    Score: Math.round(categories.performance.score * 100),
    FCP: audits['first-contentful-paint'].displayValue,
    LCP: audits['largest-contentful-paint'].displayValue,
    TBT: audits['total-blocking-time'].displayValue,
    CLS: audits['cumulative-layout-shift'].displayValue,
    Transfer: kibibytes(audits['total-byte-weight'].numericValue),
    'Three largest requests': biggest.map(request => {
      const url = new URL(request.url);
      const resource = (url.origin === origin ? '' : url.host) + url.pathname;
      return `${resource} (${kibibytes(request.transferSize)})`;
    }).join(', '),
  };
}

const build = await run(process.execPath, ['scripts/build.mjs']);
process.stdout.write(build.stdout);
const output = await mkdtemp(join(tmpdir(), 'gfs-lighthouse-'));
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  for (const [index, route] of routes.entries()) {
    console.log(`Auditing ${route}`);
    const reportPath = join(output, `${index}.json`);
    try {
      await run('lighthouse', [
        origin + route, '--only-categories=performance', '--output=json',
        `--output-path=${reportPath}`, '--disable-full-page-screenshot',
        `--chrome-flags=--headless --disable-dev-shm-usage ${process.env.LIGHTHOUSE_CHROME_FLAGS ?? ''}`,
        ...blocked.map(pattern => `--blocked-url-patterns=${pattern}`), '--quiet',
      ]);
    } catch (error) {
      throw new Error(`Lighthouse failed on ${route}. Check that Chrome or Chromium is installed and set CHROME_PATH if needed.\n${error.stderr || error.message}`);
    }
    results.push(summarize(route, origin, JSON.parse(await readFile(reportPath, 'utf8'))));
  }
  console.table(results);
} finally {
  server.close();
  await rm(output, { recursive: true, force: true });
}
