/**
 * 安全工具 - XSS 防护、CSRF 防护、输入验证
 * 遵循用户编程准则：严格改动、不降级类型、生产级标准
 * 使用 DOMPurify 进行 XSS 防护（业界标准库）
 */
import DOMPurify from 'isomorphic-dompurify';
import { FORBIDDEN_FILE_EXTENSIONS } from './constants/file-restrictions';

/**
 * XSS 防护：转义 HTML 特殊字符
 * 用于用户输入的转义，防止 XSS 攻击
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return str;

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * XSS 防护：转义 HTML 属性
 * 用于 HTML 属性的转义
 */
export function escapeHtmlAttribute(str: string): string {
  if (typeof str !== 'string') return str;

  const attrEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return str.replace(/[&<>"']/g, (char) => attrEscapes[char] || char);
}

/**
 * XSS 防护：转义 JavaScript 字符串
 */
export function escapeJsString(str: string): string {
  if (typeof str !== 'string') return str;

  const jsEscapes: Record<string, string> = {
    '\\': '\\\\',
    '"': '\\"',
    "'": "\\'",
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\0': '\\0',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  };

  return str.replace(/["'\\\n\r\t\0\u2028\u2029]/g, (char) => jsEscapes[char] || char);
}

/**
 * XSS 防护：转义 URL 参数
 */
export function escapeUrlParam(str: string): string {
  if (typeof str !== 'string') return str;

  try {
    return encodeURIComponent(str);
  } catch {
    return '';
  }
}

/**
 * XSS 防护：使用 DOMPurify 进行 HTML 净化
 * DOMPurify 是业界标准的 XSS 防护库，支持浏览器和服务端
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return html;

  return DOMPurify.sanitize(html, {
    // 允许的标签白名单（注意：input 在 FORBID_TAGS 中已禁止，此处不重复列出）
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'span', 'div',
      'details', 'summary',
    ],
    // 允许的属性白名单
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'class',
      'id', 'data-*',
      'type', 'checked', 'disabled',
      'open',
    ],
    // 强制移除所有 data-* 属性
    ALLOW_DATA_ATTR: false,
    // 禁止 javascript: 协议
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // 完全禁止未知标签
    FORBID_TAGS: ['style', 'link', 'meta', 'noscript', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'option'],
    // 禁止危险事件属性
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress', 'ondblclick', 'oncontextmenu'],
    // 返回纯净的 HTML
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * XSS 防护：净化用户输入的文本（纯文本，不含 HTML）
 * 用于评论、讨论等场景的用户输入
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return text;

  // 移除所有 HTML 标签
  let sanitized = text.replace(/<[^>]*>/g, '');

  // 净化剩余的危险内容
  sanitized = DOMPurify.sanitize(sanitized, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return sanitized;
}

/**
 * XSS 防护：安全渲染 Markdown 内容
 * Markdown 渲染后的 HTML 需要额外净化
 */
export function sanitizeMarkdown(html: string): string {
  if (typeof html !== 'string') return html;

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'strike',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'span', 'div',
      'details', 'summary',
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'class',
      'id', 'data-*',
      'type', 'checked', 'disabled',
      'open',
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus'],
  });
}

/**
 * 验证文件名：防止路径遍历攻击
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: '文件名不能为空' };
  }

  // 移除控制字符
  if (/[\x00-\x1F]/.test(fileName)) {
    return { valid: false, error: '文件名包含非法字符' };
  }

  // 禁止路径遍历和 Windows 路径分隔符
  if (fileName.includes('..') || fileName.includes('/')) {
    return { valid: false, error: '文件名不能包含路径遍历或正斜杠' };
  }
  // 单独检查反斜杠（Windows 路径分隔符）
  if (fileName.includes('\\')) {
    return { valid: false, error: '文件名不能包含反斜杠' };
  }

  // 禁止特殊字符
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(fileName)) {
    return { valid: false, error: '文件名包含非法字符' };
  }

  // 禁止系统保留名称 (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ];
  const baseName = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(baseName)) {
    return { valid: false, error: '文件名是系统保留名称' };
  }

  // 限制长度
  if (fileName.length > 255) {
    return { valid: false, error: '文件名过长' };
  }

  return { valid: true };
}

/**
 * 验证文件路径：防止路径遍历攻击
 */
export function validateFilePath(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '路径不能为空' };
  }

  // 必须以 / 开头
  if (!filePath.startsWith('/')) {
    return { valid: false, error: '路径必须以 / 开头' };
  }

  // 禁止路径遍历
  if (filePath.includes('..')) {
    return { valid: false, error: '禁止路径遍历' };
  }

  // 禁止空路径段
  if (filePath.includes('//')) {
    return { valid: false, error: '路径包含无效段' };
  }

  return { valid: true };
}

/**
 * 验证用户名：字母数字下划线，3-20字符
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: '用户名不能为空' };
  }

  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: '用户名长度需在 3-20 个字符之间' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: '用户名只能包含字母、数字和下划线' };
  }

  if (/^[0-9]/.test(username)) {
    return { valid: false, error: '用户名不能以数字开头' };
  }

  return { valid: true };
}

/**
 * 验证密码强度
 * 返回 { valid, error } 对象，包含详细的验证错误信息
 * 注意：register 路由目前使用内联的简单版本 isValidPassword()，后续可迁移到此处
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: '密码不能为空' };
  }

  if (password.length < 8) {
    return { valid: false, error: '密码长度至少 8 个字符' };
  }

  if (password.length > 128) {
    return { valid: false, error: '密码长度不能超过 128 个字符' };
  }

  // 检查复杂度
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const complexity = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (complexity < 2) {
    return { valid: false, error: '密码需包含字母和数字' };
  }

  // 禁止常见弱密码
  const weakPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin123', 'letmein', 'welcome', 'monkey', 'dragon',
  ];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: '密码强度太弱' };
  }

  return { valid: true };
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: '邮箱不能为空' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: '邮箱格式不正确' };
  }

  if (email.length > 254) {
    return { valid: false, error: '邮箱地址过长' };
  }

  return { valid: true };
}

/**
 * 验证 URL（仅允许 http/https）
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL不能为空' };
  }

  try {
    const parsed = new URL(url);

    // 仅允许 http 和 https 协议
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: '仅支持 http 和 https 链接' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'URL格式不正确' };
  }
}

/**
 * 允许的文件 MIME 类型（图片）
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/**
 * 允许的文件 MIME 类型（文档）
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'application/xml',
];

/**
 * 允许的文件 MIME 类型（压缩包）
 */
export const ALLOWED_ARCHIVE_TYPES = [
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-gzip',
];

/**
 * 危险文件类型（禁止上传）
 */
export const DANGEROUS_FILE_TYPES = [
  'application/javascript',
  'text/javascript',
  'application/x-msdownload',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-python',
  'application/x-php',
  'text/x-php',
  'application/x-perl',
  'text/x-perl',
  'application/x-ruby',
  'text/x-ruby',
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
];

/**
 * 验证文件 MIME 类型
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!mimeType || typeof mimeType !== 'string') {
    return { valid: false, error: '文件类型不能为空' };
  }

  if (!allowedTypes.includes(mimeType)) {
    return { valid: false, error: `不支持的文件类型: ${mimeType}` };
  }

  // 额外检查危险类型
  if (DANGEROUS_FILE_TYPES.includes(mimeType)) {
    return { valid: false, error: '禁止上传可执行文件' };
  }

  return { valid: true };
}

/**
 * 通过文件扩展名验证（作为 MIME 类型的补充验证）
 */
export function validateFileExtension(
  fileName: string,
  allowedExtensions: string[]
): { valid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { valid: false, error: '文件名不能为空' };
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const allowedExts = allowedExtensions.map((e) => e.toLowerCase().replace(/^\\./, ''));

  if (!allowedExts.includes(ext)) {
    return { valid: false, error: `不支持的文件扩展名: .${ext}` };
  }

  // 禁止危险扩展名（单一定义源：lib/constants/file-restrictions）
  if (FORBIDDEN_FILE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `禁止上传 .${ext} 类型的文件` };
  }

  return { valid: true };
}

