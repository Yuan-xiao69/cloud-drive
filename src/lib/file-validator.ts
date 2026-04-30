/**
 * 文件安全验证模块
 * 提供文件类型、内容、名称等多层验证
 */

import {
  validateFileName,
  validateFileExtension,
  validateFileSize,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  DANGEROUS_FILE_TYPES,
} from './security';

// Magic bytes 签名映射
const MAGIC_BYTES: Record<string, { signatures: Array<{ bytes: number[]; offset?: number }>; mime: string }> = {
  'image/jpeg': {
    signatures: [
      { bytes: [0xFF, 0xD8, 0xFF] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xDB] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xE0] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xE1] },
      { bytes: [0xFF, 0xD8, 0xFF, 0xEE] },
    ],
    mime: 'image/jpeg',
  },
  'image/png': {
    signatures: [
      { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    ],
    mime: 'image/png',
  },
  'image/gif': {
    signatures: [
      { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
      { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
    ],
    mime: 'image/gif',
  },
  'image/webp': {
    signatures: [
      { bytes: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50] }, // RIFF....WEBP
    ],
    mime: 'image/webp',
  },
  'image/svg+xml': {
    signatures: [
      { bytes: [0x3C, 0x73, 0x76, 0x67] }, // <svg
    ],
    mime: 'image/svg+xml',
  },
  'application/pdf': {
    signatures: [
      { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    ],
    mime: 'application/pdf',
  },
  'application/zip': {
    signatures: [
      { bytes: [0x50, 0x4B, 0x03, 0x04] },
      { bytes: [0x50, 0x4B, 0x05, 0x06] },
      { bytes: [0x50, 0x4B, 0x07, 0x08] },
    ],
    mime: 'application/zip',
  },
  'application/gzip': {
    signatures: [
      { bytes: [0x1F, 0x8B] },
    ],
    mime: 'application/gzip',
  },
  'application/msword': {
    signatures: [
      { bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }, // OLE2 Compound Document
    ],
    mime: 'application/msword',
  },
};

/**
 * 通过 Magic Bytes 检测文件真实类型
 */
export async function detectFileType(buffer: Buffer): Promise<string | null> {
  for (const [mime, config] of Object.entries(MAGIC_BYTES)) {
    for (const signature of config.signatures) {
      const offset = signature.offset || 0;
      const bytes = signature.bytes;

      let match = true;
      for (let i = 0; i < bytes.length; i++) {
        if (buffer[offset + i] !== bytes[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        return mime;
      }
    }
  }

  return null;
}

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  warnings?: string[];
}

/**
 * 文件类型验证选项
 */
export interface FileValidationOptions {
  allowedTypes?: string[];           // 允许的 MIME 类型列表
  maxSize?: number;                   // 最大文件大小
  maxSizeForImages?: number;          // 图片最大大小（单独限制）
  maxSizeForDocuments?: number;       // 文档最大大小（单独限制）
  checkMagicBytes?: boolean;          // 是否检查 Magic Bytes
  checkExtension?: boolean;           // 是否检查扩展名
  allowSvg?: boolean;                  // 是否允许 SVG（可能包含 XSS）
  allowHtml?: boolean;                // 是否允许 HTML（可能包含 XSS）
}

/**
 * 验证文件
 * 综合验证：MIME 类型、扩展名、Magic Bytes、文件大小
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const warnings: string[] = [];
  const {
    allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES],
    maxSize = 100 * 1024 * 1024, // 默认 100MB
    maxSizeForImages = 10 * 1024 * 1024, // 图片默认 10MB
    maxSizeForDocuments = 50 * 1024 * 1024, // 文档默认 50MB
    checkMagicBytes = true,
    checkExtension = true,
    allowSvg = false,
    allowHtml = false,
  } = options;

  // 1. 验证文件名
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    return { valid: false, error: nameValidation.error };
  }

  // 2. 验证文件大小
  let effectiveMaxSize = maxSize;
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'md'];

  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (imageExts.includes(ext)) {
    effectiveMaxSize = Math.min(effectiveMaxSize, maxSizeForImages);
  } else if (docExts.includes(ext)) {
    effectiveMaxSize = Math.min(effectiveMaxSize, maxSizeForDocuments);
  }

  const sizeValidation = validateFileSize(file.size, effectiveMaxSize);
  if (!sizeValidation.valid) {
    return { valid: false, error: sizeValidation.error };
  }

  // 3. 验证 MIME 类型
  const mimeType = file.type.toLowerCase();

  // 危险类型直接拒绝
  if (DANGEROUS_FILE_TYPES.includes(mimeType)) {
    return { valid: false, error: '禁止上传可执行文件' };
  }

  // SVG 和 HTML 需要额外注意
  if (mimeType === 'image/svg+xml' && !allowSvg) {
    return { valid: false, error: 'SVG 文件已被禁用，请联系管理员' };
  }

  if ((mimeType === 'text/html' || mimeType === 'application/xhtml+xml') && !allowHtml) {
    return { valid: false, error: 'HTML 文件已被禁用' };
  }

  // 4. 通过 Magic Bytes 验证文件真实性
  let detectedType: string | undefined;

  if (checkMagicBytes) {
    const buffer = Buffer.from(await file.arrayBuffer());

    // 如果 MIME 类型不在允许列表中，尝试用 Magic Bytes 检测
    if (!allowedTypes.includes(mimeType)) {
      const detected = await detectFileType(buffer);
      if (detected && allowedTypes.includes(detected)) {
        // Magic Bytes 检测到允许的类型
        detectedType = detected;
        warnings.push(`文件类型被修正为: ${detected}`);
      } else if (detected) {
        // Magic Bytes 检测到不允许的类型
        return { valid: false, error: `文件类型不匹配，检测到: ${detected}` };
      } else {
        return { valid: false, error: '无法识别文件类型' };
      }
    } else {
      // MIME 类型在允许列表中，验证 Magic Bytes
      const detected = await detectFileType(buffer);
      if (detected && detected !== mimeType) {
        // Magic Bytes 与 MIME 类型不匹配
        if (allowedTypes.includes(detected)) {
          detectedType = detected;
          warnings.push(`文件类型被修正为: ${detected}`);
        } else {
          return {
            valid: false,
            error: `文件类型不匹配，期望: ${mimeType}, 实际: ${detected}`
          };
        }
      }
    }

    // SVG 特殊检查：确保不包含恶意脚本
    if (detectedType === 'image/svg+xml' || mimeType === 'image/svg+xml') {
      const content = buffer.toString('utf-8');
      if (content.includes('<script') || content.includes('javascript:') ||
          content.includes('onerror') || content.includes('onclick')) {
        return { valid: false, error: 'SVG 文件包含潜在恶意内容' };
      }
    }

    // HTML 特殊检查
    if (detectedType === 'text/html' || mimeType === 'text/html') {
      const content = buffer.toString('utf-8');
      if (content.includes('<script') || content.includes('javascript:')) {
        return { valid: false, error: 'HTML 文件包含潜在恶意内容' };
      }
    }
  }

  // 5. 验证扩展名
  if (checkExtension) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = allowedTypes
      .filter(t => t.startsWith('image/') || t.startsWith('application/') || t.startsWith('text/'))
      .map(t => {
        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg,jpeg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/svg+xml': 'svg',
          'application/pdf': 'pdf',
          'application/msword': 'doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
          'text/plain': 'txt',
          'text/markdown': 'md',
        };
        return extMap[t] || '';
      })
      .flat()
      .filter(Boolean);

    const extValidation = validateFileExtension(file.name, allowedExts);
    if (!extValidation.valid) {
      return { valid: false, error: extValidation.error };
    }
  }

  return {
    valid: true,
    detectedType,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * 头像上传验证
 * 专门用于头像上传的安全验证
 */
export async function validateAvatar(file: File): Promise<FileValidationResult> {
  const result = await validateFile(file, {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeForImages: 5 * 1024 * 1024, // 5MB
    checkMagicBytes: true,
    allowSvg: false,
  });

  // 头像额外检查：检查图片尺寸
  if (result.valid) {
    try {
      const img = await loadImage(file);
      if (img.width < 50 || img.height < 50) {
        return { valid: false, error: '头像图片尺寸不能小于 50x50 像素' };
      }
      if (img.width > 4096 || img.height > 4096) {
        return { valid: false, error: '头像图片尺寸不能超过 4096x4096 像素' };
      }
    } catch {
      // 图片尺寸检查失败，忽略（可能不是图片）
    }
  }

  return result;
}

/**
 * 加载图片获取尺寸
 */
function loadImage(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('无法加载图片'));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 仓库文件上传验证
 */
export async function validateRepoFile(
  file: File,
  options: {
    allowCode?: boolean;
    maxSize?: number;
  } = {}
): Promise<FileValidationResult> {
  const { allowCode = true, maxSize = 50 * 1024 * 1024 } = options;

  const allowedTypes = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
  ];

  // 如果允许代码文件
  if (allowCode) {
    allowedTypes.push(
      'text/x-python',
      'text/x-java',
      'text/x-csrc',
      'text/x-c++src',
      'text/x-javascript',
      'text/typescript',
      'application/json',
      'application/xml',
      'application/javascript',
    );
  }

  const result = await validateFile(file, {
    allowedTypes,
    maxSize,
    checkMagicBytes: true,
    allowSvg: false, // 仓库文件也需要安全检查
  });

  return result;
}

/**
 * 安全读取文件内容
 * 用于预览文件内容时防止 XSS
 */
export async function safeReadFileContent(
  file: File,
  options: {
    maxSize?: number;
    encoding?: BufferEncoding;
  } = {}
): Promise<{ content: string; truncated: boolean }> {
  const { maxSize = 1024 * 1024, encoding = 'utf-8' } = options;

  if (file.size > maxSize) {
    // 只读取前 maxSize 字节
    const slice = file.slice(0, maxSize);
    const content = await slice.text();
    return { content, truncated: true };
  }

  const content = await file.text();
  return { content, truncated: false };
}
