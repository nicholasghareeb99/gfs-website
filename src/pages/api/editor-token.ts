/**
 * Editor Token API — securely returns GitHub PAT for edit mode commits
 * The token is stored as a Netlify environment variable (GITHUB_EDITOR_TOKEN)
 * Only authenticated admin sessions should call this endpoint
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  // Basic security: check that the request comes from our site
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const source = origin || referer;

  if (source) {
    try {
      const hostname = new URL(source).hostname;
      const allowed = ['ghareebfencing.com', 'gfs-website.netlify.app', 'localhost', '127.0.0.1'];
      if (!allowed.some(a => hostname === a || hostname.endsWith('.' + a))) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers });
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Bad origin' }), { status: 403, headers });
    }
  }

  // Return the GitHub token from environment variable
  const token = import.meta.env.GITHUB_EDITOR_TOKEN || process.env.GITHUB_EDITOR_TOKEN || '';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token not configured' }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ token }), { status: 200, headers });
};
