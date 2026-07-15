import { defineRoute } from '@/lib/framework/define-route';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis-client';

// GET /api/health - 健康检查
export const GET = defineRoute({
  auth: 'none',
  async handler() {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
    };

    // 检查数据库连接
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.services.database = 'ok';
    } catch {
      status.services.database = 'error';
      status.status = 'degraded';
    }

    // 检查 Redis 连接
    try {
      const redis = await getRedisClient();
      if (!redis) {
        status.services.redis = 'unavailable';
      } else {
        await redis.ping();
        status.services.redis = 'ok';
      }
    } catch {
      status.services.redis = 'error';
      status.status = 'degraded';
    }

    const httpStatus = status.status === 'ok' ? 200 : 503;

    return new Response(JSON.stringify(status), {
      status: httpStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
