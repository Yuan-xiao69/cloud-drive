export const dynamic = 'force-dynamic';
/**
 * v1 分享链接 API
 * GET /api/v1/share/[token] - 访问分享内容
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/share/[token] - 访问分享内容
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  try {
    const { token } = await params;
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

    // 检查查看次数
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return error(ErrorCodes.NOT_FOUND, { message: '分享链接已达到最大查看次数' });
    }

    // 检查密码
    if (shareLink.password) {
      if (!password) {
        return success({
          requiresPassword: true,
          token,
        });
      }

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, shareLink.password);
      if (!valid) {
        return errors.unauthorized('密码错误');
      }
    }

    // 增加查看次数
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: { increment: 1 } },
    });

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
          content: true,
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
          viewCount: shareLink.viewCount + 1,
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
      viewCount: shareLink.viewCount + 1,
      expiresAt: shareLink.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    return handlePrismaError(err, '访问分享失败');
  }
}
