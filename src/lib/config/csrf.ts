/**
 * CSRF 配置 — 单一真相源
 *
 * 所有跨站请求伪造（CSRF）相关的配置统一在此文件中定义。
 * 本文件替代以下三处重复的 CSRF 配置：
 *
 *   1. src/middleware.ts        — CSRF_EXEMPT_PATHS、isCsrfExempt()、isSameOrigin()
 *   2. src/lib/csrf.ts          — CSRF_WHITELIST、SENSITIVE_OPERATIONS
 *   3. src/lib/security-config.ts — CSRF_WHITELIST、SENSITIVE_OPERATIONS
 *
 * 后续任何需要 CSRF 豁免路径或敏感操作配置的模块，均应从此文件导入，
 * 不得在各自模块中重新定义。
 *
 * @module lib/config/csrf
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 敏感操作的配置项 */
export interface SensitiveOperationConfig {
  /** 操作的中文描述 */
  action: string;
  /** 是否需要验证密码 */
  requirePassword: boolean;
  /** 是否需要用户二次确认 */
  requireConfirm: boolean;
  /** 是否需要记录审计日志 */
  auditLog: boolean;
}

/** 敏感操作映射表：操作键 → 配置 */
export type SensitiveOperationsMap = Record<string, SensitiveOperationConfig>;

// ============================================================================
// CSRF 豁免路径
// ============================================================================

/**
 * CSRF 豁免路径列表
 *
 * 这些路径上的 POST / PUT / PATCH / DELETE 请求将跳过 CSRF Origin 校验。
 * 适用于以下场景：
 *   - 健康检查 / 文档端点
 *   - SSE 长连接（无法携带自定义请求头）
 *   - Token 刷新 / 登出（使用 Cookie 而非 Origin 做认证）
 *   - 外部分享链接 / Webhook 回调（来源不可控）
 *
 * 合并自 middleware.ts、csrf.ts、security-config.ts 三处的原有定义。
 */
export const CSRF_EXEMPT_PATHS: readonly string[] = [
  // ── 系统端点 ──
  '/api/health',
  '/api/docs',

  // ── SSE 通知流 ──
  '/api/v1/notifications/stream',

  // ── 认证相关（依赖 Cookie） ──
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',

  // ── 个人设置（依赖 Cookie 认证） ──
  '/api/v1/me/',

  // ── 管理后台（依赖 Cookie 认证） ──
  '/api/v1/admin/',

  // ── 外部访问 ──
  '/api/v1/share/',
  '/api/v1/webhooks/',

  // ── 仓库 API ──
  '/api/v1/repos/',
];

// ============================================================================
// CSRF 路径检查
// ============================================================================

/**
 * 判断给定路径是否免于 CSRF 校验
 *
 * @param pathname — 请求路径（如 req.nextUrl.pathname）
 * @returns 如果路径匹配任一豁免模式则返回 true
 *
 * @example
 * isCsrfExempt('/api/health')           // true
 * isCsrfExempt('/api/repos/123/issues') // true（前缀匹配）
 * isCsrfExempt('/api/users/me')         // false
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some((pattern) => pathname.startsWith(pattern));
}

// ============================================================================
// Origin 同源校验
// ============================================================================

/**
 * 判断请求来源是否与服务器同源
 *
 * 用于 CSRF 防御的第一道检查：如果请求的 Origin 头与 Host 头不一致，
 * 说明这是一个跨站请求，应当拒绝。
 *
 * @param origin  — 请求的 Origin 头（如 "https://example.com"）
 * @param host    — 请求的 Host 头（如 "example.com"）
 * @returns 若 Origin 与 Host 匹配（含子域名）则返回 true
 *
 * @example
 * isSameOrigin('https://example.com', 'example.com')         // true
 * isSameOrigin('https://sub.example.com', 'example.com')     // true（子域名）
 * isSameOrigin('https://evil.com', 'example.com')            // false
 * isSameOrigin('https://example.com', null)                  // false（缺少 Host 头）
 */
export function isSameOrigin(origin: string, host: string | null): boolean {
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    // 精确匹配或子域名匹配
    return originUrl.host === host || originUrl.host.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

// ============================================================================
// 敏感操作配置
// ============================================================================

/**
 * 敏感操作映射表
 *
 * 定义系统中需要额外安全验证的操作。
 * 每个操作可配置：
 *   - requirePassword：是否要求用户重新输入密码
 *   - requireConfirm：是否要求用户输入确认文本（如「确认删除」）
 *   - auditLog：  是否写入审计日志
 *
 * 源自 src/lib/csrf.ts，统一至此作为单一真相源。
 */
export const SENSITIVE_OPERATIONS: SensitiveOperationsMap = {
  /** 删除账号 — 需要密码验证和二次确认，记录审计 */
  deleteAccount: {
    action: '删除账号',
    requirePassword: true,
    requireConfirm: true,
    auditLog: true,
  },

  /** 转移仓库所有权 — 需要密码验证和二次确认，记录审计 */
  transferOwnership: {
    action: '转移仓库所有权',
    requirePassword: true,
    requireConfirm: true,
    auditLog: true,
  },

  /** 删除仓库 — 需要二次确认，记录审计 */
  deleteRepository: {
    action: '删除仓库',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },

  /** 修改邮箱 — 需要密码验证，记录审计 */
  changeEmail: {
    action: '修改邮箱',
    requirePassword: true,
    requireConfirm: false,
    auditLog: true,
  },

  /** 修改密码 — 需要密码验证，记录审计 */
  changePassword: {
    action: '修改密码',
    requirePassword: true,
    requireConfirm: false,
    auditLog: true,
  },

  /** 封禁用户（管理员操作） — 需要二次确认，记录审计 */
  banUser: {
    action: '封禁用户',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },

  /** 解封用户（管理员操作） — 需要二次确认，记录审计 */
  unbanUser: {
    action: '解封用户',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
};
