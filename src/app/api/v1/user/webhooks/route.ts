export const dynamic = 'force-dynamic';
/**
 * v1 用户 Webhook 管理 API
 * GET  /api/v1/user/webhooks - 获取用户的 Webhook 列表
 * POST /api/v1/user/webhooks - 创建新的 Webhook
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { validateExternalUrl } from '@/lib/url-validator';

// GET /api/v1/user/webhooks
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    const webhooks = await prisma.webhook.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        repo: {
          select: { id: true, name: true },
        },
      },
    });

    return success({ webhooks });
  },
});

// POST /api/v1/user/webhooks
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    name: z.string().min(1, '请提供 Webhook 名称'),
    url: z.string().min(1, '请提供回调 URL'),
    secret: z.string().optional(),
    contentType: z.string().optional(),
    events: z.array(z.string()).min(1, '请选择至少一个触发事件'),
    repoId: z.string().optional(),
  }),
  async handler({ user, body }) {
    const { name, url, secret, contentType, events, repoId } = body;

    const urlCheck = validateExternalUrl(url);
    if (!urlCheck.safe) {
      return errors.badRequest(urlCheck.reason!);
    }

    // 如果指定了仓库，验证仓库所有权
    if (repoId) {
      const repo = await prisma.repository.findFirst({
        where: {
          id: repoId,
          ownerId: user!.id,
          deletedAt: null,
        },
      });

      if (!repo) {
        return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在或无权访问' });
      }
    }

    const webhook = await prisma.webhook.create({
      data: {
        userId: user!.id,
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
  },
});
