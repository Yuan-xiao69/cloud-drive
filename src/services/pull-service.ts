/**
 * 合并请求服务 (PullService)
 *
 * 统一合并请求操作入口。当前包含：
 *   - create()    — 创建合并请求
 *   - getById()   — 获取合并请求详情（含评论、仓库、作者）
 *   - update()    — 更新合并请求标题/内容（含权限校验）
 *   - merge()     — 文件级别合并（冲突检测 + 事务写入）
 *   - close()     — 关闭合并请求
 *   - reopen()    — 重新打开合并请求
 *   - addComment() — 添加评论
 */

import { prisma } from '@/lib/prisma';
import { BusinessError } from '@/lib/framework';

// ── 输入/输出类型 ──────────────────────────────────────────────

export interface CreatePullInput {
  repoId: string;
  userId: string;
  title: string;
  content?: string;
  sourceBranch: string;
  targetBranch: string;
  sourceRepoId?: string;
}

export interface UpdatePullInput {
  title?: string;
  content?: string;
}

export interface MergeConflict {
  message: string;
  code: string;
}

export interface MergeResult {
  id: string;
  status: 'merged';
  createdCount: number;
  updatedCount: number;
}

// ── PullService ─────────────────────────────────────────────────

export class PullService {
  /**
   * 创建合并请求
   */
  static async create(input: CreatePullInput) {
    const { repoId, userId, title, content, sourceBranch, targetBranch, sourceRepoId } = input;

    const pullRequest = await prisma.pullRequest.create({
      data: {
        repositoryId: repoId,
        authorId: userId,
        title,
        content: content || '',
        status: 'open',
        sourceBranch,
        targetBranch,
        sourceRepoId: sourceRepoId || null,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
      },
    });

    return {
      id: pullRequest.id,
      repositoryId: pullRequest.repositoryId,
      repository: {
        id: pullRequest.repository.id,
        name: pullRequest.repository.name,
        fullName: `${pullRequest.repository.owner.username}/${pullRequest.repository.name}`,
      },
      authorId: pullRequest.authorId,
      author: {
        id: pullRequest.author.id,
        username: pullRequest.author.username,
        avatarUrl: pullRequest.author.avatarUrl ?? undefined,
      },
      title: pullRequest.title,
      content: pullRequest.content,
      status: pullRequest.status,
      sourceBranch: pullRequest.sourceBranch,
      targetBranch: pullRequest.targetBranch,
      sourceRepoId: pullRequest.sourceRepoId,
      commentsCount: 0,
      createdAt: pullRequest.createdAt,
      updatedAt: pullRequest.updatedAt,
    };
  }

