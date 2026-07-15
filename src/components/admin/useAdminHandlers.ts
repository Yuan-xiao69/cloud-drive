'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import type { Penalty, Appeal, PenaltySummary, UserSummary, RepositorySummary } from './AdminTypes';
import type { UseAdminPageReturn } from './useAdminPage';

// ============================================================
// Admin 操作处理函数 Hook
// ============================================================

interface UseAdminHandlersProps {
  // 基础 admin 对象引用（包含所有状态和 setter）
  admin: UseAdminPageReturn;
  // 用户列表（用于查找用户信息）
  users: UserSummary[];
  // 仓库列表（用于查找仓库信息）
  repos: RepositorySummary[];
  // 处罚列表（用于查找处罚信息）
  penalties: Penalty[];
  // 申诉列表（用于查找申诉信息）
  appeals: Appeal[];
  // 回调函数
  onSetActiveTab?: (tab: string) => void;
  onSetSendTitle?: (title: string) => void;
  onFetchRepos?: () => void;
  onFetchPenalties?: () => void;
  onFetchAppeals?: () => void;
  onFetchDiscussions?: () => void;
}

export function useAdminHandlers({
  admin,
  users,
  repos,
  penalties,
  appeals,
  onSetActiveTab,
  onFetchRepos,
  onFetchPenalties,
  onFetchAppeals,
  onFetchDiscussions,
}: UseAdminHandlersProps) {
  // ============================================================
  // 用户管理操作
  // ============================================================

  /**
   * 导出用户为 CSV
   */
  const handleExportUsers = useCallback((userIds?: string[]) => {
    const ids = userIds || Array.from(admin.selectedUsers);
    if (ids.length === 0) {
      toast.error('请选择要导出的用户');
      return;
    }
    const selectedUsers = users.filter(u => ids.includes(u.id));
    const csv = [
      ['用户名', '邮箱', '角色', '状态', '注册时间'].join(','),
      ...selectedUsers.map(u => [u.username, u.email, u.role, 'active', u.createdAt].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [admin.selectedUsers, users]);

  /**
   * 批量禁言用户
   */
  const handleBatchMute = useCallback(async (userIds: string[]) => {
    // 只打开第一个用户的禁言弹窗，避免多个弹窗同时弹出
    const firstUser = users.find(u => userIds.includes(u.id));
    if (firstUser) {
      admin.handleMuteUser(firstUser.id, firstUser.username);
    }
    // 刷新用户列表
    admin.fetchUsers?.();
  }, [users, admin]);

  /**
   * 批量封禁用户
   */
  const handleBatchBan = useCallback(async (userIds: string[]) => {
    try {
      await Promise.all(userIds.map(async (userId) => {
        await api.post(`/api/v1/admin/users/${userId}/ban`);
      }));
      admin.fetchUsers?.();
    } catch (err) {
      toast.error((err as Error).message || '批量封禁失败');
    }
  }, [admin]);

  /**
   * 发送通知给用户
   */
  const handleSendNotification = useCallback((userId: string) => {
    admin.setSendTitle(`致 ${users.find(u => u.id === userId)?.username || '用户'}`);
    onSetActiveTab?.('notifications');
  }, [users, admin, onSetActiveTab]);

  /**
   * 复制邮箱
   */
  const handleCopyEmail = useCallback((email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('邮箱已复制');
  }, []);

  // ============================================================
  // 仓库管理操作
  // ============================================================

  /**
   * 导出仓库为 CSV
   */
  const handleExportRepos = useCallback((repoIds?: string[]) => {
    const ids = repoIds || Array.from(admin.selectedRepos);
    if (ids.length === 0) {
      toast.error('请选择要导出的仓库');
      return;
    }
    const selectedRepos = repos.filter(r => ids.includes(r.id));
    const csv = [
      ['仓库名', '所有者', '可见性', '语言', '星标数', '创建时间'].join(','),
      ...selectedRepos.map(r => [
        r.name,
        r.ownerUsername,
        r.visibility === 'private' ? '私有' : '公开',
        r.language || '-',
        r.starCount || 0,
        r.createdAt
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repos-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [admin.selectedRepos, repos]);

  /**
   * 批量归档仓库
   */
  const handleBatchArchive = useCallback(async (repoIds: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/repos/batch-archive', { ids: repoIds, action: 'archive' }) as unknown as Record<string, any>;
      if (data.code === 0 || data.code === 200) {
        toast.success(`成功归档 ${data.count} 个仓库`);
        onFetchRepos?.();
      } else {
        toast.error(data.message || '归档失败');
      }
    } catch {
      toast.error('归档失败');
    }
  }, [onFetchRepos]);

  /**
   * 批量修改仓库可见性
   */
  const handleBatchChangeVisibility = useCallback(async (repoIds: string[], visibility: number) => {
    try {
      const data = await api.post('/api/v1/admin/repos/batch-visibility', { ids: repoIds, visibility }) as unknown as Record<string, any>;
      if (data.code === 0 || data.code === 200) {
        const visText = visibility === 0 ? '私有' : visibility === 1 ? '内部' : '公开';
        toast.success(`成功修改 ${data.count} 个仓库的可见性为 ${visText}`);
        onFetchRepos?.();
      } else {
        toast.error(data.message || '修改失败');
      }
    } catch {
      toast.error('修改失败');
    }
  }, [onFetchRepos]);

  // ============================================================
  // 处罚管理操作
  // ============================================================

  /**
   * 延长处罚时间
   */
  const handleExtendPenalty = useCallback(async (penaltyId: string) => {
    const days = '7';
    if (!days || isNaN(parseInt(days))) return;
    try {
      const data = await api.post(`/api/v1/admin/penalties/${penaltyId}/extend`, { days: parseInt(days) }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`处罚已延长 ${days} 天`);
        onFetchPenalties?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchPenalties]);

  /**
   * 解除处罚
   */
  const handleReleasePenalty = useCallback((penaltyId: string) => {
    const penalty = penalties.find(p => p.id === penaltyId);
    if (penalty) admin.handleOpenRemovePenalty(penalty);
  }, [penalties, admin]);

  /**
   * 撤销处罚
   */
  const handleRevokePenalty = useCallback((penaltyId: string) => {
    const penalty = penalties.find(p => p.id === penaltyId);
    if (penalty) admin.handleOpenRemovePenalty(penalty);
  }, [penalties, admin]);

  /**
   * 添加处罚备注
   */
  const handleAddPenaltyNote = useCallback(async (penaltyId: string) => {
    const note = '';
    if (!note) return;
    try {
      const data = await api.post(`/api/v1/admin/penalties/${penaltyId}/notes`, { content: note }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('备注添加成功');
      } else {
        toast.error(data.message || '添加失败');
      }
    } catch {
      toast.error('添加失败');
    }
  }, []);

  /**
   * 使用处罚模板
   */
  const handleUseTemplate = useCallback(async (templateId: string, userId: string) => {
    if (!userId) {
      toast.error('请先选择一个用户');
      return;
    }
    const reason = '操作';
    if (!reason) return;
    try {
      const data = await api.post(`/api/v1/admin/penalty-templates/${templateId}/use`, { userId }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('处罚已添加');
        onFetchPenalties?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchPenalties]);

  /**
   * 创建处罚模板
   */
  const handleCreateTemplate = useCallback(async () => {
    const name = '';
    if (!name) return;
    const penaltyType = 'mute';
    if (!penaltyType) return;
    const duration = '7';
    const reason = '操作';
    if (!reason) return;
    try {
      const data = await api.post('/api/v1/admin/penalty-templates', {
        name,
        penaltyType,
        defaultDuration: parseInt(duration || '7') || 7,
        reason: reason || ''
      }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('模板创建成功');
        onFetchPenalties?.();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch {
      toast.error('创建失败');
    }
  }, [onFetchPenalties]);

  /**
   * 编辑处罚模板
   */
  const handleEditTemplate = useCallback(async (templateId: string) => {
    const name = '';
    if (!name) return;
    try {
      const data = await api.put(`/api/v1/admin/penalty-templates/${templateId}`, { name }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('模板更新成功');
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch {
      toast.error('更新失败');
    }
  }, []);

  /**
   * 删除处罚模板
   */
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      const data = await api.delete(`/api/v1/admin/penalty-templates/${templateId}`) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('模板已删除');
        onFetchPenalties?.();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  }, [onFetchPenalties]);

  /**
   * 批量解除处罚
   */
  const handleBatchReleasePenalties = useCallback(async (ids: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/penalties/batch', { action: 'release', penaltyIds: ids }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功解除 ${data.data.successCount} 个处罚`);
        onFetchPenalties?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchPenalties]);

  // ============================================================
  // 申诉管理操作
  // ============================================================

  /**
   * 批准申诉
   */
  const handleApproveAppeal = useCallback(async (appealId: string) => {
    try {
      const data = await api.post(`/api/v1/admin/appeals/${appealId}`, { action: 'approve' }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('申诉已批准，相关处罚已撤销');
        onFetchAppeals?.();
        onFetchPenalties?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchAppeals, onFetchPenalties]);

  /**
   * 拒绝申诉
   */
  const handleRejectAppeal = useCallback(async (appealId: string) => {
    const reason = '操作';
    if (!reason) return;
    try {
      const data = await api.post(`/api/v1/admin/appeals/${appealId}`, { action: 'reject', reason }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('申诉已拒绝');
        onFetchAppeals?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchAppeals]);

  // ============================================================
  // 讨论管理操作
  // ============================================================

  /**
   * 标记讨论为已解决
   */
  const handleMarkDiscussionResolved = useCallback(async (discussionId: string) => {
    try {
      const data = await api.post(`/api/v1/admin/discussions/${discussionId}/actions`, { action: 'resolve' }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('讨论已标记为已解决');
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 设置讨论为精华
   */
  const handleSetDiscussionFeatured = useCallback(async (discussionId: string) => {
    try {
      const data = await api.post(`/api/v1/admin/discussions/${discussionId}/actions`, { action: 'feature' }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('讨论已设为精华');
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 置顶讨论
   */
  const handlePinDiscussion = useCallback(async (discussionId: string) => {
    try {
      const data = await api.post(`/api/v1/admin/discussions/${discussionId}/actions`, { action: 'pin' }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('讨论已置顶');
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 移动讨论分类
   */
  const handleMoveDiscussionCategory = useCallback(async (discussionId: string, category: string) => {
    try {
      const data = await api.post(`/api/v1/admin/discussions/${discussionId}/actions`, { action: 'move', category }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('讨论已移动到分类 ' + category);
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 关闭讨论
   */
  const handleCloseDiscussion = useCallback(async (discussionId: string) => {
    const reason = '操作';
    try {
      const data = await api.post(`/api/v1/admin/discussions/${discussionId}/actions`, { action: 'close', reason }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('讨论已关闭');
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量标记讨论为已解决
   */
  const handleBatchMarkDiscussionsResolved = useCallback(async (ids: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/discussions/batch', { action: 'resolve', discussionIds: ids }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功标记 ${ids.length} 个讨论为已解决`);
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量设置讨论为精华
   */
  const handleBatchSetDiscussionsFeatured = useCallback(async (ids: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/discussions/batch', { action: 'feature', discussionIds: ids }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功将 ${ids.length} 个讨论设为精华`);
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量置顶讨论
   */
  const handleBatchPinDiscussions = useCallback(async (ids: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/discussions/batch', { action: 'pin', discussionIds: ids }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功置顶 ${ids.length} 个讨论`);
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量移动讨论分类
   */
  const handleBatchMoveDiscussionsCategory = useCallback(async (ids: string[], category: string) => {
    if (!category) {
      toast.error('请先选择目标分类');
      return;
    }
    try {
      const data = await api.post('/api/v1/admin/discussions/batch', { action: 'move', discussionIds: ids, category }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功移动 ${ids.length} 个讨论`);
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量删除讨论
   */
  const handleBatchDeleteDiscussions = useCallback(async (ids: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/discussions/batch', { action: 'delete', discussionIds: ids }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功删除 ${data.deletedCount} 个讨论`);
        onFetchDiscussions?.();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [onFetchDiscussions]);

  // ============================================================
  // 公告管理操作
  // ============================================================

  /**
   * 创建公告
   */
  const handleCreateAnnouncement = useCallback(async () => {
    const title = '';
    if (!title) return;
    const content = '';
    if (!content) return;
    const type = 'info';
    try {
      const data = await api.post('/api/v1/admin/announcements', { title, content, type: type || 'info' }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('公告创建成功');
        admin.fetchAnnouncements();
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch {
      toast.error('创建失败');
    }
  }, [admin]);

  /**
   * 编辑公告
   */
  const handleEditAnnouncement = useCallback(async (announcementId: string) => {
    const title = '';
    if (!title) return;
    const content = '';
    if (!content) return;
    try {
      const data = await api.put(`/api/v1/admin/announcements/${announcementId}`, { title, content }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('公告更新成功');
        admin.fetchAnnouncements();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch {
      toast.error('更新失败');
    }
  }, [admin]);

  /**
   * 删除公告
   */
  const handleDeleteAnnouncement = useCallback(async (announcementId: string) => {
    try {
      const data = await api.delete(`/api/v1/admin/announcements/${announcementId}`) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('公告已删除');
        admin.fetchAnnouncements();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  }, [admin]);

  /**
   * 置顶/取消置顶公告
   */
  const handleToggleAnnouncementPin = useCallback(async (announcementId: string, isPinned: boolean) => {
    try {
      const data = await api.put(`/api/v1/admin/announcements/${announcementId}`, { pinned: !isPinned }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`公告已${!isPinned ? '置顶' : '取消置顶'}`);
        admin.fetchAnnouncements();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [admin]);

  // ============================================================
  // 封禁管理操作
  // ============================================================

  /**
   * 解封用户
   */
  const handleUnbanUser = useCallback(async (userId: string) => {
    try {
      const data = await api.delete(`/api/v1/admin/bans/${userId}`) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success('用户已解封');
        admin.fetchBans();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [admin]);

  /**
   * 批量解封用户
   */
  const handleBatchUnbanUsers = useCallback(async (userIds: string[]) => {
    try {
      const data = await api.post('/api/v1/admin/bans/batch', { action: 'unban', userIds }) as unknown as Record<string, any>;
      if (data.code === 0) {
        toast.success(`成功解封 ${data.successCount} 个用户`);
        admin.fetchBans();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  }, [admin]);

  // ============================================================
  // 返回所有处理函数
  // ============================================================

  return {
    // 用户管理
    handleExportUsers,
    handleBatchMute,
    handleBatchBan,
    handleSendNotification,
    handleCopyEmail,

    // 仓库管理
    handleExportRepos,
    handleBatchArchive,
    handleBatchChangeVisibility,

    // 处罚管理
    handleExtendPenalty,
    handleReleasePenalty,
    handleRevokePenalty,
    handleAddPenaltyNote,
    handleUseTemplate,
    handleCreateTemplate,
    handleEditTemplate,
    handleDeleteTemplate,
    handleBatchReleasePenalties,

    // 申诉管理
    handleApproveAppeal,
    handleRejectAppeal,

    // 讨论管理
    handleMarkDiscussionResolved,
    handleSetDiscussionFeatured,
    handlePinDiscussion,
    handleMoveDiscussionCategory,
    handleCloseDiscussion,
    handleBatchMarkDiscussionsResolved,
    handleBatchSetDiscussionsFeatured,
    handleBatchPinDiscussions,
    handleBatchMoveDiscussionsCategory,
    handleBatchDeleteDiscussions,

    // 公告管理
    handleCreateAnnouncement,
    handleEditAnnouncement,
    handleDeleteAnnouncement,
    handleToggleAnnouncementPin,

    // 封禁管理
    handleUnbanUser,
    handleBatchUnbanUsers,
  };
}
