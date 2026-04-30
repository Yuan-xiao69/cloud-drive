'use client';

import React from 'react';
import Header from '@/components/layout/Header';
import SettingsNav from './SettingsNav';

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SettingsLayoutProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export default function SettingsLayout({
  tabs,
  activeTab,
  onTabChange,
  children
}: SettingsLayoutProps) {
  return (
    <div className="page">
      <Header />
      <div className="settings-layout">
        <SettingsNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
        <main className="settings-main">
          {children}
        </main>
      </div>
    </div>
  );
}
