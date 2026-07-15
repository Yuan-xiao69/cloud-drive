export const dynamic = 'force-dynamic';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { defineRoute } from '@/lib/framework/define-route';
import { prisma } from '@/lib/prisma';
import { created, errors } from '@/lib/api/v1';

// ---- Zod 验证 Schema ----

const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名长度需在 3-20 位之间')
    .max(20, '用户名长度需在 3-20 位之间')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线')
    .refine(val => /^[a-zA-Z]/.test(val), '用户名不能以数字开头'),
  email: z.string()
    .min(1, '邮箱不能为空')
    .email('邮箱格式不正确'),
  password: z.string()
    .min(8, '密码至少 8 位，必须包含字母和数字')
    .max(128, '密码长度不能超过 128 位')
    .regex(/[a-zA-Z]/, '密码必须包含字母')
    .regex(/[0-9]/, '密码必须包含数字'),
});

type RegisterBody = z.infer<typeof registerSchema>;

interface UserResponse {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/v1/auth/register
export const POST = defineRoute({
  auth: 'none',
  rateLimit: 'strict',
  validation: registerSchema,
  async handler({ body }) {
    const { username, email, password } = body as RegisterBody;

    // 检查唯一性
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: email.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return errors.usernameExists();
      }
      return errors.emailExists();
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 12);

    // 生成下一个 uid（9位顺序编号），使用事务防止并发竞态
    const user = await prisma.$transaction(async (tx) => {
      const lastUser = await tx.user.findFirst({
        where: { uid: { not: null } },
        orderBy: { uid: 'desc' },
        select: { uid: true },
      });
      const nextUid = lastUser?.uid
        ? String(parseInt(lastUser.uid, 10) + 1).padStart(9, '0')
        : '000000001';

      return tx.user.create({
        data: {
          username,
          email: email.toLowerCase(),
          passwordHash,
          uid: nextUid,
        },
      });
    });

    // 格式化用户响应
    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      role: user.role,
      location: user.location ?? undefined,
      website: user.website ?? undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return created(userResponse, '注册成功');
  },
});
