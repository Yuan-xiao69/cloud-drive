export const dynamic = 'force-dynamic';
/**
 * v1 仓库收藏 API
 * POST /api/v1/repos/[username]/[repoName]/star - 收藏/取消收藏仓库
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { RepoService } from '@/services/repo-service';

// POST /api/v1/repos/[username]/[repoName]/star - 收藏/取消收藏
export const POST = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

    // 轻量解析仓库 ID
    const repo = await RepoService.resolveRepoId(username, repoName);

    const result = await RepoService.toggleStar(user!.id, repo.id);

    return success(result, result.starred ? '已收藏仓库' : '已取消收藏');
  },
});
