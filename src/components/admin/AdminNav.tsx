'use client';

import React from 'react';
import clsx from 'clsx';
import type { AdminTab } from './AdminTypes';
import { DashboardIcon, UsersIcon, RepoIcon, DiscussionIcon, FlagIcon, HistoryIcon, AnnouncementIcon, ShieldIcon, MailIcon, BellIcon, BackupIcon, SettingsIcon, MonitorIcon, BanIcon } from './AdminIcons';

export const ADMIN_ROLES = { SUPER_ADMIN: 'super_admin', ADMIN: 'admin', USER: 'user' } as const;

interface TabDef { key: AdminTab; label: string; icon: React.FC; roles?: string[] }

const TABS: TabDef[] = [
  { key: 'dashboard', label: '仪表盘', icon: DashboardIcon },
  { key: 'users', label: '用户管理', icon: UsersIcon },
  { key: 'repos', label: '仓库管理', icon: RepoIcon },
  { key: 'discussions', label: '讨论管理', icon: DiscussionIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
  { key: 'reports', label: '举报管理', icon: FlagIcon },
  { key: 'discipline', label: '用户处置', icon: BanIcon },
  { key: 'announcements', label: '公告管理', icon: AnnouncementIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
  { key: 'security-center', label: '安全中心', icon: ShieldIcon },
  { key: 'logs', label: '操作日志', icon: HistoryIcon },
  { key: 'backup', label: '备份管理', icon: BackupIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
  { key: 'monitor', label: '系统监控', icon: MonitorIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
  { key: 'settings', label: '系统设置', icon: SettingsIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
  { key: 'email', label: '邮件配置', icon: MailIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
  { key: 'notifications', label: '通知管理', icon: BellIcon, roles: [ADMIN_ROLES.SUPER_ADMIN] },
];

interface AdminNavProps { activeTab: AdminTab; onTabChange: (tab: AdminTab) => void; userRole: string }

function canAccess(tab: TabDef, userRole: string): boolean { return !tab.roles || tab.roles.length === 0 || tab.roles.includes(userRole); }

export default function AdminNav({ activeTab, onTabChange, userRole }: AdminNavProps) {
  return (
    <nav className="w-60 min-w-60 border-r border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)] overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-[var(--ds-text-secondary)] uppercase px-3 mb-2">管理面板</h2>
      <div className="flex flex-col gap-0.5">
        {TABS.filter(t => canAccess(t, userRole)).map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key}
              className={clsx('flex items-center gap-3 px-3 py-2 w-full text-left text-sm rounded-md transition-colors border-none bg-transparent cursor-pointer', activeTab === tab.key ? 'bg-[var(--ds-surface-inset)] text-[var(--ds-text-primary)] font-medium' : 'text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-inset)]')}
              onClick={() => onTabChange(tab.key)}>
              <Icon /><span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export { TABS, canAccess };
