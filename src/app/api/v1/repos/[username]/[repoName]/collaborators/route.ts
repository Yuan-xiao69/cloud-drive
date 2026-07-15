export const dynamic = 'force-dynamic';
/**
 * v1 仓库协作者 API
 * GET    /api/v1/repos/[username]/[repoName]/collaborators - 获取协作者列表
 * POST   /api/v1/repos/[username]/[repoName]/collaborators - 邀请协作者
 * DELETE /api/v1/repos/[username]/[repoName]/collaborators - 移除协作者
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { sendNotificationToUser } from '@/lib/notification-service';

// GET /api/v1/repos/[username]/[repoName]/collaborators - 获取协作者列表
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { username, repoName } = params;

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

    // 检查权限：所有者或 admin 协作者可查看协作者列表
    const isOwner = repo.ownerId === user!.id;
    const collab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: user!.id } },
      select: { role: true },
    });
    const canManage = isOwner || collab?.role === 'admin';

    if (!canManage) {
      return errors.forbidden('只有仓库所有者和管理员可以查看协作者列表');
    }

    // 获取所有协作者
    const collaborators = await prisma.repoCollaborator.findMany({
      where: { repoId: repo.id },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
        inviter: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const accepted = collaborators.filter((c) => c.acceptedAt !== null);
    const pending = collaborators.filter((c) => c.acceptedAt === null);

    return success({
      collaborators: accepted.map((c) => ({
        id: c.id,
        userId: c.user.id,
        username: c.user.username,
        avatarUrl: c.user.avatarUrl ?? null,
        role: c.role,
        invitedBy: {
          id: c.inviter.id,
          username: c.inviter.username,
        },
        acceptedAt: c.acceptedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      pendingInvitations: pending.map((c) => ({
        id: c.id,
        userId: c.user.id,
        username: c.user.username,
        avatarUrl: c.user.avatarUrl ?? null,
        role: c.role,
        invitedBy: {
          id: c.inviter.id,
          username: c.inviter.username,
        },
        createdAt: c.createdAt.toISOString(),
      })),
      isOwner,
      currentUserRole: isOwner ? 'owner' : (collab?.role || null),
    });
  },
});

const inviteSchema = z.object({
  username: z.string().min(1, '请提供用户名'),
  role: z.string().min(1, '请提供角色'),
});

// POST /api/v1/repos/[username]/[repoName]/collaborators - 邀请协作者
export const POST = defineRoute({
  auth: 'required',
  validation: inviteSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { username: targetUsername, role } = body as z.infer<typeof inviteSchema>;

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

    // 检查权限：只有所有者和 admin 协作者可以邀请
    const isOwner = repo.ownerId === user!.id;
    const collab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: user!.id } },
      select: { role: true },
    });
    const canManage = isOwner || collab?.role === 'admin';

    if (!canManage) {
      return errors.forbidden('只有仓库所有者和管理员可以邀请协作者');
    }

    const validRoles = ['admin', 'write', 'triage', 'read'];
    if (!validRoles.includes(role)) {
      return errors.badRequest('无效的角色，可选: admin, write, triage, read');
    }

    // 查找目标用户
    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      return errors.userNotFound(targetUsername);
    }

    // 不能邀请仓库所有者
    if (targetUser.id === repo.ownerId) {
      return errors.badRequest('不能邀请仓库所有者');
    }

    // 不能邀请自己
    if (targetUser.id === user!.id) {
      return errors.badRequest('不能邀请自己');
    }

    // 检查是否已经是协作者
    const existingCollab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: targetUser.id } },
      select: { id: true, acceptedAt: true },
    });

    if (existingCollab) {
      if (existingCollab.acceptedAt) {
        return errors.conflict('该用户已经是协作者，请使用 PATCH 修改角色');
      }
      return errors.conflict('已向该用户发送过邀请，等待对方接受');
    }

    // 创建协作者记录
    const newCollab = await prisma.repoCollaborator.create({
      data: {
        repoId: repo.id,
        userId: targetUser.id,
        role,
        invitedBy: user!.id,
      },
      include: {
        user: {
          select: { id: true, username: true, avatarUrl: true },
        },
        inviter: {
          select: { id: true, username: true },
        },
      },
    });

    // 发送通知给被邀请者
    const roleLabels: Record<string, string> = {
      admin: '管理员',
      write: '写入者',
      triage: '分类者',
      read: '只读',
    };

    try {
      await sendNotificationToUser(targetUser.id, {
        type: 'repo_collaborator_invite',
        title: '仓库协作邀请',
        content: `${user!.username} 邀请你成为 ${username}/${repo.name} 的${roleLabels[role] || role}`,
        linkUrl: `/${username}/${repoName}/settings`,
        senderId: user!.id,
        priority: 'normal',
      });
    } catch (notifErr) {
      console.error('[Collaborators] Failed to send notification:', notifErr);
    }

    return success(
      {
        id: newCollab.id,
        userId: newCollab.user.id,
        username: newCollab.user.username,
        avatarUrl: newCollab.user.avatarUrl ?? null,
        role: newCollab.role,
        invitedBy: {
          id: newCollab.inviter.id,
          username: newCollab.inviter.username,
        },
        createdAt: newCollab.createdAt.toISOString(),
      },
      '邀请已发送'
    );
  },
});

const removeCollabSchema = z.object({
  userId: z.string().min(1, '请提供要移除的用户 ID'),
});

// DELETE /api/v1/repos/[username]/[repoName]/collaborators - 移除协作者
export const DELETE = defineRoute({
  auth: 'required',
  validation: removeCollabSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { userId: targetUserId } = body as z.infer<typeof removeCollabSchema>;

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
      return errors.forbidden('只有仓库所有者和管理员可以移除协作者');
    }

    // 不能移除仓库所有者
    if (targetUserId === repo.ownerId) {
      return errors.badRequest('不能移除仓库所有者');
    }

    const existingCollab = await prisma.repoCollaborator.findUnique({
      where: { repoId_userId: { repoId: repo.id, userId: targetUserId } },
      select: { id: true, user: { select: { username: true } } },
    });

    if (!existingCollab) {
      return errors.notFound('该协作者不存在');
    }

    await prisma.repoCollaborator.delete({
      where: { id: existingCollab.id },
    });

    // 发送通知给被移除者
    try {
      await sendNotificationToUser(targetUserId, {
        type: 'repo_collaborator_remove',
        title: '协作者身份已移除',
        content: `你已被移出 ${username}/${repo.name} 的协作者`,
        linkUrl: `/${username}/${repoName}`,
        senderId: user!.id,
        priority: 'normal',
      });
    } catch (notifErr) {
      console.error('[Collaborators] Failed to send notification:', notifErr);
    }

    return success(
      { removedUserId: targetUserId },
      `已移除协作者 ${existingCollab.user.username}`
    );
  },
});
