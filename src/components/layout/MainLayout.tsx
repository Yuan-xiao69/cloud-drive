'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Avatar, Badge } from '@/components/ui';
import { useAuth } from '@/lib/providers';

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  {
    label: '首页',
    href: '/',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8.354 1.146a.5.5 0 00-.708 0l-6 6A.5.5 0 001.5 7.5v7a.5.5 0 00.5.5h4.5a.5.5 0 00.5-.5v-4h3v4a.5.5 0 00.5.5H14a.5.5 0 00.5-.5v-7a.5.5 0 00-.146-.354L8.354 1.146zM2 7.5a.5.5 0 01.5-.5h3v3H3.5a.5.5 0 01-.5-.5zm10.5-1H10v-3h2.5a.5.5 0 010 1z"/>
      </svg>
    ),
  },
  {
    label: '仓库',
    href: '/explore',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v2h2a.75.75 0 010 1.5h-2.75a.75.75 0 01-.75-.75V7.25a.75.75 0 01.75-.75h2V2.5H4.5A1.5 1.5 0 003 4v12a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-12a.5.5 0 00-.5-.5h-2.5a.5.5 0 00-.5.5v12.5a.5.5 0 00.5.5h2A2.5 2.5 0 0014 14.5V4.5H4.5a.5.5 0 01-.5-.5V2.5A2.5 2.5 0 002 2.5z"/>
      </svg>
    ),
  },
  {
    label: '讨论',
    href: '/discussions',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2.5 3a.5.5 0 000 1h11a.5.5 0 000-1h-11zm0 3a.5.5 0 000 1h8a.5.5 0 000-1h-8zm0 3a.5.5 0 000 1h11a.5.5 0 000-1h-11z"/>
      </svg>
    ),
  },
];

interface SidebarProps {
  children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="w-[var(--sidebar-width)] border-r border-[var(--color-border-default)] bg-[var(--color-bg-default)] hide-mobile">
      <div className="sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] overflow-y-auto p-4">
        {/* Main Navigation */}
        <nav className="space-y-1 mb-6">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--color-bg-inset)] text-[var(--color-fg-default)] font-medium'
                    : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-inset)]'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {user && (
          <>
            <div className="border-t border-[var(--color-border-default)] my-4" />
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-[var(--color-fg-muted)] uppercase mb-2">
                你的仓库
              </h3>
              <div className="space-y-1">
                <Link
                  href={`/${user.username}?tab=repositories`}
                  className="flex items-center justify-between px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-inset)] rounded-md"
                >
                  <span>你的仓库</span>
                </Link>
                <Link
                  href={`/${user.username}?tab=stars`}
                  className="flex items-center justify-between px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)] hover:bg-[var(--color-bg-inset)] rounded-md"
                >
                  <span>星标</span>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* Footer Links */}
        <div className="border-t border-[var(--color-border-default)] mt-6 pt-4 px-3">
          <div className="text-xs text-[var(--color-fg-subtle)] space-y-2">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <a href="#" className="hover:underline">关于</a>
              <a href="#" className="hover:underline">帮助</a>
              <a href="#" className="hover:underline">隐私</a>
              <a href="#" className="hover:underline">条款</a>
            </div>
            <div>© 2024 GitHub Platform</div>
          </div>
        </div>

        {/* Custom Sidebar Content */}
        {children}
      </div>
    </aside>
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export function MainLayout({ children, showSidebar = true }: MainLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))]">
      {showSidebar && <Sidebar />}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
