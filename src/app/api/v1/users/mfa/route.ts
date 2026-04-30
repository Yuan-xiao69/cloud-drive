export const dynamic = 'force-dynamic';
import { TOTP, generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/server';

// TOTP 配置
const totpOptions = {
  window: 1, // 允许 1 个时间窗口的误差
};

// 生成恢复码
function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

// 验证密码
async function verifyPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) return false;

  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, user.passwordHash);
}

// GET: 获取 MFA 状态和设置信息
export async function GET() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    return NextResponse.json({
      code: 200,
      data: {
        enabled: dbUser?.mfaEnabled ?? false,
        configured: !!dbUser?.mfaSecret,
      },
    });
  } catch (error) {
    console.error('MFA GET error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}

// POST: 初始化 MFA 设置 / 验证启用 / 禁用 MFA
export async function POST(request: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, password, code } = body;

    switch (action) {
      case 'init': {
        // 初始化：生成密钥和二维码
        // 验证密码
        if (!password || !(await verifyPassword(user.id, password))) {
          return NextResponse.json({ code: 400, message: '密码验证失败' }, { status: 400 });
        }

        // 生成新密钥
        const secret = generateSecret();
        const otpauth = generateURI({
          issuer: 'GitHub Platform',
          label: user.email || user.username,
          secret,
          algorithm: 'sha1',
          digits: 6,
          period: 30,
        });

        // 生成二维码
        const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

        // 临时存储密钥（未验证前不保存到数据库）
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaSecret: secret },
        });

        return NextResponse.json({
          code: 200,
          data: {
            secret,
            qrCode: qrCodeDataUrl,
            otpauth,
          },
        });
      }

      case 'enable': {
        // 启用：验证 TOTP 代码并激活 MFA
        if (!code) {
          return NextResponse.json({ code: 400, message: '请输入验证码' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { mfaSecret: true },
        });

        if (!dbUser?.mfaSecret) {
          return NextResponse.json({ code: 400, message: '请先初始化 MFA' }, { status: 400 });
        }

        // 验证 TOTP 代码
        const isValid = verify({ token: code, secret: dbUser.mfaSecret, ...totpOptions });
        if (!isValid) {
          return NextResponse.json({ code: 400, message: '验证码错误' }, { status: 400 });
        }

        // 生成恢复码
        const recoveryCodes = generateRecoveryCodes();

        // 启用 MFA（密钥已保存）
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaEnabled: true },
        });

        return NextResponse.json({
          code: 200,
          data: {
            enabled: true,
            recoveryCodes,
            message: '两步验证已启用，请妥善保管恢复码',
          },
        });
      }

      case 'disable': {
        // 禁用：验证密码和 TOTP 代码
        if (!password || !code) {
          return NextResponse.json({ code: 400, message: '请提供密码和验证码' }, { status: 400 });
        }

        if (!(await verifyPassword(user.id, password))) {
          return NextResponse.json({ code: 400, message: '密码错误' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { mfaSecret: true },
        });

        if (!dbUser?.mfaSecret) {
          return NextResponse.json({ code: 400, message: 'MFA 未配置' }, { status: 400 });
        }

        // 验证 TOTP 代码
        const isValid = verify({ token: code, secret: dbUser.mfaSecret, ...totpOptions });
        if (!isValid) {
          return NextResponse.json({ code: 400, message: '验证码错误' }, { status: 400 });
        }

        // 禁用 MFA
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaEnabled: false, mfaSecret: null },
        });

        return NextResponse.json({
          code: 200,
          data: { enabled: false, message: '两步验证已禁用' },
        });
      }

      case 'verify': {
        // 验证：仅验证当前代码（用于敏感操作前验证）
        if (!code) {
          return NextResponse.json({ code: 400, message: '请输入验证码' }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { mfaSecret: true, mfaEnabled: true },
        });

        if (!dbUser?.mfaEnabled || !dbUser?.mfaSecret) {
          return NextResponse.json({ code: 400, message: 'MFA 未启用' }, { status: 400 });
        }

        const isValid = verify({ token: code, secret: dbUser.mfaSecret, ...totpOptions });
        if (!isValid) {
          return NextResponse.json({ code: 400, message: '验证码错误' }, { status: 400 });
        }

        return NextResponse.json({ code: 200, data: { valid: true } });
      }

      default:
        return NextResponse.json({ code: 400, message: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('MFA POST error:', error);
    return NextResponse.json({ code: 500, message: '服务器错误' }, { status: 500 });
  }
}
