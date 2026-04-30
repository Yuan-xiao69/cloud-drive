export const dynamic = 'force-dynamic';
/**
 * v1 举报处理 API
 * POST /api/v1/admin/reports/[id]/handle - 处理举报（删除内容 / 忽略举报 / 处罚用户）
 */

import { NextRequest } from 'next/server';
import { success, errors, handlePrismaError } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendReportNotificationEmail, ReportNotificationParams } from '@/lib/email-service';

interface HandleBody {
  action: 'delete' | 'dismiss';
  note?: string;
  penaltyType?: string;
  penaltyReason?: string;
}

/** 合法的处罚类型 */
const VALID_PENALTY_TYPES = ['mute', 'repo_limit', 'storage_limit', 'ban'];

type Props = {
  params: Promise<{ id: string }>;
};

// POST /api/v1/admin/reports/[id]/handle - 处理举报
export async function POST(req: NextRequest, { params }: Props): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { id } = await params;

    // 校验举报是否存在
    const report = await prisma.report.findUnique({
      where: { id },
    });
    if (!report) {
      return errors.notFound('举报不存在');
    }
    if (report.status !== 'pending') {
      return errors.badRequest('该举报已被处理');
    }

    // 解析请求体
    const body: HandleBody = await req.json();
    const { action, note, penaltyType, penaltyReason } = body;

    if (action !== 'delete' && action !== 'dismiss') {
      return errors.badRequest('无效的操作类型，支持 delete / dismiss');
    }

    // 处罚用户 - 仅超级管理员
    if (penaltyType) {
      if (auth.role !== 'super_admin') {
        return errors.forbidden('只有超级管理员才能处罚用户');
      }
      if (!VALID_PENALTY_TYPES.includes(penaltyType)) {
        return errors.badRequest('无效的处罚类型');
      }
      if (!penaltyReason || penaltyReason.trim().length === 0) {
        return errors.badRequest('处罚原因为必填项');
      }
    }

    const now = new Date();

    if (action === 'delete') {
      // 根据目标类型删除对应内容
      const { targetType, targetId } = report;

      switch (targetType) {
        case 'discussion': {
          await prisma.discussion.update({
            where: { id: targetId },
            data: { isDeleted: true },
          });
          break;
        }
        case 'comment': {
          await prisma.discussionComment.update({
            where: { id: targetId },
            data: { isDeleted: true },
          });
          break;
        }
        case 'issue': {
          await prisma.issue.delete({ where: { id: targetId } });
          break;
        }
        case 'pullrequest': {
          await prisma.pullRequest.delete({ where: { id: targetId } });
          break;
        }
        case 'repository': {
          await prisma.repository.update({
            where: { id: targetId },
            data: { deletedAt: now },
          });
          break;
        }
        case 'user': {
          // 不直接删除用户，而是标记该举报为 handled 并记录
          // 实际封禁操作需要管理员在用户管理页面手动进行
          break;
        }
        default:
          return errors.badRequest(`不支持的目标类型: ${targetType}`);
      }
    }

    // 更新举报状态
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: action === 'delete' ? 'handled' : 'dismissed',
        handlerId: auth.userId,
        handlerNote: note || null,
        handledAt: now,
      },
    });

    // 处罚用户（如果请求中包含 penaltyType）
    if (penaltyType && penaltyReason) {
      // 查找目标用户
      let targetUserId: string | undefined;
      switch (report.targetType) {
        case 'user':
          targetUserId = report.targetId;
          break;
        case 'discussion': {
          const disc = await prisma.discussion.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
          targetUserId = disc?.authorId;
          break;
        }
        case 'comment': {
          const comment = await prisma.discussionComment.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
          targetUserId = comment?.authorId;
          break;
        }
        case 'issue': {
          const issue = await prisma.issue.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
          targetUserId = issue?.authorId;
          break;
        }
        case 'pullrequest': {
          const pr = await prisma.pullRequest.findUnique({ where: { id: report.targetId }, select: { authorId: true } });
          targetUserId = pr?.authorId;
          break;
        }
        case 'repository': {
          const repo = await prisma.repository.findUnique({ where: { id: report.targetId }, select: { ownerId: true } });
          targetUserId = repo?.ownerId;
          break;
        }
      }

      if (targetUserId) {
        // 检查是否为系统用户或管理员，防止处罚
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, role: true, isSystem: true },
        });
        if (targetUser && !targetUser.isSystem && targetUser.role !== 'super_admin' && targetUser.id !== auth.userId) {
          const expiresDays = penaltyType === 'ban' ? 0 : 7;
          const expiresAt = expiresDays > 0 ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;

          await prisma.userPenalty.create({
            data: {
              userId: targetUserId,
              penaltyType: penaltyType,
              reason: `举报处理处罚: ${penaltyReason}`,
              isActive: true,
              expiresAt,
              appliedBy: auth.userId,
              value: expiresDays > 0 ? expiresDays : 0,
            },
          });
        }
      }
    }

    // 发送邮件通知
    try {
      // 获取被举报用户信息
      let targetUserId: string | undefined;
      let targetUserEmail: string | undefined;
      let targetUserName: string | undefined;
      
      switch (report.targetType) {
        case 'user':
          targetUserId = report.targetId;
          break;
        case 'discussion': {
          const disc = await prisma.discussion.findUnique({ where: { id: report.targetId } });
          targetUserId = disc?.authorId;
          break;
        }
        case 'comment': {
          const comment = await prisma.discussionComment.findUnique({ where: { id: report.targetId } });
          targetUserId = comment?.authorId;
          break;
        }
        case 'issue': {
          const issue = await prisma.issue.findUnique({ where: { id: report.targetId } });
          targetUserId = issue?.authorId;
          break;
        }
        case 'pullrequest': {
          const pr = await prisma.pullRequest.findUnique({ where: { id: report.targetId } });
          targetUserId = pr?.authorId;
          break;
        }
        case 'repository': {
          const repo = await prisma.repository.findUnique({ where: { id: report.targetId } });
          targetUserId = repo?.ownerId;
          break;
        }
      }
      
      if (targetUserId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { email: true, username: true },
        });
        targetUserEmail = targetUser?.email;
        targetUserName = targetUser?.username;
      }

      if (targetUserEmail && targetUserName) {
        // 构建通知参数
        const notificationParams: ReportNotificationParams = {
          type: action === 'delete' ? 'content_deleted' : 'content_dismissed',
          recipientEmail: targetUserEmail,
          recipientName: targetUserName,
          reportReason: report.reason,
          handleNote: note || undefined,
          handleTime: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        };

        // 发送邮件通知（异步，不阻塞主流程）
        sendReportNotificationEmail(notificationParams).catch(err => {
          console.error('发送举报通知邮件失败:', err);
        });
      }

      // 如果有处罚，也发送处罚通知
      if (penaltyType && penaltyReason && targetUserEmail && targetUserName) {
        const penaltyNotificationParams: ReportNotificationParams = {
          type: 'user_penalized',
          recipientEmail: targetUserEmail,
          recipientName: targetUserName,
          reportReason: penaltyReason,
          penaltyType: penaltyType,
          handleNote: note || undefined,
          handleTime: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        };

        sendReportNotificationEmail(penaltyNotificationParams).catch(err => {
          console.error('发送处罚通知邮件失败:', err);
        });
      }
    } catch (emailError) {
      // 邮件发送失败不影响主流程，只记录日志
      console.error('处理邮件通知时出错:', emailError);
    }

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      actionType: action === 'delete' ? 'report_delete_content' : 'report_dismiss',
      targetType: report.targetType,
      targetId: report.targetId,
      details: {
        reportId: report.id,
        action,
        note: note || null,
        reporterId: report.reporterId,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({
      id: updatedReport.id,
      status: updatedReport.status,
      handlerId: updatedReport.handlerId,
      handlerNote: updatedReport.handlerNote,
      handledAt: updatedReport.handledAt?.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err);
  }
}
