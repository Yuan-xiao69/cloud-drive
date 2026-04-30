'use client';

import React from 'react';

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
  return (
    <nav className="settings-nav">
      <h2 className="nav-title">设置</h2>
      <div className="nav-list">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon className="nav-icon" />
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
