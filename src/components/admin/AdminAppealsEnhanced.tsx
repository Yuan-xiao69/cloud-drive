// Enhanced Admin Appeals Tab Component
// 增强的申诉管理组件 - 工作流管理、优先级设置、统计

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SearchIcon,
  FilterIcon,
  EyeIcon,
  CheckIcon,
  XIcon,
  DownloadIcon,
  FlagIcon,
  SendIcon
} from './AdminIcons';
import { SidePanel, AdvancedFilter, ConfirmDialog, BatchActionBar } from './common/AdminCommon';
import type { Appeal, ContextMenuConfig } from './AdminTypes';

interface AppealFilters {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AppealDetail {
  id: string;
  penaltyId: string;
  userId: string;
  userUsername: string;
  userEmail: string;
  content: string;
  status: string;
  adminReply: string | null;
  appealType?: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
  penaltyInfo?: {
    type: string;
    reason: string;
    expiresAt: string | null;
  };
}

interface AdminAppealsEnhancedProps {
  appeals: Appeal[];
  appealsTotal: number;
  appealsStats?: {
    pending: number;
    approved: number;
    rejected: number;
    avgProcessingTime: string;
  };
  appealsPage: number;
  appealsPageSize?: number;
  filters: AppealFilters;
  appealsLoading: boolean;
  selectedAppeals: Set<string>;
  contextMenu: ContextMenuConfig | null;
  selectedAppealDetail: AppealDetail | null;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: AppealFilters) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleSelect: (id: string) => void;
  onViewDetail: (appealId: string) => void;
  onApproveAppeal: (appealId: string) => void;
  onRejectAppeal: (appealId: string) => void;
  onReplyAppeal: (appealId: string, reply: string) => void;
  onViewPenalty: (appealId: string) => void;
  onViewUser: (appealId: string) => void;
  onExportAppeals: () => void;
  onBatchApprove: (ids: string[]) => void;
  onBatchReject: (ids: string[]) => void;
  onContextMenu?: (e: React.MouseEvent, appealId: string) => void;
  onCloseContextMenu?: () => void;
  onRefresh: () => void;
}

