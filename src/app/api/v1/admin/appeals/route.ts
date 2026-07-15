export const dynamic = 'force-dynamic';
/**
 * v1 申诉管理 API（管理员端）
 * GET /api/v1/admin/appeals - 获取申诉列表
 */

import { defineRoute } from '@/lib/framework/define-route';
import { paginated, errors, buildPaginationMeta } from '@/lib/api/v1';
import { AppealService } from '@/services/appeal-service';

// GET /api/v1/admin/appeals - 获取申诉列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const appealType = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');
    const userId = searchParams.get('userId') || undefined;
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const result = await AppealService.list({
      type: appealType,
      status,
      page,
      size,
      userId,
      includeHistory,
    });

    return paginated(result.items, buildPaginationMeta(result.total, page, size));
  },
});
