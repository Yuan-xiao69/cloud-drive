import React from 'react';

interface MottoProps {
  text: string;
  showLine?: boolean;
  className?: string;
}

export function Motto({ text, showLine = true, className = '' }: MottoProps) {
  return (
    <div className={`text-center py-6 pb-4 ${className}`}>
      <p className="font-display text-[20px] text-[var(--ds-text-secondary)] tracking-[0.04em] leading-relaxed">
        {text}
      </p>
      {showLine && (
        <span className="block w-10 h-0.5 bg-[var(--ds-accent-default)] opacity-40 mx-auto mt-3 rounded-sm" />
      )}
    </div>
  );
}
