export const dynamic = 'force-dynamic';
/**
 * v1 备份管理 API
 * GET /api/v1/admin/backup - 获取备份列表和统计
 * POST /api/v1/admin/backup - 创建备份
 * DELETE /api/v1/admin/backup - 删除备份
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import {
  backupDatabase,
  listBackups,
  deleteBackup,
  getBackupStats,
  BackupConfig,
} from '@/lib/backup-service';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// GET /api/v1/admin/backup - 获取备份列表和统计
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getBackupStats(BACKUP_DIR);
      return success(stats);
    }

    const backups = await listBackups(BACKUP_DIR);

    const formattedBackups = backups.map(b => ({
      filename: b.filename,
      path: b.path,
      size: b.size,
      sizeFormatted: formatBytes(b.size),
      createdAt: b.createdAt,
      createdAtFormatted: b.createdAt.toLocaleString('zh-CN'),
    }));

    const stats = await getBackupStats(BACKUP_DIR);

    return success({
      backups: formattedBackups,
      stats: {
        ...stats,
        totalSizeFormatted: formatBytes(stats.totalSize),
      },
    });
  },
});

// POST /api/v1/admin/backup - 创建备份
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    tables: z.array(z.string()).optional(),
    compress: z.boolean().optional().default(true),
    retainDays: z.number().optional().default(30),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { tables, compress = true, retainDays = 30 } = body;

    const config: BackupConfig = {
      backupDir: BACKUP_DIR,
      retainDays: retainDays || 30,
      compress: compress !== false,
      tables,
    };

    const result = await backupDatabase(config);

    if (!result.success) {
      return errors.internal(result.error || '备份失败');
    }

    return created({
      filePath: result.filePath,
      fileSize: result.fileSize,
      fileSizeFormatted: formatBytes(result.fileSize || 0),
      tablesCount: result.tablesCount,
      timestamp: result.timestamp,
    }, '备份创建成功');
  },
});

// DELETE /api/v1/admin/backup - 删除备份
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return errors.badRequest('缺少备份文件路径');
    }

    const resolvedPath = path.resolve(filePath);
    const resolvedBackupDir = path.resolve(BACKUP_DIR);

    if (!resolvedPath.startsWith(resolvedBackupDir)) {
      return errors.badRequest('无效的文件路径');
    }

    const deleted_result = await deleteBackup(filePath);

    if (!deleted_result) {
      return errors.notFound('备份文件不存在或删除失败');
    }

    return success({ deleted: true }, '备份已删除');
  },
});
