/**
 * 讨论服务 (DiscussionService)
 *
 * 统一讨论操作入口，所有业务逻辑集中在静态方法中：
 *   - create() — 创建讨论
 *   - getById() — 获取讨论详情（含浏览计数、点赞状态）
 *   - update() — 更新讨论内容（作者或 wiki 模式）
 *   - delete() — 软删除讨论（仅作者）
 *   - addComment() — 添加评论/回复
 *   - deleteComment() — 软删除评论（作者或讨论作者）
 *   - toggleLike() — 切换点赞状态（已赞→取消，未赞→点赞）
 *
 * 所有方法通过 throw BusinessError 报告错误，由 defineRoute 的 ErrorHandler
 * 统一转换为 V1 标准错误响应。
 */

import { prisma } from '@/lib/prisma';
import { BusinessError } from '@/lib/framework';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';

// ============================================================
// 类型定义
// ============================================================

export interface CreateDiscussionInput {
  userId: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface UpdateDiscussionInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

// ============================================================
// 常量
// ============================================================

const VALID_CATEGORIES = ['general', 'qa', 'share', 'suggestion', 'announce'] as const;

// ============================================================
// DiscussionService
// ============================================================

export class DiscussionService {
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
  // create — 创建讨论
  // ----------------------------------------------------------
  /**
   * 创建一篇新讨论。
   *
   * 验证：
   *   1. 禁言检查
   *   2. 标题/内容非空
   *   3. 分类白名单
   *   4. XSS 净化
   *
   * @throws {BusinessError} 验证失败时抛出
   */
  static async create(input: CreateDiscussionInput) {
    const { userId, title, content, category, tags } = input;

    // 禁言检查
    await this.checkMute(userId);

    // 标题校验
    if (!title?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '标题不能为空');
    }

    // 内容校验
    if (!content?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '内容不能为空');
    }

