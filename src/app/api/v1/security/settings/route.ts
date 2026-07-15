// Force reload: 确保每次请求都从服务器获取最新数据
export const dynamic = 'force-dynamic';

/**
 * 安全设置公开查询接口
 * GET /api/v1/security/settings
 *
 * 功能：
 * - 公开查询系统安全相关配置（无需登录）
 * - 供前端在登录/注册等场景下展示安全策略信息
 * - 也可供管理后台安全设置页面使用
 *
 * 返回内容：
 * - 登录安全：登录失败次数限制、锁定时长、会话超时
 * - 账户安全：是否强制 MFA、注册是否需要邮箱验证
 * - 密码策略：最小长度等
 * - 其他：是否允许公开注册等
 */

import { defineRoute } from '@/lib/framework/define-route';
import { getRequestId } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

/** 安全设置数据 */
interface SecuritySettings {
  // 登录安全
  loginAttemptsLimit: number;        // 登录失败次数限制
  loginLockoutDuration: number;       // 锁定时长（分钟）
  sessionTimeout: number;             // 会话超时（分钟）
  // 账户安全
  requireMFA: boolean;                // 是否强制启用两步验证
  requireEmailVerification: boolean;  // 注册是否需要邮箱验证
  // 账户策略
  allowRegistration: boolean;         // 是否允许公开注册
  defaultUserRole: string;             // 新用户默认角色
  // 密码策略
  passwordMinLength: number;          // 密码最小长度
  passwordRequireUppercase: boolean;   // 密码是否要求大写字母
  passwordRequireNumbers: boolean;    // 密码是否要求数字
  passwordRequireSpecial: boolean;     // 密码是否要求特殊字符
  // 内容安全
  autoModeration: boolean;            // 是否启用自动内容审核
}

// 数据库 key 与返回字段的映射（只读，无需写回）
const SECURITY_CONFIG_MAP: Record<keyof SecuritySettings, string> = {
  loginAttemptsLimit: 'login_attempts_limit',
  loginLockoutDuration: 'login_lockout_duration',
  sessionTimeout: 'session_timeout',
  requireMFA: 'require_mfa',
  requireEmailVerification: 'require_email_verification',
  allowRegistration: 'allow_registration',
  defaultUserRole: 'default_user_role',
  passwordMinLength: 'password_min_length',
  passwordRequireUppercase: 'password_require_uppercase',
  passwordRequireNumbers: 'password_require_numbers',
  passwordRequireSpecial: 'password_require_special',
  autoModeration: 'auto_moderation',
};

/** 从 configMap 读取整数值，不存在或解析失败时返回默认值 */
function getIntConfig(configMap: Record<string, string>, key: string, defaultValue: number): number {
  const raw = configMap[key];
  if (raw === undefined) return defaultValue;
  const val = parseInt(raw, 10);
  return isNaN(val) ? defaultValue : val;
}

/** 从 configMap 读取布尔值，不存在时返回默认值 */
function getBoolConfig(configMap: Record<string, string>, key: string, defaultValue: boolean): boolean {
  const raw = configMap[key];
  if (raw === undefined) return defaultValue;
  return raw === 'true';
}

// 默认安全设置（数据库中未配置时使用）
const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  loginAttemptsLimit: 5,
  loginLockoutDuration: 30,
  sessionTimeout: 60,
  requireMFA: false,
  requireEmailVerification: false,
  allowRegistration: true,
  defaultUserRole: 'user',
  passwordMinLength: 8,
  passwordRequireUppercase: false,
  passwordRequireNumbers: true,
  passwordRequireSpecial: false,
  autoModeration: false,
};

// GET /api/v1/security/settings
export const GET = defineRoute({
  auth: 'optional',
  async handler({ req, user }) {
    const requestId = getRequestId(req);

    // 从数据库读取所有 SystemConfig
    const configs = await prisma.systemConfig.findMany();

    // 构建 dbConfig 查找表
    const configMap: Record<string, string> = {};
    for (const cfg of configs) {
      configMap[cfg.key] = cfg.value;
    }

    // 构建非敏感字段（始终返回）
    const result: Partial<SecuritySettings> = {
      allowRegistration: configMap['allow_registration'] !== undefined
        ? configMap['allow_registration'] === 'true'
        : DEFAULT_SECURITY_SETTINGS.allowRegistration,
      requireEmailVerification: configMap['require_email_verification'] !== undefined
        ? configMap['require_email_verification'] === 'true'
        : DEFAULT_SECURITY_SETTINGS.requireEmailVerification,
      defaultUserRole: configMap['default_user_role'] !== undefined
        ? configMap['default_user_role']
        : DEFAULT_SECURITY_SETTINGS.defaultUserRole,
      passwordMinLength: getIntConfig(configMap, 'password_min_length', DEFAULT_SECURITY_SETTINGS.passwordMinLength),
      passwordRequireUppercase: getBoolConfig(configMap, 'password_require_uppercase', DEFAULT_SECURITY_SETTINGS.passwordRequireUppercase),
      passwordRequireNumbers: getBoolConfig(configMap, 'password_require_numbers', DEFAULT_SECURITY_SETTINGS.passwordRequireNumbers),
      passwordRequireSpecial: getBoolConfig(configMap, 'password_require_special', DEFAULT_SECURITY_SETTINGS.passwordRequireSpecial),
    };

    // 敏感字段仅在登录用户存在时返回
    if (user) {
      result.loginAttemptsLimit = getIntConfig(configMap, 'login_attempts_limit', DEFAULT_SECURITY_SETTINGS.loginAttemptsLimit);
      result.loginLockoutDuration = getIntConfig(configMap, 'login_lockout_duration', DEFAULT_SECURITY_SETTINGS.loginLockoutDuration);
      result.sessionTimeout = getIntConfig(configMap, 'session_timeout', DEFAULT_SECURITY_SETTINGS.sessionTimeout);
      result.requireMFA = getBoolConfig(configMap, 'require_mfa', DEFAULT_SECURITY_SETTINGS.requireMFA);
      result.autoModeration = getBoolConfig(configMap, 'auto_moderation', DEFAULT_SECURITY_SETTINGS.autoModeration);
    }

    return new Response(
      JSON.stringify({
        code: 200,
        message: '安全设置获取成功',
        data: result,
        requestId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // 安全设置可适度缓存 5 分钟
          'Cache-Control': 'private, max-age=300',
        },
      }
    );
  },
});
