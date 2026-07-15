export const dynamic = 'force-dynamic';
/**
 * v1 仓库合并请求 API
 * GET /api/v1/repos/[username]/[repoName]/pulls - 获取 PR 列表
 * POST /api/v1/repos/[username]/[repoName]/pulls - 创建 PR
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { created, paginated, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import { PullService } from '@/services/pull-service';

// GET /api/v1/repos/[username]/[repoName]/pulls - 获取 PR 列表
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const skip = (page - 1) * pageSize;

    const status = searchParams.get('status');
    const validStatuses = ['open', 'closed', 'merged'];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;

    const search = searchParams.get('search')?.trim() || '';

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, visibility: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.visibility === 0 && (!user || user.id !== repo.ownerId)) {
      return errors.notFound('仓库');
    }

    const where: Record<string, unknown> = {
      repositoryId: repo.id,
      isDeleted: false,
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { content: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [pulls, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          sourceRepo: {
            select: { id: true, name: true, owner: { select: { id: true, username: true } } },
          },
          _count: { select: { comments: { where: { isDeleted: false } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.pullRequest.count({ where }),
    ]);

    const items = pulls.map((pr) => ({
      id: pr.id,
      repositoryId: pr.repositoryId,
      authorId: pr.authorId,
      author: {
        id: pr.author.id,
        username: pr.author.username,
        avatarUrl: pr.author.avatarUrl ?? undefined,
      },
      title: pr.title,
      content: pr.content.slice(0, 200),
      status: pr.status,
      sourceBranch: pr.sourceBranch,
      targetBranch: pr.targetBranch,
      sourceRepo: pr.sourceRepo ? {
        id: pr.sourceRepo.id,
        name: pr.sourceRepo.name,
        fullName: `${pr.sourceRepo.owner.username}/${pr.sourceRepo.name}`,
      } : null,
      commentsCount: pr._count.comments,
      createdAt: pr.createdAt.toISOString(),
      updatedAt: pr.updatedAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, pageSize));
  },
});

const createPRSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().optional(),
  sourceBranch: z.string().min(1, '源分支不能为空'),
  targetBranch: z.string().min(1, '目标分支不能为空'),
  sourceRepoId: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/pulls - 创建 PR
export const POST = defineRoute({
  auth: 'required',
  validation: createPRSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { title, content, sourceBranch, targetBranch, sourceRepoId } = body as z.infer<typeof createPRSchema>;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, defaultBranch: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const muteCheck = await isUserMuted(user!.id);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      return errors.forbidden(`您已被禁言：${muteCheck.penalty.reason}${endStr}`);
    }

    if (!title?.trim()) {
      return errors.badRequest('标题不能为空');
    }

    if (!sourceBranch?.trim()) {
      return errors.badRequest('源分支不能为空');
    }

    if (!targetBranch?.trim()) {
      return errors.badRequest('目标分支不能为空');
    }

    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedContent = sanitizeText(content?.trim() || '');

    const pullRequest = await PullService.create({
      repoId: repo.id,
      userId: user!.id,
      title: sanitizedTitle,
      content: sanitizedContent,
      sourceBranch: sourceBranch.trim(),
      targetBranch: targetBranch.trim(),
      sourceRepoId: sourceRepoId || undefined,
    });

    return created({
      ...pullRequest,
      createdAt: pullRequest.createdAt.toISOString(),
      updatedAt: pullRequest.updatedAt.toISOString(),
    }, '合并请求创建成功');
  },
});
