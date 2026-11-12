/**
 * 邮件服务抽象层
 * 支持多种邮件服务商，可通过管理面板切换
 * 
 * 支持的服务商：
 * - qq: QQ邮箱 SMTP
 * - aliyun: 阿里云邮件推送
 * - sendgrid: SendGrid API
 * - mailgun: Mailgun API
 * - smtp: 通用 SMTP
 * 
 * 安全说明：
 * - 敏感字段（pass, apiKey, accessKeySecret）使用 AES-256-GCM 加密存储
 * - 需要在 .env 中配置 ENCRYPTION_KEY 环境变量
 */

import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, isEncryptionConfigured } from './crypto';


// 邮件服务商配置类型
export interface EmailProviderConfig {
  type: 'qq' | 'aliyun' | 'sendgrid' | 'mailgun' | 'smtp';
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;       // 加密存储
  from?: string;
  // SendGrid 专用
  apiKey?: string;      // 加密存储
  // 阿里云专用
  accessKeyId?: string;
  accessKeySecret?: string; // 加密存储
  accountName?: string;
}

// 需要加密的敏感字段
const SENSITIVE_FIELDS = ['pass', 'apiKey', 'accessKeySecret'] as const;

/**
 * 加密配置中的敏感字段
 */
function encryptSensitiveFields(config: EmailProviderConfig): EmailProviderConfig {
  const encrypted = { ...config };
  
  for (const field of SENSITIVE_FIELDS) {
    if (encrypted[field]) {
      (encrypted as Record<string, unknown>)[field] = encrypt(String(encrypted[field]));
    }
  }
  
  return encrypted;
}

/**
 * 解密配置中的敏感字段
 */
function decryptSensitiveFields(config: EmailProviderConfig): EmailProviderConfig {
  if (!isEncryptionConfigured()) {
    // 如果没有加密密钥，说明数据未加密（兼容旧数据）
    console.warn('⚠️ 未配置加密密钥，尝试使用明文存储的数据');
    return config;
  }
  
  const decrypted = { ...config };
  
  for (const field of SENSITIVE_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        // 尝试解密
        (decrypted as Record<string, unknown>)[field] = decrypt(decrypted[field] as string);
      } catch {
        // 解密失败，说明可能是旧数据的明文，跳过
        console.warn(`⚠️ 字段 ${field} 解密失败，可能为明文数据`);
      }
    }
  }
  
  return decrypted;
}

// 获取邮件配置（从数据库）
async function getEmailConfig(): Promise<EmailProviderConfig | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'email_provider' },
    });
    
    if (!config) {
      return null;
    }
    
    const parsed = JSON.parse(config.value) as EmailProviderConfig;
    
    // 解密敏感字段
    return decryptSensitiveFields(parsed);
  } catch (error) {
    console.error('获取邮件配置失败:', error);
    return null;
  }
}

// 保存邮件配置到数据库（自动加密敏感字段）
export async function saveEmailConfig(config: EmailProviderConfig): Promise<void> {
  if (!isEncryptionConfigured()) {
    throw new Error('ENCRYPTION_KEY 环境变量未设置，无法安全保存邮件配置。请在 .env 中添加 ENCRYPTION_KEY');
  }

  const configToSave = encryptSensitiveFields(config);
  
  await prisma.systemConfig.upsert({
    where: { key: 'email_provider' },
    create: {
      key: 'email_provider',
      value: JSON.stringify(configToSave),
    },
    update: {
      value: JSON.stringify(configToSave),
    },
  });
}

// QQ邮箱 SMTP 发送
async function sendViaQQSMTP(config: EmailProviderConfig, to: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host || 'smtp.qq.com',
      port: config.port || 465,
      secure: config.secure ?? true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: `"${config.from || '代码平台'}" <${config.user}>`,
      to,
      subject: '【代码平台】密码重置验证码',
      html: generateEmailHTML(code),
      text: `您的验证码是：${code}，15分钟内有效。如非本人操作，请忽略此邮件。`,
    });

    return { success: true };
  } catch (error) {
    console.error('QQ邮箱发送失败:', error);
    return { success: false, error: String(error) };
  }
}

