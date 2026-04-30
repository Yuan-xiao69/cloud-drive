import nodemailer from 'nodemailer';

// 邮件配置
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// 获取邮件配置
function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port, secure, user, pass, from };
}

// 创建 transporter
function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

// 发送验证码邮件
export async function sendVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  const config = getEmailConfig();

  // 如果没有配置邮件服务，使用开发模式（日志输出）
  if (!config) {
    console.log('\n========================================');
    console.log('📧 [开发模式] 密码重置验证码（未真实发送）');
    console.log('========================================');
    console.log(`📮 收件人: ${to}`);
    console.log(`🔢 验证码: ${code}`);
    console.log(`⏰ 有效期: 15分钟`);
    console.log('========================================');
    console.log('💡 要启用真实邮件发送，请在 .env 中配置 SMTP');
    console.log('========================================\n');
    return { success: true };
  }

  try {
    const transporter = createTransporter(config);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f8fa; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #d0d7de; padding: 32px; }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo svg { width: 48px; height: 48px; fill: #24292f; }
    h1 { color: #24292f; font-size: 24px; text-align: center; margin: 0 0 16px 0; }
    p { color: #57606a; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
    .code-box { background: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0; }
    .code { font-size: 32px; font-weight: bold; color: #24292f; letter-spacing: 8px; font-family: monospace; }
    .warning { color: #cf222e; font-size: 12px; }
    .footer { text-align: center; color: #8c959f; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 32 32" fill="currentColor">
        <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z"/>
      </svg>
    </div>
    <h1>密码重置验证码</h1>
    <p>您收到了这封邮件，因为有人请求重置与您的账户关联的密码。</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p>此验证码将在 <strong>15 分钟</strong>后过期。</p>
    <p class="warning">⚠️ 如果您没有请求重置密码，请忽略此邮件。您的账户安全不会受到任何影响。</p>
    <div class="footer">
      此邮件由系统自动发送，请勿回复。
    </div>
  </div>
</body>
</html>
`;

    const textContent = `
密码重置验证码

您收到了这封邮件，因为有人请求重置与您的账户关联的密码。

您的验证码是：${code}

此验证码将在 15 分钟后过期。

如果您没有请求重置密码，请忽略此邮件。

此邮件由系统自动发送，请勿回复。
`;

    await transporter.sendMail({
      from: `"${config.from}" <${config.user}>`,
      to: to,
      subject: '【代码平台】密码重置验证码',
      text: textContent,
      html: htmlContent,
    });

    console.log('\n========================================');
    console.log('✅ 邮件发送成功！');
    console.log('========================================');
    console.log(`📮 收件人: ${to}`);
    console.log(`🔢 验证码: ${code}`);
    console.log('========================================\n');

    return { success: true };
  } catch (error) {
    console.error('邮件发送失败:', error);
    return { success: false, error: '邮件发送失败，请稍后重试' };
  }
}
