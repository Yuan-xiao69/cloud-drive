import React from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <div className={`mb-5 ${className}`}>
      <label className="block font-ui text-sm font-semibold text-[var(--ds-text-primary)] mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="font-ui text-xs text-[var(--ds-text-tertiary)] mt-1">{hint}</p>
      )}
    </div>
  );
}
