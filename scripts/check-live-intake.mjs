const site = 'https://ghareebfence.com';
const formNames = ['gfs-estimate', 'gfs-ballpark', 'gfs-booking'];

const checks = [
  {
    label: 'Quote forms',
    path: '/_netlify-forms.html',
    status: 200,
    async inspect(response) {
      const html = await response.text();
      const names = new Set(Array.from(
        html.matchAll(/<form\b[^>]*\sname\s*=\s*["']([^"']+)["'][^>]*>/gi),
        match => match[1],
      ));
      const missing = formNames.filter(name => !names.has(name));
      return missing.length
        ? { ok: false, message: 'missing ' + missing.join(', ') }
        : { ok: true, message: 'estimate, ballpark and visit forms found' };
    },
  },
  {
    label: 'Form handler',
    path: '/.netlify/functions/submission-created',
    status: 403,
    async inspect() {
      return { ok: true, message: 'refused a direct request (403)' };
    },
  },
  {
    label: 'Parcel lookup',
    path: '/.netlify/functions/parcel-proxy',
    status: 400,
    async inspect(response) {
      const body = await response.json().catch(() => null);
      const isJson = /^application\/json\b/i.test(response.headers.get('content-type') || '');
      return isJson && typeof body?.error === 'string' && body.error.trim()
        ? { ok: true, message: 'returned a JSON error for the missing address (400)' }
        : { ok: false, message: 'HTTP 400 did not include a JSON error' };
    },
  },
];

async function check({ label, path, status, inspect }) {
  try {
    const response = await fetch(site + path, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    if (response.status !== status) {
      return { label, ok: false, message: 'expected HTTP ' + status + ', got ' + response.status };
    }
    return { label, ...await inspect(response) };
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? 'request timed out' : 'could not read the response';
    return { label, ok: false, message: reason };
  }
}

const results = await Promise.all(checks.map(check));
for (const { label, ok, message } of results) {
  console.log(ok ? 'OK ' + label + ' — ' + message : 'FAIL ' + label + ' — ' + message);
}
process.exitCode = results.every(result => result.ok) ? 0 : 1;
