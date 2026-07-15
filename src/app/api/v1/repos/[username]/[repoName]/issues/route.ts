export const dynamic = 'force-dynamic';
/**
 * v1 仓库 Issues API
 * GET /api/v1/repos/[username]/[repoName]/issues - 获取 Issues 列表
 * POST /api/v1/repos/[username]/[repoName]/issues - 创建 Issue
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { created, paginated, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import { IssueService } from '@/services/issue-service';

// GET /api/v1/repos/[username]/[repoName]/issues - 获取 Issues 列表
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const skip = (page - 1) * pageSize;

    const status = searchParams.get('status');
    const validStatuses = ['open', 'closed'];
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

    // 检查仓库可见性：私有仓库仅仓库所有者可查看 Issue 列表
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

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          labels: true,
          _count: { select: { comments: { where: { isDeleted: false } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.issue.count({ where }),
    ]);

    const items = issues.map((issue) => ({
      id: issue.id,
      repositoryId: issue.repositoryId,
      authorId: issue.authorId,
      author: {
        id: issue.author.id,
        username: issue.author.username,
        avatarUrl: issue.author.avatarUrl ?? undefined,
      },
      title: issue.title,
      content: issue.content.slice(0, 200),
      status: issue.status,
      priority: issue.priority,
      templateType: issue.templateType,
      dueDate: issue.dueDate?.toISOString() ?? null,
      relatedFileId: issue.relatedFileId,
      assigneeId: issue.assigneeId,
      labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
      commentsCount: issue._count.comments,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, pageSize));
  },
});

const createIssueSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().optional(),
  labels: z.array(z.object({ name: z.string(), color: z.string().optional() })).optional(),
  priority: z.string().optional(),
  templateType: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/issues - 创建 Issue
export const POST = defineRoute({
  auth: 'required',
  validation: createIssueSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { title, content, labels, priority, templateType } = body as z.infer<typeof createIssueSchema>;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const issue = await IssueService.create({
      repoId: repo.id,
      userId: user!.id,
      title,
      content: content || '',
      labels,
      priority,
      templateType,
    });

    return created(issue, 'Issue 创建成功');
  },
});
