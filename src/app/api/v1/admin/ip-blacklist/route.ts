export const dynamic = 'force-dynamic';
/**
 * v1 IP 黑名单 API
 * GET /api/v1/admin/ip-blacklist - 获取 IP 黑名单
 * POST /api/v1/admin/ip-blacklist - 添加 IP 到黑名单
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/ip-blacklist - 获取 IP 黑名单
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const [entries, total] = await Promise.all([
      prisma.iPBlacklist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.iPBlacklist.count({ where }),
    ]);

    return success({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
});

// POST /api/v1/admin/ip-blacklist - 添加 IP 到黑名单
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    ipAddress: z.string().optional(),
    ipRange: z.string().optional(),
    reason: z.string(),
    expiresAt: z.string().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { ipAddress, ipRange, reason, expiresAt } = body;

    if (!ipAddress && !ipRange) {
      return errors.badRequest('IP 地址或 IP 范围不能为空');
    }

    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipToCheck = ipAddress || ipRange;
    if (ipToCheck && !ipv4Regex.test(ipToCheck)) {
      return errors.badRequest('无效的 IP 地址格式');
    }

    const existing = await prisma.iPBlacklist.findFirst({
      where: {
        ipAddress: ipAddress || '',
        ipRange: ipRange || null,
        isActive: true,
      },
    });

    if (existing) {
      return errors.conflict('该 IP 已存在于黑名单中');
    }

    const entry = await prisma.iPBlacklist.create({
      data: {
        ipAddress: ipAddress || '',
        ipRange: ipRange || null,
        reason,
        addedBy: user!.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    return created({ entry }, 'IP 已添加到黑名单');
  },
});
