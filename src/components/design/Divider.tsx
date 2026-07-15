import React from 'react';

interface DividerProps {
  className?: string;
}

export function Divider({ className = '' }: DividerProps) {
  return (
    <hr className={`border-0 border-t border-[var(--ds-border-muted)] my-4 ${className}`} />
  );
}
