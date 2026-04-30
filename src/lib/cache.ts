/**
 * Redis 缓存工具
 * 提供统一的缓存接口，支持内存缓存和 Redis 缓存
 */

interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(...keyValues: string[]): Promise<string>;
  expireat(key: string, timestamp: number): Promise<number>;
  ttl(key: string): Promise<number>;
  // SCAN 命令（仅 Redis 支持）
  scan?(cursor: string, options: { MATCH: string; COUNT: number }): Promise<[string, string[]]>;
}

let redisClient: RedisClientInterface | null = null;

async function getRedisClient(): Promise<RedisClientInterface> {
  if (redisClient) return redisClient;

  try {
    const { default: Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    await client.connect();
    redisClient = client as unknown as RedisClientInterface;
    return redisClient;
  } catch {
    console.warn('[Cache] Redis not available, using memory fallback');
    return createMemoryCache();
  }
}

// 内存缓存（备用）
const memoryCache = new Map<string, { value: string; expiresAt: number | null }>();

function createMemoryCache(): RedisClientInterface {
  return {
    async get(key: string): Promise<string | null> {
      const entry = memoryCache.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return null;
      }
      return entry.value;
    },

    async set(key: string, value: string, mode?: string, ttl?: number): Promise<string | null> {
      const expiresAt = mode === 'EX' && ttl ? Date.now() + ttl * 1000 : null;
      memoryCache.set(key, { value, expiresAt });
      return 'OK';
    },

    async del(key: string): Promise<number> {
      return memoryCache.delete(key) ? 1 : 0;
    },

    async exists(key: string): Promise<number> {
      const entry = memoryCache.get(key);
      if (!entry) return 0;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return 0;
      }
      return 1;
    },

    async expire(key: string, seconds: number): Promise<number> {
      const entry = memoryCache.get(key);
      if (!entry) return 0;
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    },

    async incr(key: string): Promise<number> {
      const entry = memoryCache.get(key);
      const value = entry ? parseInt(entry.value, 10) + 1 : 1;
      memoryCache.set(key, { value: String(value), expiresAt: null });
      return value;
    },

    async decr(key: string): Promise<number> {
      const entry = memoryCache.get(key);
      const value = entry ? parseInt(entry.value, 10) - 1 : -1;
      memoryCache.set(key, { value: String(value), expiresAt: null });
      return value;
    },

    async mget(...keys: string[]): Promise<(string | null)[]> {
      return keys.map(key => {
        const entry = memoryCache.get(key);
        if (!entry) return null;
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          memoryCache.delete(key);
          return null;
        }
        return entry.value;
      });
    },

    async mset(...keyValues: string[]): Promise<string> {
      for (let i = 0; i < keyValues.length; i += 2) {
        memoryCache.set(keyValues[i], { value: keyValues[i + 1], expiresAt: null });
      }
      return 'OK';
    },

    async expireat(key: string, timestamp: number): Promise<number> {
      const entry = memoryCache.get(key);
      if (!entry) return 0;
      entry.expiresAt = timestamp * 1000;
      return 1;
    },

    async ttl(key: string): Promise<number> {
      const entry = memoryCache.get(key);
      if (!entry) return -2;
      if (!entry.expiresAt) return -1;
      return Math.floor((entry.expiresAt - Date.now()) / 1000);
    },
  };
}


/**
 * 缓存配置
 */
export interface CacheOptions {
  /** 缓存键 */
  key: string;
  /** 缓存值 */
  value: unknown;
  /** 过期时间（秒），0 = 不过期 */
  ttl?: number;
  /** 是否启用压缩 */
  compress?: boolean;
}

/**
 * 缓存结果
 */
export interface CacheResult<T> {
  hit: boolean;
  data?: T;
}


/**
 * 获取缓存
 */
export async function getCache<T>(key: string): Promise<CacheResult<T>> {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);

    if (!data) {
      return { hit: false };
    }

    const parsed = JSON.parse(data) as T;
    return { hit: true, data: parsed };
  } catch {
    return { hit: false };
  }
}


/**
 * 设置缓存
 */
export async function setCache<T>(options: CacheOptions): Promise<void> {
  const { key, value, ttl = 3600 } = options;

  try {
    const client = await getRedisClient();
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (stringifyError) {
      console.error('[Cache] JSON serialization failed:', stringifyError);
      return;
    }

    if (ttl > 0) {
      await client.set(key, serialized, 'EX', ttl);
    } else {
      await client.set(key, serialized);
    }
  } catch (error) {
    console.error('[Cache] Set failed:', error);
  }
}


