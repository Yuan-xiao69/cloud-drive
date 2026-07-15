export const dynamic = 'force-dynamic';
/**
 * v1 Fork 申请列表 API
 * GET /api/v1/repos/[username]/[repoName]/fork-requests - 获取仓库的 Fork 申请列表
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { paginated, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/repos/[username]/[repoName]/fork-requests - 获取 Fork 申请列表
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const skip = (page - 1) * pageSize;

    const status = searchParams.get('status');
    const validStatuses = ['pending', 'approved', 'rejected', 'expired'];
    const statusFilter = status && validStatuses.includes(status) ? status : 'pending';

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

    if (repo.ownerId !== user!.id) {
      return errors.forbidden('只有仓库所有者可以查看 Fork 申请列表');
    }

    const where: Record<string, unknown> = {
      repoId: repo.id,
      status: statusFilter,
    };

    const [requests, total] = await Promise.all([
      prisma.forkRequest.findMany({
        where,
        include: {
          requester: {
            select: { id: true, username: true, avatarUrl: true, email: true },
          },
          processor: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.forkRequest.count({ where }),
    ]);

    const items = requests.map((r) => ({
      id: r.id,
      repoId: r.repoId,
      requester: {
        id: r.requester.id,
        username: r.requester.username,
        avatarUrl: r.requester.avatarUrl ?? undefined,
      },
      message: r.message,
      status: r.status,
      note: r.note,
      processedBy: r.processor ? {
        id: r.processor.id,
        username: r.processor.username,
      } : null,
      processedAt: r.processedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, pageSize));
  },
});
