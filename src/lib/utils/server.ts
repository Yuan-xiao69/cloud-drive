import { NextResponse } from 'next/server';

// ============================================================
// 统一 API 响应格式
// 注意：新代码请使用 @/lib/api/v1/response.ts 中的标准响应工具
// 以下函数保留仅作为向后兼容
// ============================================================

export function apiSuccess<T>(data: T, message = 'success', status = 200): NextResponse {
  return NextResponse.json({ code: 200, message, data }, { status });
}

export function apiError(message: string, code = 400, status?: number): NextResponse {
  return NextResponse.json(
    { code, message, data: null },
    { status: status ?? code }
  );
}

export function apiCreated<T>(data: T, message = '创建成功'): NextResponse {
  return apiSuccess(data, message, 201);
}

// ============================================================
// 输入校验工具（从 utils/index.ts 统一导入，避免重复定义）
// ============================================================

export { isValidUsername, isValidEmail } from '@/lib/utils';

// ============================================================
// 通用工具
// ============================================================

/**
 * 安全地从对象中排除指定字段（用于不返回 password_hash 等敏感字段）
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result as Omit<T, K>;
}

/**
 * 将 BigInt 转换为 Number（用于文件大小等字段的 JSON 序列化）
 */
export function bigIntToNumber(val: bigint | number): number {
  return typeof val === 'bigint' ? Number(val) : val;
}
