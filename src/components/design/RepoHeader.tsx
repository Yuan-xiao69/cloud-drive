import React from 'react';
import { Badge } from './Badge';

interface RepoHeaderProps {
  owner: string;
  name: string;
  visibility?: 'public' | 'private';
  description?: string | null;
  actions?: React.ReactNode;
  className?: string;
}

export function RepoHeader({
  owner,
  name,
  visibility,
  description,
  actions,
  className = '',
}: RepoHeaderProps) {
  return (
    <div className={`px-5 py-4 border-b border-[var(--ds-border-default)] ${className}`}>
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-[var(--ds-text-secondary)]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"/></svg>
        </span>
        <span className="font-ui text-lg text-[var(--ds-text-secondary)]">{owner}</span>
        <span className="font-ui text-lg text-[var(--ds-text-tertiary)] mx-1">/</span>
        <span className="font-ui text-lg font-bold text-[var(--ds-text-primary)]">{name}</span>
        {visibility && (
          <Badge variant="default" className="ml-2.5">
            {visibility === 'public' ? '公开' : '私有'}
          </Badge>
        )}
      </div>
      {description && (
        <p className="font-body text-[13px] text-[var(--ds-text-secondary)] mt-1.5">
          {description}
        </p>
      )}
      {actions && (
        <div className="flex items-center gap-2 mt-2.5 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
