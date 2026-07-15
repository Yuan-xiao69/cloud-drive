'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--ds-accent-default)] text-[var(--ds-text-inverse)] border-[var(--ds-accent-default)] hover:bg-[var(--ds-accent-hover)] hover:border-[var(--ds-accent-hover)]',
  secondary:
    'bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)] hover:border-[var(--ds-border-strong)]',
  danger:
    'bg-[var(--ds-danger-default)] text-[var(--ds-text-inverse)] border-[var(--ds-danger-default)] hover:opacity-90',
  ghost:
    'bg-transparent text-[var(--ds-text-secondary)] border-transparent hover:bg-[var(--ds-surface-subtle)] hover:text-[var(--ds-text-primary)]',
  outline:
    'bg-transparent text-[var(--ds-text-primary)] border-[var(--ds-border-default)] hover:bg-[var(--ds-surface-subtle)] hover:border-[var(--ds-border-strong)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-[10px] py-[4px] text-xs gap-[var(--ds-space-1)]',
  md: 'px-[14px] py-[6px] text-[13px] gap-[var(--ds-space-2)]',
  lg: 'px-[20px] py-[10px] text-[15px] gap-[var(--ds-space-2)]',
};

const baseClass =
  'inline-flex items-center justify-center font-semibold rounded-[var(--ds-radius-sm)] border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-subtle)] disabled:opacity-50 disabled:cursor-not-allowed';

function Spinner() {
  return (
    <span className="inline-block w-[14px] h-[14px] border-2 border-white/25 border-t-white rounded-full animate-spin" />
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClass} ${variantClasses[variant]} ${sizeClasses[size]} ${block ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
}
