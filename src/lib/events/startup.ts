/**
 * 事件系统启动模块
 *
 * 集中管理 AsyncJob 消费者的生命周期。
 * 在应用启动时调用 initEventSystem() 完成初始化。
 *
 * Next.js 没有单一启动入口，建议在以下位置之一调用：
 * - src/app/layout.tsx 的根布局中（客户端兼容需注意）
 * - src/instrumentation.ts（Next.js 14 实验性功能，服务端单次执行）
 * - 各 API Route 的懒初始化（首次请求时启动，适合开发环境）
 *
 * 当前采用懒初始化策略：首次调用 initEventSystem() 时启动，
 * 多次调用安全（内部防重复启动）。
 */

import { startConsumer, stopConsumer } from './consumer'

/** 是否已初始化 */
let initialized = false

/**
 * 初始化事件系统。
 * 启动后台轮询消费者，开始处理 AsyncJob 队列中的任务。
 *
 * 幂等调用：多次调用仅首次生效。
 *
 * @param intervalMs 轮询间隔（毫秒），默认 2000
 */
export function initEventSystem(intervalMs = 2000): void {
  if (initialized) {
    console.log('[EventSystem] 事件系统已初始化，跳过重复启动')
    return
  }

  console.log('[EventSystem] 正在初始化事件系统...')
  startConsumer(intervalMs)
  initialized = true
  console.log('[EventSystem] 事件系统初始化完成')
}

/**
 * 关闭事件系统。
 * 停止后台轮询消费者，通常在应用关闭或测试清理时调用。
 */
export function shutdownEventSystem(): void {
  if (!initialized) {
    return
  }

  stopConsumer()
  initialized = false
  console.log('[EventSystem] 事件系统已关闭')
}

/**
 * 获取事件系统运行状态
 */
export function isEventSystemRunning(): boolean {
  return initialized
}
