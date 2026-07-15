'use client';

import React from 'react';

type CardVariant = 'surface' | 'subtle' | 'elevated';
type CardPadding = 'md' | 'lg' | 'none';

interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'section' | 'article';
}

const variantClasses: Record<CardVariant, string> = {
  surface:
    'bg-[var(--ds-surface-default)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] hover:border-[var(--ds-border-strong)] transition-all',
  subtle:
    'bg-[var(--ds-surface-subtle)] border border-[var(--ds-border-muted)] rounded-[var(--ds-radius-md)] transition-all',
  elevated:
    'bg-[var(--ds-surface-default)] border border-[var(--ds-border-muted)] rounded-[var(--ds-radius-md)] shadow-[var(--ds-shadow-sm)] hover:border-[var(--ds-border-strong)] hover:shadow-[var(--ds-shadow-md)] transition-all',
};

const paddingClasses: Record<CardPadding, string> = {
  md: 'p-[var(--ds-space-4)]',
  lg: 'p-[var(--ds-space-6)]',
  none: '',
};

export function Card({
  variant = 'surface',
  padding = 'md',
  children,
  className = '',
  onClick,
  as: Tag = 'div',
}: CardProps) {
  return (
    <Tag
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
