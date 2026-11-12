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
import { checkRateLimit } from '@/lib/rate-limit';

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

// 单个验证码允许的最大错误尝试次数，超过即作废
const MAX_ATTEMPTS = 5;

// POST /api/v1/auth/reset-password
export const POST = defineRoute({
  auth: 'none',
  rateLimit: 'strict',
  validation: resetPasswordSchema,
  async handler({ req, body }) {
    const { email, code, password } = body as ResetPasswordBody;

    const normalizedEmail = email.toLowerCase().trim();

    // 邮箱维度限流：叠加在 IP 维度之上，防止分布式单邮箱爆破验证码
    const emailLimit = await checkRateLimit(req, 'strict', normalizedEmail);
    if (!emailLimit.allowed) {
      return errors.rateLimited();
    }

    // 查找该邮箱最新的未使用且未过期的验证码（不按 code 过滤，以便统计尝试次数）
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email: normalizedEmail,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetRecord) {
      return errors.badRequest('验证码无效或已过期');
    }

    // 尝试次数已达上限，作废该验证码，防止无限穷举 6 位验证码
    if (resetRecord.attempts >= MAX_ATTEMPTS) {
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      });
      return errors.badRequest('验证码尝试次数过多，请重新获取');
    }

    // 验证码不匹配：原子递增尝试次数（仅在未达上限时生效，消除并发窗口）
    if (resetRecord.code !== code) {
      const updated = await prisma.passwordReset.updateMany({
        where: { id: resetRecord.id, attempts: { lt: MAX_ATTEMPTS } },
        data: { attempts: { increment: 1 } },
      });
      // 并发下已达上限时作废该验证码
      if (updated.count === 0) {
        await prisma.passwordReset.update({
          where: { id: resetRecord.id },
          data: { used: true },
        });
      }
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
