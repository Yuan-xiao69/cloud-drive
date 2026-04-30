# API 版本化方案 (v1)

## 目标
为平台 API 添加版本控制支持，便于：
- API 演进和迭代
- 旧版本兼容和新版本过渡
- 统一错误处理和响应格式

---

## 1. 目录结构

```
src/app/api/
├── v1/                          # 版本化 API (v1)
│   ├── auth/                    # 认证相关
│   │   ├── register/
│   │   ├── login/
│   │   ├── logout/
│   │   ├── refresh/
│   │   ├── me/
│   │   └── forgot-password/
│   ├── users/                   # 用户相关
│   │   ├── check-username/
│   │   ├── notifications/
│   │   └── [username]/
│   ├── repos/                   # 仓库相关
│   │   ├── [username]/[repoName]/
│   │   ├── upload/
│   │   ├── upload-chunked/
│   │   ├── tree/
│   │   ├── share/
│   │   ├── fork/
│   │   ├── fork-request/
│   │   ├── fork-requests/
│   │   ├── star/
│   │   ├── watch/
│   │   ├── stats/
│   │   ├── branches/
│   │   ├── issues/
│   │   ├── pulls/
│   │   ├── discussions/
│   │   └── [username]/[repoName]/
│   │       ├── blob/[...path]/
│   │       ├── raw/[...path]/
│   │       ├── issues/[id]/
│   │       ├── pulls/[id]/
│   │       └── discussions/[id]/
│   ├── discussions/             # 讨论相关
│   ├── notifications/           # 通知相关
│   ├── search/                  # 搜索相关
│   ├── admin/                   # 管理后台
│   └── index.ts                 # 版本信息
│
├── v1.ts                        # 重定向到 v1/index.ts
└── ... (旧版 API 保留作为过渡)
```

---

## 2. 统一响应格式

### 成功响应
```typescript
interface ApiSuccessResponse<T> {
  code: 200 | 201;           // HTTP 状态码
  message: string;           // 成功消息
  data: T;                   // 响应数据
  meta?: {                   // 可选元信息
    version: string;         // API 版本
    timestamp: string;        // 响应时间戳
    requestId?: string;      // 请求追踪 ID
  };
}
```

### 分页响应
```typescript
interface ApiPaginatedResponse<T> {
  code: 200;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      size: number;
      total: number;
      totalPages: number;
    };
  };
  meta: {
    version: string;
    timestamp: string;
  };
}
```

---

## 3. 统一错误码体系

### 错误响应格式
```typescript
interface ApiErrorResponse {
  code: number;              // 业务错误码 (1xxx-9xxx)
  message: string;           // 错误消息
  errors?: ApiErrorDetail[];  // 详细错误信息
  meta?: {
    version: string;
    timestamp: string;
    requestId?: string;
  };
}

interface ApiErrorDetail {
  field?: string;            // 错误字段
  message: string;            // 错误描述
  code: number;               // 字段级错误码
}
```

### 错误码定义

| 范围 | 类别 | 示例 |
|------|------|------|
| **1xxx** | 通用错误 | 系统异常、参数错误等 |
| **2xxx** | 认证错误 | Token无效、Token过期、未登录 |
| **3xxx** | 权限错误 | 无权限、账户被封禁 |
| **4xxx** | 资源错误 | 资源不存在、资源已存在 |
| **5xxx** | 业务错误 | 业务规则违反、操作失败 |
| **6xxx** | 资源限制 | 存储超限、频率限制 |

### 详细错误码

```typescript
// src/lib/api/v1/errors.ts

export const ErrorCodes = {
  // 1xxx 通用错误
  UNKNOWN_ERROR: 1000,
  INVALID_PARAMS: 1001,
  VALIDATION_ERROR: 1002,
  INTERNAL_ERROR: 1003,

  // 2xxx 认证错误
  UNAUTHORIZED: 2000,
  TOKEN_INVALID: 2001,
  TOKEN_EXPIRED: 2002,
  TOKEN_MISSING: 2003,
  INVALID_CREDENTIALS: 2004,
  ACCOUNT_LOCKED: 2005,

  // 3xxx 权限错误
  FORBIDDEN: 3000,
  PERMISSION_DENIED: 3001,
  USER_BANNED: 3002,
  REPO_RESTRICTED: 3003,

  // 4xxx 资源错误
  NOT_FOUND: 4000,
  USER_NOT_FOUND: 4001,
  REPO_NOT_FOUND: 4002,
  RESOURCE_EXISTS: 4100,

  // 5xxx 业务错误
  OPERATION_FAILED: 5000,
  COMMENT_NOT_FOUND: 5001,
  INVALID_OPERATION: 5002,
  FORK_NOT_ALLOWED: 5003,

  // 6xxx 资源限制
  RATE_LIMITED: 6000,
  STORAGE_EXCEEDED: 6001,
  QUOTA_EXCEEDED: 6002,
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.UNKNOWN_ERROR]: '未知错误',
  [ErrorCodes.INVALID_PARAMS]: '参数无效',
  [ErrorCodes.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCodes.UNAUTHORIZED]: '未登录',
  [ErrorCodes.TOKEN_INVALID]: 'Token无效',
  [ErrorCodes.TOKEN_EXPIRED]: 'Token已过期',
  [ErrorCodes.TOKEN_MISSING]: 'Token缺失',
  [ErrorCodes.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCodes.ACCOUNT_LOCKED]: '账户已被锁定',
  [ErrorCodes.FORBIDDEN]: '禁止访问',
  [ErrorCodes.PERMISSION_DENIED]: '权限不足',
  [ErrorCodes.USER_BANNED]: '用户已被封禁',
  [ErrorCodes.REPO_RESTRICTED]: '仓库操作受限',
  [ErrorCodes.NOT_FOUND]: '资源不存在',
  [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
  [ErrorCodes.REPO_NOT_FOUND]: '仓库不存在',
  [ErrorCodes.RESOURCE_EXISTS]: '资源已存在',
  [ErrorCodes.OPERATION_FAILED]: '操作失败',
  [ErrorCodes.COMMENT_NOT_FOUND]: '评论不存在',
  [ErrorCodes.INVALID_OPERATION]: '无效操作',
  [ErrorCodes.FORK_NOT_ALLOWED]: '不允许Fork此仓库',
  [ErrorCodes.RATE_LIMITED]: '请求过于频繁',
  [ErrorCodes.STORAGE_EXCEEDED]: '存储空间已用完',
  [ErrorCodes.QUOTA_EXCEEDED]: '配额已用完',
};
```

