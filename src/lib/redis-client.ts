/**
 * 统一 Redis 客户端模块
 * 提供单例 Redis 连接，全项目统一引用
 * 替代各模块中的独立 getRedisClient() 实现
 */

interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  ping(): Promise<string>;
  connect(): Promise<void>;
  quit(): Promise<void>;
}

let redisClient: RedisClientInterface | null = null;
let initFailed = false;

export async function getRedisClient(): Promise<RedisClientInterface | null> {
  if (redisClient) return redisClient;
  if (initFailed) return null;

  try {
    const { default: Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
    });
    await client.connect();
    redisClient = client as unknown as RedisClientInterface;
    return redisClient;
  } catch {
    initFailed = true;
    console.warn('[Redis] 不可用，相关功能将降级');
    return null;
  }
}

export type { RedisClientInterface };
