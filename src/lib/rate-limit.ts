/**
 * 速率限制工具
 * 使用 Redis 或内存存储实现令牌桶算法
 */

import { createHash } from 'crypto';
import { RATE_LIMITS } from './security-config';

/**
 * 内存存储配置
 */
const RATE_LIMIT_MAX_ENTRIES = parseInt(process.env.RATE_LIMIT_MAX_ENTRIES || '10000', 10);
const RATE_LIMIT_CLEANUP_INTERVAL = 60 * 1000; // 每 60 秒最多清理一次

// 内存存储（开发环境）
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
// 记录插入顺序（用于 LRU）
const insertionOrder: string[] = [];
// 上次清理时间
let lastCleanupTime = 0;

/**
 * LRU 淘汰：当超过容量时删除最旧的记录
 */
function evictIfNeeded(): void {
  if (rateLimitStore.size >= RATE_LIMIT_MAX_ENTRIES) {
    // 删除最旧的记录（插入顺序数组的前几个）
    const toDelete = Math.floor(RATE_LIMIT_MAX_ENTRIES * 0.1); // 删除 10%
    for (let i = 0; i < toDelete && insertionOrder.length > 0; i++) {
      const oldestKey = insertionOrder.shift();
      if (oldestKey) {
        rateLimitStore.delete(oldestKey);
      }
    }
  }
}

/**
 * 清理过期的记录（按需 + 间隔控制）
 * 优化：只在超过容量或间隔时间到达时清理
 */
function cleanup(): void {
  const now = Date.now();

  // 限制清理频率：每 RATE_LIMIT_CLEANUP_INTERVAL 毫秒最多清理一次
  if (now - lastCleanupTime < RATE_LIMIT_CLEANUP_INTERVAL) {
    return;
  }

  lastCleanupTime = now;

  // 批量清理过期记录
  const expiredKeys: string[] = [];
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      expiredKeys.push(key);
    }
  }

  // 批量删除
  for (const key of expiredKeys) {
    rateLimitStore.delete(key);
    const idx = insertionOrder.indexOf(key);
    if (idx !== -1) {
      insertionOrder.splice(idx, 1);
    }
  }
}

/**
 * 记录插入顺序（用于 LRU）
 */
function recordInsertion(key: string): void {
  const idx = insertionOrder.indexOf(key);
  if (idx !== -1) {
    // 已存在，移到末尾
    insertionOrder.splice(idx, 1);
  }
  insertionOrder.push(key);
}

/**
 * IP 地址格式验证
 */
function isValidIp(ip: string): boolean {
  // IPv4 验证
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 验证（简化）
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

/**
 * 获取可信的代理 IP（用于 X-Forwarded-For 链）
 */
function getTrustedProxies(request: Request): string[] {
  const trustedProxies = process.env.TRUSTED_PROXIES?.split(',').map(p => p.trim()) || [];
  return trustedProxies;
}

/**
 * 获取客户端标识符
 * 安全性：仅在配置了可信代理时使用 X-Forwarded-For
 */
export function getClientId(request: Request): string {
  const trustedProxies = getTrustedProxies(request);

  // 安全修复：未配置 TRUSTED_PROXIES 时，X-Forwarded-For / X-Real-IP /
  // CF-Connecting-IP 等请求头均可被客户端任意伪造，不能作为限流身份标识。
  // 此时直接回退到统一标识，防止攻击者通过轮换伪造头绕过限流。
  if (trustedProxies.length === 0) {
    return 'unknown';
  }

  // 仅在配置了可信代理（部署于反向代理之后）时，才信任代理注入的请求头。

  // 1) X-Forwarded-For：标准格式 client, proxy1, proxy2, ...（客户端在最左，最近的代理在最右）
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(ip => ip);
    // 从右往左跳过可信代理，第一个非可信代理即真实客户端 IP
    for (let i = ips.length - 1; i >= 0; i--) {
      if (!trustedProxies.includes(ips[i]) && isValidIp(ips[i])) {
        return ips[i];
      }
    }
  }

  // 2) X-Real-IP（由受信反向代理设置）
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    const trimmedIp = realIp.trim();
    if (isValidIp(trimmedIp)) {
      return trimmedIp;
    }
  }

  // 3) CF-Connecting-IP（由 Cloudflare 设置）
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    const trimmedIp = cfIp.trim();
    if (isValidIp(trimmedIp)) {
      return trimmedIp;
    }
  }

  // 回退到统一标识
  return 'unknown';
}

