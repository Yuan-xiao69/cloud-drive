// Force reload v2
export const dynamic = 'force-dynamic';
/**
 * v1 管理后台系统配置 API
 * GET  /api/v1/admin/config - 获取系统配置
 * PUT  /api/v1/admin/config - 更新系统配置
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// 配置项映射
const CONFIG_KEYS = {
  allowRegistration: 'allow_registration',
  requireEmailVerification: 'require_email_verification',
  defaultUserRole: 'default_user_role',
  maxFileSize: 'max_file_size',
  maxStoragePerUser: 'max_storage_per_user',
  maxRepoSize: 'max_repo_size',
  loginAttemptsLimit: 'login_attempts_limit',
  loginLockoutDuration: 'login_lockout_duration',
  sessionTimeout: 'session_timeout',
  requireMFA: 'require_mfa',
  autoModeration: 'auto_moderation',
  maxImageSize: 'max_image_size',
  allowedFileTypes: 'allowed_file_types',
  maxReposPerUser: 'max_repos_per_user',
  allowPublicRepos: 'allow_public_repos',
  requireRepoApproval: 'require_repo_approval',
};

// 布尔类型配置项集合（明确声明，不依赖 typeof 推断）
const BOOLEAN_KEYS = new Set([
  'allowRegistration',
  'requireEmailVerification',
  'requireMFA',
  'autoModeration',
  'allowPublicRepos',
  'requireRepoApproval',
]);

// 数字类型配置项集合
const NUMBER_KEYS = new Set([
  'maxFileSize',
  'maxStoragePerUser',
  'maxRepoSize',
  'loginAttemptsLimit',
  'loginLockoutDuration',
  'sessionTimeout',
  'maxImageSize',
  'maxReposPerUser',
]);

// 默认值
const DEFAULT_CONFIG: Record<string, string | number | boolean> = {
  allowRegistration: true,
  requireEmailVerification: false,
  defaultUserRole: 'user',
  maxFileSize: 100,
  maxStoragePerUser: 1000,
  maxRepoSize: 5000,
  loginAttemptsLimit: 5,
  loginLockoutDuration: 30,
  sessionTimeout: 60,
  requireMFA: false,
  autoModeration: false,
  maxImageSize: 10,
  allowedFileTypes: 'jpg,jpeg,png,gif,webp,pdf,zip,md,txt,js,ts,jsx,tsx,css,html,json',
  maxReposPerUser: 50,
  allowPublicRepos: true,
  requireRepoApproval: false,
};

// 描述信息
const CONFIG_DESCRIPTIONS: Record<string, string> = {
  allowRegistration: '是否允许新用户注册',
  requireEmailVerification: '注册后是否需要邮箱验证',
  defaultUserRole: '新用户的默认角色',
  maxFileSize: '单文件大小限制 (MB)',
  maxStoragePerUser: '用户存储配额 (MB)',
  maxRepoSize: '单仓库大小限制 (MB)',
  loginAttemptsLimit: '登录失败次数限制',
  loginLockoutDuration: '登录锁定时长 (分钟)',
  sessionTimeout: '会话超时时间 (分钟)',
  requireMFA: '是否强制启用两步验证',
  autoModeration: '是否启用自动内容审核',
  maxImageSize: '图片大小限制 (MB)',
  allowedFileTypes: '允许上传的文件类型',
  maxReposPerUser: '单用户最大仓库数',
  allowPublicRepos: '是否允许创建公开仓库',
  requireRepoApproval: '仓库创建是否需要审批',
};

// GET /api/v1/admin/config
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    // 从数据库获取所有配置
    const configs = await prisma.systemConfig.findMany();

    // 构建配置对象
    const config: Record<string, { value: string | number | boolean; description?: string }> = {};
    
    for (const [key, dbKey] of Object.entries(CONFIG_KEYS)) {
      const dbConfig = configs.find(c => c.key === dbKey);
      let value: string | number | boolean;

      if (dbConfig) {
        // 根据类型集合转换数据库字符串值
        if (BOOLEAN_KEYS.has(key)) {
          value = dbConfig.value === 'true';
        } else if (NUMBER_KEYS.has(key)) {
          value = parseInt(dbConfig.value, 10) || DEFAULT_CONFIG[key];
        } else {
          value = dbConfig.value;
        }
      } else {
        value = DEFAULT_CONFIG[key];
        // 初始化到数据库
        await prisma.systemConfig.upsert({
          where: { key: dbKey },
          update: {},
          create: {
            key: dbKey,
            value: String(DEFAULT_CONFIG[key]),
            description: CONFIG_DESCRIPTIONS[key],
          },
        });
      }

      config[key] = {
        value,
        description: CONFIG_DESCRIPTIONS[key],
      };
    }

    return success(config);
  },
});

// PUT /api/v1/admin/config
export const PUT = defineRoute({
  auth: 'required',
  validation: z.object({}).passthrough(),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以修改系统配置');
    }

    const updates: Promise<unknown>[] = [];

    for (const [key, dbKey] of Object.entries(CONFIG_KEYS)) {
      if (key in body) {
        let value: string;

        if (BOOLEAN_KEYS.has(key)) {
          value = body[key] ? 'true' : 'false';
        } else if (NUMBER_KEYS.has(key)) {
          value = String(body[key]);
        } else {
          value = String(body[key]);
        }

        updates.push(
          prisma.systemConfig.upsert({
            where: { key: dbKey },
            update: { value },
            create: {
              key: dbKey,
              value,
              description: CONFIG_DESCRIPTIONS[key],
            },
          })
        );
      }
    }

    await Promise.all(updates);

    return success({ message: '配置更新成功' });
  },
});
