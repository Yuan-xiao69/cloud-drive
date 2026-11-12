export const dynamic = 'force-dynamic';
/**
 * v1 邮件配置 API
 * GET /api/v1/admin/email - 获取邮件配置
 * PUT /api/v1/admin/email - 保存邮件配置
 * POST /api/v1/admin/email/test - 测试邮件发送
 */

import { defineRoute } from '@/lib/framework/define-route';
import { randomInt } from 'crypto';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { saveEmailConfig, getEmailConfigSafe } from '@/lib/email-service';
import { sendVerificationCode } from '@/lib/email-service';

// GET /api/v1/admin/email - 获取邮件配置
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const config = await getEmailConfigSafe();

    return success({
      configured: !!config,
      type: config?.type || null,
      user: config?.user || null,
    });
  },
});

// PUT /api/v1/admin/email - 保存邮件配置
export const PUT = defineRoute({
  auth: 'required',
  validation: z.object({
    type: z.string(),
    host: z.string().optional(),
    port: z.union([z.string(), z.number()]).optional(),
    secure: z.boolean().optional(),
    user: z.string().optional(),
    pass: z.string().optional(),
    from: z.string().optional(),
    apiKey: z.string().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { type, host, port, secure, user: emailUser, pass, from, apiKey } = body;

    if (!type) {
      return errors.badRequest('请选择邮件服务商');
    }

    if (type === 'qq' || type === 'smtp') {
      if (!emailUser || !pass) {
        return errors.badRequest('请填写邮箱地址和密码');
      }
    } else if (type === 'sendgrid' || type === 'mailgun') {
      if (!apiKey || !emailUser) {
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
      type: type as EmailProviderType,
      user: emailUser,
      from: from || emailUser,
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
  },
});

// POST /api/v1/admin/email/test - 测试邮件发送
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    to: z.string(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { to } = body;

    const code = randomInt(100000, 1000000).toString();
    const result = await sendVerificationCode(to, code);

    if (result.success) {
      return success(null, '测试邮件发送成功！请检查收件箱。');
    } else {
      return errors.internal(result.error || '发送失败');
    }
  },
});
