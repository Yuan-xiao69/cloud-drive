/**
 * 审计日志监听器 — 处理 record_audit 异步任务
 *
 * 根据操作类型自动分流到正确的日志表：
 * - 管理员操作（封禁/解封/改角色/处理举报等）→ AdminAuditLog
 * - 用户操作（上传/下载/创建/删除/Star 等）→ UserActivityLog
 */

import { prisma } from '@/lib/prisma'

/** 审计日志任务负载类型 */
interface AuditLogPayload {
  /** 操作类型，如 upload、ban_user、create_repo 等 */
  action: string
  /** 执行操作的用户 ID */
  userId: string
  /** 被操作的目标 ID（可选） */
  targetId?: string
  /** 被操作的目标类型：file、repo、user、discussion 等 */
  targetType?: string
  /** 目标名称（可选，用于展示） */
  targetName?: string
  /** 附加详情 */
  details?: Record<string, unknown>
  /** 客户端 IP */
  ipAddress?: string
  /** User-Agent */
  userAgent?: string
}

/**
 * 管理员操作前缀集合。
 * 匹配这些前缀的 action 将写入 AdminAuditLog。
 */
const ADMIN_ACTION_PREFIXES = [
  'ban_',
  'unban_',
  'change_',
  'handle_',
  'penalty_',
  'appeal_',
  'content_',
  'system_',
  'announcement_',
  'config_',
  'ip_',
  'blacklist_',
] as const

/**
 * 判断是否为管理员操作。
 * 管理员操作的 userId 字段含义为 adminId（操作执行者），
 * 普通用户操作的 userId 字段含义为执行操作的用户本人。
 */
function isAdminAction(action: string): boolean {
  // 精确匹配明确的管理员操作
  const exactAdminActions = new Set([
    'ban_user',
    'unban_user',
    'change_role',
    'handle_report',
    'penalty_applied',
    'penalty_removed',
    'appeal_reviewed',
    'content_hidden',
    'content_restored',
    'system_config_update',
    'announcement_create',
    'announcement_update',
    'ip_blacklist_add',
    'ip_blacklist_remove',
    'security_event_resolve',
  ])

  if (exactAdminActions.has(action)) return true

  // 前缀匹配
  return ADMIN_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix))
}

/**
 * 处理审计日志记录任务。
 * 不抛出错误——所有异常内部捕获并记录日志。
 */
export async function handleRecordAudit(
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const p = payload as unknown as AuditLogPayload

    // 校验必填字段
    if (!p.userId || !p.action) {
      console.warn('[AuditLog Listener] 缺少必填字段 userId 或 action，跳过', {
        userId: p.userId,
        action: p.action,
      })
      return
    }

    if (isAdminAction(p.action)) {
      // 管理员操作 → AdminAuditLog
      // userId 在此上下文中表示执行操作的管理员 ID
      await prisma.adminAuditLog.create({
        data: {
          adminId: p.userId,
          userId: (p.details?.targetUserId as string) || null,
          actionType: p.action,
          targetType: p.targetType || null,
          targetId: p.targetId || null,
          details: p.details ? JSON.parse(JSON.stringify(p.details)) : null,
          ipAddress: p.ipAddress || null,
        },
      })
    } else {
      // 普通用户操作 → UserActivityLog
      await prisma.userActivityLog.create({
        data: {
          userId: p.userId,
          action: p.action,
          targetType: p.targetType || 'system',
          targetId: p.targetId || '',
          targetName: p.targetName || null,
          details: p.details ? JSON.parse(JSON.stringify(p.details)) : null,
          ipAddress: p.ipAddress || null,
          userAgent: p.userAgent || undefined,
        },
      })
    }
  } catch (error) {
    console.error('[AuditLog Listener] 记录审计日志失败:', {
      action: payload.action,
      userId: payload.userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
