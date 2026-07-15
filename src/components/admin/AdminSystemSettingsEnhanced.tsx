// Enhanced Admin System Settings Tab Component
// 系统设置管理组件 - 分组配置编辑

'use client';

import React, { useState, useEffect } from 'react';
import {
  SettingsIcon,
  UserIcon,
  DatabaseIcon,
  LockIcon,
  FolderIcon,
  CheckIcon,
  XIcon,
  RefreshIcon,
  AlertTriangleIcon
} from './AdminIcons';
import { ConfirmDialog } from './common/AdminCommon';

import { Button, Field } from '@/components/design';

interface ConfigItem {
  value: string | number | boolean;
  description?: string;
}

interface SystemConfig {
  // 用户注册
  allowRegistration: ConfigItem;
  requireEmailVerification: ConfigItem;
  defaultUserRole: ConfigItem;
  // 存储限制
  maxFileSize: ConfigItem;
  maxStoragePerUser: ConfigItem;
  maxRepoSize: ConfigItem;
  maxImageSize: ConfigItem;
  allowedFileTypes: ConfigItem;
  maxReposPerUser: ConfigItem;
  // 安全设置
  loginAttemptsLimit: ConfigItem;
  loginLockoutDuration: ConfigItem;
  sessionTimeout: ConfigItem;
  requireMFA: ConfigItem;
  // 内容审核
  autoModeration: ConfigItem;
  // 仓库设置
  allowPublicRepos: ConfigItem;
  requireRepoApproval: ConfigItem;
}

interface AdminSystemSettingsEnhancedProps {
  // 数据
  config: SystemConfig | null;
  loading: boolean;
  error: string | null;
  // 操作回调
  onSave: (config: Partial<SystemConfig>) => Promise<void>;
  onRefresh: () => void;
}

