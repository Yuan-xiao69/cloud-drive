/**
 * AsyncJob 消费者 — 轮询数据库队列并执行任务
 *
 * 开发环境：与 Next.js 同进程运行（setInterval）
 * 生产环境：可拆分为独立进程
 *
 * 关键设计：
 * - 幂等性保护：使用 status='pending' 作为 CAS 条件，防止重复执行
 * - 指数退避重试：1s → 4s → 16s → 64s（base=4）
 * - 错误隔离：单个任务失败不影响其他任务
 */

import { prisma } from '@/lib/prisma'
import type { JobType } from './async-job'
import { listeners } from './listeners'

// ============================================================
// 任务处理器注册表
// ============================================================

/** 任务处理器函数签名 */
type JobHandler = (payload: Record<string, unknown>) => Promise<void>

/** 全局处理器映射表（自定义覆盖用，优先级高于内置 listeners） */
const handlers = new Map<string, JobHandler>()

/**
 * 注册或覆盖任务处理器。
 * 各业务模块在初始化时调用此函数注册自定义处理器。
 * 自定义处理器优先级高于内置 listeners。
 *
 * 使用示例：
 *   import { registerHandler } from '@/lib/events/consumer'
 *   registerHandler('send_notification', async (payload) => { ... })
 */
export function registerHandler(type: JobType, handler: JobHandler): void {
  if (handlers.has(type)) {
    console.warn(`[AsyncJob Consumer] 处理器覆盖: ${type}`)
  }
  handlers.set(type, handler)
}

/**
 * 查找任务处理器：优先使用自定义注册的 handler，
 * 其次回退到内置 listeners 映射表。
 */
function resolveHandler(type: string): JobHandler | undefined {
  return handlers.get(type) ?? listeners[type]
}

// ============================================================
// 指数退避计算
// ============================================================

/**
 * 计算指数退避延迟（毫秒）
 * 重试 0 → 1s, 重试 1 → 4s, 重试 2 → 16s, 重试 3 → 64s
 */
function exponentialBackoff(retryCount: number): number {
  return Math.pow(4, retryCount) * 1000
}

// ============================================================
// 任务处理主循环
// ============================================================

/**
 * 处理一批待执行的任务。
 * @param batchSize 每批最多处理的任务数，默认 10
 * @returns 实际处理的任务数
 */
export async function processJobs(batchSize = 10): Promise<number> {
  const now = new Date()

  // 查询待处理任务：status=pending 且 runAt 已到
  const jobs = await prisma.asyncJob.findMany({
    where: {
      status: 'pending',
      runAt: { lte: now },
    },
    orderBy: { runAt: 'asc' },
    take: batchSize,
  })

  if (jobs.length === 0) return 0

  for (const job of jobs) {
    // 幂等性保护：CAS 更新 status pending → processing
    // 仅当 status 仍为 pending 时才更新成功
    const updateResult = await prisma.asyncJob.updateMany({
      where: {
        id: job.id,
        status: 'pending', // CAS 条件
      },
      data: {
        status: 'processing',
      },
    })

    // 如果 updateMany.count === 0，说明被其他消费者抢先处理了，跳过
    if (updateResult.count === 0) continue

    const handler = resolveHandler(job.type)

    if (!handler) {
      // 没有注册处理器，标记为 failed
      console.warn(`[AsyncJob Consumer] 未知任务类型: ${job.type}`)
      await prisma.asyncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: `未注册的任务类型: ${job.type}`,
        },
      })
      continue
    }

    try {
      // 执行任务处理器
      await handler(job.payload as Record<string, unknown>)

      // 成功 → 标记为 done
      await prisma.asyncJob.update({
        where: { id: job.id },
        data: { status: 'done' },
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const nextRetryCount = job.retryCount + 1

      if (nextRetryCount < job.maxRetries) {
        // 还有重试次数 → 计算退避延迟，重置为 pending
        const backoffMs = exponentialBackoff(nextRetryCount)
        const nextRunAt = new Date(Date.now() + backoffMs)

        await prisma.asyncJob.update({
          where: { id: job.id },
          data: {
            status: 'pending',
            retryCount: nextRetryCount,
            runAt: nextRunAt,
            error: errorMsg,
          },
        })

        console.warn(
          `[AsyncJob Consumer] 任务失败（重试 ${nextRetryCount}/${job.maxRetries}）: ${job.type}`,
          `退避 ${backoffMs}ms，下次执行: ${nextRunAt.toISOString()}`,
        )
      } else {
        // 重试次数耗尽 → 标记为 failed
        await prisma.asyncJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            retryCount: nextRetryCount,
            error: errorMsg,
          },
        })

        console.error(
          `[AsyncJob Consumer] 任务最终失败（已重试 ${nextRetryCount} 次）: ${job.type}`,
          errorMsg,
        )
      }
    }
  }

  return jobs.length
}

// ============================================================
// 消费者生命周期管理
// ============================================================

let consumerInterval: ReturnType<typeof setInterval> | null = null

/**
 * 启动后台轮询消费者。
 * 在开发环境与 Next.js 同进程运行。
 * 多次调用安全（已运行时忽略）。
 *
 * @param intervalMs 轮询间隔（毫秒），默认 2000
 */
export function startConsumer(intervalMs = 2000): void {
  if (consumerInterval) {
    console.warn('[AsyncJob Consumer] 消费者已在运行，忽略重复启动')
    return
  }

  console.log(`[AsyncJob Consumer] 启动轮询消费者，间隔 ${intervalMs}ms`)
  consumerInterval = setInterval(async () => {
    try {
      await processJobs()
    } catch (err) {
      console.error(
        '[AsyncJob Consumer] 轮询异常:',
        err instanceof Error ? err.message : String(err),
      )
    }
  }, intervalMs)
}

/**
 * 停止后台轮询消费者。
 * 安全停止，可多次调用。
 */
export function stopConsumer(): void {
  if (consumerInterval) {
    clearInterval(consumerInterval)
    consumerInterval = null
    console.log('[AsyncJob Consumer] 消费者已停止')
  }
}
