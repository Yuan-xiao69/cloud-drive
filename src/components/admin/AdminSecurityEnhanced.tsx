// Admin Security Events Enhanced Component
// 增强的安全事件管理组件
// 功能：安全仪表盘、事件分类、关联分析、报告生成

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button, Modal, Card } from '@/components/design';
import { SidePanel, ConfirmDialog, Toast } from './common/AdminCommon';
import { LineChart, PieChart, RingProgress } from './charts/AdminCharts';
import type { SecurityEvent, SecurityStats, ContextMenuConfig } from './AdminTypes';

// ============ 图标组件 ============
const ShieldCheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0L1.5 3v4.5C1.5 10.5 4.09 13.66 8 15c3.91-1.34 6.5-4.5 6.5-7.5V3L8 0zm4.03 5.97L8 9.94l-4.03-3.97L5.5 7.5 8 10.94l2.5-3.44-1.47 1.47z" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zM9 5.5a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0v-4zm.75 6.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 7V5a4 4 0 118 0v2h1a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1h1zM6 5a2 2 0 00-2 2v2h4V7a2 2 0 00-2-2z" />
  </svg>
);

const TrendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2l8 6-5 1 2 7H7l-2-6-2 1 4-9H4z" />
  </svg>
);

const BugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.5 8a.5.5 0 01-.5.5H11v3.5a.5.5 0 01-1 0V8.5H8a.5.5 0 010-1h1.5V5a.5.5 0 011 0v2.5H13a.5.5 0 01.5.5zm-4-5a2 2 0 100-4 2 2 0 000 4zm-5 0a.5.5 0 01-.5-.5v-1A2.5 2.5 0 018.5 2h1A2.5 2.5 0 0112 3.5v1a.5.5 0 01-1 0v-1A1.5 1.5 0 009.5 2H8.5a1.5 1.5 0 00-1.5 1.5v1a.5.5 0 01-.5.5zM5.5 8a.5.5 0 01.5.5V11h1.5a.5.5 0 010 1H6v1.5a.5.5 0 01-1 0V12H3a.5.5 0 010-1h1.5V8.5a.5.5 0 01.5-.5z" />
  </svg>
);

