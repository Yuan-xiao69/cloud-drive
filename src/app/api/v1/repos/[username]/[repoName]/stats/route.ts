export const dynamic = 'force-dynamic';
/**
 * v1 仓库统计 API
 * GET /api/v1/repos/[username]/[repoName]/stats - 获取仓库统计数据
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/repos/[username]/[repoName]/stats
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        name: true,
        description: true,
        starCount: true,
        forkCount: true,
        watchCount: true,
        viewCount: true,
        language: true,
        isFork: true,
        forkedFromId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            stars: true,
            issues: { where: { status: 'open', isDeleted: false } },
            pullRequests: { where: { status: 'open', isDeleted: false } },
          },
        },
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 检查访问权限
    if (repo.visibility === 0 && (!user || user.id !== repo.ownerId)) {
      return error(ErrorCodes.FORBIDDEN, { message: '私有仓库无法访问' });
    }

    const [fileCountResult, branchCountResult, contributorResult, totalSizeResult] = await Promise.all([
      prisma.repoItem.count({
        where: { repoId: repo.id, isDeleted: false },
      }),
      prisma.branch.count({
        where: { repoId: repo.id },
      }),
      prisma.repoFileChunk.groupBy({
        by: ['userId'],
        where: { repoId: repo.id },
      }),
      prisma.repoItem.aggregate({
        _sum: { fileSize: true },
        where: { repoId: repo.id, type: 'file', isDeleted: false },
      }),
    ]);

    const uploaderCount = contributorResult.length;
    const ownerAlreadyIncluded = contributorResult.some((c) => c.userId === repo.ownerId);
    const contributorCount = uploaderCount + (ownerAlreadyIncluded ? 0 : 1);

    const totalSize = totalSizeResult._sum.fileSize ? Number(totalSizeResult._sum.fileSize) : 0;

    return success({
      repoId: repo.id,
      repoName: repo.name,
      description: repo.description,
      starCount: repo.starCount,
      forkCount: repo.forkCount,
      watchCount: repo.watchCount,
      viewCount: repo.viewCount,
      language: repo.language,
      isFork: repo.isFork,
      openIssueCount: repo._count.issues,
      openPullRequestCount: repo._count.pullRequests,
      contributorCount,
      totalSize,
      fileCount: fileCountResult,
      branchCount: branchCountResult,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    });
  },
});
