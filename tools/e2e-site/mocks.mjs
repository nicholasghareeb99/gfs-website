import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deliverIntake } from '../../netlify/functions/submission-created.mjs';
import { handle as handlePrice } from '../../netlify/functions/ballpark-price.mjs';
import { handle as handleMail } from '../../netlify/functions/ballpark-email.mjs';
import { declaredForms, fakeGoogle, priceFunctionEnv } from '../../tests/helpers.mjs';
import { factors, styles } from '../../tests/money-matrix-fixtures.mjs';
import { BASE, ROOT, SITE_HOSTS, localURL } from './server.mjs';

export const catalogue = [
  ...styles,
  ['Aluminum Pool Fence 4 ft', 4, 6, 35, 320, 630],
  ['Aluminum Pool Fence 5 ft', 5, 6, 38, 345, 690],
  ['Black Aluminum 5 ft', 5, 6, 36, 390, 810],
  ['Spaced Picket', 4, 0, 23, 190, 380],
  ['Wood Privacy', 6, 8, 29, 215, 450],
];
const pricing = catalogue.map(([name, , , ...rates]) => [name, ...rates].join(' : ')).join('\n');
const names = catalogue.map(([name]) => name);
const forms = declaredForms();
const environment = priceFunctionEnv({
  GFS_ESTIMATE_EMAILJS_SERVICE_ID: 'mock-service',
  GFS_ESTIMATE_EMAILJS_TEMPLATE_ID: 'mock-template',
  GFS_ESTIMATE_EMAILJS_PUBLIC_KEY: 'mock-public',
  GFS_ESTIMATE_EMAILJS_PRIVATE_KEY: 'mock-private',
});
const packageFile = (name, path) => readFile(new URL('./node_modules/' + name + '/' + path, import.meta.url));
const mapAssetTypes = { '.png': 'image/png', '.css': 'text/css', '.js': 'text/javascript' };
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf2sAAAAASUVORK5CYII=', 'base64');

function firebaseFixture(settings) {
  return `(() => {
    const settings = ${JSON.stringify(settings)};
    const missing = { exists: false, data: () => undefined };
    const api = {
      collection(name) {
        return {
          doc(id) { return { get: async () => name === 'settings' && id === 'public' ? { exists: true, data: () => settings } : missing }; },
          get: async () => ({ empty: true, docs: [], forEach() {} }),
        };
      },
    };
    window.firebase = { apps: [], initializeApp() {}, firestore: () => api };
  })();`;
}

async function replyWithWebResponse(route, response) {
  return route.fulfill({
    status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()),
  });
}

