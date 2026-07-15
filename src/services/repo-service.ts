/**
 * 仓库服务 (RepoService)
 *
 * 统一仓库操作入口。所有仓库核心业务逻辑集中在此，API Route 仅负责参数提取和格式转换。
 *
 * 当前包含：
 *   - create() — 创建仓库（含事务：仓库 + 默认分支 + 根目录项）
 *   - getByOwnerAndName() — 按所有者用户名和仓库名获取仓库详情
 *   - update() — 更新仓库设置
 *   - delete() — 软删除仓库
 *   - archive() — 归档 / 取消归档仓库
 *   - fork() — Fork 仓库的双路径唯一入口（公开直接Fork / 审批后Fork）
 *   - star() / unstar() — 收藏 / 取消收藏仓库
 *   - watch() / unwatch() — 关注 / 取消关注仓库
 *   - createBranch() / listBranches() / deleteBranch() — 分支管理
 *
 * 所有方法通过 throw BusinessError 报告错误，由 defineRoute 的 ErrorHandler
 * 统一转换为 V1 标准错误响应。
 */

import { prisma } from '@/lib/prisma';
import { isUserRepoLimited } from '@/lib/user-restrictions';
import { ForkService } from '@/services/fork-service';
import { BusinessError } from '@/lib/framework';
import { getUserRepoRole, canManageRepo, canWrite } from '@/lib/auth/repo-permission';
import { logActivity } from '@/lib/activity-log';
import { sanitizeText } from '@/lib/security';

// ============================================================
// 类型定义
// ============================================================

/** Fork 操作的输入参数 */
export interface ForkInput {
  /** 源仓库所有者用户名 */
  sourceUsername: string;
  /** 源仓库名称 */
  sourceRepoName: string;
  /** 执行 Fork 的用户 ID */
  userId: string;
  /** 执行 Fork 的用户名（用于构建 fullName） */
  username: string;
  /** 是否要求源仓库为公开（默认 false，公开 Fork 路由应设为 true） */
  requirePublic?: boolean;
}

/** Fork 操作的结果 */
export interface ForkResult {
  id: string;
  name: string;
  fullName: string;
}

/** 创建仓库的输入参数 */
export interface CreateRepoInput {
  userId: string;
  name: string;
  description?: string;
  visibility?: number | boolean;
  defaultBranch?: string;
  language?: string;
}

/** 创建仓库的结果 */
export interface CreateRepoResult {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  defaultBranch: string;
  language?: string;
  starCount: number;
  forkCount: number;
  watchCount: number;
  createdAt: string;
  updatedAt: string;
  owner: { username: string };
}

/** 仓库详情结果 */
export interface RepoDetailResult {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  language?: string;
  starCount: number;
  forkCount: number;
  watchCount: number;
  isStarred: boolean;
  isWatching: boolean;
  isForked: boolean;
  viewCount: number;
  openIssueCount: number;
  openPullRequestCount: number;
  owner: { id: string; username: string; avatarUrl: string | null };
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

/** 更新仓库的输入参数 */
export interface UpdateRepoInput {
  name?: string;
  description?: string;
  visibility?: string | number;
  defaultBranch?: string;
  language?: string;
}

/** 仓库基本信息 */
export interface RepoBrief {
  id: string;
  ownerId: string;
  name: string;
  visibility: number;
}

/** Star 操作结果 */
export interface StarResult {
  starred: boolean;
}

/** Watch 操作结果 */
export interface WatchResult {
  watching: boolean;
}

/** 分支信息 */
export interface BranchInfo {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

/** 分支列表结果 */
export interface BranchListResult {
  branches: BranchInfo[];
  defaultBranch: string;
}

/** 创建分支的输入参数 */
export interface CreateBranchInput {
  repoId: string;
  userId: string;
  name: string;
  fromBranch?: string;
}

/** 创建分支的结果 */
export interface CreateBranchResult {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

// ============================================================
// 内部工具
// ============================================================

/** 仓库名称正则（参考 GitHub 标准） */
const REPO_NAME_REGEX = /^[a-zA-Z0-9._-一-龥]+$/;

/** 保留名称集合 */
const RESERVED_NAMES = new Set([
  '.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1',
]);

/**
 * 验证仓库名称格式并返回修剪后的名称。
 * @throws {BusinessError} 格式不合法时抛出
 */
function validateRepoName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new BusinessError('VALIDATION_ERROR', '仓库名称长度必须在 1-100 个字符之间');
  }
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) {
    throw new BusinessError('VALIDATION_ERROR', '仓库名称不能以 . 开头或结尾');
  }
  if (!REPO_NAME_REGEX.test(trimmed)) {
    throw new BusinessError('VALIDATION_ERROR', '仓库名称只能包含字母、数字、点、中划线和下划线');
  }
  if (RESERVED_NAMES.has(trimmed.toUpperCase())) {
    throw new BusinessError('VALIDATION_ERROR', '该仓库名称为系统保留名称，请使用其他名称');
  }
  return trimmed;
}

