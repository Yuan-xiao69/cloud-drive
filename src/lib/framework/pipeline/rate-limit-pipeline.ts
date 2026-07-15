/**
 * 速率限制管道
 * 基于请求 IP 进行令牌桶限流，防止滥用
 * 由 defineRoute() 工厂函数调用
 */

import { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/security-config';
import { errors } from '@/lib/api/v1';

/** 频率限制层级 */
export type RateLimitTier = 'default' | 'auth' | 'strict' | 'upload' | 'search';

export interface RateLimitResult {
  /** 是否被限流阻止 */
  blocked: boolean;
  /** 如果 blocked 为 true，返回 429 错误响应 */
  response?: Response;
}

/** RateLimitTier 到 RATE_LIMITS 键名的映射表 */
const TIER_MAP: Record<RateLimitTier, keyof typeof RATE_LIMITS> = {
  default: 'default',
  auth: 'auth',
  strict: 'register',
  upload: 'upload',
  search: 'search',
};

export class RateLimitPipeline {
  /**
   * 执行速率限制检查
   * @param req - Next.js 请求对象
   * @param tier - 限制层级
   */
  static async run(
    req: NextRequest,
    tier: RateLimitTier
  ): Promise<RateLimitResult> {
    const rateLimitType = TIER_MAP[tier];

    const result = await checkRateLimit(req, rateLimitType);

    if (!result.allowed) {
      return {
        blocked: true,
        response: errors.rateLimited(),
      };
    }

    return { blocked: false };
  }
}
