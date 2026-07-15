/**
 * 框架层统一入口
 *
 * Phase 0 目标：提供声明式路由定义能力，统一认证、限流、CSRF、验证等横切关注点
 *
 * 核心导出：
 *   - defineRoute() — 路由工厂函数
 *   - ErrorHandler — 统一错误处理器
 *   - BusinessError — 业务异常类
 *   - 各管道类及类型
 */

// 核心工厂函数
export { defineRoute } from './define-route';

// 错误处理
export { ErrorHandler, BusinessError } from './error-handler';

// 管道
export {
  AuthPipeline,
  RateLimitPipeline,
  CsrfPipeline,
  ValidationPipeline,
} from './pipeline';

// 管道类型
export type { AuthPipelineResult } from './pipeline';
export type { RateLimitTier, RateLimitResult } from './pipeline';
export type { CsrfResult } from './pipeline';
