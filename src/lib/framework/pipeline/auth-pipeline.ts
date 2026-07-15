/**
 * 统一认证管道
 * 根据模式（required / optional / none）处理用户认证
 * 由 defineRoute() 工厂函数调用
 */

import { NextRequest } from 'next/server';
import { SessionService, type SessionUser } from '@/services/session-service';
import { errors } from '@/lib/api/v1';

export interface AuthPipelineResult {
  /** 认证是否阻止了请求继续执行 */
  blocked: boolean;
  /** 如果 blocked 为 true，返回 401/403 错误响应 */
  response?: Response;
  /** 当前用户：'required'/'optional' 模式下返回用户对象或 null；'none' 模式为 null */
  user?: SessionUser | null;
}

export class AuthPipeline {
  /**
   * 执行认证管道
   * @param req - Next.js 请求对象
   * @param mode - 认证模式
   *   - 'required': 未认证返回 401
   *   - 'optional': 有则设置用户，无则为 null
   *   - 'none': 完全跳过认证，user 为 null
   */
  static async run(
    req: NextRequest,
    mode: 'required' | 'optional' | 'none'
  ): Promise<AuthPipelineResult> {
    // 'none' 模式：直接跳过
    if (mode === 'none') {
      return { blocked: false, user: null };
    }

    // 调用 SessionService 验证用户
    const user = await SessionService.validate(req);

    // 'required' 模式：未登录返回 401
    if (mode === 'required') {
      if (!user) {
        return {
          blocked: true,
          response: errors.unauthorized(),
          user: null,
        };
      }
      return { blocked: false, user };
    }

    // 'optional' 模式：返回用户（可能为 null）
    return { blocked: false, user };
  }
}
