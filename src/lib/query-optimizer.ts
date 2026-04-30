/**
 * 数据库查询优化工具
 * 提供查询分析、索引建议等工具
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';


/**
 * 查询分析结果
 */
export interface QueryAnalysis {
  query: string;
  executionTime: number;
  resultCount: number;
  scannedRows?: number;
}


/**
 * 执行查询并分析
 */
export async function analyzeQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<{ result: T; analysis: QueryAnalysis }> {
  const start = Date.now();
  const result = await queryFn();
  const executionTime = Date.now() - start;

  const analysis: QueryAnalysis = {
    query: queryName,
    executionTime,
    resultCount: Array.isArray(result) ? result.length : 1,
  };

  // 记录慢查询
  if (executionTime > 1000) {
    console.warn(`[QueryOptimizer] Slow query detected: ${queryName} took ${executionTime}ms`);
  }

  return { result, analysis };
}


/**
 * 预加载关联数据（避免 N+1 问题）
 */
export function getIncludeOptions<T extends Record<string, unknown>>(
  includeRelations: (keyof T)[]
): Record<string, boolean | Record<string, unknown>> {
  const includes: Record<string, boolean | Record<string, unknown>> = {};

  for (const relation of includeRelations) {
    includes[relation as string] = true;
  }

  return includes;
}


/**
 * 常用的预定义 include 选项
 */
export const IncludePresets = {
  // 用户相关
  userBasic: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    },
  },

  userFull: {
    select: {
      id: true,
      username: true,
      email: true,
      avatarUrl: true,
      bio: true,
      location: true,
      website: true,
      role: true,
      createdAt: true,
    },
  },

  // 仓库相关
  repoWithOwner: {
    owner: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
  },

  repoFull: {
    owner: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
    _count: {
      select: {
        stars: true,
        watchers: true,
        issues: true,
      },
    },
  },

  // 讨论相关
  discussionWithAuthor: {
    author: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
    _count: {
      select: {
        comments: true,
      },
    },
  },

  discussionFull: {
    author: {
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    },
    comments: {
      where: { parentId: null, isDeleted: false },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        replies: {
          where: { isDeleted: false },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
  },
} as const;


/**
 * 分页参数验证
 */
export function validatePagination(
  page?: number | string,
  limit?: number | string,
  maxLimit = 100
): { page: number; limit: number; skip: number } {
  const pageNum = Math.max(1, parseInt(String(page || 1), 10) || 1);
  const limitNum = Math.min(maxLimit, Math.max(1, parseInt(String(limit || 20), 10) || 20));

  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };
}


/**
 * 创建排序选项
 */
export function createOrderBy<T>(
  orderBy?: string | string[],
  defaultField = 'createdAt',
  defaultDirection: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'>[] {
  if (!orderBy) {
    return [{ [defaultField]: defaultDirection }];
  }

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];

  return orders.map(order => {
    if (typeof order === 'string') {
      const [field, direction] = order.split(':');
      return {
        [field || defaultField]: (direction === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
      };
    }
    return { [defaultField]: defaultDirection };
  });
}


/**
 * 创建通用列表查询
 */
export async function listWithPagination<T>(options: {
  model: keyof typeof prisma;
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  page: number;
  limit: number;
}): Promise<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const { model, where = {}, include, orderBy = { createdAt: 'desc' }, page, limit } = options;

  const [items, total] = await Promise.all([
    (prisma[model] as unknown as {
      findMany: (opts: unknown) => Promise<T[]>;
    }).findMany({
      where,
      include,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    (prisma[model] as unknown as {
      count: (opts: { where: unknown }) => Promise<number>;
    }).count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


/**
 * 获取数据库统计信息
 */
export async function getDatabaseStats(): Promise<{
  userCount: number;
  repoCount: number;
  discussionCount: number;
  notificationCount: number;
}> {
  const [userCount, repoCount, discussionCount, notificationCount] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.repository.count({ where: { deletedAt: null } }),
    prisma.discussion.count({ where: { isDeleted: false } }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  return {
    userCount,
    repoCount,
    discussionCount,
    notificationCount,
  };
}


/**
 * 批量插入优化（分批处理）
 */
export async function batchInsert<T extends Record<string, unknown>>(
  table: keyof typeof prisma,
  items: T[],
  batchSize = 100
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      await (prisma[table] as unknown as { createMany: (opts: { data: T[] }) => Promise<{ count: number }> }).createMany({
        data: batch,
      });
      inserted += batch.length;
    } catch (error) {
      console.error(`[QueryOptimizer] Batch insert failed at ${i}:`, error);
      // 单条插入作为后备
      for (const item of batch) {
        try {
          await (prisma[table] as unknown as { create: (opts: { data: T }) => Promise<unknown> }).create({
            data: item,
          });
          inserted++;
        } catch {
          // 忽略单条失败
        }
      }
    }
  }

  return inserted;
}


/**
 * 软删除查询辅助
 */
export function softDeleteWhere(where: Record<string, unknown>, table: string): Record<string, unknown> {
  // 根据表名添加软删除条件
  const softDeleteField = table === 'Repository' ? 'deletedAt' : 'isDeleted';

  if (softDeleteField === 'deletedAt') {
    return { ...where, deletedAt: null };
  }

  return { ...where, isDeleted: false };
}
