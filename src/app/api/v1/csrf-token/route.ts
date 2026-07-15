// Force reload: 确保每次请求都从服务器获取最新数据
export const dynamic = 'force-dynamic';

/**
 * CSRF Token 获取接口
 * GET /api/v1/csrf-token
 *
 * 功能：
 * - 为已登录用户生成并返回一个 CSRF Token
 * - Token 存储于 Redis，2 小时后自动过期
 * - 前端发起危险操作时需在请求头中携带 x-csrf-token
 *
 * 注意：
 * - 此接口无需 CSRF 验证（避免自引用死锁）
 * - 返回 401 时表示用户未登录
 */

import { defineRoute } from '@/lib/framework/define-route';
import { getRequestId } from '@/lib/api/v1';
import { generateCsrfToken } from '@/lib/csrf';

// GET /api/v1/csrf-token
export const GET = defineRoute({
  auth: 'required',
  csrf: false, // 无需 CSRF 验证，避免自引用死锁
  async handler({ req, user }) {
    const requestId = getRequestId(req);

    // 使用用户 ID 作为 sessionId 生成 CSRF Token
    const token = await generateCsrfToken(user!.id);

    return new Response(
      JSON.stringify({
        code: 200,
        message: 'CSRF Token 获取成功',
        data: {
          token,
          expiresIn: 2 * 60 * 60, // 2 小时，单位秒
        },
        requestId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // 同时在响应头中返回 Token，方便前端直接读取
          'X-CSRF-Token': token,
          // 禁止缓存，确保每次都获取新 Token
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  },
});
