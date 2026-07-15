/**
 * lib/events — 异步事件系统统一入口
 *
 * 基于数据库轮询的异步任务队列，仿 GitHub 模式。
 * 业务代码通过 AsyncJob.enqueue() 提交任务后立即返回，
 * 后台消费者 startConsumer() 轮询并执行。
 *
 * 使用示例：
 *   import { AsyncJob, initEventSystem } from '@/lib/events'
 *
 *   // 入队任务（不等待执行）
 *   await AsyncJob.enqueue('send_notification', { userId: 'xxx' })
 *
 *   // 启动事件系统（通常放在应用启动入口）
 *   initEventSystem()
 */

// 核心模块
export { AsyncJob } from './async-job'
export type { JobType, EnqueueOptions } from './async-job'

// 消费者
export {
  processJobs,
  startConsumer,
  stopConsumer,
  registerHandler,
} from './consumer'

// 生命周期管理
export {
  initEventSystem,
  shutdownEventSystem,
  isEventSystemRunning,
} from './startup'

// 内置监听器（可直接导入用于测试或手动调用）
export {
  listeners,
  handleSendNotification,
  handleRecordAudit,
  handleCreateVersion,
} from './listeners'
export type { ListenerHandler } from './listeners'
