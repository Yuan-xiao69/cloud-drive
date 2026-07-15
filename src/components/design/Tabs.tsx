'use client';

import React from 'react';

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ items, activeKey, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex gap-0 border-b border-[var(--ds-border-default)] ${className}`}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 bg-transparent cursor-pointer transition-colors ${
              isActive
                ? 'text-[var(--ds-text-primary)] border-[var(--ds-accent-default)] font-semibold'
                : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text-primary)]'
            }`}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span className="inline-flex items-center px-[var(--ds-space-2)] py-[1px] text-[11px] font-semibold rounded-[var(--ds-radius-full)] bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] ml-1">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
