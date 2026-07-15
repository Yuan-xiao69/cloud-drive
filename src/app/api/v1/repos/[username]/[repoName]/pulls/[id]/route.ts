export const dynamic = 'force-dynamic';
/**
 * v1 合并请求详情与评论 API
 * GET /api/v1/repos/[username]/[repoName]/pulls/[id] - 获取 PR 详情
 * PATCH /api/v1/repos/[username]/[repoName]/pulls/[id] - 更新 PR
 * POST /api/v1/repos/[username]/[repoName]/pulls/[id]/comments - 添加评论
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';
import { getUserRepoRole, canManageIssues, canManageRepo } from '@/lib/auth/repo-permission';
import { PullService } from '@/services/pull-service';

// GET /api/v1/repos/[username]/[repoName]/pulls/[id] - 获取 PR 详情
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ params }) => {
    const { username, repoName, id } = params;

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

    const pullRequest = await PullService.getById(id);

    // 确保 PR 属于当前仓库
    if (pullRequest.repositoryId !== repo.id) {
      return error(ErrorCodes.NOT_FOUND, { message: '合并请求不存在' });
    }

    return success({
      ...pullRequest,
      createdAt: pullRequest.createdAt.toISOString(),
      updatedAt: pullRequest.updatedAt.toISOString(),
      comments: pullRequest.comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  },
});

const updatePRSchema = z.object({
  action: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
});

// PATCH /api/v1/repos/[username]/[repoName]/pulls/[id] - 更新 PR
export const PATCH = defineRoute({
  auth: 'required',
  validation: updatePRSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, id } = params;
    const { action, title, content } = body as z.infer<typeof updatePRSchema>;

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

    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: '合并请求不存在' });
    }

    const userRole = await getUserRepoRole(user!.id, repo.id);
    if (pullRequest.authorId !== user!.id && !canManageIssues(userRole)) {
      return errors.forbidden('无权修改此合并请求');
    }

    // 处理操作
    if (action === 'merge') {
      if (!canManageRepo(userRole)) {
        return errors.forbidden('无权执行合并操作');
      }

      const mergeResult = await PullService.merge(id, user!.id);

      logActivity({
        userId: user!.id,
        action: 'merge_pr',
        targetType: 'pullrequest',
        targetId: id,
        targetName: pullRequest.title,
        req,
      }).catch(() => {});

      return success(mergeResult, '合并请求已合并');
    } else if (action === 'close') {
      const result = await PullService.close(id, user!.id);
      return success(result, '合并请求已关闭');
    } else if (action === 'reopen') {
      const result = await PullService.reopen(id, user!.id);
      return success(result, '合并请求已重新打开');
    } else if (action === 'delete') {
      await prisma.pullRequest.update({
        where: { id },
        data: { isDeleted: true },
      });
      return success({ id }, '合并请求已删除');
    }

    const sanitizedTitle = title !== undefined ? sanitizeText(title.trim()) : undefined;
    const sanitizedContent = content !== undefined ? sanitizeText(content.trim()) : undefined;

    const updatedPR = await PullService.update(id, user!.id, {
      title: sanitizedTitle,
      content: sanitizedContent,
    });

    return success({
      ...updatedPR,
      updatedAt: updatedPR.updatedAt.toISOString(),
    }, '合并请求更新成功');
  },
});

const prCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
});

// POST /api/v1/repos/[username]/[repoName]/pulls/[id]/comments - 添加评论
export const POST = defineRoute({
  auth: 'required',
  validation: prCommentSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, id } = params;
    const { content } = body as z.infer<typeof prCommentSchema>;

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

    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: '合并请求不存在' });
    }

    const muteCheck = await isUserMuted(user!.id);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      return errors.forbidden(`您已被禁言：${muteCheck.penalty.reason}${endStr}`);
    }

    if (!content?.trim()) {
      return errors.badRequest('评论内容不能为空');
    }

    const sanitizedContent = sanitizeText(content.trim());

    const comment = await PullService.addComment(id, user!.id, sanitizedContent);

    return created({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }, '评论已添加');
  },
});

// DELETE /api/v1/repos/[username]/[repoName]/pulls/[id] - 删除评论
export const DELETE = defineRoute({
  auth: 'required',
  handler: async ({ req, user, params }) => {
    const { username, repoName, id } = params;
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return errors.badRequest('缺少评论ID');
    }

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

    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id,
        repositoryId: repo.id,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!pullRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: '合并请求不存在' });
    }

    const comment = await prisma.pullRequestComment.findFirst({
      where: {
        id: commentId,
        pullRequestId: id,
      },
    });

    if (!comment) {
      return error(ErrorCodes.NOT_FOUND, { message: '评论不存在' });
    }

    const userRoleDel = await getUserRepoRole(user!.id, repo.id);
    if (comment.authorId !== user!.id && !canManageIssues(userRoleDel)) {
      return errors.forbidden('无权删除此评论');
    }

    await prisma.pullRequestComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return success({ id: commentId }, '评论已删除');
  },
});