/**
 * 根据用户名查仓库，不存在时抛出 BusinessError。
 */
async function resolveRepo(username: string, repoName: string): Promise<RepoBrief> {
  const repo = await prisma.repository.findFirst({
    where: {
      owner: { username },
      name: repoName,
      deletedAt: null,
    },
    select: { id: true, ownerId: true, name: true, visibility: true },
  });
  if (!repo) {
    throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
  }
  return repo;
}

/**
 * 将 visibility 值转换为内部数字表示。
 * 支持：'public'/'private' 字符串 或 0/1 数字。
 */
function normalizeVisibility(visibility?: string | number | boolean): number | undefined {
  if (visibility === undefined) return undefined;
  if (typeof visibility === 'boolean') return visibility ? 1 : 0;
  if (typeof visibility === 'string') return visibility === 'private' ? 0 : 1;
  return visibility;
}

// ============================================================
// RepoService
// ============================================================

export class RepoService {
  // ==========================================================
  // resolveRepoId — 轻量仓库解析（无副作用）
  // ==========================================================

  /**
   * 根据所有者用户名和仓库名获取仓库基本信息（无 viewCount 递增等副作用）。
   * 用于 PATCH/DELETE 等写操作路由中的仓库查找。
   *
   * @param username — 所有者用户名
   * @param repoName — 仓库名称
   * @returns 仓库基本信息（id, ownerId, name, visibility）
   * @throws {BusinessError} 仓库不存在时抛出
   */
  static async resolveRepoId(
    username: string,
    repoName: string,
  ): Promise<RepoBrief> {
    return resolveRepo(username, repoName);
  }

  // ==========================================================
  // create — 创建仓库
  // ==========================================================

  /**
   * 在当前用户下创建新仓库。
   *
   * 验证：
   *   1. 仓库名称格式校验
   *   2. 仓库名称唯一性（同一用户下不重名）
   *   3. 用户仓库数量限制检查
   *
   * 事务操作：
   *   a. 创建仓库记录
   *   b. 创建默认分支
   *   c. 创建根目录 repoItem
   *
   * @throws {BusinessError} 验证失败时抛出
   */
  static async create(input: CreateRepoInput): Promise<CreateRepoResult> {
    const { userId, name, description, visibility, defaultBranch, language } = input;

    // 检查用户仓库数量限制
    const repoLimited = await isUserRepoLimited(userId);
    if (repoLimited.limited) {
      const reason = repoLimited.penalty?.reason || '仓库数量已达上限';
      throw new BusinessError('forbidden', `${reason}，无法创建仓库`);
    }

    // 验证名称格式
    const nameTrimmed = validateRepoName(name);

    // 检查唯一性
    const existing = await prisma.repository.findFirst({
      where: {
        ownerId: userId,
        name: nameTrimmed,
        deletedAt: null,
      },
    });
    if (existing) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      throw new BusinessError('conflict', `用户 ${user?.username ?? 'unknown'} 已有同名仓库 "${nameTrimmed}"`);
    }

    // 处理可见性
    const isPrivate = visibility === 0 || visibility === false;

    // 处理默认分支名称
    const branchName = (defaultBranch && typeof defaultBranch === 'string' && defaultBranch.trim())
      ? defaultBranch.trim()
      : 'main';

