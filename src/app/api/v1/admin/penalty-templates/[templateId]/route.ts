export const dynamic = 'force-dynamic';

/**
 * v1 处罚模板管理 API - 单个模板操作
 * PATCH /api/v1/admin/penalty-templates/[templateId] - 更新模板
 * DELETE /api/v1/admin/penalty-templates/[templateId] - 删除模板
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// PATCH /api/v1/admin/penalty-templates/[templateId] - 更新模板
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以更新模板
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以修改处罚模板');
    }

    const { templateId } = await params;
    const body = await req.json();
    const { name, penaltyType, defaultDuration, reason, description, isActive } = body;

    const existing = await prisma.penaltyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return errors.notFound('模板');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (penaltyType !== undefined) {
      const validTypes = ['mute', 'repo_limit', 'storage_limit', 'download_limit', 'fork_limit', 'star_limit'];
      if (!validTypes.includes(penaltyType)) {
        return errors.badRequest('无效的处罚类型');
      }
      updateData.penaltyType = penaltyType;
    }
    if (defaultDuration !== undefined) updateData.defaultDuration = defaultDuration;
    if (reason !== undefined) updateData.reason = reason;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await prisma.penaltyTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return success({ template }, '模板更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新模板失败');
  }
}

// DELETE /api/v1/admin/penalty-templates/[templateId] - 删除模板
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以删除模板
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以删除处罚模板');
    }

    const { templateId } = await params;

    const existing = await prisma.penaltyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return errors.notFound('模板');
    }

    await prisma.penaltyTemplate.delete({
      where: { id: templateId },
    });

    return success({ id: templateId }, '模板删除成功');
  } catch (err) {
    return handlePrismaError(err, '删除模板失败');
  }
}