export const dynamic = 'force-dynamic';
/**
 * API v1 - 用户资料更新 API
 * PATCH /api/v1/me/profile - 更新当前用户的个人资料
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, ErrorCodes } from '@/lib/api/v1';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeText } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { username, bio, location, website, avatarUrl } = body;

    const updateData: Record<string, unknown> = {};
    const changes: string[] = [];

    // 用户名验证
    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length < 1) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '用户名不能为空' });
      }
      if (username.trim().length > 39) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '用户名过长，最大支持 39 个字符' });
      }
      // 检查用户名是否被占用
      const existing = await prisma.user.findFirst({
        where: {
          username: username.trim(),
          id: { not: auth.userId },
        },
      });
      if (existing) {
        return error(ErrorCodes.RESOURCE_EXISTS, { message: '该用户名已被使用' });
      }
      updateData.username = username.trim();
      changes.push('用户名');
    }

    // 简介验证
    if (bio !== undefined) {
      if (bio !== null && (typeof bio !== 'string' || bio.length > 500)) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '简介过长，最大支持 500 个字符' });
      }
      updateData.bio = bio ? sanitizeText(bio.trim()) : null;
      changes.push('简介');
    }

    // 位置验证
    if (location !== undefined) {
      if (location !== null && (typeof location !== 'string' || location.length > 100)) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '位置信息过长，最大支持 100 个字符' });
      }
      updateData.location = location ? sanitizeText(location.trim()) : null;
      changes.push('位置');
    }

    // 网站验证
    if (website !== undefined) {
      if (website !== null) {
        if (typeof website !== 'string') {
          return error(ErrorCodes.VALIDATION_ERROR, { message: '网站地址格式错误' });
        }
        if (website.length > 255) {
          return error(ErrorCodes.VALIDATION_ERROR, { message: '网站地址过长，最大支持 255 个字符' });
        }
        // 简单的 URL 格式验证
        if (website && !/^https?:\/\/.+/i.test(website)) {
          return error(ErrorCodes.VALIDATION_ERROR, { message: '网站地址必须以 http:// 或 https:// 开头' });
        }
      }
      updateData.website = website ? website.trim() : null;
      changes.push('网站');
    }

    // 头像 URL 验证
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '头像地址格式错误' });
      }
      if (avatarUrl && avatarUrl.length > 2000) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '头像地址过长，最大支持 2000 个字符' });
      }
      updateData.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
      changes.push('头像');
    }

    // 如果没有需要更新的字段
    if (Object.keys(updateData).length === 0) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '没有提供需要更新的字段' });
    }

    // 执行更新
    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        avatarUrl: true,
        location: true,
        website: true,
        role: true,
        createdAt: true,
      },
    });

    // 记录活动日志
    if (changes.length > 0) {
      await logActivity({
        userId: auth.userId,
        action: 'update_profile',
        targetType: 'user',
        targetId: auth.userId,
        targetName: user.username,
        details: { updatedFields: changes },
      });
    }

    return success({
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      location: user.location ?? undefined,
      website: user.website ?? undefined,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }, `个人资料已更新：${changes.join('、')}`);
  } catch (err) {
    return handlePrismaError(err, '更新个人资料失败');
  }
}
