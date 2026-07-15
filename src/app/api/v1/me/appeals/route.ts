export const dynamic = 'force-dynamic';
/**
 * v1 用户申诉 API
 * GET /api/v1/me/appeals - 获取当前用户的申诉列表
 * POST /api/v1/me/appeals - 创建申诉
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, paginated, errors, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { sanitizeText } from '@/lib/security';

// GET /api/v1/me/appeals - 获取当前用户的申诉列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { userId: user!.id };
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
  },
});

// POST /api/v1/me/appeals - 创建申诉
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    appealType: z.enum(['ban', 'hidden', 'penalty']),
    targetId: z.string().min(1),
    content: z.string().min(1).max(2000),
  }),
  async handler({ user, body }) {
    const { appealType, targetId, content } = body;

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
          where: { id: targetId, userId: user!.id },
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
          where: { id: targetId, userId: user!.id },
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
        userId: user!.id,
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
        userId: user!.id,
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
  },
});
