// Admin Panel Common Components
// 增强的管理面板通用组件

'use client';

import React, { useEffect, useRef } from 'react';

// ============ 增强统计卡片 ============
interface EnhancedStatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
    label?: string;
  };
  subtitle?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

export function EnhancedStatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  color = 'default',
  onClick,
}: EnhancedStatCardProps) {
  const trendColors = {
    up: 'var(--color-success-fg)',
    down: 'var(--color-danger-fg)',
    neutral: 'var(--color-fg-muted)',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div
      className={`enhanced-stat-card ${color}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span
            className="stat-card-trend"
            style={{ color: trendColors[trend.type] }}
          >
            {trendIcons[trend.type]} {Math.abs(trend.value)}%
            {trend.label && <span className="trend-label"> {trend.label}</span>}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="stat-card-footer">
          <span className="stat-card-subtitle">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

// ============ 侧滑面板组件 ============
interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
  actions?: React.ReactNode;
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 480,
  actions,
}: SidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // ESC 键关闭
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="side-panel-overlay">
      <div
        ref={panelRef}
        className="side-panel"
        style={{ width }}
      >
        <div className="side-panel-header">
          <div className="side-panel-title-section">
            <h2 className="side-panel-title">{title}</h2>
            {subtitle && <span className="side-panel-subtitle">{subtitle}</span>}
          </div>
          <button
            className="side-panel-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
        <div className="side-panel-content">
          {children}
        </div>
        {actions && (
          <div className="side-panel-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 确认对话框 ============
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  options?: React.ReactNode;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
  onCancel,
  options,
}: ConfirmDialogProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
        </div>
        <div className="dialog-body">
          <p className="dialog-message">{message}</p>
          {options && <div className="dialog-options">{options}</div>}
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Toast 通知 ============
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
      </svg>
    ),
    warning: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 8a8 8 0 1116 0A8 8 0 010 8zm8-6.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM6.5 7.75A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    ),
  };

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </div>
  );
}

// ============ 活动时间线 ============
interface TimelineItem {
  id: string;
  time: string;
  user?: string;
  action: string;
  target?: string;
  type: 'user' | 'system' | 'content' | 'security';
  status?: 'success' | 'warning' | 'danger';
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  maxItems?: number;
  onItemClick?: (item: TimelineItem) => void;
}

export function ActivityTimeline({
  items,
  maxItems = 10,
  onItemClick,
}: ActivityTimelineProps) {
  const displayItems = items.slice(0, maxItems);

  const typeIcons = {
    user: '👤',
    system: '⚙️',
    content: '📝',
    security: '🛡️',
  };

  const statusColors = {
    success: 'var(--color-success-fg)',
    warning: 'var(--color-warning-fg)',
    danger: 'var(--color-danger-fg)',
  };

  if (displayItems.length === 0) {
    return (
      <div className="activity-timeline-empty">
        <p>暂无活动记录</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      {displayItems.map((item, index) => (
        <div
          key={item.id}
          className="timeline-item"
          onClick={() => onItemClick?.(item)}
          style={{ cursor: onItemClick ? 'pointer' : 'default' }}
        >
          <div className="timeline-icon">
            {typeIcons[item.type]}
          </div>
          <div className="timeline-content">
            <div className="timeline-header">
              <span className="timeline-time">{item.time}</span>
              {item.status && (
                <span
                  className="timeline-status"
                  style={{ color: statusColors[item.status] }}
                >
                  {item.status === 'success' ? '✓' : item.status === 'warning' ? '⚠' : '✗'}
                </span>
              )}
            </div>
            <div className="timeline-body">
              {item.user && <span className="timeline-user">@{item.user}</span>}
              <span className="timeline-action">{item.action}</span>
              {item.target && <span className="timeline-target">{item.target}</span>}
            </div>
          </div>
          {index < displayItems.length - 1 && <div className="timeline-line" />}
        </div>
      ))}
    </div>
  );
}

// ============ 高级筛选组件 ============
interface FilterOption {
  label: string;
  value: string;
}

interface AdvancedFilterProps {
  filters: {
    name: string;
    label: string;
    type: 'select' | 'date' | 'text' | 'number';
    options?: FilterOption[];
    placeholder?: string;
  }[];
  values: Record<string, string | number | Date | null>;
  onChange: (name: string, value: string | number | Date | null) => void;
  onApply: () => void;
  onReset: () => void;
}

export function AdvancedFilter({
  filters,
  values,
  onChange,
  onApply,
  onReset,
}: AdvancedFilterProps) {
  return (
    <div className="advanced-filter">
      <div className="filter-fields">
        {filters.map((filter) => (
          <div key={filter.name} className="filter-field">
            <label className="filter-label">{filter.label}</label>
            {filter.type === 'select' ? (
              <select
                className="filter-select"
                value={values[filter.name] as string || ''}
                onChange={(e) => onChange(filter.name, e.target.value)}
              >
                <option value="">全部</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                className="filter-input"
                value={values[filter.name] as string || ''}
                onChange={(e) => onChange(filter.name, e.target.value)}
              />
            ) : filter.type === 'number' ? (
              <input
                type="number"
                className="filter-input"
                placeholder={filter.placeholder}
                value={values[filter.name] as number || ''}
                onChange={(e) => onChange(filter.name, parseInt(e.target.value) || null)}
              />
            ) : (
              <input
                type="text"
                className="filter-input"
                placeholder={filter.placeholder || filter.label}
                value={values[filter.name] as string || ''}
                onChange={(e) => onChange(filter.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="filter-actions">
        <button className="btn btn-primary btn-sm" onClick={onApply}>
          应用筛选
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onReset}>
          重置
        </button>
      </div>
    </div>
  );
}

// ============ 批量操作栏 ============
interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: {
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger';
    onClick: () => void;
  }[];
}

export function BatchActionBar({
  selectedCount,
  onClearSelection,
  actions,
}: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="batch-action-bar">
      <div className="batch-info">
        <span className="batch-count">已选择 {selectedCount} 项</span>
        <button className="batch-clear" onClick={onClearSelection}>
          清除选择
        </button>
      </div>
      <div className="batch-actions">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`btn ${action.variant === 'danger' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
            onClick={action.onClick}
          >
            {action.icon && <span className="btn-icon">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ 组件样式 ============
const Styles = () => (
  <style jsx global>{`
    /* ===== 增强统计卡片 ===== */
    .enhanced-stat-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .enhanced-stat-card:hover {
      border-color: var(--color-border-default);
    }
    .enhanced-stat-card.success { border-left: 3px solid var(--color-success-fg); }
    .enhanced-stat-card.warning { border-left: 3px solid var(--color-attention-fg); }
    .enhanced-stat-card.danger  { border-left: 3px solid var(--color-danger-fg); }
    .enhanced-stat-card.info    { border-left: 3px solid var(--color-accent-fg); }

    .stat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .stat-card-title {
      font-size: 13px;
      color: var(--color-fg-muted);
      font-weight: 500;
    }
    .stat-card-icon {
      color: var(--color-fg-muted);
      display: flex;
      align-items: center;
    }
    .stat-card-body {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .stat-card-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--color-fg-default);
      line-height: 1.2;
    }
    .stat-card-trend {
      font-size: 12px;
      font-weight: 500;
    }
    .trend-label {
      font-size: 11px;
      font-weight: 400;
      color: var(--color-fg-muted);
    }
    .stat-card-footer {
      margin-top: 2px;
    }
    .stat-card-subtitle {
      font-size: 12px;
      color: var(--color-fg-muted);
    }

    /* ===== 确认对话框 ===== */
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(27, 31, 36, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }
    .dialog {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 8px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .dialog-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid var(--color-border-default);
    }
    .dialog-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0;
    }
    .dialog-body {
      padding: 16px 20px;
    }
    .dialog-message {
      font-size: 14px;
      color: var(--color-fg-default);
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .dialog-options {
      margin-top: 12px;
    }
    .dialog-footer {
      padding: 12px 20px 16px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    /* ===== Toast 通知 ===== */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 99999;
      min-width: 280px;
      max-width: 400px;
    }
    .toast-icon { display: flex; align-items: center; flex-shrink: 0; }
    .toast-success .toast-icon { color: var(--color-success-fg); }
    .toast-error   .toast-icon { color: var(--color-danger-fg); }
    .toast-warning .toast-icon { color: var(--color-attention-fg); }
    .toast-info    .toast-icon { color: var(--color-accent-fg); }
    .toast-message {
      flex: 1;
      font-size: 14px;
      color: var(--color-fg-default);
      line-height: 1.4;
    }
    .toast-close {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: var(--color-fg-muted);
      display: flex;
      align-items: center;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .toast-close:hover { color: var(--color-fg-default); background: var(--color-neutral-subtle); }

    /* ===== 活动时间线 ===== */
    .activity-timeline {
      display: flex;
      flex-direction: column;
    }
    .activity-timeline-empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--color-fg-muted);
      font-size: 14px;
    }
    .timeline-item {
      display: flex;
      gap: 12px;
      position: relative;
      padding-bottom: 16px;
    }
    .timeline-icon {
      font-size: 14px;
      flex-shrink: 0;
      width: 20px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 2px;
    }
    .timeline-content {
      flex: 1;
      min-width: 0;
    }
    .timeline-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .timeline-time {
      font-size: 12px;
      color: var(--color-fg-muted);
    }
    .timeline-status {
      font-size: 12px;
      font-weight: 500;
    }
    .timeline-body {
      font-size: 13px;
      color: var(--color-fg-default);
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      line-height: 1.4;
    }
    .timeline-user { font-weight: 500; }
    .timeline-action { color: var(--color-fg-muted); }
    .timeline-target { color: var(--color-accent-fg); }
    .timeline-line {
      position: absolute;
      left: 9px;
      top: 24px;
      bottom: 0;
      width: 2px;
      background: var(--color-border-default);
    }

    /* ===== 批量操作栏 ===== */
    .batch-action-bar {
      position: sticky;
      bottom: 0;
      background: var(--color-canvas-default);
      border-top: 1px solid var(--color-border-default);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      z-index: 100;
    }
    .batch-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .batch-count {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-fg-default);
    }
    .batch-clear {
      font-size: 12px;
      color: var(--color-accent-fg);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .batch-clear:hover { text-decoration: underline; }
    .batch-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `}</style>
);

export { Styles as AdminCommonStyles };
