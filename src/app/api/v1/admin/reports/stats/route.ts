export const dynamic = 'force-dynamic';

/**
 * v1 举报统计 API
 * GET /api/v1/admin/reports/stats - 获取举报统计数据
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { ReportService } from '@/services/report-service';

// GET /api/v1/admin/reports/stats - 获取举报统计
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const sp = req.nextUrl.searchParams;
    const days = parseInt(sp.get('days') || '30', 10);

    const stats = await ReportService.getStats(days);
    return success(stats);
  },
});
