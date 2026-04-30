'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * ContentGrid - 响应式内容网格布局组件
 * 
 * 提供灵活的三栏布局：
 * - 左侧边栏（可选）
 * - 主内容区
 * - 右侧边栏（可选）
 * 
 * 响应式行为：
 * - 桌面端 (≥1280px): 显示双侧边栏
 * - 平板端 (768-1279px): 仅显示左侧边栏
 * - 移动端 (<768px): 隐藏所有侧边栏
 * 
 * @example
 * // 仅左侧边栏
 * <ContentGrid leftSidebar={<Sidebar />} sidebars="left">
 *   {children}
 * </ContentGrid>
 * 
 * // 双侧边栏
 * <ContentGrid leftSidebar={<Left />} rightSidebar={<Right />} sidebars="both">
 *   {children}
 * </ContentGrid>
 */
export interface ContentGridProps {
  /** 主内容区 */
  children: React.ReactNode;
  /** 左侧边栏内容 */
  leftSidebar?: React.ReactNode;
  /** 右侧边栏内容 */
  rightSidebar?: React.ReactNode;
  /** 侧边栏配置：left=仅左侧, right=仅右侧, both=双侧, none=无侧边 */
  sidebars?: 'left' | 'right' | 'both' | 'none';
  /** 额外 className */
  className?: string;
}

/**
 * 侧边栏宽度配置（与设计文档一致）
 * - 左侧边栏: 280px
 * - 右侧边栏: 280px
 */
const SIDEBAR_WIDTH = '280px';

export default function ContentGrid({
  children,
  leftSidebar,
  rightSidebar,
  sidebars = 'none',
  className,
}: ContentGridProps) {
  // 根据 sidebars 配置确定实际显示
  const hasLeft = sidebars === 'left' || sidebars === 'both' || (leftSidebar && sidebars === 'none');
  const hasRight = sidebars === 'right' || sidebars === 'both';

  // 如果传入的侧边栏内容不为空，也需要考虑
  const shouldShowLeft = leftSidebar !== undefined && (sidebars === 'left' || sidebars === 'both');
  const shouldShowRight = rightSidebar !== undefined && (sidebars === 'right' || sidebars === 'both');

  return (
    <div className={clsx('flex flex-row w-full', className)}>
      {/* 左侧边栏 - 桌面端固定显示 */}
      {shouldShowLeft && leftSidebar && (
        <aside
          className={clsx(
            'hidden lg:block flex-shrink-0',
            'sticky top-[64px] h-[calc(100vh-64px)]',
            'overflow-y-auto',
            'border-r border-[#d0d7de] dark:border-[#30363d]',
            'bg-[#f6f8fa] dark:bg-[#161b22]'
          )}
          style={{ width: SIDEBAR_WIDTH }}
        >
          {leftSidebar}
        </aside>
      )}

      {/* 主内容区 */}
      <main className="flex-1 min-w-0 bg-[#ffffff] dark:bg-[#0d1117]">
        {children}
      </main>

      {/* 右侧边栏 - 仅超大屏幕显示 */}
      {shouldShowRight && rightSidebar && (
        <aside
          className={clsx(
            'hidden xl:block flex-shrink-0',
            'sticky top-[64px] h-[calc(100vh-64px)]',
            'overflow-y-auto',
            'border-l border-[#d0d7de] dark:border-[#30363d]',
            'bg-[#f6f8fa] dark:bg-[#161b22]'
          )}
          style={{ width: SIDEBAR_WIDTH }}
        >
          {rightSidebar}
        </aside>
      )}
    </div>
  );
}
