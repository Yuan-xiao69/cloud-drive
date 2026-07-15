/**
 * 事件监听器统一入口
 *
 * 所有 AsyncJob 任务类型的处理器映射表。
 * 消费者从 listeners 中按 job.type 查找对应处理器。
 *
 * 添加新任务类型：
 * 1. 创建 src/lib/events/listeners/<name>.listener.ts
 * 2. 导出 handler 函数
 * 3. 在此文件的 listeners 对象中注册
 */

import type { JobType } from '../async-job'
import { handleSendNotification } from './notification.listener'
import { handleRecordAudit } from './audit-log.listener'
import { handleCreateVersion } from './file-version.listener'
import { handleFireWebhook } from './webhook.listener'

/** 任务处理器函数签名 */
export type ListenerHandler = (payload: Record<string, unknown>) => Promise<void>

/**
 * 内置任务处理器映射表。
 * key 对应 AsyncJob.type，value 为处理函数。
 * 消费者启动时自动注册，无需手动调用 registerHandler。
 */
export const listeners: Record<string, ListenerHandler> = {
  send_notification: handleSendNotification,
  record_audit: handleRecordAudit,
  create_version: handleCreateVersion,
  fire_webhook: handleFireWebhook,
} satisfies Record<JobType | string, ListenerHandler>

// 单独导出各处理器，方便外部直接调用或测试
export { handleSendNotification } from './notification.listener'
export { handleRecordAudit } from './audit-log.listener'
export { handleCreateVersion } from './file-version.listener'
export { handleFireWebhook } from './webhook.listener'
