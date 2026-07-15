'use client';

import React from 'react';
import { SearchIcon } from './AdminIcons';
import type { ActivityLogItem } from './AdminTypes';
import { formatDate } from '@/lib/utils';
import { Button, Card } from '@/components/design';

// Re-export type for convenience
export type { ActivityLogItem };

export interface AdminActivityLogsEnhancedProps {
  activityLogs: ActivityLogItem[];
  activityLogsTotal?: number;
  activityLogsPage: number;
  activityLogsSearch: string;
  activityLogsAction: string;
  activityLogsStatus: string;
  activityLogsLoading: boolean;
  activityLogStats?: {
    total: number;
    successCount: number;
    failCount: number;
  };
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onRefresh: () => void;
}

const PAGE_SIZE = 20;

// 操作类型中文映射
const ACTION_LABELS: Record<string, string> = {
  upload: '上传文件',
  download: '下载文件',
  delete: '删除文件',
  create_repo: '创建仓库',
  delete_repo: '删除仓库',
  fork: 'Fork 仓库',
  star: 'Star 仓库',
  unstar: '取消 Star',
  create_issue: '创建 Issue',
  close_issue: '关闭 Issue',
  create_pr: '创建合并请求',
  merge_pr: '合并请求已合并',
  create_discussion: '发起讨论',
  login: '用户登录',
  logout: '用户登出',
  register: '用户注册',
  report: '提交举报',
  appeal: '提交申诉',
};

// 目标类型中文映射
const TARGET_TYPE_LABELS: Record<string, string> = {
  file: '文件',
  repo: '仓库',
  discussion: '讨论',
  issue: 'Issue',
  pullrequest: '合并请求',
  comment: '评论',
  user: '用户',
};

// 操作类型对应的颜色
const ACTION_COLORS: Record<string, string> = {
  upload: 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)]',
  download: 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)]',
  delete: 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]',
  delete_repo: 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]',
  create_repo: 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]',
  fork: 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]',
  star: 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]',
  login: 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]',
  register: 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]',
  report: 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]',
  appeal: 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]',
};

export default function AdminActivityLogsEnhanced({
  activityLogs,
  activityLogsTotal,
  activityLogsPage,
  activityLogsSearch,
  activityLogsAction,
  activityLogsStatus,
  activityLogsLoading,
  activityLogStats,
  onPageChange,
  onSearchChange,
  onActionChange,
  onStatusChange,
  onRefresh,
}: AdminActivityLogsEnhancedProps) {
  const totalPages = Math.ceil((activityLogsTotal ?? 0) / PAGE_SIZE);

  // 优先使用传入的统计数据，否则从当前分页数据中计算
  const successCount = activityLogStats?.successCount ?? activityLogs.filter((l) => l.status === 'success').length;
  const failCount = activityLogStats?.failCount ?? activityLogs.filter((l) => l.status !== 'success').length;
  const totalLogCount = activityLogStats?.total ?? activityLogsTotal ?? 0;

  function formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getActionLabel(action: string): string {
    return ACTION_LABELS[action] || action;
  }

  function getActionColorClass(action: string): string {
    return ACTION_COLORS[action] || 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)]';
  }

  function getTargetTypeLabel(type: string): string {
    return TARGET_TYPE_LABELS[type] || type;
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片（增强部分） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="subtle" padding="none" className="p-3">
          <div className="text-xs text-[var(--ds-text-secondary)] mb-1">总日志数</div>
          <div className="text-xl font-bold text-[var(--ds-text-primary)]">{totalLogCount?.toLocaleString() ?? '0'}</div>
        </Card>
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-success-subtle)] border-0">
          <div className="text-xs text-[var(--ds-success-default)] mb-1">本页成功</div>
          <div className="text-xl font-bold text-[var(--ds-success-default)]">{successCount}</div>
        </Card>
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-danger-subtle)] border-0">
          <div className="text-xs text-[var(--ds-danger-default)] mb-1">本页失败</div>
          <div className="text-xl font-bold text-[var(--ds-danger-default)]">{failCount}</div>
        </Card>
        <Card variant="subtle" padding="none" className="p-3">
          <div className="text-xs text-[var(--ds-text-secondary)] mb-1">当前页</div>
          <div className="text-xl font-bold text-[var(--ds-text-primary)]">
            {activityLogsPage} / {Math.max(1, totalPages)}
          </div>
        </Card>
      </div>

      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 搜索框 */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-secondary)]">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="搜索用户名..."
            value={activityLogsSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] outline-none focus:ring-1 focus:ring-[var(--ds-accent-default)] w-44"
          />
        </div>
        {/* 操作类型筛选 */}
        <select
          value={activityLogsAction}
          onChange={(e) => onActionChange(e.target.value)}
          className="py-1.5 px-2 text-sm border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] outline-none"
        >
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {/* 状态筛选 */}
        <select
          value={activityLogsStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="py-1.5 px-2 text-sm border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] outline-none"
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
      </div>

      {/* 日志列表 */}
      {activityLogsLoading ? (
        <div className="text-center py-8 text-[var(--ds-text-secondary)]">加载中...</div>
      ) : activityLogs.length === 0 ? (
        <div className="text-center py-8 text-[var(--ds-text-secondary)]">暂无活动日志</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--ds-border-default)] text-left text-[var(--ds-text-secondary)]">
                <th className="pb-2 pr-4 font-medium">用户</th>
                <th className="pb-2 pr-4 font-medium">操作</th>
                <th className="pb-2 pr-4 font-medium">目标</th>
                <th className="pb-2 pr-4 font-medium">大小</th>
                <th className="pb-2 pr-4 font-medium">IP</th>
                <th className="pb-2 pr-4 font-medium">状态</th>
                <th className="pb-2 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--ds-border-muted)] hover:bg-[var(--ds-surface-subtle)]"
                >
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      {log.user.avatarUrl ? (
                        <img
                          src={log.user.avatarUrl}
                          alt={log.user.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--ds-surface-subtle)] flex items-center justify-center text-xs text-[var(--ds-text-secondary)]">
                          {log.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-[var(--ds-text-primary)] font-medium">
                        {log.user.username}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getActionColorClass(log.action)}`}>
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--ds-text-secondary)]">
                        {getTargetTypeLabel(log.targetType)}
                      </span>
                      {log.targetName && (
                        <span
                          className="text-[var(--ds-text-primary)] text-xs max-w-[140px] truncate"
                          title={log.targetName}
                        >
                          {log.targetName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-[var(--ds-text-secondary)] text-xs">
                    {formatFileSize(log.fileSize)}
                  </td>
                  <td className="py-2 pr-4 text-[var(--ds-text-secondary)] text-xs font-mono">
                    {log.ipAddress || '-'}
                  </td>
                  <td className="py-2 pr-4">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-success-default)] inline-block" />
                        成功
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] cursor-help"
                        title={log.errorMsg || ''}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-danger-default)] inline-block" />
                        失败
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-[var(--ds-text-secondary)] text-xs whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(activityLogsPage - 1)}
            disabled={activityLogsPage <= 1}
          >
            上一页
          </Button>
          <span className="text-sm text-[var(--ds-text-secondary)]">
            {activityLogsPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(activityLogsPage + 1)}
            disabled={activityLogsPage >= totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