    // 分类白名单
    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      throw new BusinessError('INVALID_PARAMS', '无效的分类');
    }

    // XSS 防护：净化用户输入
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedContent = sanitizeText(content.trim());

    const sanitizedTags: string[] = (tags || [])
      .filter((t) => t.trim().length > 0)
      .map((t) => sanitizeText(t.trim()));

    const discussion = await prisma.discussion.create({
      data: {
        authorId: userId,
        title: sanitizedTitle,
        content: sanitizedContent,
        category,
        tags: sanitizedTags,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return {
      id: discussion.id,
      authorId: discussion.authorId,
      author: {
        id: discussion.author.id,
        username: discussion.author.username,
        avatarUrl: discussion.author.avatarUrl ?? undefined,
      },
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      tags: discussion.tags,
      isWiki: discussion.isWiki,
      status: discussion.status,
      viewCount: discussion.viewCount,
      commentsCount: 0,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // getById — 获取讨论详情
  // ----------------------------------------------------------
  /**
   * 获取讨论完整详情，包含作者信息、点赞状态和浏览计数。
   *
   * 浏览计数：非作者访问时 +1（作者本人不计数）。
   * 点赞状态：已登录用户返回是否已点赞。
   *
   * @param discussionId - 讨论 ID
   * @param userId - 当前用户 ID（可选，用于点赞状态和浏览计数判断）
   * @throws {BusinessError} 讨论不存在时抛出
   */
  static async getById(discussionId: string, userId?: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, isDeleted: false },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, bio: true },
        },
        _count: {
          select: {
            comments: { where: { isDeleted: false } },
            likes: true,
          },
        },
      },
    });

    if (!discussion) {
      throw new BusinessError('NOT_FOUND', '讨论不存在', 404);
    }

    // 增加浏览计数（作者本人访问不计数，减少刷量）
    const isAuthor = userId && userId === discussion.authorId;
    if (!isAuthor) {
      await prisma.discussion.update({
        where: { id: discussionId },
        data: { viewCount: { increment: 1 } },
      });
    }
    const finalViewCount = isAuthor ? discussion.viewCount : discussion.viewCount + 1;

    // 检查当前用户是否已点赞
    let isLiked = false;
    if (userId) {
      const existingLike = await prisma.discussionLike.findUnique({
        where: {
          discussionId_userId: {
            discussionId,
            userId,
          },
        },
      });
      isLiked = !!existingLike;
    }

    return {
      id: discussion.id,
      authorId: discussion.authorId,
      author: {
        id: discussion.author.id,
        username: discussion.author.username,
        avatarUrl: discussion.author.avatarUrl ?? undefined,
        bio: discussion.author.bio ?? undefined,
      },
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      status: discussion.status,
      viewCount: finalViewCount,
      likeCount: discussion._count.likes,
      commentsCount: discussion._count.comments,
      isLiked,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // update — 更新讨论
  // ----------------------------------------------------------
  /**
   * 更新讨论的标题、内容、分类或标签。
   *
   * 权限：作者本人，或 isWiki=true 时允许任何人编辑。
   * 标签更新方式：全量替换。
   *
   * @throws {BusinessError} 无权限、讨论不存在或验证失败时抛出
   */
  static async update(
    discussionId: string,
    userId: string,
    data: UpdateDiscussionInput,
  ) {
    const { title, content, category, tags } = data;

    // 检查讨论是否存在 + 获取权限信息
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, isDeleted: false },
      select: { id: true, authorId: true, isWiki: true },
    });

    if (!discussion) {
      throw new BusinessError('NOT_FOUND', '讨论不存在', 404);
    }

    // 权限：作者 或 wiki 模式允许非作者编辑
    if (discussion.authorId !== userId && !discussion.isWiki) {
      throw new BusinessError('forbidden', '无权修改此讨论');
    }

    // 至少提供一项更新内容
    if (
      title === undefined &&
      content === undefined &&
      category === undefined &&
      tags === undefined
    ) {
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
      if (!content.trim()) {
        throw new BusinessError('INVALID_PARAMS', '内容不能为空');
      }
      updateData.content = sanitizeText(content.trim());
    }

    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
        throw new BusinessError('INVALID_PARAMS', '无效的分类');
      }
      updateData.category = category;
    }

    if (tags !== undefined) {
      const sanitizedTags = (tags || [])
        .filter((t) => t.trim().length > 0)
        .map((t) => sanitizeText(t.trim()));
      updateData.tags = sanitizedTags;
    }

    const updated = await prisma.discussion.update({
      where: { id: discussionId },
      data: updateData,
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return {
      id: updated.id,
      authorId: updated.authorId,
      author: {
        id: updated.author.id,
        username: updated.author.username,
        avatarUrl: updated.author.avatarUrl ?? undefined,
      },
      title: updated.title,
      content: updated.content,
      category: updated.category,
      tags: updated.tags,
      isWiki: updated.isWiki,
      status: updated.status,
      viewCount: updated.viewCount,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // delete — 软删除讨论
  // ----------------------------------------------------------
  /**
   * 软删除讨论（isDeleted → true）。
   *
   * 权限：仅作者本人可删除。
   *
   * @throws {BusinessError} 讨论不存在或无权限时抛出
   */
  static async delete(discussionId: string, userId: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!discussion) {
      throw new BusinessError('NOT_FOUND', '讨论不存在', 404);
    }

    if (discussion.authorId !== userId) {
      throw new BusinessError('forbidden', '无权删除此讨论');
    }

    await prisma.discussion.update({
      where: { id: discussionId },
      data: { isDeleted: true },
    });

    return { id: discussionId };
  }

  // ----------------------------------------------------------
  // addComment — 添加评论
  // ----------------------------------------------------------
  /**
   * 为讨论添加评论或回复。
   *
   * 验证：
   *   1. 禁言检查
   *   2. 内容非空
   *   3. 讨论存在性
   *   4. 屏蔽关系检查（双向屏蔽时禁止评论）
   *   5. 父评论存在性及归属验证（回复时）
   *   6. XSS 净化
   *
   * @param discussionId - 讨论 ID
   * @param userId - 评论作者 ID
   * @param content - 评论内容
   * @param parentId - 父评论 ID（回复时传入）
   * @throws {BusinessError} 验证失败时抛出
   */
  static async addComment(
    discussionId: string,
    userId: string,
    content: string,
    parentId?: string,
  ) {
    // 禁言检查
    await this.checkMute(userId);

    // 内容校验
    if (!content?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '评论内容不能为空');
    }

    // 检查讨论是否存在
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!discussion) {
      throw new BusinessError('NOT_FOUND', '讨论不存在', 404);
    }

    // 检查屏蔽关系（仅非同作者时检查）
    if (discussion.authorId !== userId) {
      const blocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: discussion.authorId },
            { blockerId: discussion.authorId, blockedId: userId },
          ],
        },
        select: { id: true },
      });
      if (blocked) {
        throw new BusinessError('forbidden', '由于屏蔽关系，无法在此讨论中评论');
      }
    }

    // 如果是回复，检查父评论是否存在且属于该讨论
    if (parentId) {
      const parentComment = await prisma.discussionComment.findUnique({
        where: { id: parentId, isDeleted: false },
      });
      if (!parentComment) {
        throw new BusinessError('NOT_FOUND', '父评论不存在', 404);
      }
      if (parentComment.discussionId !== discussionId) {
        throw new BusinessError('INVALID_PARAMS', '父评论不属于该讨论');
      }
    }

    const sanitizedContent = sanitizeText(content.trim());

    const comment = await prisma.discussionComment.create({
      data: {
        discussionId,
        authorId: userId,
        content: sanitizedContent,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    return {
      id: comment.id,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl ?? undefined,
      },
      content: comment.content,
      parentId: comment.parentId,
      isAccepted: comment.isAccepted,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // deleteComment — 软删除评论
  // ----------------------------------------------------------
  /**
   * 软删除评论（isDeleted → true）。
   *
   * 权限：评论作者本人 或 讨论作者可删除。
   *
   * @throws {BusinessError} 评论不存在或无权限时抛出
   */
  static async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.discussionComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, discussionId: true, isDeleted: true },
    });

    if (!comment || comment.isDeleted) {
      throw new BusinessError('NOT_FOUND', '评论不存在', 404);
    }

    // 权限：评论作者 或 讨论作者
    if (comment.authorId !== userId) {
      const discussion = await prisma.discussion.findUnique({
        where: { id: comment.discussionId },
        select: { authorId: true },
      });
      if (!discussion || discussion.authorId !== userId) {
        throw new BusinessError('forbidden', '无权删除此评论');
      }
    }

    await prisma.discussionComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return { id: commentId };
  }

  // ----------------------------------------------------------
  // toggleLike — 切换点赞状态
  // ----------------------------------------------------------
  /**
   * 切换讨论的点赞状态：已赞则取消，未赞则点赞。
   *
   * @returns { isLiked, likeCount, action } — action 为 'liked' 或 'unliked'
   * @throws {BusinessError} 讨论不存在时抛出
   */
  static async toggleLike(discussionId: string, userId: string) {
    // 检查讨论是否存在
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, isDeleted: false },
      select: { id: true },
    });

    if (!discussion) {
      throw new BusinessError('NOT_FOUND', '讨论不存在', 404);
    }

    // 查找现有点赞
    const existingLike = await prisma.discussionLike.findUnique({
      where: {
        discussionId_userId: {
          discussionId,
          userId,
        },
      },
    });

    if (existingLike) {
      // 取消点赞
      await prisma.discussionLike.delete({
        where: { id: existingLike.id },
      });

      const likeCount = await prisma.discussionLike.count({
        where: { discussionId },
      });

      return { isLiked: false, likeCount, action: 'unliked' as const };
    }

    // 点赞
    await prisma.discussionLike.create({
      data: { discussionId, userId },
    });

    const likeCount = await prisma.discussionLike.count({
      where: { discussionId },
    });

    return { isLiked: true, likeCount, action: 'liked' as const };
  }
}
