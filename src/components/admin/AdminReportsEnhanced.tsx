// Enhanced Admin Reports Tab Component
// 增强的举报管理组件 - 详情面板、自动处理规则、统计图表

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import type { ReportSummary, ReportDetail, ReportStats, ContextMenuData } from './AdminTypes';

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
    <div className="tab-content">
      {/* 页面标题和操作栏 */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">举报管理</h1>
          {reportsTotal > 0 && (
            <span className="pending-badge">
              {reportsTotal} 个待处理
            </span>
          )}
        </div>
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
              placeholder="搜索举报内容..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 统计图表 */}
      {reportStats && (
        <div className="stats-charts-row">
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">举报类型分布</h3>
            <div className="stats-chart-body">
              <PieChart
                data={reportStats.byType.map(d => ({
                  label: getReportTypeLabel(d.type),
                  value: d.count,
                }))}
                size={180}
              />
            </div>
          </div>
          <div className="stats-chart-card">
            <h3 className="stats-chart-title">处理状态分布</h3>
            <div className="stats-chart-body">
              <PieChart
                data={reportStats.byStatus.map(d => ({
                  label: getStatusLabel(d.status),
                  value: d.count,
                }))}
                size={180}
              />
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFiltersChange(updated as any);
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
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedReports.size === reports.length && reports.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) onSelectAll();
                    else onSelectNone();
                  }}
                />
              </th>
              <th>举报类型</th>
              <th>内容摘要</th>
              <th>举报人</th>
              <th>状态</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {reportsLoading ? (
              <tr>
                <td colSpan={6} className="text-center">加载中...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">暂无举报数据</td>
              </tr>
            ) : (
              reports.map(report => (
                <tr
                  key={report.id}
                  onContextMenu={(e) => handleContextMenu(e, report)}
                  onDoubleClick={() => onViewDetail(report.id)}
                  className={selectedReports.has(report.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedReports.has(report.id)}
                      onChange={() => onToggleSelect(report.id)}
                    />
                  </td>
                  <td>
                    <span className={`report-type-badge ${report.targetType}`}>
                      {getReportTypeLabel(report.targetType)}
                    </span>
                  </td>
                  <td>
                    <div className="report-reason-cell">
                      <span className="report-reason">{report.reason}</span>
                      <span className="report-target-id">#{report.id}</span>
                    </div>
                  </td>
                  <td>
                    {report.reporterUsername ? (
                      <Link href={`/${report.reporterUsername}`} className="user-link">
                        @{report.reporterUsername}
                      </Link>
                    ) : (
                      <span className="text-muted">未知</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">{formatTimeAgo(report.createdAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {reportsTotal > reportsPageSize && (
        <div className="pagination">
          <div className="pagination-info">
            显示 {((reportsPage - 1) * reportsPageSize) + 1} - {Math.min(reportsPage * reportsPageSize, reportsTotal)} 条，共 {reportsTotal} 条
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={reportsPage <= 1 || reportsLoading}
              onClick={() => onPageChange(reportsPage - 1)}
            >
              上一页
            </button>
            <span className="page-info">
              第 {reportsPage} / {totalPages} 页
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={reportsPage >= totalPages || reportsLoading}
              onClick={() => onPageChange(reportsPage + 1)}
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
            <span className="context-menu-title">🚩 举报 #{contextMenuTarget.id}</span>
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
            <button
              className="context-menu-item"
              onClick={() => {
                onViewReporterHistory(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <UserIcon /> 查看被举报用户
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onMarkProcessed(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <CheckIcon /> 标记为已处理
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                onIgnoreReport(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <XIcon /> 忽略举报
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onSendWarning(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <SendIcon /> 发送警告
            </button>
            <div className="context-menu-submenu">
              <span className="submenu-trigger">
                <MuteIcon /> 禁言 <ChevronDownIcon />
              </span>
              <div className="submenu-content">
                <button onClick={() => { onMuteUser(contextMenuTarget.id, '1d'); onCloseContextMenu(); }}>
                  禁言 1 天
                </button>
                <button onClick={() => { onMuteUser(contextMenuTarget.id, '7d'); onCloseContextMenu(); }}>
                  禁言 7 天
                </button>
                <button onClick={() => { onMuteUser(contextMenuTarget.id, '30d'); onCloseContextMenu(); }}>
                  禁言 30 天
                </button>
                <button onClick={() => { onMuteUser(contextMenuTarget.id, 'permanent'); onCloseContextMenu(); }}>
                  永久禁言
                </button>
              </div>
            </div>
            <button
              className="context-menu-item"
              onClick={() => {
                onBanUser(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <BanIcon /> 封禁账号
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item danger"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: '删除内容',
                  message: '确定要删除被举报的内容吗？',
                  variant: 'danger',
                  onConfirm: () => {
                    onDeleteContent(contextMenuTarget.id);
                    setConfirmDialog(null);
                  },
                });
                onCloseContextMenu();
              }}
            >
              <TrashIcon /> 删除内容
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                onViewRelatedReports(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <FlagIcon /> 查看相关举报
            </button>
          </div>
        </div>
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
        <div className="modal-overlay" onClick={onCloseReportModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{reportAction === 'dismiss' ? '处理举报' : '删除内容'}</h3>
              <button className="modal-close" onClick={onCloseReportModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
                  处理备注
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="请输入处理备注..."
                  value={reportNote}
                  onChange={(e) => onReportNoteChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border-default)', borderRadius: 6, resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onCloseReportModal} disabled={isHandlingReport}>取消</button>
              <button className="btn btn-primary" onClick={onReportSubmit} disabled={isHandlingReport || !reportNote.trim()}>
                {isHandlingReport ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
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
        title="🚩 举报详情"
        width={520}
      >
        <div className="detail-loading">
          <div className="loading-spinner" />
          <p>正在加载举报详情...</p>
        </div>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      isOpen={true}
      onClose={onClose}
      title={`🚩 举报详情 #${report.id}`}
      subtitle={getReportTypeLabel(report.targetType)}
      width={520}
    >
      {/* 基本信息 */}
      <div className="detail-section">
        <h3 className="detail-section-title">基本信息</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">举报类型</span>
            <span className="detail-value">
              <span className={`report-type-badge ${report.targetType}`}>
                {getReportTypeLabel(report.targetType)}
              </span>
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">状态</span>
            <span className={`status-badge ${getStatusBadgeClass(report.status)}`}>
              {getStatusLabel(report.status)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">优先级</span>
            <span className={`priority-badge ${report.priority || ''}`}>
              {getPriorityLabel(report.priority || '')}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">举报时间</span>
            <span className="detail-value">{formatTimeAgo(report.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 举报人信息 */}
      <div className="detail-section">
        <h3 className="detail-section-title">举报人</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">用户名</span>
            <span className="detail-value">
              {report.reporter?.username ? (
                <Link href={`/${report.reporter.username}`} className="user-link">
                  @{report.reporter.username}
                </Link>
              ) : '未知'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">邮箱</span>
            <span className="detail-value">{report.reporter?.email || '-'}</span>
          </div>
        </div>
        {report.reporterStats && (
          <div className="reporter-stats">
            <span>总举报次数: {report.reporterStats.totalReports}</span>
            <span>有效举报: {report.reporterStats.validReports}</span>
            <span>无效举报: {report.reporterStats.invalidReports}</span>
          </div>
        )}
      </div>

      {/* 被举报对象 */}
      {report.targetInfo && (
        <div className="detail-section">
          <h3 className="detail-section-title">被举报对象</h3>
          <div className="detail-grid">
            {report.targetInfo.username && (
              <div className="detail-item full-width">
                <span className="detail-label">用户名</span>
                <span className="detail-value">
                  <Link href={`/${report.targetInfo.username}`} className="user-link">
                    @{report.targetInfo.username}
                  </Link>
                </span>
              </div>
            )}
            {report.targetInfo.title && (
              <div className="detail-item full-width">
                <span className="detail-label">标题</span>
                <span className="detail-value">{report.targetInfo.title}</span>
              </div>
            )}
            {report.targetInfo.content && (
              <div className="detail-item full-width">
                <span className="detail-label">内容</span>
                <div className="target-content">{report.targetInfo.content}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 举报原因 */}
      <div className="detail-section">
        <h3 className="detail-section-title">举报原因</h3>
        <div className="report-reason-box">
          <p>{report.reason}</p>
          {report.description && (
            <p className="report-description">{report.description}</p>
          )}
        </div>
      </div>

      {/* 相关举报 */}
      {report.relatedReports && report.relatedReports.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section-title">相关举报</h3>
          <div className="related-reports-list">
            {report.relatedReports.map((r) => (
              <div key={r.id} className="related-report-item">
                <span className="related-report-reason">{r.reason}</span>
                <span className="related-report-date">{formatTimeAgo(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速操作 */}
      <div className="detail-section">
        <h3 className="detail-section-title">快速操作</h3>
        <div className="quick-actions-grid">
          <button className="btn btn-secondary" onClick={onMarkProcessed}>
            ✓ 标记已处理
          </button>
          <button className="btn btn-secondary" onClick={onIgnore}>
            ✗ 忽略举报
          </button>
          <button className="btn btn-secondary" onClick={onSendWarning}>
            📧 发送警告
          </button>
          <button className="btn btn-warning" onClick={() => onMute?.('7d')}>
            🔇 禁言 7 天
          </button>
          <button className="btn btn-danger" onClick={onBan}>
            🔒 封禁账号
          </button>
          <button className="btn btn-danger" onClick={onDeleteContent}>
            🗑️ 删除内容
          </button>
        </div>
      </div>
      <style jsx>{`
        .report-type-badge { display: inline-flex; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .report-type-badge.user { background: var(--color-accent-subtle); color: var(--color-accent-fg); }
        .report-type-badge.repo { background: var(--color-success-subtle); color: var(--color-success-fg); }
        .report-type-badge.discussion { background: var(--color-attention-subtle); color: var(--color-attention-fg); }
        .report-type-badge.comment { background: var(--color-bg-subtle); color: var(--color-fg-muted); }
        .priority-badge { display: inline-flex; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .priority-badge.high { background: var(--color-danger-subtle); color: var(--color-danger-fg); }
        .priority-badge.medium { background: var(--color-attention-subtle); color: var(--color-attention-fg); }
        .priority-badge.low { background: var(--color-bg-subtle); color: var(--color-fg-muted); }
        .reporter-stats { display: flex; gap: 16px; margin-top: 12px; padding: 10px 12px; background: var(--color-bg-subtle); border-radius: 6px; font-size: 12px; color: var(--color-fg-muted); }
        .target-content { padding: 12px; background: var(--color-bg-subtle); border-radius: 6px; font-size: 13px; color: var(--color-fg-default); white-space: pre-wrap; }
        .report-reason-box { padding: 16px; background: var(--color-bg-subtle); border-radius: 8px; }
        .report-reason-box p { margin: 0; font-size: 14px; color: var(--color-fg-default); line-height: 1.5; }
        .report-description { margin-top: 12px !important; color: var(--color-fg-muted) !important; font-size: 13px !important; }
        .related-reports-list { display: flex; flex-direction: column; gap: 8px; }
        .related-report-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--color-bg-subtle); border-radius: 6px; }
        .related-report-reason { font-size: 13px; color: var(--color-fg-default); }
        .related-report-date { font-size: 11px; color: var(--color-fg-muted); }
        .quick-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .btn-warning { background: var(--color-attention-subtle); color: var(--color-attention-fg); border: 1px solid var(--color-attention-fg); }
        .btn-warning:hover { background: var(--color-attention-emphasis); color: white; }
        .detail-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--color-fg-muted); }
        .detail-loading .loading-spinner { width: 40px; height: 40px; border: 3px solid var(--color-border-default); border-top-color: var(--color-accent-fg); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
        .detail-loading p { margin: 0; font-size: 14px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
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

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    pending: 'warning',
    processed: 'success',
    ignored: 'disabled',
  };
  return classes[status] || 'default';
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labels[priority] || priority;
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


