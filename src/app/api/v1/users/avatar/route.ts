export const dynamic = 'force-dynamic';
/**
 * API v1 - 头像上传 API
 * POST /api/v1/users/avatar - 上传头像
 *
 * 参考 GitHub 做法：每人一个 avatarVersion 计数器
 * 每次上传 +1，存储 key 和访问 URL 包含版本号
 * 浏览器视为新资源，彻底绕过缓存
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, error, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { validateAvatar } from '@/lib/file-validator';
import { putFile, avatarKey, avatarUrl } from '@/lib/storage';

// POST /api/v1/users/avatar - 上传头像（formData，非 JSON）
export const POST = defineRoute({
  auth: 'required',
  async handler({ user, req }) {
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

    // 读取当前版本号，递增
    const currentUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { avatarVersion: true },
    });
    const newVersion = (currentUser?.avatarVersion ?? 0) + 1;

    // 上传到 MinIO，key 含版本号：avatars/{userId}/v{version}
    const arrayBuffer = await file.arrayBuffer();
    const key = avatarKey(user!.id, newVersion);
    await putFile(key, Buffer.from(arrayBuffer), file.type);

    // 数据库同时更新 key 和版本号
    const dbUser = await prisma.user.update({
      where: { id: user!.id },
      data: {
        avatarUrl: key,
        avatarVersion: newVersion,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        avatarVersion: true,
      },
    });

    const url = avatarUrl(user!.id, dbUser.avatarVersion);

    return success({
      avatarUrl: url,
      avatarVersion: dbUser.avatarVersion,
    }, '头像上传成功');
  },
});
