export const dynamic = 'force-dynamic';
/**
 * API v1 - MFA 两步验证 API
 * GET /api/v1/users/mfa - 获取 MFA 状态和设置信息
 * POST /api/v1/users/mfa - MFA 操作（初始化/启用/禁用/验证）
 */

import { TOTP, generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

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

const mfaSchema = z.object({
  action: z.enum(['init', 'enable', 'disable', 'verify']),
  password: z.string().optional(),
  code: z.string().optional(),
});

// GET /api/v1/users/mfa - 获取 MFA 状态和设置信息
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    return success({
      enabled: dbUser?.mfaEnabled ?? false,
      configured: !!dbUser?.mfaSecret,
    });
  },
});

// POST /api/v1/users/mfa - MFA 操作
export const POST = defineRoute({
  auth: 'required',
  validation: mfaSchema,
  async handler({ user, body }) {
    const { action, password, code } = body;

    switch (action) {
      case 'init': {
        // 初始化：生成密钥和二维码
        // 验证密码
        if (!password || !(await verifyPassword(user!.id, password))) {
          return errors.badRequest('密码验证失败');
        }

        // 生成新密钥
        const secret = generateSecret();
        const otpauth = generateURI({
          issuer: 'GitHub Platform',
          label: user!.email || user!.username,
          secret,
          algorithm: 'sha1',
          digits: 6,
          period: 30,
        });

        // 生成二维码
        const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

        // 临时存储密钥（未验证前不保存到数据库）
        await prisma.user.update({
          where: { id: user!.id },
          data: { mfaSecret: secret },
        });

        return success({
          secret,
          qrCode: qrCodeDataUrl,
          otpauth,
        });
      }

      case 'enable': {
        // 启用：验证 TOTP 代码并激活 MFA
        if (!code) {
          return errors.badRequest('请输入验证码');
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user!.id },
          select: { mfaSecret: true },
        });

        if (!dbUser?.mfaSecret) {
          return errors.badRequest('请先初始化 MFA');
        }

        // 验证 TOTP 代码
        const isValid = verify({ token: code, secret: dbUser.mfaSecret, ...totpOptions });
        if (!isValid) {
          return errors.badRequest('验证码错误');
        }

        // 生成恢复码
        const recoveryCodes = generateRecoveryCodes();

        // 启用 MFA（密钥已保存）
        await prisma.user.update({
          where: { id: user!.id },
          data: { mfaEnabled: true },
        });

        return success({
          enabled: true,
          recoveryCodes,
        }, '两步验证已启用，请妥善保管恢复码');
      }

      case 'disable': {
        // 禁用：验证密码和 TOTP 代码
        if (!password || !code) {
          return errors.badRequest('请提供密码和验证码');
        }

        if (!(await verifyPassword(user!.id, password))) {
          return errors.badRequest('密码错误');
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user!.id },
          select: { mfaSecret: true },
        });

        if (!dbUser?.mfaSecret) {
          return errors.badRequest('MFA 未配置');
        }

        // 验证 TOTP 代码
        const isValid = verify({ token: code, secret: dbUser.mfaSecret, ...totpOptions });
        if (!isValid) {
          return errors.badRequest('验证码错误');
        }

        // 禁用 MFA
        await prisma.user.update({
          where: { id: user!.id },
          data: { mfaEnabled: false, mfaSecret: null },
        });

        return success({ enabled: false }, '两步验证已禁用');
      }

      case 'verify': {
        // 验证：仅验证当前代码（用于敏感操作前验证）
        if (!code) {
          return errors.badRequest('请输入验证码');
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: user!.id },
          select: { mfaSecret: true, mfaEnabled: true },
        });

        if (!dbUser?.mfaEnabled || !dbUser?.mfaSecret) {
          return errors.badRequest('MFA 未启用');
        }

        const isValid = verify({ token: code, secret: dbUser.mfaSecret, ...totpOptions });
        if (!isValid) {
          return errors.badRequest('验证码错误');
        }

        return success({ valid: true });
      }
    }
  },
});
