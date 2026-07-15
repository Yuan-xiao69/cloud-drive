export const dynamic = 'force-dynamic';
/**
 * v1 举报管理 API
 * GET /api/v1/admin/reports - 获取举报列表
 */

import { defineRoute } from '@/lib/framework/define-route';
import { paginated, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { ReportService } from '@/services/report-service';

// GET /api/v1/admin/reports - 获取举报列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const sp = req.nextUrl.searchParams;
    const { page, size } = parsePagination(sp);
    const status = sp.get('status') || undefined;

    const result = await ReportService.list({ status, page, size });

    const pagination = buildPaginationMeta(result.total, page, size);
    return paginated(result.items, pagination);
  },
});
