export const dynamic = 'force-dynamic';
/**
 * v1 仓库统计 API
 * GET /api/v1/repos/[username]/[repoName]/stats - 获取仓库统计数据
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/repos/[username]/[repoName]/stats
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const { username, repoName } = await params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: {
        id: true,
        ownerId: true,
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
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 获取 fork 数
    const forkCount = await prisma.repository.count({
      where: { forkedFromId: repo.id },
    });

    // 获取文件总数
    const fileCount = await prisma.repoItem.count({
      where: { repoId: repo.id, isDeleted: false },
    });

    // 获取 open issues 数
    const openIssueCount = await prisma.issue.count({
      where: { repositoryId: repo.id, status: 'open' },
    });

    // 获取 open pull requests 数
    const openPullRequestCount = await prisma.pullRequest.count({
      where: { repositoryId: repo.id, status: 'open' },
    });

    // 获取分支数
    const branchCount = await prisma.branch.count({
      where: { repoId: repo.id },
    });

    // 获取 contributors（通过 Star 和 Watch）
    const contributorCount = await prisma.star.count({
      where: { repoId: repo.id },
    });

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
      openIssueCount,
      openPullRequestCount,
      contributorCount,
      fileCount,
      branchCount,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    });
  } catch (err) {
    return handlePrismaError(err, '获取统计数据失败');
  }
}
