export const dynamic = 'force-dynamic';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';

// GET /api/v1 - 获取 API 版本信息
export const GET = defineRoute({
  auth: 'none',
  async handler() {
    return success(
      {
        name: 'Platform API',
        version: '1.0.0',
        status: 'active',
        documentation: '/api/docs',
      },
      'API v1 服务正常'
    );
  },
});
