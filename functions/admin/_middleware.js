/**
 * Cloudflare Pages Edge Middleware for /admin
 * Protects administrative web UI against unauthorized access.
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  const adminPass = env.ADMIN_PASSWORD || 'demand-radar-secure-2026';
  const adminUser = env.ADMIN_USER || 'admin';

  // 1. Check Authorization header (Basic Auth)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const credentials = atob(authHeader.slice(6));
      const [user, pass] = credentials.split(':');
      if (user === adminUser && pass === adminPass) {
        return await next();
      }
    } catch (_) {}
  }

  // 2. Check Cookie Auth
  const cookieHeader = request.headers.get('Cookie') || '';
  if (cookieHeader.includes(`dr_admin_token=${adminPass}`)) {
    return await next();
  }

  // 3. Challenge with 401 Basic Auth
  return new Response('Access restricted to Demand Radar administrator.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Demand Radar Admin"',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}
