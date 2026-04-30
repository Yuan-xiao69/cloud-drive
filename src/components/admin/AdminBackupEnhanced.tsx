'use client';

import React, { useState } from 'react';
import { DatabaseIcon, RefreshIcon, XIcon } from './AdminIcons';
import type { BackupFile, BackupStats } from './AdminTypes';

// Re-export types for convenience
export type { BackupFile, BackupStats };

interface AdminBackupFormData {
  compress: boolean;
  retainDays: number;
}

interface AdminBackupEnhancedProps {
  backupFiles: BackupFile[];
  backupLoading: boolean;
  backupCreating: boolean;
  backupStats: BackupStats | null;
  showBackupModal: boolean;
  backupForm: AdminBackupFormData;
  showDeleteBackupModal: boolean;
  deleteBackupFile: BackupFile | null;
  deleteBackupSaving: boolean;
  onRefresh: () => void;
  onOpenBackupModal: () => void;
  onCloseBackupModal: () => void;
  onFormChange: (field: string, value: string | number | boolean) => void;
  onCreateBackup: () => Promise<void>;
  onOpenDeleteBackupModal: (file: BackupFile) => void;
  onCloseDeleteBackupModal: () => void;
  onDeleteBackupSubmit: () => Promise<void>;
}

export default function AdminBackupEnhanced({
  backupFiles,
  backupLoading,
  backupCreating,
  backupStats,
  showBackupModal,
  backupForm,
  showDeleteBackupModal,
  deleteBackupFile,
  deleteBackupSaving,
  onRefresh,
  onOpenBackupModal,
  onCloseBackupModal,
  onFormChange,
  onCreateBackup,
  onOpenDeleteBackupModal,
  onCloseDeleteBackupModal,
  onDeleteBackupSubmit,
}: AdminBackupEnhancedProps) {
  const [compress, setCompress] = useState(true);
  const [retainDays, setRetainDays] = useState(30);

  async function handleCreate() {
    // 同步表单数据到外部状态，再提交
    onFormChange('compress', compress);
    onFormChange('retainDays', retainDays);
    await onCreateBackup();
  }

  function formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  // 健康状态评估
  function getBackupHealth(): { label: string; color: string; desc: string } {
    if (!backupStats || backupStats.totalCount === 0) {
      return { label: '无备份', color: 'text-red-600 dark:text-red-400', desc: '尚未创建任何备份，请立即创建' };
    }
    if (!backupStats.newestBackup) {
      return { label: '数据不足', color: 'text-yellow-600 dark:text-yellow-400', desc: '无法判断备份时效' };
    }
    const daysSince = (Date.now() - new Date(backupStats.newestBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 1) {
      return { label: '健康', color: 'text-green-600 dark:text-green-400', desc: '最近 24 小时内有备份' };
    }
    if (daysSince <= 7) {
      return { label: '良好', color: 'text-blue-600 dark:text-blue-400', desc: `${Math.floor(daysSince)} 天前备份` };
    }
    if (daysSince <= 30) {
      return { label: '偏旧', color: 'text-yellow-600 dark:text-yellow-400', desc: `${Math.floor(daysSince)} 天前备份，建议更新` };
    }
    return { label: '过旧', color: 'text-red-600 dark:text-red-400', desc: `${Math.floor(daysSince)} 天前备份，请立即备份` };
  }

  const health = getBackupHealth();

  return (
    <div className="space-y-4">
      {/* 统计卡片（增强部分） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">备份数量</div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {backupStats?.totalCount ?? 0}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">总占用空间</div>
          <div className="text-xl font-bold text-green-700 dark:text-green-300">
            {backupStats?.totalSizeFormatted ?? '0 B'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:col-span-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">备份健康状态</div>
          <div className={`text-base font-bold ${health.color}`}>{health.label}</div>
          <div className="text-xs text-gray-400 mt-0.5 truncate" title={health.desc}>{health.desc}</div>
        </div>
        {backupStats?.newestBackup && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">最新备份</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {formatDate(backupStats.newestBackup)}
            </div>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onRefresh}
          disabled={backupLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          <RefreshIcon />
          刷新
        </button>
        <button
          onClick={onOpenBackupModal}
          disabled={backupCreating}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-60"
        >
          {backupCreating ? '备份中...' : '+ 立即备份'}
        </button>
      </div>

      {/* 备份列表 */}
      {backupLoading ? (
        <div className="text-center py-8 text-gray-400">加载中...</div>
      ) : backupFiles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="flex justify-center mb-3">
            <DatabaseIcon />
          </div>
          <div>暂无备份文件</div>
          <div className="text-xs mt-1">点击「立即备份」创建第一个数据库备份</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                <th className="pb-2 pr-4 font-medium">文件名</th>
                <th className="pb-2 pr-4 font-medium">大小</th>
                <th className="pb-2 pr-4 font-medium">创建时间</th>
                <th className="pb-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {backupFiles.map((backup) => (
                <tr
                  key={backup.filename}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">
                        <DatabaseIcon />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-gray-800 dark:text-gray-200 font-mono text-xs">
                          {backup.filename}
                        </span>
                        {backup.filename.endsWith('.gz') && (
                          <span className="text-xs text-green-500 dark:text-green-400">已压缩</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 text-xs">
                    {backup.sizeFormatted}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap">
                    {backup.createdAtFormatted || formatDate(backup.createdAt)}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => onOpenDeleteBackupModal(backup)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 删除确认 Modal */}
      {showDeleteBackupModal && deleteBackupFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-red-600 dark:text-red-400">确认删除备份</h3>
              <button
                onClick={onCloseDeleteBackupModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon />
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              确定要删除备份文件 <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{deleteBackupFile.filename}</span> 吗？此操作不可撤销。
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCloseDeleteBackupModal}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={onDeleteBackupSubmit}
                disabled={deleteBackupSaving}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60 transition-colors"
              >
                {deleteBackupSaving ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建备份 Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">创建数据库备份</h3>
              <button
                onClick={onCloseBackupModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compress}
                    onChange={(e) => setCompress(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">压缩备份（.gz）</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  保留天数
                </label>
                <input
                  type="number"
                  value={retainDays}
                  onChange={(e) => setRetainDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-400 mt-1">超过此天数的旧备份将被自动清理</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 text-xs text-yellow-700 dark:text-yellow-400">
                备份过程可能需要一段时间，请耐心等待。备份期间请勿关闭页面。
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={onCloseBackupModal}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={backupCreating}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60 transition-colors"
              >
                {backupCreating ? '备份中...' : '开始备份'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
