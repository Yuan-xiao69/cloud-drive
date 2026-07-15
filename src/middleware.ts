/**
 * Next.js Edge Middleware
 *
 * 全局防线层，所有 /api/ 请求在到达路由前经过此处。
 * 不替代应用层守卫——这是额外防线。
 */

import { NextRequest, NextResponse } from 'next/server';
import { CSRF_EXEMPT_PATHS, isCsrfExempt, isSameOrigin } from '@/lib/config/csrf';

export function middleware(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  const { pathname } = req.nextUrl;

  // ── 仅拦截 API 路由 ──
  if (!pathname.startsWith('/api/')) {
    return response;
  }

  // ── Layer A：安全响应头 ──
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // ── Layer B：CSRF Origin 校验（所有写操作） ──
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (!isCsrfExempt(pathname)) {
      const origin = req.headers.get('origin');
      if (origin) {
        const host = req.headers.get('host');
        if (!isSameOrigin(origin, host || null)) {
          return new NextResponse(
            JSON.stringify({
              code: 3001,
              message: '跨站请求被拒绝',
              meta: { version: '1.0.0', timestamp: new Date().toISOString() },
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
          );
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
