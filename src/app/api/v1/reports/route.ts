export const dynamic = 'force-dynamic';
/**
 * API v1 - 举报 API
 * POST /api/v1/reports - 提交举报
 * GET /api/v1/reports - 获取当前用户的举报记录
 */

import { NextRequest } from 'next/server';
import { success, error, created, paginated, handlePrismaError } from '@/lib/api/v1/response';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeText } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

/** 合法的举报目标类型 */
const VALID_TARGET_TYPES = ['user', 'discussion', 'issue', 'pullrequest', 'comment', 'repository'];

/** 合法的举报原因 */
const VALID_REASONS = [
  'spam', 'abuse', 'inappropriate', 'copyright', 'fraud', 'other',
  'harassment', 'fake_info', 'duplicate', 'malware',
];

// POST /api/v1/reports - 提交举报
export async function POST(req: NextRequest) {
  try {
    // 鉴权
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    // 速率限制
    const rateLimit = await checkRateLimit(req, 'api');
    if (!rateLimit.allowed) {
      return error('RATE_LIMITED', { message: '操作过于频繁，请稍后再试' });
    }

    // 解析请求体
    const body = await req.json();
    const { targetType, targetId, reason, description } = body;

    // 参数验证
    if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
      return error('VALIDATION_ERROR', { message: '无效的举报类型' });
    }
    if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
      return error('VALIDATION_ERROR', { message: '无效的举报目标' });
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return error('VALIDATION_ERROR', { message: '无效的举报原因' });
    }

    const cleanTargetType = targetType.trim();
    const cleanTargetId = targetId.trim();
    // description 附加到 reason 后面，因为 Report schema 没有 description 字段
    let finalReason = reason;
    if (description && description.trim()) {
      const cleanDesc = sanitizeText(description.trim()).slice(0, 1000);
      finalReason = `${reason}: ${cleanDesc}`;
    }

    // 检查目标是否存在
    const targetExists = await checkTargetExists(cleanTargetType, cleanTargetId);
    if (!targetExists) {
      return error('NOT_FOUND', { message: '举报目标不存在' });
    }

    // 检查是否重复举报（同一用户对同一目标）
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: auth.userId,
        targetType: cleanTargetType,
        targetId: cleanTargetId,
        status: 'pending',
      },
    });
    if (existingReport) {
      return error('RESOURCE_EXISTS', { message: '您已提交过对此内容的举报，请等待处理' });
    }

    // 创建举报记录
    const report = await prisma.report.create({
      data: {
        reporterId: auth.userId,
        targetType: cleanTargetType,
        targetId: cleanTargetId,
        reason: finalReason,
      },
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    return created({ reportId: report.id }, '举报提交成功');
  } catch (err) {
    return handlePrismaError(err);
  }
}

// GET /api/v1/reports - 获取当前用户的举报记录
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const status = searchParams.get('status') || undefined;

    const where: Record<string, unknown> = { reporterId: auth.userId };
    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          handlerNote: true,
          createdAt: true,
          handledAt: true,
        },
      }),
      prisma.report.count({ where }),
    ]);

    return paginated(items, buildPaginationMeta(total, page, size));
  } catch (err) {
    return handlePrismaError(err);
  }
}

/**
 * 检查举报目标是否存在
 */
async function checkTargetExists(targetType: string, targetId: string): Promise<boolean> {
  try {
    switch (targetType) {
      case 'user': {
        const user = await prisma.user.findFirst({
          where: { OR: [{ id: targetId }, { uid: targetId }] },
          select: { id: true },
        });
        return !!user;
      }
      case 'discussion': {
        const discussion = await prisma.discussion.findUnique({ where: { id: targetId }, select: { id: true } });
        return !!discussion;
      }
      case 'issue': {
        const issue = await prisma.issue.findUnique({ where: { id: targetId }, select: { id: true } });
        return !!issue;
      }
      case 'pullrequest': {
        const pr = await prisma.pullRequest.findUnique({ where: { id: targetId }, select: { id: true } });
        return !!pr;
      }
      case 'comment': {
        const comment = await prisma.discussionComment.findUnique({ where: { id: targetId }, select: { id: true } });
        return !!comment;
      }
      case 'repository': {
        const repo = await prisma.repository.findUnique({ where: { id: targetId }, select: { id: true } });
        return !!repo;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}
