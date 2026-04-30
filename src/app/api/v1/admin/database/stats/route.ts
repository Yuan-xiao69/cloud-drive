export const dynamic = 'force-dynamic';
/**
 * v1 管理后台数据库统计 API
 * GET /api/v1/admin/database/stats - 获取数据库统计信息
 *
 * 所有数据均为真实数据：使用 pg_total_relation_size 获取真实表大小，
 * pg_stat_activity 获取真实连接数。
 */

import { NextRequest } from 'next/server';
import { success, errors } from '@/lib/api/v1';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 需要统计的表名列表
const TABLE_NAMES = [
  'user',
  'repository',
  'repo_item',
  'discussion',
  'issue',
  'pull_request',
  'notification',
  'system_config',
  'user_activity_log',
  'admin_audit_log',
  'repo_file_chunk',
  'file_version',
  'share_link',
  'fork_request',
  'api_key',
  'webhook',
  'user_block',
  'webhook_delivery',
] as const;

// GET /api/v1/admin/database/stats
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 使用原始 SQL 查询真实表大小和行数
    const tableStats = await Promise.all(
      TABLE_NAMES.map(tableName => getRealTableStats(tableName))
    );

    // 计算数据库总大小（使用 pg_database_size）
    let databaseSize = '0 KB';
    try {
      const dbSizeResult: Array<{ size: string }> = await prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS size
      `;
      databaseSize = dbSizeResult[0]?.size || '0 KB';
    } catch (error) {
      console.error('Failed to get database size:', error);
    }

    // 真实连接数：活跃 + 空闲
    let connectionCount = 0;
    let activeConnectionCount = 0;
    try {
      const connResult: Array<{ total: bigint; active: bigint }> = await prisma.$queryRaw`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE state != 'idle')::bigint AS active
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;
      connectionCount = Number(connResult[0]?.total || 0);
      activeConnectionCount = Number(connResult[0]?.active || 0);
    } catch (error) {
      console.error('Failed to get connection count:', error);
    }

    return success({
      tableSizes: tableStats.filter(t => t.rows > 0 || Number(t.rawSize) > 0),
      totalSize: databaseSize,
      connectionCount,
      activeConnectionCount,
    });
  } catch (error) {
    console.error('Database stats error:', error);
    return success({
      tableSizes: [],
      totalSize: '0 KB',
      connectionCount: 0,
      activeConnectionCount: 0,
    });
  }
}

/**
 * 使用 pg_total_relation_size 获取真实表大小（含索引、toast）
 * 行数使用 pg_class.reltuples 估算（比 COUNT(*) 快得多，准确度足够监控用）
 */
async function getRealTableStats(tableName: string): Promise<{
  table: string;
  rows: number;
  size: string;
  rawSize: number;
}> {
  try {
    const result: Array<{ row_estimate: number; total_size: string; total_bytes: bigint }> =
      await prisma.$queryRaw`
        SELECT
          COALESCE(c.reltuples::bigint, 0) AS row_estimate,
          pg_size_pretty(pg_total_relation_size(${tableName})) AS total_size,
          pg_total_relation_size(${tableName}) AS total_bytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = ${tableName}
          AND n.nspname = 'public'
      `;

    if (result.length === 0) {
      return { table: tableName, rows: 0, size: '0 KB', rawSize: 0 };
    }

    const row = result[0];
    return {
      table: tableName,
      rows: Number(row.row_estimate),
      size: row.total_size,
      rawSize: Number(row.total_bytes),
    };
  } catch (error) {
    console.error(`Failed to get stats for table ${tableName}:`, error);
    return { table: tableName, rows: 0, size: '0 KB', rawSize: 0 };
  }
}
