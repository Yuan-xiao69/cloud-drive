/**
 * 统一错误处理器
 * 替代每个 API 路由中散落的 try/catch，提供一致的错误响应格式
 */

import { errors, handlePrismaError } from '@/lib/api/v1';

/**
 * 业务异常类
 * 用于在业务逻辑中主动抛出可预期的错误，框架自动转换为 V1 标准错误响应
 */
export class BusinessError extends Error {
  /** 错误码标识，对应 ErrorCodes 中的键名 */
  public readonly code: string;
  /** 自定义 HTTP 状态码（可选），如不指定则使用错误码默认映射 */
  public readonly httpStatus?: number;

  constructor(code: string, message: string, httpStatus?: number) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/**
 * 判断错误是否为 BusinessError
 */
function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof Error && error.name === 'BusinessError';
}

/**
 * 判断错误是否为 Prisma 相关错误
 * Prisma 错误对象通常包含 clientVersion、code 等特有属性
 */
function isPrismaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Prisma 错误对象挂有 clientVersion 属性
  return 'clientVersion' in error || 'code' in error;
}

export class ErrorHandler {
  /**
   * 统一处理各类异常，返回 V1 标准错误响应
   * @param error - 捕获到的异常对象
   * @returns V1 格式的 Response 对象
   */
  static handle(error: unknown): Response {
    // 1. 业务异常 → 使用 BusinessError 中的信息构建响应
    if (isBusinessError(error)) {
      console.error(`[ErrorHandler] BusinessError [${error.code}]:`, error.message);
      // 尝试使用 errors 对象中的对应方法
      const errCode = error.code as keyof typeof errors;
      if (errCode in errors && typeof errors[errCode] === 'function') {
        return (errors[errCode] as (msg?: string) => Response)(error.message);
      }
      // 回退：使用通用 badRequest 或指定的 httpStatus
      if (error.httpStatus) {
        return new Response(
          JSON.stringify({
            code: 5000,
            message: error.message,
            errors: null,
            meta: {
              version: '1.0.0',
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
            },
          }),
          {
            status: error.httpStatus,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          }
        );
      }
      return errors.badRequest(error.message);
    }

    // 2. Prisma 数据库错误 → 使用已有的 handlePrismaError
    if (isPrismaError(error)) {
      return handlePrismaError(error);
    }

    // 3. 通用 Error → 500 内部错误
    if (error instanceof Error) {
      console.error(`[ErrorHandler] 未预期的错误:`, error.message, error.stack);
      return errors.internal('服务器内部错误');
    }

    // 4. 未知类型 → 500
    console.error('[ErrorHandler] 未知错误类型:', error);
    return errors.internal('未知错误');
  }
}
