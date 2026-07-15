// Enhanced Admin Appeals Tab Component
// 增强的申诉管理组件 - 工作流管理、优先级设置、统计

'use client';

import React, { useState } from 'react';
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
import { AdminContextMenu } from './AdminContextMenu';
import type { Appeal, ContextMenuConfig, ContextMenuSection } from './AdminTypes';
import { formatTimeAgo } from '@/lib/utils';
import { Button, Card  , Field } from '@/components/design';

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

export interface AdminAppealsEnhancedProps {
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">申诉管理</h1>
          {appealsStats && appealsStats.pending > 0 && (
            <span className="pending-badge">{appealsStats.pending} 个待处理</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onExportAppeals}>
            <DownloadIcon /> 导出
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <FilterIcon /> 筛选
          </Button>
          <Button variant="secondary" onClick={onRefresh}>刷新</Button>
          <div className="relative">
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
          <Card padding="none" className="p-4 flex flex-col items-center">
            <span className="text-2xl font-semibold text-[var(--ds-warning-default)]">{appealsStats.pending}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">待处理</span>
          </Card>
          <Card padding="none" className="p-4 flex flex-col items-center">
            <span className="text-2xl font-semibold text-[var(--ds-success-default)]">{appealsStats.approved}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">已通过</span>
          </Card>
          <Card padding="none" className="p-4 flex flex-col items-center">
            <span className="text-2xl font-semibold text-[var(--ds-danger-default)]">{appealsStats.rejected}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">已拒绝</span>
          </Card>
          <Card padding="none" className="p-4 flex flex-col items-center">
            <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{appealsStats.avgProcessingTime}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">平均处理时间</span>
          </Card>
        </div>
      )}

      {showAdvancedFilter && (
        <AdvancedFilter
          filters={filterFields}
          values={filters as Record<string, string | number | Date | null>}
          onChange={(name, value) => {
            const updated = { ...filters, [name]: value };
            onFiltersChange(updated);
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

      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-10">
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
      </Card>

      {appealsTotal > appealsPageSize && (
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-[var(--ds-text-secondary)]">
            第 {appealsPage} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={appealsPage <= 1}
              onClick={() => onPageChange(appealsPage - 1)}
            >上一页</Button>
            <Button
              variant="secondary"
              disabled={appealsPage >= totalPages}
              onClick={() => onPageChange(appealsPage + 1)}
            >下一页</Button>
          </div>
        </div>
      )}

      {contextMenu && contextMenuTarget && (
        <AdminContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sections={[
            {
              id: 'view',
              items: [
                {
                  id: 'view-detail',
                  label: '查看详情',
                  icon: <EyeIcon />,
                  shortcut: 'Enter',
                  onClick: () => { onViewDetail(contextMenuTarget!.id); handleCloseContextMenu(); },
                },
                {
                  id: 'view-user',
                  label: '查看用户',
                  icon: <EyeIcon />,
                  onClick: () => { onViewUser(contextMenuTarget!.id); handleCloseContextMenu(); },
                },
                {
                  id: 'view-penalty',
                  label: '查看原处罚',
                  icon: <FlagIcon />,
                  onClick: () => { onViewPenalty(contextMenuTarget!.id); handleCloseContextMenu(); },
                },
              ],
            },
            ...(contextMenuTarget!.status === 'pending' ? [{
              id: 'actions',
              items: [
                {
                  id: 'approve',
                  label: '通过申诉',
                  icon: <CheckIcon />,
                  onClick: () => { onApproveAppeal(contextMenuTarget!.id); handleCloseContextMenu(); },
                },
                {
                  id: 'reject',
                  label: '拒绝申诉',
                  icon: <XIcon />,
                  danger: true,
                  onClick: () => { onRejectAppeal(contextMenuTarget!.id); handleCloseContextMenu(); },
                },
              ],
            }] : []),
          ]}
          onClose={handleCloseContextMenu}
        />
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
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">基本信息</h3>
        <div className="detail-grid">
          <div className="detail-item"><span className="detail-label">用户</span><span className="detail-value">@{appeal.userUsername}</span></div>
          <div className="detail-item"><span className="detail-label">状态</span><span className={`status-badge ${getStatusBadgeClass(appeal.status)}`}>{getStatusLabel(appeal.status)}</span></div>
          <div className="detail-item"><span className="detail-label">申诉时间</span><span className="detail-value">{formatTimeAgo(appeal.createdAt)}</span></div>
        </div>
      </div>

      <div className="detail-section">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">申诉内容</h3>
        <div className="appeal-content-box"><p>{appeal.content}</p></div>
      </div>

      {appeal.adminReply && (
        <div className="detail-section">
          <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">管理员回复</h3>
          <div className="admin-reply-box"><p>{appeal.adminReply}</p></div>
        </div>
      )}

      {appeal.status === 'pending' && (
        <>
          <div className="detail-section">
            <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">添加回复</h3>
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
              <Button variant="primary" onClick={onApprove}>✓ 通过申诉</Button>
              <Button variant="danger" onClick={onReject}>✗ 拒绝申诉</Button>
              <Button variant="secondary" onClick={() => onReply(replyText)} disabled={!replyText.trim()}>📝 保存回复</Button>
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

