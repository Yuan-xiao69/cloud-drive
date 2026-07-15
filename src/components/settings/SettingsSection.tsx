'use client';

import React from 'react';

interface SettingsSectionProps {
  title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode;
}

export default function SettingsSection({ title, description, children, actions }: SettingsSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-[20px] font-bold text-[var(--ds-text)] mb-1">{title}</h2>
          {description && <p className="text-[13px] text-[var(--ds-text-secondary)]">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
