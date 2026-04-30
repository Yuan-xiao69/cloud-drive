export const dynamic = 'force-dynamic';
/**
 * v1 用户申诉 API
 * GET /api/v1/me/appeals - 获取当前用户的申诉列表
 * POST /api/v1/me/appeals - 创建申诉
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, handlePrismaError, errors, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sanitizeText } from '@/lib/security';

// GET /api/v1/me/appeals - 获取当前用户的申诉列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { userId: auth.userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
    }

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          appealType: true,
          targetId: true,
          content: true,
          status: true,
          reviewNote: true,
          reviewedAt: true,
          createdAt: true,
        },
      }),
      prisma.appeal.count({ where }),
    ]);

    return paginated(appeals, buildPaginationMeta(total, page, limit));
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/me/appeals - 创建申诉
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { appealType, targetId, content } = body;

    if (!appealType || !targetId || !content) {
      return errors.badRequest('缺少必填字段');
    }

    const validTypes = ['ban', 'hidden', 'penalty'];
    if (!validTypes.includes(appealType)) {
      return errors.badRequest('无效的申诉类型');
    }

    // 净化申诉内容
    const cleanContent = sanitizeText(content.trim()).slice(0, 2000);
    if (!cleanContent) {
      return errors.badRequest('申诉内容不能为空');
    }

    // 验证申诉目标是否存在且属于当前用户
    let targetExists = false;
    switch (appealType) {
      case 'ban': {
        const ban = await prisma.userBan.findFirst({
          where: { id: targetId, userId: auth.userId },
        });
        targetExists = !!ban;
        break;
      }
      case 'hidden': {
        const hidden = await prisma.hiddenContent.findUnique({
          where: { id: targetId },
        });
        targetExists = !!hidden;
        break;
      }
      case 'penalty': {
        const penalty = await prisma.userPenalty.findFirst({
          where: { id: targetId, userId: auth.userId },
        });
        targetExists = !!penalty;
        break;
      }
    }

    if (!targetExists) {
      return errors.notFound('申诉目标');
    }

    // 检查是否有待处理的申诉
    const existingAppeal = await prisma.appeal.findFirst({
      where: {
        userId: auth.userId,
        appealType,
        targetId,
        status: 'pending',
      },
    });

    if (existingAppeal) {
      return errors.conflict('您已有待处理的同类申诉');
    }

    const appeal = await prisma.appeal.create({
      data: {
        userId: auth.userId,
        appealType,
        targetId,
        content: cleanContent,
        status: 'pending',
      },
      select: {
        id: true,
        appealType: true,
        targetId: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    return created({ appeal }, '申诉提交成功');
  } catch (err) {
    return handlePrismaError(err);
  }
}
