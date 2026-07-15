export const dynamic = 'force-dynamic';
/**
 * v1 用户 Webhook 管理 API（单条）
 * GET    /api/v1/user/webhooks/[id] - 获取 Webhook 详情
 * PUT    /api/v1/user/webhooks/[id] - 更新 Webhook
 * DELETE /api/v1/user/webhooks/[id] - 删除 Webhook
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { validateExternalUrl } from '@/lib/url-validator';

// GET /api/v1/user/webhooks/[id]
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const { id } = params;

    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: user!.id },
      include: {
        repo: {
          select: { id: true, name: true },
        },
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!webhook) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Webhook 不存在' });
    }

    return success({
      webhook: {
        ...webhook,
        deliveryCount: webhook._count.deliveries,
      },
    });
  },
});

// PUT /api/v1/user/webhooks/[id]
export const PUT = defineRoute({
  auth: 'required',
  validation: z.object({
    name: z.string().optional(),
    url: z.string().optional(),
    secret: z.string().nullable().optional(),
    contentType: z.string().optional(),
    events: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
  async handler({ user, body, params }) {
    const { id } = params;
    const { name, url, secret, contentType, events, isActive } = body;

    // 验证 Webhook 存在且属于当前用户
    const existing = await prisma.webhook.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Webhook 不存在' });
    }

    const updateData: {
      name?: string;
      url?: string;
      secret?: string | null;
      contentType?: string;
      events?: string[];
      isActive?: boolean;
    } = {};

    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (typeof url === 'string') {
      const urlCheck = validateExternalUrl(url);
      if (!urlCheck.safe) {
        return errors.badRequest(urlCheck.reason!);
      }
      updateData.url = url;
    }
    // secret 字段显式提供时允许更新（包括设为 null 清空）
    
    if (secret !== undefined) {
      updateData.secret = secret || null;
    }
    if (contentType === 'json' || contentType === 'form') {
      updateData.contentType = contentType;
    }
    if (Array.isArray(events) && events.length > 0) {
      updateData.events = events;
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return errors.badRequest('没有需要更新的字段');
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: updateData,
    });

    return success({ webhook }, 'Webhook 更新成功');
  },
});

// DELETE /api/v1/user/webhooks/[id]
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const { id } = params;

    // 验证 Webhook 存在且属于当前用户
    const existing = await prisma.webhook.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Webhook 不存在' });
    }

    await prisma.webhook.delete({
      where: { id },
    });

    return success({ message: 'Webhook 已删除' });
  },
});
