/**
 * API v1 错误码定义
 * 采用 4 位数字编码，分类清晰，便于客户端处理
 */

// ============================================================
// 错误码常量
// ============================================================

export const ErrorCodes = {
  // 1xxx 通用错误
  UNKNOWN_ERROR: 1000,
  INVALID_PARAMS: 1001,
  VALIDATION_ERROR: 1002,
  INTERNAL_ERROR: 1003,
  SERVICE_UNAVAILABLE: 1004,

  // 2xxx 认证错误
  UNAUTHORIZED: 2000,
  TOKEN_INVALID: 2001,
  TOKEN_EXPIRED: 2002,
  TOKEN_MISSING: 2003,
  INVALID_CREDENTIALS: 2004,
  ACCOUNT_LOCKED: 2005,
  ACCOUNT_DISABLED: 2006,
  MFA_REQUIRED: 2007,
  MFA_INVALID: 2008,

  // 3xxx 权限错误
  FORBIDDEN: 3000,
  PERMISSION_DENIED: 3001,
  USER_BANNED: 3002,
  REPO_RESTRICTED: 3003,
  ACTION_BLOCKED: 3004,

  // 4xxx 资源错误
  NOT_FOUND: 4000,
  USER_NOT_FOUND: 4001,
  REPO_NOT_FOUND: 4002,
  RESOURCE_EXISTS: 4100,
  USER_EXISTS: 4101,
  EMAIL_EXISTS: 4102,
  USERNAME_EXISTS: 4103,

  // 5xxx 业务错误
  OPERATION_FAILED: 5000,
  COMMENT_NOT_FOUND: 5001,
  INVALID_OPERATION: 5002,
  FORK_NOT_ALLOWED: 5003,
  MERGE_CONFLICT: 5004,
  ISSUE_CLOSED: 5005,
  PR_NOT_MERGEABLE: 5006,
  REVIEW_REQUIRED: 5007,

  // 6xxx 资源限制
  RATE_LIMITED: 6000,
  STORAGE_EXCEEDED: 6001,
  QUOTA_EXCEEDED: 6002,
  FILE_TOO_LARGE: 6003,
  TOO_MANY_REQUESTS: 6004,

  // 7xxx 文件操作错误
  FILE_NOT_FOUND: 7001,
  FILE_EXISTS: 7002,
  DIRECTORY_NOT_EMPTY: 7003,
  INVALID_FILE_TYPE: 7004,

  // 8xxx 社区互动错误
  ALREADY_STARRED: 8001,
  NOT_STARRED: 8002,
  ALREADY_WATCHING: 8003,
  NOT_WATCHING: 8004,
  ALREADY_FOLLOWING: 8005,
  NOT_FOLLOWING: 8006,
  CANNOT_FOLLOW_SELF: 8007,
  ALREADY_LIKED: 8008,
  NOT_LIKED: 8009,
  CANNOT_LIKE_OWN: 8010,

  // 9xxx 外部服务错误
  EXTERNAL_SERVICE_ERROR: 9001,
  MINIO_ERROR: 9002,
  REDIS_ERROR: 9003,
  DATABASE_ERROR: 9004,
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================================
// 错误消息映射
// ============================================================

export const ErrorMessages: Record<ErrorCode, string> = {
  // 1xxx 通用错误
  [ErrorCodes.UNKNOWN_ERROR]: '未知错误',
  [ErrorCodes.INVALID_PARAMS]: '参数无效',
  [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCodes.SERVICE_UNAVAILABLE]: '服务暂时不可用',

  // 2xxx 认证错误
  [ErrorCodes.UNAUTHORIZED]: '未登录或登录已过期',
  [ErrorCodes.TOKEN_INVALID]: 'Token无效',
  [ErrorCodes.TOKEN_EXPIRED]: 'Token已过期，请重新登录',
  [ErrorCodes.TOKEN_MISSING]: '缺少认证Token',
  [ErrorCodes.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCodes.ACCOUNT_LOCKED]: '账户已被锁定',
  [ErrorCodes.ACCOUNT_DISABLED]: '账户已被禁用',
  [ErrorCodes.MFA_REQUIRED]: '需要二次验证',
  [ErrorCodes.MFA_INVALID]: '二次验证码无效',

  // 3xxx 权限错误
  [ErrorCodes.FORBIDDEN]: '禁止访问',
  [ErrorCodes.PERMISSION_DENIED]: '权限不足',
  [ErrorCodes.USER_BANNED]: '用户已被封禁',
  [ErrorCodes.REPO_RESTRICTED]: '仓库操作受限',
  [ErrorCodes.ACTION_BLOCKED]: '操作已被阻止',

  // 4xxx 资源错误
  [ErrorCodes.NOT_FOUND]: '资源不存在',
  [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
  [ErrorCodes.REPO_NOT_FOUND]: '仓库不存在',
  [ErrorCodes.RESOURCE_EXISTS]: '资源已存在',
  [ErrorCodes.USER_EXISTS]: '用户已存在',
  [ErrorCodes.EMAIL_EXISTS]: '邮箱已被注册',
  [ErrorCodes.USERNAME_EXISTS]: '用户名已被占用',

  // 5xxx 业务错误
  [ErrorCodes.OPERATION_FAILED]: '操作失败',
  [ErrorCodes.COMMENT_NOT_FOUND]: '评论不存在',
  [ErrorCodes.INVALID_OPERATION]: '无效操作',
  [ErrorCodes.FORK_NOT_ALLOWED]: '不允许Fork此仓库',
  [ErrorCodes.MERGE_CONFLICT]: '存在合并冲突',
  [ErrorCodes.ISSUE_CLOSED]: 'Issue已关闭',
  [ErrorCodes.PR_NOT_MERGEABLE]: '合并请求无法合并',
  [ErrorCodes.REVIEW_REQUIRED]: '需要审核才能合并',

  // 6xxx 资源限制
  [ErrorCodes.RATE_LIMITED]: '请求过于频繁，请稍后再试',
  [ErrorCodes.STORAGE_EXCEEDED]: '存储空间已用完',
  [ErrorCodes.QUOTA_EXCEEDED]: '配额已用完',
  [ErrorCodes.FILE_TOO_LARGE]: '文件过大',
  [ErrorCodes.TOO_MANY_REQUESTS]: '请求过多',

  // 7xxx 文件操作错误
  [ErrorCodes.FILE_NOT_FOUND]: '文件不存在',
  [ErrorCodes.FILE_EXISTS]: '文件已存在',
  [ErrorCodes.DIRECTORY_NOT_EMPTY]: '目录非空',
  [ErrorCodes.INVALID_FILE_TYPE]: '不支持的文件类型',

  // 8xxx 社区互动错误
  [ErrorCodes.ALREADY_STARRED]: '已经收藏过此仓库',
  [ErrorCodes.NOT_STARRED]: '尚未收藏此仓库',
  [ErrorCodes.ALREADY_WATCHING]: '已经关注此仓库',
  [ErrorCodes.NOT_WATCHING]: '尚未关注此仓库',
  [ErrorCodes.ALREADY_FOLLOWING]: '已经关注过此用户',
  [ErrorCodes.NOT_FOLLOWING]: '尚未关注此用户',
  [ErrorCodes.CANNOT_FOLLOW_SELF]: '不能关注自己',
  [ErrorCodes.ALREADY_LIKED]: '已经点赞过此讨论',
  [ErrorCodes.NOT_LIKED]: '尚未点赞此讨论',
  [ErrorCodes.CANNOT_LIKE_OWN]: '不能点赞自己的讨论',

  // 9xxx 外部服务错误
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCodes.MINIO_ERROR]: '存储服务错误',
  [ErrorCodes.REDIS_ERROR]: '缓存服务错误',
  [ErrorCodes.DATABASE_ERROR]: '数据库错误',
};

// ============================================================
// HTTP 状态码映射
// ============================================================

export const HttpStatusMap: Record<ErrorCode, number> = {
  // 1xxx -> 500
  [ErrorCodes.UNKNOWN_ERROR]: 500,
  [ErrorCodes.INVALID_PARAMS]: 400,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,

  // 2xxx -> 401
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.TOKEN_INVALID]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.TOKEN_MISSING]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.ACCOUNT_LOCKED]: 403,
  [ErrorCodes.ACCOUNT_DISABLED]: 403,
  [ErrorCodes.MFA_REQUIRED]: 401,
  [ErrorCodes.MFA_INVALID]: 401,

  // 3xxx -> 403
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.PERMISSION_DENIED]: 403,
  [ErrorCodes.USER_BANNED]: 403,
  [ErrorCodes.REPO_RESTRICTED]: 403,
  [ErrorCodes.ACTION_BLOCKED]: 403,

  // 4xxx -> 404
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.REPO_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_EXISTS]: 409,
  [ErrorCodes.USER_EXISTS]: 409,
  [ErrorCodes.EMAIL_EXISTS]: 409,
  [ErrorCodes.USERNAME_EXISTS]: 409,

  // 5xxx -> 400
  [ErrorCodes.OPERATION_FAILED]: 400,
  [ErrorCodes.COMMENT_NOT_FOUND]: 404,
  [ErrorCodes.INVALID_OPERATION]: 400,
  [ErrorCodes.FORK_NOT_ALLOWED]: 403,
  [ErrorCodes.MERGE_CONFLICT]: 409,
  [ErrorCodes.ISSUE_CLOSED]: 400,
  [ErrorCodes.PR_NOT_MERGEABLE]: 409,
  [ErrorCodes.REVIEW_REQUIRED]: 400,

  // 6xxx -> 429/413
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.STORAGE_EXCEEDED]: 507,
  [ErrorCodes.QUOTA_EXCEEDED]: 507,
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,

  // 7xxx -> 400/404
  [ErrorCodes.FILE_NOT_FOUND]: 404,
  [ErrorCodes.FILE_EXISTS]: 409,
  [ErrorCodes.DIRECTORY_NOT_EMPTY]: 409,
  [ErrorCodes.INVALID_FILE_TYPE]: 400,

  // 8xxx -> 400/409
  [ErrorCodes.ALREADY_STARRED]: 409,
  [ErrorCodes.NOT_STARRED]: 400,
  [ErrorCodes.ALREADY_WATCHING]: 409,
  [ErrorCodes.NOT_WATCHING]: 400,
  [ErrorCodes.ALREADY_FOLLOWING]: 409,
  [ErrorCodes.NOT_FOLLOWING]: 400,
  [ErrorCodes.CANNOT_FOLLOW_SELF]: 400,
  [ErrorCodes.ALREADY_LIKED]: 409,
  [ErrorCodes.NOT_LIKED]: 400,
  [ErrorCodes.CANNOT_LIKE_OWN]: 400,

  // 9xxx -> 502
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.MINIO_ERROR]: 502,
  [ErrorCodes.REDIS_ERROR]: 502,
  [ErrorCodes.DATABASE_ERROR]: 500,
};

// ============================================================
// 便捷类型定义
// ============================================================

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code: number;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: ApiErrorDetail[];
}

type _EnsureAllErrorCodesInMessages = keyof typeof ErrorMessages extends ErrorCode ? (ErrorCode extends keyof typeof ErrorMessages ? true : never) : never;
type _EnsureAllErrorCodesInHttpStatus = keyof typeof HttpStatusMap extends ErrorCode ? (ErrorCode extends keyof typeof HttpStatusMap ? true : never) : never;
const _compileCheck: _EnsureAllErrorCodesInMessages = true;
const _compileCheck2: _EnsureAllErrorCodesInHttpStatus = true;
