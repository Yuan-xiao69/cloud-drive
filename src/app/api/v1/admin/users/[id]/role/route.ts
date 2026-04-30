export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;

// PATCH /api/v1/admin/users/[id]/role - 修改用户角色
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 仅超级管理员可修改角色
    if (auth.role !== 'super_admin') {
      return errors.forbidden('仅超级管理员可修改用户角色');
    }

    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return errors.badRequest(`无效的角色，可选值: ${VALID_ROLES.join(', ')}`);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, isSystem: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('无法修改系统内置账号的角色');
    }

    if (targetUser.id === auth.userId) {
      return errors.forbidden('无法修改自己的角色');
    }

    const previousRole = targetUser.role;

    await prisma.user.update({
      where: { id },
      data: { role },
    });

    await recordAuditLog({
      adminId: auth.userId,
      userId: auth.userId,
      actionType: 'update_role',
      targetType: 'user',
      targetId: id,
      details: { username: targetUser.username, previousRole, newRole: role },
    });

    return success({ userId: id, previousRole, newRole: role }, '用户角色已更新');
  } catch (err) {
    return handlePrismaError(err, '修改用户角色失败');
  }
}
