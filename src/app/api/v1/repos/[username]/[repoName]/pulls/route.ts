export const dynamic = 'force-dynamic';
/**
 * v1 仓库 Pull Requests API
 * GET /api/v1/repos/[username]/[repoName]/pulls - 获取 PR 列表
 * POST /api/v1/repos/[username]/[repoName]/pulls - 创建 PR
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/repos/[username]/[repoName]/pulls - 获取 PR 列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const { username, repoName } = await params;
    const { searchParams } = new URL(req.url);

    // 解析分页参数
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const skip = (page - 1) * pageSize;

    // 状态筛选
    const status = searchParams.get('status');
    const validStatuses = ['open', 'closed', 'merged'];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;

    // 查找仓库
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

    // 构建查询条件
    const where: Record<string, unknown> = {
      repositoryId: repo.id,
      isDeleted: false,
    };

    if (statusFilter) {
      where.status = statusFilter;
    }

    // 查询 PRs
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
  } catch (err) {
    return handlePrismaError(err, '获取 Pull Requests 列表失败');
  }
}

// POST /api/v1/repos/[username]/[repoName]/pulls - 创建 PR
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;
    const body = await req.json();
    const { title, content, sourceBranch, targetBranch, sourceRepoId } = body;

    // 查找目标仓库
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

    // 检查用户是否被禁言
    const muteCheck = await isUserMuted(auth.userId);
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

    // XSS 防护
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedContent = sanitizeText(content?.trim() || '');

    // 创建 PR
    const pullRequest = await prisma.pullRequest.create({
      data: {
        repositoryId: repo.id,
        authorId: auth.userId,
        title: sanitizedTitle,
        content: sanitizedContent,
        status: 'open',
        sourceBranch: sourceBranch.trim(),
        targetBranch: targetBranch.trim(),
        sourceRepoId: sourceRepoId || null,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
      },
    });

    return created({
      id: pullRequest.id,
      repositoryId: pullRequest.repositoryId,
      repository: {
        id: pullRequest.repository.id,
        name: pullRequest.repository.name,
        fullName: `${pullRequest.repository.owner.username}/${pullRequest.repository.name}`,
      },
      authorId: pullRequest.authorId,
      author: {
        id: pullRequest.author.id,
        username: pullRequest.author.username,
        avatarUrl: pullRequest.author.avatarUrl ?? undefined,
      },
      title: pullRequest.title,
      content: pullRequest.content,
      status: pullRequest.status,
      sourceBranch: pullRequest.sourceBranch,
      targetBranch: pullRequest.targetBranch,
      sourceRepoId: pullRequest.sourceRepoId,
      commentsCount: 0,
      createdAt: pullRequest.createdAt.toISOString(),
      updatedAt: pullRequest.updatedAt.toISOString(),
    }, 'Pull Request 创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建 Pull Request 失败');
  }
}
