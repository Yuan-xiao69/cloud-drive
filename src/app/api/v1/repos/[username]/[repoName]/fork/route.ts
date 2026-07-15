export const dynamic = 'force-dynamic';
/**
 * v1 仓库 Fork API
 * POST /api/v1/repos/[username]/[repoName]/fork - 直接 Fork 公开仓库
 *
 * 使用 defineRoute 框架 + RepoService 统一 Fork 入口
 */

import { defineRoute } from '@/lib/framework/define-route';
import { RepoService } from '@/services/repo-service';
import { success } from '@/lib/api/v1';

// POST /api/v1/repos/[username]/[repoName]/fork - Fork 公开仓库
export const POST = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const repo = await RepoService.fork({
      sourceUsername: params.username,
      sourceRepoName: params.repoName,
      userId: user!.id,
      username: user!.username,
      requirePublic: true, // 公开 Fork 路径要求源仓库为公开
    });

    return success(
      {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        htmlUrl: `/${repo.fullName}`,
      },
      '仓库 Fork 成功',
    );
  },
});
