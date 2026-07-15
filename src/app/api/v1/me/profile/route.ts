export const dynamic = 'force-dynamic';
/**
 * API v1 - 用户资料更新 API
 * PATCH /api/v1/me/profile - 更新当前用户的个人资料
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, error, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { sanitizeText } from '@/lib/security';
import { logActivity } from '@/lib/activity-log';

export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    username: z.string().min(1).max(39).optional(),
    bio: z.string().max(500).nullable().optional(),
    location: z.string().max(100).nullable().optional(),
    website: z.string().max(255).nullable().optional(),
    avatarUrl: z.string().max(2000).nullable().optional(),
  }).refine(data => Object.values(data).some(v => v !== undefined), {
    message: '没有提供需要更新的字段',
  }),
  async handler({ user, body }) {
    const { username, bio, location, website, avatarUrl } = body;

    const updateData: Record<string, unknown> = {};
    const changes: string[] = [];

    // 用户名验证
    if (username !== undefined) {
      // 检查用户名是否被占用
      const existing = await prisma.user.findFirst({
        where: {
          username: username.trim(),
          id: { not: user!.id },
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
      updateData.bio = bio ? sanitizeText(bio.trim()) : null;
      changes.push('简介');
    }

    // 位置验证
    if (location !== undefined) {
      updateData.location = location ? sanitizeText(location.trim()) : null;
      changes.push('位置');
    }

    // 网站验证
    if (website !== undefined) {
      if (website && !/^https?:\/\/.+/i.test(website)) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '网站地址必须以 http:// 或 https:// 开头' });
      }
      updateData.website = website ? website.trim() : null;
      changes.push('网站');
    }

    // 头像 URL 验证
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
      changes.push('头像');
    }

    // 执行更新
    const updatedUser = await prisma.user.update({
      where: { id: user!.id },
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
        userId: user!.id,
        action: 'update_profile',
        targetType: 'user',
        targetId: user!.id,
        targetName: updatedUser.username,
        details: { updatedFields: changes },
      });
    }

    return success({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      bio: updatedUser.bio ?? undefined,
      avatarUrl: updatedUser.avatarUrl ?? undefined,
      location: updatedUser.location ?? undefined,
      website: updatedUser.website ?? undefined,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString(),
    }, `个人资料已更新：${changes.join('、')}`);
  },
});
