export const dynamic = 'force-dynamic';

/**
 * v1 关联举报查询 API
 * GET /api/v1/admin/reports/related/[reportId] - 获取关联举报列表
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { ReportService } from '@/services/report-service';

// GET /api/v1/admin/reports/related/[reportId] - 获取关联举报
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { reportId } = params;

    const result = await ReportService.getRelated(reportId);
    return success(result);
  },
});
