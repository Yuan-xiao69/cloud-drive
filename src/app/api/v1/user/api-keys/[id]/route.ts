export const dynamic = 'force-dynamic';
/**
 * v1 用户 API 密钥管理 API（单条）
 * GET    /api/v1/user/api-keys/[id] - 获取密钥详情
 * DELETE /api/v1/user/api-keys/[id] - 删除密钥
 * PATCH  /api/v1/user/api-keys/[id] - 更新密钥（名称/状态）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/user/api-keys/[id]
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const { id } = params;

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: user!.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        lastIp: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      return error(ErrorCodes.NOT_FOUND, { message: 'API 密钥不存在' });
    }

    return success({ apiKey });
  },
});

// PATCH /api/v1/user/api-keys/[id]
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    name: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
  async handler({ user, body, params }) {
    const { id } = params;
    const { name, isActive } = body;

    // 验证密钥存在且属于当前用户
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: 'API 密钥不存在' });
    }

    const updateData: { name?: string; isActive?: boolean } = {};
    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return errors.badRequest('没有需要更新的字段');
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return success({ apiKey }, 'API 密钥更新成功');
  },
});

// DELETE /api/v1/user/api-keys/[id]
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const { id } = params;

    // 验证密钥存在且属于当前用户
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: user!.id },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: 'API 密钥不存在' });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return success({ message: 'API 密钥已删除' });
  },
});
