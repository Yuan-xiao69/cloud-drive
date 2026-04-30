export const dynamic = 'force-dynamic';
/**
 * v1 仓库分支 API
 * GET /api/v1/repos/[username]/[repoName]/branches - 获取分支列表
 * POST /api/v1/repos/[username]/[repoName]/branches - 创建分支
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/repos/[username]/[repoName]/branches - 获取分支列表
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
      select: { id: true, ownerId: true, visibility: true, defaultBranch: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const auth = await getAuthUser(req);
    if (repo.visibility === 0 && (!auth || auth.userId !== repo.ownerId)) {
      return error(ErrorCodes.FORBIDDEN, { message: '私有仓库无法访问' });
    }

    const branches = await prisma.branch.findMany({
      where: { repoId: repo.id },
      select: {
        id: true,
        name: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return success({
      branches,
      defaultBranch: repo.defaultBranch,
    });
  } catch (err) {
    return handlePrismaError(err, '获取分支列表失败');
  }
}

// POST /api/v1/repos/[username]/[repoName]/branches - 创建分支
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;
    const body = await req.json();
    const { name, fromBranch } = body;

    if (!name) {
      return errors.badRequest('分支名称不能为空');
    }

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以创建分支' });
    }

    // 检查分支名是否已存在
    const existing = await prisma.branch.findFirst({
      where: { repoId: repo.id, name },
    });

    if (existing) {
      return errors.conflict('分支名已存在');
    }

    const branch = await prisma.branch.create({
      data: {
        repoId: repo.id,
        name,
        isDefault: false,
      },
    });

    return created({
      id: branch.id,
      name: branch.name,
      isDefault: branch.isDefault,
      createdAt: branch.createdAt.toISOString(),
    }, '分支创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建分支失败');
  }
}
