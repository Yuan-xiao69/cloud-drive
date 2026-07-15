/**
 * CSRF 防护管道
 * 对状态变更请求（POST/PUT/PATCH/DELETE）进行跨站请求伪造检测
 * 由 defineRoute() 工厂函数调用
 */

import { NextRequest } from 'next/server';
import { csrfProtect } from '@/lib/csrf';
import { isCsrfWhitelisted } from '@/lib/security-config';
import { errors } from '@/lib/api/v1';

export interface CsrfResult {
  /** 是否被 CSRF 检查阻止 */
  blocked: boolean;
  /** 如果 blocked 为 true，返回 403 错误响应 */
  response?: Response;
}

export class CsrfPipeline {
  /**
   * 执行 CSRF 验证
   * 白名单路径直接跳过，否则调用 csrfProtect 验证
   * @param req - Next.js 请求对象
   */
  static async run(req: NextRequest): Promise<CsrfResult> {
    const pathname = req.nextUrl.pathname;
    const method = req.method;

    // 白名单检查：GET/HEAD/OPTIONS 及指定路径跳过 CSRF
    if (isCsrfWhitelisted(pathname, method)) {
      return { blocked: false };
    }

    // 执行实际 CSRF 验证
    try {
      const result = await csrfProtect(req);
      if (!result.valid) {
        return {
          blocked: true,
          // csrfProtect 返回的是 NextResponse，需要转换为 V1 标准格式
          response: result.error || errors.forbidden('CSRF 验证失败'),
        };
      }
    } catch (err) {
      console.error('[CsrfPipeline] CSRF 验证异常:', err);
      return {
        blocked: true,
        response: errors.forbidden('CSRF 验证异常'),
      };
    }

    return { blocked: false };
  }
}
