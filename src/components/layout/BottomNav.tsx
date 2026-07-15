'use client';

import React from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * BottomNavItem - 底部导航项
 */
export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: number;
}

/**
 * BottomNav - 移动端底部导航组件
 * 
 * 用于移动端 (<768px)，提供快捷导航入口
 * 替代桌面端的左侧边栏导航
 * 
 * @example
 * const items: BottomNavItem[] = [
 *   { id: 'home', label: '首页', icon: <HomeIcon />, href: '/' },
 *   { id: 'repo', label: '仓库', icon: <RepoIcon />, href: '/repos' },
 *   { id: 'notify', label: '通知', icon: <BellIcon />, badge: 3 },
 * ];
 * 
 * <BottomNav items={items} activeId="home" onChange={setActiveId} />
 */
export interface BottomNavProps {
  /** 导航项列表 */
  items: BottomNavItem[];
  /** 当前激活项 ID */
  activeId?: string;
  /** 激活项变化回调 */
  onChange?: (id: string) => void;
  /** 额外 className */
  className?: string;
}

export default function BottomNav({
  items,
  activeId,
  onChange,
  className,
}: BottomNavProps) {
  const pathname = usePathname();

  const handleClick = (item: BottomNavItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (onChange) {
      onChange(item.id);
    }
  };

  return (
    <nav
      className={clsx(
        'lg:hidden fixed bottom-0 left-0 right-0 z-40',
        'bg-[var(--ds-surface-default)]',
        'border-t border-[var(--ds-border-default)]',
        'safe-area-pb', // iOS 安全区域
        className
      )}
      aria-label="底部导航"
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = item.href
            ? pathname === item.href || pathname.startsWith(item.href + '/')
            : item.id === activeId;

          return (
            <div key={item.id} className="flex-1 flex justify-center">
              {item.href ? (
                <Link
                  href={item.href}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-0.5 w-full h-full',
                    'transition-colors',
                    isActive
                      ? 'text-[var(--ds-accent-default)]'
                      : 'text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
                  )}
                  onClick={() => handleClick(item)}
                >
                  <div className="relative">
                    {item.icon}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-[var(--ds-danger-default)] rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              ) : (
                <button
                  className={clsx(
                    'flex flex-col items-center justify-center gap-0.5 w-full h-full',
                    'transition-colors',
                    isActive
                      ? 'text-[var(--ds-accent-default)]'
                      : 'text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)]'
                  )}
                  onClick={() => handleClick(item)}
                >
                  <div className="relative">
                    {item.icon}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-[var(--ds-danger-default)] rounded-full">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
