'use client';

import React from 'react';
import type { AdminTab } from './AdminTypes';
import {
  DashboardIcon,
  UsersIcon,
  RepoIcon,
  DiscussionIcon,
  FlagIcon,
  HistoryIcon,
  PenaltyIcon,
  AppealIcon,
  AnnouncementIcon,
  ShieldIcon,
  IpIcon,
  DatabaseIcon,
  MailIcon,
  BellIcon,
  BackupIcon,
  SettingsIcon,
  MonitorIcon,
  BanIcon,
  ActivityIcon,
} from './AdminIcons';

interface TabDef {
  key: AdminTab;
  label: string;
  icon: React.FC;
  roles?: string[];
}

const TABS: TabDef[] = [
  { key: 'dashboard', label: '仪表盘', icon: DashboardIcon },
  { key: 'users', label: '用户管理', icon: UsersIcon },
  { key: 'repos', label: '仓库管理', icon: RepoIcon },
  { key: 'discussions', label: '讨论管理', icon: DiscussionIcon, roles: ['super_admin'] },
  { key: 'reports', label: '举报管理', icon: FlagIcon },
  { key: 'penalties', label: '处罚管理', icon: PenaltyIcon },
  { key: 'appeals', label: '申诉管理', icon: AppealIcon },
  { key: 'announcements', label: '公告管理', icon: AnnouncementIcon, roles: ['super_admin'] },
  { key: 'security', label: '安全事件', icon: ShieldIcon },
  { key: 'ipblacklist', label: 'IP 黑名单', icon: IpIcon },
  { key: 'audit', label: '审计日志', icon: HistoryIcon },
  { key: 'bans', label: '封禁管理', icon: BanIcon },
  { key: 'activity-logs', label: '活动日志', icon: ActivityIcon },
  { key: 'backup', label: '备份管理', icon: BackupIcon, roles: ['super_admin'] },
  { key: 'monitor', label: '系统监控', icon: MonitorIcon, roles: ['super_admin'] },
  { key: 'settings', label: '系统设置', icon: SettingsIcon, roles: ['super_admin'] },
  { key: 'email', label: '邮件配置', icon: MailIcon, roles: ['super_admin'] },
  { key: 'database', label: '数据库', icon: DatabaseIcon, roles: ['super_admin'] },
  { key: 'notifications', label: '通知管理', icon: BellIcon, roles: ['super_admin'] },
];

interface AdminNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  userRole: string;
}

function canAccess(tab: TabDef, userRole: string): boolean {
  if (!tab.roles || tab.roles.length === 0) return true;
  return tab.roles.includes(userRole);
}

export default function AdminNav({ activeTab, onTabChange, userRole }: AdminNavProps) {
  const visibleTabs = TABS.filter((tab) => canAccess(tab, userRole));

  return (
    <nav className="admin-nav">
      <h2 className="nav-title">管理面板</h2>

      <div className="nav-list">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              <Icon />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// 导出 TABS 供其他地方使用
export { TABS, canAccess };