// 阿里云邮件推送
async function sendViaAliyun(config: EmailProviderConfig, to: string, code: string): Promise<{ success: boolean; error?: string }> {
  // 阿里云邮件推送需要使用 API，这里先用 SMTP 方式模拟
  try {
    const transporter = nodemailer.createTransport({
      host: config.host || 'smtp.aliyundm.aliyun.com',
      port: config.port || 465,
      secure: config.secure ?? true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: config.user,
      to,
      subject: '【代码平台】密码重置验证码',
      html: generateEmailHTML(code),
      text: `您的验证码是：${code}，15分钟内有效。如非本人操作，请忽略此邮件。`,
    });

    return { success: true };
  } catch (error) {
    console.error('阿里云邮件发送失败:', error);
    return { success: false, error: String(error) };
  }
}

// SendGrid API 发送
async function sendViaSendGrid(config: EmailProviderConfig, to: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: config.user },
        subject: '【代码平台】密码重置验证码',
        content: [
          { type: 'text/plain', value: `您的验证码是：${code}，15分钟内有效。如非本人操作，请忽略此邮件。` },
          { type: 'text/html', value: generateEmailHTML(code) },
        ],
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    console.error('SendGrid发送失败:', error);
    return { success: false, error: String(error) };
  }
}

// Mailgun API 发送
async function sendViaMailgun(config: EmailProviderConfig, to: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const domain = config.user?.split('@')?.[1]; // Mailgun 使用域名
    const apiKey = config.apiKey;

    if (!domain) {
      return { success: false, error: 'Mailgun 配置缺少有效的 user 字段' };
    }

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        from: config.from || `代码平台 <mailgun@${domain}>`,
        to,
        subject: '【代码平台】密码重置验证码',
        text: `您的验证码是：${code}，15分钟内有效。如非本人操作，请忽略此邮件。`,
        html: generateEmailHTML(code),
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    console.error('Mailgun发送失败:', error);
    return { success: false, error: String(error) };
  }
}

// 通用 SMTP 发送
async function sendViaSMTP(config: EmailProviderConfig, to: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.secure ?? false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: `"${config.from || '代码平台'}" <${config.user}>`,
      to,
      subject: '【代码平台】密码重置验证码',
      html: generateEmailHTML(code),
      text: `您的验证码是：${code}，15分钟内有效。如非本人操作，请忽略此邮件。`,
    });

    return { success: true };
  } catch (error) {
    console.error('SMTP发送失败:', error);
    return { success: false, error: String(error) };
  }
}

