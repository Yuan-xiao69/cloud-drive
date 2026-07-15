// Enhanced Admin Reports Tab Component
// 增强的举报管理组件 - 详情面板、自动处理规则、统计图表

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Modal, Input, Card, Field } from '@/components/design';
import {
  SearchIcon,
  FilterIcon,
  EyeIcon,
  UserIcon,
  CheckIcon,
  XIcon,
  FlagIcon,
  BanIcon,
  MuteIcon,
  TrashIcon,
  SendIcon,
  ChevronDownIcon,
  AlertIcon
} from './AdminIcons';
import { SidePanel, AdvancedFilter, BatchActionBar, ConfirmDialog } from './common/AdminCommon';
import { PieChart, BarChart } from './charts/AdminCharts';
import { AdminContextMenu } from './AdminContextMenu';
import type { ReportSummary, ReportDetail, ReportStats, ContextMenuData, ContextMenuSection } from './AdminTypes';
import { formatTimeAgo } from '@/lib/utils';

interface ReportFilters {
  search?: string;
  targetType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AdminReportsEnhancedProps {
  // 数据
  reports: ReportSummary[];
  reportsTotal: number;
  // 统计
  reportStats: ReportStats | null;
  // 分页
  reportsPage: number;
  reportsPageSize?: number;
  // 筛选
  filters: ReportFilters;
  // 状态
  reportsLoading: boolean;
  selectedReports: Set<string>;
  contextMenu: ContextMenuData | null;
  selectedReportDetail: ReportDetail | null;
  reportDetailLoading?: boolean;
  // 操作回调
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: ReportFilters) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleSelect: (id: string) => void;
  // 操作
  onViewDetail: (reportId: string) => void;
  onMarkProcessed: (reportId: string) => void;
  onIgnoreReport: (reportId: string) => void;
  onSendWarning: (reportId: string) => void;
  onMuteUser: (reportId: string, duration: string) => void;
  onBanUser: (reportId: string) => void;
  onDeleteContent: (reportId: string) => void;
  onViewRelatedReports: (reportId: string) => void;
  onViewReporterHistory: (reportId: string) => void;
  // 批量操作
  onBatchMarkProcessed: (ids: string[]) => void;
  onBatchIgnore: (ids: string[]) => void;
  onBatchDelete: (ids: string[]) => void;
  // 右键菜单
  onContextMenu: (e: React.MouseEvent, reportId: string) => void;
  onCloseContextMenu: () => void;
  onRefresh: () => void;
  // 举报处理弹窗
  showReportModal: boolean;
  reportAction: 'delete' | 'dismiss';
  reportNote: string;
  isHandlingReport: boolean;
  onReportNoteChange: (note: string) => void;
  onReportSubmit: () => void;
  onCloseReportModal: () => void;
}

