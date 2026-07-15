/**
 * 通知监听器 — 处理 send_notification 异步任务
 *
 * 从 AsyncJob 队列消费通知任务，持久化到数据库并通过 SSE 推送。
 * 复用现有 notification-service 的 sendDirectNotification 函数，
 * 确保通知持久化和 SSE 推送逻辑统一。
 *
 * 支持订阅者机制：
 * - 始终通知内容作者（userId）
 * - 额外查询 Subscriber 表，通知所有显式订阅该目标的用户
 */

import { prisma } from '@/lib/prisma'
import { sendDirectNotification } from '@/lib/notification-service'

/** 通知任务负载类型 */
interface SendNotificationPayload {
  /** 目标用户 ID（必填，通常为内容作者） */
  userId: string
  /** 通知类型，如 new_comment、star_repo 等 */
  type: string
  /** 操作者 ID（可选） */
  actorId?: string
  /** 关联仓库 ID（可选） */
  repoId?: string
  /** 关联 Issue ID（可选） */
  issueId?: string
  /** 通知标题 */
  title?: string
  /** 通知内容（如未提供则根据 type 自动生成） */
  content?: string
  /** 链接地址 */
  linkUrl?: string
  /** 优先级：urgent/high/normal/low，默认 normal */
  priority?: string
  /** 目标类型（用于查询订阅者）：issue | pull_request | discussion | repository */
  targetType?: string
  /** 目标 ID（用于查询订阅者） */
  targetId?: string
}

/**
 * 处理发送通知任务。
 * 通知策略：始终通知内容作者 + 额外通知所有显式订阅该目标的用户。
 * 自动去重：同一个用户多次匹配只发送一次通知。
 *
 * 不抛出错误——所有异常内部捕获并记录日志，
 * 以保证单个通知失败不影响队列中其他任务。
 */
export async function handleSendNotification(
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const p = payload as unknown as SendNotificationPayload

    // 校验必填字段
    if (!p.userId || !p.type) {
      console.warn('[Notification Listener] 缺少必填字段 userId 或 type，跳过', {
        userId: p.userId,
        type: p.type,
      })
      return
    }

    // 生成默认标题和内容
    const title = p.title || generateTitle(p.type)
    const content = p.content || `${title}`

    // 收集需要通知的用户集合（用 Set 去重）
    const notifyUserIds = new Set<string>()
    // 始终通知内容作者（userId）
    notifyUserIds.add(p.userId)

    // 查询显式订阅者（仅当提供了 targetType 和 targetId 时）
    if (p.targetType && p.targetId) {
      try {
        const subscribers = await prisma.subscriber.findMany({
          where: {
            targetType: p.targetType,
            targetId: p.targetId,
          },
          select: { userId: true },
        })
        for (const sub of subscribers) {
          notifyUserIds.add(sub.userId)
        }
      } catch (err) {
        // Subscriber 表可能尚未迁移，静默降级，不影响主流程
        console.warn('[Notification Listener] 查询订阅者失败（可能表未迁移）:', {
          targetType: p.targetType,
          targetId: p.targetId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // 向每个目标用户发送通知
    for (const uid of notifyUserIds) {
      try {
        await sendDirectNotification(uid, {
          type: p.type,
          title,
          content,
          linkUrl: p.linkUrl,
          senderId: p.actorId,
          priority: (p.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
        })
      } catch (innerErr) {
        // 单个用户通知失败不阻塞其他用户
        console.error('[Notification Listener] 向用户发送通知失败:', {
          userId: uid,
          type: p.type,
          error: innerErr instanceof Error ? innerErr.message : String(innerErr),
        })
      }
    }
  } catch (error) {
    console.error('[Notification Listener] 发送通知失败:', {
      userId: payload.userId,
      type: payload.type,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * 根据通知类型生成默认标题
 */
function generateTitle(type: string): string {
  const titleMap: Record<string, string> = {
    new_comment: '有新评论',
    reply_comment: '有人回复您',
    comment_accepted: '您的评论被采纳',
    new_discussion: '新讨论',
    discussion_reply: '讨论有新回复',
    star_repo: '仓库被收藏',
    new_fork: '仓库被 Fork',
    watch_repo: '仓库被关注',
    mention: '有人提到了您',
    login_alert: '安全登录提醒',
    system_announcement: '系统公告',
    penalty_applied: '您受到了处罚',
    appeal_result: '申诉结果通知',
  }
  return titleMap[type] || '新通知'
}
