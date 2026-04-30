export const dynamic = 'force-dynamic';

/**
 * v1 处罚模板管理 API
 * GET /api/v1/admin/penalty-templates - 获取模板列表
 * POST /api/v1/admin/penalty-templates - 创建模板
 */

import { NextRequest } from 'next/server';
import { success, created, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/penalty-templates - 获取模板列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.penaltyTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });

    return success({ templates });
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/admin/penalty-templates - 创建模板
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以创建模板
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以创建处罚模板');
    }

    const body = await req.json();
    const { name, penaltyType, defaultDuration, reason, description } = body;

    if (!name || !penaltyType || !reason) {
      return errors.badRequest('缺少必填字段：name, penaltyType, reason');
    }

    const validTypes = ['mute', 'repo_limit', 'storage_limit', 'download_limit', 'fork_limit', 'star_limit'];
    if (!validTypes.includes(penaltyType)) {
      return errors.badRequest('无效的处罚类型');
    }

    const template = await prisma.penaltyTemplate.create({
      data: {
        name,
        penaltyType,
        defaultDuration: defaultDuration || 7,
        reason,
        description: description || null,
        createdBy: auth.userId,
      },
    });

    return created({ template }, '模板创建成功');
  } catch (err) {
    return handlePrismaError(err);
  }
}