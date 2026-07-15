export const dynamic = 'force-dynamic';
/**
 * v1 用户账号删除 API
 * DELETE /api/v1/users/[username]/delete - 删除当前用户账号
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { validateSensitiveOperation } from '@/lib/csrf';
import { recordActivityLog } from '@/lib/activity-log';
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/cache';

const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmText: z.string().optional(),
}).optional();

// DELETE /api/v1/users/[username]/delete
export const DELETE = defineRoute({
  auth: 'required',
  validation: deleteAccountSchema,
  async handler({ user, body, params, req }) {
    const { username } = params;
    const { password, confirmText } = body || {};

    // 验证敏感操作（密码验证 + 确认文本检查，CSRF 由管道处理）
    const validation = await validateSensitiveOperation(req, 'deleteAccount', {
      password,
      confirmText,
    });

    if (!validation.valid) {
      return errors.forbidden(validation.error || '操作验证失败');
    }

    // 获取用户
    const targetUser = await prisma.user.findFirst({
      where: { username, isSystem: false },
      select: { id: true, username: true, role: true },
    });

    if (!targetUser) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    // 只能删除自己的账号
    if (targetUser.id !== user!.id) {
      return error(ErrorCodes.FORBIDDEN, { message: '只能删除自己的账号' });
    }

    // 禁止删除管理员账号
    if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
      return error(ErrorCodes.FORBIDDEN, { message: '管理员账号不能通过此方式删除' });
    }

    // 开始事务：删除用户相关数据
    await prisma.$transaction(async (tx) => {
      // 1. 删除用户的仓库（级联删除相关数据）
      const userRepos = await tx.repository.findMany({
        where: { ownerId: targetUser.id },
        select: { id: true },
      });

      for (const repo of userRepos) {
        // 删除仓库文件
        await tx.repoItem.deleteMany({ where: { repoId: repo.id } });
        // 删除仓库分支
        await tx.branch.deleteMany({ where: { repoId: repo.id } });
        // 删除仓库文件块
        await tx.repoFileChunk.deleteMany({ where: { repoId: repo.id } });
        // 删除仓库
        await tx.repository.delete({ where: { id: repo.id } });
      }

      // 2. 删除用户的讨论和评论
      const userDiscussions = await tx.discussion.findMany({
        where: { authorId: targetUser.id },
        select: { id: true },
      });

      for (const discussion of userDiscussions) {
        await tx.discussionComment.deleteMany({ where: { discussionId: discussion.id } });
      }
      await tx.discussion.deleteMany({ where: { authorId: targetUser.id } });

      // 3. 删除用户的 Issues 和评论
      const userIssues = await tx.issue.findMany({
        where: { authorId: targetUser.id },
        select: { id: true },
      });

      for (const issue of userIssues) {
        await tx.issueComment.deleteMany({ where: { issueId: issue.id } });
      }
      await tx.issue.deleteMany({ where: { authorId: targetUser.id } });

      // 4. 删除用户的合并请求和评论
      const userPullRequests = await tx.pullRequest.findMany({
        where: { authorId: targetUser.id },
        select: { id: true },
      });

      for (const pr of userPullRequests) {
        await tx.pullRequestComment.deleteMany({ where: { pullRequestId: pr.id } });
      }
      await tx.pullRequest.deleteMany({ where: { authorId: targetUser.id } });

      // 5. 删除用户的关注关系
      await tx.userFollow.deleteMany({
        where: {
          OR: [
            { followerId: targetUser.id },
            { followingId: targetUser.id },
          ],
        },
      });

      // 6. 删除用户的 Star
      await tx.star.deleteMany({ where: { userId: targetUser.id } });

      // 7. 删除用户的 Watch
      await tx.watcher.deleteMany({ where: { userId: targetUser.id } });

      // 8. 删除用户的通知
      await tx.notification.deleteMany({ where: { userId: targetUser.id } });

      // 9. 删除用户的举报
      await tx.report.deleteMany({ where: { reporterId: targetUser.id } });

      // 10. 删除用户的 API Keys
      await tx.apiKey.deleteMany({ where: { userId: targetUser.id } });

      // 11. 删除用户的 Webhooks
      await tx.webhook.deleteMany({ where: { userId: targetUser.id } });

      // 12. 删除用户的活动日志
      await tx.userActivityLog.deleteMany({ where: { userId: targetUser.id } });

      // 14. 删除用户屏蔽记录
      await tx.userBlock.deleteMany({
        where: {
          OR: [
            { blockerId: targetUser.id },
            { blockedId: targetUser.id },
          ],
        },
      });

      // 15. 删除用户
      await tx.user.delete({ where: { id: targetUser.id } });
    });

    // 清除用户缓存
    await deleteCache(CacheKeys.user(targetUser.id));
    await deleteCache(CacheKeys.userByUsername(targetUser.username));
    await deleteCachePattern(`user:${targetUser.id}:*`);
    await deleteCachePattern(`notification:${targetUser.id}:*`);

    // 记录活动日志（在事务外）
    await recordActivityLog({
      userId: targetUser.id,
      action: 'delete_account',
      targetType: 'user',
      targetId: targetUser.id,
      targetName: targetUser.username,
      details: {
        message: '用户主动删除账号',
      },
    });

    // 清除登录状态
    const response = success({
      username: targetUser.username,
    }, '账号已成功删除');

    // 添加清除 Cookie 的响应头
    const nextResponse = new Response(response.body, response);
    nextResponse.headers.set('Set-Cookie', 'access_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
    nextResponse.headers.append('Set-Cookie', 'refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');

    return nextResponse;
  },
});
