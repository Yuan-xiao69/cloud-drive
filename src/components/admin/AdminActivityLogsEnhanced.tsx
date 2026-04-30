'use client';

import React from 'react';
import { SearchIcon } from './AdminIcons';
import type { ActivityLogItem } from './AdminTypes';

// Re-export type for convenience
export type { ActivityLogItem };

interface AdminActivityLogsEnhancedProps {
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
  create_pr: '创建 PR',
  merge_pr: '合并 PR',
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
  pullrequest: 'PR',
  comment: '评论',
  user: '用户',
};

// 操作类型对应的颜色
const ACTION_COLORS: Record<string, string> = {
  upload: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  download: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  delete: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  delete_repo: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  create_repo: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  fork: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  star: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  login: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  register: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  report: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  appeal: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
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
  const totalPages = Math.ceil(activityLogsTotal / PAGE_SIZE);

  // 优先使用传入的统计数据，否则从当前分页数据中计算
  const successCount = activityLogStats?.successCount ?? activityLogs.filter((l) => l.status === 'success').length;
  const failCount = activityLogStats?.failCount ?? activityLogs.filter((l) => l.status !== 'success').length;
  const totalLogCount = activityLogStats?.total ?? activityLogsTotal ?? 0;

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

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
    return ACTION_COLORS[action] || 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }

  function getTargetTypeLabel(type: string): string {
    return TARGET_TYPE_LABELS[type] || type;
  }

  return (
    <div className="space-y-4">
      {/* 统计卡片（增强部分） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">总日志数</div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalLogCount?.toLocaleString() ?? '0'}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">本页成功</div>
          <div className="text-xl font-bold text-green-700 dark:text-green-300">{successCount}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <div className="text-xs text-red-600 dark:text-red-400 mb-1">本页失败</div>
          <div className="text-xl font-bold text-red-700 dark:text-red-300">{failCount}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">当前页</div>
          <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
            {activityLogsPage} / {Math.max(1, totalPages)}
          </div>
        </div>
      </div>

      {/* 顶部操作栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 搜索框 */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="搜索用户名..."
            value={activityLogsSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500 w-44"
          />
        </div>
        {/* 操作类型筛选 */}
        <select
          value={activityLogsAction}
          onChange={(e) => onActionChange(e.target.value)}
          className="py-1.5 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
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
          className="py-1.5 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>
      </div>

      {/* 日志列表 */}
      {activityLogsLoading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : activityLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">暂无活动日志</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
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
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                          {log.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-800 dark:text-gray-200 font-medium">
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
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {getTargetTypeLabel(log.targetType)}
                      </span>
                      {log.targetName && (
                        <span
                          className="text-gray-700 dark:text-gray-300 text-xs max-w-[140px] truncate"
                          title={log.targetName}
                        >
                          {log.targetName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 text-xs">
                    {formatFileSize(log.fileSize)}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 text-xs font-mono">
                    {log.ipAddress || '-'}
                  </td>
                  <td className="py-2 pr-4">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        成功
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 cursor-help"
                        title={log.errorMsg || ''}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        失败
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap">
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
          <button
            onClick={() => onPageChange(activityLogsPage - 1)}
            disabled={activityLogsPage <= 1}
            className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">
            {activityLogsPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(activityLogsPage + 1)}
            disabled={activityLogsPage >= totalPages}
            className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
