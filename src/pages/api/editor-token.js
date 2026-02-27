export async function GET({ request }) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }
  const token = import.meta.env.GITHUB_EDITOR_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'Token not configured' }), { status: 500, headers });
  }
  return new Response(JSON.stringify({ token }), { status: 200, headers });
}