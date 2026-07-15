import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-6 ${className}`}>
      <div>
        <h1 className="font-display text-[20px] font-bold text-[var(--ds-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="font-ui text-[13px] text-[var(--ds-text-secondary)] mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
