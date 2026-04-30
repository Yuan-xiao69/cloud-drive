export const dynamic = 'force-dynamic';
/**
 * v1 举报管理 API
 * GET /api/v1/admin/reports - 获取举报列表
 */

import { NextRequest } from 'next/server';
import { success, paginated, handlePrismaError, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// GET /api/v1/admin/reports - 获取举报列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const status = sp.get('status') || undefined;

    const where: Prisma.ReportWhereInput = {};
    if (status && ['pending', 'handled', 'dismissed'].includes(status)) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, username: true, avatarUrl: true } },
          handler: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.report.count({ where }),
    ]);

    const items = reports.map((r) => ({
      id: r.id,
      reporterId: r.reporterId,
      reporterUsername: r.reporter?.username || '未知',
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      handlerId: r.handlerId ?? undefined,
      handlerUsername: r.handler?.username ?? undefined,
      handlerNote: r.handlerNote ?? undefined,
      createdAt: r.createdAt.toISOString(),
      handledAt: r.handledAt?.toISOString() ?? undefined,
    }));

    const pagination = buildPaginationMeta(total, page, size);
    return paginated(items, pagination);
  } catch (err) {
    return handlePrismaError(err);
  }
}
