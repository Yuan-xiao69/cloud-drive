export const dynamic = 'force-dynamic';
/**
 * API v1 - 通知设置 API
 * GET  /api/v1/me/notifications/settings - 获取当前用户的通知设置（12 项）
 * PATCH /api/v1/me/notifications/settings - 更新通知设置（12 项）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// 默认通知设置
const DEFAULT_SETTINGS = {
  watchNotifications: true,
  forkNotifications: true,
  releaseNotifications: true,
  discussionReplies: true,
  discussionMentions: true,
  issueComments: true,
  issueMentions: true,
  prReviews: true,
  prComments: true,
  prMentions: true,
  securityAlerts: true,
  accountAlerts: true,
};

type NotificationSettings = typeof DEFAULT_SETTINGS;

function getConfigKey(userId: string) {
  return `notif:${userId}`;
}

async function loadSettings(userId: string): Promise<NotificationSettings> {
  const configKey = getConfigKey(userId);
  const record = await prisma.systemConfig.findUnique({
    where: { key: configKey },
    select: { value: true },
  });
  if (record?.value) {
    try {
      const parsed = JSON.parse(record.value);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      // 解析失败时返回默认值
    }
  }
  return { ...DEFAULT_SETTINGS };
}

async function saveSettings(userId: string, settings: NotificationSettings): Promise<void> {
  const configKey = getConfigKey(userId);
  await prisma.systemConfig.upsert({
    where: { key: configKey },
    update: {
      value: JSON.stringify(settings),
      description: `通知设置: ${userId}`,
    },
    create: {
      key: configKey,
      value: JSON.stringify(settings),
      description: `通知设置: ${userId}`,
    },
  });
}

export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    const settings = await loadSettings(user!.id);
    return success(settings);
  },
});

const notificationSettingsSchema = z.object({
  watchNotifications: z.boolean().optional(),
  forkNotifications: z.boolean().optional(),
  releaseNotifications: z.boolean().optional(),
  discussionReplies: z.boolean().optional(),
  discussionMentions: z.boolean().optional(),
  issueComments: z.boolean().optional(),
  issueMentions: z.boolean().optional(),
  prReviews: z.boolean().optional(),
  prComments: z.boolean().optional(),
  prMentions: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  accountAlerts: z.boolean().optional(),
});

export const PATCH = defineRoute({
  auth: 'required',
  validation: notificationSettingsSchema,
  async handler({ user, body }) {
    // 过滤出实际提供的字段
    const updates: Partial<NotificationSettings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof NotificationSettings)[]) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '至少需要提供一个有效的设置字段' });
    }

    // 加载现有设置，应用更新
    const current = await loadSettings(user!.id);
    const merged = { ...current, ...updates };
    await saveSettings(user!.id, merged);

    // 同时更新 User 表的两个核心字段（向后兼容）
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        notifyWatch: merged.watchNotifications,
        notifyReply: merged.discussionReplies,
      },
    });

    return success(merged, '通知设置已更新');
  },
});
