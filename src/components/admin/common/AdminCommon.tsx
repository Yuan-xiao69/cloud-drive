// Admin Panel Common Components
// 增强的管理面板通用组件

'use client';

import React, { useEffect, useRef } from 'react';
import { Button, Field, Input, Select } from '@/components/design';

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
    up: 'var(--ds-success-default)',
    down: 'var(--ds-danger-default)',
    neutral: 'var(--ds-text-secondary)',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <button
      className={`enhanced-stat-card ${color} border-0 bg-transparent w-full text-left`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs text-[var(--ds-text-secondary)] font-medium">{title}</span>
        {icon && <span className="text-[var(--ds-text-secondary)] flex items-center">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span
            className="text-xs font-medium"
            style={{ color: trendColors[trend.type] }}
          >
            {trendIcons[trend.type]} {Math.abs(trend.value)}%
            {trend.label && <span className="trend-label"> {trend.label}</span>}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-1">
          <span className="text-xs text-[var(--ds-text-secondary)]">{subtitle}</span>
        </div>
      )}
    </button>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </Button>
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
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onCancel();
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog" ref={dialogRef} role="dialog" aria-modal="true">
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
        </div>
        <div className="dialog-body">
          <p className="dialog-message">{message}</p>
          {options && <div className="dialog-options">{options}</div>}
        </div>
        <div className="dialog-footer">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
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
      <Button variant="ghost" size="sm" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
        </svg>
      </Button>
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
    success: 'var(--ds-success-default)',
    warning: 'var(--ds-warning-default)',
    danger: 'var(--ds-danger-default)',
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
        <button
          key={item.id}
          className="timeline-item border-0 bg-transparent w-full text-left"
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
        </button>
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
      <div className="grid grid-cols-3 gap-3">
        {filters.map((filter) => (
          <div key={filter.name} className="flex flex-col gap-1">
            <label htmlFor={`filter-${filter.name}`} className="text-xs text-[var(--ds-text-secondary)]">{filter.label}</label>
            {filter.type === 'select' ? (
              <Select
                value={values[filter.name] as string || ''}
                onChange={(e) => onChange(filter.name, e.target.value)}
                options={[
                  { value: '', label: '全部' },
                  ...(filter.options?.map((opt) => ({ value: opt.value, label: opt.label })) || []),
                ]}
              />
            ) : filter.type === 'date' ? (
              <Input
                type="date"
                value={values[filter.name] as string || ''}
                onChange={(e) => onChange(filter.name, e.target.value)}
              />
            ) : filter.type === 'number' ? (
              <Input
                type="number"
                placeholder={filter.placeholder}
                value={values[filter.name] as number || ''}
                onChange={(e) => onChange(filter.name, parseInt(e.target.value) || null)}
              />
            ) : (
              <Input
                type="text"
                placeholder={filter.placeholder || filter.label}
                value={values[filter.name] as string || ''}
                onChange={(e) => onChange(filter.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="primary" size="sm" onClick={onApply}>
          应用筛选
        </Button>
        <Button variant="secondary" size="sm" onClick={onReset}>
          重置
        </Button>
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
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          清除选择
        </Button>
      </div>
      <div className="flex gap-2 items-center">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant === 'danger' ? 'danger' : 'secondary'}
            size="sm"
            onClick={action.onClick}
          >
            {action.icon && <span className="inline-flex items-center justify-center">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ============ 组件样式（模块级注入，确保样式始终生效） ============
if (typeof document !== 'undefined') {
  const STYLE_ID = 'admin-common-global-styles';
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      /* ===== 增强统计卡片 ===== */
      .enhanced-stat-card {
        background: var(--ds-page-bg);
        border: 1px solid var(--ds-border-default);
        border-radius: 6px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .enhanced-stat-card:hover {
        border-color: var(--ds-border-default);
      }
      .enhanced-stat-card.success { border-left: 3px solid var(--ds-success-default); }
      .enhanced-stat-card.warning { border-left: 3px solid var(--ds-warning-default); }
      .enhanced-stat-card.danger  { border-left: 3px solid var(--ds-danger-default); }
      .enhanced-stat-card.info    { border-left: 3px solid var(--ds-accent-default); }

      /* ===== 侧滑面板 ===== */
      .side-panel-overlay {
        position: fixed;
        inset: 0;
        background: rgba(27, 31, 36, 0.5);
        display: flex;
        justify-content: flex-end;
        z-index: 9998;
      }
      .side-panel {
        background: var(--ds-page-bg);
        border-left: 1px solid var(--ds-border-default);
        height: 100%;
        overflow-y: auto;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
      }
      .side-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid var(--ds-border-default);
        position: sticky;
        top: 0;
        background: var(--ds-page-bg);
        z-index: 10;
      }
      .side-panel-title-section { display: flex; flex-direction: column; gap: 2px; }
      .side-panel-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--ds-text-primary);
        margin: 0;
      }
      .side-panel-subtitle {
        font-size: 12px;
        color: var(--ds-text-secondary);
      }
      .side-panel-content {
        padding: 20px;
      }
      .side-panel-actions {
        padding: 16px 20px;
        border-top: 1px solid var(--ds-border-default);
        display: flex;
        gap: 8px;
        position: sticky;
        bottom: 0;
        background: var(--ds-page-bg);
      }

      /* ===== 高级筛选 ===== */
      .advanced-filter {
        background: var(--ds-page-bg);
        border: 1px solid var(--ds-border-default);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
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
        background: var(--ds-page-bg);
        border: 1px solid var(--ds-border-default);
        border-radius: 8px;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
      }
      .dialog-header {
        padding: 16px 20px 12px;
        border-bottom: 1px solid var(--ds-border-default);
      }
      .dialog-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--ds-text-primary);
        margin: 0;
      }
      .dialog-body {
        padding: 16px 20px;
      }
      .dialog-message {
        font-size: 14px;
        color: var(--ds-text-primary);
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
        background: var(--ds-page-bg);
        border: 1px solid var(--ds-border-default);
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
      .toast-success .toast-icon { color: var(--ds-success-default); }
      .toast-error   .toast-icon { color: var(--ds-danger-default); }
      .toast-warning .toast-icon { color: var(--ds-warning-default); }
      .toast-info    .toast-icon { color: var(--ds-accent-default); }
      .toast-message {
        flex: 1;
        font-size: 14px;
        color: var(--ds-text-primary);
        line-height: 1.4;
      }
      .toast-close {
        background: none;
        border: none;
        padding: 2px;
        cursor: pointer;
        color: var(--ds-text-secondary);
        display: flex;
        align-items: center;
        border-radius: 4px;
        flex-shrink: 0;
      }
      .toast-close:hover { color: var(--ds-text-primary); background: var(--ds-surface-subtle); }

      /* ===== 活动时间线 ===== */
      .activity-timeline {
        display: flex;
        flex-direction: column;
      }
      .activity-timeline-empty {
        text-align: center;
        padding: 32px 16px;
        color: var(--ds-text-secondary);
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
        color: var(--ds-text-secondary);
      }
      .timeline-status {
        font-size: 12px;
        font-weight: 500;
      }
      .timeline-body {
        font-size: 13px;
        color: var(--ds-text-primary);
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        line-height: 1.4;
      }
      .timeline-user { font-weight: 500; }
      .timeline-action { color: var(--ds-text-secondary); }
      .timeline-target { color: var(--ds-accent-default); }
      .timeline-line {
        position: absolute;
        left: 9px;
        top: 24px;
        bottom: 0;
        width: 2px;
        background: var(--ds-border-default);
      }

      /* ===== 批量操作栏 ===== */
      .batch-action-bar {
        position: sticky;
        bottom: 0;
        background: var(--ds-page-bg);
        border-top: 1px solid var(--ds-border-default);
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
        color: var(--ds-text-primary);
      }
    `;
    document.head.appendChild(styleEl);
  }
}
