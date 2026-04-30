export const dynamic = 'force-dynamic';
/**
 * v1 用户 API 密钥管理 API（单条）
 * GET    /api/v1/user/api-keys/[id] - 获取密钥详情
 * DELETE /api/v1/user/api-keys/[id] - 删除密钥
 * PATCH  /api/v1/user/api-keys/[id] - 更新密钥（名称/状态）
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/user/api-keys/[id]
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

    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: auth.userId },
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
  } catch (err) {
    return handlePrismaError(err, '获取 API 密钥详情失败');
  }
}

// PATCH /api/v1/user/api-keys/[id]
export async function PATCH(
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
    const { name, isActive } = body;

    // 验证密钥存在且属于当前用户
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: auth.userId },
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
  } catch (err) {
    return handlePrismaError(err, '更新 API 密钥失败');
  }
}

// DELETE /api/v1/user/api-keys/[id]
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

    // 验证密钥存在且属于当前用户
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: 'API 密钥不存在' });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return success({ message: 'API 密钥已删除' });
  } catch (err) {
    return handlePrismaError(err, '删除 API 密钥失败');
  }
}
