export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// PATCH /api/v1/admin/repos/[id] - 更新仓库属性
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { id } = await params;
    const body = await req.json();
    const { visibility, isArchived } = body;

    const repo = await prisma.repository.findUnique({
      where: { id },
      select: { id: true, name: true, owner: { select: { username: true } }, deletedAt: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.deletedAt) {
      return errors.badRequest('该仓库已被删除');
    }

    const updateData: { visibility?: number; isArchived?: boolean } = {};
    if (visibility !== undefined && [0, 1, 2].includes(visibility)) {
      updateData.visibility = visibility;
    }
    if (isArchived !== undefined) {
      updateData.isArchived = Boolean(isArchived);
    }

    if (Object.keys(updateData).length === 0) {
      return errors.badRequest('未提供有效的更新字段');
    }

    const updated = await prisma.repository.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, visibility: true, isArchived: true },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'update_repo',
      targetType: 'repository',
      targetId: id,
      details: {
        message: `更新仓库 ${repo.owner.username}/${repo.name} 的属性`,
        changes: updateData,
      },
    });

    return success(updated, '仓库更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新仓库失败');
  }
}

// DELETE /api/v1/admin/repos/[id] - 删除单个仓库（软删除）
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

    const repo = await prisma.repository.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: { username: true } },
        deletedAt: true,
      },
    });

    if (!repo) {
      return errors.notFound('仓库');
    }

    if (repo.deletedAt) {
      return errors.badRequest('该仓库已被删除');
    }

    await prisma.repository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await recordAuditLog({
      adminId: auth.userId,
      userId: auth.userId,
      actionType: 'delete',
      targetType: 'repository',
      targetId: id,
      details: { repo: `${repo.owner.username}/${repo.name}` },
    });

    return success({ id }, '仓库已删除');
  } catch (err) {
    return handlePrismaError(err, '删除仓库失败');
  }
}
