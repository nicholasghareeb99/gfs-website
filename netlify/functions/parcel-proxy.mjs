/* ══════════════════════════════════════════════════════════════════════════
   parcel-proxy — fetch a county GIS query on the server's behalf
   ──────────────────────────────────────────────────────────────────────────
   WHY THIS FILE EXISTS.

   The site map asks county and state ArcGIS servers for the parcel under the
   map centre. Plenty of those servers send no CORS headers at all, so the
   browser refuses the answer even when the server sent one. The fix is to
   ask from a server instead — servers do not enforce CORS.

   It has to be deployed WITH THE APP. The app used to call a copy of this on
   a different Netlify site, and a Netlify function only sends
   Access-Control-Allow-Origin for the site it belongs to, so every call was
   blocked before it left the browser:

     Access to fetch at 'https://gfs-website.netlify.app/.netlify/functions/
     parcel-proxy?…' from origin 'https://gfence.netlify.app' has been
     blocked by CORS policy

   Dropped in beside index.html, the app calls it on its own origin and there
   is no cross-origin request to block.

   ── IT IS NOT AN OPEN PROXY ───────────────────────────────────────────────
   A function that fetches any URL a stranger names is a hole: it will be
   found and used to attack other people's servers from your Netlify account,
   and to reach things only your account can reach. So it will only fetch
   ArcGIS-shaped URLs on hosts that are named here. Adding a county means
   adding its host to the list below — deliberately a code change, because
   "which servers will this fetch from" is a security decision.
   ══════════════════════════════════════════════════════════════════════════ */

const ALLOW_HOSTS = [
    /(^|\.)oit\.ohio\.gov$/i,
    /(^|\.)waynecounty\.com$/i,
    /(^|\.)ohiodnr\.gov$/i,
    /(^|\.)co\.lucas\.oh\.us$/i,
    /(^|\.)state\.mi\.us$/i,
    /(^|\.)semcog\.org$/i,
    /(^|\.)arcgis\.com$/i,
    /(^|\.)co\.wood\.oh\.us$/i,
    /(^|\.)fultoncountyoh\.com$/i,
    /(^|\.)monroemi\.org$/i,
    /(^|\.)waynecounty\.com$/i,
    /(^|\.)lenawee\.mi\.us$/i,
    /(^|\.)washtenaw\.org$/i,
    /(^|\.)co\.monroe\.mi\.us$/i
];

/* Only the read-only query endpoints, and only JSON/GeoJSON out. */
const ALLOW_PATH = /\/(MapServer|FeatureServer)\/\d+\/query(\?|$)/i;

const TIMEOUT_MS = 9000;

function cors(origin) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': 'application/json; charset=utf-8'
    };
}

export default async function handler(request) {
    const origin = request.headers.get('origin') || '';
    /* 204 means NO CONTENT, and the Response constructor enforces that: a
       204 with an empty string for a body throws rather than sending. The
       preflight is the first thing a browser asks for, so this threw before
       any real request was ever made. */
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    let target;
    try {
        target = new URL(new URL(request.url).searchParams.get('url') || '');
    } catch {
        return new Response(JSON.stringify({ error: 'bad or missing url' }),
                            { status: 400, headers: cors(origin) });
    }

    if (target.protocol !== 'https:') {
        return new Response(JSON.stringify({ error: 'https only' }),
                            { status: 400, headers: cors(origin) });
    }
    if (!ALLOW_HOSTS.some((re) => re.test(target.hostname))) {
        /* Named explicitly, because "it just says no" is the least
           debuggable failure there is. */
        return new Response(JSON.stringify({
            error: 'host not allowed',
            host: target.hostname,
            hint: 'add it to ALLOW_HOSTS in netlify/functions/parcel-proxy.mjs'
        }), { status: 403, headers: cors(origin) });
    }
    if (!ALLOW_PATH.test(target.pathname + target.search)) {
        return new Response(JSON.stringify({
            error: 'only ArcGIS /query endpoints are proxied',
            path: target.pathname
        }), { status: 403, headers: cors(origin) });
    }

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
        const upstream = await fetch(target.toString(), {
            signal: ac.signal,
            headers: { 'Accept': 'application/json' }
        });
        const body = await upstream.text();
        /* Pass the upstream STATUS through. A 404 from the county means that
           endpoint has moved, and the app can only say so if it is told. */
        return new Response(body, { status: upstream.status, headers: cors(origin) });
    } catch (e) {
        return new Response(JSON.stringify({
            error: e && e.name === 'AbortError' ? 'upstream timed out' : 'upstream unreachable',
            host: target.hostname
        }), { status: 504, headers: cors(origin) });
    } finally {
        clearTimeout(t);
    }
}
