export const dynamic = 'force-dynamic';
/**
 * v1 通知用户 API
 * GET /api/v1/admin/notifications/users - 获取用户列表（管理员发送通知时使用）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/notifications/users - 获取用户列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {
      deletedAt: null,
      isSystem: false
    };

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { uid: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          role: true,
          uid: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    return success({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  },
});
