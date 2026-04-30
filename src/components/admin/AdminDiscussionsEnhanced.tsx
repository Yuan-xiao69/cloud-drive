// Enhanced Admin Discussions Tab Component
// 增强的讨论管理组件 - 内容审核、精华/置顶、分类移动

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SearchIcon,
  FilterIcon,
  EyeIcon,
  CheckIcon,
  StarIcon,
  PinIcon,
  FolderIcon,
  TrashIcon,
  ChevronDownIcon,
  LockIcon,
  UnlockIcon,
  FlagIcon
} from './AdminIcons';
import { AdvancedFilter, BatchActionBar, ConfirmDialog, SidePanel } from './common/AdminCommon';
import type { DiscussionSummary, DiscussionDetail, ContextMenuConfig } from './AdminTypes';

interface DiscussionFilters {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AdminDiscussionsEnhancedProps {
  // 数据
  discussions: DiscussionSummary[];
  discussionsTotal: number;
  // 分页
  discussionsPage: number;
  discussionsPageSize?: number;
  // 筛选
  filters: DiscussionFilters;
  // 状态
  discussionsLoading: boolean;
  selectedDiscussions: Set<string>;
  contextMenu: ContextMenuConfig | null;
  selectedDiscussionDetail: DiscussionDetail | null;
  // 操作回调
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: DiscussionFilters) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleSelect: (id: string) => void;
  // 操作
  onViewDetail: (discussionId: string | null) => void;
  onMarkResolved: (discussionId: string) => void;
  onSetFeatured: (discussionId: string) => void;
  onSetPinned: (discussionId: string) => void;
  onMoveCategory: (discussionId: string, category: string) => void;
  onCloseDiscussion: (discussionId: string) => void;
  onDeleteDiscussion: (discussionId: string) => void;
  onViewReports: (discussionId: string) => void;
  // 批量操作
  onBatchMarkResolved: (ids: string[]) => void;
  onBatchSetFeatured: (ids: string[]) => void;
  onBatchSetPinned: (ids: string[]) => void;
  onBatchMoveCategory: (ids: string[], category: string) => void;
  onBatchDelete: (ids: string[]) => void;
  // 右键菜单
  onContextMenu: (e: React.MouseEvent, discussionId: string) => void;
  onCloseContextMenu: () => void;
  onRefresh: () => void;
}