export async function mockSite(context, options = {}) {
  const state = {
    deliveries: [], intakeAttempts: [], documents: new Map(), prices: [], mails: [], outbound: [], unexpected: [],
    email: options.email ?? 'on', pricing: options.pricing ?? 'private',
    catalogueDelay: options.catalogueDelay || 0, responseDelay: options.responseDelay || 0,
    intakeStatus: 200, priceStatus: 200,
  };
  const fields = { styleNames: { arrayValue: { values: names.map(stringValue => ({ stringValue })) } } };
  const google = fakeGoogle({
    pricing, factors,
    receipts: { includes: id => state.documents.has(id) },
    leadDoc: id => state.documents.get(id),
  });
  const fetcher = async (url, init = {}) => {
    const target = new URL(url);
    if (target.hostname === 'firestore.googleapis.com' && init.method === 'POST' && target.searchParams.has('documentId')) {
      const id = target.searchParams.get('documentId');
      if (state.documents.has(id)) return new Response(null, { status: 409 });
      state.documents.set(id, { ...JSON.parse(init.body), createTime: new Date().toISOString() });
      return new Response(null, { status: 201 });
    }
    if (target.hostname === 'firestore.googleapis.com' && target.pathname.endsWith('/settings/public')) {
      return Response.json({ fields });
    }
    if (!['firestore.googleapis.com', 'oauth2.googleapis.com'].includes(target.hostname)) {
      throw Error('Unexpected function URL ' + url);
    }
    return google.fetcher(url, init);
  };

  async function intake(route, request) {
    const body = await request.formData();
    state.intakeAttempts.push(body.get('submission_id'));
    if (state.intakeStatus !== 200) return route.fulfill({ status: state.intakeStatus });
    const keys = forms[body.get('form-name')];
    if (!keys || !body.get('submission_id')) throw Error('Unexpected form submission');
    const data = Object.fromEntries([...body].filter(([key]) => keys.includes(key)));
    if (data.photo instanceof File) data.photo = { url: 'https://uploads.example.test/synthetic.png' };
    const result = await deliverIntake(data, { env: environment, fetcher });
    state.deliveries.push({ data, result });
    return route.fulfill({ status: 200, body: 'Mock Netlify receipt' });
  }

  await context.routeWebSocket('**/*', socket => socket.close());
  await context.route('**/*', async route => {
    const requisition = route.request();
    const url = new URL(requisition.url());
    const { origin, pathname, hostname } = url;
    if (origin === BASE && (requisition.method() === 'POST' || pathname.startsWith('/.netlify/functions/'))) {
      const request = new Request(url, {
        method: requisition.method(), headers: requisition.headers(), body: requisition.postDataBuffer() || undefined,
      });
      if (pathname === '/_netlify-forms.html') return intake(route, request);
      if (pathname === '/.netlify/functions/ballpark-price') {
        const input = await request.clone().json();
        if (!input.ping && state.responseDelay) await new Promise(resolve => setTimeout(resolve, state.responseDelay));
        const response = !input.ping && state.priceStatus !== 200
          ? Response.json({ error: 'Fixture pricing interruption' }, { status: state.priceStatus, headers: { 'Retry-After': '60' } })
          : await handlePrice(request, { env: environment, fetcher });
        state.prices.push({ input, status: response.status, output: await response.clone().json() });
        return replyWithWebResponse(route, response);
      }
      if (pathname === '/.netlify/functions/ballpark-email') {
        const response = await handleMail(request, {
          env: { ...environment, GFS_ESTIMATE_EMAIL_ENABLED: String(state.email === 'on') },
          fetcher, ip: '192.0.2.8',
          sender: async message => { state.mails.push(message.params); return true; },
        });
        return replyWithWebResponse(route, response);
      }
      if (pathname === '/.netlify/functions/parcel-proxy') return route.fulfill({ json: { features: [] } });
      state.unexpected.push(requisition.method() + ' ' + pathname);
      return route.fulfill({ status: 404 });
    }
    if (origin === BASE && ['GET', 'HEAD'].includes(requisition.method())) return route.continue();
    if (SITE_HOSTS.has(hostname) && requisition.method() === 'GET') {
      const response = await fetch(localURL(url), { redirect: 'manual' });
      return route.fulfill({
        status: response.status, body: Buffer.from(await response.arrayBuffer()),
        headers: { 'Content-Type': response.headers.get('content-type') || 'text/plain', 'Access-Control-Allow-Origin': '*' },
      });
    }
    state.outbound.push({ host: hostname, path: pathname, type: requisition.resourceType() });
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (hostname === 'www.gstatic.com' && pathname.startsWith('/firebasejs/')) {
      if (state.catalogueDelay && pathname.includes('firestore')) await new Promise(resolve => setTimeout(resolve, state.catalogueDelay));
      return route.fulfill({
        contentType: 'text/javascript', headers,
        body: firebaseFixture({ styleNames: names, ...(state.pricing === 'public' ? { pricing, ...factors } : {}) }),
      });
    }
    const mapAsset = pathname.match(/^\/(leaflet(?:-draw)?)@(?:1\.9\.4|1\.0\.4)\/(dist\/[a-z0-9./_-]+\.(?:png|css|js))$/i);
    if (hostname === 'unpkg.com' && mapAsset) {
      const [, library, file] = mapAsset;
      return route.fulfill({ headers, contentType: mapAssetTypes[file.slice(file.lastIndexOf('.'))], body: await packageFile(library, file) });
    }
    if (hostname === 'cdn.jsdelivr.net' && /\/jspdf(?:@[^/]+)?\/dist\/jspdf\.umd\.min\.js$/.test(pathname)) {
      return route.fulfill({
        headers, contentType: 'text/javascript', body: await readFile(join(ROOT, 'node_modules/jspdf/dist/jspdf.umd.min.js')),
      });
    }
    if (hostname === 'maps.googleapis.com' && pathname === '/maps/api/js') {
      return route.fulfill({ contentType: 'text/javascript', headers, body: 'window.GFSBallparkGoogleReady?.();' });
    }
    if (hostname.includes('nominatim')) return route.fulfill({ headers, json: [] });
    if (requisition.resourceType() === 'image') return route.fulfill({ headers, contentType: 'image/png', body: pixel });
    if (requisition.resourceType() === 'script') return route.fulfill({ headers, contentType: 'text/javascript', body: '' });
    if (requisition.resourceType() === 'stylesheet') return route.fulfill({ headers, contentType: 'text/css', body: '' });
    return route.fulfill({ headers, json: {} });
  });

  return state;
}
