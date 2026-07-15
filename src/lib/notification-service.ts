/**
 * 通知触发工具
 * 在关键操作时创建并发送通知
 */

import { EventEmitter } from 'events';
import { prisma } from '@/lib/prisma';
import { getCache, CacheKeys } from '@/lib/cache';
import { AsyncJob } from '@/lib/events';

// ============================================================
// SSE 连接管理
// ============================================================

export const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(10000);

interface NotificationParams {
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  senderId?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
}

/**
 * 通知优先级枚举
 */
export const NotificationPriority = {
  URGENT: 'urgent',   // 紧急：账号安全、异地登录
  HIGH: 'high',       // 高：处罚通知、申诉结果
  NORMAL: 'normal',   // 普通：评论、回复、提及
  LOW: 'low',         // 低：Star、Fork、Watch 等
} as const;

export type NotificationPriorityValue = typeof NotificationPriority[keyof typeof NotificationPriority];

/**
 * 优先级排序权重
 */
const PRIORITY_WEIGHTS: Record<string, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * 通知设置接口
 */
interface NotificationSettings {
  watchNotifications: boolean;
  forkNotifications: boolean;
  releaseNotifications: boolean;
  discussionReplies: boolean;
  discussionMentions: boolean;
  issueComments: boolean;
  issueMentions: boolean;
  prReviews: boolean;
  prComments: boolean;
  prMentions: boolean;
  securityAlerts: boolean;
  accountAlerts: boolean;
}

/**
 * 默认通知设置
 */
const DEFAULT_SETTINGS: NotificationSettings = {
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

/**
 * 获取用户通知设置
 */
async function getUserNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    const cacheKey = CacheKeys.notificationSettings(userId);
    const cached = await getCache<NotificationSettings>(cacheKey);
    if (cached.hit && cached.data) {
      return cached.data;
    }
  } catch (err) {
    console.warn('[Notification] Cache miss, falling back to database:', err);
  }

  // 缓存不可用时回退到数据库查询
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyWatch: true, notifyReply: true },
    });
    if (user) {
      return {
        watchNotifications: user.notifyWatch,
        forkNotifications: user.notifyWatch,
        releaseNotifications: false,
        discussionReplies: user.notifyReply,
        discussionMentions: true,
        issueComments: user.notifyReply,
        issueMentions: true,
        prReviews: user.notifyReply,
        prComments: user.notifyReply,
        prMentions: true,
        securityAlerts: true,
        accountAlerts: true,
      };
    }
  } catch (dbErr) {
    console.error('[Notification] Database fallback failed:', dbErr);
  }

  return DEFAULT_SETTINGS;
}

/**
 * 检查是否应该发送通知
 */
async function shouldSendNotification(userId: string, notificationType: string): Promise<boolean> {
  const settings = await getUserNotificationSettings(userId);

  switch (notificationType) {
    case 'star_repo':
    case 'watch_repo':
      return settings.watchNotifications;
    case 'new_fork':
      return settings.forkNotifications;
    case 'new_comment':
    case 'discussion_reply':
    case 'comment_accepted':
      return settings.discussionReplies;
    case 'mention':
      // 提及需要根据上下文判断，暂时全部发送
      return settings.discussionMentions || settings.issueMentions || settings.prMentions;
    case 'login_alert':
      return settings.accountAlerts;
    case 'penalty_applied':
    case 'appeal_result':
      return settings.securityAlerts;
    case 'new_discussion':
      return settings.discussionMentions;
    default:
      return true;
  }
}

/**
 * 通知类型枚举
 */
export const NotificationType = {
  // 评论相关
  NEW_COMMENT: 'new_comment',           // 新评论
  REPLY_COMMENT: 'reply_comment',       // 回复评论
  COMMENT_ACCEPTED: 'comment_accepted', // 评论被采纳

  // 讨论相关
  NEW_DISCUSSION: 'new_discussion',     // 新讨论（在仓库中）
  DISCUSSION_REPLY: 'discussion_reply', // 讨论有新回复

  // 仓库相关
  STAR_REPO: 'star_repo',               // 仓库被 star
  NEW_FORK: 'new_fork',                 // 仓库被 fork
  WATCH_REPO: 'watch_repo',             // 有人 watch

  // 提及
  MENTION: 'mention',                   // 被 @提及

  // 安全
  LOGIN_ALERT: 'login_alert',          // 异地登录提醒

  // 系统
  SYSTEM_ANNOUNCEMENT: 'system_announcement', // 系统公告

  // 处罚
  PENALTY_APPLIED: 'penalty_applied',   // 被处罚
  APPEAL_RESULT: 'appeal_result',       // 申诉结果
} as const;

