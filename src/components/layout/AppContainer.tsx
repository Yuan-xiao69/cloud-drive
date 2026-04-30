'use client';

import React from 'react';
import clsx from 'clsx';

/**
 * AppContainer - 全局应用布局容器组件
 * 
 * 提供统一的页面布局框架：
 * - 固定 Header（64px）
 * - 可配置的侧边栏
 * - 响应式布局
 * 
 * 响应式行为：
 * - 桌面端 (≥1280px): 显示双侧边栏
 * - 平板端 (768-1279px): 仅显示左侧边栏
 * - 移动端 (<768px): 隐藏所有侧边栏
 * 
 * @example
 * // 默认用法（无侧边栏）
 * <AppContainer>
 *   <PageContainer>页面内容</PageContainer>
 * </AppContainer>
 * 
 * // 带侧边栏
 * <AppContainer
 *   leftSidebar={<LeftSidebar />}
 *   rightSidebar={<RightSidebar />}
 *   sidebars="both"
 * >
 *   <ContentGrid>
 *     {children}
 *   </ContentGrid>
 * </AppContainer>
 */
export interface AppContainerProps {
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

export default function AppContainer({
  children,
  leftSidebar,
  rightSidebar,
  sidebars = 'none',
  className = '',
}: AppContainerProps) {
  // 根据 sidebars 配置确定实际显示
  const hasLeft = sidebars === 'left' || sidebars === 'both';
  const hasRight = sidebars === 'right' || sidebars === 'both';

  return (
    <div className={clsx('min-h-screen bg-[#ffffff] dark:bg-[#0d1117]', className)}>
      {/* 
        Header 已在 layout.tsx 中全局渲染
        高度固定 64px，通过 pt-[64px] 偏移内容区
      */}

      {/* 主内容区域 - 使用 Flex 布局 */}
      <div
        className="flex flex-row"
        style={{ paddingTop: '64px' }}
      >
        {/* 左侧边栏 - 固定在桌面端 */}
        {hasLeft && leftSidebar && (
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

        {/* 主内容区 - 自适应宽度 */}
        <main className="flex-1 min-w-0 bg-[#ffffff] dark:bg-[#0d1117]">
          {children}
        </main>

        {/* 右侧边栏 - 仅在超大屏幕显示 */}
        {hasRight && rightSidebar && (
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
    </div>
  );
}
