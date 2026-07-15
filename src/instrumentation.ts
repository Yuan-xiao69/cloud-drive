/**
 * Next.js 服务端启动钩子
 *
 * 在应用启动时初始化 AsyncJob 后台消费者，
 * 开始处理通知发送、审计日志、Webhook 等异步任务队列。
 */
export async function register() {
  // 仅在服务端启动消费者
  const { initEventSystem } = await import('@/lib/events');
  initEventSystem(2000);
  console.log('[Instrumentation] AsyncJob 消费者已启动');
}
