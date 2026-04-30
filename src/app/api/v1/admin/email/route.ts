export const dynamic = 'force-dynamic';
/**
 * v1 邮件配置 API
 * GET /api/v1/admin/email - 获取邮件配置
 * PUT /api/v1/admin/email - 保存邮件配置
 * POST /api/v1/admin/email/test - 测试邮件发送
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { saveEmailConfig, getEmailConfigSafe } from '@/lib/email-service';
import { sendVerificationCode } from '@/lib/email-service';

// GET /api/v1/admin/email - 获取邮件配置
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAdmin(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const config = await getEmailConfigSafe();

    return success({
      configured: !!config,
      type: config?.type || null,
      user: config?.user || null,
    });
  } catch (error) {
    console.error('获取邮件配置失败:', error);
    return errors.internal('服务器错误');
  }
}

// PUT /api/v1/admin/email - 保存邮件配置
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAdmin(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const body = await req.json();
    const { type, host, port, secure, user, pass, from, apiKey } = body;

    if (!type) {
      return errors.badRequest('请选择邮件服务商');
    }

    if (type === 'qq' || type === 'smtp') {
      if (!user || !pass) {
        return errors.badRequest('请填写邮箱地址和密码');
      }
    } else if (type === 'sendgrid' || type === 'mailgun') {
      if (!apiKey || !user) {
        return errors.badRequest('请填写 API Key 和发件人邮箱');
      }
    }

    type EmailProviderType = 'qq' | 'aliyun' | 'sendgrid' | 'mailgun' | 'smtp';
    interface EmailConfig {
      type: EmailProviderType;
      user?: string;
      from?: string;
      apiKey?: string;
      host?: string;
      port?: number;
      secure?: boolean;
      pass?: string;
    }

    const config: EmailConfig = {
      type,
      user,
      from: from || user,
      apiKey,
    };

    if (type === 'smtp' || type === 'qq' || type === 'aliyun') {
      config.host = host;
      config.port = parseInt(String(port)) || (secure ? 465 : 587);
      config.secure = secure ?? true;
      config.pass = pass;
    }

    await saveEmailConfig(config);

    return success(null, '邮件配置已保存');
  } catch (error) {
    console.error('保存邮件配置失败:', error);
    return errors.internal('服务器错误');
  }
}

// POST /api/v1/admin/email/test - 测试邮件发送
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAdmin(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const body = await req.json();
    const { to } = body;

    if (!to) {
      return errors.badRequest('请输入测试邮箱地址');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendVerificationCode(to, code);

    if (result.success) {
      return success(null, '测试邮件发送成功！请检查收件箱。');
    } else {
      return errors.internal(result.error || '发送失败');
    }
  } catch (error) {
    console.error('测试邮件发送失败:', error);
    return errors.internal('服务器错误');
  }
}