export default function AdminSystemSettingsEnhanced({
  config,
  loading,
  error,
  onSave,
  onRefresh,
}: AdminSystemSettingsEnhancedProps) {
  const [localConfig, setLocalConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [activeSection, setActiveSection] = useState<string>('user');

  // 同步外部配置到本地状态
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  // 清除保存成功提示
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // 配置变更处理
  const handleChange = (key: keyof SystemConfig, value: string | number | boolean) => {
    if (!localConfig) return;
    setLocalConfig({
      ...localConfig,
      [key]: {
        ...localConfig[key],
        value,
      },
    });
  };

  // 保存配置
  const handleSave = async () => {
    if (!localConfig) return;
    setSaving(true);
    setSaveError(null);

    try {
      // 构建请求数据
      const requestData: Record<string, string | number | boolean> = {};
      for (const [key, item] of Object.entries(localConfig)) {
        requestData[key] = item.value;
      }

      await onSave(requestData);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 检查是否有变更 - 使用 SystemConfig 接口中的属性名
  const hasChanges = config && localConfig && (
    config.allowRegistration.value !== localConfig.allowRegistration.value ||
    config.requireEmailVerification.value !== localConfig.requireEmailVerification.value ||
    config.defaultUserRole.value !== localConfig.defaultUserRole.value ||
    config.maxReposPerUser.value !== localConfig.maxReposPerUser.value ||
    config.maxStoragePerUser.value !== localConfig.maxStoragePerUser.value ||
    config.allowedFileTypes.value !== localConfig.allowedFileTypes.value ||
    config.maxFileSize.value !== localConfig.maxFileSize.value ||
    config.maxImageSize.value !== localConfig.maxImageSize.value ||
    config.maxRepoSize.value !== localConfig.maxRepoSize.value ||
    config.loginAttemptsLimit.value !== localConfig.loginAttemptsLimit.value ||
    config.loginLockoutDuration.value !== localConfig.loginLockoutDuration.value ||
    config.sessionTimeout.value !== localConfig.sessionTimeout.value ||
    config.requireMFA.value !== localConfig.requireMFA.value ||
    config.autoModeration.value !== localConfig.autoModeration.value ||
    config.allowPublicRepos.value !== localConfig.allowPublicRepos.value ||
    config.requireRepoApproval.value !== localConfig.requireRepoApproval.value
  );

  // 配置分组
  const configSections = [
    {
      id: 'user',
      title: '用户设置',
      icon: <UserIcon size={16} />,
      items: [
        { key: 'allowRegistration', label: '允许新用户注册', type: 'switch' as const },
        { key: 'requireEmailVerification', label: '注册需要邮箱验证', type: 'switch' as const },
        { key: 'defaultUserRole', label: '新用户默认角色', type: 'select' as const, options: ['user', 'moderator', 'admin'] },
      ],
    },
    {
      id: 'storage',
      title: '存储设置',
      icon: <DatabaseIcon size={16} />,
      items: [
        { key: 'maxFileSize', label: '单文件大小限制 (MB)', type: 'number' as const },
        { key: 'maxImageSize', label: '图片大小限制 (MB)', type: 'number' as const },
        { key: 'maxStoragePerUser', label: '用户存储配额 (MB)', type: 'number' as const },
        { key: 'maxRepoSize', label: '单仓库大小限制 (MB)', type: 'number' as const },
        { key: 'allowedFileTypes', label: '允许上传的文件类型', type: 'text' as const, multiline: true },
      ],
    },
    {
      id: 'security',
      title: '安全设置',
      icon: <LockIcon size={16} />,
      items: [
        { key: 'loginAttemptsLimit', label: '登录失败次数限制', type: 'number' as const },
        { key: 'loginLockoutDuration', label: '登录锁定时长 (分钟)', type: 'number' as const },
        { key: 'sessionTimeout', label: '会话超时时间 (分钟)', type: 'number' as const },
        { key: 'requireMFA', label: '强制启用两步验证', type: 'switch' as const },
      ],
    },
    {
      id: 'content',
      title: '内容审核',
      icon: <AlertTriangleIcon size={16} />,
      items: [
        { key: 'autoModeration', label: '启用自动内容审核', type: 'switch' as const },
      ],
    },
    {
      id: 'repo',
      title: '仓库设置',
      icon: <FolderIcon size={16} />,
      items: [
        { key: 'maxReposPerUser', label: '单用户最大仓库数', type: 'number' as const },
        { key: 'allowPublicRepos', label: '允许创建公开仓库', type: 'switch' as const },
        { key: 'requireRepoApproval', label: '仓库创建需要审批', type: 'switch' as const },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="config-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] mb-3" />
        <p>加载系统配置...</p>
        <style jsx>{`
          .config-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            color: var(--ds-text-secondary);
          }
          .config-loading p {
            margin-top: 16px;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  if (error || !localConfig) {
    return (
      <div className="config-error">
        <AlertTriangleIcon size={48} />
        <p>{error || '加载配置失败'}</p>
        <Button onClick={onRefresh} className="retry-btn">
          <RefreshIcon size={16} />
          重试
        </Button>
        <style jsx>{`
          .config-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            color: var(--ds-text-secondary);
          }
          .config-error p {
            margin: 16px 0;
          }
          .retry-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--ds-accent-default);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          }
          .retry-btn:hover {
            background: var(--ds-accent-hover);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* 头部 */}
      <div className="settings-header">
        <div className="header-left">
          <h1>
            <SettingsIcon size={20} />
            系统设置
          </h1>
          <p className="header-subtitle">配置平台全局参数</p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="save-success">
              <CheckIcon size={16} />
              保存成功
            </span>
          )}
          {hasChanges && (
            <span className="unsaved-hint">有未保存的更改</span>
          )}
          <Button
            onClick={onRefresh}
            className="inline-flex items-center justify-center w-8 h-8 p-0 bg-transparent border border-[var(--ds-border-default)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
            disabled={saving}
            title="刷新"
          >
            <RefreshIcon size={16} />
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges} loading={saving} icon={!saving ? <CheckIcon size={16} /> : undefined}>
            保存更改
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {saveError && (
        <div className="save-error">
          <AlertTriangleIcon size={16} />
          {saveError}
        </div>
      )}

      {/* 内容区 */}
      <div className="settings-content">
        {/* 侧边导航 */}
        <div className="settings-sidebar">
          {configSections.map((section) => (
            <Button
              key={section.id}
              className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              {section.title}
            </Button>
          ))}
        </div>

        {/* 配置表单 */}
        <div className="settings-form">
          {configSections.map((section) => (
            <div
              key={section.id}
              className={`config-section ${activeSection === section.id ? 'active' : 'hidden'}`}
            >
              <h2 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">
                {section.icon}
                {section.title}
              </h2>
              <div className="config-items">
                {section.items.map((item) => {
                  const configItem = localConfig[item.key as keyof SystemConfig];
                  if (!configItem) return null;

                  return (
                    <div key={item.key} className="config-item">
                      <div className="item-header">
                        <label htmlFor={`setting-${item.key}`} className="item-label">{item.label}</label>
                        {configItem.description && (
                          <span className="item-description">{configItem.description}</span>
                        )}
                      </div>
                      <div className="item-control">
                        {item.type === 'switch' && (
                          <label className="switch" aria-label={item.label}>
                            <input
                              id={`setting-${item.key}`}
                              type="checkbox"
                              checked={configItem.value === true || configItem.value === 'true'}
                              onChange={(e) => handleChange(item.key as keyof SystemConfig, e.target.checked)}
                            />
                            <span className="slider"></span>
                          </label>
                        )}
                        {item.type === 'number' && (
                          <input
                            id={`setting-${item.key}`}
                            type="number"
                            className="input-number"
                            value={configItem.value as number}
                            onChange={(e) => handleChange(item.key as keyof SystemConfig, parseInt(e.target.value) || 0)}
                            min={0}
                          />
                        )}
                        {item.type === 'text' && (
                          item.multiline ? (
                            <textarea
                              id={`setting-${item.key}`}
                              className="input-textarea"
                              value={configItem.value as string}
                              onChange={(e) => handleChange(item.key as keyof SystemConfig, e.target.value)}
                              rows={3}
                              placeholder="多个类型用逗号分隔"
                            />
                          ) : (
                            <input
                              id={`setting-${item.key}`}
                              type="text"
                              className="input-text"
                              value={configItem.value as string}
                              onChange={(e) => handleChange(item.key as keyof SystemConfig, e.target.value)}
                            />
                          )
                        )}
                        {item.type === 'select' && (
                          <select
                            id={`setting-${item.key}`}
                            className="input-select"
                            value={configItem.value as string}
                            onChange={(e) => handleChange(item.key as keyof SystemConfig, e.target.value)}
                          >
                            {item.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt === 'user' ? '普通用户' :
                                 opt === 'moderator' ? '版主' :
                                 opt === 'admin' ? '管理员' : opt}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 确认对话框 */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      <style jsx>{`
        .settings-container {
          padding: 24px;
          max-width: 1200px;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--ds-border-default);
        }

        .header-left h1 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .header-subtitle {
          margin: 4px 0 0 26px;
          color: var(--ds-text-secondary);
          font-size: 13px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .save-success {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--ds-success-default);
          font-size: 13px;
          padding: 4px 12px;
          background: var(--ds-success-subtle);
          border-radius: 6px;
        }

        .unsaved-hint {
          color: var(--ds-warning-default);
          font-size: 13px;
        }

        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          background: transparent;
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          color: var(--ds-text-primary);
          cursor: pointer;
        }

        .btn-icon:hover:not(:disabled) {
          background: var(--ds-surface-subtle);
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--ds-accent-default);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--ds-accent-hover);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .save-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          background: var(--ds-danger-subtle);
          color: var(--ds-danger-default);
          border: 1px solid var(--ds-danger-default);
          border-radius: 6px;
          font-size: 14px;
        }

        .settings-content {
          display: flex;
          gap: 24px;
        }

        .settings-sidebar {
          width: 200px;
          flex-shrink: 0;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--ds-text-primary);
          font-size: 14px;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.15s;
        }

        .sidebar-item:hover {
          background: var(--ds-surface-subtle);
        }

        .sidebar-item.active {
          background: var(--ds-accent-default);
          color: white;
        }

        .settings-form {
          flex: 1;
          min-width: 0;
        }

        .config-section {
          background: var(--ds-surface-subtle);
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          padding: 20px;
        }

        .config-section.hidden {
          display: none;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--ds-border-default);
        }

        .config-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .config-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px 0;
          border-bottom: 1px solid var(--ds-border-muted);
        }

        .config-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .item-header {
          flex: 1;
          min-width: 0;
        }

        .item-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--ds-text-primary);
        }

        .item-description {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--ds-text-secondary);
        }

        .item-control {
          flex-shrink: 0;
          margin-left: 24px;
        }

        /* Switch 开关 */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--ds-border-default);
          border-radius: 24px;
          transition: 0.2s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: 0.2s;
        }

        input:checked + .slider {
          background-color: var(--ds-success-default);
        }

        input:checked + .slider:before {
          transform: translateX(20px);
        }

        /* 输入框 */
        .input-number,
        .input-text,
        .input-textarea,
        .input-select {
          padding: 8px 12px;
          background: var(--ds-surface-default);
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          font-size: 14px;
          color: var(--ds-text-primary);
          min-width: 180px;
        }

        .input-number {
          width: 120px;
          min-width: auto;
        }

        .input-textarea {
          width: 100%;
          min-width: 300px;
          resize: vertical;
          font-family: monospace;
        }

        .input-text:focus,
        .input-number:focus,
        .input-textarea:focus,
        .input-select:focus {
          outline: none;
          border-color: var(--ds-accent-default);
          box-shadow: 0 0 0 3px var(--ds-accent-subtle);
        }

        @media (max-width: 768px) {
          .settings-content {
            flex-direction: column;
          }

          .settings-sidebar {
            width: 100%;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .sidebar-item {
            flex: 1;
            min-width: 120px;
          }

          .config-item {
            flex-direction: column;
            gap: 12px;
          }

          .item-control {
            margin-left: 0;
            width: 100%;
          }

          .input-number,
          .input-text,
          .input-textarea,
          .input-select {
            width: 100%;
            min-width: unset;
          }
        }
      `}</style>
    </div>
  );
}
