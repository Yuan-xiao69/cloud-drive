'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useAdminPage } from '@/components/admin/useAdminPage';
import { useAdminHandlers } from '@/components/admin/useAdminHandlers';
import AdminNav from '@/components/admin/AdminNav';
import AdminDashboard from '@/components/admin/AdminDashboard';
// Enhanced 组件
import AdminUsersEnhanced from '@/components/admin/AdminUsersEnhanced';
import AdminReposEnhanced from '@/components/admin/AdminReposEnhanced';
import AdminReportsEnhanced from '@/components/admin/AdminReportsEnhanced';
import AdminAppealsEnhanced from '@/components/admin/AdminAppealsEnhanced';
import AdminPenaltiesEnhanced from '@/components/admin/AdminPenaltiesEnhanced';
import AdminSecurityEnhanced from '@/components/admin/AdminSecurityEnhanced';
import AdminIpBlacklistEnhanced from '@/components/admin/AdminIpBlacklistEnhanced';
import AdminDiscussionsEnhanced from '@/components/admin/AdminDiscussionsEnhanced';
import AdminAnnouncementsEnhanced from '@/components/admin/AdminAnnouncementsEnhanced';
import AdminNotificationsEnhanced from '@/components/admin/AdminNotificationsEnhanced';
import AdminBansEnhanced from '@/components/admin/AdminBansEnhanced';
import AdminActivityLogsEnhanced from '@/components/admin/AdminActivityLogsEnhanced';
import AdminBackupEnhanced from '@/components/admin/AdminBackupEnhanced';
import AdminAuditLogsEnhanced from '@/components/admin/AdminAuditLogsEnhanced';
import AdminMonitorTab from '@/components/admin/AdminMonitorTab';
import AdminSystemSettingsTab from '@/components/admin/AdminSystemSettingsTab';
import AdminEmailEnhanced from '@/components/admin/AdminEmailEnhanced';
import { ShieldIcon } from '@/components/admin/AdminIcons';
import type { AdminTab, UserFilters, RepoFilters, UserDetail, RepoDetail } from '@/components/admin/AdminTypes';

const API_BASE = '/api/v1/admin';

