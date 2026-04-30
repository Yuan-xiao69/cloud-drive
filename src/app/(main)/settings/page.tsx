'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import SettingsLayout from '@/components/settings/SettingsLayout';
import ProfileSettings from '@/components/settings/ProfileSettings';
import AccountSettings from '@/components/settings/AccountSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import RepoManagementSettings from '@/components/settings/RepoManagementSettings';
import DataExportSettings from '@/components/settings/DataExportSettings';
import ReportSettings from '@/components/settings/ReportSettings';
import BlockSettings from '@/components/settings/BlockSettings';
import { PasswordChangeModal, LoginHistoryModal, DeleteAccountModal } from '@/components/settings/modals';
import { useAuth } from '@/lib/providers';
import { tokenManager } from '@/lib/api/client';
import dynamic from 'next/dynamic';

// 动态导入 MFA 设置组件（避免 SSR 问题）
const MFASettingsModal = dynamic(() => import('@/components/settings/MFASettings'), {
  ssr: false,
  loading: () => <div className="loading-placeholder">加载中...</div>,
});

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const RepoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a.5.5 0 0 1 .5.5v.5h5a.5.5 0 0 1 0 1h-5v.5A1.5 1.5 0 0 1 7 4.5v1A1.5 1.5 0 0 1 8.5 7h2a.5.5 0 0 1 0 1h-2A2.5 2.5 0 0 1 6 5.5v-1A2.5 2.5 0 0 1 7.5 2H8V1.5A.5.5 0 0 1 8 1z" />
  </svg>
);

const BlockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const LogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
    <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z" />
  </svg>
);

type SettingsTab = 'profile' | 'account' | 'notifications' | 'repositories' | 'export' | 'reports' | 'blocks';

