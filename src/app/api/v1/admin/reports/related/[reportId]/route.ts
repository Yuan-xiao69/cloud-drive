export const dynamic = 'force-dynamic';

/**
 * v1 关联举报查询 API
 * GET /api/v1/admin/reports/related/[reportId] - 获取关联举报列表
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/reports/related/[reportId] - 获取关联举报
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { reportId } = await params;

    // 获取当前举报的信息
    const currentReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!currentReport) {
      return errors.notFound('举报记录');
    }

    // 查找相同 targetType 和 targetId 的举报
    const relatedReports = await prisma.report.findMany({
      where: {
        targetType: currentReport.targetType,
        targetId: currentReport.targetId,
        id: { not: reportId }, // 排除当前举报
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        handler: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return success({
      currentReport: {
        id: currentReport.id,
        targetType: currentReport.targetType,
        targetId: currentReport.targetId,
        status: currentReport.status,
        createdAt: currentReport.createdAt,
      },
      relatedReports: relatedReports.map(r => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        reporter: r.reporter,
        handler: r.handler,
        createdAt: r.createdAt,
        handledAt: r.handledAt,
      })),
      totalRelated: relatedReports.length,
    });
  } catch (err) {
    return handlePrismaError(err, '查询关联举报失败');
  }
}