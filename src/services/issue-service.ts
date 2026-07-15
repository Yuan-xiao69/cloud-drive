/**
 * Issue 服务 (IssueService)
 *
 * 统一 Issue 操作入口，所有业务逻辑集中在静态方法中：
 *   - create() — 创建 Issue（含标签，事务）
 *   - getById() — 获取 Issue 详情（含评论）
 *   - update() — 更新 Issue 内容 / 标签
 *   - close() / reopen() / deleteIssue() — 状态变更
 *   - addComment() — 添加评论
 *   - deleteComment() — 删除评论（软删除）
 *
 * 所有方法通过 throw BusinessError 报告错误，由 defineRoute 的 ErrorHandler
 * 统一转换为 V1 标准错误响应。
 */

import { prisma } from '@/lib/prisma';
import { BusinessError } from '@/lib/framework';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';
import { getUserRepoRole, canManageIssues } from '@/lib/auth/repo-permission';

// ============================================================
// 类型定义
// ============================================================

export interface IssueLabelInput {
  name: string;
  color?: string;
}

export interface CreateIssueInput {
  repoId: string;
  userId: string;
  title: string;
  content?: string;
  labels?: IssueLabelInput[];
  priority?: string;
  templateType?: string;
}

export interface UpdateIssueInput {
  title?: string;
  content?: string;
  labels?: IssueLabelInput[];
}

// ============================================================
// IssueService
// ============================================================