export default function SettingsPage() {
  const { user, updateUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 初始化表单状态
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

  // Repositories list (loaded from real API)
  interface RepoItem {
    id: string;
    name: string;
    visibility: string;
  }
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [reposLoading, setReposLoading] = useState(false);

  // Load repos from real API when tab switches to repositories
  useEffect(() => {
    if (activeTab === 'repositories' && user?.username) {
      setReposLoading(true);
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      fetch('/api/v1/me/repos', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(data => {
          if (data.code === 200) {
            setRepos(data.data?.items || []);
          }
        })
        .catch(e => console.error('Load repos failed:', e))
        .finally(() => setReposLoading(false));
    }
  }, [activeTab, user?.username]);

  // Load notification settings when tab switches to notifications
  useEffect(() => {
    if (activeTab === 'notifications' && !notificationSettingsLoaded && user) {
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      fetch('/api/v1/users/notifications/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(data => {
          if (data.code === 200 && data.data) {
            setNotificationSettings({
              watchNotifications: data.data.watchNotifications ?? true,
              forkNotifications: data.data.forkNotifications ?? true,
              releaseNotifications: data.data.releaseNotifications ?? true,
              discussionReplies: data.data.discussionReplies ?? true,
              discussionMentions: data.data.discussionMentions ?? true,
              issueComments: data.data.issueComments ?? true,
              issueMentions: data.data.issueMentions ?? true,
              prReviews: data.data.prReviews ?? true,
              prComments: data.data.prComments ?? true,
              prMentions: data.data.prMentions ?? true,
              securityAlerts: data.data.securityAlerts ?? true,
              accountAlerts: data.data.accountAlerts ?? true,
            });
          }
        })
        .catch(e => console.error('Load notification settings failed:', e))
        .finally(() => setNotificationSettingsLoaded(true));
    }
  }, [activeTab, user]);

  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; repoName: string; repoId: string | null }>({
    show: false,
    repoName: '',
    repoId: null,
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    watchNotifications: true,
    forkNotifications: true,
    releaseNotifications: true,
    discussionReplies: true,
    discussionMentions: true,
    issueComments: true,
    issueMentions: true,
    prReviews: true,
    prComments: true,
    prMentions: true,
    securityAlerts: true,
    accountAlerts: true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationSettingsLoaded, setNotificationSettingsLoaded] = useState(false);

  // Export loading state
  const [exporting, setExporting] = useState<'all' | 'repos' | null>(null);

  // MFA Modal state
  const [mfaModal, setMfaModal] = useState(false);

  // Extracted modals state
  const [passwordModal, setPasswordModal] = useState(false);
  const [loginHistoryModal, setLoginHistoryModal] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);

  // Reports state
  const [reports, setReports] = useState<Array<{
    id: string;
    targetType: string;
    targetTypeLabel: string;
    targetId: string;
    reason: string;
    status: string;
    handlerNote: string | null;
    createdAt: string;
    handledAt: string | null;
  }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsStatus, setReportsStatus] = useState<string>('all');

  // Blocks state
  const [blocks, setBlocks] = useState<Array<{
    id: string;
    blockedUser: {
      id: string;
      username: string;
      avatarUrl: string | null;
      bio: string | null;
    };
    reason: string | null;
    createdAt: string;
  }>>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksPage, setBlocksPage] = useState(1);
  const [blocksTotal, setBlocksTotal] = useState(0);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockUserId, setBlockUserId] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);

  // Load reports when tab switches to reports
  useEffect(() => {
    if (activeTab === 'reports' && reports.length === 0) {
      setReportsLoading(true);
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      const statusParam = reportsStatus !== 'all' ? `&status=${reportsStatus}` : '';
      fetch(`/api/v1/me/reports?page=${reportsPage}&pageSize=10${statusParam}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(data => {
          if (data.code === 200) {
            setReports(data.data?.items || []);
            setReportsTotal(data.meta?.total || 0);
          }
        })
        .catch(e => console.error('Load reports failed:', e))
        .finally(() => setReportsLoading(false));
    }
  }, [activeTab, reports.length, reportsPage, reportsStatus]);

  // Load blocks when tab switches to blocks
  useEffect(() => {
    if (activeTab === 'blocks' && blocks.length === 0) {
      setBlocksLoading(true);
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      fetch(`/api/v1/me/blocks?page=${blocksPage}&pageSize=10`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
        .then(r => r.json())
        .then(data => {
          if (data.code === 200) {
            setBlocks(data.data?.items || []);
            setBlocksTotal(data.meta?.total || 0);
          }
        })
        .catch(e => console.error('Load blocks failed:', e))
        .finally(() => setBlocksLoading(false));
    }
  }, [activeTab, blocks.length, blocksPage]);

  // Block user handler
  const handleBlockUser = async () => {
    if (!blockUserId.trim()) {
      alert('请输入要屏蔽的用户ID');
      return;
    }
    setIsBlocking(true);
    try {
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      const res = await fetch('/api/v1/me/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId: blockUserId.trim(), reason: blockReason.trim() }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('已成功屏蔽该用户');
        setShowBlockModal(false);
        setBlockUserId('');
        setBlockReason('');
        // Refresh blocks list
        setBlocks([]);
        setBlocksPage(1);
      } else {
        alert(data.message || '屏蔽失败');
      }
    } catch {
      alert('屏蔽失败，请重试');
    } finally {
      setIsBlocking(false);
    }
  };

  // Unblock user handler
  const handleUnblockUser = async (userId: string) => {
    if (!confirm('确定要取消屏蔽该用户吗？')) return;
    try {
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      const res = await fetch(`/api/v1/me/blocks?userId=${userId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 200) {
        setBlocks(blocks.filter(b => b.blockedUser.id !== userId));
        setBlocksTotal(Math.max(0, blocksTotal - 1));
      } else {
        alert(data.message || '取消屏蔽失败');
      }
    } catch {
      alert('取消屏蔽失败，请重试');
    }
  };

  const handleDeleteClick = (repoId: string, repoName: string) => {
    setDeleteModal({ show: true, repoName, repoId });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.repoId !== null && user?.username) {
      try {
        const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
        const res = await fetch(`/api/v1/repos/${user.username}/${deleteModal.repoName}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.code === 200) {
          setRepos(repos.filter(r => r.id !== deleteModal.repoId));
        } else {
          alert(data.message || '删除失败');
        }
      } catch (e) {
        alert('删除失败，请重试');
      }
    }
    setDeleteModal({ show: false, repoName: '', repoId: null });
  };

  const handleCancelDelete = () => {
    setDeleteModal({ show: false, repoName: '', repoId: null });
  };

  // Notification settings handlers
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      const res = await fetch('/api/v1/users/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(notificationSettings),
      });
      const data = await res.json();
      if (data.code === 200) {
        setNotificationSettingsLoaded(true); // 确保下次进入时重新加载
        alert('通知设置已保存');
      } else {
        alert(data.message || '保存失败');
      }
    } catch (e) {
      console.error('Save notification settings failed:', e);
      alert('保存失败，请重试');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // Export handlers
  const handleExport = async (exportType: 'all' | 'repos') => {
    const confirmMsg = exportType === 'all'
      ? '确定要申请导出所有数据吗？这可能需要24-48小时处理。'
      : '确定要申请导出仓库列表吗？';

    if (!confirm(confirmMsg)) return;

    setExporting(exportType);
    try {
      const token = typeof window !== 'undefined' ? tokenManager.getAccessToken() : null;
      const res = await fetch('/api/v1/me/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ exportType }),
      });
      const data = await res.json();

      if (data.code === 200) {
        alert('导出申请已提交，我们会在完成后发送邮件通知您');
      } else {
        alert(data.message || '申请失败');
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setExporting(null);
    }
  };

  // Additional form state (位置和网站字段已在上方声明)

  // 加载用户信息到表单
  useEffect(() => {
    if (user) {
      setAvatar(user.avatarUrl || null);
      setBio(user.bio || '');
      setUsername(user.username || '');
      setLocation(user.location || '');
      setWebsite(user.website || '');
    }
  }, [user]);

  const tabs = [
    { id: 'profile' as const, label: '个人资料', icon: UserIcon },
    { id: 'account' as const, label: '账号安全', icon: KeyIcon },
    { id: 'notifications' as const, label: '通知设置', icon: BellIcon },
    { id: 'repositories' as const, label: '仓库管理', icon: RepoIcon },
    { id: 'export' as const, label: '数据导出', icon: DownloadIcon },
    { id: 'reports' as const, label: '我的举报', icon: FlagIcon },
    { id: 'blocks' as const, label: '屏蔽列表', icon: BlockIcon },
  ];

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 先做本地预览
      const reader = new FileReader();
      reader.onloadend = async () => {
        setAvatar(reader.result as string);
        try {
          const token = typeof window !== 'undefined' 
            ? tokenManager.getAccessToken() 
            : null;
          
          if (!token) {
            alert('请先登录');
            setAvatar(user?.avatarUrl || null);
            return;
          }

          // 创建 FormData 上传文件
          const formData = new FormData();
          formData.append('avatar', file);

          // 上传到服务器
          const res = await fetch('/api/v1/users/avatar', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          const result = await res.json();

          if (result.code === 200 && result.data?.avatarUrl) {
            setAvatar(result.data.avatarUrl);
            updateUser({ avatarUrl: result.data.avatarUrl });
          } else {
            alert(result.message || '头像上传失败');
            setAvatar(user?.avatarUrl || null);
          }
        } catch (error) {
          console.error('Upload error:', error);
          alert('头像上传失败，请重试');
          setAvatar(user?.avatarUrl || null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <SettingsLayout tabs={tabs} activeTab={activeTab} onTabChange={(tabId: string) => setActiveTab(tabId as SettingsTab)}>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <ProfileSettings
              user={user}
              onUpdateUser={updateUser}
            />
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <AccountSettings
              onPasswordChange={() => setPasswordModal(true)}
              onMfaManage={() => setMfaModal(true)}
              onViewLoginHistory={() => setLoginHistoryModal(true)}
              onDeleteAccount={() => setDeleteAccountModal(true)}
            />
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <NotificationSettings
              notificationSettings={notificationSettings}
              onSettingsChange={setNotificationSettings}
              onSave={handleSaveNotifications}
              isSaving={isSavingNotifications}
            />
          )}

          {/* Repositories Tab */}
          {activeTab === 'repositories' && (
            <RepoManagementSettings
              repos={repos}
              reposLoading={reposLoading}
              user={user}
              onDeleteClick={handleDeleteClick}
              deleteModal={deleteModal}
              onCancelDelete={handleCancelDelete}
              onConfirmDelete={handleConfirmDelete}
            />
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <DataExportSettings
              exporting={exporting}
              onExport={handleExport}
            />
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <ReportSettings
              reports={reports.map(r => ({ ...r, status: r.status as 'pending' | 'resolved' | 'dismissed', handlerNote: r.handlerNote || undefined }))}
              reportsLoading={reportsLoading}
              reportsStatus={reportsStatus}
              reportsPage={reportsPage}
              reportsTotal={reportsTotal}
              onStatusChange={(status) => { setReportsStatus(status); setReportsPage(1); setReports([]); }}
              onPageChange={(page) => setReportsPage(page)}
            />
          )}

          {/* Blocks Tab */}
          {activeTab === 'blocks' && (
            <BlockSettings
              blocks={blocks.map(b => ({ ...b, blockedUser: { ...b.blockedUser, avatarUrl: b.blockedUser.avatarUrl || undefined, bio: b.blockedUser.bio || undefined }, reason: b.reason || undefined }))}
              blocksLoading={blocksLoading}
              blocksPage={blocksPage}
              blocksTotal={blocksTotal}
              showBlockModal={showBlockModal}
              blockUserId={blockUserId}
              blockReason={blockReason}
              onPageChange={(page) => setBlocksPage(page)}
              onShowBlockModal={() => setShowBlockModal(true)}
              onHideBlockModal={() => setShowBlockModal(false)}
              onBlockUserIdChange={(id) => setBlockUserId(id)}
              onBlockReasonChange={(reason) => setBlockReason(reason)}
              onConfirmBlock={handleBlockUser}
              onUnblockUser={handleUnblockUser}
              isBlocking={isBlocking}
            />
          )}

        {/* Extracted Modals */}
        <PasswordChangeModal
          isOpen={passwordModal}
          onClose={() => setPasswordModal(false)}
        />
        <LoginHistoryModal
          isOpen={loginHistoryModal}
          onClose={() => setLoginHistoryModal(false)}
          username={user?.username}
        />
        <DeleteAccountModal
          isOpen={deleteAccountModal}
          onClose={() => setDeleteAccountModal(false)}
          username={user?.username}
        />

        {/* MFA Settings Modal */}
        {mfaModal && (
          <div className="modal-overlay" onClick={() => setMfaModal(false)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">两步验证设置</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setMfaModal(false)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <MFASettingsModal onClose={() => setMfaModal(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Reports and Blocks Styles */}
        <style jsx>{`
          .filter-tabs {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 12px;
          }
          .filter-tab {
            padding: 6px 12px;
            border: none;
            background: none;
            cursor: pointer;
            color: var(--color-text-secondary);
            font-size: 14px;
            border-radius: 6px;
          }
          .filter-tab:hover {
            background: var(--hover-bg);
          }
          .filter-tab.active {
            background: var(--accent-bg);
            color: var(--accent-color);
          }
          .report-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .report-item {
            padding: 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
          }
          .report-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .report-status {
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 12px;
          }
          .report-status.pending {
            background: #fff3cd;
            color: #856404;
          }
          .report-status.resolved {
            background: #d4edda;
            color: #155724;
          }
          .report-status.dismissed {
            background: #e2e3e5;
            color: #383d41;
          }
          .report-reason {
            color: var(--color-text);
            font-size: 14px;
            margin-bottom: 8px;
          }
          .report-handler-note {
            color: var(--color-text-secondary);
            font-size: 13px;
            margin-bottom: 8px;
            padding: 8px;
            background: var(--bg-tertiary);
            border-radius: 4px;
          }
          .report-time {
            color: var(--color-text-secondary);
            font-size: 12px;
          }
          .block-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .block-item {
            padding: 16px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .block-user {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
          }
          .block-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
          }
          .block-user-info {
            display: flex;
            flex-direction: column;
          }
          .block-username {
            font-weight: 500;
            color: var(--color-text);
            text-decoration: none;
          }
          .block-username:hover {
            text-decoration: underline;
          }
          .block-user-bio {
            color: var(--color-text-secondary);
            font-size: 13px;
            margin: 0;
          }
          .block-reason {
            color: var(--color-text-secondary);
            font-size: 13px;
          }
          .block-time {
            color: var(--color-text-secondary);
            font-size: 12px;
          }
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px;
            color: var(--color-text-secondary);
          }
          .empty-state svg {
            width: 48px;
            height: 48px;
            opacity: 0.3;
            margin-bottom: 16px;
          }
          .pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-top: 24px;
          }
          .pagination-info {
            color: var(--color-text-secondary);
            font-size: 14px;
          }
          .section-header {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .section-header button {
            align-self: flex-start;
          }
        `}</style>
    </SettingsLayout>
  );
}
