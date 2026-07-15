export const dynamic = 'force-dynamic';

/**
 * v1 仓库 CRUD API
 * POST /api/v1/repos - 创建新仓库
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { created } from '@/lib/api/v1';
import { RepoService } from '@/services/repo-service';

const createRepoSchema = z.object({
  name: z.string().min(1, '仓库名称不能为空').max(100, '仓库名称长度必须在 1-100 个字符之间'),
  description: z.string().optional(),
  visibility: z.union([z.number(), z.boolean()]).optional(),
  defaultBranch: z.string().optional(),
  language: z.string().optional(),
});

// POST /api/v1/repos - 创建新仓库
export const POST = defineRoute({
  auth: 'required',
  validation: createRepoSchema,
  handler: async ({ user, body }) => {
    const { name, description, visibility, defaultBranch, language } = body as z.infer<typeof createRepoSchema>;

    const repo = await RepoService.create({
      userId: user!.id,
      name,
      description,
      visibility,
      defaultBranch,
      language,
    });

    return created(repo, '仓库创建成功');
  },
});
