export const dynamic = 'force-dynamic';
/**
 * v1 仓库详情 API
 * GET /api/v1/repos/[username]/[repoName] - 获取仓库详情
 * PATCH /api/v1/repos/[username]/[repoName] - 更新仓库设置
 * DELETE /api/v1/repos/[username]/[repoName] - 删除仓库
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { RepoService } from '@/services/repo-service';

// GET /api/v1/repos/[username]/[repoName] - 获取仓库详情
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

    const repo = await RepoService.getByOwnerAndName(
      username,
      repoName,
      user?.id,
    );

    return success(repo);
  },
});

const updateRepoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  visibility: z.union([z.string(), z.number()]).optional(),
  defaultBranch: z.string().optional(),
  language: z.string().optional(),
});

// PATCH /api/v1/repos/[username]/[repoName] - 更新仓库设置
export const PATCH = defineRoute({
  auth: 'required',
  validation: updateRepoSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { name, description, visibility, defaultBranch, language } = body as z.infer<typeof updateRepoSchema>;

    // 轻量解析仓库 ID（无 viewCount 递增副作用）
    const repo = await RepoService.resolveRepoId(username, repoName);

    const updated = await RepoService.update(repo.id, user!.id, {
      name,
      description,
      visibility,
      defaultBranch,
      language,
    });

    return success(updated, '仓库设置已更新');
  },
});

// DELETE /api/v1/repos/[username]/[repoName] - 删除仓库
export const DELETE = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

    // 轻量解析仓库 ID（无 viewCount 递增副作用）
    const repo = await RepoService.resolveRepoId(username, repoName);

    const result = await RepoService.delete(repo.id, user!.id);

    return success(result, '仓库已删除');
  },
});
