/**
 * UserProfileTabs Component
 * 用户页面 Tab 导航组件
 */

'use client';

import React from 'react';
import clsx from 'clsx';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface UserProfileTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  className?: string;
}

export default function UserProfileTabs({
  tabs,
  activeTab,
  onTabChange,
  className
}: UserProfileTabsProps) {
  return (
    <div
      className={clsx(
        'bg-[var(--color-bg-default)] border-b border-[var(--color-border-default)]',
        className
      )}
    >
      <div className="max-w-5xl mx-auto px-6">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={clsx(
                'relative px-4 py-4 text-sm font-medium transition-colors',
                'hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-inset)]',
                'border-b-2 -mb-[1px]',
                activeTab === tab.key
                  ? 'text-[var(--color-fg-default)] border-[var(--color-fg-default)]'
                  : 'text-[var(--color-fg-muted)] border-transparent'
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-fg-muted)]">
                    {tab.count > 999 ? '999+' : tab.count}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