export default function AdminReportsEnhanced({
  reports,
  reportsTotal,
  reportStats,
  reportsPage,
  reportsPageSize = 20,
  filters,
  reportsLoading,
  selectedReports,
  contextMenu,
  selectedReportDetail,
  onSearchChange,
  onPageChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onMarkProcessed,
  onIgnoreReport,
  onSendWarning,
  onMuteUser,
  onBanUser,
  onDeleteContent,
  onViewRelatedReports,
  onViewReporterHistory,
  onBatchMarkProcessed,
  onBatchIgnore,
  onBatchDelete,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
  reportDetailLoading,
  showReportModal,
  reportAction,
  reportNote,
  isHandlingReport,
  onReportNoteChange,
  onReportSubmit,
  onCloseReportModal,
}: AdminReportsEnhancedProps) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<ReportSummary | null>(null);

  const totalPages = Math.ceil(reportsTotal / reportsPageSize);

  // 举报类型
  const reportTypes = [
    { value: 'user', label: '用户举报' },
    { value: 'repo', label: '仓库举报' },
    { value: 'discussion', label: '讨论举报' },
    { value: 'comment', label: '评论举报' },
  ];

  // 状态选项
  const statusOptions = [
    { value: 'pending', label: '待处理' },
    { value: 'processed', label: '已处理' },
    { value: 'ignored', label: '已忽略' },
  ];

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, report: ReportSummary) => {
    e.preventDefault();
    setContextMenuTarget(report);
    onContextMenu(e, report.id);
  };

  // 筛选器配置
  const filterFields = [
    {
      name: 'targetType',
      label: '举报类型',
      type: 'select' as const,
      options: [
        { label: '全部类型', value: '' },
        ...reportTypes,
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
      label: '举报时间从',
      type: 'date' as const,
    },
    {
      name: 'dateTo',
      label: '举报时间到',
      type: 'date' as const,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 页面标题和操作栏 */}
      <div className="flex justify-between items-start gap-4 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-semibold text-[var(--ds-text-primary)] m-0">举报管理</h1>
          {reportsTotal > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]">
              {reportsTotal} 个待处理
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-secondary)]">
              <SearchIcon />
            </span>
            <input
              type="search"
              placeholder="搜索举报内容..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] outline-none focus:ring-1 focus:ring-[var(--ds-accent-default)] w-52"
            />
          </div>
        </div>
      </div>

      {/* 统计图表 */}
      {reportStats && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <h3 className="text-xs font-semibold text-[var(--ds-text-secondary)] mb-3">举报类型分布</h3>
            <div className="flex justify-center items-center min-h-[160px]">
              <PieChart
                data={reportStats.byType.map(d => ({
                  label: getReportTypeLabel(d.type),
                  value: d.count,
                }))}
                size={180}
              />
            </div>
          </Card>
          <Card>
            <h3 className="text-xs font-semibold text-[var(--ds-text-secondary)] mb-3">处理状态分布</h3>
            <div className="flex justify-center items-center min-h-[160px]">
              <PieChart
                data={reportStats.byStatus.map(d => ({
                  label: getStatusLabel(d.status),
                  value: d.count,
                }))}
                size={180}
              />
            </div>
          </Card>
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
          onReset={() => onFiltersChange({} as ReportFilters)}
        />
      )}

      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedReports.size}
        onClearSelection={onSelectNone}
        actions={[
          { label: '标记已处理', onClick: () => onBatchMarkProcessed(Array.from(selectedReports)) },
          { label: '忽略举报', onClick: () => onBatchIgnore(Array.from(selectedReports)) },
          { label: '批量删除', variant: 'danger', onClick: () => onBatchDelete(Array.from(selectedReports)) },
        ]}
      />

      {/* 举报列表 */}
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)] text-left">
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  className="admin-checkbox cursor-pointer"
                  checked={selectedReports.size === reports.length && reports.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) onSelectAll();
                    else onSelectNone();
                  }}
                />
              </th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">举报类型</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">内容摘要</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">举报人</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">状态</th>
              <th className="px-3 py-2.5 font-medium text-[var(--ds-text-secondary)]">时间</th>
            </tr>
          </thead>
          <tbody>
            {reportsLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[var(--ds-text-secondary)]">
                  <div className="inline-block w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin mb-2" />
                  <div className="text-sm">加载中...</div>
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[var(--ds-text-secondary)]">
                  <div className="flex justify-center mb-3 opacity-40">
                    <FlagIcon />
                  </div>
                  <div className="text-sm">暂无举报数据</div>
                </td>
              </tr>
            ) : (
              reports.map(report => (
                <tr
                  key={report.id}
                  onContextMenu={(e) => handleContextMenu(e, report)}
                  onDoubleClick={() => onViewDetail(report.id)}
                  className={`border-b border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)] transition-colors cursor-pointer ${selectedReports.has(report.id) ? 'bg-[var(--ds-accent-default)]/5' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="admin-checkbox cursor-pointer"
                      checked={selectedReports.has(report.id)}
                      onChange={() => onToggleSelect(report.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.targetType === 'user' ? 'bg-[var(--ds-accent-default)]/10 text-[var(--ds-accent-default)]' :
                      report.targetType === 'repo' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                      report.targetType === 'discussion' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' :
                      'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
                    }`}>
                      {getReportTypeLabel(report.targetType)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] text-[var(--ds-text-primary)]">{report.reason}</span>
                      <span className="text-xs text-[var(--ds-text-secondary)]">#{report.id}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {report.reporterUsername ? (
                      <Link href={`/${report.reporterUsername}`} className="font-medium text-[var(--ds-accent-default)] text-sm hover:underline">
                        @{report.reporterUsername}
                      </Link>
                    ) : (
                      <span className="text-sm text-[var(--ds-text-secondary)]">未知</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'pending' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' :
                      report.status === 'processed' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                      'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
                    }`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-sm text-[var(--ds-text-secondary)]">{formatTimeAgo(report.createdAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* 分页 */}
      {reportsTotal > reportsPageSize && (
        <div className="flex justify-between items-center pt-2">
          <div className="text-sm text-[var(--ds-text-secondary)]">
            显示 {((reportsPage - 1) * reportsPageSize) + 1} - {Math.min(reportsPage * reportsPageSize, reportsTotal)} 条，共 {reportsTotal} 条
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={reportsPage <= 1 || reportsLoading}
              onClick={() => onPageChange(reportsPage - 1)}
            >
              上一页
            </Button>
            <span className="text-sm text-[var(--ds-text-secondary)] px-2">
              第 {reportsPage} / {totalPages} 页
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={reportsPage >= totalPages || reportsLoading}
              onClick={() => onPageChange(reportsPage + 1)}
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
                  id: 'view-reporter',
                  label: '查看被举报用户',
                  icon: <UserIcon />,
                  onClick: () => { onViewReporterHistory(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'handle',
              items: [
                {
                  id: 'mark-processed',
                  label: '标记为已处理',
                  icon: <CheckIcon />,
                  onClick: () => { onMarkProcessed(contextMenuTarget!.id); onCloseContextMenu(); },
                },
                {
                  id: 'ignore-report',
                  label: '忽略举报',
                  icon: <XIcon />,
                  onClick: () => { onIgnoreReport(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'punish',
              items: [
                {
                  id: 'send-warning',
                  label: '发送警告',
                  icon: <SendIcon />,
                  onClick: () => { onSendWarning(contextMenuTarget!.id); onCloseContextMenu(); },
                },
                {
                  id: 'mute-user',
                  label: '禁言',
                  icon: <MuteIcon />,
                  children: [
                    { id: 'mute-1d', label: '禁言 1 天', onClick: () => { onMuteUser(contextMenuTarget!.id, '1d'); onCloseContextMenu(); } },
                    { id: 'mute-7d', label: '禁言 7 天', onClick: () => { onMuteUser(contextMenuTarget!.id, '7d'); onCloseContextMenu(); } },
                    { id: 'mute-30d', label: '禁言 30 天', onClick: () => { onMuteUser(contextMenuTarget!.id, '30d'); onCloseContextMenu(); } },
                    { id: 'mute-permanent', label: '永久禁言', onClick: () => { onMuteUser(contextMenuTarget!.id, 'permanent'); onCloseContextMenu(); } },
                  ],
                },
                {
                  id: 'ban-user',
                  label: '封禁账号',
                  icon: <BanIcon />,
                  onClick: () => { onBanUser(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
            {
              id: 'danger',
              items: [
                {
                  id: 'delete-content',
                  label: '删除内容',
                  icon: <TrashIcon />,
                  shortcut: 'Del',
                  danger: true,
                  onClick: () => {
                    setConfirmDialog({
                      isOpen: true,
                      title: '删除内容',
                      message: '确定要删除被举报的内容吗？',
                      variant: 'danger',
                      onConfirm: () => {
                        onDeleteContent(contextMenuTarget!.id);
                        setConfirmDialog(null);
                      },
                    });
                    onCloseContextMenu();
                  },
                },
                {
                  id: 'view-related',
                  label: '查看相关举报',
                  icon: <FlagIcon />,
                  onClick: () => { onViewRelatedReports(contextMenuTarget!.id); onCloseContextMenu(); },
                },
              ],
            },
          ]}
          onClose={onCloseContextMenu}
        />
      )}

      {/* 举报详情侧边栏 */}
      {(selectedReportDetail || reportDetailLoading) && (
        <ReportDetailPanel
          report={selectedReportDetail}
          isLoading={reportDetailLoading}
          onClose={() => onViewDetail('')}
          onMarkProcessed={() => selectedReportDetail && onMarkProcessed(selectedReportDetail.id)}
          onIgnore={() => selectedReportDetail && onIgnoreReport(selectedReportDetail.id)}
          onSendWarning={() => selectedReportDetail && onSendWarning(selectedReportDetail.id)}
          onMute={(duration) => selectedReportDetail && onMuteUser(selectedReportDetail.id, duration)}
          onBan={() => selectedReportDetail && onBanUser(selectedReportDetail.id)}
          onDeleteContent={() => {
            if (selectedReportDetail) {
              setConfirmDialog({
                isOpen: true,
                title: '删除内容',
                message: '确定要删除被举报的内容吗？',
                variant: 'danger',
                onConfirm: () => {
                  onDeleteContent(selectedReportDetail.id);
                  setConfirmDialog(null);
                },
              });
            }
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

      {/* 举报处理弹窗 */}
      {showReportModal && (
        <Modal isOpen onClose={onCloseReportModal} title={reportAction === 'dismiss' ? '处理举报' : '删除内容'} maxWidth="480px" footer={
          <>
            <Button variant="secondary" onClick={onCloseReportModal} disabled={isHandlingReport}>取消</Button>
            <Button variant="primary" onClick={onReportSubmit} disabled={isHandlingReport || !reportNote.trim()} loading={isHandlingReport}>{isHandlingReport ? '处理中...' : '确认'}</Button>
          </>
        }>
          <Field label="处理备注">
            <Input id="report-note" multiline rows={3} placeholder="请输入处理备注..." value={reportNote} onChange={(e) => onReportNoteChange(e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// 举报详情侧边栏
interface ReportDetailPanelProps {
  report: ReportDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onMarkProcessed?: () => void;
  onIgnore?: () => void;
  onSendWarning?: () => void;
  onMute?: (duration: string) => void;
  onBan?: () => void;
  onDeleteContent?: () => void;
}

function ReportDetailPanel({
  report,
  isLoading,
  onClose,
  onMarkProcessed,
  onIgnore,
  onSendWarning,
  onMute,
  onBan,
  onDeleteContent,
}: ReportDetailPanelProps) {
  // 加载状态
  if (isLoading || !report) {
    return (
      <SidePanel
        isOpen={true}
        onClose={onClose}
        title="举报详情"
        width={520}
      >
        <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
          <div className="w-10 h-10 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin mb-4" />
          <p className="text-sm m-0">正在加载举报详情...</p>
        </div>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      isOpen={true}
      onClose={onClose}
      title={`举报详情 #${report.id}`}
      subtitle={getReportTypeLabel(report.targetType)}
      width={520}
    >
      {/* 基本信息 */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">基本信息</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ds-text-secondary)]">举报类型</span>
            <span className="text-sm text-[var(--ds-text-primary)]">
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                report.targetType === 'user' ? 'bg-[var(--ds-accent-default)]/10 text-[var(--ds-accent-default)]' :
                report.targetType === 'repo' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                report.targetType === 'discussion' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' :
                'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
              }`}>
                {getReportTypeLabel(report.targetType)}
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ds-text-secondary)]">状态</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              report.status === 'pending' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' :
              report.status === 'processed' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
              'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
            }`}>
              {getStatusLabel(report.status)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ds-text-secondary)]">优先级</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              report.priority === 'high' ? 'bg-[color-mix(in_srgb,var(--ds-danger-default)_10%,transparent)] text-[var(--ds-danger-default)]' :
              report.priority === 'medium' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' :
              'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
            }`}>
              {getPriorityLabel(report.priority || '')}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ds-text-secondary)]">举报时间</span>
            <span className="text-sm text-[var(--ds-text-primary)]">{formatTimeAgo(report.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 举报人信息 */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">举报人</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ds-text-secondary)]">用户名</span>
            <span className="text-sm text-[var(--ds-text-primary)]">
              {report.reporter?.username ? (
                <Link href={`/${report.reporter.username}`} className="font-medium text-[var(--ds-accent-default)] hover:underline">
                  @{report.reporter.username}
                </Link>
              ) : '未知'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--ds-text-secondary)]">邮箱</span>
            <span className="text-sm text-[var(--ds-text-primary)]">{report.reporter?.email || '-'}</span>
          </div>
        </div>
        {report.reporterStats && (
          <Card variant="subtle" className="flex gap-4 mt-3 text-xs text-[var(--ds-text-secondary)]">
            <span>总举报次数: {report.reporterStats.totalReports}</span>
            <span>有效举报: {report.reporterStats.validReports}</span>
            <span>无效举报: {report.reporterStats.invalidReports}</span>
          </Card>
        )}
      </div>

      {/* 被举报对象 */}
      {report.targetInfo && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">被举报对象</h3>
          <div className="grid grid-cols-2 gap-3">
            {report.targetInfo.username && (
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-[var(--ds-text-secondary)]">用户名</span>
                <span className="text-sm text-[var(--ds-text-primary)]">
                  <Link href={`/${report.targetInfo.username}`} className="font-medium text-[var(--ds-accent-default)] hover:underline">
                    @{report.targetInfo.username}
                  </Link>
                </span>
              </div>
            )}
            {report.targetInfo.title && (
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-[var(--ds-text-secondary)]">标题</span>
                <span className="text-sm text-[var(--ds-text-primary)]">{report.targetInfo.title}</span>
              </div>
            )}
            {report.targetInfo.content && (
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-xs text-[var(--ds-text-secondary)]">内容</span>
                <Card variant="subtle" className="text-[13px] text-[var(--ds-text-primary)] whitespace-pre-wrap">{report.targetInfo.content}</Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 举报原因 */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">举报原因</h3>
        <Card variant="subtle" padding="lg">
          <p className="m-0 text-sm text-[var(--ds-text-primary)] leading-relaxed">{report.reason}</p>
          {report.description && (
            <p className="mt-3 text-[var(--ds-text-secondary)] text-[13px]">{report.description}</p>
          )}
        </Card>
      </div>

      {/* 相关举报 */}
      {report.relatedReports && report.relatedReports.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">相关举报</h3>
          <div className="flex flex-col gap-2">
            {report.relatedReports.map((r) => (
              <Card key={r.id} variant="subtle" className="flex justify-between items-center">
                <span className="text-[13px] text-[var(--ds-text-primary)]">{r.reason}</span>
                <span className="text-[11px] text-[var(--ds-text-secondary)]">{formatTimeAgo(r.createdAt)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 快速操作 */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">快速操作</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={onMarkProcessed} block>
            标记已处理
          </Button>
          <Button variant="secondary" size="sm" onClick={onIgnore} block>
            忽略举报
          </Button>
          <Button variant="secondary" size="sm" onClick={onSendWarning} block>
            发送警告
          </Button>
          <Button variant="ghost" size="sm" className="bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)] border border-[var(--ds-warning-default)] hover:bg-[var(--ds-warning-subtle)] w-full" onClick={() => onMute?.('7d')}>
            禁言 7 天
          </Button>
          <Button variant="ghost" size="sm" className="bg-[color-mix(in_srgb,var(--ds-danger-default)_10%,transparent)] text-[var(--ds-danger-default)] border border-[color-mix(in_srgb,var(--ds-danger-default)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-danger-default)_20%,transparent)] w-full" onClick={onBan}>
            封禁账号
          </Button>
          <Button variant="ghost" size="sm" className="bg-[color-mix(in_srgb,var(--ds-danger-default)_10%,transparent)] text-[var(--ds-danger-default)] border border-[color-mix(in_srgb,var(--ds-danger-default)_20%,transparent)] hover:bg-[color-mix(in_srgb,var(--ds-danger-default)_20%,transparent)] w-full" onClick={onDeleteContent}>
            删除内容
          </Button>
        </div>
      </div>
    </SidePanel>
  );
}

// 辅助函数
function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    user: '用户举报',
    repo: '仓库举报',
    discussion: '讨论举报',
    comment: '评论举报',
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    processed: '已处理',
    ignored: '已忽略',
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority] || priority;
}

