export const dynamic = 'force-dynamic';

/**
 * v1 安全事件列表 API
 * GET /api/v1/admin/security-events - 获取安全事件列表
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/security-events - 获取安全事件列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以访问安全事件
    if (auth.role !== 'super_admin') {
      return success({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    }

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('eventType');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const ipAddress = searchParams.get('ipAddress');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (ipAddress) where.ipAddress = { contains: ipAddress };

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.securityEvent.count({ where }),
    ]);

    return success({
      items: events,
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