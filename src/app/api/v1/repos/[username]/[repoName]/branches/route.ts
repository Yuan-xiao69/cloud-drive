export const dynamic = 'force-dynamic';
/**
 * v1 仓库分支 API
 * GET /api/v1/repos/[username]/[repoName]/branches - 获取分支列表
 * POST /api/v1/repos/[username]/[repoName]/branches - 创建分支
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created } from '@/lib/api/v1';
import { RepoService } from '@/services/repo-service';

// GET /api/v1/repos/[username]/[repoName]/branches - 获取分支列表
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

    // 轻量解析仓库 ID
    const repo = await RepoService.resolveRepoId(username, repoName);

    const result = await RepoService.listBranches(repo.id, user?.id);

    return success(result);
  },
});

const createBranchSchema = z.object({
  name: z.string().min(1, '分支名称不能为空'),
  fromBranch: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/branches - 创建分支
export const POST = defineRoute({
  auth: 'required',
  validation: createBranchSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { name, fromBranch } = body as z.infer<typeof createBranchSchema>;

    // 轻量解析仓库 ID
    const repo = await RepoService.resolveRepoId(username, repoName);

    const branch = await RepoService.createBranch({
      repoId: repo.id,
      userId: user!.id,
      name,
      fromBranch,
    });

    return created(branch, '分支创建成功');
  },
});
