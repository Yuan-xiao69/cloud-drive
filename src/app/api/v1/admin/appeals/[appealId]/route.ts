export const dynamic = 'force-dynamic';
/**
 * v1 申诉详情 API
 * GET /api/v1/admin/appeals/[appealId] - 获取单个申诉
 * PATCH /api/v1/admin/appeals/[appealId] - 审批申诉（通过/拒绝）
 * DELETE /api/v1/admin/appeals/[appealId] - 删除申诉
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { AppealService } from '@/services/appeal-service';

// GET /api/v1/admin/appeals/[appealId] - 获取单个申诉
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { appealId } = params;

    const detail = await AppealService.getById(appealId);
    return success(detail);
  },
});

// PATCH /api/v1/admin/appeals/[appealId] - 审批申诉
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.enum(['approve', 'reject']),
    reviewNote: z.string().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { appealId } = params;
    const { action, reviewNote } = body;

    let result;
    if (action === 'approve') {
      result = await AppealService.approve(appealId, user!.id, reviewNote);
    } else {
      result = await AppealService.reject(appealId, user!.id, reviewNote);
    }

    return success(
      { appeal: result },
      action === 'approve' ? '申诉已通过' : '申诉已拒绝',
    );
  },
});

// DELETE /api/v1/admin/appeals/[appealId] - 删除申诉
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { appealId } = params;

    const result = await AppealService.delete(appealId);

    return success(result, '申诉已删除');
  },
});
