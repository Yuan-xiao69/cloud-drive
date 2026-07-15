export const dynamic = 'force-dynamic';

/**
 * v1 管理讨论操作 API
 * POST /api/v1/admin/discussions/[id]/actions - 执行讨论操作
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/discussions/[id]/actions - 执行讨论操作
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.string(),
    category: z.string().optional(),
    reason: z.string().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;
    const { action, category, reason } = body;

    const existing = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return errors.notFound('讨论');
    }

    let updateData: Record<string, unknown> = {};
    let logAction = '';
    let logDetail = '';

    switch (action) {
      case 'resolve':
        // 标记为已解决
        updateData = { status: 'resolved' };
        logAction = 'resolve_discussion';
        logDetail = `将讨论标记为已解决: ${existing.title}`;
        break;

      case 'unresolve':
        // 标记为未解决
        updateData = { status: 'open' };
        logAction = 'unresolve_discussion';
        logDetail = `将讨论标记为未解决: ${existing.title}`;
        break;

      case 'feature':
        // 设为精华
        updateData = { isPinned: true, isFeatured: true };
        logAction = 'feature_discussion';
        logDetail = `将讨论设为精华: ${existing.title}`;
        break;

      case 'unfeature':
        // 取消精华
        updateData = { isFeatured: false };
        logAction = 'unfeature_discussion';
        logDetail = `取消讨论精华: ${existing.title}`;
        break;

      case 'pin':
        // 置顶
        updateData = { isPinned: true };
        logAction = 'pin_discussion';
        logDetail = `置顶讨论: ${existing.title}`;
        break;

      case 'unpin':
        // 取消置顶
        updateData = { isPinned: false };
        logAction = 'unpin_discussion';
        logDetail = `取消置顶讨论: ${existing.title}`;
        break;

      case 'close':
        // 关闭讨论
        updateData = { status: 'closed' };
        logAction = 'close_discussion';
        logDetail = `关闭讨论: ${existing.title}${reason ? `，原因：${reason}` : ''}`;
        break;

      case 'reopen':
        // 重新打开讨论
        updateData = { status: 'open' };
        logAction = 'reopen_discussion';
        logDetail = `重新打开讨论: ${existing.title}`;
        break;

      case 'move':
        // 移动分类
        if (!category) {
          return errors.badRequest('请指定目标分类');
        }
        updateData = { category };
        logAction = 'move_discussion';
        logDetail = `移动讨论到分类 ${category}: ${existing.title}`;
        break;

      default:
        return errors.badRequest('无效的操作类型');
    }

    await prisma.discussion.update({
      where: { id },
      data: updateData,
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: logAction,
      targetType: 'discussion',
      targetId: id,
      details: { message: logDetail },
    });

    return success({ id, action }, '操作成功');
  },
});