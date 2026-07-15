import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center gap-1 font-ui text-sm text-[var(--ds-text-secondary)] ${className}`}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <span className="text-[var(--ds-text-tertiary)] mx-0.5">/</span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[var(--ds-accent-default)] hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-[var(--ds-text-primary)]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
