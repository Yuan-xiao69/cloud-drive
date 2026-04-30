export const dynamic = 'force-dynamic';
/**
 * v1 IP 黑名单单条操作 API
 * DELETE /api/v1/admin/ip-blacklist/[id] - 移除 IP 黑名单条目
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// DELETE /api/v1/admin/ip-blacklist/[id] - 移除 IP 黑名单条目
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { id } = await params;

    // 检查条目是否存在
    const entry = await prisma.iPBlacklist.findUnique({
      where: { id },
    });

    if (!entry) {
      return errors.notFound('IP 黑名单条目不存在');
    }

    // 删除条目
    await prisma.iPBlacklist.delete({
      where: { id },
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'delete',
      targetType: 'ip_blacklist',
      targetId: id,
      details: { message: `移除 IP 黑名单: ${entry.ipAddress}` },
    });

    return success(null, 'IP 已从黑名单移除');
  } catch (err) {
    return handlePrismaError(err);
  }
}