export type NotificationTypeValue = typeof NotificationType[keyof typeof NotificationType];


// ============================================================
// SSE 发送函数（供 route.ts 调用）
// ============================================================

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  timestamp: number;
}

/**
 * 向单个用户发送实时通知（先持久化，再用数据库 ID 推送 SSE）
 */
/**
 * 直接发送通知（同步：写DB + 推SSE）。
 * 仅供 AsyncJob 消费者内部使用，外部业务代码请用 sendNotificationToUser。
 */
export async function sendDirectNotification(userId: string, params: NotificationParams): Promise<void> {
  try {
    const saved = await prisma.notification.create({
      data: {
        userId,
        senderId: params.senderId,
        type: params.type,
        title: params.title,
        content: params.content,
        linkUrl: params.linkUrl,
        priority: params.priority || 'normal',
      },
    });

    const payload: NotificationPayload = {
      id: saved.id,
      timestamp: saved.createdAt.getTime(),
      type: params.type,
      title: params.title,
      content: params.content,
      linkUrl: params.linkUrl,
    };

    notificationEmitter.emit(`notification:${userId}`, payload);
  } catch (err) {
    console.error('[Notification] Failed to persist notification:', err);
  }
}

/**
 * 发送通知给单个用户（异步：入队后立即返回，后台处理）。
 * 所有业务代码应调用此函数。
 */
export async function sendNotificationToUser(userId: string, params: NotificationParams): Promise<void> {
  await AsyncJob.enqueue('send_notification', {
    userId,
    type: params.type,
    title: params.title,
    content: params.content,
    linkUrl: params.linkUrl,
    actorId: params.senderId,
    priority: params.priority || 'normal',
  });
}

/**
 * 向多个用户发送实时通知（持久化后推送 SSE）
 */
export async function sendNotificationToUsers(userIds: string[], params: NotificationParams): Promise<void> {
  if (userIds.length === 0) return;

  // 全部走异步队列，不再直接写DB
  for (const userId of userIds) {
    await AsyncJob.enqueue('send_notification', {
      userId,
      type: params.type,
      title: params.title,
      content: params.content,
      linkUrl: params.linkUrl,
      actorId: params.senderId,
      priority: params.priority || 'normal',
    });
  }
}

/**
 * 发送评论通知
 */
export async function notifyNewComment(params: {
  discussionId: string;
  discussionTitle: string;
  commentAuthorId: string;
  repoOwnerId: string;
  commentId: string;
}): Promise<void> {
  const { discussionId, discussionTitle, commentAuthorId, repoOwnerId, commentId } = params;

  if (repoOwnerId !== commentAuthorId) {
    // 检查用户通知设置
    if (!await shouldSendNotification(repoOwnerId, NotificationType.NEW_COMMENT)) {
      return;
    }

    const notification: NotificationParams = {
      type: NotificationType.NEW_COMMENT,
      title: '有新评论',
      content: `您的讨论「${discussionTitle}」收到了新评论`,
      linkUrl: `/discussions/${discussionId}#comment-${commentId}`,
      senderId: commentAuthorId,
      priority: NotificationPriority.NORMAL,
    };
    sendNotificationToUser(repoOwnerId, notification);
  }
}


/**
 * 发送回复通知
 */
