export const dynamic = 'force-dynamic';
/**
 * v1 搜索 API
 * GET /api/v1/search?q=&type=&page=&size= - 综合搜索
 */

import { defineRoute } from '@/lib/framework/define-route';
import { error, paginated, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { ErrorCodes } from '@/lib/api/v1';
import { withCache, CacheKeys } from '@/lib/cache';
import { SearchService, SearchType, SearchRepoItem, SearchUserItem, SearchDiscussionItem } from '@/services/search-service';

// GET /api/v1/search?q=&type=&page=&size=
export const GET = defineRoute({
  auth: 'optional',
  rateLimit: 'search',
  async handler({ req, user }) {
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q')?.trim() || '';
    const type = (sp.get('type') || 'repos') as SearchType;
    const { page, size } = parsePagination(sp);
    const cacheKey = `${CacheKeys.search(q, type)}:p${page}:s${size}`;
    // 仅缓存无搜索词的首屏（最频繁访问），搜索请求不缓存
    const shouldCache = !q && page === 1;

    // 校验搜索类型
    if (!['repos', 'users', 'discussions'].includes(type)) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '无效的搜索类型，支持: repos, users, discussions' });
    }

    // 执行搜索（委托给 SearchService）
    const executor = () => SearchService.search(q, type, page, size);
    const result = shouldCache
      ? await withCache(cacheKey, 300, executor)
      : await executor();

    // 根据类型映射为 API 响应格式
    if (type === 'repos') {
      const items = (result.items as SearchRepoItem[]).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? undefined,
        owner: { id: r.owner.id, username: r.owner.username, avatarUrl: r.owner.avatarUrl ?? undefined },
        starCount: r.starCount,
        forkCount: r.forkCount,
        language: r.language ?? undefined,
        createdAt: new Date(r.createdAt).toISOString(),
      }));

      return paginated(
        items,
        { ...buildPaginationMeta(result.total, page, size), type: 'repos' as const },
      );
    }

    if (type === 'users') {
      // 安全加固：用户搜索需登录，防止匿名枚举用户（含超管账号）
      if (!user) {
        return error(ErrorCodes.UNAUTHORIZED, { message: '请先登录' });
      }
      const items = (result.items as SearchUserItem[]).map((u) => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl ?? undefined,
        bio: u.bio ? (u.bio.length > 200 ? u.bio.slice(0, 200) : u.bio) : undefined,
        location: u.location ?? undefined,
        createdAt: new Date(u.createdAt).toISOString(),
        reposCount: u._count.repositories,
      }));

      return paginated(
        items,
        { ...buildPaginationMeta(result.total, page, size), type: 'users' as const },
      );
    }

    // type === 'discussions'
    const items = (result.items as SearchDiscussionItem[]).map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content ? (d.content.length > 200 ? d.content.slice(0, 200) : d.content) : undefined,
      category: d.category,
      status: d.status,
      author: { id: d.author.id, username: d.author.username, avatarUrl: d.author.avatarUrl ?? undefined },
      commentCount: d._count.comments,
      viewCount: d.viewCount,
      createdAt: new Date(d.createdAt).toISOString(),
    }));

    return paginated(
      items,
      { ...buildPaginationMeta(result.total, page, size), type: 'discussions' as const },
    );
  },
});
