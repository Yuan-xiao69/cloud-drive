/**
 * API v1 统一响应工具
 * 提供标准化的成功/错误/分页响应格式
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  ErrorCode,
  ErrorCodes,
  ErrorMessages,
  HttpStatusMap,
  ApiErrorDetail,
} from './errors';

// ============================================================
// 常量定义
// ============================================================

export const API_VERSION = '1.0.0';
export const API_VERSION_HEADER = 'X-API-Version';
export const REQUEST_ID_HEADER = 'X-Request-Id';

// ============================================================
// Headers 安全过滤（RFC 7230: HTTP Headers 只能包含 ASCII 字符）
// ============================================================

function sanitizeHeader(value: string): string {
  // 保留基本 ASCII 可见字符：空格、字母、数字、常用符号
  // 移除非 ASCII 字符（如中文、emoji 等），防止 ByteString 转换错误
  return value.replace(/[^\x20-\x7E]/g, '');
}

// ============================================================
// 响应头生成
// ============================================================

function getResponseHeaders(requestId?: string): Record<string, string> {
  const safeRequestId = sanitizeHeader(requestId || uuidv4());
  return {
    [API_VERSION_HEADER]: API_VERSION,
    [REQUEST_ID_HEADER]: safeRequestId,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

function getMeta(requestId?: string) {
  return {
    version: API_VERSION,
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
}

// ============================================================
// 成功响应
// ============================================================

/**
 * 通用成功响应
 */
export function success<T>(
  data: T,
  message = 'success',
  status = 200,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      code: status,
      message,
      data,
      meta: getMeta(requestId),
    },
    {
      status,
      headers: getResponseHeaders(requestId),
    }
  );
}

/**
 * 创建资源成功 (201)
 */
export function created<T>(
  data: T,
  message = '创建成功',
  requestId?: string
): NextResponse {
  return success(data, message, 201, requestId);
}

/**
 * 无内容成功响应 (204)
 */
export function noContent(requestId?: string): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getResponseHeaders(requestId),
  });
}

/**
 * 删除成功 (204)
 */
export function deleted(requestId?: string): NextResponse {
  return noContent(requestId);
}

// ============================================================
// 分页响应
// ============================================================

export interface PaginationMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  type?: 'repos' | 'users' | 'discussions' | 'issues' | 'pulls';
}

/**
 * 分页响应
 */
export function paginated<T>(
  items: T[],
  pagination: PaginationMeta,
  message = 'success',
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      code: 200,
      message,
      data: {
        items,
        pagination,
      },
      meta: getMeta(requestId),
    },
    { headers: getResponseHeaders(requestId) }
  );
}

// ============================================================
// 错误响应
// ============================================================

export interface ErrorResponseOptions {
  message?: string;
  details?: ApiErrorDetail[];
  requestId?: string;
}

/**
 * 字符串形式的 ErrorCode 别名（兼容旧代码）
 */
export type ErrorCodeString = 
  | 'UNKNOWN_ERROR' | 'INVALID_PARAMS' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE'
  | 'UNAUTHORIZED' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'TOKEN_MISSING' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'ACCOUNT_DISABLED' | 'MFA_REQUIRED' | 'MFA_INVALID'
  | 'FORBIDDEN' | 'PERMISSION_DENIED' | 'USER_BANNED' | 'REPO_RESTRICTED' | 'ACTION_BLOCKED'
  | 'NOT_FOUND' | 'USER_NOT_FOUND' | 'REPO_NOT_FOUND' | 'RESOURCE_EXISTS' | 'USER_EXISTS' | 'EMAIL_EXISTS' | 'USERNAME_EXISTS'
  | 'OPERATION_FAILED' | 'COMMENT_NOT_FOUND' | 'INVALID_OPERATION' | 'FORK_NOT_ALLOWED' | 'MERGE_CONFLICT' | 'ISSUE_CLOSED' | 'PR_NOT_MERGEABLE' | 'REVIEW_REQUIRED'
  | 'RATE_LIMITED' | 'STORAGE_EXCEEDED' | 'QUOTA_EXCEEDED' | 'FILE_TOO_LARGE' | 'TOO_MANY_REQUESTS'
  | 'FILE_NOT_FOUND' | 'FILE_EXISTS' | 'DIRECTORY_NOT_EMPTY' | 'INVALID_FILE_TYPE'
  | 'ALREADY_STARRED' | 'NOT_STARRED' | 'ALREADY_WATCHING' | 'NOT_WATCHING' | 'ALREADY_FOLLOWING' | 'NOT_FOLLOWING' | 'CANNOT_FOLLOW_SELF' | 'ALREADY_LIKED' | 'NOT_LIKED' | 'CANNOT_LIKE_OWN'
  | 'EXTERNAL_SERVICE_ERROR' | 'MINIO_ERROR' | 'REDIS_ERROR' | 'DATABASE_ERROR'
  // 额外支持
  | 'BAD_REQUEST' | 'CONFLICT';

