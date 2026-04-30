export const dynamic = 'force-dynamic';
/**
 * v1 仓库 Issues API
 * GET /api/v1/repos/[username]/[repoName]/issues - 获取 Issues 列表
 * POST /api/v1/repos/[username]/[repoName]/issues - 创建 Issue
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/repos/[username]/[repoName]/issues - 获取 Issues 列表
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
    const validStatuses = ['open', 'closed'];
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

    // 查询 Issues
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
      labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
      commentsCount: issue._count.comments,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, pageSize));
  } catch (err) {
    return handlePrismaError(err, '获取 Issues 列表失败');
  }
}

// POST /api/v1/repos/[username]/[repoName]/issues - 创建 Issue
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
    const { title, content, labels } = body;

    // 查找仓库
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

    // XSS 防护
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedContent = sanitizeText(content?.trim() || '');

    // 创建 Issue
    const issue = await prisma.issue.create({
      data: {
        repositoryId: repo.id,
        authorId: auth.userId,
        title: sanitizedTitle,
        content: sanitizedContent,
        status: 'open',
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
      },
    });

    // 添加标签
    if (labels && Array.isArray(labels) && labels.length > 0) {
      const labelData = labels.map((l: { name: string; color?: string }) => ({
        issueId: issue.id,
        name: l.name,
        color: l.color || '#0075ca',
      }));
      await prisma.issueLabel.createMany({ data: labelData });
    }

    return created({
      id: issue.id,
      repositoryId: issue.repositoryId,
      authorId: issue.authorId,
      author: {
        id: issue.author.id,
        username: issue.author.username,
        avatarUrl: issue.author.avatarUrl ?? undefined,
      },
      title: issue.title,
      content: issue.content,
      status: issue.status,
      labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
      commentsCount: 0,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    }, 'Issue 创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建 Issue 失败');
  }
}
