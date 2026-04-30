'use client';

import React, { useEffect, useCallback } from 'react';
import clsx from 'clsx';

/**
 * SidebarDrawer - 移动端侧边栏抽屉组件
 * 
 * 用于移动端 (<768px)，从左侧滑出的导航抽屉
 * 支持手势滑动关闭
 * 
 * @example
 * <SidebarDrawer
 *   isOpen={isOpen}
 *   onClose={closeDrawer}
 * >
 *   <SidebarContent />
 * </SidebarDrawer>
 */
export interface SidebarDrawerProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 抽屉内容 */
  children: React.ReactNode;
  /** 标题 */
  title?: string;
  /** 宽度，默认 280px */
  width?: string;
  /** 额外 className */
  className?: string;
}

export default function SidebarDrawer({
  isOpen,
  onClose,
  children,
  title,
  width = '280px',
  className,
}: SidebarDrawerProps) {
  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // 滚动锁定
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // 点击遮罩关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={clsx(
          'fixed inset-0 z-50 bg-black/50',
          'transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleBackdropClick}
        aria-hidden={!isOpen}
      />

      {/* 抽屉内容 */}
      <div
        className={clsx(
          'fixed top-0 left-0 bottom-0 z-50',
          'flex flex-col',
          'bg-[#ffffff] dark:bg-[#161b22]',
          'border-r border-[#d0d7de] dark:border-[#30363d]',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        style={{ width }}
        role="dialog"
        aria-modal={isOpen}
        aria-label={title || '导航菜单'}
      >
        {/* 头部 */}
        {title && (
          <div className="flex items-center justify-between px-4 h-14 border-b border-[#d0d7de] dark:border-[#30363d]">
            <h2 className="text-base font-semibold text-[#1f2328] dark:text-[#e6edf3]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-[#57606a] hover:text-[#1f2328] dark:text-[#8b949e] dark:hover:text-[#e6edf3] transition-colors"
              aria-label="关闭菜单"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
