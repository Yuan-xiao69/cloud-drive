export const dynamic = 'force-dynamic';
/**
 * v1 用户账号删除 API
 * DELETE /api/v1/users/[username]/delete - 删除当前用户账号
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { validateSensitiveOperation } from '@/lib/csrf';
import { recordActivityLog } from '@/lib/activity-log';
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/cache';

// DELETE /api/v1/users/[username]/delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username } = await params;

    // 解析请求体
    let body: { password?: string; confirmText?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { password, confirmText } = body;

    // 验证敏感操作
    const validation = await validateSensitiveOperation(req, 'deleteAccount', {
      password,
      confirmText,
    });

    if (!validation.valid) {
      return errors.forbidden(validation.error || '操作验证失败');
    }

    // 获取用户
    const user = await prisma.user.findFirst({
      where: { username, isSystem: false },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    // 只能删除自己的账号
    if (user.id !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只能删除自己的账号' });
    }

    // 禁止删除管理员账号
    if (user.role === 'admin' || user.role === 'super_admin') {
      return error(ErrorCodes.FORBIDDEN, { message: '管理员账号不能通过此方式删除' });
    }

    // 开始事务：删除用户相关数据
    await prisma.$transaction(async (tx) => {
      // 1. 删除用户的仓库（级联删除相关数据）
      const userRepos = await tx.repository.findMany({
        where: { ownerId: user.id },
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
        where: { authorId: user.id },
        select: { id: true },
      });

      for (const discussion of userDiscussions) {
        await tx.discussionComment.deleteMany({ where: { discussionId: discussion.id } });
      }
      await tx.discussion.deleteMany({ where: { authorId: user.id } });

      // 3. 删除用户的 Issues 和评论
      const userIssues = await tx.issue.findMany({
        where: { authorId: user.id },
        select: { id: true },
      });

      for (const issue of userIssues) {
        await tx.issueComment.deleteMany({ where: { issueId: issue.id } });
      }
      await tx.issue.deleteMany({ where: { authorId: user.id } });

      // 4. 删除用户的 Pull Requests 和评论
      const userPullRequests = await tx.pullRequest.findMany({
        where: { authorId: user.id },
        select: { id: true },
      });

      for (const pr of userPullRequests) {
        await tx.pullRequestComment.deleteMany({ where: { pullRequestId: pr.id } });
      }
      await tx.pullRequest.deleteMany({ where: { authorId: user.id } });

      // 5. 删除用户的关注关系
      await tx.userFollow.deleteMany({
        where: {
          OR: [
            { followerId: user.id },
            { followingId: user.id },
          ],
        },
      });

      // 6. 删除用户的 Star
      await tx.star.deleteMany({ where: { userId: user.id } });

      // 7. 删除用户的 Watch
      await tx.watcher.deleteMany({ where: { userId: user.id } });

      // 8. 删除用户的通知
      await tx.notification.deleteMany({ where: { userId: user.id } });

      // 9. 删除用户的举报
      await tx.report.deleteMany({ where: { reporterId: user.id } });

      // 10. 删除用户的 API Keys
      await tx.apiKey.deleteMany({ where: { userId: user.id } });

      // 11. 删除用户的 Webhooks
      await tx.webhook.deleteMany({ where: { userId: user.id } });

      // 12. 删除用户的活动日志
      await tx.userActivityLog.deleteMany({ where: { userId: user.id } });

      // 14. 删除用户屏蔽记录
      await tx.userBlock.deleteMany({
        where: {
          OR: [
            { blockerId: user.id },
            { blockedId: user.id },
          ],
        },
      });

      // 15. 删除用户
      await tx.user.delete({ where: { id: user.id } });
    });

    // 清除用户缓存
    await deleteCache(CacheKeys.user(user.id));
    await deleteCache(CacheKeys.userByUsername(user.username));
    await deleteCachePattern(`user:${user.id}:*`);
    await deleteCachePattern(`notification:${user.id}:*`);

    // 记录活动日志（在事务外）
    await recordActivityLog({
      userId: user.id,
      action: 'delete_account',
      targetType: 'user',
      targetId: user.id,
      targetName: user.username,
      details: {
        message: '用户主动删除账号',
      },
    });

    // 清除登录状态
    const response = success({
      username: user.username,
    }, '账号已成功删除');

    // 添加清除 Cookie 的响应头
    const nextResponse = new Response(response.body, response);
    nextResponse.headers.set('Set-Cookie', 'access_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
    nextResponse.headers.append('Set-Cookie', 'refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');

    return nextResponse;
  } catch (err) {
    return handlePrismaError(err, '删除账号失败');
  }
}
