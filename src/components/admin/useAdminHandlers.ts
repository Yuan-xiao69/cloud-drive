'use client';

import { useCallback } from 'react';
import type { Penalty, Appeal, PenaltySummary } from './AdminTypes';
import type { UserSummary, RepositorySummary } from '@/types';
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
      alert('请选择要导出的用户');
      return;
    }
    const selectedUsers = users.filter(u => ids.includes(u.id));
    const csv = [
      ['用户名', '邮箱', '角色', '状态', '注册时间'].join(','),
      ...selectedUsers.map(u => [u.username, u.email, u.role, u.status || 'active', u.createdAt].join(','))
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
    if (!confirm(`确定要禁言选中的 ${userIds.length} 个用户吗？`)) return;
    // 等待所有禁言操作完成
    await Promise.all(userIds.map(async (userId) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        admin.handleMuteUser(userId, user.username);
      }
    }));
    // 刷新用户列表
    admin.fetchUsers?.();
  }, [users, admin]);

  /**
   * 批量封禁用户
   */
  const handleBatchBan = useCallback(async (userIds: string[]) => {
    if (!confirm(`确定要封禁选中的 ${userIds.length} 个用户吗？`)) return;
    // 等待所有封禁操作完成
    await Promise.all(userIds.map(async (userId) => {
      await admin.handleBanUser(userId, true);
    }));
    // 刷新用户列表
    admin.fetchUsers?.();
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
    alert('邮箱已复制');
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
      alert('请选择要导出的仓库');
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
    if (!confirm(`确定要归档选中的 ${repoIds.length} 个仓库吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/repos/batch-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: repoIds, action: 'archive' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`成功归档 ${data.count} 个仓库`);
        onFetchRepos?.();
      } else {
        alert(data.message || '归档失败');
      }
    } catch {
      alert('归档失败');
    }
  }, [onFetchRepos]);

  /**
   * 批量修改仓库可见性
   */
  const handleBatchChangeVisibility = useCallback(async (repoIds: string[], visibility: number) => {
    if (!confirm(`确定要修改选中的 ${repoIds.length} 个仓库的可见性吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/repos/batch-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: repoIds, visibility }),
      });
      const data = await res.json();
      if (res.ok) {
        const visText = visibility === 0 ? '私有' : visibility === 1 ? '内部' : '公开';
        alert(`成功修改 ${data.count} 个仓库的可见性为 ${visText}`);
        onFetchRepos?.();
      } else {
        alert(data.message || '修改失败');
      }
    } catch {
      alert('修改失败');
    }
  }, [onFetchRepos]);

  // ============================================================
  // 处罚管理操作
  // ============================================================

  /**
   * 延长处罚时间
   */
  const handleExtendPenalty = useCallback(async (penaltyId: string) => {
    const days = prompt('请输入要延长的时间（天）：');
    if (!days || isNaN(parseInt(days))) return;
    try {
      const res = await fetch(`/api/v1/admin/penalties/${penaltyId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: parseInt(days) }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`处罚已延长 ${days} 天`);
        onFetchPenalties?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
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
    const note = prompt('请输入备注内容：');
    if (!note) return;
    try {
      const res = await fetch(`/api/v1/admin/penalties/${penaltyId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: note }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('备注添加成功');
      } else {
        alert(data.message || '添加失败');
      }
    } catch {
      alert('添加失败');
    }
  }, []);

  /**
   * 使用处罚模板
   */
  const handleUseTemplate = useCallback(async (templateId: string, userId: string) => {
    if (!userId) {
      alert('请先选择一个用户');
      return;
    }
    const reason = prompt('请确认使用模板处罚（将使用模板的默认原因）：', '使用处罚模板');
    if (!reason) return;
    try {
      const res = await fetch(`/api/v1/admin/penalty-templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('处罚已添加');
        onFetchPenalties?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchPenalties]);

  /**
   * 创建处罚模板
   */
  const handleCreateTemplate = useCallback(async () => {
    const name = prompt('模板名称：');
    if (!name) return;
    const penaltyType = prompt('处罚类型 (mute/repo_limit/storage_limit)：');
    if (!penaltyType) return;
    const duration = prompt('默认天数：', '7');
    const reason = prompt('默认原因：');
    if (!reason) return;
    try {
      const res = await fetch('/api/v1/admin/penalty-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          penaltyType,
          defaultDuration: parseInt(duration || '7') || 7,
          reason: reason || ''
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('模板创建成功');
        onFetchPenalties?.();
      } else {
        alert(data.message || '创建失败');
      }
    } catch {
      alert('创建失败');
    }
  }, [onFetchPenalties]);

  /**
   * 编辑处罚模板
   */
  const handleEditTemplate = useCallback(async (templateId: string) => {
    const name = prompt('新的模板名称：');
    if (!name) return;
    try {
      const res = await fetch(`/api/v1/admin/penalty-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('模板更新成功');
      } else {
        alert(data.message || '更新失败');
      }
    } catch {
      alert('更新失败');
    }
  }, []);

  /**
   * 删除处罚模板
   */
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;
    try {
      const res = await fetch(`/api/v1/admin/penalty-templates/${templateId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('模板已删除');
        onFetchPenalties?.();
      } else {
        alert(data.message || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  }, [onFetchPenalties]);

  /**
   * 批量解除处罚
   */
  const handleBatchReleasePenalties = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要解除选中的 ${ids.length} 个处罚吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/penalties/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release', penaltyIds: ids }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功解除 ${data.data.successCount} 个处罚`);
        onFetchPenalties?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
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
      const res = await fetch(`/api/v1/admin/appeals/${appealId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('申诉已批准，相关处罚已撤销');
        onFetchAppeals?.();
        onFetchPenalties?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchAppeals, onFetchPenalties]);

  /**
   * 拒绝申诉
   */
  const handleRejectAppeal = useCallback(async (appealId: string) => {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;
    try {
      const res = await fetch(`/api/v1/admin/appeals/${appealId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('申诉已拒绝');
        onFetchAppeals?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
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
      const res = await fetch(`/api/v1/admin/discussions/${discussionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve' }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('讨论已标记为已解决');
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 设置讨论为精华
   */
  const handleSetDiscussionFeatured = useCallback(async (discussionId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/discussions/${discussionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feature' }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('讨论已设为精华');
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 置顶讨论
   */
  const handlePinDiscussion = useCallback(async (discussionId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/discussions/${discussionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pin' }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('讨论已置顶');
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 移动讨论分类
   */
  const handleMoveDiscussionCategory = useCallback(async (discussionId: string, category: string) => {
    try {
      const res = await fetch(`/api/v1/admin/discussions/${discussionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', category }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('讨论已移动到分类 ' + category);
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 关闭讨论
   */
  const handleCloseDiscussion = useCallback(async (discussionId: string) => {
    const reason = prompt('请输入关闭原因（可选）：');
    try {
      const res = await fetch(`/api/v1/admin/discussions/${discussionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', reason }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('讨论已关闭');
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量标记讨论为已解决
   */
  const handleBatchMarkDiscussionsResolved = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要将选中的 ${ids.length} 个讨论标记为已解决吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/discussions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', discussionIds: ids }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功标记 ${ids.length} 个讨论为已解决`);
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量设置讨论为精华
   */
  const handleBatchSetDiscussionsFeatured = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要将选中的 ${ids.length} 个讨论设为精华吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/discussions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'feature', discussionIds: ids }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功将 ${ids.length} 个讨论设为精华`);
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量置顶讨论
   */
  const handleBatchPinDiscussions = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要置顶选中的 ${ids.length} 个讨论吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/discussions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pin', discussionIds: ids }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功置顶 ${ids.length} 个讨论`);
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量移动讨论分类
   */
  const handleBatchMoveDiscussionsCategory = useCallback(async (ids: string[], category: string) => {
    if (!category) {
      alert('请先选择目标分类');
      return;
    }
    if (!confirm(`确定要将选中的 ${ids.length} 个讨论移动到分类 ${category} 吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/discussions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', discussionIds: ids, category }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功移动 ${ids.length} 个讨论`);
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  /**
   * 批量删除讨论
   */
  const handleBatchDeleteDiscussions = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要删除选中的 ${ids.length} 个讨论吗？此操作不可恢复！`)) return;
    try {
      const res = await fetch('/api/v1/admin/discussions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', discussionIds: ids }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功删除 ${data.deletedCount} 个讨论`);
        onFetchDiscussions?.();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [onFetchDiscussions]);

  // ============================================================
  // 公告管理操作
  // ============================================================

  /**
   * 创建公告
   */
  const handleCreateAnnouncement = useCallback(async () => {
    const title = prompt('公告标题：');
    if (!title) return;
    const content = prompt('公告内容：');
    if (!content) return;
    const type = prompt('公告类型 (info/success/warning/danger)：', 'info');
    try {
      const res = await fetch('/api/v1/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, type: type || 'info' }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('公告创建成功');
        admin.fetchAnnouncements();
      } else {
        alert(data.message || '创建失败');
      }
    } catch {
      alert('创建失败');
    }
  }, [admin]);

  /**
   * 编辑公告
   */
  const handleEditAnnouncement = useCallback(async (announcementId: string) => {
    const title = prompt('新的公告标题：');
    if (!title) return;
    const content = prompt('新的公告内容：');
    if (!content) return;
    try {
      const res = await fetch(`/api/v1/admin/announcements/${announcementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('公告更新成功');
        admin.fetchAnnouncements();
      } else {
        alert(data.message || '更新失败');
      }
    } catch {
      alert('更新失败');
    }
  }, [admin]);

  /**
   * 删除公告
   */
  const handleDeleteAnnouncement = useCallback(async (announcementId: string) => {
    if (!confirm('确定要删除这个公告吗？')) return;
    try {
      const res = await fetch(`/api/v1/admin/announcements/${announcementId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('公告已删除');
        admin.fetchAnnouncements();
      } else {
        alert(data.message || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  }, [admin]);

  /**
   * 置顶/取消置顶公告
   */
  const handleToggleAnnouncementPin = useCallback(async (announcementId: string, isPinned: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/announcements/${announcementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !isPinned }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`公告已${!isPinned ? '置顶' : '取消置顶'}`);
        admin.fetchAnnouncements();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [admin]);

  // ============================================================
  // 封禁管理操作
  // ============================================================

  /**
   * 解封用户
   */
  const handleUnbanUser = useCallback(async (userId: string) => {
    if (!confirm('确定要解封这个用户吗？')) return;
    try {
      const res = await fetch(`/api/v1/admin/bans/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.code === 0) {
        alert('用户已解封');
        admin.fetchBans();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  }, [admin]);

  /**
   * 批量解封用户
   */
  const handleBatchUnbanUsers = useCallback(async (userIds: string[]) => {
    if (!confirm(`确定要解封选中的 ${userIds.length} 个用户吗？`)) return;
    try {
      const res = await fetch('/api/v1/admin/bans/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban', userIds }),
      });
      const data = await res.json();
      if (data.code === 0) {
        alert(`成功解封 ${data.successCount} 个用户`);
        admin.fetchBans();
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('操作失败');
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
