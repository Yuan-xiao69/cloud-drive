export const dynamic = 'force-dynamic';
/**
 * v1 分享链接 API
 * GET /api/v1/share/[token] - 访问分享内容
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { ErrorCodes } from '@/lib/api/v1';
import { ShareService } from '@/services/share-service';

// GET /api/v1/share/[token] - 访问分享内容
export const GET = defineRoute({
  auth: 'none',
  async handler({ req, params }) {
    const { token } = params;
    const { searchParams } = new URL(req.url);
    const password = searchParams.get('password');

    if (!token) {
      return errors.badRequest('分享 token 不能为空');
    }

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        repo: {
          select: {
            id: true,
            name: true,
            description: true,
            visibility: true,
            owner: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
        creator: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!shareLink) {
      return error(ErrorCodes.NOT_FOUND, { message: '分享链接不存在或已失效' });
    }

    // 检查过期
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return error(ErrorCodes.NOT_FOUND, { message: '分享链接已过期' });
    }

    // 检查密码（在原子递增前验证，避免消耗 viewCount）
    if (shareLink.password) {
      if (!password) {
        return success({
          requiresPassword: true,
          token,
        });
      }

      // 密码验证速率限制（5 次/15 分钟/IP）
      const rateLimitResult = await checkRateLimit(req, 'share_password');
      if (!rateLimitResult.allowed) {
        return error(ErrorCodes.RATE_LIMITED, {
          message: `密码尝试次数过多，请 ${rateLimitResult.retryAfter || 900} 秒后重试`,
        });
      }

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, shareLink.password);
      if (!valid) {
        return errors.unauthorized('密码错误');
      }
    }

    // 原子递增 viewCount，同时校验有效期和最大浏览次数
    const accessResult = await ShareService.access(token);

    if (!accessResult) {
      return error(ErrorCodes.NOT_FOUND, { message: '分享链接已失效或已达最大访问次数' });
    }

    const newViewCount = accessResult.viewCount;

    // 如果分享指定了路径，获取该路径下的内容
    if (shareLink.path) {
      const item = await prisma.repoItem.findFirst({
        where: {
          repoId: shareLink.repoId,
          path: shareLink.path,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          type: true,
          fileSize: true,
          mimeType: true,
          path: true,
          storagePath: true,
        },
      });

      if (item) {
        return success({
          type: item.type === 'file' ? 'file' : 'folder',
          token,
          sharePath: shareLink.path,
          permission: shareLink.permission,
          item,
          repo: shareLink.repo,
          creator: shareLink.creator,
          viewCount: newViewCount,
          expiresAt: shareLink.expiresAt?.toISOString() ?? null,
        });
      }

      return error(ErrorCodes.NOT_FOUND, { message: '分享内容不存在或已被删除' });
    }

    // 返回整个仓库
    return success({
      type: 'repo',
      token,
      permission: shareLink.permission,
      repo: shareLink.repo,
      creator: shareLink.creator,
      viewCount: newViewCount,
      expiresAt: shareLink.expiresAt?.toISOString() ?? null,
    });
  },
});

// PATCH /api/v1/share/[token] - 停用分享链接
export const PATCH = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const { token } = params;

    // 先查找链接以进行权限校验
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      select: { id: true, creatorId: true, isActive: true },
    });

    if (!shareLink) {
      return error(ErrorCodes.NOT_FOUND, { message: '分享链接不存在' });
    }

    // 仅创建者或管理员可以停用
    const isAdmin = user!.role === 'admin' || user!.role === 'super_admin';
    if (shareLink.creatorId !== user!.id && !isAdmin) {
      return errors.forbidden('无权停用此分享链接');
    }

    const result = await ShareService.deactivate(token);

    if (!result) {
      return error(ErrorCodes.NOT_FOUND, { message: '分享链接不存在' });
    }

    if (result.alreadyInactive) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '分享链接已停用' });
    }

    return success({ token, isActive: false }, '分享链接已停用');
  },
});
