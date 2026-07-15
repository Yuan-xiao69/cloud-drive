import React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language, className = '' }: CodeBlockProps) {
  return (
    <pre
      className={`bg-[var(--ds-code-bg)] border border-[var(--ds-code-border)] rounded-[var(--ds-radius-md)] p-[var(--ds-space-4)] font-mono text-[13px] leading-relaxed text-[var(--ds-text-primary)] overflow-x-auto ${className}`}
    >
      <code className={language ? `language-${language}` : undefined}>{code}</code>
    </pre>
  );
}