---

## 4. 统一响应工具函数

### `src/lib/api/v1/response.ts`

```typescript
import { NextResponse } from 'next/server';
import { ErrorCodes, ErrorMessages, ErrorCode } from './errors';
import { v4 as uuidv4 } from 'uuid'; // 请求追踪 ID

const API_VERSION = '1.0.0';

// 基础响应头
const getHeaders = () => ({
  'X-API-Version': API_VERSION,
  'X-Request-Id': uuidv4(),
  'Content-Type': 'application/json',
});

// 成功响应
export function success<T>(data: T, message = 'success', status = 200) {
  return NextResponse.json({
    code: status,
    message,
    data,
    meta: {
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    },
  }, { status, headers: getHeaders() });
}

// 创建成功
export function created<T>(data: T, message = '创建成功') {
  return success(data, message, 201);
}

// 分页响应
export function paginated<T>(
  items: T[],
  pagination: { page: number; size: number; total: number; totalPages: number },
  message = 'success'
) {
  return NextResponse.json({
    code: 200,
    message,
    data: {
      items,
      pagination,
    },
    meta: {
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    },
  }, { headers: getHeaders() });
}

// 错误响应
export function error(
  code: ErrorCode,
  message?: string,
  details?: { field?: string; message: string; code: number }[],
  status?: number
) {
  const httpStatus = status ?? Math.floor(code / 100) * 100 || 500;
  return NextResponse.json({
    code,
    message: message ?? ErrorMessages[code] ?? '未知错误',
    errors: details,
    meta: {
      version: API_VERSION,
      timestamp: new Date().toISOString(),
    },
  }, { status: httpStatus, headers: getHeaders() });
}

// 便捷错误函数
export const errors = {
  unauthorized: (message?: string) => error(ErrorCodes.UNAUTHORIZED, message, undefined, 401),
  forbidden: (message?: string) => error(ErrorCodes.FORBIDDEN, message, undefined, 403),
  notFound: (resource = '资源') => error(ErrorCodes.NOT_FOUND, `${resource}不存在`, undefined, 404),
  badRequest: (message?: string, details?: any[]) => error(ErrorCodes.INVALID_PARAMS, message, details, 400),
  internal: (message?: string) => error(ErrorCodes.INTERNAL_ERROR, message, undefined, 500),
  rateLimited: () => error(ErrorCodes.RATE_LIMITED, '请求过于频繁，请稍后再试', undefined, 429),
  conflict: (message?: string) => error(ErrorCodes.RESOURCE_EXISTS, message, undefined, 409),
};
```

---

## 5. 实施步骤

### Phase 1: 基础设施 (预计 30 分钟)
1. 创建 `src/lib/api/v1/` 目录
2. 实现错误码定义 (`errors.ts`)
3. 实现响应工具 (`response.ts`)
4. 创建版本信息 (`index.ts`)

### Phase 2: 核心 API 迁移 (预计 2-3 小时)
1. 认证 API (`/api/v1/auth/*`)
2. 用户 API (`/api/v1/users/*`)
3. 仓库 API (`/api/v1/repos/*`)

### Phase 3: 其他 API 迁移 (预计 1-2 小时)
1. 讨论 API
2. 通知 API
3. 搜索 API
4. 管理 API

### Phase 4: 文档与测试 (预计 30 分钟)
1. 更新 Swagger 文档
2. 测试版本切换

---

## 6. 版本协商策略

### 方式 A: URL 路径 (推荐)
```
GET /api/v1/users/username
GET /api/v2/users/username
```

### 方式 B: Header
```
Accept: application/vnd.api+json; version=v1
```

**本方案采用 URL 路径方式**，更直观易用。

---

## 7. 兼容性考虑

- 旧版 API (`/api/*`) 保持可用
- 可在适当时候返回 Deprecation 警告头
- 未来可设置旧版 API 的自动重定向
