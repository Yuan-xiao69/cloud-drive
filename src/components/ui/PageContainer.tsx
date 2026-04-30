'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * PageContainer - 统一页面容器组件
 * 
 * 提供统一的页面布局：
 * - 自动处理与 Header 的间距（顶部 64px）
 * - 支持不同最大宽度限制
 * - 支持自定义 padding
 * 
 * @example
 * // 默认用法
 * <PageContainer>页面内容</PageContainer>
 * 
 * // 限制最大宽度
 * <PageContainer maxWidth="lg">页面内容</PageContainer>
 * 
 * // 无 padding
 * <PageContainer padding={false}>页面内容</PageContainer>
 */
export interface PageContainerProps {
  /** 页面内容 */
  children: React.ReactNode;
  /** 最大宽度限制 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否显示内边距，默认 true */
  padding?: boolean;
  /** 额外 className */
  className?: string;
}

/**
 * 宽度配置
 * - sm: 640px (max-w-[640px])
 * - md: 768px (max-w-[768px])
 * - lg: 1024px (max-w-[1024px])
 * - xl: 1280px (max-w-[1280px])
 * - full: 100% (max-w-full)
 */
const maxWidthClasses = {
  sm: 'max-w-[640px]',
  md: 'max-w-[768px]',
  lg: 'max-w-[1024px]',
  xl: 'max-w-[1280px]',
  full: 'max-w-full',
};

export default function PageContainer({
  children,
  maxWidth = 'xl',
  padding = true,
  className,
}: PageContainerProps) {
  return (
    <div
      className={clsx(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        padding && 'px-4 sm:px-6 lg:px-8',
        className
      )}
      style={{ paddingTop: 'var(--page-header-offset, 24px)' }}
    >
      {children}
    </div>
  );
}
