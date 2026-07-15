'use client';

import React from 'react';
import { Button } from './Button';

interface EmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function Empty({ icon, title, description, action, className = '' }: EmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-[var(--ds-space-12)] px-[var(--ds-space-6)] text-center ${className}`}>
      {icon && (
        <div className="text-[40px] mb-[var(--ds-space-3)] opacity-60 text-[var(--ds-text-tertiary)]">
          {icon}
        </div>
      )}
      <h4 className="font-display text-[17px] font-bold text-[var(--ds-text-primary)] mb-[var(--ds-space-2)]">
        {title}
      </h4>
      {description && (
        <p className="text-sm text-[var(--ds-text-secondary)] mb-[var(--ds-space-4)] max-w-[360px] leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
