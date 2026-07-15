export const dynamic = 'force-dynamic';
/**
 * v1 仓库关注 API
 * POST /api/v1/repos/[username]/[repoName]/watch - 关注/取消关注仓库
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { RepoService } from '@/services/repo-service';

// POST /api/v1/repos/[username]/[repoName]/watch - 关注/取消关注
export const POST = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

    // 轻量解析仓库 ID
    const repo = await RepoService.resolveRepoId(username, repoName);

    const result = await RepoService.toggleWatch(user!.id, repo.id);

    return success(result, result.watching ? '已关注仓库' : '已取消关注');
  },
});
