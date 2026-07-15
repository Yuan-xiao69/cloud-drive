'use client';

import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'danger' | 'warning';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantClasses = {
  default: 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]',
  success: 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]',
  danger:  'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]',
  warning: 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]',
};

export function Badge({ variant = 'default', children, className = '', style }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-[var(--ds-space-2)] py-[1px] text-[11px] font-semibold rounded-[var(--ds-radius-full)] leading-normal ${variantClasses[variant]} ${className}`} style={style}>
      {children}
    </span>
  );
}