/**
 * 删除缓存
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error('[Cache] Delete failed:', error);
  }
}


/**
 * 使用 SCAN 命令迭代获取匹配的 key（非阻塞）
 * @param client Redis 客户端
 * @param pattern 匹配模式
 * @param count 每次 SCAN 返回的 key 数量
 */
async function scanKeys(
  client: RedisClientInterface & { scan: (cursor: number, options: { MATCH: string; COUNT: number }) => Promise<[string, string[]]> },
  pattern: string,
  count = 100
): Promise<string[]> {
  const allKeys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await client.scan(cursor, { MATCH: pattern, COUNT: count });
    cursor = nextCursor;
    allKeys.push(...keys);
  } while (cursor !== '0');

  return allKeys;
}

/**
 * 使用 SCAN + DEL 批量删除匹配的 key（非阻塞）
 */
async function deleteKeysWithScan(client: RedisClientInterface, keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  // 内存缓存不支持 SCAN，直接删除
  if (!('scan' in client)) {
    let deleted = 0;
    for (const key of keys) {
      const result = await client.del(key);
      deleted += result;
    }
    return deleted;
  }

  // Redis 使用 pipeline 批量删除
  const redisClient = client as RedisClientInterface & {
    del: (key: string) => Promise<number>;
    pipeline: () => {
      del: (key: string) => ReturnType<typeof client.del>;
      exec: () => Promise<[Error | null, number][]>;
    };
  };

  if (!('pipeline' in redisClient)) {
    // 如果没有 pipeline，使用逐个删除
    let deleted = 0;
    for (const key of keys) {
      const result = await redisClient.del(key);
      deleted += result;
    }
    return deleted;
  }

  const pipeline = redisClient.pipeline();
  for (const key of keys) {
    pipeline.del(key);
  }

  try {
    const results = await pipeline.exec();
    if (!results) return 0;
    return results.reduce((sum, [, count]) => sum + (count as number), 0);
  } catch {
    // 如果 pipeline 失败，回退到逐个删除
    let deleted = 0;
    for (const key of keys) {
      const result = await redisClient.del(key);
      deleted += result;
    }
    return deleted;
  }
}

/**
 * 删除缓存（支持通配符）
 * 使用 SCAN 命令避免阻塞 Redis
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    const client = await getRedisClient();

    // 检查是否支持 SCAN
    if ('scan' in client) {
      const keys = await scanKeys(client as Parameters<typeof scanKeys>[0], pattern);
      return await deleteKeysWithScan(client, keys);
    }

    // 内存缓存回退：使用 keys 方法
    // 注意：内存缓存通常 key 数量有限，keys() 不会阻塞
    const memoryClient = client as {
      keys?: (pattern: string) => Promise<string[]>;
    };
    if (memoryClient.keys) {
      const keys = await memoryClient.keys(pattern);
      return await deleteKeysWithScan(client, keys);
    }

    return 0;
  } catch (error) {
    console.error('[Cache] deleteCachePattern failed:', error);
    return 0;
  }
}


/**
 * 缓存键前缀
 */
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userByUsername: (username: string) => `user:username:${username}`,
  repo: (id: string) => `repo:${id}`,
  repoByName: (ownerId: string, name: string) => `repo:${ownerId}:${name}`,
  repoList: (ownerId: string, page: number) => `repos:${ownerId}:list:${page}`,
  discussion: (id: string) => `discussion:${id}`,
  discussionList: (repoId: string, page: number) => `discussion:${repoId}:list:${page}`,
  notificationCount: (userId: string) => `notification:${userId}:count`,
  notificationSettings: (userId: string) => `notification:settings:${userId}`,
  stats: (type: string) => `stats:${type}`,
  search: (query: string, type: string) => `search:${type}:${query}`,
} as const;


/**
 * 创建带缓存的查询函数
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  queryFn: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key);

  if (cached.hit && cached.data !== undefined) {
    return cached.data;
  }

  const data = await queryFn();
  await setCache({ key, value: data, ttl });

  return data;
}


/**
 * 缓存失效装饰器
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    await deleteCachePattern(pattern);
  }
}


/**
 * 获取缓存统计
 */
export async function getCacheStats(): Promise<{
  memorySize: number;
  redisConnected: boolean;
}> {
  return {
    memorySize: memoryCache.size,
    redisConnected: redisClient !== null,
  };
}
