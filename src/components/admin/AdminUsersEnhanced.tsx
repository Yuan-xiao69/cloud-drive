// Enhanced Admin Users Tab Component
// 增强的用户管理组件 - 参考 GitHub Admin 设计

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  SearchIcon, 
  FilterIcon, 
  DownloadIcon,
  EyeIcon,
  EditIcon,
  MailIcon,
  CopyIcon,
  BanIcon,
  TrashIcon,
  MuteIcon,
  PackageIcon,
  DatabaseIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon
} from './AdminIcons';
import { SidePanel, AdvancedFilter, BatchActionBar, ConfirmDialog } from './common/AdminCommon';
import type { 
  UserSummary, 
  UserDetail,
  UserFilters,
  ContextMenuData
} from './AdminTypes';
import { AdminContextMenu, createUserContextMenu } from './AdminContextMenu';

interface AdminUsersEnhancedProps {
  // 数据
  users: UserSummary[];
  usersTotal: number;
  // 分页
  usersPage: number;
  usersPageSize?: number;
  // 筛选
  filters: UserFilters;
  // 状态
  usersLoading: boolean;
  selectedUsers: Set<string>;
  contextMenu: ContextMenuData | null;
  selectedUserDetail: UserDetail | null;
  userDetailLoading?: boolean;
  // 操作回调
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: UserFilters) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleSelect: (id: string) => void;
  // 操作
  onViewDetail: (userId: string) => void;
  onEditUser: (userId: string) => void;
  onSendNotification: (userId: string) => void;
  onCopyEmail: (email: string) => void;
  onMuteUser: (userId: string, username: string, duration: string) => void;
  onLimitRepoUser: (userId: string, username: string, limit: number) => void;
  onLimitStorageUser: (userId: string, username: string, limit: number) => void;
  onBanUser: (userId: string, banned: boolean) => void;
  onDeleteUser: (userId: string) => void;
  onExportUsers: (userIds?: string[]) => void;
  // 批量操作
  onBatchMute: (userIds: string[]) => void;
  onBatchBan: (userIds: string[]) => void;
  onBatchDelete: (userIds: string[]) => void;
  // 右键菜单
  onContextMenu: (e: React.MouseEvent, userId: string) => void;
  onCloseContextMenu: () => void;
  onRefresh: () => void;
}

