export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis-client';

// POST /api/v1/me/email/verify — 验证验证码并更新邮箱
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    email: z.string().email(),
    code: z.string().length(6, '验证码为 6 位数字'),
  }),
  async handler({ user, body }) {
    const { email, code } = body as { email: string; code: string };

    // 从 Redis 获取验证码
    const redis = await getRedisClient();
    const key = `email_code:${user!.id}`;
    const stored = redis ? await redis.get(key) : null;

    if (!stored) {
      return errors.unauthorized('验证码已过期或未发送');
    }

    const data = JSON.parse(stored) as { email: string; code: string };
    if (data.email !== email.toLowerCase() || data.code !== code) {
      return errors.unauthorized('验证码错误');
    }

    // 再次检查邮箱是否已被占用
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), id: { not: user!.id } },
      select: { id: true },
    });
    if (existing) {
      return errors.conflict('该邮箱已被使用');
    }

    // 更新邮箱
    await prisma.user.update({
      where: { id: user!.id },
      data: { email: email.toLowerCase() },
    });

    // 清除验证码
    if (redis) await redis.del(key);

    return success({ email: email.toLowerCase() }, '邮箱已更新');
  },
});
