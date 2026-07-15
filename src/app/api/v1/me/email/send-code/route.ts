export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, error, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis-client';
import { randomInt } from 'crypto';

// POST /api/v1/me/email/send-code — 向新邮箱发送验证码
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    email: z.string().email('邮箱格式不正确'),
  }),
  async handler({ user, body }) {
    const { email } = body as { email: string };

    // 检查邮箱是否已被占用
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), id: { not: user!.id } },
      select: { id: true },
    });
    if (existing) {
      return error(ErrorCodes.RESOURCE_EXISTS, { message: '该邮箱已被使用' });
    }

    // 生成 6 位验证码
    const code = String(randomInt(100000, 999999));

    // 存入 Redis，5 分钟有效
    const redis = await getRedisClient();
    const key = `email_code:${user!.id}`;
    if (redis) {
      await redis.setex(key, 300, JSON.stringify({ email: email.toLowerCase(), code }));
    }

    // TODO: 接入邮件服务发送验证码
    // 当前开发阶段验证码返回在响应中（生产环境需移除）
    console.log(`[DEV] 邮箱验证码: ${code} → ${email}`);

    return success({ devCode: code }, '验证码已发送');
  },
});
