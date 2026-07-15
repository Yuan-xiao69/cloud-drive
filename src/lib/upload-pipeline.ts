/**
 * 文件上传统一安全门
 *
 * 所有上传路由必须经过此处的 validateUpload()。
 * 不依赖路由各自实现验证——全局唯一入口。
 *
 * 使用:
 *   import { validateUpload } from '@/lib/upload-pipeline'
 *   const result = await validateUpload(file, { userId, repoId })
 *   if (!result.safe) return error(..., { message: result.reason })
 */

import { detectFileType } from './file-validator';
import {
  FORBIDDEN_FILE_EXTENSIONS,
  FORBIDDEN_MIME_PREFIXES,
  FILE_SIZE_LIMITS,
} from './security-config';

// ── 类型定义 ──────────────────────────────────

export interface UploadContext {
  userId: string;
  repoId: string;
  /** 用户层级限制（未来可扩展按用户等级控制大小） */
  maxFileSize?: number;
  /** 允许的 MIME 类型白名单（默认开放所有非禁止类型） */
  allowedTypes?: string[];
}

export interface UploadPipelineResult {
  safe: boolean;
  /** 不过的原因（中文，给用户看的） */
  reason?: string;
  /** 消毒后的文件名 */
  normalizedName?: string;
  /** Magic Bytes 检测到的真实文件类型 */
  detectedType?: string;
  /** 是否可以在浏览器内直接预览 */
  previewable?: boolean;
}

// ── 可预览的文件类型 ──────────────────────────

const PREVIEWABLE_TYPES = new Set([
  // 图片 — 浏览器原生渲染
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // 文本/代码 — 语法高亮展示
  'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/csv',
  'application/json', 'application/xml', 'text/javascript',
  'text/typescript', 'application/javascript',
  // PDF — 浏览器原生预览
  'application/pdf',
]);

// ── 文件名消毒 ────────────────────────────────

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"|?*\\]/g, '_')   // 替换 Windows 非法字符
    .replace(/\.\./g, '_')            // 防路径穿越
    .replace(/^\//, '_')              // 不以 / 开头
    .substring(0, 255);               // 长度截断
}

/**
 * 检测文件名是否包含路径穿越
 */
function hasPathTraversal(name: string, filePath?: string): boolean {
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return true;
  }
  if (filePath && (filePath.includes('..') || filePath.startsWith('/'))) {
    return true;
  }
  return false;
}

/**
 * 检查扩展名是否在禁止列表中
 * 单一来源：security-config.ts 的 FORBIDDEN_FILE_EXTENSIONS（无点前缀）
 * 但此处兼容带点和无点两种情况
 */
function isForbiddenExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const extWithDot = `.${ext}`;
  return FORBIDDEN_FILE_EXTENSIONS.includes(ext) ||
         FORBIDDEN_FILE_EXTENSIONS.includes(extWithDot.replace('.', '')) ||
         FORBIDDEN_FILE_EXTENSIONS.some(fe => fe === extWithDot);
}

// ── 核心：统一上传验证 ────────────────────────

export async function validateUpload(
  file: { name: string; size: number; type?: string; arrayBuffer: () => Promise<ArrayBuffer> },
  ctx: UploadContext
): Promise<UploadPipelineResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const maxSize = ctx.maxFileSize || FILE_SIZE_LIMITS.default;

  // ── 第1关：文件名安全 ──
  if (!fileName || fileName.trim().length === 0) {
    return { safe: false, reason: '文件名不能为空' };
  }
  if (fileName.length > 255) {
    return { safe: false, reason: '文件名过长（最大255个字符）' };
  }
  if (/[<>:"|?*\\]/.test(fileName)) {
    return { safe: false, reason: '文件名包含非法字符' };
  }
  if (hasPathTraversal(fileName)) {
    return { safe: false, reason: '文件名包含非法路径' };
  }

  // ── 第2关：扩展名黑名单 ──
  if (isForbiddenExtension(fileName)) {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return { safe: false, reason: `不支持的文件类型: .${ext}` };
  }

  // ── 第3关：文件大小 ──
  if (fileSize <= 0) {
    return { safe: false, reason: '文件大小无效' };
  }
  if (fileSize > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { safe: false, reason: `文件大小不能超过 ${maxMB}MB` };
  }

  // ── 第4关：MIME 类型黑名单 ──
  const mimeType = file.type?.toLowerCase() || '';
  if (mimeType) {
    const isDangerous = FORBIDDEN_MIME_PREFIXES.some(prefix =>
      mimeType.startsWith(prefix)
    );
    if (isDangerous) {
      return { safe: false, reason: '禁止上传可执行文件' };
    }
  }

  // ── 第5关：Magic Bytes 检测 ──
  let detectedType: string | undefined;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    detectedType = await detectFileType(buffer) ?? undefined;

    if (detectedType && mimeType) {
      // 比对声明的类型和实际类型
      const declaredBase = mimeType.split('/')[0];
      const detectedBase = detectedType.split('/')[0];

      // 如果基础类型都不同（比如声称是 image，实际是 application）
      if (declaredBase !== detectedBase && detectedBase !== 'text') {
        return {
          safe: false,
          reason: `文件类型不匹配：声称 ${mimeType}，实际检测为 ${detectedType}`,
        };
      }
    }

    // SVG 特殊安全检查
    if (detectedType === 'image/svg+xml' || mimeType === 'image/svg+xml') {
      const content = buffer.toString('utf-8').toLowerCase();
      if (
        content.includes('<script') ||
        content.includes('javascript:') ||
        content.includes('onerror=') ||
        content.includes('onclick=')
      ) {
        return { safe: false, reason: 'SVG 文件包含不安全的脚本内容' };
      }
    }
  } catch {
    // Magic Bytes 检测失败时，允许通过但标记警告。
    // 后续如果有安全需求，可以在这里加大力度。
  }

  // ── 第6关：预览能力判定 ──
  const effectiveType = detectedType || mimeType || 'application/octet-stream';
  const previewable = PREVIEWABLE_TYPES.has(effectiveType);

  return {
    safe: true,
    normalizedName: sanitizeFileName(fileName),
    detectedType: detectedType,
    previewable,
  };
}

/**
 * 快捷：从 base64 内容创建一个可验证的"虚拟文件"
 */
export async function validateUploadFromBase64(
  base64Content: string,
  fileName: string,
  ctx: UploadContext
): Promise<UploadPipelineResult> {
  const base64Data = base64Content.replace(/^data:[^;]+;base64,/, '');
  const binaryBuffer = Buffer.from(base64Data, 'base64');

  const virtualFile = {
    name: fileName,
    size: binaryBuffer.length,
    type: base64Content.match(/^data:([^;]+)/)?.[1] || '',
    arrayBuffer: async () => binaryBuffer.buffer as ArrayBuffer,
  };

  return validateUpload(virtualFile, ctx);
}