  /**
   * 根据 ID 获取合并请求详情（含评论、仓库、作者、源仓库）
   */
  static async getById(pullId: string) {
    const pullRequest = await prisma.pullRequest.findFirst({
      where: {
        id: pullId,
        isDeleted: false,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
        sourceRepo: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
        comments: {
          where: { isDeleted: false },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!pullRequest) {
      throw new BusinessError('NOT_FOUND', '合并请求不存在', 404);
    }

    return {
      id: pullRequest.id,
      repositoryId: pullRequest.repositoryId,
      repository: {
        id: pullRequest.repository.id,
        name: pullRequest.repository.name,
        fullName: `${pullRequest.repository.owner.username}/${pullRequest.repository.name}`,
      },
      authorId: pullRequest.authorId,
      author: {
        id: pullRequest.author.id,
        username: pullRequest.author.username,
        avatarUrl: pullRequest.author.avatarUrl ?? undefined,
      },
      title: pullRequest.title,
      content: pullRequest.content,
      status: pullRequest.status,
      sourceBranch: pullRequest.sourceBranch,
      targetBranch: pullRequest.targetBranch,
      sourceRepo: pullRequest.sourceRepo
        ? {
            id: pullRequest.sourceRepo.id,
            name: pullRequest.sourceRepo.name,
            fullName: `${pullRequest.sourceRepo.owner.username}/${pullRequest.sourceRepo.name}`,
          }
        : null,
      comments: pullRequest.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        author: {
          id: c.author.id,
          username: c.author.username,
          avatarUrl: c.author.avatarUrl ?? undefined,
        },
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      commentsCount: pullRequest.comments.length,
      createdAt: pullRequest.createdAt,
      updatedAt: pullRequest.updatedAt,
    };
  }

  /**
   * 更新合并请求的标题和/或内容。
   * 调用方应已完成权限校验。
   */
  static async update(pullId: string, userId: string, data: UpdatePullInput) {
    const { title, content } = data;

    const existing = await prisma.pullRequest.findFirst({
      where: { id: pullId, isDeleted: false },
    });

    if (!existing) {
      throw new BusinessError('NOT_FOUND', '合并请求不存在', 404);
    }

    // 仅作者可修改
    if (existing.authorId !== userId) {
      throw new BusinessError('forbidden', '无权修改此合并请求');
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    if (Object.keys(updateData).length === 0) {
      throw new BusinessError('INVALID_PARAMS', '没有提供更新内容');
    }

    const updated = await prisma.pullRequest.update({
      where: { id: pullId },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
      },
    });

    return {
      id: updated.id,
      repositoryId: updated.repositoryId,
      repository: {
        id: updated.repository.id,
        name: updated.repository.name,
        fullName: `${updated.repository.owner.username}/${updated.repository.name}`,
      },
      authorId: updated.authorId,
      author: {
        id: updated.author.id,
        username: updated.author.username,
        avatarUrl: updated.author.avatarUrl ?? undefined,
      },
      title: updated.title,
      content: updated.content,
      status: updated.status,
      sourceBranch: updated.sourceBranch,
      targetBranch: updated.targetBranch,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * 文件级别合并 —— 将源分支的文件变更应用到目标分支。
   *
   * 逻辑：
   *   1. 定位源/目标分支
   *   2. 对比文件哈希，检测冲突
   *   3. 在事务中：创建新增文件、更新变更文件、标记 PR 为 merged
   *
   * 调用方应已完成仓库存在性校验和权限校验（canManageRepo）。
   *
   * @throws {BusinessError} 文件冲突时抛出 MERGE_CONFLICT
   */
  static async merge(pullId: string, _userId: string): Promise<MergeResult> {
    const pullRequest = await prisma.pullRequest.findFirst({
      where: { id: pullId, isDeleted: false },
    });

    if (!pullRequest) {
      throw new BusinessError('NOT_FOUND', '合并请求不存在', 404);
    }

    if (pullRequest.status !== 'open') {
      throw new BusinessError('INVALID_PARAMS', '只能合并开放状态的合并请求');
    }

    const sourceRepoId = pullRequest.sourceRepoId || pullRequest.repositoryId;
    const targetRepoId = pullRequest.repositoryId;

    // 查找源分支和目标分支
    const [sourceBranch, targetBranch] = await Promise.all([
      prisma.branch.findFirst({
        where: { repoId: sourceRepoId, name: pullRequest.sourceBranch },
      }),
      prisma.branch.findFirst({
        where: { repoId: targetRepoId, name: pullRequest.targetBranch },
      }),
    ]);

    if (!sourceBranch) {
      throw new BusinessError('NOT_FOUND', `源分支 '${pullRequest.sourceBranch}' 不存在`, 404);
    }
    if (!targetBranch) {
      throw new BusinessError('NOT_FOUND', `目标分支 '${pullRequest.targetBranch}' 不存在`, 404);
    }

    // 获取源分支和目标分支的所有文件
    const [sourceItems, targetItems] = await Promise.all([
      prisma.repoItem.findMany({
        where: { branchId: sourceBranch.id, isDeleted: false },
        select: {
          id: true,
          name: true,
          type: true,
          path: true,
          fileHash: true,
          fileSize: true,
          mimeType: true,
          storagePath: true,
          linkUrl: true,
          depth: true,
          sortOrder: true,
          parentId: true,
        },
      }),
      prisma.repoItem.findMany({
        where: { branchId: targetBranch.id, isDeleted: false },
        select: { id: true, path: true, fileHash: true },
      }),
    ]);

    // 构建 path → item 映射
    const sourceByPath = new Map(
      sourceItems.filter((f) => f.path).map((f) => [f.path!, f]),
    );
    const targetByPath = new Map(
      targetItems.filter((f) => f.path).map((f) => [f.path!, f]),
    );

    // 冲突检测：同一路径下文件哈希不同则为冲突
    const conflictPaths: string[] = [];
    for (const [path, srcItem] of sourceByPath) {
      const tgtItem = targetByPath.get(path);
      if (tgtItem && srcItem.fileHash !== tgtItem.fileHash) {
        conflictPaths.push(path);
      }
    }

    if (conflictPaths.length > 0) {
      throw new BusinessError(
        'MERGE_CONFLICT',
        `存在 ${conflictPaths.length} 个文件冲突`,
        409,
      );
    }

    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      // 需要新增的文件（源有、目标无），按 depth 升序确保父节点先创建
      const toCreate = sourceItems
        .filter((f) => f.path && !targetByPath.has(f.path))
        .sort((a, b) => a.depth - b.depth);

      const createdPathToId = new Map<string, string>();

      for (const item of toCreate) {
        let newParentId: string | null = null;
        if (item.parentId) {
          const sourceParent = sourceItems.find((s) => s.id === item.parentId);
          if (sourceParent?.path) {
            const targetParent = targetByPath.get(sourceParent.path);
            newParentId =
              targetParent?.id ?? createdPathToId.get(sourceParent.path) ?? null;
          }
        }

        const created = await tx.repoItem.create({
          data: {
            repoId: targetRepoId,
            branchId: targetBranch.id,
            parentId: newParentId,
            name: item.name,
            type: item.type,
            path: item.path!,
            fileHash: item.fileHash,
            fileSize: item.fileSize,
            mimeType: item.mimeType,
            storagePath: item.storagePath,
            linkUrl: item.linkUrl,
            depth: item.depth,
            sortOrder: item.sortOrder,
          },
        });
        createdPathToId.set(item.path!, created.id);
        createdCount++;
      }

      // 更新目标中已存在的文件（覆盖为源的文件属性）
      for (const [path, srcItem] of sourceByPath) {
        const tgtItem = targetByPath.get(path);
        if (tgtItem) {
          await tx.repoItem.update({
            where: { id: tgtItem.id },
            data: {
              fileHash: srcItem.fileHash,
              fileSize: srcItem.fileSize,
              mimeType: srcItem.mimeType,
              storagePath: srcItem.storagePath,
              linkUrl: srcItem.linkUrl,
              updatedAt: new Date(),
            },
          });
          updatedCount++;
        }
      }

      // 标记 PR 为已合并
      await tx.pullRequest.update({
        where: { id: pullId },
        data: { status: 'merged', updatedAt: new Date() },
      });
    });

    return { id: pullId, status: 'merged', createdCount, updatedCount };
  }

  /**
   * 关闭合并请求
   */
  static async close(pullId: string, _userId: string) {
    const existing = await prisma.pullRequest.findFirst({
      where: { id: pullId, isDeleted: false },
    });

    if (!existing) {
      throw new BusinessError('NOT_FOUND', '合并请求不存在', 404);
    }

    if (existing.status === 'closed') {
      return { id: pullId, status: 'closed' };
    }

    await prisma.pullRequest.update({
      where: { id: pullId },
      data: { status: 'closed' },
    });

    return { id: pullId, status: 'closed' };
  }

  /**
   * 重新打开合并请求
   */
  static async reopen(pullId: string, _userId: string) {
    const existing = await prisma.pullRequest.findFirst({
      where: { id: pullId, isDeleted: false },
    });

    if (!existing) {
      throw new BusinessError('NOT_FOUND', '合并请求不存在', 404);
    }

    if (existing.status === 'merged') {
      throw new BusinessError('INVALID_PARAMS', '已合并的合并请求无法重新打开');
    }

    if (existing.status === 'open') {
      return { id: pullId, status: 'open' };
    }

    await prisma.pullRequest.update({
      where: { id: pullId },
      data: { status: 'open' },
    });

    return { id: pullId, status: 'open' };
  }

  /**
   * 添加评论
   */
  static async addComment(pullId: string, userId: string, content: string) {
    const pullRequest = await prisma.pullRequest.findFirst({
      where: { id: pullId, isDeleted: false },
    });

    if (!pullRequest) {
      throw new BusinessError('NOT_FOUND', '合并请求不存在', 404);
    }

    const comment = await prisma.pullRequestComment.create({
      data: {
        pullRequestId: pullId,
        authorId: userId,
        content,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return {
      id: comment.id,
      pullRequestId: comment.pullRequestId,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl ?? undefined,
      },
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
