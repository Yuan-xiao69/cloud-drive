export const dynamic = 'force-dynamic';
/**
 * v1 用户批量删除 API
 * POST /api/v1/admin/users/batch-delete - 批量删除用户
 */

import { NextRequest } from 'next/server';
import { success, created, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/users/batch-delete - 批量删除用户
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errors.badRequest('请选择要删除的用户');
    }

    // 检查是否包含超级管理员
    const superAdmin = await prisma.user.findFirst({
      where: { id: { in: ids }, role: 'super_admin' },
    });

    if (superAdmin) {
      return errors.forbidden('禁止删除超级管理员账号');
    }

    // 执行删除
    const deleteResult = await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'batch_delete_users',
      targetType: 'user',
      targetId: ids.join(','),
      details: { message: `批量删除了 ${deleteResult.count} 个用户` },
    });

    return success({
      count: deleteResult.count,
    }, `成功删除 ${deleteResult.count} 个用户`);
  } catch (err) {
    console.error('批量删除用户失败:', err);
    return handlePrismaError(err);
  }
}
