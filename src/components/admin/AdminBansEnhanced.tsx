// Admin Bans Enhanced Component
// 增强的封禁管理组件 - 统计卡片 + 时间线 + 高级筛选

'use client';

import React, { useState } from 'react';
import { SearchIcon } from './AdminIcons';
import type { BanRecord, BanFormData } from './AdminTypes';
import { formatDate } from '@/lib/utils';
import { Button, Card, Modal, ModalFooter, Input, Field } from '@/components/design';

// ===== 图标 =====
const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.533.133a1.75 1.75 0 00-1.066 0l-5.25 1.68A1.75 1.75 0 001 3.48V8c0 3.56 2.095 6.347 5.75 7.94a1.75 1.75 0 001.5 0C11.905 14.347 14 11.56 14 8V3.48a1.75 1.75 0 00-1.217-1.667L8.533.133z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z" />
  </svg>
);

const BanIconSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 16A8 8 0 108 0a8 8 0 000 16zM3.104 5.224a6.5 6.5 0 018.672 8.672L3.104 5.224zm1.92-1.92l8.672 8.672a6.5 6.5 0 00-8.672-8.672z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.25-12.75a.75.75 0 00-1.5 0v4.5a.75.75 0 00.22.53l2 2a.75.75 0 001.06-1.06L8.25 7.69V3.25z" />
  </svg>
);

// ===== 类型定义 =====
interface UnbanFormData {
  userId: string;
  username: string;
  unbanReason: string;
}

export interface AdminBansEnhancedProps {
  bans: BanRecord[];
  bansTotal: number;
  bansPage: number;
  bansSearch: string;
  bansStatus: string;
  bansLoading: boolean;
  showBanModal: boolean;
  banForm: BanFormData;
  banSaving: boolean;
  showUnbanModal: boolean;
  unbanBanRecord: BanRecord | null;
  unbanReason: string;
  unbanSaving: boolean;
  showDeleteBanModal: boolean;
  deleteBanRecord: BanRecord | null;
  deleteBanSaving: boolean;
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPageChange: (page: number) => void;
  onOpenBanModal: () => void;
  onCloseBanModal: () => void;
  onFormChange: (field: string, value: string) => void;
  onBanSubmit: () => Promise<void>;
  onOpenUnbanModal: (ban: BanRecord) => void;
  onCloseUnbanModal: () => void;
  onUnbanReasonChange: (v: string) => void;
  onUnbanSubmit: () => Promise<void>;
  onOpenDeleteBanModal: (ban: BanRecord) => void;
  onCloseDeleteBanModal: () => void;
  onDeleteBanSubmit: () => Promise<void>;
}

