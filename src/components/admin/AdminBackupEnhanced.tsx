'use client';

import React, { useState } from 'react';
import { DatabaseIcon, RefreshIcon } from './AdminIcons';
import type { BackupFile, BackupStats } from './AdminTypes';
import { formatDate } from '@/lib/utils';
import { Button, Card, Modal, ModalFooter, Input, Field } from '@/components/design';

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

  // 健康状态评估
  function getBackupHealth(): { label: string; color: string; desc: string } {
    if (!backupStats || backupStats.totalCount === 0) {
      return { label: '无备份', color: 'text-[var(--ds-danger-default)]', desc: '尚未创建任何备份，请立即创建' };
    }
    if (!backupStats.newestBackup) {
      return { label: '数据不足', color: 'text-[var(--ds-warning-default)]', desc: '无法判断备份时效' };
    }
    const daysSince = (Date.now() - new Date(backupStats.newestBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 1) {
      return { label: '健康', color: 'text-[var(--ds-success-default)]', desc: '最近 24 小时内有备份' };
    }
    if (daysSince <= 7) {
      return { label: '良好', color: 'text-[var(--ds-brand-default)]', desc: `${Math.floor(daysSince)} 天前备份` };
    }
    if (daysSince <= 30) {
      return { label: '偏旧', color: 'text-[var(--ds-warning-default)]', desc: `${Math.floor(daysSince)} 天前备份，建议更新` };
    }
    return { label: '过旧', color: 'text-[var(--ds-danger-default)]', desc: `${Math.floor(daysSince)} 天前备份，请立即备份` };
  }

  const health = getBackupHealth();

  return (
    <div className="space-y-4">
      {/* 统计卡片（增强部分） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="subtle" padding="none" className="p-3">
          <div className="text-xs text-[var(--ds-text-secondary)] mb-1">备份数量</div>
          <div className="text-xl font-bold text-[var(--ds-text-primary)]">
            {backupStats?.totalCount ?? 0}
          </div>
        </Card>
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-success-subtle)] border-0">
          <div className="text-xs text-[var(--ds-success-default)] mb-1">总占用空间</div>
          <div className="text-xl font-bold text-[var(--ds-success-default)]">
            {backupStats?.totalSizeFormatted ?? '0 B'}
          </div>
        </Card>
        <Card variant="subtle" padding="none" className="p-3 sm:col-span-1">
          <div className="text-xs text-[var(--ds-text-secondary)] mb-1">备份健康状态</div>
          <div className={`text-base font-bold ${health.color}`}>{health.label}</div>
          <div className="text-xs text-[var(--ds-text-secondary)] mt-0.5 truncate" title={health.desc}>{health.desc}</div>
        </Card>
        {backupStats?.newestBackup && (
          <Card variant="subtle" padding="none" className="p-3">
            <div className="text-xs text-[var(--ds-text-secondary)] mb-1">最新备份</div>
            <div className="text-sm font-medium text-[var(--ds-text-primary)] truncate">
              {formatDate(backupStats.newestBackup)}
            </div>
          </Card>
        )}
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={backupLoading}
        >
          <RefreshIcon />
          刷新
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenBackupModal}
          disabled={backupCreating}
          loading={backupCreating}
        >
          + 立即备份
        </Button>
      </div>

      {/* 备份列表 */}
      {backupLoading ? (
        <div className="text-center py-8 text-[var(--ds-text-secondary)]">加载中...</div>
      ) : backupFiles.length === 0 ? (
        <div className="text-center py-12 text-[var(--ds-text-secondary)]">
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
              <tr className="border-b border-[var(--ds-border-default)] text-left text-[var(--ds-text-secondary)]">
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
                  className="border-b border-[var(--ds-border-muted)] hover:bg-[var(--ds-surface-subtle)]"
                >
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--ds-text-secondary)]">
                        <DatabaseIcon />
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[var(--ds-text-primary)] font-mono text-xs">
                          {backup.filename}
                        </span>
                        {backup.filename.endsWith('.gz') && (
                          <span className="text-xs text-[var(--ds-success-default)]">已压缩</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-[var(--ds-text-secondary)] text-xs">
                    {backup.sizeFormatted}
                  </td>
                  <td className="py-2 pr-4 text-[var(--ds-text-secondary)] text-xs whitespace-nowrap">
                    {backup.createdAtFormatted || formatDate(backup.createdAt)}
                  </td>
                  <td className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenDeleteBackupModal(backup)}
                    >
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 删除确认 Modal */}
      {showDeleteBackupModal && deleteBackupFile && (
        <Modal isOpen onClose={onCloseDeleteBackupModal} title="确认删除备份" maxWidth="384px" footer={<ModalFooter onCancel={onCloseDeleteBackupModal} onConfirm={onDeleteBackupSubmit} confirmLabel="确认删除" confirmDanger cancelLabel="取消" confirmLoading={deleteBackupSaving} />}>
          确定要删除备份文件 <span className="font-mono font-medium text-[var(--ds-text-primary)]">{deleteBackupFile.filename}</span> 吗？此操作不可撤销。
        </Modal>
      )}

      {/* 创建备份 Modal */}
      {showBackupModal && (
        <Modal isOpen onClose={onCloseBackupModal} title="创建数据库备份" maxWidth="384px" footer={<ModalFooter onCancel={onCloseBackupModal} onConfirm={handleCreate} confirmLabel="开始备份" cancelLabel="取消" confirmLoading={backupCreating} />}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compress}
                  onChange={(e) => setCompress(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-[var(--ds-text-primary)]">压缩备份（.gz）</span>
              </label>
            </div>
            <Field label="保留天数" hint="超过此天数的旧备份将被自动清理">
              <Input id="backup-retain-days" type="number" value={retainDays} onChange={(e) => setRetainDays(Number(e.target.value))} min={1} max={365} />
            </Field>
            <div className="bg-[var(--ds-warning-subtle)] rounded p-3 text-xs text-[var(--ds-warning-default)]">
              备份过程可能需要一段时间，请耐心等待。备份期间请勿关闭页面。
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
