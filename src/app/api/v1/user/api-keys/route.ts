export const dynamic = 'force-dynamic';
/**
 * v1 用户 API 密钥管理 API
 * GET  /api/v1/user/api-keys - 获取用户的 API 密钥列表
 * POST /api/v1/user/api-keys - 创建新的 API 密钥
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import crypto from 'crypto';

// GET /api/v1/user/api-keys
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        lastIp: true,
        isActive: true,
        createdAt: true,
      },
    });

    return success({ apiKeys });
  } catch (err) {
    return handlePrismaError(err, '获取 API 密钥列表失败');
  }
}

// POST /api/v1/user/api-keys
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const body = await req.json();
    const { name, scopes, expiresInDays } = body;

    if (!name || name.trim().length === 0) {
      return errors.badRequest('请提供密钥名称');
    }

    // 生成 API Key
    const rawKey = `ghp_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 8);

    // 计算过期时间
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: auth.userId,
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes: scopes || ['repo'],
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    // 返回完整密钥（只显示一次）
    return created({
      ...apiKey,
      // 返回原始密钥（只显示一次）
      key: rawKey,
      // 格式化过期时间
      expiresAt: apiKey.expiresAt?.toISOString() || null,
      message: '请妥善保管您的 API 密钥，关闭后将无法再次查看完整密钥',
    }, 'API 密钥创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建 API 密钥失败');
  }
}
