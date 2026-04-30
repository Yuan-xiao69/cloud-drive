export const dynamic = 'force-dynamic';
/**
 * API v1 - 头像上传 API
 * POST /api/v1/users/avatar - 上传头像
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, ErrorCodes } from '@/lib/api/v1';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateAvatar } from '@/lib/file-validator';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '请选择要上传的头像文件' });
    }

    // 使用已有的头像验证函数（Magic Bytes + 尺寸检查）
    const validation = await validateAvatar(file);
    if (!validation.valid) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: validation.error || '头像文件验证失败' });
    }

    // 读取文件为 base64 DataURL（项目无 MinIO/本地文件存储，存入数据库）
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // 更新数据库
    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: { avatarUrl: dataUrl },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    return success({
      avatarUrl: user.avatarUrl,
    }, '头像上传成功');
  } catch (err) {
    return handlePrismaError(err, '头像上传失败');
  }
}
