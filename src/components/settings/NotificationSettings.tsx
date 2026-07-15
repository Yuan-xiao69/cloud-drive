'use client';

import React from 'react';
import SettingsSection from './SettingsSection';
import { Button, Card } from '@/components/design';

interface NotificationSettingsData {
  watchNotifications: boolean; forkNotifications: boolean; releaseNotifications: boolean;
  discussionReplies: boolean; discussionMentions: boolean;
  issueComments: boolean; issueMentions: boolean;
  prReviews: boolean; prComments: boolean; prMentions: boolean;
  securityAlerts: boolean; accountAlerts: boolean;
}

interface NotificationSettingsProps {
  notificationSettings: NotificationSettingsData;
  onSettingsChange: (settings: NotificationSettingsData) => void;
  onSave: () => void; isSaving: boolean;
}

export default function NotificationSettings({ notificationSettings, onSettingsChange, onSave, isSaving }: NotificationSettingsProps) {
  const handleToggle = (key: keyof NotificationSettingsData) => onSettingsChange({ ...notificationSettings, [key]: !notificationSettings[key] });

  const renderToggle = (key: keyof NotificationSettingsData, title: string, description: string) => (
    <div className="flex items-center justify-between py-3 border-b border-[var(--ds-border-muted)] last:border-b-0">
      <div className="flex flex-col">
        <h3 className="text-sm font-medium text-[var(--ds-text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--ds-text-secondary)]">{description}</p>
      </div>
      <label className="relative inline-block w-10 h-[22px] flex-shrink-0" aria-label={title}>
        <input type="checkbox" aria-label={title} checked={notificationSettings[key]} onChange={() => handleToggle(key)} className="opacity-0 w-0 h-0 peer" />
        <span className="absolute cursor-pointer inset-0 bg-[var(--ds-border-default)] rounded-[22px] transition-all before:absolute before:content-[''] before:h-4 before:w-4 before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-all peer-checked:bg-[var(--ds-accent-default)] peer-checked:before:translate-x-[18px]" />
      </label>
    </div>
  );

  return (
    <SettingsSection title="通知" description="选择你希望接收通知的事件类型">
      {[
        ['仓库通知', [['watchNotifications', 'Star 通知', '当有人收藏你的仓库时'], ['forkNotifications', 'Fork 通知', '当有人 Fork 你的仓库时']]],
        ['讨论通知', [['discussionReplies', '讨论回复', '当有人回复你的讨论时'], ['discussionMentions', '@提及', '当有人在讨论中 @你时']]],
      ].map(([catTitle, items]) => (
        <div key={catTitle as string} className="mb-6">
          <div className="font-ui text-[11px] font-bold uppercase tracking-[0.05em] text-[var(--ds-text-tertiary)] mb-2">
            {catTitle as string}
          </div>
          <div className="flex flex-col">
            {(items as [keyof NotificationSettingsData, string, string][]).map(([key, title, desc]) => renderToggle(key, title, desc))}
          </div>
        </div>
      ))}
      <div>
      </div>

      <div className="flex items-center gap-3 pt-6 mt-6 border-t border-[var(--ds-border-muted)]">
        <Button variant="primary" size="md" onClick={onSave} loading={isSaving}>保存设置</Button>
      </div>
    </SettingsSection>
  );
}
