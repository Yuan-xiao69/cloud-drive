export const dynamic = 'force-dynamic';
/**
 * v1 仓库归档 API
 * POST /api/v1/repos/[username]/[repoName]/archive - 归档/取消归档仓库
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { RepoService } from '@/services/repo-service';
import { logActivity } from '@/lib/activity-log';

const archiveSchema = z.object({
  archive: z.boolean(),
});

// POST /api/v1/repos/[username]/[repoName]/archive
export const POST = defineRoute({
  auth: 'required',
  validation: archiveSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { archive } = body as z.infer<typeof archiveSchema>;

    // 轻量解析仓库 ID
    const repo = await RepoService.resolveRepoId(username, repoName);

    const updatedRepo = await RepoService.archive(repo.id, user!.id, archive);

    // 记录操作日志
    await logActivity({
      userId: user!.id,
      action: archive ? 'archive_repo' : 'unarchive_repo',
      targetType: 'repo',
      targetId: repo.id,
      targetName: repoName,
      details: {
        message: archive ? '仓库已归档' : '仓库已取消归档',
      },
    });

    return success(
      {
        ...updatedRepo,
        message: archive ? '仓库已归档' : '仓库已取消归档',
      },
      archive ? '仓库归档成功' : '仓库取消归档成功',
    );
  },
});
