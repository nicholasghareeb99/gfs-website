import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.GFS_E2E_PORT || 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('GFS_E2E_PORT must be an unprivileged local port');
export const BASE = 'http://127.0.0.1:' + port;
export const SITE_HOSTS = new Set([
  'ghareebfence.com', 'www.ghareebfence.com', 'gfencing.netlify.app', 'gfs-website.netlify.app',
  'ghareebfencingsolutions.com', 'www.ghareebfencingsolutions.com',
]);
export const DIST = resolve(process.env.GFS_E2E_DIST || join(ROOT, 'dist'));
const zip = promisify(gzip);
const types = {
  '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

export function localURL(url) {
  return new URL(url.pathname + url.search, BASE).href;
}

async function staticFile(path) {
  const file = resolve(DIST, '.' + decodeURIComponent(path));
  if (file !== DIST && !file.startsWith(DIST + sep)) return null;
  try {
    const entry = await stat(file);
    if (entry.isFile()) return file;
    const index = join(file, 'index.html');
    return (await stat(index)).isFile() ? index : null;
  } catch {
    return null;
  }
}

// Interpret the pathname redirects and rewrite entries in the build config.
function readRedirects(config) {
  return config.split(/^\[\[redirects\]\]/m).slice(1).map(block => {
    const from = block.match(/^from = "(\/[^"]+)"/m)?.[1];
    const to = block.match(/^to = "(\/[^"]+)"/m)?.[1];
    if (!from || !to) return null;
    const pattern = from.split('/').map(segment => {
      if (segment === '*') return '(?<splat>.*)';
      if (segment.startsWith(':')) return '(?<' + segment.slice(1) + '>[^/]+)';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    return { pattern: new RegExp('^' + pattern + '/?$'), to, status: Number(block.match(/^status = (\d+)/m)?.[1]), force: /^force = true/m.test(block) };
  }).filter(Boolean);
}

export async function startServer() {
  await stat(join(DIST, 'index.html'));
  const redirects = readRedirects(await readFile(join(ROOT, 'netlify.toml'), 'utf8'));
  const cache = new Map();
  const server = createServer(async (request, response) => {
    // Only the browser's in-memory fixtures can process a lead or API request.
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405).end();
    try {
      const url = new URL(request.url, BASE);
      let path = url.pathname;
      if (path.startsWith('/.netlify/functions/')) return response.writeHead(405).end();
      if (path === '/.netlify/images') {
        const source = url.searchParams.get('url');
        if (!source?.startsWith('/') || source.startsWith('//')) return response.writeHead(404).end();
        path = source;
      }
      let file = await staticFile(path);
      for (const rule of redirects) {
        const match = rule.pattern.exec(path);
        if (!match || (file && !rule.force)) continue;
        const target = rule.to.replace(/:(\w+)/g, (_, key) => match.groups?.[key] || '');
        if (rule.status !== 200) return response.writeHead(rule.status, { Location: target }).end();
        file = await staticFile(new URL(target, BASE).pathname);
        break;
      }
      if (!file) return response.writeHead(404).end('Not found');
      const contentType = types[extname(file)] || 'application/octet-stream';
      if (request.method === 'HEAD') return response.writeHead(200, { 'Content-Type': contentType }).end();
      const compress = /^(text\/|application\/(xml|json)|image\/svg)/.test(contentType)
        && /\bgzip\b/.test(request.headers['accept-encoding'] || '');
      if (compress && !cache.has(file)) cache.set(file, readFile(file).then(zip));
      const body = await (compress ? cache.get(file) : readFile(file));
      response.writeHead(200, {
        'Content-Type': contentType, 'Content-Length': body.length, Vary: 'Accept-Encoding',
        ...(compress ? { 'Content-Encoding': 'gzip' } : {}),
      }).end(body);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
  await new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', ok);
  });
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await startServer();
