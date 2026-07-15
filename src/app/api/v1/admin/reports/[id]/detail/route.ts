export const dynamic = 'force-dynamic';

/**
 * v1 举报详情 API
 * GET /api/v1/admin/reports/[id]/detail - 获取举报详细信息
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { ReportService } from '@/services/report-service';

// GET /api/v1/admin/reports/[id]/detail - 获取举报详情
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const detail = await ReportService.getById(id);
    return success(detail);
  },
});
