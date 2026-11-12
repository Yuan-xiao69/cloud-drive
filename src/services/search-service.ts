/**
 * 搜索服务 (SearchService)
 *
 * 封装跨实体搜索的核心业务逻辑，包括被封禁用户的内容过滤。
 * 支持三种搜索类型：仓库 (repos)、用户 (users)、讨论 (discussions)。
 *
 * 核心理念：
 *   - 所有搜索结果自动排除被封禁用户 (isBanned) 的内容
 *   - 仓库搜索仅返回公开 (visibility=1) 且未删除的仓库
 *   - 讨论搜索排除已删除的讨论及其评论计数
 */

import { prisma } from '@/lib/prisma';

// ============================================================
// 类型定义
// ============================================================

export type SearchType = 'repos' | 'users' | 'discussions';

/** 仓库搜索结果项 */
export interface SearchRepoItem {
  id: string;
  name: string;
  description: string | null;
  owner: { id: string; username: string; avatarUrl: string | null };
  starCount: number;
  forkCount: number;
  language: string | null;
  createdAt: Date;
}

/** 用户搜索结果项 */
export interface SearchUserItem {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: Date;
  _count: { repositories: number };
}

/** 讨论搜索结果项 */
export interface SearchDiscussionItem {
  id: string;
  title: string;
  content: string | null;
  category: string;
  status: string;
  author: { id: string; username: string; avatarUrl: string | null };
  viewCount: number;
  createdAt: Date;
  _count: { comments: number };
}

/** 通用搜索结果容器 */
export interface SearchResult<T> {
  items: T[];
  total: number;
}

// ============================================================
// SearchService
// ============================================================

export class SearchService {
  /**
   * 执行搜索查询。
   *
   * 自动根据 type 参数路由到对应的搜索方法，并统一处理分页。
   * 所有搜索结果均过滤掉被封禁用户的内容。
   *
   * @param query - 搜索关键词（空字符串表示无过滤条件，返回全部）
   * @param type  - 搜索类型：'repos' | 'users' | 'discussions'，默认 'repos'
   * @param page  - 页码（从 1 开始），默认 1
   * @param size  - 每页条数（1-100），默认 20
   * @returns 搜索结果，包含 items 数组和 total 总数
   */
  static async search(
    query: string,
    type: SearchType = 'repos',
    page: number = 1,
    size: number = 20,
  ): Promise<SearchResult<SearchRepoItem | SearchUserItem | SearchDiscussionItem>> {
    const clampedPage = Math.max(1, page);
    const clampedSize = Math.min(100, Math.max(1, size));
    const skip = (clampedPage - 1) * clampedSize;

    switch (type) {
      case 'repos':
        return SearchService.searchRepos(query, skip, clampedSize);
      case 'users':
        return SearchService.searchUsers(query, skip, clampedSize);
      case 'discussions':
        return SearchService.searchDiscussions(query, skip, clampedSize);
    }
  }

  // ==========================================================
  // searchRepos — 仓库搜索
  // ==========================================================

  /**
   * 搜索公开仓库。
   *
   * 过滤条件：
   *   - deletedAt 为 null（未删除）
   *   - visibility 为 1（公开）
   *   - 仓库所有者未被封禁 (isBanned: false)
   *
   * 排序：按 starCount 降序
   */
  private static async searchRepos(
    q: string,
    skip: number,
    size: number,
  ): Promise<SearchResult<SearchRepoItem>> {
    const where = q
      ? {
          deletedAt: null,
          visibility: 1,
          owner: { isBanned: false },
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {
          deletedAt: null,
          visibility: 1,
          owner: { isBanned: false },
        };

    const [items, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        include: {
          owner: { select: { id: true, username: true, avatarUrl: true } },
        },
        orderBy: { starCount: 'desc' },
        skip,
        take: size,
      }),
      prisma.repository.count({ where }),
    ]);

    return { items, total };
  }

  // ==========================================================
  // searchUsers — 用户搜索
  // ==========================================================

  /**
   * 搜索用户。
   *
   * 过滤条件：
   *   - isBanned 为 false（未被封禁）
   *   - deletedAt 为 null（未删除）
   *
   * 返回结果包含仓库数量统计。
   */
  private static async searchUsers(
    q: string,
    skip: number,
    size: number,
  ): Promise<SearchResult<SearchUserItem>> {
    const where = q
      ? {
          isBanned: false,
          deletedAt: null,
          isSystem: false,
          role: { notIn: ['admin', 'super_admin'] },
          OR: [
            { username: { contains: q, mode: 'insensitive' as const } },
            { bio: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {
          isBanned: false,
          deletedAt: null,
          isSystem: false,
          role: { notIn: ['admin', 'super_admin'] },
        };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { _count: { select: { repositories: true } } },
        skip,
        take: size,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  // ==========================================================
  // searchDiscussions — 讨论搜索
  // ==========================================================

  /**
   * 搜索讨论。
   *
   * 过滤条件：
   *   - isDeleted 为 false（未删除）
   *
   * 排序：按 createdAt 降序
   * 评论计数仅统计未删除的评论。
   */
  private static async searchDiscussions(
    q: string,
    skip: number,
    size: number,
  ): Promise<SearchResult<SearchDiscussionItem>> {
    const where = q
      ? {
          isDeleted: false,
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { content: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : { isDeleted: false };

    const [items, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { comments: { where: { isDeleted: false } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.discussion.count({ where }),
    ]);

    return { items, total };
  }
}
