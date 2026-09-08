/**
 * Cloudflare Pages Edge Middleware for /api/admin/*
 * Blocks all unauthenticated administrative API requests at the CDN edge.
 */

export async function onRequest(context) {
  const { request, env, next } = context;
  const adminPass = env.ADMIN_PASSWORD || 'demand-radar-secure-2026';
  const adminUser = env.ADMIN_USER || 'admin';

  // 1. Check Bearer Token
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token === adminPass) {
      return await next();
    }
  }

  // 2. Check Basic Auth
  if (authHeader.startsWith('Basic ')) {
    try {
      const credentials = atob(authHeader.slice(6));
      const [user, pass] = credentials.split(':');
      if (user === adminUser && pass === adminPass) {
        return await next();
      }
    } catch (_) {}
  }

  // 3. Check Cookie Auth
  const cookieHeader = request.headers.get('Cookie') || '';
  if (cookieHeader.includes(`dr_admin_token=${adminPass}`)) {
    return await next();
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Unauthorized: Administrative privilege required.'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Basic realm="Demand Radar API"'
    }
  });
}
