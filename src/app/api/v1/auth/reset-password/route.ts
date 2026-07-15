export const dynamic = 'force-dynamic';
/**
 * API v1 - 重置密码
 * POST /api/v1/auth/reset-password - 验证码重置密码
 */

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { invalidateAllTokens } from '@/lib/auth';

// ---- Zod 验证 Schema ----

const resetPasswordSchema = z.object({
  email: z.string().min(1, '邮箱不能为空').email('邮箱格式不正确'),
  code: z.string().regex(/^\d{6}$/, '验证码格式不正确'),
  password: z.string()
    .min(8, '密码长度至少 8 位')
    .regex(/[a-zA-Z]/, '密码必须包含字母')
    .regex(/[0-9]/, '密码必须包含数字'),
});

type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;

// POST /api/v1/auth/reset-password
export const POST = defineRoute({
  auth: 'none',
  rateLimit: 'strict',
  validation: resetPasswordSchema,
  async handler({ body }) {
    const { email, code, password } = body as ResetPasswordBody;

    const normalizedEmail = email.toLowerCase().trim();

    // 验证验证码
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email: normalizedEmail,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      return errors.badRequest('验证码无效或已过期');
    }

    // 更新密码
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    // 标记验证码已使用
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    // 密码重置后使所有旧 Token 立即失效
    await invalidateAllTokens(resetRecord.userId);

    return success(null, '密码已重置，请使用新密码登录');
  },
});