/**
 * 速率限制结果
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Redis 客户端（懒加载）
 */
let redisClient: import('ioredis').Redis | null = null;
let redisInitPromise: Promise<import('ioredis').Redis | null> | null = null;

/**
 * 初始化 Redis 客户端
 */
async function initRedisClient(): Promise<import('ioredis').Redis | null> {
  if (redisClient) return redisClient;
  if (redisInitPromise) return redisInitPromise;

  if (!process.env.REDIS_URL) {
    return null;
  }

  redisInitPromise = (async () => {
    try {
      const { default: Redis } = await import('ioredis');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      await client.connect();
      redisClient = client;
      console.log('[RateLimit] Redis connected successfully');
      return client;
    } catch (error) {
      console.error('[RateLimit] Redis connection failed:', error);
      redisInitPromise = null;
      return null;
    }
  })();

  return redisInitPromise;
}

/**
 * 使用 Redis 检查速率限制
 */
async function checkRateLimitWithRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const redis = await initRedisClient();
  if (!redis) return null;

  const now = Date.now();
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;

  try {
    const multi = redis.multi();
    multi.incr(windowKey);
    multi.pexpire(windowKey, windowMs);

    const results = await multi.exec();
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[0][1] as number;
    const resetAt = Math.floor(now / windowMs) * windowMs + windowMs;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetAt,
      retryAfter: count > limit ? Math.ceil(windowMs / 1000) : undefined,
    };
  } catch (error) {
    console.error('[RateLimit] Redis check failed:', error);
    return null;
  }
}

/**
 * 使用内存存储检查速率限制
 */
function checkRateLimitWithMemory(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || record.resetAt < now) {
    // 新窗口
    // 检查容量，必要时淘汰旧记录
    evictIfNeeded();

    const resetAt = now + windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetAt,
    });
    recordInsertion(key);

    return {
      allowed: true,
      remaining: limit - 1,
      limit,
      resetAt,
    };
  }

  // 当前窗口
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: record.resetAt,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: limit - record.count,
    limit,
    resetAt: record.resetAt,
  };
}

/**
 * 对账号/邮箱维度主体做不可逆哈希，避免把明文 PII 写入限流键。
 */
function hashSubject(subject: string): string {
  return createHash('sha256').update(subject).digest('hex').slice(0, 24);
}

/**
 * 检查速率限制
 * 优先使用 Redis，Redis 不可用时回退到内存存储。
 * @param subject 可选的主体标识（账号/邮箱，调用方需先小写归一），
 *                用于在 IP 维度之外叠加账号维度限流，防止分布式单账号爆破。
 */
export async function checkRateLimit(
  request: Request,
  type: keyof typeof RATE_LIMITS = 'default',
  subject?: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type];
  const clientId = getClientId(request);
  const key = subject
    ? `${type}:${clientId}:${hashSubject(subject)}`
    : `${type}:${clientId}`;

  // 优先尝试 Redis
  const redisResult = await checkRateLimitWithRedis(key, config.max, config.windowMs);
  if (redisResult) {
    return redisResult;
  }

  // 回退到内存存储
  cleanup();
  return checkRateLimitWithMemory(key, config.max, config.windowMs);
}

/**
 * 创建速率限制响应头
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toString());

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return headers;
}

/**
 * 速率限制中间件包装器
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T,
  type: keyof typeof RATE_LIMITS = 'default'
): (...args: Parameters<T>) => Promise<Response> {
  return async (...args: Parameters<T>): Promise<Response> => {
    const request = args[0] as Request;

    const result = await checkRateLimit(request, type);
    const headers = createRateLimitHeaders(result);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `请求过于频繁，请 ${result.retryAfter} 秒后重试`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers),
          },
        }
      );
    }

    const response = await handler(...args);

    // 如果响应是 NextResponse，添加速率限制头
    if (response instanceof Response) {
      const newHeaders = new Headers(response.headers);
      headers.forEach((value, key) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  };
}