    // 事务创建
    const repo = await prisma.$transaction(async (tx) => {
      const newRepo = await tx.repository.create({
        data: {
          ownerId: userId,
          name: nameTrimmed,
          description: description || null,
          visibility: isPrivate ? 0 : 1,
          defaultBranch: branchName,
          language: language || null,
        },
      });

      await tx.branch.create({
        data: {
          repoId: newRepo.id,
          name: branchName,
          isDefault: true,
        },
      });

      await tx.repoItem.create({
        data: {
          repoId: newRepo.id,
          name: nameTrimmed,
          type: 'folder',
          path: `/${nameTrimmed}`,
          depth: 0,
          sortOrder: 0,
        },
      });

      return newRepo;
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    return {
      id: repo.id,
      name: repo.name,
      description: repo.description ?? undefined,
      visibility: repo.visibility === 1 ? 'public' : 'private',
      defaultBranch: repo.defaultBranch,
      language: repo.language ?? undefined,
      starCount: repo.starCount,
      forkCount: repo.forkCount,
      watchCount: repo.watchCount,
      createdAt: repo.createdAt.toISOString(),
      updatedAt: repo.updatedAt.toISOString(),
      owner: { username: user?.username ?? 'unknown' },
    };
  }

  // ==========================================================
  // getByOwnerAndName — 获取仓库详情
  // ==========================================================

  /**
   * 按所有者用户名和仓库名获取仓库详情。
   *
   * 包含：
   *   - 可见性检查（私有仓库仅所有者可访问）
   *   - 当前用户 star/watch/fork 状态
   *   - 自动递增 viewCount
   *
   * @param username — 仓库所有者用户名
   * @param repoName — 仓库名称
   * @param currentUserId — 当前登录用户 ID（可选，匿名访问传 undefined）
   * @throws {BusinessError} 仓库不存在或无权访问时抛出
   */
  static async getByOwnerAndName(
    username: string,
    repoName: string,
    currentUserId?: string,
  ): Promise<RepoDetailResult> {
    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            stars: true,
            watchers: true,
            forks: true,
            issues: { where: { status: 'open', isDeleted: false } },
            pullRequests: { where: { status: 'open', isDeleted: false } },
          },
        },
      },
    });

    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    // 私有仓库检查
    if (repo.visibility === 0 && (!currentUserId || currentUserId !== repo.ownerId)) {
      throw new BusinessError('FORBIDDEN', '私有仓库无法访问', 403);
    }

    // 检查当前用户是否已收藏/关注/已Fork
    let isStarred = false;
    let isWatching = false;
    let isForked = false;
    if (currentUserId && currentUserId !== repo.ownerId) {
      const [star, watcher, fork] = await Promise.all([
        prisma.star.findUnique({
          where: { userId_repoId: { userId: currentUserId, repoId: repo.id } },
          select: { id: true },
        }),
        prisma.watcher.findUnique({
          where: { userId_repoId: { userId: currentUserId, repoId: repo.id } },
          select: { id: true },
        }),
        prisma.repository.findFirst({
          where: { ownerId: currentUserId, forkedFromId: repo.id, deletedAt: null },
          select: { id: true },
        }),
      ]);
      isStarred = !!star;
      isWatching = !!watcher;
      isForked = !!fork;
    }

    // 增加浏览数
    const updated = await prisma.repository.update({
      where: { id: repo.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    return {
      id: repo.id,
      name: repo.name,
      description: repo.description ?? undefined,
      visibility: repo.visibility === 1 ? 'public' : 'private',
      language: repo.language ?? undefined,
      starCount: repo.starCount,
      forkCount: repo.forkCount,
      watchCount: repo.watchCount,
      isStarred,
      isWatching,
      isForked,
      viewCount: updated.viewCount,
      openIssueCount: repo._count.issues,
      openPullRequestCount: repo._count.pullRequests,
      owner: repo.owner,
      defaultBranch: repo.defaultBranch,
      createdAt: repo.createdAt.toISOString(),
      updatedAt: repo.updatedAt.toISOString(),
    };
  }

  // ==========================================================
  // update — 更新仓库设置
  // ==========================================================

  /**
   * 更新仓库名称、描述、可见性、默认分支、语言等设置。
   *
   * 权限：仅仓库所有者或管理员。
   * 修改名称时会校验格式和唯一性。
   *
   * @param repoId — 仓库 ID
   * @param userId — 当前用户 ID
   * @param data — 要更新的字段（未传入的字段保持不变）
   * @throws {BusinessError} 无权限或校验失败时抛出
   */
  static async update(repoId: string, userId: string, data: UpdateRepoInput) {
    const { name, description, visibility, defaultBranch, language } = data;

    // 权限检查
    const userRole = await getUserRepoRole(userId, repoId);
    if (!canManageRepo(userRole)) {
      throw new BusinessError('FORBIDDEN', '无权修改仓库设置', 403);
    }

    // 获取原仓库信息（用于名称校验）
    const currentRepo = await prisma.repository.findUnique({
      where: { id: repoId },
      select: { id: true, name: true, ownerId: true },
    });
    if (!currentRepo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    // 修改名称时的校验
    if (name !== undefined && name !== currentRepo.name) {
      validateRepoName(name);

      const existing = await prisma.repository.findFirst({
        where: {
          ownerId: currentRepo.ownerId,
          name: name.trim(),
          deletedAt: null,
        },
      });
      if (existing) {
        throw new BusinessError('conflict', '仓库名称已被使用');
      }
    }

    const visibilityValue = normalizeVisibility(visibility);

    const updated = await prisma.repository.update({
      where: { id: repoId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(visibilityValue !== undefined && { visibility: visibilityValue }),
        ...(defaultBranch !== undefined && { defaultBranch }),
        ...(language !== undefined && { language }),
      },
    });

    return updated;
  }

  // ==========================================================
  // delete — 软删除仓库
  // ==========================================================

  /**
   * 软删除仓库（设置 deletedAt）。
   *
   * 权限：仅仓库所有者或管理员。
   *
   * @param repoId — 仓库 ID
   * @param userId — 当前用户 ID
   * @returns { id: repoId }
   * @throws {BusinessError} 无权限或仓库不存在时抛出
   */
  static async delete(repoId: string, userId: string): Promise<{ id: string }> {
    const userRole = await getUserRepoRole(userId, repoId);
    if (!canManageRepo(userRole)) {
      throw new BusinessError('FORBIDDEN', '无权删除仓库', 403);
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      select: { id: true },
    });
    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    await prisma.repository.update({
      where: { id: repoId },
      data: { deletedAt: new Date() },
    });

    return { id: repoId };
  }

  // ==========================================================
  // archive — 归档 / 取消归档仓库
  // ==========================================================

  /**
   * 归档或取消归档仓库。
   *
   * 权限：仅仓库所有者或管理员。
   *
   * @param repoId — 仓库 ID
   * @param userId — 当前用户 ID
   * @param archive — true 归档，false 取消归档
   * @returns 更新后的仓库基本信息
   * @throws {BusinessError} 无权限或仓库不存在时抛出
   */
  static async archive(
    repoId: string,
    userId: string,
    archive: boolean,
  ): Promise<{ id: string; name: string; isArchived: boolean }> {
    const userRole = await getUserRepoRole(userId, repoId);
    if (!canManageRepo(userRole)) {
      throw new BusinessError('FORBIDDEN', '无权归档仓库', 403);
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repoId },
      select: { id: true, name: true, isArchived: true },
    });
    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    const updatedRepo = await prisma.repository.update({
      where: { id: repoId },
      data: { isArchived: archive },
      select: { id: true, name: true, isArchived: true },
    });

    return {
      id: updatedRepo.id,
      name: updatedRepo.name,
      isArchived: updatedRepo.isArchived,
    };
  }

  // ==========================================================
  // fork — Fork 仓库
  // ==========================================================

  /**
   * Fork 仓库 —— 公开直接 Fork 和审批后 Fork 的唯一入口。
   *
   * 验证：
   *   1. 源仓库存在
   *   2. 不能 Fork 自己的仓库
   *   3. 检查用户仓库数量限制
   *   4. 检查是否已经 Fork 过
   *   5. （可选）要求源仓库为公开
   *
   * 事务操作：
   *   a. 创建 Fork 仓库记录
   *   b. 复制源仓库文件树（RepoItem）
   *   c. 复制分支（Branch）
   *   d. 递增源仓库 forkCount
   *
   * @throws {BusinessError} 验证失败时抛出
   */
  static async fork(input: ForkInput): Promise<ForkResult> {
    const {
      sourceUsername,
      sourceRepoName,
      userId,
      username,
      requirePublic = false,
    } = input;

    // ---- 1. 查找源仓库 ----
    const sourceRepo = await prisma.repository.findFirst({
      where: {
        owner: { username: sourceUsername },
        name: sourceRepoName,
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, username: true } },
      },
    });

    if (!sourceRepo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    // ---- 2. 不能 Fork 自己的仓库 ----
    if (sourceRepo.ownerId === userId) {
      throw new BusinessError('forbidden', '不能 Fork 自己的仓库');
    }

    // ---- 3. 可选：要求公开仓库 ----
    if (requirePublic && sourceRepo.visibility !== 1) {
      throw new BusinessError(
        'forbidden',
        '私有仓库需要申请 Fork，请使用 /fork-request',
      );
    }

    // ---- 4. 检查用户仓库数量限制 ----
    const repoLimited = await isUserRepoLimited(userId);
    if (repoLimited.limited) {
      const reason = repoLimited.penalty?.reason || '仓库数量已达上限';
      throw new BusinessError('forbidden', `${reason}，无法 Fork`);
    }

    // ---- 5. 检查是否已 Fork 过 ----
    const existingFork = await prisma.repository.findFirst({
      where: {
        ownerId: userId,
        forkedFromId: sourceRepo.id,
        isFork: true,
        deletedAt: null,
      },
    });

    if (existingFork) {
      throw new BusinessError('conflict', '您已经 Fork 了这个仓库');
    }

    // ---- 6. 事务：创建 Fork + 复制文件 + 复制分支 + 更新计数 ----
    const forkedRepo = await prisma.$transaction(async (tx) => {
      // a. 创建 Fork 仓库记录
      const newRepo = await tx.repository.create({
        data: {
          ownerId: userId,
          name: sourceRepo.name,
          description: sourceRepo.description,
          visibility: 1, // Fork 仓库默认公开
          isFork: true,
          forkedFromId: sourceRepo.id,
          defaultBranch: sourceRepo.defaultBranch,
          language: sourceRepo.language,
        },
      });

      // b. 复制源仓库文件树
      await ForkService.copyRepoItems(tx, sourceRepo.id, newRepo.id);

      // c. 复制分支
      await ForkService.copyBranches(tx, sourceRepo.id, newRepo.id);

      // d. 递增源仓库 fork 计数
      await tx.repository.update({
        where: { id: sourceRepo.id },
        data: { forkCount: { increment: 1 } },
      });

      return newRepo;
    });

    return {
      id: forkedRepo.id,
      name: forkedRepo.name,
      fullName: `${username}/${forkedRepo.name}`,
    };
  }

  // ==========================================================
  // star — 收藏仓库
  // ==========================================================

  /**
   * 收藏指定仓库。
   *
   * 验证：
   *   1. 仓库存在
   *   2. 不能收藏自己的仓库
   *   3. 双方不存在屏蔽关系
   *   4. 未重复收藏
   *
   * 事务操作：创建 star 记录 + 递增 starCount
   *
   * @param userId — 当前用户 ID
   * @param repoId — 目标仓库 ID
   * @returns { starred: true }
   * @throws {BusinessError} 验证失败时抛出
   */
  static async star(userId: string, repoId: string): Promise<StarResult> {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, deletedAt: null },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    if (repo.ownerId === userId) {
      throw new BusinessError('forbidden', '不能收藏自己的仓库');
    }

    // 检查屏蔽关系
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: repo.ownerId },
          { blockerId: repo.ownerId, blockedId: userId },
        ],
      },
      select: { id: true },
    });
    if (isBlocked) {
      throw new BusinessError('forbidden', '由于屏蔽关系，无法执行此操作');
    }

    // 检查是否已收藏
    const existing = await prisma.star.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });
    if (existing) {
      throw new BusinessError('badRequest', '已收藏该仓库');
    }

    await prisma.$transaction([
      prisma.star.create({ data: { userId, repoId } }),
      prisma.repository.update({
        where: { id: repoId },
        data: { starCount: { increment: 1 } },
      }),
    ]);

    return { starred: true };
  }

  // ==========================================================
  // unstar — 取消收藏仓库
  // ==========================================================

  /**
   * 取消收藏指定仓库。
   *
   * 事务操作：删除 star 记录 + 递减 starCount
   *
   * @param userId — 当前用户 ID
   * @param repoId — 目标仓库 ID
   * @returns { starred: false }
   * @throws {BusinessError} 验证失败时抛出
   */
  static async unstar(userId: string, repoId: string): Promise<StarResult> {
    const existing = await prisma.star.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });

    if (!existing) {
      throw new BusinessError('badRequest', '未收藏该仓库');
    }

    await prisma.$transaction([
      prisma.star.delete({ where: { id: existing.id } }),
      prisma.repository.update({
        where: { id: repoId },
        data: { starCount: { decrement: 1 } },
      }),
    ]);

    return { starred: false };
  }

  // ==========================================================
  // toggleStar — 切换收藏状态（POST 统一入口）
  // ==========================================================

  /**
   * 切换仓库收藏状态：已收藏则取消，未收藏则添加。
   * 供 star 路由 POST 端点直接调用。
   *
   * @param userId — 当前用户 ID
   * @param repoId — 目标仓库 ID
   * @returns { starred: boolean }
   */
  static async toggleStar(userId: string, repoId: string): Promise<StarResult> {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, deletedAt: null },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    if (repo.ownerId === userId) {
      throw new BusinessError('forbidden', '不能收藏自己的仓库');
    }

    // 检查屏蔽关系
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: repo.ownerId },
          { blockerId: repo.ownerId, blockedId: userId },
        ],
      },
      select: { id: true },
    });
    if (isBlocked) {
      throw new BusinessError('forbidden', '由于屏蔽关系，无法执行此操作');
    }

    const existing = await prisma.star.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.star.delete({ where: { id: existing.id } }),
        prisma.repository.update({
          where: { id: repoId },
          data: { starCount: { decrement: 1 } },
        }),
      ]);
      return { starred: false };
    } else {
      await prisma.$transaction([
        prisma.star.create({ data: { userId, repoId } }),
        prisma.repository.update({
          where: { id: repoId },
          data: { starCount: { increment: 1 } },
        }),
      ]);
      return { starred: true };
    }
  }

  // ==========================================================
  // watch — 关注仓库
  // ==========================================================

  /**
   * 关注指定仓库。
   *
   * 验证与 star 相同。
   *
   * @param userId — 当前用户 ID
   * @param repoId — 目标仓库 ID
   * @returns { watching: true }
   * @throws {BusinessError} 验证失败时抛出
   */
  static async watch(userId: string, repoId: string): Promise<WatchResult> {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, deletedAt: null },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    if (repo.ownerId === userId) {
      throw new BusinessError('forbidden', '不能关注自己的仓库');
    }

    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: repo.ownerId },
          { blockerId: repo.ownerId, blockedId: userId },
        ],
      },
      select: { id: true },
    });
    if (isBlocked) {
      throw new BusinessError('forbidden', '由于屏蔽关系，无法执行此操作');
    }

    const existing = await prisma.watcher.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });
    if (existing) {
      throw new BusinessError('badRequest', '已关注该仓库');
    }

    await prisma.$transaction([
      prisma.watcher.create({ data: { userId, repoId } }),
      prisma.repository.update({
        where: { id: repoId },
        data: { watchCount: { increment: 1 } },
      }),
    ]);

    return { watching: true };
  }

  // ==========================================================
  // unwatch — 取消关注仓库
  // ==========================================================

  /**
   * 取消关注指定仓库。
   *
   * @param userId — 当前用户 ID
   * @param repoId — 目标仓库 ID
   * @returns { watching: false }
   */
  static async unwatch(userId: string, repoId: string): Promise<WatchResult> {
    const existing = await prisma.watcher.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });

    if (!existing) {
      throw new BusinessError('badRequest', '未关注该仓库');
    }

    await prisma.$transaction([
      prisma.watcher.delete({ where: { id: existing.id } }),
      prisma.repository.update({
        where: { id: repoId },
        data: { watchCount: { decrement: 1 } },
      }),
    ]);

    return { watching: false };
  }

  // ==========================================================
  // toggleWatch — 切换关注状态
  // ==========================================================

  /**
   * 切换仓库关注状态：已关注则取消，未关注则添加。
   *
   * @param userId — 当前用户 ID
   * @param repoId — 目标仓库 ID
   * @returns { watching: boolean }
   */
  static async toggleWatch(userId: string, repoId: string): Promise<WatchResult> {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, deletedAt: null },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    if (repo.ownerId === userId) {
      throw new BusinessError('forbidden', '不能关注自己的仓库');
    }

    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: repo.ownerId },
          { blockerId: repo.ownerId, blockedId: userId },
        ],
      },
      select: { id: true },
    });
    if (isBlocked) {
      throw new BusinessError('forbidden', '由于屏蔽关系，无法执行此操作');
    }

    const existing = await prisma.watcher.findUnique({
      where: { userId_repoId: { userId, repoId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.watcher.delete({ where: { id: existing.id } }),
        prisma.repository.update({
          where: { id: repoId },
          data: { watchCount: { decrement: 1 } },
        }),
      ]);
      return { watching: false };
    } else {
      await prisma.$transaction([
        prisma.watcher.create({ data: { userId, repoId } }),
        prisma.repository.update({
          where: { id: repoId },
          data: { watchCount: { increment: 1 } },
        }),
      ]);
      return { watching: true };
    }
  }

  // ==========================================================
  // createBranch — 创建分支
  // ==========================================================

  /**
   * 创建新分支。
   *
   * 验证：
   *   1. 仓库存在
   *   2. 用户有写入权限
   *   3. 分支名不重复
   *
   * @param input — 创建分支参数
   * @returns 新分支信息
   * @throws {BusinessError} 验证失败时抛出
   */
  static async createBranch(input: CreateBranchInput): Promise<CreateBranchResult> {
    const { repoId, userId, name, fromBranch } = input;

    // 权限检查
    const userRole = await getUserRepoRole(userId, repoId);
    if (!canWrite(userRole)) {
      throw new BusinessError('FORBIDDEN', '无权创建分支', 403);
    }

    // 仓库存在性（内部已包含）
    const repo = await prisma.repository.findUnique({
      where: { id: repoId, deletedAt: null },
      select: { id: true },
    });
    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    // 分支名不重复
    const existing = await prisma.branch.findFirst({
      where: { repoId, name },
    });
    if (existing) {
      throw new BusinessError('conflict', '分支名已存在');
    }

    // 验证源分支存在（如果指定）
    if (fromBranch) {
      const from = await prisma.branch.findFirst({
        where: { repoId, name: fromBranch },
        select: { id: true },
      });
      if (!from) {
        throw new BusinessError('NOT_FOUND', `源分支 "${fromBranch}" 不存在`, 404);
      }
    }

    const branch = await prisma.branch.create({
      data: {
        repoId,
        name,
        isDefault: false,
      },
    });

    return {
      id: branch.id,
      name: branch.name,
      isDefault: branch.isDefault,
      createdAt: branch.createdAt.toISOString(),
    };
  }

  // ==========================================================
  // listBranches — 获取分支列表
  // ==========================================================

  /**
   * 获取仓库的所有分支列表。
   *
   * 可见性检查：私有仓库仅所有者或协作者可查看。
   *
   * @param repoId — 仓库 ID
   * @param currentUserId — 当前用户 ID（可选）
   * @returns 分支列表和默认分支名
   * @throws {BusinessError} 仓库不存在或无权访问时抛出
   */
  static async listBranches(
    repoId: string,
    currentUserId?: string,
  ): Promise<BranchListResult> {
    const repo = await prisma.repository.findUnique({
      where: { id: repoId, deletedAt: null },
      select: { id: true, ownerId: true, visibility: true, defaultBranch: true },
    });

    if (!repo) {
      throw new BusinessError('NOT_FOUND', '仓库不存在', 404);
    }

    if (repo.visibility === 0 && (!currentUserId || currentUserId !== repo.ownerId)) {
      throw new BusinessError('FORBIDDEN', '私有仓库无法访问', 403);
    }

    const branches = await prisma.branch.findMany({
      where: { repoId },
      select: {
        id: true,
        name: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        isDefault: b.isDefault,
        createdAt: b.createdAt.toISOString(),
      })),
      defaultBranch: repo.defaultBranch,
    };
  }

  // ==========================================================
  // deleteBranch — 删除分支
  // ==========================================================

  /**
   * 删除分支。
   *
   * 权限：仅仓库所有者或管理员。
   * 默认分支不可删除。
   *
   * @param branchId — 分支 ID
   * @param userId — 当前用户 ID
   * @returns { id: branchId }
   * @throws {BusinessError} 无权限、分支不存在或默认分支时抛出
   */
  static async deleteBranch(branchId: string, userId: string): Promise<{ id: string }> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, repoId: true, isDefault: true, name: true },
    });

    if (!branch) {
      throw new BusinessError('NOT_FOUND', '分支不存在', 404);
    }

    if (branch.isDefault) {
      throw new BusinessError('forbidden', '不能删除默认分支');
    }

    const userRole = await getUserRepoRole(userId, branch.repoId);
    if (!canManageRepo(userRole)) {
      throw new BusinessError('FORBIDDEN', '无权删除分支', 403);
    }

    await prisma.branch.delete({ where: { id: branchId } });

    return { id: branchId };
  }
}
