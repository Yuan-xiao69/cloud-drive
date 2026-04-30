export const dynamic = 'force-dynamic';
/**
 * API v1 - 用户举报记录 API
 * GET /api/v1/me/reports - 获取当前用户的举报记录（与 /api/v1/reports 相同，但作为用户中心入口）
 */

import { NextRequest } from 'next/server';
import { success, error, paginated, handlePrismaError } from '@/lib/api/v1/response';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

/** 合法的举报状态 */
const VALID_STATUSES = ['pending', 'resolved', 'dismissed'];

/** 目标类型标签映射 */
const TARGET_TYPE_LABELS: Record<string, string> = {
  user: '用户',
  discussion: '讨论',
  issue: 'Issue',
  pullrequest: 'Pull Request',
  comment: '评论',
  repository: '仓库',
};

// GET /api/v1/me/reports - 获取当前用户的举报记录
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const status = searchParams.get('status') || undefined;

    // 构建查询条件
    const where: Record<string, unknown> = { reporterId: auth.userId };
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          handlerNote: true,
          createdAt: true,
          handledAt: true,
        },
      }),
      prisma.report.count({ where }),
    ]);

    // 格式化输出，添加目标类型标签
    const formattedItems = items.map(item => ({
      ...item,
      targetTypeLabel: TARGET_TYPE_LABELS[item.targetType] || item.targetType,
      createdAt: item.createdAt.toISOString(),
      handledAt: item.handledAt?.toISOString() || null,
    }));

    return paginated(formattedItems, buildPaginationMeta(total, page, size));
  } catch (err) {
    return handlePrismaError(err);
  }
}