/**
 * 验证文件大小
 */
export function validateFileSize(
  size: number,
  maxSize: number
): { valid: boolean; error?: string } {
  if (typeof size !== 'number' || size < 0) {
    return { valid: false, error: '文件大小无效' };
  }

  if (size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return { valid: false, error: `文件大小不能超过 ${maxMB}MB` };
  }

  return { valid: true };
}

/**
 * 内容安全策略头
 */
export const CSP_HEADER = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' ws: wss:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-src 'none'",
  ].join('; '),

  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * 生成安全随机字符串
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(randomValues)
    .map((v) => chars[v % chars.length])
    .join('');
}

/**
 * 脱敏敏感信息
 */
export function maskSensitiveData(
  data: string,
  type: 'email' | 'phone' | 'idCard' | 'bankCard'
): string {
  switch (type) {
    case 'email': {
      const [name, domain] = data.split('@');
      if (!name || !domain) return data;
      const maskedName = name.slice(0, 2) + '***';
      return `${maskedName}@${domain}`;
    }
    case 'phone': {
      return data.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    case 'idCard': {
      return data.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
    }
    case 'bankCard': {
      return data.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
    }
    default:
      return data;
  }
}

/**
 * 检查 IP 是否在黑名单中
 * 统一入口，所有 API 路由只需调用此函数
 */
export async function checkIpBlacklist(ip: string): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma');
    const entry = await prisma.iPBlacklist.findFirst({
      where: {
        ipAddress: ip,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { id: true },
    });
    return !!entry;
  } catch {
    return false; // 数据库不可用时放行
  }
}