/**
 * 字符串到 ErrorCode 的映射
 */
const StringToErrorCodeMap: Record<ErrorCodeString, ErrorCode> = {
  UNKNOWN_ERROR: ErrorCodes.UNKNOWN_ERROR,
  INVALID_PARAMS: ErrorCodes.INVALID_PARAMS,
  VALIDATION_ERROR: ErrorCodes.VALIDATION_ERROR,
  INTERNAL_ERROR: ErrorCodes.INTERNAL_ERROR,
  SERVICE_UNAVAILABLE: ErrorCodes.SERVICE_UNAVAILABLE,
  UNAUTHORIZED: ErrorCodes.UNAUTHORIZED,
  TOKEN_INVALID: ErrorCodes.TOKEN_INVALID,
  TOKEN_EXPIRED: ErrorCodes.TOKEN_EXPIRED,
  TOKEN_MISSING: ErrorCodes.TOKEN_MISSING,
  INVALID_CREDENTIALS: ErrorCodes.INVALID_CREDENTIALS,
  ACCOUNT_LOCKED: ErrorCodes.ACCOUNT_LOCKED,
  ACCOUNT_DISABLED: ErrorCodes.ACCOUNT_DISABLED,
  MFA_REQUIRED: ErrorCodes.MFA_REQUIRED,
  MFA_INVALID: ErrorCodes.MFA_INVALID,
  FORBIDDEN: ErrorCodes.FORBIDDEN,
  PERMISSION_DENIED: ErrorCodes.PERMISSION_DENIED,
  USER_BANNED: ErrorCodes.USER_BANNED,
  REPO_RESTRICTED: ErrorCodes.REPO_RESTRICTED,
  ACTION_BLOCKED: ErrorCodes.ACTION_BLOCKED,
  NOT_FOUND: ErrorCodes.NOT_FOUND,
  USER_NOT_FOUND: ErrorCodes.USER_NOT_FOUND,
  REPO_NOT_FOUND: ErrorCodes.REPO_NOT_FOUND,
  RESOURCE_EXISTS: ErrorCodes.RESOURCE_EXISTS,
  USER_EXISTS: ErrorCodes.USER_EXISTS,
  EMAIL_EXISTS: ErrorCodes.EMAIL_EXISTS,
  USERNAME_EXISTS: ErrorCodes.USERNAME_EXISTS,
  OPERATION_FAILED: ErrorCodes.OPERATION_FAILED,
  COMMENT_NOT_FOUND: ErrorCodes.COMMENT_NOT_FOUND,
  INVALID_OPERATION: ErrorCodes.INVALID_OPERATION,
  FORK_NOT_ALLOWED: ErrorCodes.FORK_NOT_ALLOWED,
  MERGE_CONFLICT: ErrorCodes.MERGE_CONFLICT,
  ISSUE_CLOSED: ErrorCodes.ISSUE_CLOSED,
  PR_NOT_MERGEABLE: ErrorCodes.PR_NOT_MERGEABLE,
  REVIEW_REQUIRED: ErrorCodes.REVIEW_REQUIRED,
  RATE_LIMITED: ErrorCodes.RATE_LIMITED,
  STORAGE_EXCEEDED: ErrorCodes.STORAGE_EXCEEDED,
  QUOTA_EXCEEDED: ErrorCodes.QUOTA_EXCEEDED,
  FILE_TOO_LARGE: ErrorCodes.FILE_TOO_LARGE,
  TOO_MANY_REQUESTS: ErrorCodes.TOO_MANY_REQUESTS,
  FILE_NOT_FOUND: ErrorCodes.FILE_NOT_FOUND,
  FILE_EXISTS: ErrorCodes.FILE_EXISTS,
  DIRECTORY_NOT_EMPTY: ErrorCodes.DIRECTORY_NOT_EMPTY,
  INVALID_FILE_TYPE: ErrorCodes.INVALID_FILE_TYPE,
  ALREADY_STARRED: ErrorCodes.ALREADY_STARRED,
  NOT_STARRED: ErrorCodes.NOT_STARRED,
  ALREADY_WATCHING: ErrorCodes.ALREADY_WATCHING,
  NOT_WATCHING: ErrorCodes.NOT_WATCHING,
  ALREADY_FOLLOWING: ErrorCodes.ALREADY_FOLLOWING,
  NOT_FOLLOWING: ErrorCodes.NOT_FOLLOWING,
  CANNOT_FOLLOW_SELF: ErrorCodes.CANNOT_FOLLOW_SELF,
  ALREADY_LIKED: ErrorCodes.ALREADY_LIKED,
  NOT_LIKED: ErrorCodes.NOT_LIKED,
  CANNOT_LIKE_OWN: ErrorCodes.CANNOT_LIKE_OWN,
  EXTERNAL_SERVICE_ERROR: ErrorCodes.EXTERNAL_SERVICE_ERROR,
  MINIO_ERROR: ErrorCodes.MINIO_ERROR,
  REDIS_ERROR: ErrorCodes.REDIS_ERROR,
  DATABASE_ERROR: ErrorCodes.DATABASE_ERROR,
  // 额外别名
  BAD_REQUEST: ErrorCodes.INVALID_PARAMS,
  CONFLICT: ErrorCodes.RESOURCE_EXISTS,
};

