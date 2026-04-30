import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';


// GET /api/health - 健康检查
export async function GET(req: NextRequest) {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
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

  const httpStatus = status.status === 'ok' ? 200 : 503;

  return new Response(JSON.stringify(status), {
    status: httpStatus,
    headers: { 'Content-Type': 'application/json' },
  });
}
