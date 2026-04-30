'use client';

import React from 'react';
import SettingsSection from './SettingsSection';

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
      <div className="setting-item">
        <div className="setting-info">
          <h3 className="setting-title">密码</h3>
          <p className="setting-desc">上次更改于 3 个月前</p>
        </div>
        <button className="btn btn-secondary" onClick={onPasswordChange}>更改密码</button>
      </div>

      {/* 2FA */}
      <div className="setting-item">
        <div className="setting-info">
          <h3 className="setting-title">两步验证</h3>
          <p className="setting-desc">为你的账号添加额外的安全保护</p>
        </div>
        <button className="btn btn-secondary" onClick={onMfaManage}>管理</button>
      </div>

      {/* Sessions */}
      <div className="setting-item">
        <div className="setting-info">
          <h3 className="setting-title">登录历史</h3>
          <p className="setting-desc">查看你账号的登录设备</p>
        </div>
        <button className="btn btn-secondary" onClick={onViewLoginHistory}>查看</button>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3 className="danger-title">危险区域</h3>
        <div className="setting-item">
          <div className="setting-info">
            <h3 className="setting-title">删除账号</h3>
            <p className="setting-desc">永久删除你的账号和所有数据</p>
          </div>
          <button className="btn btn-danger" onClick={onDeleteAccount}>删除账号</button>
        </div>
      </div>
    </SettingsSection>
  );
}