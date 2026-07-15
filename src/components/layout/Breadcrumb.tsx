'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import clsx from 'clsx';

export interface BreadcrumbItem { label: string; href?: string; icon?: React.ReactNode }

interface BreadcrumbProps {
  items: BreadcrumbItem[]; showHome?: boolean; homeLabel?: string;
  homeHref?: string; maxLength?: number; className?: string; separator?: React.ReactNode;
}

function truncate(str: string, maxLength: number): string {
  return str.length <= maxLength ? str : str.slice(0, maxLength - 1) + '…';
}

export default function Breadcrumb({ items, showHome = true, homeLabel = '首页', homeHref = '/', maxLength = 30, className, separator }: BreadcrumbProps) {
  const Separator = separator || <ChevronRight size={14} className="text-[var(--ds-text-secondary)] mx-0.5" />;

  return (
    <nav className={clsx('flex items-center text-sm py-2', className)} aria-label="面包屑导航">
      <ol className="flex items-center list-none m-0 p-0">
        {showHome && (
          <li className="flex items-center">
            <Link href={homeHref} className="flex items-center gap-1 text-[var(--ds-text-secondary)] hover:text-[var(--ds-accent-default)] no-underline transition-colors">
              <Home size={14} /><span>{homeLabel}</span>
            </Link>
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href || item.label || index} className="flex items-center">
              <span className="mx-1 text-[var(--ds-text-secondary)]">{Separator}</span>
              {item.href && !isLast ? (
                <Link href={item.href} className="text-[var(--ds-text-secondary)] hover:text-[var(--ds-accent-default)] no-underline transition-colors" title={item.label}>
                  {item.icon && <span className="mr-1">{item.icon}</span>}
                  <span>{truncate(item.label, maxLength)}</span>
                </Link>
              ) : (
                <span className="text-[var(--ds-text-primary)] font-medium">{truncate(item.label, maxLength)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
