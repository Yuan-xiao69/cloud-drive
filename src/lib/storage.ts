/**
 * 对象存储抽象层 — MinIO/S3
 *
 * 所有文件内容从 PostgreSQL content 列迁移到 MinIO。
 * 数据库只存 storagePath，MinIO 存原始字节。
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── 单例 S3 client ───────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKey = process.env.S3_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.S3_SECRET_KEY || 'minioadmin';
  const bucket = process.env.S3_BUCKET || 'github-platform';

  const config: S3ClientConfig = {
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    endpoint,
    forcePathStyle: true, // MinIO requires path-style URLs
  };

  _client = new S3Client(config);
  return _client;
}

function getBucket(): string {
  return process.env.S3_BUCKET || 'github-platform';
}

// ── 核心操作 ─────────────────────────────────

/** 上传文件内容到对象存储，返回存储 key */
export async function putFile(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<string> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body, 'base64') : body,
      ContentType: contentType,
    })
  );
  return key;
}

/** 从对象存储读取文件内容，返回 Buffer */
export async function getFile(key: string): Promise<Buffer | null> {
  try {
    const client = getClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    );
    const body = await res.Body?.transformToByteArray();
    return body ? Buffer.from(body) : null;
  } catch (e: unknown) {
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw e;
  }
}

/** 获取文件流（用于 Streaming） */
export async function getFileStream(key: string): Promise<{ stream: ReadableStream; contentType: string; contentLength: number } | null> {
  try {
    const client = getClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key })
    );
    const stream = res.Body?.transformToWebStream();
    if (!stream) return null;
    return {
      stream,
      contentType: res.ContentType || 'application/octet-stream',
      contentLength: res.ContentLength || 0,
    };
  } catch (e: unknown) {
    if ((e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw e;
  }
}

/** 删除文件 */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
}

/** 复制文件 */
export async function copyFile(sourceKey: string, destKey: string): Promise<void> {
  const client = getClient();
  await client.send(
    new CopyObjectCommand({
      Bucket: getBucket(),
      Key: destKey,
      CopySource: `${getBucket()}/${sourceKey}`,
    })
  );
}

/** 生成预签名下载 URL（有效期10分钟） */
export async function getPresignedUrl(key: string, filename?: string): Promise<string> {
  const client = getClient();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ResponseContentDisposition: filename
        ? `attachment; filename="${encodeURIComponent(filename)}"`
        : undefined,
    }),
    { expiresIn: 600 }
  );
  return url;
}

/** 检查文件是否存在 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ── 存储路径构建 ─────────────────────────────

/** 仓库文件存储 key: repos/{repoId}/files/{branchId}/{fileId} */
export function repoFileKey(repoId: string, branchId: string, fileId: string): string {
  return `repos/${repoId}/files/${branchId}/${fileId}`;
}

/** 头像存储 key: avatars/{userId}/v{version}，版本递增实现缓存破坏 */
export function avatarKey(userId: string, version: number): string {
  return `avatars/${userId}/v${version}`;
}

/** 头像访问 URL：/api/files/avatars/{userId}/v{version}，浏览器通过路径变化自动刷新缓存 */
export function avatarUrl(userId: string, version: number): string {
  return `/api/files/avatars/${userId}/v${version}`;
}

/**
 * 获取头像的对外展示 URL
 * 兼容外部链接（如种子数据中的 GitHub URL）和内部存储 key
 */
export function getAvatarDisplayUrl(avatarUrlValue: string | null | undefined, userId?: string, avatarVersion?: number): string | null {
  if (!avatarUrlValue) return null;
  // 外部链接直传（种子数据等）
  if (avatarUrlValue.startsWith('http://') || avatarUrlValue.startsWith('https://')) {
    return avatarUrlValue;
  }
  // base64 临时预览（上传过程中）
  if (avatarUrlValue.startsWith('data:')) {
    return avatarUrlValue;
  }
  // 已经是完整 API 路径（如上传后返回的 /api/files/avatars/...）
  if (avatarUrlValue.startsWith('/api/files/')) {
    return avatarUrlValue;
  }
  // 内部存储 key，代理为 /api/files/{key}
  return `/api/files/${avatarUrlValue}`;
}

/** 分片存储 key: chunks/{uploadId}/{chunkIndex} */
export function chunkKey(uploadId: string, chunkIndex: number): string {
  return `chunks/${uploadId}/${chunkIndex}`;
}

/** 临时文件 key（合并用） */
export function tempKey(prefix: string, id: string): string {
  return `temp/${prefix}/${id}`;
}
