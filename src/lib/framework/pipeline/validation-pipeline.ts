/**
 * Zod 验证管道
 * 基于 Zod Schema 对请求体进行类型安全验证
 * 由 defineRoute() 工厂函数调用
 */

import { z } from 'zod';
import { validationError } from '@/lib/api/v1';
import type { ApiErrorDetail } from '@/lib/api/v1/errors';

export class ValidationPipeline {
  /**
   * 使用 Zod Schema 验证数据
   * @param schema - Zod 验证模式
   * @param data - 待验证的原始数据
   * @returns 成功返回解析后的数据，失败返回 V1 标准错误响应
   */
  static async validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): Promise<
    | { success: true; data: T }
    | { success: false; error: Response }
  > {
    const parsed = schema.safeParse(data);

    if (parsed.success) {
      return { success: true, data: parsed.data };
    }

    return {
      success: false,
      error: ValidationPipeline.error(parsed.error),
    };
  }

  /**
   * 将 ZodError 格式化为 V1 标准验证错误响应
   * @param zodError - Zod 解析错误对象
   */
  static error(zodError: z.ZodError): Response {
    const details: ApiErrorDetail[] = zodError.errors.map((e) => {
      const path = e.path.length > 0 ? e.path.join('.') : undefined;
      return {
        field: path,
        message: e.message,
        code: 1002, // VALIDATION_ERROR
      };
    });

    return validationError(details);
  }
}
