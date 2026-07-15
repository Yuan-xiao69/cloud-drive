export const dynamic = 'force-dynamic';
/**
 * v1 Issue 详情与评论 API
 * GET /api/v1/repos/[username]/[repoName]/issues/[id] - 获取 Issue 详情
 * PATCH /api/v1/repos/[username]/[repoName]/issues/[id] - 更新 Issue
 * POST /api/v1/repos/[username]/[repoName]/issues/[id]/comments - 添加评论
 * DELETE /api/v1/repos/[username]/[repoName]/issues/[id] - 删除评论
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { IssueService } from '@/services/issue-service';

// GET /api/v1/repos/[username]/[repoName]/issues/[id] - 获取 Issue 详情
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
      select: { id: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const issue = await IssueService.getById(id);
    if (issue.repositoryId !== repo.id) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    return success(issue);
  },
});

const updateIssueSchema = z.object({
  action: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  labels: z.array(z.object({ name: z.string(), color: z.string().optional() })).optional(),
});

// PATCH /api/v1/repos/[username]/[repoName]/issues/[id] - 更新 Issue
export const PATCH = defineRoute({
  auth: 'required',
  validation: updateIssueSchema,
  handler: async ({ req, user, body, params }) => {
    const { id } = params;
    const { action, title, content, labels } = body as z.infer<typeof updateIssueSchema>;

    if (action === 'close') {
      const result = await IssueService.close(id, user!.id);
      return success(result, 'Issue 已关闭');
    }
    if (action === 'reopen') {
      const result = await IssueService.reopen(id, user!.id);
      return success(result, 'Issue 已重新打开');
    }
    if (action === 'delete') {
      const result = await IssueService.deleteIssue(id, user!.id);
      return success(result, 'Issue 已删除');
    }

    const result = await IssueService.update(id, user!.id, { title, content, labels });
    return success(result, 'Issue 更新成功');
  },
});

const commentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
});

// POST /api/v1/repos/[username]/[repoName]/issues/[id]/comments - 添加评论
export const POST = defineRoute({
  auth: 'required',
  validation: commentSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, id } = params;
    const { content } = body as z.infer<typeof commentSchema>;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 验证 Issue 属于该仓库
    const issue = await prisma.issue.findFirst({
      where: { id, repositoryId: repo.id, isDeleted: false },
      select: { id: true },
    });
    if (!issue) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    const comment = await IssueService.addComment(id, user!.id, content);
    return created(comment, '评论已添加');
  },
});

// DELETE /api/v1/repos/[username]/[repoName]/issues/[id] - 删除评论
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
      select: { id: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 验证 Issue 属于该仓库
    const issue = await prisma.issue.findFirst({
      where: { id, repositoryId: repo.id, isDeleted: false },
      select: { id: true },
    });
    if (!issue) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Issue 不存在' });
    }

    const result = await IssueService.deleteComment(commentId, user!.id);
    return success(result, '评论已删除');
  },
});
