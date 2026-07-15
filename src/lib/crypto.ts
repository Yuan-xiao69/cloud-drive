/**
 * 加密工具模块
 * 使用 AES-256-GCM 算法加密敏感数据
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 获取加密密钥
 * 密钥必须为 32 字节
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY 环境变量未设置，请在 .env 中配置');
  }
  
  // 将密钥转换为 32 字节的 Buffer
  return crypto.scryptSync(key, 'blog-platform-salt', 32);
}

/**
 * 加密字符串
 * @param plaintext 明文
 * @returns 加密后的字符串 (base64: iv:authTag:ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // 格式: iv:authTag:ciphertext (全部 base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 解密字符串
 * @param encryptedText 加密字符串
 * @returns 解密后的明文
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('无效的加密格式');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 检查是否已配置加密密钥
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}
