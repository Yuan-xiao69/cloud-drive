// Admin Audit Logs Enhanced Component
// 增强的审计日志管理组件
// 功能：日志筛选、导出、统计、关联分析

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SidePanel, Toast } from './common/AdminCommon';
import { LineChart, PieChart } from './charts/AdminCharts';
import type { AuditLogEntry, AuditLogFilters, ContextMenuConfig } from './AdminTypes';

// ============ 图标组件 ============
const FileTextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.5 1.75a.25.25 0 00-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 7.25v-4.5A1.75 1.75 0 016.25 1H2.5zM6 7.25a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zM6 10a.75.75 0 01.75.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 016 10zM2.5 4.25a.25.25 0 01.25-.25h5.5a.25.25 0 01.25.25V5a1 1 0 01-1 1H3.75A1 1 0 012.5 5v-.75z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 12a.75.75 0 01-.75-.75V4.75L5.28 7.72a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 11-1.06 1.06L8.75 4.75v6.5A.75.75 0 018 12z" />
    <path d="M4 13a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M7.22 8.72a.75.75 0 001.06 1.06l2.5-2.5a.75.75 0 00-1.06-1.06l-1.97 1.97H4.25a.75.75 0 000 1.5h2.5v1.5a.75.75 0 001.5 0V9.56l1.97 1.97a.75.75 0 001.06-1.06l-2.5-2.5a.75.75 0 00-1.06 0L6.15 8.72l-.93.93z" />
  </svg>
);

// ============ 右键菜单组件 ============
interface ContextMenuProps {
  config: ContextMenuConfig;
  onClose: () => void;
}