/**
 * 解析 ErrorCode（支持字符串或数字）
 */
function resolveErrorCode(code: ErrorCode | ErrorCodeString): ErrorCode {
  if (typeof code === 'number') {
    return code;
  }
  const resolved = StringToErrorCodeMap[code as ErrorCodeString];
  if (resolved === undefined) {
    console.warn(`Unknown ErrorCode string: ${code}, defaulting to UNKNOWN_ERROR`);
    return ErrorCodes.UNKNOWN_ERROR;
  }
  return resolved;
}

/**
 * 统一错误响应
 */
export function error(
  code: ErrorCode | ErrorCodeString,
  options: ErrorResponseOptions = {}
): NextResponse {
  const resolvedCode = resolveErrorCode(code);
  const { message, details, requestId } = options;
  const httpStatus = HttpStatusMap[resolvedCode] || 500;

  return NextResponse.json(
    {
      code: resolvedCode,
      message: message || ErrorMessages[resolvedCode] || '未知错误',
      errors: details,
      meta: getMeta(requestId),
    },
    {
      status: httpStatus,
      headers: getResponseHeaders(requestId),
    }
  );
}

/**
 * 带字段验证错误的响应
 */
export function validationError(
  details: ApiErrorDetail[],
  requestId?: string
): NextResponse {
  return error(ErrorCodes.VALIDATION_ERROR, {
    message: '数据验证失败',
    details,
    requestId,
  });
}

// ============================================================
// 便捷错误响应函数
// ============================================================