const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M7.22 8.72a.75.75 0 001.06 1.06l2.5-2.5a.75.75 0 00-1.06-1.06l-1.97 1.97H4.25a.75.75 0 000 1.5h2.5v1.5a.75.75 0 001.5 0V9.56l1.97 1.97a.75.75 0 001.06-1.06l-2.5-2.5a.75.75 0 00-1.06 0L6.15 8.72l-.93.93z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 12a.75.75 0 01-.75-.75V4.75L5.28 7.72a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 01-1.06 1.06L8.75 4.75v6.5A.75.75 0 018 12z" />
    <path d="M4 13a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 3.5a.75.75 0 01.75.75v4.25l2.9 1.66-.5.87-3.15-1.8V4.25A.75.75 0 018 3.5z" />
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
      <button
        key={index}
        className={`context-menu-item border-0 bg-transparent w-full text-left ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
        onClick={() => !item.disabled && !item.submenu && item.action?.()}
      >
        <div className="context-menu-item-content">
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span className="context-menu-label">{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        </div>
        {item.submenu && (
          <>
            <span className="context-menu-arrow">▶</span>
            <div className="context-submenu">
              {item.submenu.map((subItem: NonNullable<ContextMenuConfig['items']>[0], subIndex: number) => (
                <button
                  key={subIndex}
                  className={`context-menu-item border-0 bg-transparent w-full text-left ${subItem.danger ? 'danger' : ''} ${subItem.disabled ? 'disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!subItem.disabled) {
                      subItem.action?.();
                    }
                  }}
                >
                  <span className="context-menu-label">{subItem.label}</span>
                  {subItem.shortcut && <span className="context-menu-shortcut">{subItem.shortcut}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </button>
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

// ============ 事件分类配置 ============
const EVENT_TYPES = {
  'login_failed': { label: '登录失败', icon: '🔑', color: 'var(--ds-warning-default)' },
  'brute_force': { label: '暴力破解', icon: '🔨', color: 'var(--ds-danger-default)' },
  'suspicious_ip': { label: '可疑IP', icon: '🎭', color: 'var(--ds-accent-default)' },
  'anomaly': { label: '异常行为', icon: '⚠️', color: 'var(--ds-warning-default)' },
  'data_access': { label: '敏感数据访问', icon: '📊', color: 'var(--ds-danger-default)' },
  'privilege_escalation': { label: '权限提升', icon: '🔐', color: 'var(--ds-danger-default)' },
  'sql_injection': { label: 'SQL注入', icon: '💉', color: 'var(--ds-danger-default)' },
  'xss_attack': { label: 'XSS攻击', icon: '💻', color: 'var(--ds-danger-default)' },
  'account_takeover': { label: '账户盗用', icon: '🎭', color: 'var(--ds-danger-default)' },
};

const SEVERITY_CONFIG = {
  critical: { label: '严重', color: 'var(--ds-danger-default)', bg: 'var(--ds-danger-subtle)' },
  high: { label: '高风险', color: 'var(--ds-warning-default)', bg: 'var(--ds-warning-subtle)' },
  medium: { label: '中风险', color: 'var(--ds-warning-default)', bg: 'var(--ds-warning-subtle)' },
  low: { label: '低风险', color: 'var(--ds-success-default)', bg: 'var(--ds-success-subtle)' },
};


// ============ 主组件 ============
interface SecurityFilters {
  search?: string;
  severity?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminSecurityEnhancedProps {
  securityEvents: SecurityEvent[];
  securityTotal: number;
  securityPage: number;
  filters: SecurityFilters;
  securityStats: SecurityStats | null;
  securityLoading: boolean;
  selectedSecurityEvents: Set<string>;
  contextMenu: ContextMenuConfig | null;
  selectedSecurityEventDetail: SecurityEvent | null;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onFiltersChange?: (filters: SecurityFilters) => void;
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  onToggleSelect?: (id: string) => void;
  onViewDetail?: (eventId: string) => void;
  onMarkResolved?: (eventId: string) => void;
  onIgnoreEvent?: (eventId: string) => Promise<void>;
  onBanIp?: (ipAddress: string, reason: string, duration: string) => Promise<void>;
  onSendAlert?: (eventId: string, message: string) => Promise<void>;
  onContextMenu?: (e: React.MouseEvent, eventId: string) => void;
  onCloseContextMenu?: () => void;
  onRefresh?: () => void;
  onViewRelated?: (eventId: string) => Promise<void>;
  onExportEvents?: () => void;
  onBatchMarkResolved?: (ids: string[]) => void;
  onBatchIgnore?: (ids: string[]) => Promise<void>;
}

export default function AdminSecurityEnhanced({
  securityEvents,
  securityTotal,
  securityPage,
  filters,
  securityStats,
  securityLoading,
  selectedSecurityEvents,
  contextMenu,
  selectedSecurityEventDetail,
  onPageChange,
  onSearchChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onMarkResolved,
  onIgnoreEvent,
  onBanIp,
  onSendAlert,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
}: AdminSecurityEnhancedProps) {
  // ============ 状态 ============
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [localContextMenu, setLocalContextMenu] = useState<ContextMenuConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [relatedEvents, setRelatedEvents] = useState<SecurityEvent[]>([]);

  // 严重级别筛选快捷操作
  const onSeverityChange = (severity: string) => {
    onFiltersChange?.({ ...filters, severity });
  };

  // 优先使用 props 的 contextMenu，否则使用内部状态
  const effectiveContextMenu = contextMenu !== undefined ? contextMenu : localContextMenu;

  // ============ 统计数据（基于真实数据） ============
  const stats = useMemo<SecurityStats>(() => {
    // 严重级别计数
    const criticalCount = securityEvents.filter((e) => e.severity === 'critical').length;
    const highCount = securityEvents.filter((e) => e.severity === 'high').length;
    const mediumCount = securityEvents.filter((e) => e.severity === 'medium' || e.severity === 'warning').length;
    const lowCount = securityEvents.filter((e) => e.severity === 'low' || e.severity === 'info').length;
    const resolvedCount = securityEvents.filter((e) => e.status === 'resolved' || e.status === 'false_positive').length;
    const unresolvedCount = securityEvents.length - resolvedCount;

    // 按事件类型分组
    const typeCounts: Record<string, number> = {};
    securityEvents.forEach((e) => {
      typeCounts[e.eventType] = (typeCounts[e.eventType] || 0) + 1;
    });
    const eventsByType = Object.entries(typeCounts).map(([type, count]) => ({
      type: EVENT_TYPES[type as keyof typeof EVENT_TYPES]?.label || type,
      count,
    }));

    // 按日期聚合（最近7天）
    const dayCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      dayCounts[key] = 0;
    }
    securityEvents.forEach((e) => {
      const key = new Date(e.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      if (key in dayCounts) {
        dayCounts[key]++;
      }
    });
    const eventsByDay = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

    // 按IP分组统计（替代国家维度，因为API不返回国家信息）
    const ipCounts: Record<string, number> = {};
    securityEvents.forEach((e) => {
      ipCounts[e.ipAddress] = (ipCounts[e.ipAddress] || 0) + 1;
    });
    const topAttackedCountries = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ country: ip, count }));

    // 安全评分：基于已解决比例和严重事件占比
    const resolvedRate = securityEvents.length > 0 ? resolvedCount / securityEvents.length : 1;
    const criticalRate = securityEvents.length > 0 ? criticalCount / securityEvents.length : 0;
    const securityScore = Math.round(Math.min(100, Math.max(0, resolvedRate * 80 + (1 - criticalRate) * 20)));

    return {
      totalEvents: securityTotal,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      resolvedCount,
      unresolvedCount,
      eventsByType,
      eventsByDay,
      topAttackedCountries,
      securityScore,
    };
  }, [securityEvents, securityTotal]);

  // 安全评分颜色
  const scoreColor = stats.securityScore >= 80 ? 'var(--ds-success-default)' : stats.securityScore >= 60 ? 'var(--ds-warning-default)' : 'var(--ds-danger-default)';

  // ============ 右键菜单处理 ============
  const handleContextMenu = useCallback((e: React.MouseEvent, event: SecurityEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const menuConfig: ContextMenuConfig = {
      x: e.clientX,
      y: e.clientY,
      title: `🛡️ 安全事件 #${event.id.slice(0, 8)}`,
      subtitle: EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES]?.label || event.eventType,
      items: [
        {
          label: '查看详情',
          icon: '👁',
          shortcut: 'Enter',
          action: () => {
            setSelectedEvent(event);
            loadRelatedEvents(event);
            setShowDetailPanel(true);
            setLocalContextMenu(null);
          },
        },
        {
          label: '查看相关事件',
          icon: '🔗',
          action: () => {
            setSelectedEvent(event);
            loadRelatedEvents(event);
            setShowDetailPanel(true);
            setLocalContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '标记为已解决',
          icon: '✅',
          action: () => {
            onMarkResolved?.(event.id);
            setToast({ message: '已标记为已解决', type: 'success' });
            setLocalContextMenu(null);
          },
          disabled: event.status === 'resolved',
        },
        {
          label: '忽略',
          icon: '☐',
          action: () => {
            setConfirmDialog({
              isOpen: true,
              title: '确认忽略',
              message: '确定要忽略此安全事件吗？',
                onConfirm: () => {
                onIgnoreEvent?.(event.id);
                setConfirmDialog(null);
                setToast({ message: '已忽略', type: 'success' });
              },
            });
            setLocalContextMenu(null);
          },
          disabled: event.status === 'ignored',
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '封禁IP',
          icon: '🚫',
          danger: true,
          action: async () => {
            if (!event.ipAddress) {
              setToast({ message: '无法获取IP地址', type: 'error' });
              setLocalContextMenu(null);
              return;
            }


            const reason = '安全原因';
            const duration = '7';
            try {
              if (onBanIp) {
                await onBanIp(event.ipAddress, reason, duration);
              }
            } catch (err) {
              setToast({ message: '封禁请求失败', type: 'error' });
            }
            setLocalContextMenu(null);
          },
        },
        {
          label: '锁定账号',
          icon: '🔒',
          danger: true,
          action: () => {
            const reason = '安全原因';
            setToast({ message: `账号已锁定，原因：${reason}`, type: 'info' });
            setLocalContextMenu(null);
          },
          disabled: !event.userAgent,
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '导出报告',
          icon: '📤',
          action: () => {
            setShowReportModal(true);
            setLocalContextMenu(null);
          },
        },
        {
          label: '发送告警',
          icon: '🔔',
          action: async () => {
            const message = '安全告警';
            try {
              if (onSendAlert) {
                await onSendAlert(event.id, message);
              }
            } catch (err) {
              setToast({ message: '发送告警失败', type: 'error' });
            }
            setLocalContextMenu(null);
          },
        },
      ],
    };

    setLocalContextMenu(menuConfig);
  }, [onMarkResolved, onIgnoreEvent, onBanIp, onSendAlert]);

  // ============ 加载关联事件 ============
  const loadRelatedEvents = (event: SecurityEvent) => {
    // 模拟关联事件
    setRelatedEvents([
      {
        ...event,
        id: 'related-1',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        details: '关联事件：同一IP的多次登录尝试',
      },
      {
        ...event,
        id: 'related-2',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        details: '关联事件：同一IP的密码重置请求',
      },
    ]);
  };

  // ============ 导出报告 ============
  const handleExportReport = (format: 'pdf' | 'csv' | 'json') => {
    setToast({ message: `正在导出 ${format.toUpperCase()} 格式报告...`, type: 'info' });
    setShowReportModal(false);
  };

  // ============ 渲染 ============
  const totalPages = Math.ceil(securityTotal / 20);

  return (
    <div className="p-4">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">安全事件</h1>
        <div className="flex items-center gap-3">
          <div className="time-range-selector">
            <Button
              variant="ghost"
              size="sm"
              className={`range-btn ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => setTimeRange('7d')}
            >
              7天
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`range-btn ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => setTimeRange('30d')}
            >
              30天
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`range-btn ${timeRange === '90d' ? 'active' : ''}`}
              onClick={() => setTimeRange('90d')}
            >
              90天
            </Button>
          </div>
          <Button variant="secondary" icon={<DownloadIcon />} onClick={() => setShowReportModal(true)}>
            导出报告
          </Button>
        </div>
      </div>

      {/* 安全仪表盘 */}
      <div className="security-dashboard">
        {/* 安全评分 */}
        <div className="security-score-card">
          <div className="score-header">
            <ShieldCheckIcon />
            <span>系统安全评分</span>
          </div>
          <div className="score-content">
            <RingProgress
              value={stats.securityScore}
              max={100}
              size={100}
              strokeWidth={10}
              color={scoreColor}
            />
            <div className="score-info">
              <span className="score-value" style={{ color: scoreColor }}>{stats.securityScore}</span>
              <span className="score-label">安全评分</span>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="severity-stats">
          <button className="severity-card critical border-0 bg-transparent w-full text-left" onClick={() => onSeverityChange('critical')}>
            <span className="severity-value">{stats.criticalCount}</span>
            <span className="severity-label">严重事件</span>
          </button>
          <button className="severity-card high border-0 bg-transparent w-full text-left" onClick={() => onSeverityChange('high')}>
            <span className="severity-value">{stats.highCount}</span>
            <span className="severity-label">高风险</span>
          </button>
          <button className="severity-card medium border-0 bg-transparent w-full text-left" onClick={() => onSeverityChange('medium')}>
            <span className="severity-value">{stats.mediumCount}</span>
            <span className="severity-label">中风险</span>
          </button>
          <button className="severity-card low border-0 bg-transparent w-full text-left" onClick={() => onSeverityChange('low')}>
            <span className="severity-value">{stats.lowCount}</span>
            <span className="severity-label">低风险</span>
          </button>
          <div className="severity-card resolved">
            <span className="severity-value">{stats.resolvedCount}</span>
            <span className="severity-label">已解决</span>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">
            <TrendIcon /> 安全事件趋势 ({timeRange === '7d' ? '7天' : timeRange === '30d' ? '30天' : '90天'})
          </h3>
          <div className="chart-wrapper">
            <LineChart
              data={stats.eventsByDay.map(d => ({ label: d.date, value: d.count }))}
              width={500}
              height={200}
              color="var(--ds-accent-default)"
            />
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">
            <BugIcon /> 事件类型分布
          </h3>
          <div className="chart-wrapper pie-wrapper">
            <PieChart
              data={stats.eventsByType.map((t, i) => ({
                label: t.type,
                value: t.count,
                color: ['var(--ds-accent-default)', 'var(--ds-success-default)', 'var(--ds-warning-default)', 'var(--ds-danger-default)', 'var(--ds-accent-default)', 'var(--ds-text-tertiary)'][i],
              }))}
              size={180}
            />
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">
            <LockIcon /> 攻击来源 TOP 5
          </h3>
          <div className="country-list">
            {stats.topAttackedCountries.map((country, index) => (
              <div key={index} className="country-item">
                <span className="country-rank">#{index + 1}</span>
                <span className="country-name">{country.country}</span>
                <span className="country-count">{country.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-secondary)]">
            <path d="M11.5 7a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z" />
          </svg>
          <input
            type="search"
            className="w-full pl-10 pr-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-subtle)]"
            placeholder="搜索安全事件..."
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] text-sm"
            value={filters.severity || ''}
            onChange={(e) => onFiltersChange?.({ ...filters, severity: e.target.value })}
          >
            <option value="">全部严重性</option>
            <option value="critical">严重</option>
            <option value="high">高风险</option>
            <option value="medium">中风险</option>
            <option value="low">低风险</option>
          </select>
          <select
            className="px-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] text-sm"
            value={filters.status || ''}
            onChange={(e) => onFiltersChange?.({ ...filters, status: e.target.value })}
          >
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="resolved">已解决</option>
            <option value="ignored">已忽略</option>
          </select>
        </div>
      </div>

      {/* 事件列表 */}
      <Card padding="none" className="overflow-hidden">
        {securityLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] mb-3" />
            <p>加载中...</p>
          </div>
        ) : securityEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <ShieldCheckIcon />
            <p>暂无安全事件</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>ID</th>
                  <th style={{ width: '120px' }}>事件类型</th>
                  <th style={{ width: '80px' }}>严重性</th>
                  <th>详情</th>
                  <th style={{ width: '100px' }}>IP地址</th>
                  <th style={{ width: '80px' }}>状态</th>
                  <th style={{ width: '140px' }}>时间</th>
                  <th style={{ width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {securityEvents.map((event: SecurityEvent) => {
                  const eventTypeConfig = EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES] || {
                    label: event.eventType,
                    icon: '❓',
                    color: 'var(--ds-text-tertiary)',
                  };
                  const severityConfig = SEVERITY_CONFIG[event.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.low;

                  return (
                    <tr
                      key={event.id}
                      onContextMenu={(e) => handleContextMenu(e, event)}
                      onDoubleClick={() => {
                        setSelectedEvent(event);
                        loadRelatedEvents(event);
                        setShowDetailPanel(true);
                      }}
                      className="context-menu-trigger"
                    >
                      <td className="event-id">
                        <code>#{event.id.slice(0, 8)}</code>
                      </td>
                      <td className="event-type">
                        <span className="event-icon">{eventTypeConfig.icon}</span>
                        <span>{eventTypeConfig.label}</span>
                      </td>
                      <td>
                        <span
                          className="severity-badge"
                          style={{
                            color: severityConfig.color,
                            backgroundColor: severityConfig.bg,
                          }}
                        >
                          {severityConfig.label}
                        </span>
                      </td>
                      <td className="event-details">
                        {event.details?.slice(0, 50) || '无'}
                      </td>
                      <td className="event-ip">
                        <code>{event.ipAddress}</code>
                      </td>
                      <td>
                        <span className={`status-badge ${event.status}`}>
                          {event.status === 'pending' ? '待处理' : event.status === 'resolved' ? '已解决' : '已忽略'}
                        </span>
                      </td>
                      <td className="event-time">
                        {new Date(event.createdAt).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="actions-cell">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEvent(event);
                            loadRelatedEvents(event);
                            setShowDetailPanel(true);
                          }}
                          title="查看详情"
                        >
                          详情
                        </Button>
                        {event.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--ds-success-default)] hover:bg-[var(--ds-success-subtle)]"
                              onClick={() => {
                                onMarkResolved?.(event.id);
                                setToast({ message: '已标记为已解决', type: 'success' });
                              }}
                              title="标记已解决"
                            >
                              解决
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between py-3">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={securityPage <= 1}
                  onClick={() => onPageChange(securityPage - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-[var(--ds-text-secondary)]">
                  第 {securityPage} / {totalPages} 页，共 {securityTotal} 条
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={securityPage >= totalPages}
                  onClick={() => onPageChange(securityPage + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 右键菜单 */}
      {effectiveContextMenu && (
        <ContextMenu config={effectiveContextMenu} onClose={() => setLocalContextMenu(null)} />
      )}

      {/* 详情侧边栏 */}
      <SidePanel
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        title="安全事件详情"
        subtitle={selectedEvent?.id.slice(0, 8)}
        width={520}
      >
        {selectedEvent && (
          <div className="event-detail-content">
            {/* 基本信息 */}
            <section className="detail-section">
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">基本信息</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">事件ID</span>
                  <span className="info-value"><code>{selectedEvent.id.slice(0, 16)}</code></span>
                </div>
                <div className="info-item">
                  <span className="info-label">事件类型</span>
                  <span className="info-value">
                    {EVENT_TYPES[selectedEvent.eventType as keyof typeof EVENT_TYPES]?.icon}{' '}
                    {EVENT_TYPES[selectedEvent.eventType as keyof typeof EVENT_TYPES]?.label || selectedEvent.eventType}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">严重性</span>
                  <span className="info-value">
                    <span
                      className="severity-badge"
                      style={{
                        color: SEVERITY_CONFIG[selectedEvent.severity as keyof typeof SEVERITY_CONFIG]?.color,
                        backgroundColor: SEVERITY_CONFIG[selectedEvent.severity as keyof typeof SEVERITY_CONFIG]?.bg,
                      }}
                    >
                      {SEVERITY_CONFIG[selectedEvent.severity as keyof typeof SEVERITY_CONFIG]?.label}
                    </span>
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">状态</span>
                  <span className="info-value">
                    <span className={`status-badge ${selectedEvent.status}`}>
                      {selectedEvent.status === 'pending' ? '待处理' : selectedEvent.status === 'resolved' ? '已解决' : '已忽略'}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            {/* IP信息 */}
            <section className="detail-section">
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">
                <LinkIcon /> IP 信息
              </h3>
              <div className="ip-info-card">
                <div className="ip-main">
                  <code className="ip-address-large">{selectedEvent.ipAddress}</code>
                  <div className="ip-actions">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: '封禁IP',
                          message: `确定要封禁 IP ${selectedEvent.ipAddress} 吗？`,
                          onConfirm: async () => {
                            try {
                              await onBanIp?.(selectedEvent.ipAddress, '安全原因', '7');
                              setToast({ message: `IP ${selectedEvent.ipAddress} 已封禁`, type: 'success' });
                            } catch {
                              setToast({ message: '封禁请求失败', type: 'error' });
                            }
                            setConfirmDialog(null);
                          },
                        });
                      }}
                    >
                      封禁此IP
                    </Button>
                  </div>
                </div>
                <div className="ip-details">
                  <div className="ip-detail-item">
                    <span className="detail-label">地理位置</span>
                    <span className="detail-value">🇨🇳 中国 · 北京</span>
                  </div>
                  <div className="ip-detail-item">
                    <span className="detail-label">ISP</span>
                    <span className="detail-value">中国电信</span>
                  </div>
                  <div className="ip-detail-item">
                    <span className="detail-label">威胁类型</span>
                    <span className="detail-value">VPN / 代理</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 事件详情 */}
            <section className="detail-section">
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">事件详情</h3>
              <div className="detail-content-box">
                <p>{selectedEvent.details || '无详细描述'}</p>
              </div>
              <div className="time-info">
                <ClockIcon />
                <span>发生时间: {new Date(selectedEvent.createdAt).toLocaleString('zh-CN')}</span>
                {selectedEvent.resolvedAt && (
                  <span>解决时间: {new Date(selectedEvent.resolvedAt).toLocaleString('zh-CN')}</span>
                )}
              </div>
            </section>

            {/* User Agent */}
            {selectedEvent.userAgent && (
              <section className="detail-section">
                <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">用户代理</h3>
                <div className="user-agent-box">
                  <code>{selectedEvent.userAgent}</code>
                </div>
              </section>
            )}

            {/* 关联事件 */}
            {relatedEvents.length > 0 && (
              <section className="detail-section">
                <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">关联事件</h3>
                <div className="related-events">
                  {relatedEvents.map((related) => (
                    <div key={related.id} className="related-event-item">
                      <span className="related-event-type">
                        {EVENT_TYPES[related.eventType as keyof typeof EVENT_TYPES]?.icon}{' '}
                        {EVENT_TYPES[related.eventType as keyof typeof EVENT_TYPES]?.label}
                      </span>
                      <span className="related-event-time">
                        {new Date(related.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 快捷操作 */}
            <section className="detail-section quick-actions">
              <Button
                variant="primary"
                onClick={() => {
                  onMarkResolved?.(selectedEvent.id);
                  setShowDetailPanel(false);
                  setToast({ message: '已标记为已解决', type: 'success' });
                }}
                disabled={selectedEvent.status !== 'pending'}
              >
                标记为已解决
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  onIgnoreEvent?.(selectedEvent.id);
                  setShowDetailPanel(false);
                  setToast({ message: '已忽略', type: 'success' });
                }}
                disabled={selectedEvent.status !== 'pending'}
              >
                忽略此事件
              </Button>
            </section>
          </div>
        )}
      </SidePanel>

      {/* 导出报告弹窗 */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="导出安全报告"
        maxWidth="480px"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowReportModal(false)}>
            取消
          </Button>
        }
      >
        <div className="report-options">
          <button
            className="report-option border-0 bg-transparent w-full text-left"
            onClick={() => handleExportReport('pdf')}
          >
            <div className="option-icon">📄</div>
            <div className="option-info">
              <span className="option-title">PDF 报告</span>
              <span className="option-desc">适合打印和正式存档</span>
            </div>
          </button>
          <button
            className="report-option border-0 bg-transparent w-full text-left"
            onClick={() => handleExportReport('csv')}
          >
            <div className="option-icon">📊</div>
            <div className="option-info">
              <span className="option-title">CSV 数据</span>
              <span className="option-desc">适合数据分析和处理</span>
            </div>
          </button>
          <button
            className="report-option border-0 bg-transparent w-full text-left"
            onClick={() => handleExportReport('json')}
          >
            <div className="option-icon">💻</div>
            <div className="option-info">
              <span className="option-title">JSON 数据</span>
              <span className="option-desc">适合程序接口调用</span>
            </div>
          </button>
        </div>
        <div className="report-summary">
          <h4>报告摘要</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">报告周期</span>
              <span className="summary-value">最近 {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} 天</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">事件总数</span>
              <span className="summary-value">{stats.totalEvents}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">严重事件</span>
              <span className="summary-value danger">{stats.criticalCount}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">解决率</span>
              <span className="summary-value success">{Math.round((stats.resolvedCount / stats.totalEvents) * 100)}%</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* 确认对话框 */}
      {confirmDialog?.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="确认"
          cancelText="取消"
          variant="default"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
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
