/**
 * 安全中间件配置
 * 为 Next.js API 路由提供统一的安全防护
 */
import { NextRequest, NextResponse } from 'next/server';
import { CSP_HEADER, validateFileName, validateFilePath } from './security';

/**
 * 安全响应头配置
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers);

  Object.entries(CSP_HEADER).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // 额外的安全头
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('X-Download-Options', 'noopen');
  headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * 速率限制配置
 */
export const RATE_LIMITS = {
  // 默认速率限制
  default: {
    windowMs: 60 * 1000, // 1 分钟
    max: 100, // 100 次请求
  },
  // 登录相关
  auth: {
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 10, // 10 次尝试
  },
  // 注册相关
  register: {
    windowMs: 60 * 60 * 1000, // 1 小时
    max: 5, // 5 次注册
  },
  // 文件上传
  upload: {
    windowMs: 60 * 1000, // 1 分钟
    max: 20, // 20 次上传
  },
  // 搜索
  search: {
    windowMs: 60 * 1000, // 1 分钟
    max: 30, // 30 次搜索
  },
  // API 通用
  api: {
    windowMs: 60 * 1000, // 1 分钟
    max: 60, // 60 次请求
  },
} as const;

/**
 * 需要认证的路径模式
 */
export const PROTECTED_PATHS = [
  '/api/repos/',
  '/api/discussions/',
  '/api/comments/',
  '/api/notifications/',
  '/api/users/',
  '/api/admin/',
];

/**
 * 检查路径是否需要认证
 */
export function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some((pattern) => path.startsWith(pattern));
}

/**
 * 需要管理员权限的路径模式
 */
export const ADMIN_PATHS = ['/api/admin/'];

/**
 * 检查路径是否需要管理员权限
 */
export function isAdminPath(path: string): boolean {
  return ADMIN_PATHS.some((pattern) => path.startsWith(pattern));
}

/**
 * CSRF 白名单配置
 */
export const CSRF_WHITELIST = [
  // 公开 API
  '/api/health',
  '/api/docs',
  '/api/search',
  '/api/repos/', // GET 请求
  // 分享链接
  '/api/share/',
  // 公开讨论
  '/api/discussions', // GET 请求
  // SSE 通知流
  '/api/notifications/stream',
];

/**
 * 检查是否在 CSRF 白名单中
 */
export function isCsrfWhitelisted(path: string, method: string): boolean {
  // GET、HEAD、OPTIONS 请求不需要 CSRF 验证
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  return CSRF_WHITELIST.some((pattern) => path.startsWith(pattern));
}

/**
 * 验证请求来源
 */
export function validateRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  if (!origin && !referer) {
    return false;
  }

  const host = req.headers.get('host');
  if (!host) {
    return false;
  }

  const allowedHosts = [
    host,
    `localhost:${process.env.PORT || 3000}`,
    '127.0.0.1',
    'localhost',
  ];

  try {
    const originUrl = new URL(origin || referer || '');
    return allowedHosts.some(
      (h) => originUrl.host === h || originUrl.host.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

/**
 * 敏感操作配置
 */
export const SENSITIVE_OPERATIONS = {
  deleteAccount: {
    action: '删除账号',
    requirePassword: true,
    requireConfirm: true,
    auditLog: true,
  },
  transferOwnership: {
    action: '转移仓库所有权',
    requirePassword: true,
    requireConfirm: true,
    auditLog: true,
  },
  deleteRepository: {
    action: '删除仓库',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
  changeEmail: {
    action: '修改邮箱',
    requirePassword: true,
    requireConfirm: false,
    auditLog: true,
  },
  changePassword: {
    action: '修改密码',
    requirePassword: true,
    requireConfirm: false,
    auditLog: true,
  },
  banUser: {
    action: '封禁用户',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
  unbanUser: {
    action: '解封用户',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
  deleteDiscussion: {
    action: '删除讨论',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
} as const;

/**
 * 审计日志操作类型
 */
export const AUDIT_ACTIONS = {
  user: {
    login: '用户登录',
    logout: '用户登出',
    register: '用户注册',
    updateProfile: '更新资料',
    changePassword: '修改密码',
    deleteAccount: '删除账号',
  },
  repository: {
    create: '创建仓库',
    update: '更新仓库',
    delete: '删除仓库',
    fork: 'Fork 仓库',
    star: '收藏仓库',
    watch: '关注仓库',
    transfer: '转移所有权',
  },
  discussion: {
    create: '创建讨论',
    update: '更新讨论',
    delete: '删除讨论',
    close: '关闭讨论',
    reopen: '重新打开讨论',
  },
  comment: {
    create: '创建评论',
    update: '更新评论',
    delete: '删除评论',
  },
  admin: {
    banUser: '封禁用户',
    unbanUser: '解封用户',
    penalty: '处罚用户',
    manageAnnouncement: '管理公告',
    manageBlacklist: '管理黑名单',
  },
} as const;

/**
 * 危险文件扩展名（禁止上传）
 */
export const FORBIDDEN_FILE_EXTENSIONS = [
  // 可执行文件
  'exe', 'bat', 'cmd', 'com', 'msi', 'dll', 'vbs', 'vbe', 'wsf', 'wsh',
  // 脚本文件
  'ps1', 'psm1', 'reg', 'sh', 'bash', 'zsh', 'py', 'pyw', 'php', 'phtml',
  'php3', 'php4', 'php5', 'pl', 'pm', 'cgi', 'rb', 'rake', 'asp', 'aspx',
  // 其他危险类型
  'jar', 'war', 'class', 'pif', 'scf', 'lnk', 'inf', 'scr', 'pif',
];

/**
 * 允许的文件 MIME 类型
 */
export const ALLOWED_UPLOAD_TYPES = [
  // 图片
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // 文本
  'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/csv',
  // 代码
  'application/json', 'application/xml', 'text/javascript', 'application/javascript',
  'text/typescript',
  // 压缩
  'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed',
  'application/gzip', 'application/x-gzip',
];

/**
 * 文件大小限制（字节）
 */
export const FILE_SIZE_LIMITS = {
  avatar: 5 * 1024 * 1024, // 5MB
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  code: 10 * 1024 * 1024, // 10MB
  archive: 100 * 1024 * 1024, // 100MB
  default: 100 * 1024 * 1024, // 100MB
} as const;
