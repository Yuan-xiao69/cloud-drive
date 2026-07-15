// Enhanced Admin Discussions Tab Component
// 增强的讨论管理组件 - 内容审核、精华/置顶、分类移动

'use client';

import React, { useState } from 'react';
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
  LockIcon,
  FlagIcon
} from './AdminIcons';
import { AdvancedFilter, BatchActionBar, ConfirmDialog, SidePanel } from './common/AdminCommon';
import { AdminContextMenu } from './AdminContextMenu';
import type { DiscussionSummary, DiscussionDetail, ContextMenuConfig } from './AdminTypes';
import { formatDate } from '@/lib/utils';
import { Button, Card  , Field } from '@/components/design';

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
    <div className="space-y-4">
      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-start gap-4 flex-wrap mb-2">
        <h1 className="text-[22px] font-semibold text-[var(--ds-text-primary)] m-0">讨论管理</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <FilterIcon /> 筛选
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
          >
            刷新
          </Button>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-secondary)]">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="搜索讨论标题..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] outline-none focus:ring-1 focus:ring-[var(--ds-accent-default)] w-52"
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
            onFiltersChange(updated);
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
            const category = window.prompt('请输入目标分类 (question/share/discussion/bug/suggestion)');
            if (category) handleBatchAction('move', category);
          }},
          { label: '批量删除', variant: 'danger', onClick: () => handleBatchAction('delete') },
        ]}
      />

      {/* 讨论列表 */}
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)] text-left">
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  className="admin-checkbox cursor-pointer"
                  checked={selectedDiscussions.size === discussions.length && discussions.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) onSelectAll();
                    else onSelectNone();
                  }}
                />
              </th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">标题</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">作者</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">分类</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">状态</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">浏览</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">评论</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">时间</th>
            </tr>
          </thead>
          <tbody>
            {discussionsLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[var(--ds-text-secondary)]">
                  <div className="inline-block w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin mb-2" />
                  <div className="text-sm">加载中...</div>
                </td>
              </tr>
            ) : discussions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[var(--ds-text-secondary)]">
                  <div className="flex justify-center mb-3 opacity-40">
                    <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-5.5a.75.75 0 01-.75-.75v-.878z"/></svg>
                  </div>
                  <div className="text-sm">暂无讨论数据</div>
                </td>
              </tr>
            ) : (
              discussions.map(discussion => (
                <tr
                  key={discussion.id}
                  onContextMenu={(e) => handleContextMenu(e, discussion)}
                  onDoubleClick={() => handleViewDetail(discussion)}
                  className={`border-b border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)] transition-colors cursor-pointer ${selectedDiscussions.has(discussion.id) ? 'bg-[var(--ds-accent-default)]/5' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="admin-checkbox cursor-pointer"
                      checked={selectedDiscussions.has(discussion.id)}
                      onChange={() => onToggleSelect(discussion.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      {discussion.isDeleted ? (
                        <span className="text-[var(--ds-danger-default)] italic">已删除</span>
                      ) : (
                        <Link
                          href={`/discussions/${discussion.id}`}
                          className="font-medium text-[var(--ds-accent-default)] block max-w-[300px] truncate hover:underline"
                        >
                          {discussion.title}
                        </Link>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="inline-flex px-1.5 py-0.5 rounded-full text-[11px] bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]">{getCategoryLabel(discussion.category)}</span>
                        {discussion.status === 'resolved' && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[11px] bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]">已解决</span>
                        )}
                        {discussion.status === 'closed' && (
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[11px] bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]">已关闭</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/${discussion.authorUsername}`} className="font-medium text-[var(--ds-accent-default)] text-sm hover:underline">
                      @{discussion.authorUsername}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[13px] text-[var(--ds-text-secondary)]">{getCategoryLabel(discussion.category)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      discussion.status === 'open' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                      discussion.status === 'resolved' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                      'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
                    }`}>
                      {getStatusLabel(discussion.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-[13px]">{discussion.viewCount}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-[13px]">{discussion.commentsCount}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm text-[var(--ds-text-secondary)]">{formatDate(discussion.createdAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* 分页 */}
      {discussionsTotal > discussionsPageSize && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-sm text-[var(--ds-text-secondary)]">
            显示 {((discussionsPage - 1) * discussionsPageSize) + 1} - {Math.min(discussionsPage * discussionsPageSize, discussionsTotal)} 条，共 {discussionsTotal} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={discussionsPage <= 1 || discussionsLoading}
              onClick={() => onPageChange(discussionsPage - 1)}
            >
              上一页
            </Button>
            <span className="text-sm text-[var(--ds-text-secondary)] px-2">
              第 {discussionsPage} / {totalPages} 页
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={discussionsPage >= totalPages || discussionsLoading}
              onClick={() => onPageChange(discussionsPage + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 右键上下文菜单 */}
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
                  onClick: () => { onViewDetail(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'status',
              items: [
                {
                  id: 'mark-resolved',
                  label: '标记为已解决',
                  icon: <CheckIcon />,
                  onClick: () => { onMarkResolved(contextMenuTarget!.id); onCloseContextMenu(); },
                },
                {
                  id: 'set-featured',
                  label: '设为精华',
                  icon: <StarIcon />,
                  onClick: () => { onSetFeatured(contextMenuTarget!.id); onCloseContextMenu(); },
                },
                {
                  id: 'set-pinned',
                  label: '置顶',
                  icon: <PinIcon />,
                  onClick: () => { onSetPinned(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'move',
              items: [
                {
                  id: 'move-category',
                  label: '移动分类',
                  icon: <FolderIcon />,
                  children: categories.map((cat) => ({
                    id: `cat-${cat.value}`,
                    label: cat.label,
                    onClick: () => { onMoveCategory(contextMenuTarget!.id, cat.value); onCloseContextMenu(); },
                  })),
                },
                {
                  id: 'close-discussion',
                  label: '关闭讨论',
                  icon: <LockIcon />,
                  onClick: () => { onCloseDiscussion(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'danger',
              items: [
                {
                  id: 'view-reports',
                  label: '查看举报',
                  icon: <FlagIcon />,
                  onClick: () => { onViewReports(contextMenuTarget!.id); onCloseContextMenu(); },
                },
                {
                  id: 'delete-discussion',
                  label: '删除讨论',
                  icon: <TrashIcon />,
                  shortcut: 'Del',
                  danger: true,
                  onClick: () => {
                    setConfirmDialog({
                      isOpen: true,
                      title: '删除讨论',
                      message: `确定要删除讨论 "${contextMenuTarget!.title.slice(0, 20)}..." 吗？此操作不可恢复。`,
                      variant: 'danger',
                      onConfirm: () => {
                        onDeleteDiscussion(contextMenuTarget!.id);
                        setConfirmDialog(null);
                      },
                    });
                    onCloseContextMenu();
                  },
                },
              ],
            },
          ]}
          onClose={onCloseContextMenu}
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

      {/* 详情侧边栏 */}
      {selectedDiscussionDetail && (
        <SidePanel
          isOpen={true}
          title="讨论详情"
          onClose={handleCloseDetail}
        >
          <div className="mb-5">
            <h3 className="text-base font-semibold mb-2 break-words">{selectedDiscussionDetail.title}</h3>
            <div className="flex gap-3 text-[13px] text-[var(--ds-text-secondary)] mb-3">
              <span className="detail-author">
                @{selectedDiscussionDetail.authorUsername || '未知'}
              </span>
              <span className="detail-date">
                {formatDate(selectedDiscussionDetail.createdAt)}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex px-2 py-0.5 rounded text-xs bg-[var(--ds-surface-subtle)]">{getCategoryLabel(selectedDiscussionDetail.category)}</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                selectedDiscussionDetail.status === 'resolved' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                selectedDiscussionDetail.status === 'closed' ? 'bg-[var(--ds-surface-inset)] text-[var(--ds-text-secondary)]' :
                'bg-[var(--ds-surface-subtle)]'
              }`}>
                {getStatusLabel(selectedDiscussionDetail.status)}
              </span>
            </div>
          </div>

          <div className="mb-5">
            <h4 className="text-sm font-semibold mb-2">统计信息</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--ds-text-secondary)]">浏览数</span>
                <span className="text-lg font-semibold">{selectedDiscussionDetail.viewCount || 0}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-[var(--ds-text-secondary)]">评论数</span>
                <span className="text-lg font-semibold">{selectedDiscussionDetail.commentsCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-[var(--ds-border-default)]">
            <Button
              variant="secondary"
              size="sm"
              block
              onClick={() => {
                if (selectedDiscussionDetail.status === 'resolved') {
                  // 已经是已解决状态
                } else {
                  onMarkResolved(selectedDiscussionDetail.id);
                }
              }}
            >
              <CheckIcon /> {selectedDiscussionDetail.status === 'resolved' ? '已解决' : '标记为已解决'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              block
              onClick={() => onViewReports(selectedDiscussionDetail.id)}
            >
              <FlagIcon /> 查看举报
            </Button>
            <Button
              variant="danger"
              size="sm"
              block
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
            </Button>
          </div>
        </SidePanel>
      )}
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
