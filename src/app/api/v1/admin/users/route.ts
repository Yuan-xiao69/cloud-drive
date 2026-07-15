export const dynamic = 'force-dynamic';
/**
 * v1 用户管理 API
 * GET /api/v1/admin/users - 获取用户列表
 */

import { defineRoute } from '@/lib/framework/define-route';
import { paginated, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// GET /api/v1/admin/users - 获取用户列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const keyword = sp.get('search')?.trim() || sp.get('keyword')?.trim() || undefined;
    const role = sp.get('role')?.trim() || undefined;
    const status = sp.get('status')?.trim() || undefined;
    const dateFrom = sp.get('dateFrom')?.trim() || undefined;
    const dateTo = sp.get('dateTo')?.trim() || undefined;

    const where: Prisma.UserWhereInput = {};
    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 按角色筛选
    if (role) {
      where.role = role;
    }

    // 按状态筛选（兼容 status=normal/banned 和 active/disabled/penalized）
    if (status) {
      if (status === 'normal' || status === 'active') {
        where.isBanned = false;
      } else if (status === 'banned') {
        where.isBanned = true;
      } else if (status === 'disabled') {
        where.isBanned = true;
      } else if (status === 'penalized') {
        // 被处罚的用户：有未过期的处罚记录
        where.penalties = {
          some: {
            OR: [
              { expiresAt: { gt: new Date() } },
              { expiresAt: null },
            ],
          },
        };
      }
    }

    // 按注册日期范围筛选
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // 普通管理员无法看到系统内置账号，只有超级管理员可以
    if (user!.role !== 'super_admin') {
      where.isSystem = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          uid: true,
          username: true,
          email: true,
          role: true,
          isBanned: true,
          isSystem: true,
          avatarUrl: true,
          createdAt: true,
          loginHistories: {
            select: { ipAddress: true, createdAt: true, success: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.user.count({ where }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      uid: u.uid ?? undefined,
      username: u.username,
      email: u.email,
      role: u.role,
      isBanned: u.isBanned,
      isSystem: u.isSystem,
      avatarUrl: u.avatarUrl ?? undefined,
      createdAt: u.createdAt.toISOString(),
      lastLoginIp: u.loginHistories[0]?.ipAddress ?? undefined,
      lastLoginAt: u.loginHistories[0]?.createdAt.toISOString() ?? undefined,
    }));

    const pagination = buildPaginationMeta(total, page, size);

    return paginated(items, pagination);
  },
});
