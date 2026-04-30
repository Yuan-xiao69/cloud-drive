'use client';

import React from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function SettingsSection({
  title,
  description,
  children,
  actions
}: SettingsSectionProps) {
  return (
    <div className="settings-section">
      <div className="section-header">
        <div>
          <h1 className="section-title">{title}</h1>
          {description && (
            <p className="section-description">{description}</p>
          )}
        </div>
        {actions && (
          <div className="section-actions">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
