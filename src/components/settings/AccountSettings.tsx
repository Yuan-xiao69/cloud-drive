'use client';

import React from 'react';
import SettingsSection from './SettingsSection';
import { Button } from '@/components/design';

interface AccountSettingsProps {
  onPasswordChange: () => void;
  onMfaManage: () => void;
  onViewLoginHistory: () => void;
  onDeleteAccount: () => void;
}

export default function AccountSettings({
  onPasswordChange,
  onMfaManage,
  onViewLoginHistory,
  onDeleteAccount
}: AccountSettingsProps) {
  return (
    <SettingsSection 
      title="账号安全" 
      description="管理你的账号密码和安全设置"
    >
      {/* Password */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--ds-border-muted)]">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-[var(--ds-text-primary)]">密码</h3>
          <p className="text-xs text-[var(--ds-text-tertiary)] mt-0.5">上次更改于 3 个月前</p>
        </div>
        <Button variant="secondary" size="md" onClick={onPasswordChange}>更改密码</Button>
      </div>

      {/* 2FA */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--ds-border-muted)]">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-[var(--ds-text-primary)]">两步验证</h3>
          <p className="text-xs text-[var(--ds-text-tertiary)] mt-0.5">为你的账号添加额外的安全保护</p>
        </div>
        <Button variant="secondary" size="md" onClick={onMfaManage}>管理</Button>
      </div>

      {/* Sessions */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--ds-border-muted)]">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-[var(--ds-text-primary)]">登录历史</h3>
          <p className="text-xs text-[var(--ds-text-tertiary)] mt-0.5">查看你账号的登录设备</p>
        </div>
        <Button variant="secondary" size="md" onClick={onViewLoginHistory}>查看</Button>
      </div>

      {/* Danger Zone — 对齐样本 */}
      <div className="mt-8 p-5 border border-[var(--ds-danger)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-danger-subtle)]">
        <h4 className="font-ui text-sm font-bold text-[var(--ds-danger)] mb-1">删除账号</h4>
        <p className="text-[13px] text-[var(--ds-text-secondary)] mb-3">删除账号将永久清除你的所有仓库、讨论和数据。此操作不可撤销。</p>
        <Button variant="danger" size="sm" onClick={onDeleteAccount}>删除我的账号</Button>
      </div>
    </SettingsSection>
  );
}