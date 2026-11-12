export const dynamic = 'force-dynamic';
/**
 * API v1 - 忘记密码
 * POST /api/v1/auth/forgot-password - 发送密码重置验证码
 */

import { z } from 'zod';
import { randomInt } from 'crypto';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/email-service';
import { checkRateLimit } from '@/lib/rate-limit';

// ---- Zod 验证 Schema ----

const forgotPasswordSchema = z.object({
  email: z.string().email('请提供有效的邮箱地址'),
});

// POST /api/v1/auth/forgot-password
export const POST = defineRoute({
  auth: 'none',
  rateLimit: 'strict',
  validation: forgotPasswordSchema,
  async handler({ req, body }) {
    const { email } = body as { email: string };

    // 邮箱维度限流：叠加在 IP 维度之上，防止分布式单邮箱爆破
    const emailLimit = await checkRateLimit(req, 'strict', email.trim().toLowerCase());
    if (!emailLimit.allowed) {
      return errors.rateLimited();
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      // 安全考虑：不暴露用户是否存在，统一返回与存在时相同的文案，防止邮箱枚举
      return success(null, '验证码已发送，请查收邮件');
    }

    // 生成 6 位数字验证码（加密安全随机数）
    const code = String(randomInt(100000, 1000000));

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
