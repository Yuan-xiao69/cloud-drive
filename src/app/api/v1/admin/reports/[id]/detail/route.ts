export const dynamic = 'force-dynamic';

/**
 * v1 举报详情 API
 * GET /api/v1/admin/reports/[id]/detail - 获取举报详细信息
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>;
};

// GET /api/v1/admin/reports/[id]/detail - 获取举报详情
export async function GET(req: NextRequest, { params }: Props): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { id } = await params;

    // 获取举报基本信息
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        handler: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!report) {
      return errors.notFound('举报记录');
    }

    // 根据目标类型获取详细信息
    let targetInfo: Record<string, unknown> = {};

    switch (report.targetType) {
      case 'user': {
        const user = await prisma.user.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            role: true,
            isBanned: true,
            createdAt: true,
          },
        });
        if (user) {
          targetInfo = {
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
            isBanned: user.isBanned,
            createdAt: user.createdAt,
            link: `/${user.username}`,
          };
        }
        break;
      }
      case 'discussion': {
        const discussion = await prisma.discussion.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            title: true,
            content: true,
            authorId: true,
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
            isDeleted: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (discussion) {
          targetInfo = {
            title: discussion.title,
            content: discussion.content,
            authorId: discussion.authorId,
            authorUsername: discussion.author?.username,
            authorAvatar: discussion.author?.avatarUrl,
            isDeleted: discussion.isDeleted,
            createdAt: discussion.createdAt,
            updatedAt: discussion.updatedAt,
            link: `/discussions/${discussion.id}`,
          };
        }
        break;
      }
      case 'comment': {
        const comment = await prisma.discussionComment.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            content: true,
            authorId: true,
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
            discussionId: true,
            isDeleted: true,
            createdAt: true,
          },
        });
        if (comment) {
          targetInfo = {
            content: comment.content,
            authorId: comment.authorId,
            authorUsername: comment.author?.username,
            authorAvatar: comment.author?.avatarUrl,
            discussionId: comment.discussionId,
            isDeleted: comment.isDeleted,
            createdAt: comment.createdAt,
            link: `/discussions/${comment.discussionId}#comment-${comment.id}`,
          };
        }
        break;
      }
      case 'issue': {
        const issue = await prisma.issue.findUnique({
          where: { id: report.targetId },
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true },
            },
            repository: {
              include: {
                owner: { select: { username: true } },
              },
            },
          },
        });
        if (issue) {
          targetInfo = {
            title: issue.title,
            content: issue.content,
            authorId: issue.authorId,
            authorUsername: issue.author?.username,
            authorAvatar: issue.author?.avatarUrl,
            repositoryId: issue.repositoryId,
            repositoryName: issue.repository?.owner?.username + '/' + issue.repository?.name,
            isClosed: issue.status === 'closed',
            createdAt: issue.createdAt,
            link: `/${issue.repository?.owner?.username}/${issue.repository?.name}/issues/${issue.id}`,
          };
        }
        break;
      }
      case 'pullrequest': {
        const pr = await prisma.pullRequest.findUnique({
          where: { id: report.targetId },
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true },
            },
            repository: {
              include: {
                owner: { select: { username: true } },
              },
            },
            sourceRepo: {
              include: {
                owner: { select: { username: true } },
              },
            },
          },
        });
        if (pr) {
          targetInfo = {
            title: pr.title,
            content: pr.content,
            authorId: pr.authorId,
            authorUsername: pr.author?.username,
            authorAvatar: pr.author?.avatarUrl,
            sourceRepoId: pr.sourceRepoId,
            sourceRepoName: pr.sourceRepo?.owner?.username + '/' + pr.sourceRepo?.name,
            targetRepoId: pr.repositoryId,
            targetRepoName: pr.repository?.owner?.username + '/' + pr.repository?.name,
            sourceBranch: pr.sourceBranch,
            targetBranch: pr.targetBranch,
            isMerged: false,
            isClosed: pr.status === 'closed',
            createdAt: pr.createdAt,
            link: `/${pr.sourceRepo?.owner?.username || 'unknown'}/${pr.sourceRepo?.name || 'unknown'}/pulls/${pr.id}`,
          };
        }
        break;
      }
      case 'repository': {
        const repo = await prisma.repository.findUnique({
          where: { id: report.targetId },
          include: {
            owner: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        });
        if (repo) {
          targetInfo = {
            name: repo.name,
            description: repo.description,
            ownerId: repo.ownerId,
            ownerUsername: repo.owner?.username,
            ownerAvatar: repo.owner?.avatarUrl,
            visibility: repo.visibility === 1 ? 'public' : 'private',
            isArchived: repo.isArchived,
            stars: repo.starCount,
            forks: repo.forkCount,
            createdAt: repo.createdAt,
            updatedAt: repo.updatedAt,
            link: `/${repo.owner?.username}/${repo.name}`,
          };
        }
        break;
      }
      default:
        targetInfo = { error: '未知的目标类型' };
    }

    // 获取相关举报（相同 targetType + targetId）
    const relatedReports = await prisma.report.findMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        id: { not: id },
      },
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 获取举报者统计
    const reporterStats = await prisma.report.groupBy({
      by: ['status'],
      where: { reporterId: report.reporterId },
      _count: true,
    });

    const reporterTotalReports = reporterStats.reduce((sum, s) => sum + s._count, 0);
    const reporterValidReports = reporterStats.find(s => s.status === 'processed')?._count || 0;
    const reporterInvalidReports = reporterStats.find(s => s.status === 'dismissed')?._count || 0;

    return success({
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      reporter: report.reporter,
      reporterStats: {
        totalReports: reporterTotalReports,
        validReports: reporterValidReports,
        invalidReports: reporterInvalidReports,
        validRate: reporterTotalReports > 0
          ? Math.round((reporterValidReports / reporterTotalReports) * 100)
          : 0,
      },
      handler: report.handler,
      handlerNote: report.handlerNote,
      createdAt: report.createdAt.toISOString(),
      handledAt: report.handledAt?.toISOString() || null,
      targetInfo,
      relatedReports: relatedReports.map(r => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handlePrismaError(err, '获取举报详情失败');
  }
}
