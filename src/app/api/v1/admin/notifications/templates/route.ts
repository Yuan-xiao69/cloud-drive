export const dynamic = 'force-dynamic';
/**
 * v1 通知模板 API
 * GET /api/v1/admin/notifications/templates - 获取通知模板列表
 * POST /api/v1/admin/notifications/templates - 创建通知模板
 * DELETE /api/v1/admin/notifications/templates - 删除通知模板
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// 默认模板列表
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_system_maintenance',
    name: '系统维护通知',
    type: 'system',
    title: '【系统通知】${date} 系统维护公告',
    content: '尊敬的用户，系统将于 ${time} 进行维护，届时部分功能将暂停使用。预计维护时长 ${duration}。给您带来的不便敬请谅解。',
    variables: ['date', 'time', 'duration'],
    usageCount: 0,
    lastUsed: null,
  },
  {
    id: 'tpl_feature_update',
    name: '功能更新公告',
    type: 'activity',
    title: '【新功能上线】${feature} 已发布',
    content: '亲爱的用户，我们很高兴宣布 ${feature} 功能已正式上线！${description}。快去体验吧！',
    variables: ['feature', 'description'],
    usageCount: 0,
    lastUsed: null,
  },
  {
    id: 'tpl_security_warning',
    name: '安全警告',
    type: 'warning',
    title: '【安全提醒】${reason}',
    content: '尊敬的用户，我们检测到您的账号存在异常活动（${reason}）。为了保护您的账号安全，请及时 ${action}。如非本人操作，请立即修改密码。',
    variables: ['reason', 'action'],
    usageCount: 0,
    lastUsed: null,
  },
  {
    id: 'tpl_activity_invite',
    name: '活动邀请',
    type: 'activity',
    title: '【活动邀请】${activity}',
    content: '亲爱的用户，${activity} 活动火热进行中！${description} 点击参与：${link}',
    variables: ['activity', 'description', 'link'],
    usageCount: 0,
    lastUsed: null,
  },
];

// 内存中存储的模板（支持 CRUD）
let customTemplates = new Map<string, typeof DEFAULT_TEMPLATES[0]>();

// GET /api/v1/admin/notifications/templates - 获取通知模板列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const allTemplates = [
      ...DEFAULT_TEMPLATES,
      ...Array.from(customTemplates.values()),
    ];

    return success({ templates: allTemplates });
  },
});

// POST /api/v1/admin/notifications/templates - 创建通知模板
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    name: z.string(),
    type: z.string(),
    title: z.string(),
    content: z.string(),
    variables: z.array(z.string()).optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { name, type, title, content, variables } = body;

    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const template = {
      id,
      name,
      type,
      title,
      content,
      variables: variables || [],
      usageCount: 0,
      lastUsed: null,
    };

    customTemplates.set(id, template);

    return created({ template });
  },
});

// DELETE /api/v1/admin/notifications/templates - 删除通知模板
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return errors.badRequest('缺少模板 ID');
    }

    if (DEFAULT_TEMPLATES.some((t) => t.id === id)) {
      return errors.badRequest('无法删除系统默认模板');
    }

    if (!customTemplates.has(id)) {
      return errors.notFound('模板不存在');
    }

    customTemplates.delete(id);

    return success({ message: '模板已删除' });
  },
});
