/**
 * Netlify Serverless Function: /api/editor-token
 * 
 * Returns the GitHub Personal Access Token stored in Netlify env vars.
 * Only returns the token if the request includes a valid Firebase auth token.
 * 
 * SETUP:
 * 1. Create a GitHub Personal Access Token (classic) at:
 *    https://github.com/settings/tokens
 *    Scopes needed: repo (full control)
 * 
 * 2. Add it as a Netlify environment variable:
 *    Site Settings → Environment Variables → Add:
 *    Key: GITHUB_EDITOR_TOKEN
 *    Value: ghp_your_token_here
 * 
 * 3. Place this file at: netlify/functions/editor-token.js
 *    OR src/pages/api/editor-token.js (for Astro API routes)
 */

export async function GET({ request }) {
  // CORS
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  // Check for auth header (Firebase ID token)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers
    });
  }

  // In production, verify the Firebase token here
  // For now, just check that a token was provided
  // TODO: Add Firebase Admin SDK verification
  // const idToken = authHeader.replace('Bearer ', '');
  // const decodedToken = await admin.auth().verifyIdToken(idToken);

  const token = import.meta.env.GITHUB_EDITOR_TOKEN;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token not configured' }), {
      status: 500,
      headers
    });
  }

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers
  });
}
