'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsNavProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function SettingsNav({ tabs, activeTab, onTabChange }: SettingsNavProps) {
  // 样本分组：前 3 个为"个人设置"，后 3 个为"内容管理"
  const personalTabs = tabs.slice(0, 3);
  const contentTabs = tabs.slice(3);

  const renderTab = (tab: TabItem) => (
    <button
      key={tab.id}
      className={clsx(
        'flex items-center gap-2.5 px-4 py-2.5 mx-2 w-[calc(100%-16px)] text-left text-sm rounded-[var(--ds-radius-sm)] transition-colors border-none bg-transparent cursor-pointer font-ui',
        activeTab === tab.id
          ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] font-semibold'
          : 'text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface)] hover:text-[var(--ds-text)]'
      )}
      onClick={() => onTabChange(tab.id)}
    >
      <tab.icon className="w-4 h-4 flex-shrink-0 opacity-70" />
      {tab.label}
    </button>
  );

  return (
    <nav className="w-[220px] flex-shrink-0 border-r border-[var(--ds-border-muted)] bg-[var(--ds-surface-subtle)] py-4 flex flex-col h-full max-md:hidden">
      {/* 个人设置 */}
      <div className="font-ui text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ds-text-tertiary)] px-4 mb-2">
        个人设置
      </div>
      {personalTabs.map(renderTab)}

      <hr className="border-t border-[var(--ds-border-muted)] mx-3 my-2" />

      {/* 内容管理 */}
      <div className="font-ui text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--ds-text-tertiary)] px-4 mb-2">
        内容管理
      </div>
      {contentTabs.map(renderTab)}

      <div className="mt-auto pt-4">
        <hr className="border-t border-[var(--ds-border-muted)] mx-3 mb-3" />
        <Link
          href="/"
          className="flex items-center gap-1.5 px-4 mx-2 text-xs text-[var(--ds-text-tertiary)] no-underline font-ui hover:text-[var(--ds-danger)] transition-colors"
        >
          ← 返回首页
        </Link>
      </div>
    </nav>
  );
}