// ============================================================
// 主组件
// ============================================================

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // 使用 useAdminPage hook 管理所有状态和逻辑
  const admin = useAdminPage();

  // 使用 useAdminHandlers hook 管理所有操作处理函数
  const handlers = useAdminHandlers({
    admin,
    users: admin.users,
    repos: admin.repos,
    penalties: admin.penalties,
    appeals: admin.appeals,
    onSetActiveTab: (tab: string) => setActiveTab(tab as AdminTab),
    onFetchRepos: admin.fetchRepos,
    onFetchPenalties: admin.fetchPenalties,
    onFetchAppeals: admin.fetchAppeals,
    onFetchDiscussions: admin.fetchDiscussions,
  });

  // ============================================================
  // Enhanced 组件需要的额外状态
  // ============================================================

  // 用户管理增强状态
  const [userFilters, setUserFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    dateRange: { start: '', end: '' },
  });

  // 仓库管理增强状态
  const [repoFilters, setRepoFilters] = useState<RepoFilters>({
    search: '',
    visibility: 'all',
    language: '',
    status: 'all',
  });

  // 举报管理增强状态
  const [reportFilters, setReportFilters] = useState<{
    search?: string;
    targetType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    targetType: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // 处罚管理增强状态
  const [penaltyFilters, setPenaltyFilters] = useState<{
    search?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // 申诉管理增强状态
  const [appealFilters, setAppealFilters] = useState<{
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // 安全事件增强状态
  const [securityFilters, setSecurityFilters] = useState<{
    severity?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    severity: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // IP 黑名单增强状态
  const [ipFilters, setIpFilters] = useState<{
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  // 讨论管理增强状态
  const [discussionFilters, setDiscussionFilters] = useState<{
    search?: string;
    category?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    category: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // 公告管理增强状态
  const [announcementFilters, setAnnouncementFilters] = useState<{
    search: string;
    type: string;
    status: string;
  }>({
    search: '',
    type: '',
    status: '',
  });

  // 封禁管理增强状态
  const [banFilters, setBanFilters] = useState<{
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // 活动日志增强状态
  const [activityFilters, setActivityFilters] = useState<{
    search?: string;
    action?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({
    search: '',
    action: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  // 用户详情状态
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // 仓库详情状态
  const [selectedRepoDetail, setSelectedRepoDetail] = useState<RepoDetail | null>(null);
  const [repoDetailLoading, setRepoDetailLoading] = useState(false);

  // ============================================================
  // 详情获取函数
  // ============================================================

  // 获取用户详情
  const fetchUserDetail = useCallback(async (userId: string) => {
    setUserDetailLoading(true);
    try {
      const token = (() => {
        if (typeof document === 'undefined') return null;
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          const trimmed = c.trim();
          if (trimmed.startsWith('access_token=')) {
            const idx = trimmed.indexOf('=');
            return trimmed.slice(idx + 1);
          }
        }
        return null;
      })();

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/users/${userId}/detail`, { headers });
      const data = await res.json();

      if (res.ok && data.code === 0) {
        setSelectedUserDetail(data.data);
      } else {
        console.error('获取用户详情失败:', data.message);
        alert(data.message || '获取用户详情失败');
      }
    } catch (err) {
      console.error('获取用户详情失败:', err);
      alert('获取用户详情失败');
    } finally {
      setUserDetailLoading(false);
    }
  }, []);

  // 获取仓库详情
  const fetchRepoDetail = useCallback(async (repoId: string) => {
    setRepoDetailLoading(true);
    try {
      const token = (() => {
        if (typeof document === 'undefined') return null;
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          const trimmed = c.trim();
          if (trimmed.startsWith('access_token=')) {
            const idx = trimmed.indexOf('=');
            return trimmed.slice(idx + 1);
          }
        }
        return null;
      })();

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/repos/${repoId}/detail`, { headers });
      const data = await res.json();

      if (res.ok && data.code === 0) {
        setSelectedRepoDetail(data.data);
      } else {
        console.error('获取仓库详情失败:', data.message);
        alert(data.message || '获取仓库详情失败');
      }
    } catch (err) {
      console.error('获取仓库详情失败:', err);
      alert('获取仓库详情失败');
    } finally {
      setRepoDetailLoading(false);
    }
  }, []);

  // 点击空白处关闭右键菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // 如果点击的是右键菜单内部，不关闭
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      admin.setUserContextMenu(null);
      admin.setRepoContextMenu(null);
      admin.setReportContextMenu(null);
      admin.setAppealContextMenu(null);
      admin.setPenaltyContextMenu(null);
      admin.setSecurityContextMenu(null);
      admin.setDiscussionContextMenu(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [admin.setUserContextMenu, admin.setRepoContextMenu, admin.setReportContextMenu, admin.setAppealContextMenu, admin.setPenaltyContextMenu, admin.setSecurityContextMenu, admin.setDiscussionContextMenu]);

  // ============================================================
  // 权限加载
  // ============================================================

  useEffect(() => {
    async function loadRole() {
      try {
        const getToken = () => {
          if (typeof document === 'undefined') return null;
          const cookies = document.cookie.split(';');
          for (const c of cookies) {
            const trimmed = c.trim();
            if (trimmed.startsWith('access_token=')) {
              const idx = trimmed.indexOf('=');
              return trimmed.slice(idx + 1);
            }
          }
          return null;
        };

        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v1/auth/me', { headers });
        const data = await res.json();
        if (data.code === 200 && data.data) {
          admin.setUserRole(data.data.role);
        }
      } catch {
        admin.setUserRole('');
      } finally {
        admin.setLoadingRole(false);
      }
    }
    loadRole();
  }, [admin.setUserRole, admin.setLoadingRole]);

  // ============================================================
  // Tab 切换自动加载
  // ============================================================

  useEffect(() => {
    if (admin.loadingRole) return;

    switch (activeTab) {
      case 'dashboard': admin.fetchDashboard(); break;
      case 'users': admin.fetchUsers(); break;
      case 'repos': admin.fetchRepos(); break;
      case 'reports': admin.fetchReports(); break;
      case 'audit': admin.fetchAuditLogs(); break;
      case 'announcements': admin.fetchAnnouncements(); break;
      case 'appeals': admin.fetchAppeals(); break;
      case 'penalties': admin.fetchPenalties(); break;
      case 'security': admin.fetchSecurityEvents(); break;
      case 'ipblacklist': admin.fetchIpBlacklist(); break;
      case 'discussions': admin.fetchDiscussions(); break;
      case 'bans': admin.fetchBans(); break;
      case 'activity-logs': admin.fetchActivityLogs(); break;
      case 'backup': admin.fetchBackupFiles(); break;
      default: break;
    }
  }, [activeTab, admin.loadingRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // 页码/筛选变化时重新加载
  useEffect(() => { if (activeTab === 'users') admin.fetchUsers(); }, [admin.usersPage]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'repos') admin.fetchRepos(); }, [admin.reposPage]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'reports') admin.fetchReports(); }, [admin.reportsPage]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'audit') admin.fetchAuditLogs(); }, [admin.auditLogsPage]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'announcements') admin.fetchAnnouncements(); }, [admin.announcementsPage]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'appeals') admin.fetchAppeals(); }, [admin.appealsPage, admin.appealsStatus]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'penalties') admin.fetchPenalties(); }, [admin.penaltiesPage, admin.penaltiesSearch, admin.penaltiesType, admin.penaltiesStatus]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'security') admin.fetchSecurityEvents(); }, [admin.securityPage, admin.securitySeverity, admin.securityStatus]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'ipblacklist') admin.fetchIpBlacklist(); }, [admin.ipBlacklistPage, admin.ipBlacklistSearch]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'discussions') admin.fetchDiscussions(); }, [admin.discussionsPage, admin.discussionsSearch, admin.discussionsCategory, admin.discussionsStatus]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'bans') admin.fetchBans(); }, [admin.bansPage, admin.bansSearch, admin.bansStatus]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'activity-logs') admin.fetchActivityLogs(); }, [admin.activityLogsPage, admin.activityLogsSearch, admin.activityLogsAction, admin.activityLogsStatus]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'backup') admin.fetchBackupFiles(); }, []); // eslint-disable-line

  // ============================================================
  // 渲染
  // ============================================================

  if (admin.loadingRole) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (admin.userRole !== 'admin' && admin.userRole !== 'super_admin') {
    return (
      <div className="empty-state" style={{ padding: '80px 0', textAlign: 'center' }}>
        <ShieldIcon />
        <h2 style={{ marginTop: '16px' }}>无权限访问</h2>
        <p style={{ color: 'var(--color-fg-muted)', marginTop: '8px' }}>仅管理员可访问此页面</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: '16px', display: 'inline-block' }}>
          返回首页
        </a>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboard
            dashboardData={admin.dashboardData}
            isLoading={admin.dashboardLoading}
            onRefresh={admin.fetchDashboard}
            onNavigate={(tab) => setActiveTab(tab as AdminTab)}
          />
        );
      case 'users':
        return (
          <AdminUsersEnhanced
            users={admin.users}
            usersTotal={admin.usersTotal}
            usersPage={admin.usersPage}
            filters={userFilters}
            usersLoading={admin.usersLoading}
            selectedUsers={admin.selectedUsers}
            contextMenu={admin.userContextMenu}
            selectedUserDetail={selectedUserDetail}
            userDetailLoading={userDetailLoading}
            onSearchChange={(v) => {
              admin.setUsersSearch(v);
              admin.setUsersPage(1);
              setUserFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setUsersPage}
            onFiltersChange={(filters) => {
              setUserFilters(filters);
              admin.setUserFilters(filters);
              admin.setUsersSearch(filters.search || '');
              admin.setUsersPage(1);
            }}
            onSelectAll={() => {
              const allIds = new Set(admin.users.map((u) => u.id));
              admin.selectedUsers.forEach(id => allIds.add(id));
              admin.setSelectedUsers(allIds);
            }}
            onSelectNone={() => admin.setSelectedUsers(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedUsers);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedUsers(next);
            }}
            onViewDetail={(userId) => {
              if (!userId) {
                // 关闭详情面板
                setSelectedUserDetail(null);
              } else if (selectedUserDetail?.id === userId) {
                // 同一用户，点击关闭
                setSelectedUserDetail(null);
              } else {
                // 获取用户详情
                fetchUserDetail(userId);
              }
            }}
            onEditUser={(userId) => {
              // 打开编辑弹窗
              admin.handleMuteUser(userId, '');
            }}
            onSendNotification={handlers.handleSendNotification}
            onCopyEmail={handlers.handleCopyEmail}
            onMuteUser={(userId, username) => {
              const user = admin.users.find(u => u.id === userId);
              if (user) admin.handleMuteUser(userId, username || user.username);
            }}
            onLimitRepoUser={(userId, username) => {
              const user = admin.users.find(u => u.id === userId);
              if (user) admin.handleLimitRepoUser(userId, username || user.username);
            }}
            onLimitStorageUser={(userId, username) => {
              const user = admin.users.find(u => u.id === userId);
              if (user) admin.handleLimitStorageUser(userId, username || user.username);
            }}
            onBanUser={(userId) => {
              admin.handleBanUser(userId, true);
            }}
            onDeleteUser={admin.handleDeleteUser}
            onExportUsers={(userIds) => {
              const ids = userIds || Array.from(admin.selectedUsers);
              if (ids.length === 0) {
                alert('请选择要导出的用户');
                return;
              }
              // 导出为 CSV
              const users = admin.users.filter(u => ids.includes(u.id));
              const csv = [
                ['用户名', '邮箱', '角色', '状态', '注册时间'].join(','),
                ...users.map(u => [u.username, u.email, u.role, u.status || 'active', u.createdAt].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            onBatchMute={handlers.handleBatchMute}
            onBatchBan={handlers.handleBatchBan}
            onBatchDelete={admin.handleDeleteSelectedUsers}
            onContextMenu={(e, userId) => {
              e.preventDefault();
              admin.setUserContextMenu({ x: e.clientX, y: e.clientY, type: 'user', id: userId });
            }}
            onCloseContextMenu={() => admin.setUserContextMenu(null)}
            onRefresh={admin.fetchUsers}
          />
        );
      case 'repos':
        return (
          <AdminReposEnhanced
            repos={admin.repos}
            reposTotal={admin.reposTotal}
            reposPage={admin.reposPage}
            filters={repoFilters}
            reposLoading={admin.reposLoading}
            selectedRepos={admin.selectedRepos}
            contextMenu={admin.repoContextMenu}
            selectedRepoDetail={selectedRepoDetail}
            repoDetailLoading={repoDetailLoading}
            onSearchChange={(v) => {
              admin.setReposSearch(v);
              admin.setReposPage(1);
              setRepoFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setReposPage}
            onFiltersChange={(filters) => {
              setRepoFilters(filters);
              admin.setReposSearch(filters.search || '');
              admin.setReposPage(1);
            }}
            onSelectAll={() => admin.setSelectedRepos(new Set(admin.repos.map((r) => r.id)))}
            onSelectNone={() => admin.setSelectedRepos(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedRepos);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedRepos(next);
            }}
            onViewDetail={(repoId) => {
              if (!repoId) {
                // 关闭详情面板
                setSelectedRepoDetail(null);
              } else if (selectedRepoDetail?.id === repoId) {
                // 同一仓库，点击关闭
                setSelectedRepoDetail(null);
              } else {
                // 获取仓库详情
                fetchRepoDetail(repoId);
              }
            }}
            onBrowseFiles={(repo) => {
              window.location.href = `/${repo.ownerUsername}/${repo.name}`;
            }}
            onCopyUrl={(url) => {
              navigator.clipboard.writeText(url);
              alert('链接已复制');
            }}
            onChangeVisibility={async (repoId, visibility) => {
              try {
                const res = await fetch(`/api/v1/admin/repos/${repoId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ visibility }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert(`可见性已修改为 ${visibility === 0 ? '私有' : visibility === 1 ? '内部' : '公开'}`);
                  admin.fetchRepos();
                } else {
                  alert(data.message || '修改失败');
                }
              } catch {
                alert('修改失败');
              }
            }}
            onArchiveRepo={async (repoId) => {
              try {
                const res = await fetch('/api/v1/admin/repos/batch-archive', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ids: [repoId], action: 'archive' }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert('仓库已归档');
                  admin.fetchRepos();
                } else {
                  alert(data.message || '归档失败');
                }
              } catch {
                alert('归档失败');
              }
            }}
            onDeleteRepo={admin.handleDeleteRepo}
            onExportRepos={handlers.handleExportRepos}
            onBatchArchive={handlers.handleBatchArchive}
            onBatchDelete={admin.handleDeleteSelectedRepos}
            onBatchChangeVisibility={handlers.handleBatchChangeVisibility}
            onContextMenu={(e, repoId) => {
              e.preventDefault();
              admin.setRepoContextMenu({ x: e.clientX, y: e.clientY, type: 'repo', id: repoId });
            }}
            onCloseContextMenu={() => admin.setRepoContextMenu(null)}
            onRefresh={admin.fetchRepos}
          />
        );
      case 'reports':
        return (
          <AdminReportsEnhanced
            reports={admin.reports}
            reportsTotal={admin.reportsTotal}
            reportsPage={admin.reportsPage}
            reportStats={admin.reportStats}
            filters={reportFilters}
            reportsLoading={admin.reportsLoading}
            selectedReports={admin.selectedReports}
            contextMenu={admin.reportContextMenu}
            selectedReportDetail={admin.selectedReportDetail}
            reportDetailLoading={admin.reportDetailLoading}
            onSearchChange={(v) => {
              admin.setReportsPage(1);
              setReportFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setReportsPage}
            onFiltersChange={(filters) => {
              setReportFilters(filters);
              admin.setReportsPage(1);
            }}
            onSelectAll={() => {
              const allIds = new Set(admin.reports.map((r) => r.id));
              admin.setSelectedReports(allIds);
            }}
            onSelectNone={() => admin.setSelectedReports(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedReports);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedReports(next);
            }}
            onViewDetail={(reportId) => {
              if (!reportId) {
                // 关闭详情面板
                admin.setSelectedReportDetail(null);
              } else if (admin.selectedReportDetail?.id === reportId) {
                // 同一举报，点击关闭
                admin.setSelectedReportDetail(null);
              } else {
                // 获取举报详情
                admin.fetchReportDetail(reportId);
                // 获取统计（如果还没有）
                if (!admin.reportStats) {
                  admin.fetchReportStats();
                }
              }
            }}
            onMarkProcessed={(reportId) => {
              admin.handleOpenReportModal(reportId, 'dismiss');
            }}
            onIgnoreReport={(reportId) => {
              admin.handleOpenReportModal(reportId, 'dismiss');
            }}
            onSendWarning={async (reportId) => {
              const report = admin.reports.find(r => r.id === reportId);
              if (!report) return;
              const reason = prompt('请输入警告原因：');
              if (!reason) return;
              try {
                // 先通过举报详情获取目标用户 ID
                let targetUserId: string | undefined;
                if (report.targetType === 'user') {
                  targetUserId = report.targetId;
                } else {
                  const detailRes = await fetch(`/api/v1/admin/reports/${reportId}/detail`);
                  const detailData = await detailRes.json();
                  if (detailData.code === 200 && detailData.data?.targetInfo) {
                    targetUserId = detailData.data.targetInfo.authorId
                      || detailData.data.targetInfo.ownerId
                      || undefined;
                  }
                }
                if (!targetUserId) {
                  alert('无法获取被举报用户信息');
                  return;
                }
                const res = await fetch('/api/v1/admin/warnings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: targetUserId,
                    reportId: report.id,
                    reason,
                  }),
                });
                const data = await res.json();
                if (data.code === 200 || data.code === 201) {
                  alert('警告已发送');
                  admin.fetchReports();
                } else {
                  alert(data.message || '发送失败');
                }
              } catch {
                alert('发送失败');
              }
            }}
            onMuteUser={(reportId) => {
              const report = admin.reports.find(r => r.id === reportId);
              if (report) admin.handlePenalizeFromReport(report, 'mute', '举报处理 - 警告');
            }}
            onBanUser={(reportId) => {
              const report = admin.reports.find(r => r.id === reportId);
              if (report) admin.handlePenalizeFromReport(report, 'ban', '举报处理 - 封禁');
            }}
            onDeleteContent={(reportId) => {
              admin.handleOpenReportModal(reportId, 'delete');
            }}
            onViewRelatedReports={async (reportId) => {
              try {
                const res = await fetch(`/api/v1/admin/reports/related/${reportId}`);
                const data = await res.json();
                if (data.code === 200) {
                  const info = `关联举报数: ${data.data.totalRelated || 0}\n\n` +
                    (data.data.relatedReports || []).slice(0, 5).map((r: { reason: string; status: string }) =>
                      `${r.reason} - ${r.status}`
                    ).join('\n') || '无';
                  alert(info);
                } else {
                  alert(data.message || '获取失败');
                }
              } catch {
                alert('获取失败');
              }
            }}
            onViewReporterHistory={async (reportId) => {
              try {
                const res = await fetch(`/api/v1/admin/reports/reporter/${reportId}`);
                const data = await res.json();
                if (data.code === 200) {
                  const stats = data.data.stats;
                  const info = `举报者: @${data.data.reporter?.username || '未知'}\n` +
                    `总举报数: ${stats.total}\n` +
                    `待处理: ${stats.pending}\n` +
                    `已处理: ${stats.processed}\n` +
                    `已忽略: ${stats.ignored}\n` +
                    `有效率: ${stats.validRate}%`;
                  alert(info);
                } else {
                  alert(data.message || '获取失败');
                }
              } catch {
                alert('获取失败');
              }
            }}
            onBatchMarkProcessed={(ids) => {
              if (!confirm(`确定要将选中的 ${ids.length} 条举报标记为已处理吗？`)) return;
              ids.forEach(id => admin.handleOpenReportModal(id, 'dismiss'));
            }}
            onBatchIgnore={(ids) => {
              if (!confirm(`确定要忽略选中的 ${ids.length} 条举报吗？`)) return;
              ids.forEach(id => admin.handleOpenReportModal(id, 'dismiss'));
            }}
            onBatchDelete={(ids) => {
              if (!confirm(`确定要删除选中的 ${ids.length} 条举报内容吗？`)) return;
              ids.forEach(id => admin.handleOpenReportModal(id, 'delete'));
            }}
            onContextMenu={(e, reportId) => {
              e.preventDefault();
              admin.setReportContextMenu({ x: e.clientX, y: e.clientY, type: 'report', id: reportId });
            }}
            onCloseContextMenu={() => admin.setReportContextMenu(null)}
            onRefresh={() => {
              admin.fetchReports();
              admin.fetchReportStats();
            }}
            showReportModal={admin.showReportModal}
            reportAction={admin.reportAction}
            reportNote={admin.reportNote}
            isHandlingReport={admin.isHandlingReport}
            onReportNoteChange={admin.setReportNote}
            onReportSubmit={admin.handleReportSubmit}
            onCloseReportModal={() => { admin.setShowReportModal(false); admin.setCurrentReportId(null); }}
          />
        );
      case 'audit':
        return (
          <AdminAuditLogsEnhanced
            logs={admin.auditLogs}
            logsTotal={admin.auditLogsTotal}
            logsPage={admin.auditLogsPage}
            logsLoading={admin.auditLogsLoading}
            filters={{
              search: admin.activityLogsSearch,
              action: admin.activityLogsAction,
              status: admin.activityLogsStatus,
              dateFrom: '',
              dateTo: '',
            }}
            onPageChange={admin.setAuditLogsPage}
            onFiltersChange={(filters) => {
              admin.setActivityLogsSearch(filters.search || '');
              admin.setActivityLogsAction(filters.action || '');
              admin.setActivityLogsStatus(filters.status || '');
            }}
            onResetFilters={() => {
              admin.setActivityLogsSearch('');
              admin.setActivityLogsAction('');
              admin.setActivityLogsStatus('');
            }}
          />
        );
      case 'announcements':
        return (
          <AdminAnnouncementsEnhanced
            announcements={admin.announcements}
            announcementsTotal={admin.announcementsTotal}
            announcementsPage={admin.announcementsPage}
            announcementsLoading={admin.announcementsLoading}
            onPageChange={admin.setAnnouncementsPage}
            onCreate={async (data) => {
              // 直接提交创建
              admin.setAnnouncementForm({ ...data, id: '' });
              admin.setShowAnnouncementModal(true);
              // 等待弹窗显示后自动提交
              try {
                await admin.handleAnnouncementSubmit();
              } catch (err) {
                console.error('创建公告失败:', err);
              }
            }}
            onUpdate={async (id, data) => {
              // 直接提交更新
              const existing = admin.announcements.find(a => a.id === id);
              if (existing) {
                admin.setAnnouncementForm({ ...data, id } as typeof admin.announcementForm);
                admin.setShowAnnouncementModal(true);
                // 等待弹窗显示后自动提交
                try {
                  await admin.handleAnnouncementSubmit();
                } catch (err) {
                  console.error('更新公告失败:', err);
                }
              }
            }}
            onDelete={admin.handleDeleteAnnouncement}
            onPublish={(id) => {
              admin.handleToggleAnnouncementActive(id, true);
            }}
            onTogglePin={(id) => {
              const ann = admin.announcements.find(a => a.id === id);
              if (ann) admin.handleToggleAnnouncementActive(id, !ann.isPinned);
            }}
          />
        );
      case 'appeals':
        return (
          <AdminAppealsEnhanced
            appeals={admin.appeals}
            appealsTotal={admin.appealsTotal}
            appealsPage={admin.appealsPage}
            filters={appealFilters}
            appealsLoading={admin.appealsLoading}
            selectedAppeals={admin.selectedAppeals}
            contextMenu={admin.appealContextMenu}
            selectedAppealDetail={admin.selectedAppealDetail}
            onSearchChange={(v) => {
              admin.setAppealsPage(1);
              setAppealFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setAppealsPage}
            onFiltersChange={(filters) => {
              setAppealFilters(filters);
              admin.setAppealsStatus(filters.status || '');
              admin.setAppealsPage(1);
            }}
            onRefresh={() => admin.fetchAppeals()}
            onSelectAll={() => {
              const allIds = new Set(admin.appeals.map((a) => a.id));
              admin.setSelectedAppeals(allIds);
            }}
            onSelectNone={() => admin.setSelectedAppeals(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedAppeals);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedAppeals(next);
            }}
            onViewDetail={(appealId) => {
              const appeal = admin.appeals.find(a => a.id === appealId);
              if (appeal) admin.handleOpenAppealModal(appeal);
            }}
            onApproveAppeal={(appealId) => {
              const appeal = admin.appeals.find(a => a.id === appealId);
              if (appeal) {
                admin.handleOpenAppealModal(appeal);
                // 延迟执行批准操作
                setTimeout(() => admin.handleApproveAppeal(appealId), 100);
              }
            }}
            onRejectAppeal={(appealId) => {
              const appeal = admin.appeals.find(a => a.id === appealId);
              if (appeal) {
                admin.handleOpenAppealModal(appeal);
                // 延迟执行拒绝操作
                setTimeout(() => admin.handleRejectAppeal(appealId), 100);
              }
            }}
            onReplyAppeal={(appealId, reply) => {
              admin.setAppealReply(reply);
              admin.handleApproveAppeal(appealId);
            }}
            onViewPenalty={(appealId) => {
              setActiveTab('penalties');
            }}
            onViewUser={(appealId) => {
              const appeal = admin.appeals.find(a => a.id === appealId);
              if (appeal && appeal.userUsername) window.location.href = `/${appeal.userUsername}`;
            }}
            onExportAppeals={() => {
              const csv = [
                ['申诉ID', '用户名', '状态', '提交时间', '处理时间'].join(','),
                ...admin.appeals.map(a => [a.id, a.userUsername || '-', a.status, a.createdAt, a.updatedAt || '-'].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `appeals-export-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            onBatchApprove={(ids) => {
              if (!confirm(`确定要批准选中的 ${ids.length} 条申诉吗？`)) return;
              ids.forEach(id => admin.handleApproveAppeal(id));
            }}
            onBatchReject={(ids) => {
              if (!confirm(`确定要拒绝选中的 ${ids.length} 条申诉吗？`)) return;
              ids.forEach(id => admin.handleRejectAppeal(id));
            }}
            onContextMenu={(e, appealId) => {
              e.preventDefault();
              admin.setAppealContextMenu({ x: e.clientX, y: e.clientY, type: 'appeal', id: appealId });
            }}
            onCloseContextMenu={() => admin.setAppealContextMenu(null)}
          />
        );
      case 'penalties':
        return (
          <AdminPenaltiesEnhanced
            penalties={admin.penalties}
            penaltiesTotal={admin.penaltiesTotal}
            penaltiesPage={admin.penaltiesPage}
            filters={penaltyFilters}
            penaltiesLoading={admin.penaltiesLoading}
            selectedPenalties={admin.selectedPenalties}
            contextMenu={admin.penaltyContextMenu}
            penaltyTemplates={admin.penaltyTemplates}
            onSearchChange={(v) => {
              admin.setPenaltiesSearch(v);
              admin.setPenaltiesPage(1);
              setPenaltyFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setPenaltiesPage}
            onFiltersChange={(filters) => {
              setPenaltyFilters(filters);
              admin.setPenaltiesSearch(filters.search || '');
              admin.setPenaltiesType(filters.type || '');
              admin.setPenaltiesStatus(filters.status || '');
              admin.setPenaltiesPage(1);
            }}
            onSelectAll={() => {
              const allIds = new Set(admin.penalties.map((p) => p.id));
              admin.setSelectedPenalties(allIds);
            }}
            onSelectNone={() => admin.setSelectedPenalties(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedPenalties);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedPenalties(next);
            }}
            onViewDetail={(penaltyId) => {
              const penalty = admin.penalties.find(p => p.id === penaltyId);
              if (penalty) admin.handleOpenPenaltyDetail(penalty);
            }}
            onEditPenalty={(penaltyId) => {
              // 编辑处罚 - 复用添加处罚弹窗
              admin.setShowPenaltyModal(true);
            }}
            onExtendPenalty={handlers.handleExtendPenalty}
            onReleasePenalty={handlers.handleReleasePenalty}
            onRevokePenalty={handlers.handleRevokePenalty}
            onAddNote={handlers.handleAddPenaltyNote}
            onViewTemplates={() => {}}
            onUseTemplate={handlers.handleUseTemplate}
            onCreateTemplate={handlers.handleCreateTemplate}
            onEditTemplate={handlers.handleEditTemplate}
            onDeleteTemplate={handlers.handleDeleteTemplate}
            onBatchRelease={handlers.handleBatchReleasePenalties}
            onBatchRevoke={(ids) => {
              if (!confirm(`确定要撤销选中的 ${ids.length} 条处罚吗？`)) return;
              ids.forEach(id => handlers.handleRevokePenalty(id));
            }}
            onContextMenu={(e, penaltyId) => {
              e.preventDefault();
              admin.setPenaltyContextMenu({ x: e.clientX, y: e.clientY, type: 'penalty', id: penaltyId });
            }}
            onCloseContextMenu={() => admin.setPenaltyContextMenu(null)}
            onRefresh={admin.fetchPenalties}
          />
        );
      case 'security':
        return (
          <AdminSecurityEnhanced
            securityEvents={admin.securityEvents}
            securityTotal={admin.securityTotal}
            securityPage={admin.securityPage}
            filters={securityFilters}
            securityStats={admin.securityStats}
            securityLoading={admin.securityLoading}
            selectedSecurityEvents={admin.selectedSecurityEvents}
            contextMenu={admin.securityContextMenu}
            selectedSecurityEventDetail={admin.selectedSecurityEventDetail}
            onSearchChange={(v) => {
              admin.setSecurityPage(1);
              setSecurityFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setSecurityPage}
            onFiltersChange={(filters) => {
              setSecurityFilters(filters);
              admin.setSecuritySeverity(filters.severity || '');
              admin.setSecurityStatus(filters.status || '');
              admin.setSecurityPage(1);
            }}
            onSelectAll={() => {
              const allIds = new Set(admin.securityEvents.map((e) => e.id));
              admin.setSelectedSecurityEvents(allIds);
            }}
            onSelectNone={() => admin.setSelectedSecurityEvents(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedSecurityEvents);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedSecurityEvents(next);
            }}
            onViewDetail={(eventId) => {
              const event = admin.securityEvents.find(e => e.id === eventId);
              if (event) admin.handleOpenSecurityModal(event);
            }}
            onMarkResolved={(eventId) => {
              admin.handleResolveSecurityEvent(eventId);
            }}
            onIgnoreEvent={async (eventId) => {
              const note = prompt('请输入忽略原因（可选）：');
              try {
                const res = await fetch(`/api/v1/admin/security-events/${eventId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'ignore', note }),
                });
                const data = await res.json();
                if (data.code === 0) {
                  alert('事件已标记为误报');
                  admin.fetchSecurityEvents();
                } else {
                  alert(data.message || '操作失败');
                }
              } catch {
                alert('操作失败');
              }
            }}
            onViewRelated={async (eventId) => {
              try {
                const res = await fetch(`/api/v1/admin/security-events/related/${eventId}`);
                const data = await res.json();
                if (data.code === 0) {
                  const info = `相同IP事件数: ${data.data.stats.sameIpCount}\n` +
                    `相同用户事件数: ${data.data.stats.sameUserCount}\n` +
                    `关联事件数: ${data.data.relatedEvents?.length || 0}`;
                  alert(info);
                } else {
                  alert('获取失败');
                }
              } catch {
                alert('获取失败');
              }
            }}
            onExportEvents={() => {
              const csv = [
                ['事件ID', '类型', '严重程度', '状态', '发生时间'].join(','),
                ...admin.securityEvents.map(e => [e.id, e.eventType, e.severity, e.status, e.createdAt].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `security-events-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            onBatchMarkResolved={(ids: string[]) => {
              if (!confirm(`确定要将选中的 ${ids.length} 个事件标记为已解决吗？`)) return;
              ids.forEach((id: string) => admin.handleResolveSecurityEvent(id));
            }}
            onBatchIgnore={async (ids: string[]) => {
              if (!confirm(`确定要将选中的 ${ids.length} 个事件标记为误报吗？`)) return;
              try {
                const res = await fetch('/api/v1/admin/security-events/batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'ignore', eventIds: ids }),
                });
                const data = await res.json();
                if (data.code === 0) {
                  alert('批量忽略成功');
                  admin.fetchSecurityEvents();
                } else {
                  alert(data.message || '操作失败');
                }
              } catch {
                alert('操作失败');
              }
            }}
            onBanIp={async (ipAddress: string, reason: string, duration: string) => {
              try {
                const res = await fetch('/api/v1/admin/ip-blacklist', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ipAddress, reason, duration }),
                });
                const data = await res.json();
                if (data.code === 200 || data.code === 0) {
                  alert(`已封禁 IP: ${ipAddress}`);
                } else {
                  alert(data.message || '封禁失败');
                }
              } catch {
                alert('封禁失败');
              }
            }}
            onSendAlert={async (eventId: string, message: string) => {
              try {
                const res = await fetch('/api/v1/admin/notifications/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title: '安全告警', content: message, type: 'security' }),
                });
                const data = await res.json();
                if (data.code === 200 || data.code === 0) {
                  alert('已发送安全告警通知');
                } else {
                  alert(data.message || '发送失败');
                }
              } catch {
                alert('发送失败');
              }
            }}
            onContextMenu={(e, eventId) => {
              e.preventDefault();
              admin.setSecurityContextMenu({ x: e.clientX, y: e.clientY, type: 'security', id: eventId });
            }}
            onCloseContextMenu={() => admin.setSecurityContextMenu(null)}
            onRefresh={admin.fetchSecurityEvents}
          />
        );
      case 'ipblacklist':
        return (
          <AdminIpBlacklistEnhanced
            ipBlacklist={admin.ipBlacklist}
            ipBlacklistTotal={admin.ipBlacklistTotal}
            ipBlacklistPage={admin.ipBlacklistPage}
            ipBlacklistSearch={admin.ipBlacklistSearch}
            ipBlacklistLoading={admin.ipBlacklistLoading}
            showIpModal={admin.showIpModal}
            ipForm={admin.ipForm}
            ipSaving={admin.ipSaving}
            onPageChange={admin.setIpBlacklistPage}
            onSearchChange={(v) => { admin.setIpBlacklistSearch(v); admin.setIpBlacklistPage(1); }}
            onOpenModal={() => admin.setShowIpModal(true)}
            onCloseModal={() => admin.setShowIpModal(false)}
            onFormChange={(field, value) => {
              const newForm = { ...admin.ipForm, [field]: value };
              admin.setIpForm(newForm);
            }}
            onSubmit={admin.handleIpSubmit}
            onDelete={admin.handleDeleteIp}
          />
        );
      case 'discussions':
        return (
          <AdminDiscussionsEnhanced
            discussions={admin.adminDiscussions}
            discussionsTotal={admin.discussionsTotal}
            discussionsPage={admin.discussionsPage}
            filters={discussionFilters}
            discussionsLoading={admin.discussionsLoading}
            selectedDiscussions={admin.selectedDiscussions}
            contextMenu={admin.discussionContextMenu}
            selectedDiscussionDetail={admin.selectedDiscussionDetail}
            onSearchChange={(v) => {
              admin.setDiscussionsSearch(v);
              admin.setDiscussionsPage(1);
              setDiscussionFilters(prev => ({ ...prev, search: v }));
            }}
            onPageChange={admin.setDiscussionsPage}
            onFiltersChange={(filters) => {
              setDiscussionFilters(filters);
              admin.setDiscussionsSearch(filters.search || '');
              admin.setDiscussionsCategory(filters.category || '');
              admin.setDiscussionsStatus(filters.status || '');
              admin.setDiscussionsPage(1);
            }}
            onSelectAll={() => {
              const allIds = new Set(admin.adminDiscussions.map((d) => d.id));
              admin.setSelectedDiscussions(allIds);
            }}
            onSelectNone={() => admin.setSelectedDiscussions(new Set())}
            onToggleSelect={(id) => {
              const next = new Set(admin.selectedDiscussions);
              if (next.has(id)) next.delete(id); else next.add(id);
              admin.setSelectedDiscussions(next);
            }}
            onViewDetail={(discussionId) => {
              if (!discussionId) {
                admin.setSelectedDiscussionDetail(null);
              } else if (admin.selectedDiscussionDetail?.id === discussionId) {
                admin.setSelectedDiscussionDetail(null);
              } else {
                const discussion = admin.adminDiscussions.find(d => d.id === discussionId);
                if (discussion) {
                  admin.setSelectedDiscussionDetail(discussion as unknown as DiscussionDetail);
                }
              }
            }}
            onMarkResolved={handlers.handleMarkDiscussionResolved}
            onSetFeatured={handlers.handleSetDiscussionFeatured}
            onSetPinned={handlers.handlePinDiscussion}
            onMoveCategory={handlers.handleMoveDiscussionCategory}
            onCloseDiscussion={handlers.handleCloseDiscussion}
            onDeleteDiscussion={admin.handleDeleteDiscussion}
            onViewReports={() => setActiveTab('reports')}
            onBatchMarkResolved={handlers.handleBatchMarkDiscussionsResolved}
            onBatchSetFeatured={handlers.handleBatchSetDiscussionsFeatured}
            onBatchSetPinned={handlers.handleBatchPinDiscussions}
            onBatchMoveCategory={handlers.handleBatchMoveDiscussionsCategory}
            onBatchDelete={handlers.handleBatchDeleteDiscussions}
            onContextMenu={(e, discussionId) => {
              e.preventDefault();
              admin.setDiscussionContextMenu({ x: e.clientX, y: e.clientY, type: 'discussion', id: discussionId });
            }}
            onCloseContextMenu={() => admin.setDiscussionContextMenu(null)}
            onRefresh={admin.fetchDiscussions}
          />
        );
      case 'monitor':
        return <AdminMonitorTab />;
      case 'settings':
        return <AdminSystemSettingsTab />;
      case 'email':
        return <AdminEmailEnhanced />;
      case 'notifications':
        return (
          <AdminNotificationsEnhanced
            notifications={[]}
            notificationsTotal={0}
            notificationsPage={1}
            notificationsLoading={false}
            onPageChange={() => {}}
            onSendNotification={async (data) => {
              await admin.handleSendNotification(data);
            }}
            onDelete={async (id) => {
              if (!confirm('确定要删除这条通知吗？')) return;
              try {
                const res = await fetch(`/api/v1/admin/notifications/${id}`, {
                  method: 'DELETE',
                });
                const data = await res.json();
                if (data.code === 0) {
                  alert('通知已删除');
                } else {
                  alert(data.message || '删除失败');
                }
              } catch {
                alert('删除失败');
              }
            }}
          />
        );
      case 'bans':
        return (
          <AdminBansEnhanced
            bans={admin.bans}
            bansTotal={admin.bansTotal}
            bansPage={admin.bansPage}
            bansSearch={admin.bansSearch}
            bansStatus={admin.bansStatus}
            bansLoading={admin.bansLoading}
            showBanModal={admin.showBanModal}
            banForm={admin.banForm}
            banSaving={admin.banSaving}
            showUnbanModal={admin.showUnbanModal}
            unbanBanRecord={admin.unbanBanRecord}
            unbanReason={admin.unbanReason}
            unbanSaving={admin.unbanSaving}
            showDeleteBanModal={admin.showDeleteBanModal}
            deleteBanRecord={admin.deleteBanRecord}
            deleteBanSaving={admin.deleteBanSaving}
            onSearchChange={(v) => { admin.setBansSearch(v); admin.setBansPage(1); }}
            onStatusChange={(v) => { admin.setBansStatus(v); admin.setBansPage(1); }}
            onPageChange={admin.setBansPage}
            onOpenBanModal={admin.handleOpenBanModal}
            onCloseBanModal={admin.handleCloseBanModal}
            onFormChange={(field, value) => {
              const newForm = { ...admin.banForm, [field]: value };
              admin.setBanForm(newForm);
            }}
            onBanSubmit={admin.handleBanSubmit}
            onOpenUnbanModal={admin.handleOpenUnbanModal}
            onCloseUnbanModal={admin.handleCloseUnbanModal}
            onUnbanReasonChange={admin.setUnbanReason}
            onUnbanSubmit={admin.handleUnbanSubmit}
            onOpenDeleteBanModal={admin.handleOpenDeleteBanModal}
            onCloseDeleteBanModal={admin.handleCloseDeleteBanModal}
            onDeleteBanSubmit={admin.handleDeleteBanSubmit}
          />
        );
      case 'activity-logs':
        return (
          <AdminActivityLogsEnhanced
            activityLogs={admin.activityLogs}
            activityLogsTotal={admin.activityLogsTotal}
            activityLogsPage={admin.activityLogsPage}
            activityLogsSearch={admin.activityLogsSearch}
            activityLogsAction={admin.activityLogsAction}
            activityLogsStatus={admin.activityLogsStatus}
            activityLogsLoading={admin.activityLogsLoading}
            activityLogStats={admin.activityLogStats ? {
              total: admin.activityLogStats.total,
              successCount: admin.activityLogStats.successCount,
              failCount: admin.activityLogStats.failedCount,
            } : undefined}
            onSearchChange={(v) => { admin.setActivityLogsSearch(v); admin.setActivityLogsPage(1); }}
            onActionChange={(v) => { admin.setActivityLogsAction(v); admin.setActivityLogsPage(1); }}
            onStatusChange={(v) => { admin.setActivityLogsStatus(v); admin.setActivityLogsPage(1); }}
            onPageChange={admin.setActivityLogsPage}
            onRefresh={admin.fetchActivityLogs}
          />
        );
      case 'backup':
        return (
          <AdminBackupEnhanced
            backupFiles={admin.backupFiles}
            backupLoading={admin.backupLoading}
            backupCreating={admin.backupCreating}
            backupStats={admin.backupStats}
            showBackupModal={admin.showBackupModal}
            backupForm={admin.backupForm}
            showDeleteBackupModal={admin.showDeleteBackupModal}
            deleteBackupFile={admin.deleteBackupFile}
            deleteBackupSaving={admin.deleteBackupSaving}
            onRefresh={admin.fetchBackupFiles}
            onOpenBackupModal={admin.handleOpenBackupModal}
            onCloseBackupModal={admin.handleCloseBackupModal}
            onFormChange={(field, value) => {
              const newForm = { ...admin.backupForm, [field]: value };
              admin.setBackupForm(newForm);
            }}
            onCreateBackup={admin.handleCreateBackup}
            onOpenDeleteBackupModal={admin.handleOpenDeleteBackupModal}
            onCloseDeleteBackupModal={admin.handleCloseDeleteBackupModal}
            onDeleteBackupSubmit={admin.handleDeleteBackupSubmit}
          />
        );
      default:
        return (
          <div className="empty-state">
            <p>该功能模块开发中...</p>
          </div>
        );
    }
  };

  return (
    <div className="admin-layout">
      <AdminNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={admin.userRole}
      />
      <main className="admin-main">
        {renderTabContent()}
      </main>
    </div>
  );
}