export default function AdminUsersEnhanced({
  users,
  usersTotal,
  usersPage,
  usersPageSize = 20,
  filters,
  usersLoading,
  selectedUsers,
  contextMenu,
  selectedUserDetail,
  userDetailLoading = false,
  onSearchChange,
  onPageChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onEditUser,
  onSendNotification,
  onCopyEmail,
  onMuteUser,
  onLimitRepoUser,
  onLimitStorageUser,
  onBanUser,
  onDeleteUser,
  onExportUsers,
  onBatchMute,
  onBatchBan,
  onBatchDelete,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
}: AdminUsersEnhancedProps) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<UserSummary | null>(null);

  const totalPages = Math.ceil(usersTotal / usersPageSize);

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, user: UserSummary) => {
    e.preventDefault();
    setContextMenuTarget(user);
    onContextMenu(e, user.id);
  };

  // 筛选器配置
  const filterFields = [
    {
      name: 'role',
      label: '角色',
      type: 'select' as const,
      options: [
        { label: '全部角色', value: '' },
        { label: '超级管理员', value: 'super_admin' },
        { label: '管理员', value: 'admin' },
        { label: '版主', value: 'moderator' },
        { label: '普通用户', value: 'user' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部状态', value: '' },
        { label: '正常', value: 'active' },
        { label: '禁用', value: 'disabled' },
        { label: '被处罚', value: 'penalized' },
      ],
    },
    {
      name: 'dateFrom',
      label: '注册时间从',
      type: 'date' as const,
    },
    {
      name: 'dateTo',
      label: '注册时间到',
      type: 'date' as const,
    },
    {
      name: 'repoCountMin',
      label: '仓库数最少',
      type: 'number' as const,
      placeholder: '0',
    },
    {
      name: 'repoCountMax',
      label: '仓库数最多',
      type: 'number' as const,
      placeholder: '999',
    },
  ];

  // 批量操作
  const handleBatchAction = (action: 'mute' | 'ban' | 'delete') => {
    const selected = Array.from(selectedUsers);
    switch (action) {
      case 'mute':
        onBatchMute(selected);
        break;
      case 'ban':
        onBatchBan(selected);
        break;
      case 'delete':
        setConfirmDialog({
          isOpen: true,
          title: '批量删除用户',
          message: `确定要删除选中的 ${selected.length} 个用户吗？此操作不可恢复。`,
          variant: 'danger',
          onConfirm: () => {
            onBatchDelete(selected);
            setConfirmDialog(null);
          },
        });
        break;
    }
  };

  return (
    <div className="tab-content">
      {/* 页面标题和操作栏 */}
      <div className="page-header">
        <h1 className="page-title">用户管理</h1>
        <div className="header-actions">
          <button 
            className={`btn btn-secondary btn-sm ${showAdvancedFilter ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <FilterIcon /> 筛选
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onExportUsers()}
          >
            <DownloadIcon /> 导出
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
          >
            刷新
          </button>
          <div className="search-box">
            <SearchIcon />
            <input
              type="search"
              placeholder="搜索用户名或邮箱..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 高级筛选 */}
      {showAdvancedFilter && (
        <AdvancedFilter
          filters={filterFields}
          values={filters as any}
          onChange={(name, value) => onFiltersChange({ ...filters, [name]: value })}
          onApply={() => onPageChange(1)}
          onReset={() => onFiltersChange({})}
        />
      )}

      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedUsers.size}
        onClearSelection={onSelectNone}
        actions={[
          { label: '批量禁言', onClick: () => handleBatchAction('mute') },
          { label: '批量封禁', variant: 'danger', onClick: () => handleBatchAction('ban') },
          { label: '批量删除', variant: 'danger', onClick: () => handleBatchAction('delete') },
        ]}
      />

      {/* 用户列表 */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectAll();
                    } else {
                      onSelectNone();
                    }
                  }}
                />
              </th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>仓库</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            {usersLoading ? (
              <tr>
                <td colSpan={7} className="text-center">加载中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">暂无用户数据</td>
              </tr>
            ) : (
              users.map(user => (
                <tr
                  key={user.id}
                  onContextMenu={(e) => handleContextMenu(e, user)}
                  onDoubleClick={() => onViewDetail(user.id)}
                  className={selectedUsers.has(user.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => onToggleSelect(user.id)}
                    />
                  </td>
                  <td>
                    <div className="user-cell">
                      <span className="user-avatar">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                      <Link href={`/${user.username}`} className="user-link">
                        @{user.username}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <span className="email-cell">{user.email}</span>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isBanned ? 'disabled' : 'active'}`}>
                      {user.isBanned ? '禁用' : '正常'}
                    </span>
                  </td>
                  <td>
                    <span className="repo-count">-</span>
                  </td>
                  <td>
                    <span className="date-cell">{formatDate(user.createdAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {usersTotal > usersPageSize && (
        <div className="pagination">
          <div className="pagination-info">
            显示 {((usersPage - 1) * usersPageSize) + 1} - {Math.min(usersPage * usersPageSize, usersTotal)} 条，共 {usersTotal} 条
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={usersPage <= 1 || usersLoading}
              onClick={() => onPageChange(usersPage - 1)}
            >
              上一页
            </button>
            <div className="pagination-pages">
              {getPaginationNumbers(usersPage, totalPages).map((page, i) => (
                page === '...' ? (
                  <span key={i} className="pagination-ellipsis">...</span>
                ) : (
                  <button
                    key={i}
                    className={`btn btn-sm ${page === usersPage ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => onPageChange(page as number)}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={usersPage >= totalPages || usersLoading}
              onClick={() => onPageChange(usersPage + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 右键上下文菜单 - 使用统一组件 */}
      {contextMenu && contextMenuTarget && (
        <AdminContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sections={createUserContextMenu(
            contextMenu.id,
            contextMenuTarget.username,
            contextMenuTarget.isBanned || false,
            {
              onViewDetail: () => onViewDetail(contextMenu.id),
              onEditUser: () => onEditUser(contextMenu.id),
              onSendNotification: () => onSendNotification(contextMenu.id),
              onCopyEmail: () => onCopyEmail(contextMenuTarget.email || ''),
              onMuteUser: () => onMuteUser(contextMenu.id, contextMenuTarget.username, '7d'),
              onLimitRepo: () => onLimitRepoUser(contextMenu.id, contextMenuTarget.username, 10),
              onLimitStorage: () => onLimitStorageUser(contextMenu.id, contextMenuTarget.username, 100),
              onBanUser: () => onBanUser(contextMenu.id, !contextMenuTarget.isBanned),
              onDeleteUser: () => onDeleteUser(contextMenu.id),
            }
          )}
          onClose={onCloseContextMenu}
        />
      )}

      {/* 用户详情侧边栏 */}
      {(selectedUserDetail || userDetailLoading) && (
        <UserDetailPanel
          user={selectedUserDetail}
          isLoading={userDetailLoading}
          onClose={() => onViewDetail('')}
          onEdit={() => onEditUser(selectedUserDetail?.id || '')}
          onSendNotification={() => onSendNotification(selectedUserDetail?.id || '')}
          onBan={() => onBanUser(selectedUserDetail?.id || '', !selectedUserDetail?.isBanned)}
          onDelete={() => {
            if (!selectedUserDetail) return;
            setConfirmDialog({
              isOpen: true,
              title: '删除用户',
              message: `确定要删除用户 @${selectedUserDetail.username} 吗？此操作不可恢复。`,
              variant: 'danger',
              onConfirm: () => {
                onDeleteUser(selectedUserDetail.id);
                setConfirmDialog(null);
              },
            });
          }}
        />
      )}

      {/* 确认对话框 */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText="确认"
          cancelText="取消"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

// 用户详情侧边栏组件
interface UserDetailPanelProps {
  user: UserDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSendNotification: () => void;
  onBan: () => void;
  onDelete: () => void;
}

function UserDetailPanel({
  user,
  isLoading = false,
  onClose,
  onEdit,
  onSendNotification,
  onBan,
  onDelete,
}: UserDetailPanelProps) {
  // 加载状态
  if (isLoading) {
    return (
      <SidePanel
        isOpen={true}
        onClose={onClose}
        title="加载中..."
        width={480}
      >
        <div className="detail-loading">
          <div className="loading-spinner" />
          <p>正在加载用户详情...</p>
        </div>
      </SidePanel>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidePanel
      isOpen={true}
      onClose={onClose}
      title={`@${user.username}`}
      subtitle={user.email}
      width={480}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onEdit}>
            编辑资料
          </button>
          <button className="btn btn-primary" onClick={onSendNotification}>
            发送通知
          </button>
        </>
      }
    >
      {/* 基本信息 */}
      <div className="detail-section">
        <h3 className="detail-section-title">基本信息</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">用户名</span>
            <span className="detail-value">@{user.username}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">邮箱</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">角色</span>
            <span className={`role-badge ${user.role}`}>
              {getRoleLabel(user.role)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">状态</span>
            <span className={`status-badge ${user.isBanned ? 'disabled' : 'active'}`}>
              {user.isBanned ? '禁用' : '正常'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">注册时间</span>
            <span className="detail-value">{formatDate(user.createdAt)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">最后活跃</span>
            <span className="detail-value">
              {user.lastActiveAt ? formatDate(user.lastActiveAt) : '从未活跃'}
            </span>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="detail-section">
        <h3 className="detail-section-title">统计信息</h3>
        <div className="stats-grid-4">
          <div className="mini-stat">
            <span className="mini-stat-value">{user.stats?.repos || 0}</span>
            <span className="mini-stat-label">仓库</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{user.stats?.discussions || 0}</span>
            <span className="mini-stat-label">讨论</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{user.stats?.stars || 0}</span>
            <span className="mini-stat-label">Star</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{user.stats?.forks || 0}</span>
            <span className="mini-stat-label">Fork</span>
          </div>
        </div>
      </div>

      {/* 活跃度分析 */}
      <div className="detail-section">
        <h3 className="detail-section-title">活跃度分析</h3>
        <div className="activity-rate">
          <div className="activity-rate-header">
            <span>过去 30 天活跃天数</span>
            <span>{user.activeDaysLast30 || 0}/30 天</span>
          </div>
          <div className="activity-rate-bar">
            <div 
              className="activity-rate-fill"
              style={{ width: `${((user.activeDaysLast30 || 0) / 30) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 处罚记录 */}
      {user.penalties && user.penalties.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section-title">处罚记录</h3>
          <div className="penalty-list">
            {user.penalties.map((penalty) => (
              <div key={penalty.id} className="penalty-item">
                <div className="penalty-info">
                  <span className="penalty-type">{getPenaltyTypeLabel(penalty.type)}</span>
                  <span className="penalty-date">{formatDate(penalty.createdAt)}</span>
                </div>
                <span className={`penalty-status ${penalty.status}`}>
                  {penalty.status === 'active' ? '生效中' : (penalty.status as string) === 'expired' ? '已过期' : '已撤销'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="detail-section">
        <h3 className="detail-section-title">管理操作</h3>
        <div className="detail-actions">
          <button className="btn btn-secondary btn-block" onClick={onEdit}>
            编辑资料
          </button>
          <button className="btn btn-secondary btn-block" onClick={onSendNotification}>
            发送通知
          </button>
          <button 
            className={`btn ${user.isBanned ? 'btn-primary' : 'btn-warning'} btn-block`}
            onClick={onBan}
          >
            {user.isBanned ? '解除封禁' : '封禁账号'}
          </button>
          <button className="btn btn-danger btn-block" onClick={onDelete}>
            删除账号
          </button>
        </div>
      </div>
    </SidePanel>
  );
}

// 辅助函数
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    super_admin: '超级管理员',
    admin: '管理员',
    moderator: '版主',
    developer: '开发者',
    user: '普通用户',
  };
  return labels[role] || role;
}

function getPenaltyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mute: '禁言',
    repo_limit: '限制仓库创建',
    storage_limit: '限制存储空间',
    ban: '封禁',
  };
  return labels[type] || type;
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getPaginationNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  
  const pages: (number | string)[] = [];
  
  if (current <= 3) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }
  
  return pages;
}
