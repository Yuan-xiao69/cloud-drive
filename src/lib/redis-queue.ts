/**
 * Redis 队列工具
 * 基于 Redis List 实现简单的异步任务队列
 */

import { prisma } from '@/lib/prisma';

// 队列名称
export const EMAIL_QUEUE = 'email_queue';
export const EMAIL_JOB_STATUS_PREFIX = 'email_job:';

// 默认重试配置
const DEFAULT_RETRY = 3;
const DEFAULT_RETRY_DELAY = 5000; // 5秒

/**
 * 邮件任务类型
 */
export interface EmailJob {
  id: string;
  to: string;
  code: string;
  type: 'verification' | 'welcome' | 'notification';
  retryCount: number;
  createdAt: string;
}

/**
 * Redis 客户端接口（仅包含需要的方法）
 */
interface RedisClientInterface {
  lpush(key: string, value: string): Promise<number>;
  brpop(key: string, timeout: number): Promise<[string, string] | null>;
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  get(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;
}

/**
 * 获取 Redis 客户端（延迟加载避免 SSR 问题）
 */
let redisClient: RedisClientInterface | null = null;

async function getRedisClient(): Promise<RedisClientInterface> {
  if (redisClient) return redisClient;

  // 优先复用项目统一 Redis 客户端
  try {
    const { getRedisClient: getSharedRedis } = await import('./redis-client');
    const shared = await getSharedRedis();
    if (shared) {
      redisClient = shared as unknown as RedisClientInterface;
      return redisClient;
    }
  } catch { /* 降级到独立连接 */ }

  const { default: Redis } = await import('ioredis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });

  await client.connect();

  redisClient = client as unknown as RedisClientInterface;

  return redisClient;
}

/**
 * 将任务添加到队列
 */
export async function enqueueEmailJob(job: Omit<EmailJob, 'id' | 'retryCount' | 'createdAt'>): Promise<string> {
  const client = await getRedisClient();
  const jobId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  const fullJob: EmailJob = {
    ...job,
    id: jobId,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };
  
  // 添加到队列
  await client.lpush(EMAIL_QUEUE, JSON.stringify(fullJob));
  
  // 存储任务状态
  await client.setex(
    `${EMAIL_JOB_STATUS_PREFIX}${jobId}`,
    3600, // 1小时后自动清理
    JSON.stringify({ status: 'pending', ...fullJob })
  );
  
  console.log(`📬 邮件任务已加入队列: ${jobId}`);
  
  return jobId;
}

/**
 * 从队列获取任务（阻塞）
 */
export async function dequeueEmailJob(timeout = 5): Promise<EmailJob | null> {
  const client = await getRedisClient();
  
  try {
    // BRPOP 是阻塞版本，timeout 秒后返回 null
    const result = await client.brpop(EMAIL_QUEUE, timeout);
    
    if (!result) return null;
    
    const [, jobStr] = result;
    return JSON.parse(jobStr) as EmailJob;
  } catch (error) {
    console.error('队列获取失败:', error);
    return null;
  }
}

/**
 * 更新任务状态
 */
export async function updateJobStatus(jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed', error?: string) {
  const client = await getRedisClient();
  
  const key = `${EMAIL_JOB_STATUS_PREFIX}${jobId}`;
  const data = await client.get(key);
  
  if (data) {
    const job = JSON.parse(data);
    await client.setex(key, 3600, JSON.stringify({
      ...job,
      status,
      error,
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * 获取任务状态
 */
export async function getJobStatus(jobId: string): Promise<{ status: string; error?: string } | null> {
  const client = await getRedisClient();
  const data = await client.get(`${EMAIL_JOB_STATUS_PREFIX}${jobId}`);
  
  if (!data) return null;
  
  const job = JSON.parse(data);
  return { status: job.status, error: job.error };
}

/**
 * 邮件队列处理函数
 */
export async function processEmailQueue() {
  console.log('🚀 邮件队列处理器已启动');
  
  while (true) {
    try {
      const job = await dequeueEmailJob(5);
      
      if (!job) continue;
      
      console.log(`📧 处理邮件任务: ${job.id} -> ${job.to}`);
      await updateJobStatus(job.id, 'processing');
      
      // 动态导入邮件服务避免循环依赖
      const { sendVerificationCode } = await import('./email-service');
      const result = await sendVerificationCode(job.to, job.code);
      
      if (result.success) {
        await updateJobStatus(job.id, 'completed');
        console.log(`✅ 邮件发送成功: ${job.id}`);
      } else {
        // 重试逻辑
        if (job.retryCount < DEFAULT_RETRY) {
          console.log(`⚠️ 邮件发送失败，准备重试 (${job.retryCount + 1}/${DEFAULT_RETRY}): ${result.error}`);
          
          // 延迟后重新入队
          setTimeout(async () => {
            const client = await getRedisClient();
            const retryJob = { ...job, retryCount: job.retryCount + 1 };
            await client.lpush(EMAIL_QUEUE, JSON.stringify(retryJob));
          }, DEFAULT_RETRY_DELAY);
          
          await updateJobStatus(job.id, 'pending', result.error);
        } else {
          console.log(`❌ 邮件发送最终失败: ${job.id} - ${result.error}`);
          await updateJobStatus(job.id, 'failed', result.error);
        }
      }
    } catch (error) {
      console.error('处理邮件任务时出错:', error);
      // 出错后等待一段时间再继续
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

/**
 * 获取队列长度（调试用）
 */
export async function getQueueLength(): Promise<number> {
  try {
    const client = await getRedisClient();
    return await client.llen(EMAIL_QUEUE);
  } catch {
    return -1;
  }
}
