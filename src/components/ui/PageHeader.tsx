'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * PageHeader - 页面标题头部组件
 * 
 * 用于页面级标题区域，支持：
 * - 主标题 + 副标题
 * - 左侧操作按钮
 * - 右侧操作按钮
 * - Tab 导航
 * 
 * @example
 * // 基础用法
 * <PageHeader title="用户主页" />
 * 
 * // 带副标题和操作
 * <PageHeader 
 *   title="设置"
 *   subtitle="管理您的账户设置"
 *   actions={<Button>保存</Button>}
 * />
 * 
 * // 带 Tab
 * <PageHeader
 *   title="用户名"
 *   tabs={tabs}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 */
export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface PageHeaderProps {
  /** 主标题 */
  title: string;
  /** 副标题/描述 */
  subtitle?: string;
  /** 左侧操作区 */
  actions?: React.ReactNode;
  /** Tab 导航项 */
  tabs?: TabItem[];
  /** 当前激活的 Tab */
  activeTab?: string;
  /** Tab 切换回调 */
  onTabChange?: (tabId: string) => void;
  /** 额外 className */
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabChange,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx('border-b border-[#d0d7de] dark:border-[#30363d]', className)}>
      {/* 主内容区 */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* 标题行 + 操作按钮 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* 标题区域 */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-[#1f2328] dark:text-[#e6edf3] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[#57606a] dark:text-[#8b949e]">
                {subtitle}
              </p>
            )}
          </div>

          {/* 右侧操作按钮 */}
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      {tabs && tabs.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={clsx(
                  'py-3 px-1 text-sm font-medium border-b-2 -mb-px',
                  'transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-[#0969da] text-[#0969da]'
                    : 'border-transparent text-[#57606a] hover:text-[#1f2328] hover:border-[#d0d7de]',
                  'dark:text-[#8b949e] dark:hover:text-[#e6edf3] dark:hover:border-[#30363d]'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={clsx(
                      'ml-2 px-[6px] py-[2px] text-xs font-medium rounded-full',
                      activeTab === tab.id
                        ? 'bg-[#0969da26] text-[#0969da]'
                        : 'bg-[#eaeef2] text-[#57606a]',
                      'dark:bg-[#30363d] dark:text-[#8b949e]'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
