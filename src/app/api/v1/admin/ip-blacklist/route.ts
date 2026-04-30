export const dynamic = 'force-dynamic';
/**
 * v1 IP 黑名单 API
 * GET /api/v1/admin/ip-blacklist - 获取 IP 黑名单
 * POST /api/v1/admin/ip-blacklist - 添加 IP 到黑名单
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, handlePrismaError, errors, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/ip-blacklist - 获取 IP 黑名单
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
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
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/admin/ip-blacklist - 添加 IP 到黑名单
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { ipAddress, ipRange, reason, expiresAt } = body;

    if (!ipAddress && !ipRange) {
      return errors.badRequest('IP 地址或 IP 范围不能为空');
    }

    if (!reason) {
      return errors.badRequest('封禁原因不能为空');
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
        addedBy: auth.userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    return created({ entry }, 'IP 已添加到黑名单');
  } catch (err) {
    return handlePrismaError(err);
  }
}
