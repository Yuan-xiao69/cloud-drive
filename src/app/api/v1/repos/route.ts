export const dynamic = 'force-dynamic';

/**
 * v1 创建仓库 API
 * POST /api/v1/repos - 在当前用户下创建新仓库
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { validateSensitiveOperation } from '@/lib/csrf';

// POST /api/v1/repos - 创建新仓库
export async function POST(
  req: NextRequest
): Promise<Response> {
  try {
    // 1. 验证用户登录状态
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 2. 解析请求体
    const body = await req.json();
    const { name, description, visibility, defaultBranch, language } = body;

    // 3. 验证必填参数：仓库名称
    if (!name || typeof name !== 'string') {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '仓库名称不能为空' });
    }

    // 4. 验证仓库名称格式（参考 GitHub 标准）
    // - 长度 1-100
    // - 不能以 . 开头或结尾
    // - 不能包含特殊字符：空格、~、^、:、?、*、[、]、..
    const nameTrimmed = name.trim();
    const nameRegex = /^[a-zA-Z0-9._-]+$/;
    if (nameTrimmed.length < 1 || nameTrimmed.length > 100) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '仓库名称长度必须在 1-100 个字符之间' });
    }
    if (nameTrimmed.startsWith('.') || nameTrimmed.endsWith('.')) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '仓库名称不能以 . 开头或结尾' });
    }
    if (!nameRegex.test(nameTrimmed)) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '仓库名称只能包含字母、数字、点、中划线和下划线' });
    }

    // 5. 保留名称检查（GitHub 标准）
    const reservedNames = ['.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
    if (reservedNames.includes(nameTrimmed.toUpperCase())) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '该仓库名称为系统保留名称，请使用其他名称' });
    }

    // 6. 检查仓库名称唯一性（同一用户下不能重名）
    const existingRepo = await prisma.repository.findFirst({
      where: {
        ownerId: auth.userId,
        name: nameTrimmed,
        deletedAt: null,
      },
    });

    if (existingRepo) {
      return errors.conflict(`用户 ${auth.username} 已有同名仓库 "${nameTrimmed}"`);
    }

    // 7. 处理可见性（0=私有, 1=公开），默认公开
    const isPrivate = visibility === 0 || visibility === false ? true : false;

    // 8. 处理默认分支名称，默认 main
    const branchName = (defaultBranch && typeof defaultBranch === 'string' && defaultBranch.trim())
      ? defaultBranch.trim()
      : 'main';

    // 9. 创建仓库事务
    const repo = await prisma.$transaction(async (tx) => {
      // 创建仓库记录
      const newRepo = await tx.repository.create({
        data: {
          ownerId: auth.userId,
          name: nameTrimmed,
          description: description || null,
          visibility: isPrivate ? 0 : 1,
          defaultBranch: branchName,
          language: language || null,
        },
      });

      // 创建默认分支
      await tx.branch.create({
        data: {
          repoId: newRepo.id,
          name: branchName,
          isDefault: true,
        },
      });

      // 创建根目录（空的 README.md 可以后续添加）
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

    // 10. 返回仓库详情（包含 owner 信息用于跳转）
    return created({
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
      owner: {
        username: auth.username,
      },
    }, '仓库创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建仓库失败');
  }
}
