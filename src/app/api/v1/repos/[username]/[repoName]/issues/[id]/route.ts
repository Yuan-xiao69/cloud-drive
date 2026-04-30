export const dynamic = 'force-dynamic';
/**
 * v1 Issue 详情与评论 API
 * GET /api/v1/repos/[username]/[repoName]/issues/[id] - 获取 Issue 详情
 * PATCH /api/v1/repos/[username]/[repoName]/issues/[id] - 更新 Issue
 * POST /api/v1/repos/[username]/[repoName]/issues/[id]/comments - 添加评论
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';

// GET /api/v1/repos/[username]/[repoName]/issues/[id] - 获取 Issue 详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const { username, repoName, id } = await params;

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

    // 查找 Issue
    const issue = await prisma.issue.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
        comments: {
          where: { isDeleted: false },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!issue) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    return success({
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
      comments: issue.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        author: {
          id: c.author.id,
          username: c.author.username,
          avatarUrl: c.author.avatarUrl ?? undefined,
        },
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      commentsCount: issue.comments.length,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err, '获取 Issue 详情失败');
  }
}

// PATCH /api/v1/repos/[username]/[repoName]/issues/[id] - 更新 Issue
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, id } = await params;
    const body = await req.json();
    const { action, title, content, labels } = body;

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

    // 查找 Issue
    const issue = await prisma.issue.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
    });

    if (!issue) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    // 权限检查：只有作者或仓库所有者可以修改
    if (issue.authorId !== auth.userId && repo.ownerId !== auth.userId) {
      return errors.forbidden('无权修改此 Issue');
    }

    // 处理操作
    if (action === 'close') {
      await prisma.issue.update({
        where: { id },
        data: { status: 'closed' },
      });
      return success({ id, status: 'closed' }, 'Issue 已关闭');
    } else if (action === 'reopen') {
      await prisma.issue.update({
        where: { id },
        data: { status: 'open' },
      });
      return success({ id, status: 'open' }, 'Issue 已重新打开');
    } else if (action === 'delete') {
      // 软删除
      await prisma.issue.update({
        where: { id },
        data: { isDeleted: true },
      });
      return success({ id }, 'Issue 已删除');
    }

    // 更新内容
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = sanitizeText(title.trim());
    }
    if (content !== undefined) {
      updateData.content = sanitizeText(content.trim());
    }

    if (Object.keys(updateData).length === 0 && (!labels || labels.length === 0)) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '没有提供更新内容' });
    }

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
      },
    });

    // 更新标签
    if (labels !== undefined && Array.isArray(labels)) {
      // 删除旧标签
      await prisma.issueLabel.deleteMany({ where: { issueId: id } });

      // 创建新标签
      if (labels.length > 0) {
        const labelData = labels.map((l: { name: string; color?: string }) => ({
          issueId: id,
          name: l.name,
          color: l.color || '#0075ca',
        }));
        await prisma.issueLabel.createMany({ data: labelData });
      }
    }

    // 重新获取更新后的 Issue
    const finalIssue = await prisma.issue.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
      },
    });

    return success({
      id: finalIssue!.id,
      repositoryId: finalIssue!.repositoryId,
      authorId: finalIssue!.authorId,
      author: {
        id: finalIssue!.author.id,
        username: finalIssue!.author.username,
        avatarUrl: finalIssue!.author.avatarUrl ?? undefined,
      },
      title: finalIssue!.title,
      content: finalIssue!.content,
      status: finalIssue!.status,
      labels: finalIssue!.labels.map((l) => ({ name: l.name, color: l.color })),
      updatedAt: finalIssue!.updatedAt.toISOString(),
    }, 'Issue 更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新 Issue 失败');
  }
}

// POST /api/v1/repos/[username]/[repoName]/issues/[id]/comments - 添加评论
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, id } = await params;
    const body = await req.json();
    const { content } = body;

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

    // 查找 Issue
    const issue = await prisma.issue.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
    });

    if (!issue) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    // 检查用户是否被禁言
    const muteCheck = await isUserMuted(auth.userId);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      return errors.forbidden(`您已被禁言：${muteCheck.penalty.reason}${endStr}`);
    }

    if (!content?.trim()) {
      return errors.badRequest('评论内容不能为空');
    }

    // XSS 防护
    const sanitizedContent = sanitizeText(content.trim());

    // 创建评论
    const comment = await prisma.issueComment.create({
      data: {
        issueId: id,
        authorId: auth.userId,
        content: sanitizedContent,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return created({
      id: comment.id,
      issueId: comment.issueId,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl ?? undefined,
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }, '评论已添加');
  } catch (err) {
    return handlePrismaError(err, '添加评论失败');
  }
}

// DELETE /api/v1/repos/[username]/[repoName]/issues/[id] - 删除评论
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, id } = await params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return errors.badRequest('缺少评论ID');
    }

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

    // 查找 Issue
    const issue = await prisma.issue.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!issue) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    // 查找评论
    const comment = await prisma.issueComment.findFirst({
      where: {
        id: commentId,
        issueId: id,
      },
    });

    if (!comment) {
      return error(ErrorCodes.NOT_FOUND, { message: '评论不存在' });
    }

    // 权限检查：只有评论作者或仓库所有者可以删除
    if (comment.authorId !== auth.userId && repo.ownerId !== auth.userId) {
      return errors.forbidden('无权删除此评论');
    }

    // 软删除评论
    await prisma.issueComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return success({ id: commentId }, '评论已删除');
  } catch (err) {
    return handlePrismaError(err, '删除评论失败');
  }
}
