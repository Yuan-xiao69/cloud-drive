'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, Pick<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows' | 'cols'> {
  multiline?: boolean;
  variant?: 'default' | 'filled';
  state?: 'normal' | 'error' | 'success';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  wrapperClassName?: string;
}

const variantClasses = {
  default: 'bg-[var(--ds-surface-default)] border-[var(--ds-border-default)]',
  filled:  'bg-[var(--ds-surface-inset)] border-[var(--ds-border-default)]',
};

const stateClasses = {
  normal:  'focus:border-[var(--ds-accent-default)] focus:ring-2 focus:ring-[var(--ds-accent-subtle)]',
  error:   'border-[var(--ds-danger-default)] focus:border-[var(--ds-danger-default)] focus:ring-2 focus:ring-[var(--ds-danger-subtle)]',
  success: 'border-[var(--ds-success-default)] focus:border-[var(--ds-success-default)] focus:ring-2 focus:ring-[var(--ds-success-subtle)]',
};

const baseClass = 'w-full px-[var(--ds-space-3)] py-[var(--ds-space-2)] text-sm rounded-[var(--ds-radius-sm)] border outline-none transition-all placeholder:text-[var(--ds-text-tertiary)] text-[var(--ds-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ multiline = false, variant = 'default', state = 'normal', icon, iconPosition = 'left', wrapperClassName = '', className = '', ...props }, ref) => {
    const classes = `${baseClass} ${variantClasses[variant]} ${stateClasses[state]} ${icon ? (iconPosition === 'left' ? 'pl-[var(--ds-space-8)]' : 'pr-[var(--ds-space-8)]') : ''} ${multiline ? 'resize-y min-h-[100px]' : ''} ${className}`;

    const inputEl = multiline ? (
      <textarea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        className={classes}
        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        className={classes}
        {...props}
      />
    );

    if (icon) {
      return (
        <div className={`relative ${wrapperClassName}`}>
          <span className={`absolute top-1/2 -translate-y-1/2 text-[var(--ds-text-tertiary)] ${iconPosition === 'left' ? 'left-[var(--ds-space-3)]' : 'right-[var(--ds-space-3)]'}`}>
            {icon}
          </span>
          {inputEl}
        </div>
      );
    }

    return inputEl;
  }
);

Input.displayName = 'Input';
