'use client';

import React, { forwardRef } from 'react';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  error?: string;
  options: { value: string; label: string }[];
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, options, ...props }, ref) => {
    return (
      <div className="block">
        <select
          ref={ref}
          className={`
            w-full px-[var(--ds-space-3)] py-[6px] text-sm
            bg-[var(--ds-surface-default)] border border-[var(--ds-border-default)]
            text-[var(--ds-text-primary)]
            rounded-[var(--ds-radius-sm)]
            focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-default)] focus:border-[var(--ds-accent-default)]
            ${error ? 'border-[var(--ds-danger-default)] focus:ring-[var(--ds-danger-default)] focus:border-[var(--ds-danger-default)]' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-[var(--ds-danger-default)]">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