export async function notifyReply(params: {
  discussionId: string;
  discussionTitle: string;
  parentCommentAuthorId: string;
  replyAuthorId: string;
  replyAuthorName: string;
  commentId: string;
}): Promise<void> {
  const { discussionId, discussionTitle, parentCommentAuthorId, replyAuthorId, replyAuthorName, commentId } = params;

  if (parentCommentAuthorId !== replyAuthorId) {
    // 检查用户通知设置
    if (!await shouldSendNotification(parentCommentAuthorId, NotificationType.REPLY_COMMENT)) {
      return;
    }

    const notification: NotificationParams = {
      type: NotificationType.REPLY_COMMENT,
      title: '有人回复您',
      content: `${replyAuthorName} 回复了您在「${discussionTitle}」中的评论`,
      linkUrl: `/discussions/${discussionId}#comment-${commentId}`,
      senderId: replyAuthorId,
      priority: NotificationPriority.NORMAL,
    };
    sendNotificationToUser(parentCommentAuthorId, notification);
  }
}


/**
 * 发送评论被采纳通知
 */
export async function notifyCommentAccepted(params: {
  discussionId: string;
  discussionTitle: string;
  commentAuthorId: string;
  accepterId: string;
  commentId: string;
}): Promise<void> {
  const { discussionId, discussionTitle, commentAuthorId, accepterId, commentId } = params;

  if (commentAuthorId !== accepterId) {
    const notification: NotificationParams = {
      type: NotificationType.COMMENT_ACCEPTED,
      title: '您的评论被采纳',
      content: `您的评论在「${discussionTitle}」中被采纳为答案`,
      linkUrl: `/discussions/${discussionId}#comment-${commentId}`,
      senderId: accepterId,
      priority: NotificationPriority.NORMAL,
    };
    sendNotificationToUser(commentAuthorId, notification);
  }
}


/**
 * 发送仓库 Star 通知
 */
export async function notifyRepoStarred(params: {
  repoOwnerId: string;
  repoName: string;
  starerId: string;
  starerName: string;
}): Promise<void> {
  const { repoOwnerId, repoName, starerId, starerName } = params;

  if (repoOwnerId !== starerId) {
    // 检查用户通知设置
    if (!await shouldSendNotification(repoOwnerId, NotificationType.STAR_REPO)) {
      return;
    }

    const notification: NotificationParams = {
      type: NotificationType.STAR_REPO,
      title: '仓库被收藏',
      content: `${starerName} 收藏了您的仓库 ${repoName}`,
      linkUrl: `/${repoOwnerId}/${repoName}`,
      senderId: starerId,
      priority: NotificationPriority.LOW,
    };
    sendNotificationToUser(repoOwnerId, notification);
  }
}


/**
 * 发送仓库 Fork 通知
 */
export async function notifyRepoForked(params: {
  sourceRepoOwnerId: string;
  sourceRepoName: string;
  forkOwnerId: string;
  forkOwnerName: string;
  forkRepoName: string;
}): Promise<void> {
  const { sourceRepoOwnerId, sourceRepoName, forkOwnerId, forkOwnerName, forkRepoName } = params;

  if (sourceRepoOwnerId !== forkOwnerId) {
    // 检查用户通知设置
    if (!await shouldSendNotification(sourceRepoOwnerId, NotificationType.NEW_FORK)) {
      return;
    }

    const notification: NotificationParams = {
      type: NotificationType.NEW_FORK,
      title: '仓库被 Fork',
      content: `${forkOwnerName} Fork 了您的仓库 ${sourceRepoName}`,
      linkUrl: `/${forkOwnerId}/${forkRepoName}`,
      senderId: forkOwnerId,
      priority: NotificationPriority.LOW,
    };
    sendNotificationToUser(sourceRepoOwnerId, notification);
  }
}


/**
 * 发送被 @提及通知
 */
export async function notifyMention(params: {
  mentionedUserId: string;
  mentionerId: string;
  mentionerName: string;
  linkUrl?: string;
}): Promise<void> {
  const { mentionedUserId, mentionerId, mentionerName, linkUrl } = params;

  if (mentionedUserId !== mentionerId) {
    // 检查用户通知设置
    if (!await shouldSendNotification(mentionedUserId, NotificationType.MENTION)) {
      return;
    }

    const notification: NotificationParams = {
      type: NotificationType.MENTION,
      title: '有人提到了您',
      content: `${mentionerName} 在${linkUrl?.includes('/discussions') ? '讨论' : '评论'}中提到了您`,
      linkUrl,
      senderId: mentionerId,
      priority: NotificationPriority.NORMAL,
    };
    sendNotificationToUser(mentionedUserId, notification);
  }
}


