export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  created,
  errors,
  handlePrismaError,
  getRequestId,
  validationError,
  type ApiErrorDetail,
} from '@/lib/api/v1';
import {
  signAccessToken,
  signRefreshToken,
  getClientIP,
} from '@/lib/auth';

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

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

// 输入校验函数（与 security.ts 中的 validateUsername 保持一致）
function isValidUsername(username: string): boolean {
  // 3-20 字符，只能包含字母、数字和下划线，不能以数字开头
  if (username.length < 3 || username.length > 20) {
    return false;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return false;
  }
  if (/^[0-9]/.test(username)) {
    return false;
  }
  return true;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

// POST /api/v1/auth/register
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body: RegisterRequest = await req.json();
    const { username, email, password } = body;

    // 收集验证错误
    const validationErrors: ApiErrorDetail[] = [];

    if (!username) {
      validationErrors.push({
        field: 'username',
        message: '用户名不能为空',
        code: 1001,
      });
    } else if (!isValidUsername(username)) {
      validationErrors.push({
        field: 'username',
        message: '用户名长度需在 1-39 位之间',
        code: 1002,
      });
    }

    if (!email) {
      validationErrors.push({
        field: 'email',
        message: '邮箱不能为空',
        code: 1001,
      });
    } else if (!isValidEmail(email)) {
      validationErrors.push({
        field: 'email',
        message: '邮箱格式不正确',
        code: 1002,
      });
    }

    if (!password) {
      validationErrors.push({
        field: 'password',
        message: '密码不能为空',
        code: 1001,
      });
    } else if (!isValidPassword(password)) {
      validationErrors.push({
        field: 'password',
        message: '密码至少 8 位，必须包含字母和数字',
        code: 1002,
      });
    }

    if (validationErrors.length > 0) {
      return validationError(validationErrors, requestId);
    }

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
        return errors.usernameExists(requestId);
      }
      return errors.emailExists(requestId);
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 12);

    // 生成下一个 uid（9位顺序编号）
    const lastUser = await prisma.user.findFirst({
      where: { uid: { not: null } },
      orderBy: { uid: 'desc' },
      select: { uid: true },
    });
    const nextUid = lastUser?.uid
      ? String(parseInt(lastUser.uid, 10) + 1).padStart(9, '0')
      : '000000001';

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
        uid: nextUid,
      },
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

    return created(userResponse, '注册成功', requestId);
  } catch (error) {
    console.error('[v1/auth/register] Error:', error);
    return handlePrismaError(error, requestId);
  }
}
