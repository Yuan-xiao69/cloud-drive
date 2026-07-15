export const dynamic = 'force-dynamic';
/**
 * v1 单个协作者操作 API
 * PATCH /api/v1/repos/[username]/[repoName]/collaborators/[userId] - 修改协作者角色
 * PUT   /api/v1/repos/[username]/[repoName]/collaborators/[userId] - 接受/拒绝邀请
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { sendNotificationToUser } from '@/lib/notification-service';

const updateRoleSchema = z.object({
  role: z.string().min(1, '请提供角色'),
});

// PATCH /api/v1/repos/[username]/[repoName]/collaborators/[userId] - 修改协作者角色
export const PATCH = defineRoute({
  auth: 'required',
  validation: updateRoleSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, userId: targetUserId } = params;
    const { role } = body as z.infer<typeof updateRoleSchema>;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 检查权限
    const isOwner = repo.ownerId === user!.id;
    const collab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: user!.id } },
      select: { role: true },
    });
    const canManage = isOwner || collab?.role === 'admin';

    if (!canManage) {
      return errors.forbidden('只有仓库所有者和管理员可以修改协作者角色');
    }

    const validRoles = ['admin', 'write', 'triage', 'read'];
    if (!role || !validRoles.includes(role)) {
      return errors.badRequest('无效的角色，可选: admin, write, triage, read');
    }

    // 不能修改仓库所有者的角色
    if (targetUserId === repo.ownerId) {
      return errors.badRequest('不能修改仓库所有者的角色');
    }

    const existingCollab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: targetUserId } },
      select: { id: true, acceptedAt: true },
    });

    if (!existingCollab) {
      return errors.notFound('该协作者不存在');
    }

    if (!existingCollab.acceptedAt) {
      return errors.badRequest('该用户尚未接受邀请，无法修改角色');
    }

    const updated = await prisma.repoCollaborator.update({
      where: { id: existingCollab.id },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    return success(
      {
        id: updated.id,
        userId: updated.user.id,
        username: updated.user.username,
        avatarUrl: updated.user.avatarUrl ?? null,
        role: updated.role,
      },
      '角色已更新'
    );
  },
});

const acceptInviteSchema = z.object({
  accept: z.boolean(),
});

// PUT /api/v1/repos/[username]/[repoName]/collaborators/[userId] - 接受/拒绝邀请
export const PUT = defineRoute({
  auth: 'required',
  validation: acceptInviteSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, userId: targetUserId } = params;
    const { accept } = body as z.infer<typeof acceptInviteSchema>;

    // 只能操作自己的邀请
    if (user!.id !== targetUserId) {
      return errors.forbidden('只能操作自己的邀请');
    }

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (typeof accept !== 'boolean') {
      return errors.badRequest('请提供 accept 参数 (boolean)');
    }

    const existingCollab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: targetUserId } },
    });

    if (!existingCollab) {
      return errors.notFound('未找到邀请记录');
    }

    if (existingCollab.acceptedAt) {
      return errors.badRequest('你已经接受过此邀请');
    }

    if (accept) {
      const updated = await prisma.repoCollaborator.update({
        where: { id: existingCollab.id },
        data: { acceptedAt: new Date() },
        include: {
          repo: {
            select: { name: true, owner: { select: { username: true } } },
          },
        },
      });

      try {
        await sendNotificationToUser(existingCollab.invitedBy, {
          type: 'repo_collaborator_accepted',
          title: '协作邀请已接受',
          content: `${user!.username} 已接受成为 ${username}/${repo.name} 的协作者`,
          linkUrl: `/${username}/${repoName}/settings`,
          senderId: user!.id,
          priority: 'normal',
        });
      } catch (notifErr) {
        console.error('[Collaborators] Failed to send notification:', notifErr);
      }

      return success(
        {
          id: updated.id,
          repoId: repo.id,
          role: updated.role,
          acceptedAt: updated.acceptedAt?.toISOString() ?? null,
        },
        '已接受邀请'
      );
    } else {
      await prisma.repoCollaborator.delete({
        where: { id: existingCollab.id },
      });

      return success(null, '已拒绝邀请');
    }
  },
});
