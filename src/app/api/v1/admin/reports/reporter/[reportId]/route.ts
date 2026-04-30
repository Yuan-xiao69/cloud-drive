export const dynamic = 'force-dynamic';

/**
 * v1 举报者历史查询 API
 * GET /api/v1/admin/reports/reporter/[reportId] - 获取举报者的举报历史
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/reports/reporter/[reportId] - 获取举报者历史
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
      select: {
        reporterId: true,
      },
    });

    if (!currentReport) {
      return errors.notFound('举报记录');
    }

    if (!currentReport.reporterId) {
      return success({
        reporter: null,
        reports: [],
        stats: {
          total: 0,
          pending: 0,
          processed: 0,
          ignored: 0,
          validRate: 0,
        },
      });
    }

    // 获取举报者信息
    const reporter = await prisma.user.findUnique({
      where: { id: currentReport.reporterId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // 获取该举报者的所有举报
    const reports = await prisma.report.findMany({
      where: {
        reporterId: currentReport.reporterId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        handler: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // 统计
    const stats = {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      processed: reports.filter(r => r.status === 'processed').length,
      ignored: reports.filter(r => r.status === 'ignored').length,
      validRate: reports.length > 0
        ? Math.round((reports.filter(r => r.status === 'processed').length / reports.length) * 100)
        : 0,
    };

    return success({
      reporter,
      reports: reports.map(r => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        handler: r.handler,
        createdAt: r.createdAt,
        handledAt: r.handledAt,
      })),
      stats,
    });
  } catch (err) {
    return handlePrismaError(err, '查询举报者历史失败');
  }
}