/**
 * 数据备份工具
 * 支持 PostgreSQL 数据库备份和数据导出
 */

import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 备份配置
 */
export interface BackupConfig {
  /** 备份目录 */
  backupDir: string;
  /** 保留天数 */
  retainDays: number;
  /** 压缩备份 */
  compress: boolean;
  /** 数据库表白名单（空=全部） */
  tables?: string[];
}

/**
 * 备份结果
 */
export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  tablesCount?: number;
  error?: string;
  timestamp: Date;
}

/**
 * 创建数据库备份
 */
export async function backupDatabase(config: BackupConfig): Promise<BackupResult> {
  const timestamp = new Date();
  const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestampStr}.sql`;
  const filePath = path.join(config.backupDir, filename);

  try {
    // 确保备份目录存在
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }

    // 获取数据库连接信息
    const databaseUrl = process.env.DATABASE_URL || '';
    const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!urlMatch) {
      throw new Error('无效的 DATABASE_URL 格式');
    }

    const [, user, password, host, port, database] = urlMatch;

    // 构建 pg_dump 命令
    let command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${database}`;

    if (config.tables && config.tables.length > 0) {
      command += ` -t ${config.tables.join(' -t ')}`;
    }

    command += ` -F p -f "${filePath}"`;

    // 设置环境变量
    const env = {
      ...process.env,
      PGPASSWORD: password,
    };

    // 执行备份
    await execAsync(command, { env });

    // 获取文件大小
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // 压缩备份文件
    if (config.compress) {
      const gzPath = filePath + '.gz';
      await execAsync(`gzip -9 "${filePath}"`);
      fs.renameSync(gzPath, filePath + '.gz');
      return {
        success: true,
        filePath: filePath + '.gz',
        fileSize: fs.statSync(filePath + '.gz').size,
        timestamp,
      };
    }

    // 清理旧备份
    await cleanupOldBackups(config.backupDir, config.retainDays);

    return {
      success: true,
      filePath,
      fileSize,
      timestamp,
    };
  } catch (error) {
    console.error('[Backup] Database backup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp,
    };
  }
}


/**
 * 导出数据为 JSON
 */
export async function exportToJSON(options: {
  tables?: string[];
  outputPath: string;
}): Promise<BackupResult> {
  const { tables, outputPath } = options;
  const timestamp = new Date();

  try {
    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 获取所有表（如果未指定）
    const tablesToExport = tables || await getAllTables();

    const data: Record<string, unknown[]> = {};

    for (const table of tablesToExport) {
      try {
        const records = await (prisma as unknown as Record<string, () => Promise<unknown>>)[table]?.();
        if (records) {
          data[table] = records as unknown as unknown[];
        }
      } catch {
        console.warn(`[Backup] Skip table ${table}: not found in Prisma`);
      }
    }

    // 写入 JSON 文件
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

    const stats = fs.statSync(outputPath);

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
      tablesCount: Object.keys(data).length,
      timestamp,
    };
  } catch (error) {
    console.error('[Backup] JSON export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp,
    };
  }
}


/**
 * 获取所有数据库表
 */
async function getAllTables(): Promise<string[]> {
  try {
    const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
    `;
    return result.map(r => r.tablename);
  } catch {
    return [];
  }
}


/**
 * 清理旧备份文件
 */
async function cleanupOldBackups(backupDir: string, retainDays: number): Promise<number> {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const cutoffTime = now - retainDays * msPerDay;

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtimeMs < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`[Backup] Deleted old backup: ${file}`);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('[Backup] Cleanup failed:', error);
    return 0;
  }
}


/**
 * 获取备份列表
 */
export async function listBackups(backupDir: string): Promise<Array<{
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
}>> {
  try {
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    const files = fs.readdirSync(backupDir);
    const backups = [];

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      backups.push({
        filename: file,
        path: filePath,
        size: stats.size,
        createdAt: stats.mtime,
      });
    }

    // 按时间倒序
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return backups;
  } catch (error) {
    console.error('[Backup] List failed:', error);
    return [];
  }
}


/**
 * 删除指定备份
 */
export async function deleteBackup(filePath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error('[Backup] Delete failed:', error);
    return false;
  }
}


/**
 * 获取备份状态统计
 */
export async function getBackupStats(backupDir: string): Promise<{
  totalBackups: number;
  totalSize: number;
  oldestBackup: Date | null;
  newestBackup: Date | null;
}> {
  const backups = await listBackups(backupDir);

  if (backups.length === 0) {
    return {
      totalBackups: 0,
      totalSize: 0,
      oldestBackup: null,
      newestBackup: null,
    };
  }

  return {
    totalBackups: backups.length,
    totalSize: backups.reduce((sum, b) => sum + b.size, 0),
    oldestBackup: backups[backups.length - 1].createdAt,
    newestBackup: backups[0].createdAt,
  };
}


/**
 * 用户数据导出
 */
export async function exportUserData(userId: string): Promise<{
  success: boolean;
  data?: {
    profile: unknown;
    repositories: unknown[];
    discussions: unknown[];
    comments: unknown[];
    stars: unknown[];
    activity: unknown[];
  };
  error?: string;
}> {
  try {
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        location: true,
        website: true,
        createdAt: true,
        role: true,
      },
    });

    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    // 并行获取关联数据
    const [repositories, discussions, comments, stars, activity] = await Promise.all([
      prisma.repository.findMany({
        where: { ownerId: userId, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          starCount: true,
          forkCount: true,
          createdAt: true,
        },
      }),
      prisma.discussion.findMany({
        where: { authorId: userId, isDeleted: false },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          viewCount: true,
          createdAt: true,
        },
      }),
      prisma.discussionComment.findMany({
        where: { authorId: userId, isDeleted: false },
        select: {
          id: true,
          discussionId: true,
          content: true,
          isAccepted: true,
          createdAt: true,
        },
      }),
      prisma.star.findMany({
        where: { userId },
        include: {
          repo: {
            select: {
              id: true,
              name: true,
              owner: { select: { username: true } },
            },
          },
        },
      }),
      prisma.userActivityLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetName: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        profile: user,
        repositories,
        discussions,
        comments,
        stars,
        activity,
      },
    };
  } catch (error) {
    console.error('[Export] User data export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