export class IssueService {
  // ----------------------------------------------------------
  // 私有辅助：检查用户对 Issue 所属仓库的操作权限
  // ----------------------------------------------------------
  private static async checkPermission(
    issueId: string,
    userId: string,
    actionName: string,
  ): Promise<void> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, authorId: true, repositoryId: true },
    });

    if (!issue) {
      throw new BusinessError('NOT_FOUND', 'Issue 不存在', 404);
    }

    const userRole = await getUserRepoRole(userId, issue.repositoryId);
    if (issue.authorId !== userId && !canManageIssues(userRole)) {
      throw new BusinessError('forbidden', `无权${actionName}此 Issue`);
    }
  }

  // ----------------------------------------------------------
  // 私有辅助：禁言检查
  // ----------------------------------------------------------
  private static async checkMute(userId: string): Promise<void> {
    const muteCheck = await isUserMuted(userId);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      throw new BusinessError(
        'forbidden',
        `您已被禁言：${muteCheck.penalty.reason}${endStr}`,
      );
    }
  }

  // ----------------------------------------------------------
  // 创建 Issue
  // ----------------------------------------------------------
  /**
   * 创建 Issue 及其标签，在单个事务中完成。
   *
   * 验证：
   *   1. 标题不能为空
   *   2. 用户禁言检查
   *   3. XSS 净化
   *   4. 优先级 / 模板类型白名单校验
   *
   * @throws {BusinessError} 验证失败或仓库不存在时抛出
   */
  static async create(input: CreateIssueInput) {
    const {
      repoId,
      userId,
      title,
      content,
      labels,
      priority,
      templateType,
    } = input;

    // 禁言检查
    await this.checkMute(userId);

    // 标题校验
    if (!title?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '标题不能为空');
    }

    // XSS 防护
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedContent = sanitizeText(content?.trim() || '');

    // 优先级白名单
    const validPriorities = ['urgent', 'high', 'normal', 'low'];
    const sanitizedPriority =
      priority && validPriorities.includes(priority) ? priority : 'normal';

    // 模板类型白名单
    const validTemplates = ['bug', 'feature', 'question'];
    const sanitizedTemplate =
      templateType && validTemplates.includes(templateType) ? templateType : null;

    // 事务：创建 Issue + 创建标签
    const issue = await prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          repositoryId: repoId,
          authorId: userId,
          title: sanitizedTitle,
          content: sanitizedContent,
          status: 'open',
          priority: sanitizedPriority,
          templateType: sanitizedTemplate,
        },
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          labels: true,
        },
      });

      if (labels && Array.isArray(labels) && labels.length > 0) {
        const labelData = labels.map((l) => ({
          issueId: created.id,
          name: l.name,
          color: l.color || '#0075ca',
        }));
        await tx.issueLabel.createMany({ data: labelData });

        // 重新获取含标签的 Issue
        const withLabels = await tx.issue.findUnique({
          where: { id: created.id },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            labels: true,
          },
        });
        return withLabels!;
      }

      return created;
    });

    return {
      id: issue.id,
      repositoryId: issue.repositoryId,
      authorId: issue.authorId,
      author: {
        id: issue.author.id,
        username: issue.author.username,
        avatarUrl: issue.author.avatarUrl ?? undefined,
      },
      title: issue.title,
      content: issue.content,
      status: issue.status,
      priority: issue.priority,
      templateType: issue.templateType,
      dueDate: issue.dueDate?.toISOString() ?? null,
      relatedFileId: issue.relatedFileId,
      assigneeId: issue.assigneeId,
      labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
      commentsCount: 0,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // 获取 Issue 详情
  // ----------------------------------------------------------
  /**
   * 获取 Issue 完整详情，包含作者、仓库、标签和评论列表。
   *
   * @throws {BusinessError} Issue 不存在时抛出
   */
  static async getById(issueId: string) {
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, isDeleted: false },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        repository: {
          include: {
            owner: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        labels: true,
        comments: {
          where: { isDeleted: false },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!issue) {
      throw new BusinessError('NOT_FOUND', 'Issue 不存在', 404);
    }

    return {
      id: issue.id,
      repositoryId: issue.repositoryId,
      repository: {
        id: issue.repository.id,
        name: issue.repository.name,
        owner: {
          id: issue.repository.owner.id,
          username: issue.repository.owner.username,
        },
      },
      authorId: issue.authorId,
      author: {
        id: issue.author.id,
        username: issue.author.username,
        avatarUrl: issue.author.avatarUrl ?? undefined,
      },
      title: issue.title,
      content: issue.content,
      status: issue.status,
      priority: issue.priority,
      templateType: issue.templateType,
      dueDate: issue.dueDate?.toISOString() ?? null,
      relatedFileId: issue.relatedFileId,
      assigneeId: issue.assigneeId,
      labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
      comments: issue.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        author: {
          id: c.author.id,
          username: c.author.username,
          avatarUrl: c.author.avatarUrl ?? undefined,
        },
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      commentsCount: issue.comments.length,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // 更新 Issue（内容 + 标签）
  // ----------------------------------------------------------
  /**
   * 更新 Issue 的标题、内容或标签。
   *
   * 权限：仅作者或仓库管理员可操作。
   * 标签更新方式：全量替换（先删后建）。
   *
   * @throws {BusinessError} 无权限或 Issue 不存在时抛出
   */
  static async update(
    issueId: string,
    userId: string,
    data: UpdateIssueInput,
  ) {
    const { title, content, labels } = data;

    // 权限检查（内部验证 Issue 存在）
    await this.checkPermission(issueId, userId, '修改');

    // 没有提供任何更新内容
    if (title === undefined && content === undefined && (!labels || labels.length === 0)) {
      throw new BusinessError('INVALID_PARAMS', '没有提供更新内容');
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) {
      if (!title.trim()) {
        throw new BusinessError('INVALID_PARAMS', '标题不能为空');
      }
      updateData.title = sanitizeText(title.trim());
    }
    if (content !== undefined) {
      updateData.content = sanitizeText(content.trim());
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.issue.update({
        where: { id: issueId },
        data: updateData,
      });
    }

    // 更新标签（全量替换）
    if (labels !== undefined && Array.isArray(labels)) {
      await prisma.issueLabel.deleteMany({ where: { issueId } });

      if (labels.length > 0) {
        const labelData = labels.map((l) => ({
          issueId,
          name: l.name,
          color: l.color || '#0075ca',
        }));
        await prisma.issueLabel.createMany({ data: labelData });
      }
    }

    // 返回更新后的 Issue
    const finalIssue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        labels: true,
      },
    });

    return {
      id: finalIssue!.id,
      repositoryId: finalIssue!.repositoryId,
      authorId: finalIssue!.authorId,
      author: {
        id: finalIssue!.author.id,
        username: finalIssue!.author.username,
        avatarUrl: finalIssue!.author.avatarUrl ?? undefined,
      },
      title: finalIssue!.title,
      content: finalIssue!.content,
      status: finalIssue!.status,
      priority: finalIssue!.priority,
      templateType: finalIssue!.templateType,
      dueDate: finalIssue!.dueDate?.toISOString() ?? null,
      relatedFileId: finalIssue!.relatedFileId,
      assigneeId: finalIssue!.assigneeId,
      labels: finalIssue!.labels.map((l) => ({ name: l.name, color: l.color })),
      updatedAt: finalIssue!.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // 关闭 Issue
  // ----------------------------------------------------------
  /**
   * 关闭 Issue（状态 → 'closed'）。
   *
   * 权限：仅作者或仓库管理员可操作。
   */
  static async close(issueId: string, userId: string) {
    await this.checkPermission(issueId, userId, '关闭');
    await prisma.issue.update({
      where: { id: issueId },
      data: { status: 'closed' },
    });
    return { id: issueId, status: 'closed' };
  }

  // ----------------------------------------------------------
  // 重新打开 Issue
  // ----------------------------------------------------------
  /**
   * 重新打开 Issue（状态 → 'open'）。
   *
   * 权限：仅作者或仓库管理员可操作。
   */
  static async reopen(issueId: string, userId: string) {
    await this.checkPermission(issueId, userId, '重新打开');
    await prisma.issue.update({
      where: { id: issueId },
      data: { status: 'open' },
    });
    return { id: issueId, status: 'open' };
  }

  // ----------------------------------------------------------
  // 软删除 Issue
  // ----------------------------------------------------------
  /**
   * 软删除 Issue（isDeleted → true）。
   *
   * 权限：仅作者或仓库管理员可操作。
   */
  static async deleteIssue(issueId: string, userId: string) {
    await this.checkPermission(issueId, userId, '删除');
    await prisma.issue.update({
      where: { id: issueId },
      data: { isDeleted: true },
    });
    return { id: issueId };
  }

  // ----------------------------------------------------------
  // 添加评论
  // ----------------------------------------------------------
  /**
   * 为 Issue 添加评论。
   *
   * 验证：
   *   1. 禁言检查
   *   2. 内容不能为空
   *   3. XSS 净化
   */
  static async addComment(issueId: string, userId: string, content: string) {
    // 禁言检查
    await this.checkMute(userId);

    // Issue 存在性检查
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, isDeleted: false },
      select: { id: true },
    });
    if (!issue) {
      throw new BusinessError('NOT_FOUND', 'Issue 不存在', 404);
    }

    if (!content?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '评论内容不能为空');
    }

    const sanitizedContent = sanitizeText(content.trim());

    const comment = await prisma.issueComment.create({
      data: {
        issueId,
        authorId: userId,
        content: sanitizedContent,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return {
      id: comment.id,
      issueId: comment.issueId,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl ?? undefined,
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // 删除评论
  // ----------------------------------------------------------
  /**
   * 软删除评论（isDeleted → true）。
   *
   * 权限：仅评论作者或仓库管理员可操作。
   */
  static async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.issueComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, issueId: true, isDeleted: true },
    });

    if (!comment || comment.isDeleted) {
      throw new BusinessError('NOT_FOUND', '评论不存在', 404);
    }

    // 通过 Issue → 仓库链路检查权限
    const issue = await prisma.issue.findUnique({
      where: { id: comment.issueId },
      select: { repositoryId: true },
    });

    if (!issue) {
      throw new BusinessError('NOT_FOUND', '关联的 Issue 不存在', 404);
    }

    const userRole = await getUserRepoRole(userId, issue.repositoryId);
    if (comment.authorId !== userId && !canManageIssues(userRole)) {
      throw new BusinessError('forbidden', '无权删除此评论');
    }

    await prisma.issueComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return { id: commentId };
  }
}
