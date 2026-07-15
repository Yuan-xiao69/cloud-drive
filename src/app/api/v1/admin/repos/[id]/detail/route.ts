export const dynamic = 'force-dynamic';

/**
 * v1 仓库详情 API
 * GET /api/v1/admin/repos/[id]/detail - 获取仓库详情
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/repos/[id]/detail - 获取仓库详情
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const repoId = params.id;

    // 获取仓库基本信息
    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            email: true,
          },
        },
        _count: {
          select: {
            stars: true,
            watchers: true,
            forks: true,
            issues: true,
            pullRequests: true,
          },
        },
        // 获取文件统计
        items: {
          where: { isDeleted: false },
          select: {
            id: true,
            type: true,
            fileSize: true,
          },
        },
        // 获取分支
        branches: {
          select: {
            id: true,
            name: true,
            isDefault: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!repo) {
      return errors.notFound('仓库');
    }

    // 计算文件数量和总大小
    const fileCount = repo.items.filter(item => item.type === 'file').length;
    const folderCount = repo.items.filter(item => item.type === 'folder').length;
    const totalSize = repo.items.reduce((sum, item) => sum + Number(item.fileSize), 0);

    // 获取最近的提交记录（从文件版本历史中获取）
    const recentCommits = await prisma.fileVersion.findMany({
      where: { file: { repoId: repoId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        file: {
          select: {
            name: true,
            path: true,
          },
        },
      },
    });

    // 获取发起 Fork 请求的用户
    const forkRequests = await prisma.forkRequest.findMany({
      where: { repoId: repoId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        processedAt: true,
        requester: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        processor: {
          select: {
            username: true,
          },
        },
      },
    });

    // 获取公开的分享链接
    const shareLinks = await prisma.shareLink.findMany({
      where: { repoId: repoId, isActive: true },
      select: {
        id: true,
        token: true,
        permission: true,
        password: true,
        expiresAt: true,
        viewCount: true,
        createdAt: true,
        path: true,
      },
    });

    // 获取活跃的处罚记录（如果有）
    const activePenalties = await prisma.userPenalty.findMany({
      where: {
        userId: repo.ownerId,
        isActive: true,
      },
      select: {
        id: true,
        penaltyType: true,
        reason: true,
        expiresAt: true,
      },
    });

    // 格式化大小
    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 判断仓库状态
    let status: 'normal' | 'locked' | 'archived' | 'restricted' = 'normal';
    if (repo.isLocked) status = 'locked';
    else if (repo.isArchived) status = 'archived';
    else if (activePenalties.length > 0) status = 'restricted';

    return success({
      id: repo.id,
      name: repo.name,
      description: repo.description,
      owner: repo.owner,
      visibility: repo.visibility === 1 ? 'public' : 'private',
      language: repo.language,
      starCount: repo._count.stars,
      forkCount: repo._count.forks,
      watcherCount: repo._count.watchers,
      size: totalSize,
      sizeFormatted: formatSize(totalSize),
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      lastActivityAt: repo.updatedAt,
      defaultBranch: repo.defaultBranch || 'main',
      openIssues: repo._count.issues,
      openPullRequests: repo._count.pullRequests,
      fileCount,
      folderCount,
      isLocked: repo.isLocked,
      isArchived: repo.isArchived,
      status,
      branches: repo.branches,
      recentCommits: recentCommits.map(c => ({
        sha: c.id.slice(0, 7),
        message: c.message || '无描述',
        date: c.createdAt,
        filePath: c.file?.path,
        version: c.version,
      })),
      forkRequests: forkRequests.map(fr => ({
        id: fr.id,
        status: fr.status,
        message: fr.message,
        createdAt: fr.createdAt,
        processedAt: fr.processedAt,
        requester: fr.requester,
        reviewerUsername: fr.processor?.username,
      })),
      shareLinks: shareLinks.map(link => ({
        id: link.id,
        token: link.token,
        permission: link.permission,
        hasPassword: !!link.password,
        expiresAt: link.expiresAt,
        viewCount: link.viewCount,
        createdAt: link.createdAt,
        path: link.path,
      })),
      ownerPenalties: activePenalties.map(p => ({
        id: p.id,
        type: p.penaltyType,
        reason: p.reason,
        expiresAt: p.expiresAt,
      })),
    });
  },
});
