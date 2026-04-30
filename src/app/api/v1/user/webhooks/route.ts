export const dynamic = 'force-dynamic';
/**
 * v1 用户 Webhook 管理 API
 * GET  /api/v1/user/webhooks - 获取用户的 Webhook 列表
 * POST /api/v1/user/webhooks - 创建新的 Webhook
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/user/webhooks
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const webhooks = await prisma.webhook.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        repo: {
          select: { id: true, name: true },
        },
      },
    });

    return success({ webhooks });
  } catch (err) {
    return handlePrismaError(err, '获取 Webhook 列表失败');
  }
}

// POST /api/v1/user/webhooks
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const body = await req.json();
    const { name, url, secret, contentType, events, repoId } = body;

    if (!name || name.trim().length === 0) {
      return errors.badRequest('请提供 Webhook 名称');
    }

    if (!url || !url.startsWith('http')) {
      return errors.badRequest('请提供有效的回调 URL');
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return errors.badRequest('请选择至少一个触发事件');
    }

    // 如果指定了仓库，验证仓库所有权
    if (repoId) {
      const repo = await prisma.repository.findFirst({
        where: {
          id: repoId,
          ownerId: auth.userId,
          deletedAt: null,
        },
      });

      if (!repo) {
        return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在或无权访问' });
      }
    }

    const webhook = await prisma.webhook.create({
      data: {
        userId: auth.userId,
        repoId: repoId || null,
        name: name.trim(),
        url,
        secret: secret || null,
        contentType: contentType || 'json',
        events,
      },
    });

    return created({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt.toISOString(),
    }, 'Webhook 创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建 Webhook 失败');
  }
}
