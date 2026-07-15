export const dynamic = 'force-dynamic';
/**
 * API v1 - 忘记密码
 * POST /api/v1/auth/forgot-password - 发送密码重置验证码
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/email-service';

// ---- Zod 验证 Schema ----

const forgotPasswordSchema = z.object({
  email: z.string().email('请提供有效的邮箱地址'),
});

// POST /api/v1/auth/forgot-password
export const POST = defineRoute({
  auth: 'none',
  rateLimit: 'strict',
  validation: forgotPasswordSchema,
  async handler({ body }) {
    const { email } = body as { email: string };

    // 查找用户
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      // 安全考虑：不暴露用户是否存在，统一返回成功
      return success(null, '如果该邮箱已注册，验证码已发送');
    }

    // 生成 6 位数字验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 使之前的验证码失效
    await prisma.passwordReset.updateMany({
      where: { email: user.email, used: false },
      data: { used: true },
    });

    // 保存验证码（15 分钟有效）
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        email: user.email,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // 发送邮件
    await sendVerificationCode(user.email, code);

    return success(null, '验证码已发送，请查收邮件');
  },
});
