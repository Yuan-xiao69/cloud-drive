/**
 * defineRoute — 框架核心工厂函数
 * 将认证、限流、CSRF、验证等管道串联执行，提供声明式路由定义
 *
 * 使用示例：
 *   export const POST = defineRoute({
 *     auth: 'required',
 *     rateLimit: 'auth',
 *     validation: z.object({ name: z.string() }),
 *     handler: async ({ req, user, body }) => { ... }
 *   });
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  AuthPipeline,
  RateLimitPipeline,
  CsrfPipeline,
  ValidationPipeline,
} from './pipeline';
import type { RateLimitTier } from './pipeline';
import { ErrorHandler, BusinessError } from './error-handler';
import type { SessionUser } from '@/services/session-service';
import { logger } from '@/lib/logger';

// ============================================================
// 路由配置类型
// ============================================================

interface RouteConfig<
  TParams extends Record<string, string> = Record<string, string>,
  TBody = undefined,
> {
  /** 认证模式 */
  auth: 'required' | 'optional' | 'none';
  /** 速率限制层级（可选） */
  rateLimit?: RateLimitTier;
  /** CSRF 保护（默认对写方法开启），设为 false 显式关闭 */
  csrf?: boolean;
  /** 请求体 Zod 验证模式（可选） */
  validation?: z.ZodSchema<TBody>;
  /** 路由参数 Zod 验证模式（可选） */
  paramsSchema?: z.ZodSchema<TParams>;
  /** 核心处理函数 */
  handler: (ctx: {
    req: NextRequest;
    user: SessionUser | null;
    body: TBody;
    params: TParams;
  }) => Promise<Response>;
}

// ============================================================
// 工具函数
// ============================================================

/** 需要 CSRF 保护的写方法 */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

/** 默认空对象，用于无 params 时的兜底 */
const EMPTY_PARAMS = {} as Record<string, string>;

/**
 * 安全解析请求体
 */
async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    // 检查 Content-Type 是否为 JSON
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return undefined;
    }
    return await req.json();
  } catch {
    return undefined;
  }
}

// ============================================================
// 路由段配置（Next.js App Router）
// ============================================================

export const dynamic = 'force-dynamic';

// ============================================================
// defineRoute 工厂函数
// ============================================================

/**
 * 创建标准化 API 路由处理函数
 *
 * 管道执行顺序：
 *   1. 认证管道（AuthPipeline）
 *   2. 速率限制管道（RateLimitPipeline）
 *   3. CSRF 防护管道（CsrfPipeline）
 *   4. 请求体验证管道（ValidationPipeline）
 *   5. 核心处理函数（handler）
 *   6. 异常捕获（ErrorHandler）
 */
export function defineRoute<
  TParams extends Record<string, string> = Record<string, string>,
  TBody = undefined,
>(
  config: RouteConfig<TParams, TBody>
): (
  req: NextRequest,
  routeContext?: { params: Promise<TParams> }
) => Promise<Response> {
  return async (
    req: NextRequest,
    routeContext?: { params: Promise<TParams> }
  ): Promise<Response> => {
    try {
      // 1. 认证管道
      const authResult = await AuthPipeline.run(req, config.auth);
      if (authResult.blocked) {
        return authResult.response!;
      }
      const user = authResult.user ?? null;

      // 2. 速率限制管道
      if (config.rateLimit) {
        const rateResult = await RateLimitPipeline.run(req, config.rateLimit);
        if (rateResult.blocked) {
          return rateResult.response!;
        }
      }

      // 3. CSRF 防护管道（写方法默认开启，可通过 csrf:false 关闭）
      const csrfEnabled = config.csrf !== false && isWriteMethod(req.method);
      if (csrfEnabled) {
        const csrfResult = await CsrfPipeline.run(req);
        if (csrfResult.blocked) {
          return csrfResult.response!;
        }
      }

      // 4. 请求体验证（写方法 + 有 validation schema 时）
      let body: TBody = undefined as TBody;
      if (config.validation && isWriteMethod(req.method)) {
        const rawBody = await parseBody(req);
        const validation = await ValidationPipeline.validate(
          config.validation,
          rawBody
        );
        if (!validation.success) {
          return validation.error;
        }
        body = validation.data;
      }

      // 5. 解析路由参数（Next.js App Router params 是 Promise）
      let params: TParams = EMPTY_PARAMS as TParams;
      if (routeContext?.params) {
        const rawParams = await routeContext.params;
        // 可选验证 params schema
        if (config.paramsSchema) {
          const paramValidation = await ValidationPipeline.validate(
            config.paramsSchema,
            rawParams
          );
          if (!paramValidation.success) {
            return paramValidation.error;
          }
          params = paramValidation.data;
        } else {
          params = rawParams as TParams;
        }
      }

      // 6. 执行核心处理函数
      const start = Date.now();
      const response = await config.handler({ req, user, body, params });
      logger.api('api', req.method, new URL(req.url).pathname, response.status, Date.now() - start);
      return response;
    } catch (error) {
      // 7. 统一错误处理
      if (error instanceof Error && !(error instanceof BusinessError)) {
        logger.error('api', 'API 路由异常', {
          error: error.message,
          stack: error.stack,
          url: req.url,
          method: req.method,
        });
        try {
          const Sentry = await import('@sentry/nextjs');
          Sentry.captureException(error, {
            tags: { route: 'api' },
            extra: { url: req.url, method: req.method },
          });
        } catch { /* Sentry 未配置时静默 */ }
      }
      return ErrorHandler.handle(error);
    }
  };
}
