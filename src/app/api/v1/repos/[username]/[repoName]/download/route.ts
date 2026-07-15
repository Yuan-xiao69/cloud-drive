export const dynamic = 'force-dynamic';
/**
 * v1 仓库 ZIP 下载 API
 * GET /api/v1/repos/[username]/[repoName]/download?branch=main
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { error } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getFile } from '@/lib/storage';
import { checkRepoAccess } from '@/lib/auth/access';
import JSZip from 'jszip';

// GET /api/v1/repos/[username]/[repoName]/download - 下载仓库 ZIP
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ req, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);
    const branchName = searchParams.get('branch') || 'main';

    const access = await checkRepoAccess(req, { username, repoName }, 'read');
    if (!access.allowed) return access.error;

    const repo = access.repo;

    let branchRecord: { id: string; name: string } | null = null;
    if (branchName) {
      branchRecord = await prisma.branch.findFirst({
        where: { repoId: repo.id, name: branchName },
        select: { id: true, name: true },
      });
    }

    if (!branchRecord) {
      branchRecord = await prisma.branch.findFirst({
        where: { repoId: repo.id, isDefault: true },
        select: { id: true, name: true },
      });
    }

    if (!branchRecord) {
      branchRecord = await prisma.branch.findFirst({
        where: { repoId: repo.id },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库分支不存在，无法下载' });
    }

    const branchId = branchRecord.id;

    const files = await prisma.repoItem.findMany({
      where: {
        repoId: repo.id,
        branchId: branchId,
        type: { not: 'dir' },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        path: true,
        storagePath: true,
        mimeType: true,
      },
    });

    const zip = new JSZip();

    for (const file of files) {
      const zipPath = file.path || file.name;

      if (file.storagePath) {
        try {
          const buffer = await getFile(file.storagePath);
          if (buffer) {
            zip.file(zipPath, buffer);
          } else {
            zip.file(zipPath, '', { comment: '文件内容不可用' });
          }
        } catch {
          zip.file(zipPath, '', { comment: '文件读取失败' });
        }
      } else {
        zip.file(zipPath, '');
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const zipFileName = `${repoName}-${branchRecord.name}.zip`;

    return new Response(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFileName)}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  },
});
