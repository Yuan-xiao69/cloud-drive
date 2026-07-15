export const dynamic = 'force-dynamic';

/**
 * v1 举报者历史查询 API
 * GET /api/v1/admin/reports/reporter/[reportId] - 获取举报者的举报历史
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { ReportService } from '@/services/report-service';

// GET /api/v1/admin/reports/reporter/[reportId] - 获取举报者历史
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { reportId } = params;

    const result = await ReportService.getReporterHistory(reportId);
    return success(result);
  },
});
