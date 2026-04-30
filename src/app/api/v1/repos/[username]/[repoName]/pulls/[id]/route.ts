export const dynamic = 'force-dynamic';
/**
 * v1 Pull Request 详情与评论 API
 * GET /api/v1/repos/[username]/[repoName]/pulls/[id] - 获取 PR 详情
 * PATCH /api/v1/repos/[username]/[repoName]/pulls/[id] - 更新 PR
 * POST /api/v1/repos/[username]/[repoName]/pulls/[id]/comments - 添加评论
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';

// GET /api/v1/repos/[username]/[repoName]/pulls/[id] - 获取 PR 详情
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

    // 查找 PR
    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
        sourceRepo: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
        comments: {
          where: { isDeleted: false },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Pull Request 不存在' });
    }

    return success({
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
      sourceRepo: pullRequest.sourceRepo ? {
        id: pullRequest.sourceRepo.id,
        name: pullRequest.sourceRepo.name,
        fullName: `${pullRequest.sourceRepo.owner.username}/${pullRequest.sourceRepo.name}`,
      } : null,
      comments: pullRequest.comments.map((c) => ({
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
      commentsCount: pullRequest.comments.length,
      createdAt: pullRequest.createdAt.toISOString(),
      updatedAt: pullRequest.updatedAt.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err, '获取 Pull Request 详情失败');
  }
}

// PATCH /api/v1/repos/[username]/[repoName]/pulls/[id] - 更新 PR
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
    const { action, title, content } = body;

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

    // 查找 PR
    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Pull Request 不存在' });
    }

    // 权限检查：只有作者或仓库所有者可以修改
    if (pullRequest.authorId !== auth.userId && repo.ownerId !== auth.userId) {
      return errors.forbidden('无权修改此 Pull Request');
    }

    // 处理操作
    if (action === 'merge') {
      if (repo.ownerId !== auth.userId) {
        return errors.forbidden('只有仓库所有者可以合并 PR');
      }
      if (pullRequest.status !== 'open') {
        return error(ErrorCodes.INVALID_PARAMS, { message: '只能合并开放状态的 PR' });
      }
      await prisma.pullRequest.update({
        where: { id },
        data: { status: 'merged' },
      });
      return success({ id, status: 'merged' }, 'Pull Request 已合并');
    } else if (action === 'close') {
      await prisma.pullRequest.update({
        where: { id },
        data: { status: 'closed' },
      });
      return success({ id, status: 'closed' }, 'Pull Request 已关闭');
    } else if (action === 'reopen') {
      if (pullRequest.status === 'merged') {
        return error(ErrorCodes.INVALID_PARAMS, { message: '已合并的 PR 无法重新打开' });
      }
      await prisma.pullRequest.update({
        where: { id },
        data: { status: 'open' },
      });
      return success({ id, status: 'open' }, 'Pull Request 已重新打开');
    } else if (action === 'delete') {
      // 软删除
      await prisma.pullRequest.update({
        where: { id },
        data: { isDeleted: true },
      });
      return success({ id }, 'Pull Request 已删除');
    }

    // 更新内容
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = sanitizeText(title.trim());
    }
    if (content !== undefined) {
      updateData.content = sanitizeText(content.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '没有提供更新内容' });
    }

    const updatedPR = await prisma.pullRequest.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
      },
    });

    return success({
      id: updatedPR.id,
      repositoryId: updatedPR.repositoryId,
      repository: {
        id: updatedPR.repository.id,
        name: updatedPR.repository.name,
        fullName: `${updatedPR.repository.owner.username}/${updatedPR.repository.name}`,
      },
      authorId: updatedPR.authorId,
      author: {
        id: updatedPR.author.id,
        username: updatedPR.author.username,
        avatarUrl: updatedPR.author.avatarUrl ?? undefined,
      },
      title: updatedPR.title,
      content: updatedPR.content,
      status: updatedPR.status,
      sourceBranch: updatedPR.sourceBranch,
      targetBranch: updatedPR.targetBranch,
      updatedAt: updatedPR.updatedAt.toISOString(),
    }, 'Pull Request 更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新 Pull Request 失败');
  }
}

// POST /api/v1/repos/[username]/[repoName]/pulls/[id]/comments - 添加评论
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

    // 查找 PR
    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Pull Request 不存在' });
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
    const comment = await prisma.pullRequestComment.create({
      data: {
        pullRequestId: id,
        authorId: auth.userId,
        content: sanitizedContent,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return created({
      id: comment.id,
      pullRequestId: comment.pullRequestId,
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

// DELETE /api/v1/repos/[username]/[repoName]/pulls/[id] - 删除评论
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

    // 查找 PR
    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Pull Request 不存在' });
    }

    // 查找评论
    const comment = await prisma.pullRequestComment.findFirst({
      where: {
        id: commentId,
        pullRequestId: id,
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
    await prisma.pullRequestComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return success({ id: commentId }, '评论已删除');
  } catch (err) {
    return handlePrismaError(err, '删除评论失败');
  }
}
