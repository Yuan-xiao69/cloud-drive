/**
 * 邮件队列处理器
 * 运行方式: node dist/scripts/process-email-queue.js
 * 
 * 建议使用 pm2 或 systemd 管理此进程
 */

import { processEmailQueue } from '../lib/redis-queue';

console.log('========================================');
console.log('📬 邮件队列处理器');
console.log('========================================');
console.log('开始时间:', new Date().toISOString());
console.log('');

// 捕获未处理的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 优雅退出
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭...');
  process.exit(0);
});

// 启动处理器
processEmailQueue().catch((error) => {
  console.error('队列处理器启动失败:', error);
  process.exit(1);
});
