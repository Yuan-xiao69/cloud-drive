// Admin Bans Enhanced Component
// 增强的封禁管理组件 - 统计卡片 + 时间线 + 高级筛选

'use client';

import React, { useState } from 'react';
import { SearchIcon, XIcon } from './AdminIcons';
import type { BanRecord, BanFormData } from './AdminTypes';

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

interface AdminBansEnhancedProps {
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

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
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-900/40">
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mb-1">
            <BanIconSvg />
            活跃封禁
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{activeBans}</div>
          <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">当前封禁中</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-100 dark:border-orange-900/40">
          <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 mb-1">
            <ShieldIcon />
            永久封禁
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{permanentBans}</div>
          <div className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">永久生效</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-100 dark:border-yellow-900/40">
          <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 mb-1">
            <ClockIcon />
            临时封禁
          </div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{temporaryBans}</div>
          <div className="text-xs text-yellow-500 dark:text-yellow-400 mt-0.5">有期限</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-900/40">
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mb-1">
            <CheckCircleIcon />
            已解封
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{expiredBans}</div>
          <div className="text-xs text-green-500 dark:text-green-400 mt-0.5">本页统计</div>
        </div>
      </div>

      {/* ===== 操作栏 ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="搜索用户名/邮箱..."
              value={bansSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500 w-52"
            />
          </div>
          <select
            value={bansStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="py-1.5 px-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
          >
            <option value="all">全部封禁</option>
            <option value="active">活跃封禁</option>
            <option value="expired">已解封</option>
          </select>
          <span className="text-xs text-gray-400 dark:text-gray-500">共 {bansTotal} 条</span>
        </div>
        <button
          onClick={onOpenBanModal}
          className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-medium"
        >
          + 封禁用户
        </button>
      </div>

      {/* ===== 封禁列表 ===== */}
      {bansLoading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-2" />
          <div className="text-sm">加载中...</div>
        </div>
      ) : bans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="flex justify-center mb-3 opacity-40">
            <BanIconSvg />
          </div>
          <div className="text-sm">暂无封禁记录</div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
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
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {ban.user.avatarUrl ? (
                        <img src={ban.user.avatarUrl} alt={ban.user.username} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs text-red-600 dark:text-red-400 font-semibold">
                          {ban.user.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{ban.user.username}</div>
                        <div className="text-xs text-gray-400">{ban.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-gray-700 dark:text-gray-300 max-w-[180px] block truncate text-sm" title={ban.reason}>
                      {ban.reason}
                    </span>
                    {ban.unbanReason && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-0.5 truncate max-w-[180px]" title={ban.unbanReason}>
                        解封: {ban.unbanReason}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      ban.banType === 'permanent'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : ban.banType === 'temporary'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {ban.banType === 'permanent' ? '永久' : ban.banType === 'temporary' ? '临时' : '未知'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                    {ban.banType === 'permanent' ? (
                      <span className="text-red-500">永久</span>
                    ) : (
                      formatDate(ban.expiresAt)
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {ban.isOrphaned ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        孤立记录
                      </span>
                    ) : ban.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                        封禁中
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        已解封
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs text-gray-700 dark:text-gray-300">{ban.banner.username}</div>
                    {ban.unbannedBy && (
                      <div className="text-xs text-gray-400 mt-0.5">解封: {ban.unbannedBy}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap">
                    <div>{formatDateShort(ban.createdAt)}</div>
                    {ban.unbannedAt && (
                      <div className="text-green-500 mt-0.5">{formatDateShort(ban.unbannedAt)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {ban.isActive && (
                        <button
                          onClick={() => onOpenUnbanModal(ban)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          解封
                        </button>
                      )}
                      <button
                        onClick={() => onOpenDeleteBanModal(ban)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        删除
                      </button>
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
          <button
            onClick={() => onPageChange(bansPage - 1)}
            disabled={bansPage <= 1}
            className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">{bansPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(bansPage + 1)}
            disabled={bansPage >= totalPages}
            className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            下一页
          </button>
        </div>
      )}

      {/* ===== 封禁用户 Modal ===== */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">封禁用户</h3>
              <button onClick={onCloseBanModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XIcon />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  用户 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={banForm.userId}
                  onChange={(e) => onFormChange('userId', e.target.value)}
                  placeholder="输入用户 ID"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  封禁原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => onFormChange('reason', e.target.value)}
                  placeholder="请填写封禁原因"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">封禁类型</label>
                <select
                  value={banForm.banType}
                  onChange={(e) => onFormChange('banType', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
                >
                  <option value="permanent">永久封禁</option>
                  <option value="temporary">临时封禁</option>
                </select>
              </div>
              {banForm.banType === 'temporary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    到期时间 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={banForm.expiresAt}
                    onChange={(e) => onFormChange('expiresAt', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onCloseBanModal}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={onBanSubmit}
                disabled={banSaving || !banForm.userId || !banForm.reason}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60 transition-colors"
              >
                {banSaving ? '处理中...' : '确认封禁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 解封 Modal ===== */}
      {showUnbanModal && unbanBanRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                解封用户 — {unbanBanRecord.user.username}
              </h3>
              <button onClick={onCloseUnbanModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XIcon />
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
                <div>原封禁原因：{unbanBanRecord.reason}</div>
                <div className="mt-1">
                  类型：{unbanBanRecord.banType === 'permanent' ? '永久封禁' : '临时封禁'}
                  {unbanBanRecord.expiresAt && ` (到期：${formatDate(unbanBanRecord.expiresAt)})`}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  解封原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={unbanReason}
                  onChange={(e) => onUnbanReasonChange(e.target.value)}
                  placeholder="请填写解封原因"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onCloseUnbanModal}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={onUnbanSubmit}
                disabled={unbanSaving || !unbanReason}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60 transition-colors"
              >
                {unbanSaving ? '处理中...' : '确认解封'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 删除封禁记录确认 Modal ===== */}
      {showDeleteBanModal && deleteBanRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">删除封禁记录</h3>
              <button onClick={onCloseDeleteBanModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <XIcon />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              确认删除用户 <strong>{deleteBanRecord.user.username}</strong> 的封禁记录？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCloseDeleteBanModal}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                取消
              </button>
              <button
                onClick={onDeleteBanSubmit}
                disabled={deleteBanSaving}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-60 transition-colors"
              >
                {deleteBanSaving ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
