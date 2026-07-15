/**
 * 分享链接服务
 *
 * 负责分享链接的创建、访问（原子递增 viewCount）和停用。
 * 密码验证、权限校验和速率限制等 HTTP 层逻辑保留在路由中。
 */

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/** 创建分享链接的参数 */
export interface CreateShareParams {
  repoId: string;
  creatorId: string;
  path?: string | null;
  permission?: string;
  password?: string | null;
  expiresAt?: Date | null;
  maxViews?: number | null;
}

/** 创建分享链接的返回结果 */
export interface CreatedShareLink {
  id: string;
  token: string;
  repoId: string;
  path: string | null;
  permission: string;
  hasPassword: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  creator: { id: string; username: string };
  createdAt: string;
}

export class ShareService {
  /**
   * 生成分享 token（64 字符十六进制）
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 创建分享链接。
   * 生成唯一 token，若传入明文密码则 bcrypt 哈希后存储。
   */
  static async create(params: CreateShareParams): Promise<CreatedShareLink> {
    const token = this.generateToken();

    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        repoId: params.repoId,
        creatorId: params.creatorId,
        path: params.path || null,
        permission: params.permission || 'read',
        password: params.password
          ? await bcrypt.hash(params.password, 10)
          : null,
        expiresAt: params.expiresAt || null,
        maxViews: params.maxViews || null,
        viewCount: 0,
        isActive: true,
      },
      include: {
        creator: { select: { id: true, username: true } },
      },
    });

    return {
      id: shareLink.id,
      token: shareLink.token,
      repoId: shareLink.repoId,
      path: shareLink.path,
      permission: shareLink.permission,
      hasPassword: !!shareLink.password,
      expiresAt: shareLink.expiresAt?.toISOString() ?? null,
      maxViews: shareLink.maxViews,
      viewCount: shareLink.viewCount,
      creator: {
        id: shareLink.creator.id,
        username: shareLink.creator.username,
      },
      createdAt: shareLink.createdAt.toISOString(),
    };
  }

  /**
   * 原子递增分享链接的 viewCount。
   *
   * 使用原生 SQL UPDATE … RETURNING 保证原子性，
   * 同时校验 isActive、有效期和最大浏览次数。
   *
   * @returns 更新后的 viewCount，如果链接已失效/过期/达上限则返回 null
   */
  static async access(
    token: string,
  ): Promise<{ viewCount: number } | null> {
    const updatedRows = await prisma.$queryRawUnsafe<
      Array<{ id: string; viewCount: number }>
    >(
      `UPDATE "ShareLink"
       SET "viewCount" = "viewCount" + 1, "updatedAt" = NOW()
       WHERE "token" = $1
         AND "isActive" = true
         AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
         AND ("maxViews" IS NULL OR "viewCount" < "maxViews")
       RETURNING "id", "viewCount"`,
      token,
    );

    if (!updatedRows || updatedRows.length === 0) {
      return null;
    }

    return { viewCount: updatedRows[0].viewCount };
  }

  /**
   * 停用分享链接（设置 isActive = false）。
   *
   * @returns 停用后的链接摘要；如果链接不存在返回 null；如果已停用返回 alreadyInactive 标记
   */
  static async deactivate(
    token: string,
  ): Promise<{ id: string; isActive: boolean; alreadyInactive?: boolean } | null> {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      select: { id: true, isActive: true },
    });

    if (!shareLink) {
      return null;
    }

    if (!shareLink.isActive) {
      return { id: shareLink.id, isActive: false, alreadyInactive: true };
    }

    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { isActive: false },
    });

    return { id: shareLink.id, isActive: false };
  }
}
