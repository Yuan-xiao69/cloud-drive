'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';

export interface BreadcrumbItem {
  /** 显示的文字 */
  label: string;
  /** 跳转链接，不提供则表示当前页（不可点击） */
  href?: string;
  /** 可选的图标（ReactNode） */
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  /** 面包屑项目列表 */
  items: BreadcrumbItem[];
  /** 是否显示首页链接，默认 true */
  showHome?: boolean;
  /** 首页文字，默认 "首页" */
  homeLabel?: string;
  /** 首页链接，默认 "/" */
  homeHref?: string;
  /** 最大显示长度（字符），超出部分省略，默认 30 */
  maxLength?: number;
  /** 自定义类名 */
  className?: string;
  /** 自定义分隔符 */
  separator?: React.ReactNode;
}

/**
 * 截断过长的文本
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * 面包屑导航组件
 * 
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: '讨论', href: '/discussions' },
 *     { label: '如何部署项目', href: '/discussions/123' },
 *     { label: '回复 #3' }
 *   ]}
 * />
 * ```
 */
export default function Breadcrumb({
  items,
  showHome = true,
  homeLabel = '首页',
  homeHref = '/',
  maxLength = 30,
  className,
  separator,
}: BreadcrumbProps) {
  // 默认分隔符
  const Separator = separator || <ChevronRight className="breadcrumb-separator-icon" size={14} />;

  return (
    <nav 
      className={clsx('breadcrumb', className)}
      aria-label="面包屑导航"
    >
      <ol className="breadcrumb-list">
        {/* 首页 */}
        {showHome && (
          <li className="breadcrumb-item breadcrumb-home">
            <Link href={homeHref} className="breadcrumb-link breadcrumb-link-home">
              <Home size={14} className="breadcrumb-home-icon" />
              <span className="breadcrumb-home-text">{homeLabel}</span>
            </Link>
          </li>
        )}

        {/* 其他面包屑项 */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const displayLabel = truncate(item.label, maxLength);
          const isTruncated = item.label.length > maxLength;

          return (
            <li 
              key={index} 
              className={clsx('breadcrumb-item', isLast && 'breadcrumb-current')}
            >
              <span className="breadcrumb-separator">{Separator}</span>
              
              {item.href && !isLast ? (
                <Link 
                  href={item.href} 
                  className="breadcrumb-link"
                  title={item.label} // 完整文字作为 tooltip
                >
                  {item.icon && <span className="breadcrumb-item-icon">{item.icon}</span>}
                  <span>{displayLabel}</span>
                  {isTruncated && <span className="sr-only">（截断）</span>}
                </Link>
              ) : (
                <span 
                  className="breadcrumb-text"
                  title={isTruncated ? item.label : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && <span className="breadcrumb-item-icon">{item.icon}</span>}
                  <span>{displayLabel}</span>
                  {isTruncated && <span className="sr-only">（截断）</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .breadcrumb {
          font-size: 14px;
          line-height: 1.5;
        }

        .breadcrumb-list {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          list-style: none;
          margin: 0;
          padding: 0;
          gap: 0;
        }

        .breadcrumb-item {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .breadcrumb-home {
          display: flex;
          align-items: center;
        }

        .breadcrumb-separator {
          display: flex;
          align-items: center;
          color: var(--color-fg-muted, #57606a);
          margin: 0 2px;
          flex-shrink: 0;
        }

        .breadcrumb-separator-icon {
          width: 14px;
          height: 14px;
        }

        .breadcrumb-link {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--color-fg-muted, #57606a);
          text-decoration: none;
          transition: color 0.15s ease;
          min-width: 0;
        }

        .breadcrumb-link:hover {
          color: var(--color-accent-fg, #0969da);
        }

        .breadcrumb-link-home {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .breadcrumb-home-icon {
          flex-shrink: 0;
        }

        .breadcrumb-text {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--color-fg-default, #24292f);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .breadcrumb-current .breadcrumb-text {
          font-weight: 500;
        }

        .breadcrumb-item-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        /* 响应式调整 */
        @media (max-width: 576px) {
          .breadcrumb-home-text {
            display: none;
          }

          .breadcrumb-home-icon {
            width: 16px;
            height: 16px;
          }
        }
      `}</style>
    </nav>
  );
}
