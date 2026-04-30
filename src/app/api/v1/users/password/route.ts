export const dynamic = 'force-dynamic';
/**
 * v1 用户密码修改 API
 * PUT /api/v1/users/password - 修改当前用户密码
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { validateSensitiveOperation } from '@/lib/csrf';

// PUT /api/v1/users/password
export async function PUT(
  req: NextRequest
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 解析请求体
    let body: { currentPassword?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return errors.badRequest('无效的请求体');
    }

    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return errors.badRequest('请提供当前密码和新密码');
    }

    // 验证敏感操作
    const validation = await validateSensitiveOperation(req, 'changePassword', {
      password: currentPassword,
    });

    if (!validation.valid) {
      return errors.forbidden(validation.error || '操作验证失败');
    }

    // 密码强度验证
    if (newPassword.length < 8) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '新密码至少8位' });
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '新密码必须包含字母和数字' });
    }

    // 获取用户
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, passwordHash: true },
    });

    if (!user) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    // 验证当前密码（已在 validateSensitiveOperation 中验证过，但再次验证以确保安全）
    if (user.passwordHash) {
      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return error(ErrorCodes.FORBIDDEN, { message: '当前密码错误' });
      }
    }

    // 生成新密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return success({
      username: user.username,
    }, '密码修改成功');
  } catch (err) {
    return handlePrismaError(err, '密码修改失败');
  }
}
