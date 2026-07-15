export const dynamic = 'force-dynamic';

/**
 * 检查仓库名称可用性 API
 * GET /api/v1/repos/check-name?name=xxx
 *
 * 返回 data: true  => 名称可用
 * 返回 data: false => 名称已被当前用户占用
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, user }) => {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errors.badRequest('缺少参数: name');
    }

    const nameTrimmed = name.trim();

    // 基本格式校验（与创建仓库时保持一致）
    const nameRegex = /^[a-zA-Z0-9._-一-龥]+$/;
    if (nameTrimmed.length > 100) {
      return success(false, '仓库名称长度不能超过 100 个字符');
    }
    if (!nameRegex.test(nameTrimmed)) {
      return success(false, '仓库名称格式不合法');
    }

    // 查询当前用户下是否已存在同名仓库（未被软删除）
    const existing = await prisma.repository.findFirst({
      where: {
        ownerId: user!.id,
        name: nameTrimmed,
        deletedAt: null,
      },
      select: { id: true },
    });

    return success(existing === null, existing === null ? '名称可用' : '仓库名已被占用');
  },
});
