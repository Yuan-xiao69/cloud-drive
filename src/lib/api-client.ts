// ============================================================
// 统一 API 客户端工具
// 提供统一的 API 请求、错误处理和类型定义
// ============================================================

import { toast } from 'react-hot-toast';

// ============================================================
// 类型定义
// ============================================================

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T = unknown> {
  code: number;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: number;
  message: string;
  data: null;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  showErrorToast?: boolean;
}

// ============================================================
// 自定义错误类
// ============================================================

export class ApiException extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export class NetworkException extends Error {
  constructor(message = '网络连接失败，请检查您的网络') {
    super(message);
    this.name = 'NetworkException';
  }
}

export class TimeoutException extends Error {
  constructor(message = '请求超时，请稍后重试') {
    super(message);
    this.name = 'TimeoutException';
  }
}

export class UnauthorizedException extends Error {
  constructor(message = '登录已过期，请重新登录') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends Error {
  constructor(message = '您没有权限执行此操作') {
    super(message);
    this.name = 'ForbiddenException';
  }
}

export class NotFoundException extends Error {
  constructor(message = '请求的资源不存在') {
    super(message);
    this.name = 'NotFoundException';
  }
}

// ============================================================
// 错误码常量
// ============================================================

export const ErrorCodes = {
  // 成功
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // 客户端错误
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 服务器错误
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================
// 核心请求函数
// ============================================================

/**
 * 带超时的 fetch 包装器
 */
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutException();
      }
      throw new NetworkException(error.message);
    }
    throw new NetworkException();
  }
}

/**
 * 统一错误处理函数
 */
async function handleError(error: unknown, showToast = true): Promise<never> {
  // 已经是已知错误类型
  if (error instanceof ApiException) {
    if (showToast) {
      toast.error(error.message);
    }
    throw error;
  }

  if (error instanceof TimeoutException) {
    if (showToast) {
      toast.error(error.message);
    }
    throw error;
  }

  if (error instanceof NetworkException) {
    if (showToast) {
      toast.error(error.message);
    }
    throw error;
  }

  // 处理 Response 错误
  if (error instanceof Response) {
    const apiError: ApiError = {
      code: error.status,
      message: error.statusText,
      data: null,
    };

    // 尝试解析错误消息
    try {
      const clonedResponse = error.clone();
      const json = await clonedResponse.json();
      if (json.message) {
        apiError.message = json.message;
      }
    } catch {
      // ignore parse error
    }

    switch (error.status) {
      case ErrorCodes.UNAUTHORIZED:
        throw new UnauthorizedException(apiError.message);
      case ErrorCodes.FORBIDDEN:
        throw new ForbiddenException(apiError.message);
      case ErrorCodes.NOT_FOUND:
        throw new NotFoundException(apiError.message);
      case ErrorCodes.TOO_MANY_REQUESTS:
        if (showToast) {
          toast.error('请求过于频繁，请稍后重试');
        }
        throw new ApiException(error.status, apiError.message);
      default:
        if (showToast) {
          toast.error(apiError.message || '请求失败');
        }
        throw new ApiException(error.status, apiError.message);
    }
  }

  // 未知错误
  console.error('Unexpected error:', error);
  const message = error instanceof Error ? error.message : '未知错误';
  if (showToast) {
    toast.error(`操作失败: ${message}`);
  }
  throw new ApiException(500, message);
}

// ============================================================
// API 请求函数
// ============================================================

/**
 * GET 请求
 */
export async function apiGet<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw response;
    }

    const result: ApiResponse<T> = await response.json();
    
    if (result.code !== 200 && result.code !== 201) {
      throw new ApiException(result.code, result.message, result.data);
    }

    return result.data as T;
  } catch (error) {
    throw handleError(error, showErrorToast);
  }
}

/**
 * POST 请求
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw response;
    }

    const result: ApiResponse<T> = await response.json();
    
    if (result.code !== 200 && result.code !== 201) {
      throw new ApiException(result.code, result.message, result.data);
    }

    return result.data as T;
  } catch (error) {
    throw handleError(error, showErrorToast);
  }
}

/**
 * PUT 请求
 */
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw response;
    }

    const result: ApiResponse<T> = await response.json();
    
    if (result.code !== 200 && result.code !== 201) {
      throw new ApiException(result.code, result.message, result.data);
    }

    return result.data as T;
  } catch (error) {
    throw handleError(error, showErrorToast);
  }
}

/**
 * PATCH 请求
 */
export async function apiPatch<T = unknown>(
  url: string,
  data?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include',
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw response;
    }

    const result: ApiResponse<T> = await response.json();
    
    if (result.code !== 200 && result.code !== 201) {
      throw new ApiException(result.code, result.message, result.data);
    }

    return result.data as T;
  } catch (error) {
    throw handleError(error, showErrorToast);
  }
}

/**
 * DELETE 请求
 */
export async function apiDelete<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;
  
  try {
    const response = await fetchWithTimeout(url, {
      ...fetchOptions,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw response;
    }

    // DELETE 可能返回空响应
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    const result: ApiResponse<T> = JSON.parse(text);
    
    if (result.code !== 200 && result.code !== 204) {
      throw new ApiException(result.code, result.message, result.data);
    }

    return result.data as T;
  } catch (error) {
    throw handleError(error, showErrorToast);
  }
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse<T = unknown>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * 检查响应是否成功
 */
export function isSuccessResponse(response: ApiResponse | unknown): boolean {
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  const r = response as ApiResponse;
  return r.code === 200 || r.code === 201 || r.code === 204;
}

/**
 * 提取错误消息
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiException) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '操作失败';
}