const PAGE_SIZE = 20;

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminBansEnhanced({
  bans,
  bansTotal,
  bansPage,
  bansSearch,
  bansStatus,
  bansLoading,
  showBanModal,
  banForm,
  banSaving,
  showUnbanModal,
  unbanBanRecord,
  unbanReason,
  unbanSaving,
  showDeleteBanModal,
  deleteBanRecord,
  deleteBanSaving,
  onSearchChange,
  onStatusChange,
  onPageChange,
  onOpenBanModal,
  onCloseBanModal,
  onFormChange,
  onBanSubmit,
  onOpenUnbanModal,
  onCloseUnbanModal,
  onUnbanReasonChange,
  onUnbanSubmit,
  onOpenDeleteBanModal,
  onCloseDeleteBanModal,
  onDeleteBanSubmit,
}: AdminBansEnhancedProps) {
  const totalPages = Math.ceil(bansTotal / PAGE_SIZE);

  // 统计数据（从当前页数据计算，仅作展示参考）
  const activeBans = bans.filter(b => b.isActive).length;
  const permanentBans = bans.filter(b => b.banType === 'permanent').length;
  const temporaryBans = bans.filter(b => b.banType === 'temporary').length;
  const expiredBans = bans.filter(b => !b.isActive && !b.isOrphaned).length;

  return (
    <div className="space-y-5">
      {/* ===== 统计卡片 ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-danger-subtle)] border border-[var(--ds-danger-default)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--ds-danger-default)] mb-1">
            <BanIconSvg />
            活跃封禁
          </div>
          <div className="text-2xl font-bold text-[var(--ds-danger-default)]">{activeBans}</div>
          <div className="text-xs text-[var(--ds-danger-default)] mt-0.5">当前封禁中</div>
        </Card>
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-warning-subtle)] border border-[var(--ds-warning-default)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--ds-warning-default)] mb-1">
            <ShieldIcon />
            永久封禁
          </div>
          <div className="text-2xl font-bold text-[var(--ds-warning-default)]">{permanentBans}</div>
          <div className="text-xs text-[var(--ds-warning-default)] mt-0.5">永久生效</div>
        </Card>
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-warning-subtle)] border border-[var(--ds-warning-default)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--ds-warning-default)] mb-1">
            <ClockIcon />
            临时封禁
          </div>
          <div className="text-2xl font-bold text-[var(--ds-warning-default)]">{temporaryBans}</div>
          <div className="text-xs text-[var(--ds-warning-default)] mt-0.5">有期限</div>
        </Card>
        <Card variant="surface" padding="none" className="p-3 bg-[var(--ds-success-subtle)] border border-[var(--ds-success-default)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--ds-success-default)] mb-1">
            <CheckCircleIcon />
            已解封
          </div>
          <div className="text-2xl font-bold text-[var(--ds-success-default)]">{expiredBans}</div>
          <div className="text-xs text-[var(--ds-success-default)] mt-0.5">本页统计</div>
        </Card>
      </div>

      {/* ===== 操作栏 ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-secondary)]">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="搜索用户名/邮箱..."
              value={bansSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] outline-none focus:ring-1 focus:ring-[var(--ds-accent-default)] w-52"
            />
          </div>
          <select
            value={bansStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="py-1.5 px-2 text-sm border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] outline-none"
          >
            <option value="all">全部封禁</option>
            <option value="active">活跃封禁</option>
            <option value="expired">已解封</option>
          </select>
          <span className="text-xs text-[var(--ds-text-secondary)]">共 {bansTotal} 条</span>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={onOpenBanModal}
        >
          + 封禁用户
        </Button>
      </div>

      {/* ===== 封禁列表 ===== */}
      {bansLoading ? (
        <div className="text-center py-12 text-[var(--ds-text-secondary)]">
          <div className="inline-block w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin mb-2" />
          <div className="text-sm">加载中...</div>
        </div>
      ) : bans.length === 0 ? (
        <div className="text-center py-12 text-[var(--ds-text-secondary)]">
          <div className="flex justify-center mb-3 opacity-40">
            <BanIconSvg />
          </div>
          <div className="text-sm">暂无封禁记录</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)] text-left text-[var(--ds-text-secondary)]">
                <th className="px-3 py-2.5 font-medium">用户</th>
                <th className="px-3 py-2.5 font-medium">封禁原因</th>
                <th className="px-3 py-2.5 font-medium">类型</th>
                <th className="px-3 py-2.5 font-medium">到期时间</th>
                <th className="px-3 py-2.5 font-medium">状态</th>
                <th className="px-3 py-2.5 font-medium">操作管理员</th>
                <th className="px-3 py-2.5 font-medium">封禁时间</th>
                <th className="px-3 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {bans.map((ban) => (
                <tr
                  key={ban.id}
                  className="border-b border-[var(--ds-border-muted)] hover:bg-[var(--ds-surface-subtle)] transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {ban.user.avatarUrl ? (
                        <img src={ban.user.avatarUrl} alt={ban.user.username} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--ds-danger-subtle)] flex items-center justify-center text-xs text-[var(--ds-danger-default)] font-semibold">
                          {ban.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-[var(--ds-text-primary)] text-sm">{ban.user.username}</div>
                        <div className="text-xs text-[var(--ds-text-secondary)]">{ban.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[var(--ds-text-primary)] max-w-[180px] block truncate text-sm" title={ban.reason}>
                      {ban.reason}
                    </span>
                    {ban.unbanReason && (
                      <div className="text-xs text-[var(--ds-success-default)] mt-0.5 truncate max-w-[180px]" title={ban.unbanReason}>
                        解封: {ban.unbanReason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      ban.banType === 'permanent'
                        ? 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]'
                        : ban.banType === 'temporary'
                        ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]'
                        : 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
                    }`}>
                      {ban.banType === 'permanent' ? '永久' : ban.banType === 'temporary' ? '临时' : '未知'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ds-text-secondary)] text-xs whitespace-nowrap">
                    {ban.banType === 'permanent' ? (
                      <span className="text-[var(--ds-danger-default)]">永久</span>
                    ) : (
                      ban.expiresAt ? formatDate(ban.expiresAt) : '-'
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {ban.isOrphaned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]">
                        孤立记录
                      </span>
                    ) : ban.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-danger-default)] inline-block" />
                        封禁中
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-success-default)] inline-block" />
                        已解封
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs text-[var(--ds-text-primary)]">{ban.banner.username}</div>
                    {ban.unbannedBy && (
                      <div className="text-xs text-[var(--ds-text-secondary)] mt-0.5">解封: {ban.unbannedBy}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ds-text-secondary)] text-xs whitespace-nowrap">
                    <div>{formatDateShort(ban.createdAt)}</div>
                    {ban.unbannedAt && (
                      <div className="text-[var(--ds-success-default)] mt-0.5">{formatDateShort(ban.unbannedAt)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {ban.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenUnbanModal(ban)}
                        >
                          解封
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onOpenDeleteBanModal(ban)}
                      >
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== 分页 ===== */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(bansPage - 1)}
            disabled={bansPage <= 1}
          >
            上一页
          </Button>
          <span className="text-sm text-[var(--ds-text-secondary)]">{bansPage} / {totalPages}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(bansPage + 1)}
            disabled={bansPage >= totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* ===== 封禁用户 Modal ===== */}
      {showBanModal && (
        <Modal isOpen onClose={onCloseBanModal} title="封禁用户" maxWidth="448px" footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCloseBanModal}>取消</Button>
            <Button variant="danger" size="sm" onClick={onBanSubmit} disabled={banSaving || !banForm.userId || !banForm.reason} loading={banSaving}>{banSaving ? '处理中...' : '确认封禁'}</Button>
          </>
        }>
          <div className="space-y-3">
            <div>
              <label htmlFor="ban-user-id" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">
                用户 ID <span className="text-[var(--ds-danger-default)]">*</span>
              </label>
              <Input
                id="ban-user-id"
                type="text"
                value={banForm.userId}
                onChange={(e) => onFormChange('userId', e.target.value)}
                placeholder="输入用户 ID"
              />
            </div>
            <div>
              <label htmlFor="ban-reason" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">
                封禁原因 <span className="text-[var(--ds-danger-default)]">*</span>
              </label>
              <Input
                id="ban-reason"
                multiline
                value={banForm.reason}
                onChange={(e) => onFormChange('reason', e.target.value)}
                placeholder="请填写封禁原因"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="ban-type" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">封禁类型</label>
              <select
                id="ban-type"
                value={banForm.banType}
                onChange={(e) => onFormChange('banType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] outline-none"
              >
                <option value="permanent">永久封禁</option>
                <option value="temporary">临时封禁</option>
              </select>
            </div>
            {banForm.banType === 'temporary' && (
              <div>
                <label htmlFor="ban-expires-at" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">
                  到期时间 <span className="text-[var(--ds-danger-default)]">*</span>
                </label>
                <Input
                  id="ban-expires-at"
                  type="datetime-local"
                  value={banForm.expiresAt}
                  onChange={(e) => onFormChange('expiresAt', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===== 解封 Modal ===== */}
      {showUnbanModal && unbanBanRecord && (
        <Modal isOpen onClose={onCloseUnbanModal} title={`解封用户 — ${unbanBanRecord.user.username}`} maxWidth="448px" footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCloseUnbanModal}>取消</Button>
            <Button variant="primary" size="sm" onClick={onUnbanSubmit} disabled={unbanSaving || !unbanReason} loading={unbanSaving}>{unbanSaving ? '处理中...' : '确认解封'}</Button>
          </>
        }>
          <div className="space-y-3">
            <div className="text-sm text-[var(--ds-text-secondary)] bg-[var(--ds-surface-subtle)] rounded-[var(--ds-radius-sm)] p-3 border border-[var(--ds-border-default)]">
              <div>原封禁原因：{unbanBanRecord.reason}</div>
              <div className="mt-1">
                类型：{unbanBanRecord.banType === 'permanent' ? '永久封禁' : '临时封禁'}
                {unbanBanRecord.expiresAt && ` (到期：${formatDate(unbanBanRecord.expiresAt)})`}
              </div>
            </div>
            <div>
              <label htmlFor="unban-reason" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">
                解封原因 <span className="text-[var(--ds-danger-default)]">*</span>
              </label>
              <Input
                id="unban-reason"
                multiline
                value={unbanReason}
                onChange={(e) => onUnbanReasonChange(e.target.value)}
                placeholder="请填写解封原因"
                rows={3}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ===== 删除封禁记录确认 Modal ===== */}
      {showDeleteBanModal && deleteBanRecord && (
        <Modal isOpen onClose={onCloseDeleteBanModal} title="删除封禁记录" maxWidth="384px" footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCloseDeleteBanModal}>取消</Button>
            <Button variant="danger" size="sm" onClick={onDeleteBanSubmit} disabled={deleteBanSaving} loading={deleteBanSaving}>{deleteBanSaving ? '删除中...' : '确认删除'}</Button>
          </>
        }>
          <p className="text-sm text-[var(--ds-text-secondary)]">
            确认删除用户 <strong>{deleteBanRecord.user.username}</strong> 的封禁记录？此操作不可撤销。
          </p>
        </Modal>
      )}
    </div>
  );
}
