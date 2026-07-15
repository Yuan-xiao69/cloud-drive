import React from 'react';

interface StatItem {
  value: string;
  label: string;
}

interface StatsProps {
  items: StatItem[];
  className?: string;
}

export function Stats({ items, className = '' }: StatsProps) {
  return (
    <div className={`flex border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] overflow-hidden ${className}`}>
      {items.map((item, i) => (
        <div
          key={i}
          className={`flex-1 text-center py-4 ${i < items.length - 1 ? 'border-r border-[var(--ds-border-muted)]' : ''}`}
        >
          <div className="font-display text-[26px] font-bold text-[var(--ds-accent-default)] leading-tight">
            {item.value}
          </div>
          <div className="font-ui text-xs text-[var(--ds-text-tertiary)] uppercase tracking-[0.05em] mt-1">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
