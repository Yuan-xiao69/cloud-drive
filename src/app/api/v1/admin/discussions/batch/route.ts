export const dynamic = 'force-dynamic';

/**
 * v1 讨论批量操作 API
 * POST /api/v1/admin/discussions/batch - 批量操作讨论
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/discussions/batch - 批量操作
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { action, discussionIds, category, reason } = body;

    if (!action || !discussionIds || !Array.isArray(discussionIds) || discussionIds.length === 0) {
      return errors.badRequest('缺少必填参数：action, discussionIds');
    }

    // 获取讨论记录
    const discussions = await prisma.discussion.findMany({
      where: {
        id: { in: discussionIds },
        isDeleted: false,
      },
      select: { id: true, title: true },
    });

    if (discussions.length === 0) {
      return errors.notFound('未找到匹配的讨论');
    }

    let updateData: Record<string, unknown> = {};
    let logAction = '';
    let logDetail = '';

    switch (action) {
      case 'resolve':
        updateData = { status: 'resolved' };
        logAction = 'batch_resolve_discussion';
        logDetail = `批量将 ${discussions.length} 个讨论标记为已解决`;
        break;

      case 'unresolve':
        updateData = { status: 'open' };
        logAction = 'batch_unresolve_discussion';
        logDetail = `批量将 ${discussions.length} 个讨论标记为未解决`;
        break;

      case 'feature':
        updateData = { isPinned: true, isFeatured: true };
        logAction = 'batch_feature_discussion';
        logDetail = `批量将 ${discussions.length} 个讨论设为精华`;
        break;

      case 'unfeature':
        updateData = { isFeatured: false };
        logAction = 'batch_unfeature_discussion';
        logDetail = `批量取消 ${discussions.length} 个讨论精华`;
        break;

      case 'pin':
        updateData = { isPinned: true };
        logAction = 'batch_pin_discussion';
        logDetail = `批量置顶 ${discussions.length} 个讨论`;
        break;

      case 'unpin':
        updateData = { isPinned: false };
        logAction = 'batch_unpin_discussion';
        logDetail = `批量取消置顶 ${discussions.length} 个讨论`;
        break;

      case 'close':
        updateData = { status: 'closed' };
        logAction = 'batch_close_discussion';
        logDetail = `批量关闭 ${discussions.length} 个讨论${reason ? `，原因：${reason}` : ''}`;
        break;

      case 'reopen':
        updateData = { status: 'open' };
        logAction = 'batch_reopen_discussion';
        logDetail = `批量重新打开 ${discussions.length} 个讨论`;
        break;

      case 'move':
        if (!category) {
          return errors.badRequest('请指定目标分类');
        }
        updateData = { category };
        logAction = 'batch_move_discussion';
        logDetail = `批量移动 ${discussions.length} 个讨论到分类 ${category}`;
        break;

      case 'delete':
        updateData = { isDeleted: true };
        logAction = 'batch_delete_discussion';
        logDetail = `批量删除 ${discussions.length} 个讨论`;
        break;

      default:
        return errors.badRequest('无效的操作类型');
    }

    // 执行批量更新
    await prisma.discussion.updateMany({
      where: { id: { in: discussionIds } },
      data: updateData,
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      actionType: logAction,
      targetType: 'discussion',
      targetId: discussionIds.join(','),
      details: { message: logDetail },
    });

    return success({
      total: discussions.length,
      action,
      ids: discussionIds,
    }, `批量操作成功：${logDetail}`);
  } catch (err) {
    return handlePrismaError(err, '批量操作失败');
  }
}