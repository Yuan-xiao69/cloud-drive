'use client';

import React from 'react';
import SettingsSection from './SettingsSection';

interface NotificationSettingsData {
  watchNotifications: boolean;
  forkNotifications: boolean;
  releaseNotifications: boolean;
  discussionReplies: boolean;
  discussionMentions: boolean;
  issueComments: boolean;
  issueMentions: boolean;
  prReviews: boolean;
  prComments: boolean;
  prMentions: boolean;
  securityAlerts: boolean;
  accountAlerts: boolean;
}

interface NotificationSettingsProps {
  notificationSettings: NotificationSettingsData;
  onSettingsChange: (settings: NotificationSettingsData) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function NotificationSettings({
  notificationSettings,
  onSettingsChange,
  onSave,
  isSaving
}: NotificationSettingsProps) {
  const handleToggle = (key: keyof NotificationSettingsData) => {
    onSettingsChange({
      ...notificationSettings,
      [key]: !notificationSettings[key]
    });
  };

  const renderToggle = (key: keyof NotificationSettingsData, title: string, description: string) => (
    <div className="notification-item">
      <div className="notification-info">
        <h3 className="notification-title">{title}</h3>
        <p className="notification-desc">{description}</p>
      </div>
      <label className="toggle">
        <input 
          type="checkbox" 
          checked={notificationSettings[key]}
          onChange={() => handleToggle(key)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );

  return (
    <SettingsSection 
      title="通知设置" 
      description="管理你接收通知的方式"
    >
      <div className="notification-category">
        <h2 className="notification-category-title">仓库相关</h2>
        <div className="notification-options">
          {renderToggle('watchNotifications', 'Star 通知', '当有人 star 你的仓库时接收通知')}
          {renderToggle('forkNotifications', 'Fork 通知', '当有人 fork 你的仓库时接收通知')}
          {renderToggle('releaseNotifications', 'Release 通知', '当你的仓库发布新版本时接收通知')}
        </div>
      </div>

      <div className="notification-category">
        <h2 className="notification-category-title">讨论相关</h2>
        <div className="notification-options">
          {renderToggle('discussionReplies', '讨论回复', '当有人回复你的讨论时接收通知')}
          {renderToggle('discussionMentions', '讨论提及', '当有人在讨论中 @ 你时接收通知')}
        </div>
      </div>

      <div className="notification-category">
        <h2 className="notification-category-title">Issues 相关</h2>
        <div className="notification-options">
          {renderToggle('issueComments', 'Issue 评论', '当有人评论你参与的 Issue 时接收通知')}
          {renderToggle('issueMentions', 'Issue 提及', '当有人在 Issue 中 @ 你时接收通知')}
        </div>
      </div>

      <div className="notification-category">
        <h2 className="notification-category-title">Pull Requests 相关</h2>
        <div className="notification-options">
          {renderToggle('prReviews', 'PR 审核', '当你的 PR 被审核时接收通知')}
          {renderToggle('prComments', 'PR 评论', '当有人评论你参与的 PR 时接收通知')}
          {renderToggle('prMentions', 'PR 提及', '当有人在 PR 中 @ 你时接收通知')}
        </div>
      </div>

      <div className="notification-category">
        <h2 className="notification-category-title">安全相关</h2>
        <div className="notification-options">
          {renderToggle('securityAlerts', '安全提醒', '接收安全漏洞和风险警报')}
          {renderToggle('accountAlerts', '账号安全', '接收账号异常登录等安全通知')}
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={onSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </SettingsSection>
  );
}