export default function AdminAppealsEnhanced({
  appeals,
  appealsTotal,
  appealsStats,
  appealsPage,
  appealsPageSize = 20,
  filters,
  appealsLoading,
  selectedAppeals,
  contextMenu,
  selectedAppealDetail,
  onSearchChange,
  onPageChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onApproveAppeal,
  onRejectAppeal,
  onReplyAppeal,
  onViewPenalty,
  onViewUser,
  onExportAppeals,
  onBatchApprove,
  onBatchReject,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
}: AdminAppealsEnhancedProps) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<Appeal | null>(null);

  // 使用空函数作为默认值
  const handleContextMenu = onContextMenu || (() => {});
  const handleCloseContextMenu = onCloseContextMenu || (() => {});

  const totalPages = Math.ceil(appealsTotal / appealsPageSize);

  const filterFields = [
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部状态', value: '' },
        { value: 'pending', label: '待处理' },
        { value: 'approved', label: '已通过' },
        { value: 'rejected', label: '已拒绝' },
      ],
    },
    {
      name: 'dateFrom',
      label: '申诉时间从',
      type: 'date' as const,
    },
    {
      name: 'dateTo',
      label: '申诉时间到',
      type: 'date' as const,
    },
  ];

  const handleContextMenuInternal = (e: React.MouseEvent, appeal: Appeal) => {
    e.preventDefault();
    setContextMenuTarget(appeal);
    handleContextMenu(e, appeal.id);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      handleCloseContextMenu();
    };
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, handleCloseContextMenu]);

  return (
    <div className="tab-content">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">申诉管理</h1>
          {appealsStats && appealsStats.pending > 0 && (
            <span className="pending-badge">{appealsStats.pending} 个待处理</span>
          )}
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={onExportAppeals}>
            <DownloadIcon /> 导出
          </button>
          <button
            className={`btn btn-secondary btn-sm ${showAdvancedFilter ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <FilterIcon /> 筛选
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onRefresh}>刷新</button>
          <div className="search-box">
            <SearchIcon />
            <input
              type="search"
              placeholder="搜索用户名..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {appealsStats && (
        <div className="stats-section">
          <div className="mini-stat-card">
            <span className="stat-value warning">{appealsStats.pending}</span>
            <span className="stat-label">待处理</span>
          </div>
          <div className="mini-stat-card">
            <span className="stat-value success">{appealsStats.approved}</span>
            <span className="stat-label">已通过</span>
          </div>
          <div className="mini-stat-card">
            <span className="stat-value danger">{appealsStats.rejected}</span>
            <span className="stat-label">已拒绝</span>
          </div>
          <div className="mini-stat-card">
            <span className="stat-value">{appealsStats.avgProcessingTime}</span>
            <span className="stat-label">平均处理时间</span>
          </div>
        </div>
      )}

      {showAdvancedFilter && (
        <AdvancedFilter
          filters={filterFields}
          values={filters as Record<string, string | number | Date | null>}
          onChange={(name, value) => {
            const updated = { ...filters, [name]: value };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFiltersChange(updated as any);
          }}
          onApply={() => onPageChange(1)}
          onReset={() => onFiltersChange({} as AppealFilters)}
        />
      )}

      <BatchActionBar
        selectedCount={selectedAppeals.size}
        onClearSelection={onSelectNone}
        actions={[
          { label: '批量通过', onClick: () => onBatchApprove(Array.from(selectedAppeals)) },
          { label: '批量拒绝', variant: 'danger', onClick: () => onBatchReject(Array.from(selectedAppeals)) },
        ]}
      />

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedAppeals.size === appeals.length && appeals.length > 0}
                  onChange={(e) => e.target.checked ? onSelectAll() : onSelectNone()}
                />
              </th>
              <th>申诉ID</th>
              <th>用户</th>
              <th>申诉内容</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {appealsLoading ? (
              <tr><td colSpan={6} className="text-center">加载中...</td></tr>
            ) : appeals.length === 0 ? (
              <tr><td colSpan={6} className="text-center">暂无申诉数据</td></tr>
            ) : (
              appeals.map(appeal => (
                <tr
                  key={appeal.id}
                  onContextMenu={(e) => handleContextMenuInternal(e, appeal)}
                  onDoubleClick={() => onViewDetail(appeal.id)}
                  className={selectedAppeals.has(appeal.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedAppeals.has(appeal.id)}
                      onChange={() => onToggleSelect(appeal.id)}
                    />
                  </td>
                  <td><span className="appeal-id">#{appeal.id}</span></td>
                  <td>
                    <Link href={`/${appeal.userUsername}`} className="user-link">
                      @{appeal.userUsername}
                    </Link>
                  </td>
                  <td>
                    <span className="appeal-content">
                      {appeal.content.length > 40 ? appeal.content.slice(0, 40) + '...' : appeal.content}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(appeal.status)}`}>
                      {getStatusLabel(appeal.status)}
                    </span>
                  </td>
                  <td><span className="date-cell">{formatTimeAgo(appeal.createdAt)}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {appealsTotal > appealsPageSize && (
        <div className="pagination">
          <div className="pagination-info">
            第 {appealsPage} / {totalPages} 页
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={appealsPage <= 1}
              onClick={() => onPageChange(appealsPage - 1)}
            >上一页</button>
            <button
              className="btn btn-secondary btn-sm"
              disabled={appealsPage >= totalPages}
              onClick={() => onPageChange(appealsPage + 1)}
            >下一页</button>
          </div>
        </div>
      )}

      {contextMenu && contextMenuTarget && (
        <div
          className="context-menu enhanced"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">📝 申诉 #{contextMenuTarget.id}</span>
          </div>
          <div className="context-menu-section">
            <button className="context-menu-item" onClick={() => { onViewDetail(contextMenuTarget.id); handleCloseContextMenu(); }}>
              <EyeIcon /> 查看详情
            </button>
            <button className="context-menu-item" onClick={() => { onViewUser(contextMenuTarget.id); handleCloseContextMenu(); }}>
              👤 查看用户
            </button>
            <button className="context-menu-item" onClick={() => { onViewPenalty(contextMenuTarget.id); handleCloseContextMenu(); }}>
              <FlagIcon /> 查看原处罚
            </button>
          </div>
          {contextMenuTarget.status === 'pending' && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-section">
                <button className="context-menu-item success" onClick={() => { onApproveAppeal(contextMenuTarget.id); handleCloseContextMenu(); }}>
                  <CheckIcon /> 通过申诉
                </button>
                <button className="context-menu-item danger" onClick={() => { onRejectAppeal(contextMenuTarget.id); handleCloseContextMenu(); }}>
                  <XIcon /> 拒绝申诉
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {selectedAppealDetail && (
        <AppealDetailPanel
          appeal={selectedAppealDetail}
          onClose={() => onViewDetail('')}
          onApprove={() => onApproveAppeal(selectedAppealDetail.id)}
          onReject={() => onRejectAppeal(selectedAppealDetail.id)}
          onReply={(reply) => onReplyAppeal(selectedAppealDetail.id, reply)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

interface AppealDetailPanelProps {
  appeal: AppealDetail;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReply: (reply: string) => void;
}

function AppealDetailPanel({ appeal, onClose, onApprove, onReject, onReply }: AppealDetailPanelProps) {
  const [replyText, setReplyText] = useState('');

  return (
    <SidePanel
      isOpen={true}
      onClose={onClose}
      title={`📝 申诉详情 #${appeal.id}`}
      subtitle={getStatusLabel(appeal.status)}
      width={480}
    >
      <div className="detail-section">
        <h3 className="detail-section-title">基本信息</h3>
        <div className="detail-grid">
          <div className="detail-item"><span className="detail-label">用户</span><span className="detail-value">@{appeal.userUsername}</span></div>
          <div className="detail-item"><span className="detail-label">状态</span><span className={`status-badge ${getStatusBadgeClass(appeal.status)}`}>{getStatusLabel(appeal.status)}</span></div>
          <div className="detail-item"><span className="detail-label">申诉时间</span><span className="detail-value">{formatTimeAgo(appeal.createdAt)}</span></div>
        </div>
      </div>

      <div className="detail-section">
        <h3 className="detail-section-title">申诉内容</h3>
        <div className="appeal-content-box"><p>{appeal.content}</p></div>
      </div>

      {appeal.adminReply && (
        <div className="detail-section">
          <h3 className="detail-section-title">管理员回复</h3>
          <div className="admin-reply-box"><p>{appeal.adminReply}</p></div>
        </div>
      )}

      {appeal.status === 'pending' && (
        <>
          <div className="detail-section">
            <h3 className="detail-section-title">添加回复</h3>
            <textarea
              className="reply-input"
              placeholder="输入回复内容..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
            />
          </div>
          <div className="detail-section">
            <div className="action-buttons-grid">
              <button className="btn btn-success btn-block" onClick={onApprove}>✓ 通过申诉</button>
              <button className="btn btn-danger btn-block" onClick={onReject}>✗ 拒绝申诉</button>
              <button className="btn btn-secondary btn-block" onClick={() => onReply(replyText)} disabled={!replyText.trim()}>📝 保存回复</button>
            </div>
          </div>
        </>
      )}
    </SidePanel>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = { pending: '待处理', approved: '已通过', rejected: '已拒绝' };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = { pending: 'warning', approved: 'success', rejected: 'danger' };
  return classes[status] || 'default';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 30) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}
