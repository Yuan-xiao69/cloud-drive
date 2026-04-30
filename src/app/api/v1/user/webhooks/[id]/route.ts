export const dynamic = 'force-dynamic';
/**
 * v1 用户 Webhook 管理 API（单条）
 * GET    /api/v1/user/webhooks/[id] - 获取 Webhook 详情
 * PUT    /api/v1/user/webhooks/[id] - 更新 Webhook
 * DELETE /api/v1/user/webhooks/[id] - 删除 Webhook
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/user/webhooks/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { id } = await params;

    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: auth.userId },
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
  } catch (err) {
    return handlePrismaError(err, '获取 Webhook 详情失败');
  }
}

// PUT /api/v1/user/webhooks/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { id } = await params;
    const body = await req.json();
    const { name, url, secret, contentType, events, isActive } = body;

    // 验证 Webhook 存在且属于当前用户
    const existing = await prisma.webhook.findFirst({
      where: { id, userId: auth.userId },
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
    if (typeof url === 'string' && url.startsWith('http')) {
      updateData.url = url;
    }
    if ('secret' in body) {
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
  } catch (err) {
    return handlePrismaError(err, '更新 Webhook 失败');
  }
}

// DELETE /api/v1/user/webhooks/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { id } = await params;

    // 验证 Webhook 存在且属于当前用户
    const existing = await prisma.webhook.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Webhook 不存在' });
    }

    await prisma.webhook.delete({
      where: { id },
    });

    return success({ message: 'Webhook 已删除' });
  } catch (err) {
    return handlePrismaError(err, '删除 Webhook 失败');
  }
}