export const errors = {
  // 400 Bad Request
  badRequest: (message?: string, requestId?: string) =>
    error(ErrorCodes.INVALID_PARAMS, { message, requestId }),

  // 401 Unauthorized
  unauthorized: (message?: string, requestId?: string) =>
    error(ErrorCodes.UNAUTHORIZED, { message, requestId }),

  tokenInvalid: (requestId?: string) =>
    error(ErrorCodes.TOKEN_INVALID, { requestId }),

  tokenExpired: (requestId?: string) =>
    error(ErrorCodes.TOKEN_EXPIRED, { requestId }),

  tokenMissing: (requestId?: string) =>
    error(ErrorCodes.TOKEN_MISSING, { requestId }),

  invalidCredentials: (requestId?: string) =>
    error(ErrorCodes.INVALID_CREDENTIALS, { requestId }),

  mfaRequired: (requestId?: string) =>
    error(ErrorCodes.MFA_REQUIRED, { requestId }),

  // 403 Forbidden
  forbidden: (message?: string, requestId?: string) =>
    error(ErrorCodes.FORBIDDEN, { message, requestId }),

  permissionDenied: (requestId?: string) =>
    error(ErrorCodes.PERMISSION_DENIED, { requestId }),

  userBanned: (requestId?: string) =>
    error(ErrorCodes.USER_BANNED, { requestId }),

  // 404 Not Found
  notFound: (resource = '资源', requestId?: string) =>
    error(ErrorCodes.NOT_FOUND, {
      message: `${resource}不存在`,
      requestId,
    }),

  userNotFound: (username?: string, requestId?: string) =>
    error(ErrorCodes.USER_NOT_FOUND, {
      message: username ? `用户 ${username} 不存在` : '用户不存在',
      requestId,
    }),

  repoNotFound: (
    username?: string,
    repoName?: string,
    requestId?: string
  ) =>
    error(ErrorCodes.REPO_NOT_FOUND, {
      message:
        username && repoName
          ? `仓库 ${username}/${repoName} 不存在`
          : '仓库不存在',
      requestId,
    }),

  // 409 Conflict
  conflict: (message?: string, requestId?: string) =>
    error(ErrorCodes.RESOURCE_EXISTS, { message, requestId }),

  usernameExists: (requestId?: string) =>
    error(ErrorCodes.USERNAME_EXISTS, { message: '用户名已被占用', requestId }),

  emailExists: (requestId?: string) =>
    error(ErrorCodes.EMAIL_EXISTS, { message: '邮箱已被注册', requestId }),

  alreadyStarred: (requestId?: string) =>
    error(ErrorCodes.ALREADY_STARRED, { requestId }),

  notStarred: (requestId?: string) =>
    error(ErrorCodes.NOT_STARRED, { requestId }),

  // 422 Unprocessable Entity (业务逻辑错误)
  invalidOperation: (message?: string, requestId?: string) =>
    error(ErrorCodes.INVALID_OPERATION, { message, requestId }),

  operationFailed: (message?: string, requestId?: string) =>
    error(ErrorCodes.OPERATION_FAILED, { message, requestId }),

  // 429 Too Many Requests
  rateLimited: (requestId?: string) =>
    error(ErrorCodes.RATE_LIMITED, { requestId }),

  tooManyRequests: (requestId?: string) =>
    error(ErrorCodes.TOO_MANY_REQUESTS, { requestId }),

  // 507 Insufficient Storage
  storageExceeded: (requestId?: string) =>
    error(ErrorCodes.STORAGE_EXCEEDED, { requestId }),

  // 500 Internal Server Error
  internal: (message?: string, requestId?: string) =>
    error(ErrorCodes.INTERNAL_ERROR, { message, requestId }),

  // 502 Bad Gateway
  externalError: (service?: string, requestId?: string) =>
    error(ErrorCodes.EXTERNAL_SERVICE_ERROR, {
      message: service ? `${service}服务错误` : '外部服务错误',
      requestId,
    }),

  databaseError: (requestId?: string) =>
    error(ErrorCodes.DATABASE_ERROR, { requestId }),

  // 503 Service Unavailable
  unavailable: (message?: string, requestId?: string) =>
    error(ErrorCodes.SERVICE_UNAVAILABLE, { message, requestId }),
};

// ============================================================
// Prisma 错误处理
// ============================================================

/**
 * 处理 Prisma 错误，转换为统一错误响应
 */
export function handlePrismaError(
  error: unknown,
  requestId?: string
): NextResponse {
  console.error('Prisma Error:', error);

  if (error instanceof Error) {
    // 唯一约束冲突
    if (error.message.includes('Unique constraint')) {
      if (error.message.includes('username')) {
        return errors.usernameExists(requestId);
      }
      if (error.message.includes('email')) {
        return errors.emailExists(requestId);
      }
      return errors.conflict('数据已存在', requestId);
    }

    // 记录不存在
    if (
      error.message.includes('Record to update not found') ||
      error.message.includes('No record found') ||
      error.message.includes('Record does not exist')
    ) {
      return errors.notFound('资源', requestId);
    }

    // 外键约束
    if (error.message.includes('Foreign key constraint')) {
      return errors.badRequest('关联资源不存在', requestId);
    }
  }

  return errors.internal('数据库操作失败', requestId);
}

// ============================================================
// 请求 ID 提取
// ============================================================

/**
 * 从请求头提取 Request ID
 */
export function getRequestId(request: Request): string | undefined {
  return request.headers.get(REQUEST_ID_HEADER) || undefined;
}
