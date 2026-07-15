// Enhanced Admin Penalties Tab Component
// 增强的处罚管理组件 - 处罚模板、批量处罚、效果统计

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Card  , Field } from '@/components/design';
import {
  SearchIcon,
  FilterIcon,
  EyeIcon,
  EditIcon,
  ClockIcon,
  CheckIcon,
  BanIcon,
  TrashIcon,
  ChevronDownIcon,
  PlusIcon,
  TemplateIcon,
  BarChartIcon
} from './AdminIcons';
import { SidePanel, AdvancedFilter, BatchActionBar, ConfirmDialog } from './common/AdminCommon';
import { PieChart, BarChart } from './charts/AdminCharts';
import { AdminContextMenu } from './AdminContextMenu';
import type { Penalty, PenaltyTemplate, ContextMenuData, ContextMenuSection } from './AdminTypes';
import { formatDate } from '@/lib/utils';

interface PenaltyFilters {
  search?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminPenaltiesEnhancedProps {
  // 数据
  penalties: Penalty[];
  penaltiesTotal: number;
  penaltyStats?: {
    byType: { type: string; count: number }[];
    byStatus: { status: string; count: number }[];
    trend: { date: string; count: number }[];
    appealRate: number;
    repeatRate: number;
  };
  penaltyTemplates: PenaltyTemplate[];
  // 分页
  penaltiesPage: number;
  penaltiesPageSize?: number;
  // 筛选
  filters: PenaltyFilters;
  // 状态
  penaltiesLoading: boolean;
  selectedPenalties: Set<string>;
  contextMenu: ContextMenuData | null;
  // 操作回调
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: PenaltyFilters) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleSelect: (id: string) => void;
  // 操作
  onViewDetail: (penaltyId: string) => void;
  onEditPenalty: (penaltyId: string) => void;
  onExtendPenalty: (penaltyId: string, extension: string) => void;
  onReleasePenalty: (penaltyId: string) => void;
  onRevokePenalty: (penaltyId: string) => void;
  onAddNote: (penaltyId: string) => void;
  // 模板操作
  onViewTemplates: () => void;
  onUseTemplate: (templateId: string, userId: string) => void;
  onCreateTemplate: () => void;
  onEditTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  // 批量操作
  onBatchRelease: (ids: string[]) => void;
  onBatchRevoke: (ids: string[]) => void;
  // 右键菜单
  onContextMenu: (e: React.MouseEvent, penaltyId: string) => void;
  onCloseContextMenu: () => void;
  onRefresh: () => void;
}

