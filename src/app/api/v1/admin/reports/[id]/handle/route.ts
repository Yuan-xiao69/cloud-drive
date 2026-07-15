export const dynamic = 'force-dynamic';
/**
 * v1 举报处理 API
 * POST /api/v1/admin/reports/[id]/handle - 处理举报（删除内容 / 忽略举报 / 处罚用户）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { ReportService } from '@/services/report-service';

// POST /api/v1/admin/reports/[id]/handle - 处理举报
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.enum(['delete', 'dismiss']),
    note: z.string().optional(),
    penaltyType: z.string().optional(),
    penaltyReason: z.string().optional(),
  }),
  async handler({ req, user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;
    const { action, note, penaltyType, penaltyReason } = body;

    const ipAddress =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      undefined;

    const result = await ReportService.process({
      reportId: id,
      adminId: user!.id,
      action,
      note,
      penaltyType,
      penaltyReason,
      ipAddress: ipAddress ?? undefined,
    });

    return success(result);
  },
});