export default function AdminDiscussionsEnhanced({
  discussions,
  discussionsTotal,
  discussionsPage,
  discussionsPageSize = 20,
  filters,
  discussionsLoading,
  selectedDiscussions,
  contextMenu,
  selectedDiscussionDetail,
  onSearchChange,
  onPageChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onMarkResolved,
  onSetFeatured,
  onSetPinned,
  onMoveCategory,
  onCloseDiscussion,
  onDeleteDiscussion,
  onViewReports,
  onBatchMarkResolved,
  onBatchSetFeatured,
  onBatchSetPinned,
  onBatchMoveCategory,
  onBatchDelete,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
}: AdminDiscussionsEnhancedProps) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<DiscussionSummary | null>(null);

  const totalPages = Math.ceil(discussionsTotal / discussionsPageSize);

  // 处理查看详情
  const handleViewDetail = (discussion: DiscussionSummary) => {
    onViewDetail(discussion.id);
  };

  // 关闭详情面板
  const handleCloseDetail = () => {
    onViewDetail(null);
  };

  // 分类选项
  const categories = [
    { value: 'question', label: '提问' },
    { value: 'share', label: '分享' },
    { value: 'discussion', label: '讨论' },
    { value: 'bug', label: 'Bug反馈' },
    { value: 'suggestion', label: '建议' },
  ];

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, discussion: DiscussionSummary) => {
    e.preventDefault();
    setContextMenuTarget(discussion);
    onContextMenu(e, discussion.id);
  };

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      onCloseContextMenu();
    };
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, onCloseContextMenu]);

  // 筛选器配置
  const filterFields = [
    {
      name: 'category',
      label: '分类',
      type: 'select' as const,
      options: [
        { label: '全部分类', value: '' },
        ...categories,
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部状态', value: '' },
        { label: '开放中', value: 'open' },
        { label: '已解决', value: 'resolved' },
        { label: '已关闭', value: 'closed' },
      ],
    },
    {
      name: 'dateFrom',
      label: '发布时间从',
      type: 'date' as const,
    },
    {
      name: 'dateTo',
      label: '发布时间到',
      type: 'date' as const,
    },
  ];

  // 批量操作
  const handleBatchAction = (action: string, category?: string) => {
    const selected = Array.from(selectedDiscussions);
    switch (action) {
      case 'resolve':
        onBatchMarkResolved(selected);
        break;
      case 'featured':
        onBatchSetFeatured(selected);
        break;
      case 'pinned':
        onBatchSetPinned(selected);
        break;
      case 'move':
        if (category) onBatchMoveCategory(selected, category);
        break;
      case 'delete':
        setConfirmDialog({
          isOpen: true,
          title: '批量删除讨论',
          message: `确定要删除选中的 ${selected.length} 个讨论吗？此操作不可恢复。`,
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
        <h1 className="page-title">讨论管理</h1>
        <div className="header-actions">
          <button
            className={`btn btn-secondary btn-sm ${showAdvancedFilter ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <FilterIcon /> 筛选
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
              placeholder="搜索讨论标题..."
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
          values={filters as Record<string, string | number | Date | null>}
          onChange={(name, value) => {
            const updated = { ...filters, [name]: value };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFiltersChange(updated as any);
          }}
          onApply={() => onPageChange(1)}
          onReset={() => onFiltersChange({} as DiscussionFilters)}
        />
      )}

      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedDiscussions.size}
        onClearSelection={onSelectNone}
        actions={[
          { label: '标记已解决', onClick: () => handleBatchAction('resolve') },
          { label: '设为精华', onClick: () => handleBatchAction('featured') },
          { label: '置顶', onClick: () => handleBatchAction('pinned') },
          { label: '移动分类', onClick: () => {
            const category = prompt('请输入目标分类：');
            if (category) handleBatchAction('move', category);
          }},
          { label: '批量删除', variant: 'danger', onClick: () => handleBatchAction('delete') },
        ]}
      />

      {/* 讨论列表 */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedDiscussions.size === discussions.length && discussions.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) onSelectAll();
                    else onSelectNone();
                  }}
                />
              </th>
              <th>标题</th>
              <th>作者</th>
              <th>分类</th>
              <th>状态</th>
              <th>👁 浏览</th>
              <th>💬 评论</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {discussionsLoading ? (
              <tr>
                <td colSpan={8} className="text-center">加载中...</td>
              </tr>
            ) : discussions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">暂无讨论数据</td>
              </tr>
            ) : (
              discussions.map(discussion => (
                <tr
                  key={discussion.id}
                  onContextMenu={(e) => handleContextMenu(e, discussion)}
                  onDoubleClick={() => handleViewDetail(discussion)}
                  className={selectedDiscussions.has(discussion.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDiscussions.has(discussion.id)}
                      onChange={() => onToggleSelect(discussion.id)}
                    />
                  </td>
                  <td>
                    <div className="discussion-cell">
                      {discussion.isDeleted ? (
                        <span className="deleted-indicator">已删除</span>
                      ) : (
                        <Link
                          href={`/discussions/${discussion.id}`}
                          className="discussion-link"
                        >
                          {discussion.title}
                        </Link>
                      )}
                      <div className="discussion-badges">
                        <span className="category-badge">{getCategoryLabel(discussion.category)}</span>
                        {discussion.status === 'resolved' && (
                          <span className="status-indicator resolved">✓ 已解决</span>
                        )}
                        {discussion.status === 'closed' && (
                          <span className="status-indicator closed">🔒 已关闭</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <Link href={`/${discussion.authorUsername}`} className="user-link">
                      @{discussion.authorUsername}
                    </Link>
                  </td>
                  <td>
                    <span className="category-text">{getCategoryLabel(discussion.category)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(discussion.status)}`}>
                      {getStatusLabel(discussion.status)}
                    </span>
                  </td>
                  <td>
                    <span className="count-cell">{discussion.viewCount}</span>
                  </td>
                  <td>
                    <span className="count-cell">{discussion.commentsCount}</span>
                  </td>
                  <td>
                    <span className="date-cell">{formatDate(discussion.createdAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {discussionsTotal > discussionsPageSize && (
        <div className="pagination">
          <div className="pagination-info">
            显示 {((discussionsPage - 1) * discussionsPageSize) + 1} - {Math.min(discussionsPage * discussionsPageSize, discussionsTotal)} 条，共 {discussionsTotal} 条
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={discussionsPage <= 1 || discussionsLoading}
              onClick={() => onPageChange(discussionsPage - 1)}
            >
              上一页
            </button>
            <span className="page-info">
              第 {discussionsPage} / {totalPages} 页
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={discussionsPage >= totalPages || discussionsLoading}
              onClick={() => onPageChange(discussionsPage + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 右键上下文菜单 */}
      {contextMenu && contextMenuTarget && (
        <div
          className="context-menu enhanced"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">💬 {contextMenuTarget.title.slice(0, 30)}...</span>
          </div>

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onViewDetail(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <EyeIcon /> 查看详情 <span className="shortcut">Enter</span>
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onMarkResolved(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <CheckIcon /> 标记为已解决
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                onSetFeatured(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <StarIcon /> 设为精华
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                onSetPinned(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <PinIcon /> 置顶
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <div className="context-menu-submenu">
              <span className="submenu-trigger">
                <FolderIcon /> 移动分类 <ChevronDownIcon />
              </span>
              <div className="submenu-content">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      onMoveCategory(contextMenuTarget.id, cat.value);
                      onCloseContextMenu();
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="context-menu-item"
              onClick={() => {
                onCloseDiscussion(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <LockIcon /> 关闭讨论
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onViewReports(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <FlagIcon /> 查看举报
            </button>
            <button
              className="context-menu-item danger"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: '删除讨论',
                  message: `确定要删除讨论 "${contextMenuTarget.title.slice(0, 20)}..." 吗？此操作不可恢复。`,
                  variant: 'danger',
                  onConfirm: () => {
                    onDeleteDiscussion(contextMenuTarget.id);
                    setConfirmDialog(null);
                  },
                });
                onCloseContextMenu();
              }}
            >
              <TrashIcon /> 删除讨论 <span className="shortcut">d</span>
            </button>
          </div>
        </div>
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

      {/* 详情侧边栏 */}
      {selectedDiscussionDetail && (
        <SidePanel
          title="讨论详情"
          onClose={handleCloseDetail}
        >
          <div className="detail-section">
            <h3 className="detail-title">{selectedDiscussionDetail.title || selectedDiscussionDetail.title}</h3>
            <div className="detail-meta">
              <span className="detail-author">
                @{selectedDiscussionDetail.authorUsername || selectedDiscussionDetail.authorUsername || '未知'}
              </span>
              <span className="detail-date">
                {formatDate(selectedDiscussionDetail.createdAt || selectedDiscussionDetail.createdAt)}
              </span>
            </div>
            <div className="detail-badges">
              <span className="detail-badge">{getCategoryLabel(selectedDiscussionDetail.category || selectedDiscussionDetail.category)}</span>
              <span className={`detail-badge status-${selectedDiscussionDetail.status || selectedDiscussionDetail.status}`}>
                {getStatusLabel(selectedDiscussionDetail.status || selectedDiscussionDetail.status)}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h4>统计信息</h4>
            <div className="detail-stats">
              <div className="stat-item">
                <span className="stat-label">浏览数</span>
                <span className="stat-value">{selectedDiscussionDetail.viewCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">评论数</span>
                <span className="stat-value">{selectedDiscussionDetail.commentsCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="detail-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (selectedDiscussionDetail.status === 'resolved') {
                  // 已经是已解决状态
                } else {
                  onMarkResolved(selectedDiscussionDetail.id);
                }
              }}
            >
              <CheckIcon /> {selectedDiscussionDetail.status === 'resolved' ? '已解决' : '标记为已解决'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onViewReports(selectedDiscussionDetail.id)}
            >
              <FlagIcon /> 查看举报
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: '删除讨论',
                  message: `确定要删除讨论 "${selectedDiscussionDetail.title}" 吗？此操作不可恢复。`,
                  variant: 'danger',
                  onConfirm: () => {
                    onDeleteDiscussion(selectedDiscussionDetail.id);
                    handleCloseDetail();
                    setConfirmDialog(null);
                  },
                });
              }}
            >
              <TrashIcon /> 删除
            </button>
          </div>
        </SidePanel>
      )}
    <style jsx>{`
      .discussion-cell { display: flex; flex-direction: column; gap: 4px; }
      .discussion-link { font-weight: 500; color: var(--color-accent-fg); display: block; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .discussion-link:hover { text-decoration: underline; }
      .discussion-badges { display: flex; gap: 6px; flex-wrap: wrap; }
      .category-badge { display: inline-flex; padding: 1px 6px; border-radius: 10px; font-size: 11px; background: var(--color-bg-subtle); color: var(--color-fg-muted); }
      .status-indicator { display: inline-flex; padding: 1px 6px; border-radius: 10px; font-size: 11px; }
      .status-indicator.resolved { background: var(--color-success-subtle); color: var(--color-success-fg); }
      .status-indicator.closed { background: var(--color-bg-subtle); color: var(--color-fg-muted); }
      .category-text { font-size: 13px; color: var(--color-fg-muted); }
      .count-cell { font-weight: 500; font-size: 13px; }
      .deleted-indicator { color: var(--color-danger-fg); font-style: italic; }
      .status-badge.success { background: var(--color-success-subtle); color: var(--color-success-fg); }
      .detail-section { margin-bottom: 20px; }
      .detail-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; word-break: break-word; }
      .detail-meta { display: flex; gap: 12px; font-size: 13px; color: var(--color-fg-muted); margin-bottom: 12px; }
      .detail-badges { display: flex; gap: 8px; flex-wrap: wrap; }
      .detail-badge { display: inline-flex; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: var(--color-bg-subtle); }
      .detail-badge.status-resolved { background: var(--color-success-subtle); color: var(--color-success-fg); }
      .detail-badge.status-closed { background: var(--color-bg-inset); color: var(--color-fg-muted); }
      .detail-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .stat-item { display: flex; flex-direction: column; gap: 2px; }
      .stat-label { font-size: 12px; color: var(--color-fg-muted); }
      .stat-value { font-size: 18px; font-weight: 600; }
      .detail-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; border-top: 1px solid var(--color-border-default); }
      .detail-actions button { width: 100%; justify-content: center; }
    `}</style>
    </div>
  );
}

// 辅助函数
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    question: '提问',
    share: '分享',
    discussion: '讨论',
    bug: 'Bug反馈',
    suggestion: '建议',
  };
  return labels[category] || category;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    open: '开放中',
    resolved: '已解决',
    closed: '已关闭',
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    open: 'active',
    resolved: 'success',
    closed: 'disabled',
  };
  return classes[status] || 'default';
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


