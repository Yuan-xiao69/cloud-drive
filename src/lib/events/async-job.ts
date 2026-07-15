/**
 * AsyncJob — 异步任务入队模块
 *
 * 设计思路：仿 GitHub 模式，使用数据库表作为任务队列，
 * 业务代码调用 enqueue() 后立即返回，不等待任务执行。
 * 后台消费者轮询 pending 任务并逐个处理。
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ============================================================
// 类型定义
// ============================================================

/** 支持的任务类型 */
export type JobType =
  | 'send_notification'
  | 'record_audit'
  | 'fire_webhook'
  | 'create_version'

/** 入队选项 */
export interface EnqueueOptions {
  /** 延迟执行（毫秒），默认 0 立即执行 */
  delay?: number
  /** 最大重试次数，默认 3 */
  maxRetries?: number
}

// ============================================================
// AsyncJob 类
// ============================================================

export class AsyncJob {
  /**
   * 将异步任务写入数据库队列。
   * 此方法不等待任务执行，调用后立即返回。
   *
   * 使用示例：
   *   await AsyncJob.enqueue('send_notification', { userId: 'xxx', title: '...' })
   *   await AsyncJob.enqueue('record_audit', { action: 'upload', userId: 'xxx' }, { delay: 5000 })
   */
  static async enqueue(
    type: JobType,
    payload: Record<string, unknown>,
    options?: EnqueueOptions,
  ): Promise<void> {
    const delay = options?.delay ?? 0
    const maxRetries = options?.maxRetries ?? 3

    // 计算计划执行时间：当前时间 + 延迟
    const runAt = new Date(Date.now() + delay)

    try {
      await prisma.asyncJob.create({
        data: {
          type,
          payload: payload as Prisma.InputJsonValue,
          status: 'pending',
          runAt,
          retryCount: 0,
          maxRetries,
        },
      })
    } catch (error) {
      // 入队失败不应阻断主流程，仅记录日志
      console.error('[AsyncJob] 入队失败:', {
        type,
        payloadKeys: Object.keys(payload),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