/**
 * 发送处罚通知
 */
export async function notifyPenaltyApplied(params: {
  userId: string;
  penaltyType: string;
  reason: string;
  expiresAt?: Date | null;
  adminId: string;
}): Promise<void> {
  const { userId, penaltyType, reason, expiresAt, adminId } = params;

  // 检查用户通知设置（安全类通知通常默认开启）
  if (!await shouldSendNotification(userId, NotificationType.PENALTY_APPLIED)) {
    return;
  }

  const penaltyLabels: Record<string, string> = {
    mute: '禁言',
    repo_limit: '仓库限制',
    storage_limit: '存储限制',
  };

  const typeLabel = penaltyLabels[penaltyType] || penaltyType;
  const durationText = expiresAt ? `，有效期至 ${expiresAt.toLocaleDateString('zh-CN')}` : '，永久生效';

  const notification: NotificationParams = {
    type: NotificationType.PENALTY_APPLIED,
    title: '您受到了处罚',
    content: `您因「${reason}」被${typeLabel}${durationText}`,
    senderId: adminId,
    priority: NotificationPriority.HIGH,
  };

  sendNotificationToUser(userId, notification);
}


/**
 * 发送申诉结果通知
 */
export async function notifyAppealResult(params: {
  userId: string;
  appealType: string;
  status: 'approved' | 'rejected';
  reviewNote?: string;
  reviewerId: string;
}): Promise<void> {
  const { userId, appealType, status, reviewNote, reviewerId } = params;

  // 检查用户通知设置（安全类通知通常默认开启）
  if (!await shouldSendNotification(userId, NotificationType.APPEAL_RESULT)) {
    return;
  }

  const appealLabels: Record<string, string> = {
    ban: '封禁',
    hidden: '内容隐藏',
    penalty: '处罚',
  };

  const typeLabel = appealLabels[appealType] || appealType;
  const result = status === 'approved' ? '已撤销' : '已被驳回';

  const notification: NotificationParams = {
    type: NotificationType.APPEAL_RESULT,
    title: `您的申诉${result}`,
    content: `您对${typeLabel}的申诉${result}${reviewNote ? '：' + reviewNote : ''}`,
    senderId: reviewerId,
    priority: NotificationPriority.HIGH,
  };

  sendNotificationToUser(userId, notification);
}


/**
 * 发送系统公告通知
 */
export async function notifySystemAnnouncement(params: {
  title: string;
  content: string;
  linkUrl?: string;
  senderId?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
}): Promise<void> {
  const { title, content, linkUrl, senderId, priority = NotificationPriority.NORMAL } = params;

  const users = await prisma.user.findMany({
    where: { deletedAt: null, isBanned: false },
    select: { id: true },
  });

  const notification: NotificationParams = {
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title,
    content,
    linkUrl,
    senderId,
    priority,
  };

  const userIds = users.map(u => u.id);
  sendNotificationToUsers(userIds, notification);
}


/**
 * 解析 @提及
 * 使用精确匹配：@符号前必须是空白字符、行首或特殊符号，后不能是字母数字下划线
 * 避免误匹配邮箱地址中的 @username
 */
export function parseMentions(content: string): string[] {
  // 精确匹配 @提及：
  // (?:^|[^\w]) - 前面是非单词字符或行首
  // @ - @ 符号
  // ([a-zA-Z0-9][a-zA-Z0-9._-]{1,37}[a-zA-Z0-9]|[a-zA-Z0-9]{2,38}) - 用户名 3-39 字符
  // (?![a-zA-Z0-9._-]) - 后面不是字母数字下划线
  const mentionRegex = /(?:^|[^\w])@([a-zA-Z0-9][a-zA-Z0-9._-]{1,37}[a-zA-Z0-9]|[a-zA-Z0-9]{2,38})(?![a-zA-Z0-9._-])/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1].toLowerCase();
    // 排除纯数字的用户名（可能是年份等）
    if (!/^\d+$/.test(username)) {
      mentions.push(username);
    }
  }

  return Array.from(new Set(mentions));
}


/**
 * 根据用户名列表获取用户 ID
 */
export async function getUserIdsByUsernames(usernames: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true },
  });
  return users.map(u => u.id);
}