export default function AdminPenaltiesEnhanced({
  penalties,
  penaltiesTotal,
  penaltyStats,
  penaltyTemplates,
  penaltiesPage,
  penaltiesPageSize = 20,
  filters,
  penaltiesLoading,
  selectedPenalties,
  contextMenu,
  onSearchChange,
  onPageChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onEditPenalty,
  onExtendPenalty,
  onReleasePenalty,
  onRevokePenalty,
  onAddNote,
  onViewTemplates,
  onUseTemplate,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onBatchRelease,
  onBatchRevoke,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
}: AdminPenaltiesEnhancedProps) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<Penalty | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const totalPages = Math.ceil(penaltiesTotal / penaltiesPageSize);

  // 处罚类型选项
  const penaltyTypes = [
    { value: 'mute', label: '禁言' },
    { value: 'repo_limit', label: '限制仓库创建' },
    { value: 'storage_limit', label: '限制存储空间' },
    { value: 'download_limit', label: '限制下载' },
    { value: 'fork_limit', label: '限制Fork' },
    { value: 'star_limit', label: '限制Star' },
    { value: 'ban', label: '封禁' },
    { value: 'content_hidden', label: '内容隐藏' },
  ];

  // 状态选项
  const statusOptions = [
    { value: 'active', label: '生效中' },
    { value: 'expired', label: '已过期' },
    { value: 'revoked', label: '已撤销' },
  ];

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, penalty: Penalty) => {
    e.preventDefault();
    setContextMenuTarget(penalty);
    onContextMenu(e, penalty.id);
  };

  // 筛选器配置
  const filterFields = [
    {
      name: 'type',
      label: '处罚类型',
      type: 'select' as const,
      options: [
        { label: '全部类型', value: '' },
        ...penaltyTypes,
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部状态', value: '' },
        ...statusOptions,
      ],
    },
    {
      name: 'dateFrom',
      label: '开始时间从',
      type: 'date' as const,
    },
    {
      name: 'dateTo',
      label: '开始时间到',
      type: 'date' as const,
    },
  ];

  return (
    <div className="p-4">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">处罚管理</h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <TemplateIcon /> 处罚模板
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            className={showAdvancedFilter ? 'ring-2 ring-[var(--ds-accent-default)]' : ''}
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

      {/* 处罚模板面板 */}
      {showTemplates && (
        <Card>
          <div className="templates-header">
            <h3>处罚模板</h3>
            <Button variant="primary" size="sm" onClick={onCreateTemplate}>
              <PlusIcon /> 新建模板
            </Button>
          </div>
          <div className="templates-list">
            {penaltyTemplates.length > 0 ? (
              penaltyTemplates.map((template) => (
                <div key={template.id} className="template-card">
                  <div className="template-info">
                    <span className="template-name">{template.name}</span>
                    <span className="template-type">{getPenaltyTypeLabel(template.type)}</span>
                    <span className="template-duration">默认: {template.defaultDuration}</span>
                  </div>
                  <div className="template-stats">
                    <span>使用 {template.usageCount} 次</span>
                  </div>
                  <div className="template-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUseTemplate(template.id, '')}
                    >
                      使用
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTemplate(template.id)}
                    >
                      <EditIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--ds-danger-default)] hover:bg-[var(--ds-danger-subtle)]"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: '删除模板',
                          message: `确定要删除模板 "${template.name}" 吗？`,
                          variant: 'danger',
                          onConfirm: () => {
                            onDeleteTemplate(template.id);
                            setConfirmDialog(null);
                          },
                        });
                      }}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="templates-empty">
                <p>暂无处罚模板</p>
                <Button variant="primary" onClick={onCreateTemplate}>
                  创建第一个模板
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 统计图表 */}
      {penaltyStats && (
        <div className="stats-charts-row">
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">处罚类型分布</h3>
            <div className="stats-chart-body">
              <PieChart
                data={penaltyStats.byType.map(d => ({
                  label: getPenaltyTypeLabel(d.type),
                  value: d.count,
                }))}
                size={160}
              />
            </div>
          </div>
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">处罚状态分布</h3>
            <div className="stats-chart-body">
              <PieChart
                data={penaltyStats.byStatus.map(d => ({
                  label: getStatusLabel(d.status),
                  value: d.count,
                }))}
                size={160}
              />
            </div>
          </div>
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">效果统计</h3>
            <div className="stats-metrics">
              <div className="metric-item">
                <span className="metric-value">{penaltyStats.appealRate}%</span>
                <span className="metric-label">申诉率</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{penaltyStats.repeatRate}%</span>
                <span className="metric-label">复犯率</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
          onReset={() => onFiltersChange({} as PenaltyFilters)}
        />
      )}

      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedPenalties.size}
        onClearSelection={onSelectNone}
        actions={[
          { label: '批量解除', onClick: () => onBatchRelease(Array.from(selectedPenalties)) },
          { label: '批量撤销', variant: 'danger', onClick: () => onBatchRevoke(Array.from(selectedPenalties)) },
        ]}
      />

      {/* 处罚列表 */}
      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedPenalties.size === penalties.length && penalties.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) onSelectAll();
                    else onSelectNone();
                  }}
                />
              </th>
              <th>用户</th>
              <th>处罚类型</th>
              <th>原因</th>
              <th>状态</th>
              <th>过期时间</th>
              <th>申诉</th>
              <th>操作人</th>
            </tr>
          </thead>
          <tbody>
            {penaltiesLoading ? (
              <tr>
                <td colSpan={8} className="text-center">加载中...</td>
              </tr>
            ) : penalties.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">暂无处罚记录</td>
              </tr>
            ) : (
              penalties.map(penalty => (
                <tr
                  key={penalty.id}
                  onContextMenu={(e) => handleContextMenu(e, penalty)}
                  onDoubleClick={() => onViewDetail(penalty.id)}
                  className={selectedPenalties.has(penalty.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPenalties.has(penalty.id)}
                      onChange={() => onToggleSelect(penalty.id)}
                    />
                  </td>
                  <td>
                    <div className="user-cell">
                      <Link href={`/${penalty.userUsername}`} className="user-link">
                        @{penalty.userUsername}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <span className={`penalty-type-badge ${penalty.type}`}>
                      {getPenaltyTypeLabel(penalty.type)}
                    </span>
                  </td>
                  <td>
                    <span className="penalty-reason" title={penalty.reason}>
                      {penalty.reason.length > 30 ? penalty.reason.slice(0, 30) + '...' : penalty.reason}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(penalty.status)}`}>
                      {getStatusLabel(penalty.status)}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {penalty.expiresAt ? formatDate(penalty.expiresAt) : '永久'}
                    </span>
                  </td>
                  <td>
                    {penalty.hasPendingAppeal ? (
                      <span className="appeal-badge pending">待处理</span>
                    ) : penalty.appeals && penalty.appeals.length > 0 ? (
                      <span className="appeal-badge processed">{penalty.appeals.length} 次</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/${penalty.operatorUsername}`} className="user-link">
                      @{penalty.operatorUsername}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* 分页 */}
      {penaltiesTotal > penaltiesPageSize && (
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-[var(--ds-text-secondary)]">
            显示 {((penaltiesPage - 1) * penaltiesPageSize) + 1} - {Math.min(penaltiesPage * penaltiesPageSize, penaltiesTotal)} 条，共 {penaltiesTotal} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={penaltiesPage <= 1 || penaltiesLoading}
              onClick={() => onPageChange(penaltiesPage - 1)}
            >
              上一页
            </Button>
            <span className="text-sm text-[var(--ds-text-secondary)]">
              第 {penaltiesPage} / {totalPages} 页
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={penaltiesPage >= totalPages || penaltiesLoading}
              onClick={() => onPageChange(penaltiesPage + 1)}
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
                {
                  id: 'edit-penalty',
                  label: '修改处罚',
                  icon: <EditIcon />,
                  onClick: () => { onEditPenalty(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'actions',
              items: [
                {
                  id: 'extend-penalty',
                  label: '延长处罚',
                  icon: <ClockIcon />,
                  children: [
                    { id: 'extend-1d', label: '延长 1 天', onClick: () => { onExtendPenalty(contextMenuTarget!.id, '1d'); onCloseContextMenu(); } },
                    { id: 'extend-7d', label: '延长 7 天', onClick: () => { onExtendPenalty(contextMenuTarget!.id, '7d'); onCloseContextMenu(); } },
                    { id: 'extend-30d', label: '延长 30 天', onClick: () => { onExtendPenalty(contextMenuTarget!.id, '30d'); onCloseContextMenu(); } },
                  ],
                },
                {
                  id: 'release-penalty',
                  label: '解除处罚',
                  icon: <CheckIcon />,
                  onClick: () => { onReleasePenalty(contextMenuTarget!.id); onCloseContextMenu(); },
                },
                {
                  id: 'revoke-penalty',
                  label: '撤销处罚',
                  icon: <BanIcon />,
                  danger: true,
                  onClick: () => { onRevokePenalty(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'notes',
              items: [
                {
                  id: 'add-note',
                  label: '添加备注',
                  icon: <EditIcon />,
                  onClick: () => { onAddNote(contextMenuTarget!.id); onCloseContextMenu(); },
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
    <style jsx>{`
      .templates-panel { background: var(--ds-surface-default); border: 1px solid var(--ds-border-default); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
      .templates-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .templates-header h3 { font-size: 16px; font-weight: 600; color: var(--ds-text-primary); margin: 0; }
      .templates-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
      .template-card { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--ds-surface-subtle); border: 1px solid var(--ds-border-muted); border-radius: 8px; }
      .template-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .template-name { font-weight: 600; color: var(--ds-text-primary); font-size: 14px; }
      .template-type { font-size: 12px; color: var(--ds-accent-default); }
      .template-duration { font-size: 11px; color: var(--ds-text-secondary); }
      .template-stats { font-size: 11px; color: var(--ds-text-secondary); }
      .template-actions { display: flex; gap: 4px; }
      .templates-empty { text-align: center; padding: 40px 20px; color: var(--ds-text-secondary); }
      .templates-empty p { margin: 0 0 16px; }
      .penalty-type-badge { display: inline-flex; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
      .penalty-type-badge.mute { background: var(--ds-warning-subtle); color: var(--ds-warning-default); }
      .penalty-type-badge.repo_limit, .penalty-type-badge.storage_limit { background: var(--ds-accent-subtle); color: var(--ds-accent-default); }
      .penalty-type-badge.ban { background: var(--ds-danger-subtle); color: var(--ds-danger-default); }
      .penalty-reason { font-size: 13px; color: var(--ds-text-primary); }
      .appeal-badge { display: inline-flex; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
      .appeal-badge.pending { background: var(--ds-warning-subtle); color: var(--ds-warning-default); }
      .appeal-badge.processed { background: var(--ds-surface-subtle); color: var(--ds-text-secondary); }
      .stats-metrics { display: flex; justify-content: space-around; padding: 16px 0; }
      .metric-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .metric-value { font-size: 24px; font-weight: 600; color: var(--ds-text-primary); }
      .metric-label { font-size: 12px; color: var(--ds-text-secondary); }
      .status-badge.danger { background: var(--ds-danger-subtle); color: var(--ds-danger-default); }
      .btn.danger { background: var(--ds-danger-default); color: white; border: 1px solid var(--ds-danger-default); }
      .btn.danger:hover { background: var(--ds-danger-default); border-color: var(--ds-danger-default); }
    `}</style>
    </div>
  );
}

// 辅助函数
function getPenaltyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mute: '禁言',
    repo_limit: '限制仓库创建',
    storage_limit: '限制存储空间',
    download_limit: '限制下载',
    fork_limit: '限制Fork',
    star_limit: '限制Star',
    ban: '封禁',
    content_hidden: '内容隐藏',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '生效中',
    expired: '已过期',
    revoked: '已撤销',
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    active: 'danger',
    expired: 'disabled',
    revoked: 'success',
  };
  return classes[status] || 'default';
}
