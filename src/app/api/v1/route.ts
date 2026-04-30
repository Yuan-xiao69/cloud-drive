export const dynamic = 'force-dynamic';
/**
 * API v1 根路由
 * 提供版本信息
 */

import { NextRequest } from 'next/server';
import { success } from '@/lib/api/v1';

// GET /api/v1 - 获取 API 版本信息
export async function GET(req: NextRequest) {
  return success(
    {
      name: 'Platform API',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        auth: {
          'POST /api/v1/auth/login': '用户登录',
          'POST /api/v1/auth/register': '用户注册',
          'POST /api/v1/auth/logout': '用户登出',
          'GET /api/v1/auth/me': '获取当前用户',
          'POST /api/v1/auth/refresh': '刷新 Token',
        },
        users: {
          'GET /api/v1/users/check-username': '检查用户名是否可用',
          'GET /api/v1/users/[username]': '获取用户信息',
          'PUT /api/v1/users/[username]': '更新用户资料',
        },
        repos: {
          'GET /api/v1/repos/[username]/[repoName]': '获取仓库详情',
          'PUT /api/v1/repos/[username]/[repoName]': '更新仓库',
          'DELETE /api/v1/repos/[username]/[repoName]': '删除仓库',
          'GET /api/v1/repos/[username]/[repoName]/issues': '获取问题列表',
          'POST /api/v1/repos/[username]/[repoName]/issues': '创建问题',
        },
        discussions: {
          'GET /api/v1/discussions': '获取讨论列表',
          'POST /api/v1/discussions': '创建讨论',
        },
        notifications: {
          'GET /api/v1/notifications': '获取通知列表',
          'PATCH /api/v1/notifications': '标记通知已读',
          'DELETE /api/v1/notifications': '删除通知',
        },
      },
      documentation: '/api/docs',
    },
    'API v1 服务正常'
  );
}