// 生成邮件 HTML
function generateEmailHTML(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>密码重置验证码</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background: linear-gradient(135deg, #24292f 0%, #57606a 100%); padding: 32px; text-align: center;">
      <div style="width: 48px; height: 48px; background: #fff; border-radius: 50%; display: inline-block; line-height: 48px; font-size: 24px;">
        🔐
      </div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 16px 0 0 0;">密码重置验证码</h1>
    </div>
    
    <div style="padding: 32px; text-align: center;">
      <p style="color: #57606a; font-size: 14px; margin: 0 0 24px 0;">
        您收到了这封邮件，因为有人请求重置与您的账户关联的密码。
      </p>
      
      <div style="background: #f6f8fa; border: 2px dashed #d0d7de; border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
        <p style="color: #8c959f; font-size: 12px; margin: 0 0 8px 0;">您的验证码</p>
        <p style="color: #24292f; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${code}</p>
      </div>
      
      <p style="color: #57606a; font-size: 14px; margin: 0 0 16px 0;">
        此验证码将在 <strong style="color: #cf222e;">15 分钟</strong>后过期
      </p>
      
      <div style="background: #fffbea; border: 1px solid #e3b341; border-radius: 6px; padding: 12px; margin: 0;">
        <p style="color: #8c6914; font-size: 12px; margin: 0;">
          ⚠️ 如果您没有请求重置密码，请忽略此邮件。您的账户安全不会受到任何影响。
        </p>
      </div>
    </div>
    
    <div style="background: #f6f8fa; padding: 16px; text-align: center; border-top: 1px solid #eaecef;">
      <p style="color: #8c959f; font-size: 12px; margin: 0;">
        此邮件由系统自动发送，请勿回复
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 统一发送接口
export async function sendVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfig();
  
  // 如果没有配置，返回开发模式（日志输出）
  if (!config) {
    // 脱敏邮箱地址
    const maskedEmail = to.replace(/^(.{2}).*(@.+)$/, '$1***$2');
    console.log('\n========================================');
    console.log('📧 [开发模式] 密码重置邮件（未真实发送）');
    console.log('========================================');
    console.log(`📮 收件人: ${maskedEmail}`);
    console.log(`🔢 验证码: 已生成（不记录明文，防止泄露）`);
    console.log(`⏰ 有效期: 15分钟`);
    console.log('========================================');
    console.log('💡 请在管理面板中配置邮件服务以发送真实邮件');
    console.log('========================================\n');
    return { success: true };
  }

  console.log(`\n📧 使用 ${config.type} 发送邮件...`);

  switch (config.type) {
    case 'qq':
      return sendViaQQSMTP(config, to, code);
    case 'aliyun':
      return sendViaAliyun(config, to, code);
    case 'sendgrid':
      return sendViaSendGrid(config, to, code);
    case 'mailgun':
      return sendViaMailgun(config, to, code);
    case 'smtp':
      return sendViaSMTP(config, to, code);
    default:
      return { success: false, error: '未知的邮件服务商' };
  }
}

// 速率限制：每收件人每分钟最多 10 封
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const SEND_RATE_LIMIT = 10;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 每5分钟清理一次过期条目
let lastCleanup = Date.now();

function checkRateLimit(to: string): boolean {
  const now = Date.now();

  // 定期清理过期条目，防止内存泄漏
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(to);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(to, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= SEND_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// 死信队列：失败超过 3 次的任务记录到 Redis
async function moveToDeadLetter(job: { to: string; code: string; attempts?: number; lastError?: string }): Promise<void> {
  try {
    const { getRedisClient } = await import('./redis-client');
    const redis = await getRedisClient();
    if (!redis) return;
    const key = 'email_dead_letter';
    const entry = JSON.stringify({
      to: job.to,
      code: job.code,
      attempts: job.attempts || 3,
      lastError: job.lastError || '未知',
      timestamp: new Date().toISOString(),
    });
    // RPUSH 不支持，用 set 追加
    const existing = await redis.get(key);
    const entries = existing ? JSON.parse(existing) : [];
    entries.push(JSON.parse(entry));
    await redis.set(key, JSON.stringify(entries.slice(-100)), 'EX', 86400 * 7); // 保留最近100条，7天过期
    console.warn(`📮 邮件移入死信队列: ${job.to}`);
  } catch {
    console.warn('死信队列写入失败');
  }
}

/**
 * 通过队列发送邮件（异步，非阻塞）
 * 如果 Redis 不可用，自动降级为同步发送
 */
export async function queueEmail(to: string, code: string): Promise<{ queued: boolean; jobId?: string }> {
  if (!checkRateLimit(to)) {
    console.warn(`⚠️ 邮件频率限制: ${to} 超过 ${SEND_RATE_LIMIT}/分钟`);
    return { queued: false };
  }

  try {
    const { enqueueEmailJob } = await import('./redis-queue');
    const jobId = await enqueueEmailJob({
      to,
      code,
      type: 'verification',
    });

    console.log(`📬 邮件已加入队列: ${jobId}`);
    return { queued: true, jobId };
  } catch (error) {
    // Redis 不可用，降级为同步发送
    console.warn('⚠️ Redis 队列不可用，降级为同步发送');
    const result = await sendVerificationCode(to, code);

    if (!result.success) {
      console.error('❌ 邮件发送失败:', result.error);
      await moveToDeadLetter({ to, code, lastError: result.error });
    }

    return { queued: false };
  }
}

// 获取当前邮件配置（不包含敏感信息）
export async function getEmailConfigSafe(): Promise<{
  type: string;
  user: string;
  configured: boolean;
} | null> {
  const config = await getEmailConfig();
  
  if (!config) {
    return null;
  }

  return {
    type: config.type,
    user: config.user || '',
    configured: true,
  };
}

// ============================================
// 举报通知邮件功能
// ============================================

// 举报通知邮件类型
export type ReportNotificationType = 
  | 'content_deleted'     // 内容被删除
  | 'content_dismissed'   // 举报被驳回
  | 'user_penalized';      // 用户被处罚

// 举报通知邮件参数
export interface ReportNotificationParams {
  type: ReportNotificationType;
  recipientEmail: string;
  recipientName: string;
  reportReason: string;
  handleNote?: string;
  penaltyType?: string;
  handleTime: string;
}

// 发送举报通知邮件
async function sendReportNotification(
  config: EmailProviderConfig,
  params: ReportNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const { type, recipientEmail } = params;

  const subject = getReportSubject(type);
  const html = generateReportEmailHTML(params);
  const text = generateReportEmailText(params);

  switch (config.type) {
    case 'qq':
    case 'aliyun':
    case 'smtp': {
      try {
        const transporter = nodemailer.createTransport({
          host: config.host || (config.type === 'qq' ? 'smtp.qq.com' : config.type === 'aliyun' ? 'smtp.aliyundm.aliyun.com' : undefined),
          port: config.port || (config.type === 'aliyun' ? 465 : 587),
          secure: config.secure ?? (config.type !== 'smtp'),
          auth: {
            user: config.user,
            pass: config.pass,
          },
        });

        await transporter.sendMail({
          from: `"${config.from || '代码平台'}" <${config.user}>`,
          to: recipientEmail,
          subject,
          html,
          text,
        });

        return { success: true };
      } catch (error) {
        console.error('举报通知邮件发送失败:', error);
        return { success: false, error: String(error) };
      }
    }
    case 'sendgrid': {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: recipientEmail }] }],
            from: { email: config.user },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html },
            ],
          }),
        });

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.text();
          return { success: false, error };
        }
      } catch (error) {
        console.error('SendGrid报告通知发送失败:', error);
        return { success: false, error: String(error) };
      }
    }
    case 'mailgun': {
      try {
        const domain = config.user?.split('@')?.[1];
        if (!domain) {
          return { success: false, error: 'Mailgun 配置缺少有效的 user 字段' };
        }
        const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`api:${config.apiKey}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            from: config.from || `代码平台 <mailgun@${domain}>`,
            to: recipientEmail,
            subject,
            text,
            html,
          }),
        });

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.text();
          return { success: false, error };
        }
      } catch (error) {
        console.error('Mailgun报告通知发送失败:', error);
        return { success: false, error: String(error) };
      }
    }
    default:
      return { success: false, error: '未知的邮件服务商' };
  }
}

// 获取举报通知邮件主题
function getReportSubject(type: ReportNotificationType): string {
  switch (type) {
    case 'content_deleted':
      return '【代码平台】您的内容因违反社区规范已被处理';
    case 'content_dismissed':
      return '【代码平台】您举报的内容已被审核';
    case 'user_penalized':
      return '【代码平台】您的账号因违反社区规范受到处罚';
    default:
      return '【代码平台】举报处理通知';
  }
}

// 生成举报通知邮件文本
function generateReportEmailText(params: ReportNotificationParams): string {
  const { type, recipientName, reportReason, handleNote, penaltyType, handleTime } = params;
  
  switch (type) {
    case 'content_deleted':
      return `${recipientName}，您好！

您发布的内容因违反社区规范已被管理员处理。

违规原因：${reportReason}

${handleNote ? `管理员备注：${handleNote}` : ''}

处理时间：${handleTime}

如有异议，您可以通过平台联系管理员进行申诉。

— 代码平台`;
    case 'content_dismissed':
      return `${recipientName}，您好！

感谢您对平台内容的关注。

您举报的内容经过管理员审核后，认为该内容不构成违规，因此未被采纳。

举报原因：${reportReason}

审核时间：${handleTime}

我们会持续关注平台内容，如发现其他违规内容，欢迎继续向我们举报。

— 代码平台`;
    case 'user_penalized':
      const penaltyDesc = penaltyType === 'ban' ? '永久封禁' : 
                          penaltyType === 'mute' ? '禁言' : 
                          penaltyType === 'repo_limit' ? '限制创建仓库' :
                          penaltyType === 'storage_limit' ? '限制存储空间' : '处罚';
      return `${recipientName}，您好！

您的账号因违反社区规范受到以下处罚：

处罚类型：${penaltyDesc}
处罚原因：${reportReason}
${handleNote ? `管理员备注：${handleNote}` : ''}
处罚时间：${handleTime}

请遵守平台社区规范，避免再次违规。

如有异议，您可以通过平台联系管理员进行申诉。

— 代码平台`;
    default:
      return '';
  }
}

// 生成举报通知邮件 HTML
function generateReportEmailHTML(params: ReportNotificationParams): string {
  const { type, recipientName, reportReason, handleNote, penaltyType, handleTime } = params;
  
  const icon = type === 'content_deleted' ? '⚠️' : type === 'content_dismissed' ? '✅' : '🚫';
  const title = type === 'content_deleted' ? '内容处理通知' : type === 'content_dismissed' ? '举报审核结果' : '账号处罚通知';
  const bgColor = type === 'content_deleted' ? '#dc6803' : type === 'content_dismissed' ? '#1a7f37' : '#cf222e';
  
  let contentHTML = '';
  
  switch (type) {
    case 'content_deleted':
      contentHTML = `
        <div style="background: #fffbea; border: 1px solid #e3b341; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #8c6914; font-size: 14px; margin: 0;">
            <strong>⚠️ 您的内容因违反社区规范已被管理员处理</strong>
          </p>
        </div>
        
        <div style="margin: 0 0 24px 0;">
          <p style="color: #57606a; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">违规原因</p>
          <p style="color: #24292f; font-size: 14px; margin: 0; padding: 12px; background: #f6f8fa; border-radius: 6px;">${reportReason}</p>
        </div>
      `;
      break;
    case 'content_dismissed':
      contentHTML = `
        <div style="background: #dafbe1; border: 1px solid #1a7f37; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #1a7f37; font-size: 14px; margin: 0;">
            <strong>✅ 感谢您对平台内容的关注！您举报的内容已被审核。</strong>
          </p>
        </div>
        
        <div style="margin: 0 0 24px 0;">
          <p style="color: #57606a; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">举报原因</p>
          <p style="color: #24292f; font-size: 14px; margin: 0; padding: 12px; background: #f6f8fa; border-radius: 6px;">${reportReason}</p>
        </div>
        
        <p style="color: #57606a; font-size: 14px; margin: 0 0 16px 0;">
          经过管理员审核，该内容不构成违规，因此未被采纳。我们会持续关注平台内容，如发现其他违规内容，欢迎继续向我们举报。
        </p>
      `;
      break;
    case 'user_penalized':
      const penaltyDesc = penaltyType === 'ban' ? '永久封禁' : 
                          penaltyType === 'mute' ? '禁言处罚' : 
                          penaltyType === 'repo_limit' ? '限制创建仓库' :
                          penaltyType === 'storage_limit' ? '限制存储空间' : '处罚';
      contentHTML = `
        <div style="background: #ffebe9; border: 1px solid #cf222e; border-radius: 6px; padding: 16px; margin: 0 0 24px 0;">
          <p style="color: #cf222e; font-size: 14px; margin: 0;">
            <strong>🚫 您的账号因违反社区规范受到处罚</strong>
          </p>
        </div>
        
        <div style="margin: 0 0 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eaecef; color: #57606a; font-size: 13px; width: 100px;">处罚类型</td>
              <td style="padding: 12px; border-bottom: 1px solid #eaecef; color: #cf222e; font-size: 14px; font-weight: 600;">${penaltyDesc}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eaecef; color: #57606a; font-size: 13px;">处罚原因</td>
              <td style="padding: 12px; border-bottom: 1px solid #eaecef; color: #24292f; font-size: 14px;">${reportReason}</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #57606a; font-size: 13px;">处理时间</td>
              <td style="padding: 12px; color: #24292f; font-size: 14px;">${handleTime}</td>
            </tr>
          </table>
        </div>
      `;
      break;
  }
  
  if (handleNote) {
    contentHTML += `
      <div style="margin: 0 0 24px 0;">
        <p style="color: #57606a; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">管理员备注</p>
        <p style="color: #24292f; font-size: 14px; margin: 0; padding: 12px; background: #f6f8fa; border-radius: 6px;">${handleNote}</p>
      </div>
    `;
  }
  
  contentHTML += `
    <div style="background: #f6f8fa; border-radius: 6px; padding: 16px; margin: 0;">
      <p style="color: #57606a; font-size: 13px; margin: 0;">
        如有异议，您可以通过平台联系管理员进行申诉。
      </p>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background: linear-gradient(135deg, ${bgColor} 0%, ${bgColor}cc 100%); padding: 32px; text-align: center;">
      <div style="width: 48px; height: 48px; background: #fff; border-radius: 50%; display: inline-block; line-height: 48px; font-size: 24px;">
        ${icon}
      </div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 16px 0 0 0;">${title}</h1>
    </div>
    
    <div style="padding: 32px;">
      <p style="color: #24292f; font-size: 14px; margin: 0 0 24px 0;">
        <strong>${recipientName}</strong>，您好！
      </p>
      
      ${contentHTML}
    </div>
    
    <div style="background: #f6f8fa; padding: 16px; text-align: center; border-top: 1px solid #eaecef;">
      <p style="color: #8c959f; font-size: 12px; margin: 0;">
        此邮件由系统自动发送，请勿直接回复<br>
        发送时间：${handleTime}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 发送举报处理通知邮件
 * @param params 举报通知参数
 * @returns 发送结果
 */
export async function sendReportNotificationEmail(
  params: ReportNotificationParams
): Promise<{ success: boolean; error?: string }> {
  const config = await getEmailConfig();
  
  // 如果没有配置，返回开发模式（日志输出）
  if (!config) {
    console.log('\n========================================');
    console.log('📧 [开发模式] 举报通知邮件（未真实发送）');
    console.log('========================================');
    console.log(`📮 收件人: ${params.recipientEmail}`);
    console.log(`👤 收件人名称: ${params.recipientName}`);
    console.log(`📝 通知类型: ${params.type}`);
    console.log(`📋 举报原因: ${params.reportReason}`);
    console.log(`💬 管理员备注: ${params.handleNote || '无'}`);
    console.log(`⏰ 处理时间: ${params.handleTime}`);
    console.log('========================================');
    console.log('💡 请在管理面板中配置邮件服务以发送真实邮件');
    console.log('========================================\n');
    return { success: true };
  }

  console.log(`\n📧 发送举报通知邮件 (${params.type}) 到 ${params.recipientEmail}...`);
  return sendReportNotification(config, params);
}