function ContextMenu({ config, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const [adjustedPosition, setAdjustedPosition] = useState({ x: config.x, y: config.y });

  useEffect(() => {
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = config.x;
      let y = config.y;

      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      setAdjustedPosition({ x, y });
    }
  }, [config.x, config.y]);

  const renderMenuItem = (item: NonNullable<ContextMenuConfig['items']>[0], index: number) => {
    if (item.divider) {
      return <div key={index} className="context-menu-divider" />;
    }

    return (
      <div
        key={index}
        className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
        onClick={() => !item.disabled && !item.submenu && item.action?.()}
      >
        <div className="context-menu-item-content">
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span className="context-menu-label">{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      role="menu"
    >
      {(config.title || config.subtitle) && (
        <div className="context-menu-header">
          {config.title && <div className="context-menu-title">{config.title}</div>}
          {config.subtitle && <div className="context-menu-subtitle">{config.subtitle}</div>}
        </div>
      )}
      <div className="context-menu-items">
        {(config.items || []).map((item, index) => renderMenuItem(item, index))}
      </div>
    </div>
  );
}

// ============ 操作类型配置 ============
const ACTION_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  ban_user: { label: '封禁用户', icon: '🚫', color: '#cf222e' },
  unban_user: { label: '解封用户', icon: '✅', color: '#1a7f37' },
  delete_user: { label: '删除用户', icon: '🗑️', color: '#cf222e' },
  update_user: { label: '更新用户', icon: '✏️', color: '#0969da' },
  delete_repo: { label: '删除仓库', icon: '🗑️', color: '#cf222e' },
  update_repo: { label: '更新仓库', icon: '✏️', color: '#1a7f37' },
  batch_delete_users: { label: '批量删除用户', icon: '🗑️', color: '#cf222e' },
  batch_delete_repos: { label: '批量删除仓库', icon: '🗑️', color: '#cf222e' },
  delete_discussion: { label: '删除帖子', icon: '🗑️', color: '#cf222e' },
  delete_comment: { label: '删除评论', icon: '🗑️', color: '#cf222e' },
  handle_report: { label: '处理举报', icon: '📋', color: '#bf8700' },
};

// ============ 主组件 ============
interface AdminAuditLogsEnhancedProps {
  logs: AuditLogEntry[];
  logsTotal: number;
  logsPage: number;
  logsLoading: boolean;
  filters: AuditLogFilters;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onResetFilters: () => void;
}

export default function AdminAuditLogsEnhanced({
  logs,
  logsTotal,
  logsPage,
  logsLoading,
  filters,
  onPageChange,
  onFiltersChange,
  onResetFilters,
}: AdminAuditLogsEnhancedProps) {
  // ============ 状态 ============
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'custom'>('7d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [relatedLogs, setRelatedLogs] = useState<AuditLogEntry[]>([]);

  // ============ 统计数据（基于真实数据） ============
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter((log) => new Date(log.createdAt) >= today).length;

    // 按 actionType 分类统计
    const typeCounts: Record<string, number> = {};
    logs.forEach((log) => {
      typeCounts[log.actionType] = (typeCounts[log.actionType] || 0) + 1;
    });

    const userActions = logs.filter((log) =>
      ['update_user', 'delete_user', 'batch_delete_users'].includes(log.actionType)
    ).length;

    const adminActions = logs.filter((log) =>
      ['ban_user', 'unban_user', 'handle_report', 'delete_discussion', 'delete_comment'].includes(log.actionType)
    ).length;

    // 按日期聚合（最近7天）
    const dayCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      dayCounts[key] = 0;
    }
    logs.forEach((log) => {
      const key = new Date(log.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      if (key in dayCounts) {
        dayCounts[key]++;
      }
    });

    const actionsByDay = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

    // 按类型分组
    const typeColorMap: Record<string, string> = {
      update_user: '#0969da', delete_user: '#cf222e', batch_delete_users: '#cf222e',
      ban_user: '#cf222e', unban_user: '#1a7f37',
      delete_repo: '#cf222e', update_repo: '#1a7f37', batch_delete_repos: '#cf222e',
      delete_discussion: '#cf222e', delete_comment: '#cf222e',
      handle_report: '#bf8700',
    };

    const actionsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type: ACTION_TYPES[type]?.label || type,
      count,
      color: typeColorMap[type] || '#656d76',
    }));

    return {
      totalLogs: logsTotal,
      todayLogs,
      userActions,
      adminActions,
      actionsByDay,
      actionsByType,
    };
  }, [logs, logsTotal]);

  // ============ 右键菜单处理 ============
  const handleContextMenu = useCallback((e: React.MouseEvent, log: AuditLogEntry) => {
    e.preventDefault();
    e.stopPropagation();

    const actionConfig = ACTION_TYPES[log.actionType] || { label: log.actionLabel || log.actionType, icon: '📋', color: '#656d76' };

    const menuConfig: ContextMenuConfig = {
      x: e.clientX,
      y: e.clientY,
      title: '📋 日志条目',
      subtitle: `${actionConfig.icon} ${actionConfig.label}`,
      items: [
        {
          label: '查看详情',
          icon: '👁',
          shortcut: 'Enter',
          action: () => {
            setSelectedLog(log);
            loadRelatedLogs(log);
            setShowDetailPanel(true);
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '查看操作者',
          icon: '👤',
          action: () => {
            setToast({ message: `查看用户: @${log.adminUsername}`, type: 'info' });
            setContextMenu(null);
          },
        },
        {
          label: '查看目标',
          icon: '🎯',
          action: () => {
            setToast({ message: `查看目标: ${log.targetType} #${log.targetId}`, type: 'info' });
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '导出此条',
          icon: '📤',
          action: () => {
            const logData = [
              ['日志ID', '时间', '用户', '操作', '目标类型', '目标ID', '详情', 'IP', 'UserAgent'].join(','),
              [
                log.id,
                log.createdAt,
                log.user?.username || 'System',
                log.action,
                log.targetType || '',
                log.targetId || '',
                log.details || '',
                log.ipAddress || '',
                (log.userAgent || '').replace(/,/g, ';'),
              ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
            ].join('\n');
            const blob = new Blob([logData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${log.id}-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setToast({ message: '导出成功', type: 'success' });
            setContextMenu(null);
          },
        },
        {
          label: '复制日志内容',
          icon: '📋',
          shortcut: 'Ctrl+C',
          action: () => {
            navigator.clipboard.writeText(JSON.stringify(log, null, 2));
            setToast({ message: '日志内容已复制', type: 'success' });
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '查看相关日志',
          icon: '🔍',
          action: () => {
            setSelectedLog(log);
            loadRelatedLogs(log);
            setShowDetailPanel(true);
            setContextMenu(null);
          },
        },
      ],
    };

    setContextMenu(menuConfig);
  }, []);

  // ============ 加载关联日志 ============
  const loadRelatedLogs = useCallback((log: AuditLogEntry) => {
    // 从当前日志列表中查找同操作者的其他日志作为关联日志
    const related = logs
      .filter((l) => l.id !== log.id && l.adminUsername === log.adminUsername)
      .slice(0, 5);
    setRelatedLogs(related);
  }, [logs]);

  // ============ 导出日志 ============
  const handleExport = (format: 'csv' | 'json' | 'excel') => {
    setToast({ message: `正在导出 ${format.toUpperCase()} 格式日志...`, type: 'info' });
    setShowExportModal(false);
  };

  // ============ 应用时间筛选 ============
  const applyTimeRange = (range: typeof timeRange) => {
    setTimeRange(range);
    const now = new Date();
    let from: Date;

    switch (range) {
      case 'today':
        from = new Date(now.setHours(0, 0, 0, 0));
        break;
      case '7d':
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    onFiltersChange({
      ...filters,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
    });
  };

  // ============ 渲染 ============
  const totalPages = Math.ceil(logsTotal / 20);

  return (
    <div className="tab-content">
      {/* 页面头部 */}
      <div className="page-header">
        <h1 className="page-title">审计日志</h1>
        <div className="page-actions">
          <div className="time-range-selector">
            <button
              className={`range-btn ${timeRange === 'today' ? 'active' : ''}`}
              onClick={() => applyTimeRange('today')}
            >
              今天
            </button>
            <button
              className={`range-btn ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => applyTimeRange('7d')}
            >
              7天
            </button>
            <button
              className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => applyTimeRange('30d')}
            >
              30天
            </button>
            <button
              className={`range-btn ${timeRange === 'custom' ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilter(true)}
            >
              自定义
            </button>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
            <DownloadIcon /> 导出日志
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="stats-grid audit-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.totalLogs.toLocaleString()}</span>
          <span className="stat-label">总日志数</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.todayLogs}</span>
          <span className="stat-label">今日日志</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.userActions}</span>
          <span className="stat-label">用户操作</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-value">{stats.adminActions}</span>
          <span className="stat-label">管理操作</span>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="charts-grid audit-charts">
        <div className="chart-card">
          <h3 className="chart-title">
            <FileTextIcon /> 日志趋势
          </h3>
          <div className="chart-wrapper">
            <LineChart
              data={stats.actionsByDay.map(d => ({ label: d.date, value: d.count }))}
              width={400}
              height={180}
              color="#0969da"
            />
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">
            操作类型分布
          </h3>
          <div className="chart-wrapper pie-wrapper">
            <PieChart
              data={stats.actionsByType.map(t => ({
                label: t.type,
                value: t.count,
                color: t.color,
              }))}
              size={160}
            />
          </div>
        </div>
      </div>

      {/* 高级筛选 */}
      {showAdvancedFilter && (
        <div className="advanced-filter-panel">
          <div className="filter-row">
            <div className="filter-item">
              <label>开始日期</label>
              <input
                type="date"
                className="form-control"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>结束日期</label>
              <input
                type="date"
                className="form-control"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="filter-item">
              <label>操作类型</label>
              <select
                className="form-select"
                value={filters.action || ''}
                onChange={(e) => onFiltersChange({ ...filters, action: e.target.value || undefined })}
              >
                <option value="">全部</option>
                <option value="user">用户操作</option>
                <option value="content">内容操作</option>
                <option value="penalty">处罚操作</option>
                <option value="system">系统操作</option>
              </select>
            </div>
            <div className="filter-item">
              <label>目标类型</label>
              <select
                className="form-select"
                value={filters.targetType || ''}
                onChange={(e) => onFiltersChange({ ...filters, targetType: e.target.value || undefined })}
              >
                <option value="">全部</option>
                <option value="user">用户</option>
                <option value="repo">仓库</option>
                <option value="discussion">讨论</option>
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                onFiltersChange({
                  ...filters,
                  dateFrom: dateFrom || undefined,
                  dateTo: dateTo || undefined,
                });
                setShowAdvancedFilter(false);
                setToast({ message: '筛选条件已应用', type: 'success' });
              }}
            >
              应用筛选
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                onResetFilters();
                setDateFrom('');
                setDateTo('');
                setShowAdvancedFilter(false);
              }}
            >
              重置
            </button>
          </div>
        </div>
      )}

      {/* 日志列表 */}
      <div className="admin-table-container">
        {logsLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <FileTextIcon />
            <p>暂无日志记录</p>
          </div>
        ) : (
          <>
            <table className="data-table audit-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>时间</th>
                  <th style={{ width: '100px' }}>操作者</th>
                  <th style={{ width: '120px' }}>操作类型</th>
                  <th>详情</th>
                  <th style={{ width: '100px' }}>目标</th>
                  <th style={{ width: '80px' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: AuditLogEntry) => {
                  const actionConfig = ACTION_TYPES[log.actionType] || { label: log.actionLabel || log.actionType, icon: '📋', color: '#656d76' };

                  return (
                    <tr
                      key={log.id}
                      onContextMenu={(e) => handleContextMenu(e, log)}
                      onDoubleClick={() => {
                        setSelectedLog(log);
                        loadRelatedLogs(log);
                        setShowDetailPanel(true);
                      }}
                      className="context-menu-trigger"
                    >
                      <td className="log-time">
                        <span className="time-date">
                          {new Date(log.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="time-hour">
                          {new Date(log.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="log-user">@{log.adminUsername}</td>
                      <td className="log-action">
                        <span style={{ color: actionConfig.color }}>
                          {actionConfig.icon} {actionConfig.label}
                        </span>
                      </td>
                      <td className="log-details">{log.detailsText?.slice(0, 60) || '-'}</td>
                      <td className="log-target">
                        <span className="target-badge">{log.targetType || '-'} {log.targetId ? `#${log.targetId.slice(0, 8)}` : ''}</span>
                      </td>
                      <td className="log-ip"><code>{log.ipAddress || '-'}</code></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-default btn-sm"
                  disabled={logsPage <= 1}
                  onClick={() => onPageChange(logsPage - 1)}
                >
                  上一页
                </button>
                <span className="page-info">
                  第 {logsPage} / {totalPages} 页，共 {logsTotal} 条
                </span>
                <button
                  className="btn btn-default btn-sm"
                  disabled={logsPage >= totalPages}
                  onClick={() => onPageChange(logsPage + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu config={contextMenu} onClose={() => setContextMenu(null)} />
      )}

      {/* 详情侧边栏 */}
      <SidePanel
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        title="日志详情"
        subtitle={selectedLog?.id.slice(0, 8)}
        width={520}
      >
        {selectedLog && (
          <div className="log-detail-content">
            <section className="detail-section">
              <h3 className="section-title">基本信息</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">日志ID</span>
                  <span className="info-value"><code>{selectedLog.id.slice(0, 16)}...</code></span>
                </div>
                <div className="info-item">
                  <span className="info-label">操作者</span>
                  <span className="info-value">@{selectedLog.adminUsername}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">操作类型</span>
                  <span className="info-value">
                    {ACTION_TYPES[selectedLog.actionType]?.icon || '📋'} {ACTION_TYPES[selectedLog.actionType]?.label || selectedLog.actionLabel}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">时间</span>
                  <span className="info-value">
                    {new Date(selectedLog.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </section>

            <section className="detail-section">
              <h3 className="section-title">
                <LinkIcon /> 目标信息
              </h3>
              <div className="target-info-card">
                <div className="target-type">{selectedLog.targetType || '-'}</div>
                <div className="target-id"><code>{selectedLog.targetId || '-'}</code></div>
              </div>
            </section>

            <section className="detail-section">
              <h3 className="section-title">操作详情</h3>
              <div className="detail-content-box">
                <pre>{selectedLog.detailsText || '无详细描述'}</pre>
              </div>
            </section>

            <section className="detail-section">
              <h3 className="section-title">请求信息</h3>
              <div className="request-info">
                <div className="request-item">
                  <span className="request-label">IP地址</span>
                  <span className="request-value"><code>{selectedLog.ipAddress || '-'}</code></span>
                </div>
              </div>
            </section>

            {relatedLogs.length > 0 && (
              <section className="detail-section">
                <h3 className="section-title">关联日志</h3>
                <div className="related-logs">
                  {relatedLogs.map((related) => (
                    <div key={related.id} className="related-log-item">
                      <span className="related-log-action">
                        {ACTION_TYPES[related.actionType]?.icon || '📋'} {ACTION_TYPES[related.actionType]?.label || related.actionLabel}
                      </span>
                      <span className="related-log-time">
                        {new Date(related.createdAt).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </SidePanel>

      {/* 导出弹窗 */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>导出审计日志</h3>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="export-options">
                <div className="export-option" onClick={() => handleExport('csv')}>
                  <div className="option-icon">📊</div>
                  <div className="option-info">
                    <span className="option-title">CSV 格式</span>
                    <span className="option-desc">适合Excel打开和数据分析</span>
                  </div>
                </div>
                <div className="export-option" onClick={() => handleExport('json')}>
                  <div className="option-icon">💻</div>
                  <div className="option-info">
                    <span className="option-title">JSON 格式</span>
                    <span className="option-desc">适合程序接口和备份</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
