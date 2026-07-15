'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

const navItems = [
  { id: 'home', label: '首页', href: '/', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  )},
  { id: 'explore', label: '探索', href: '/explore', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  )},
  { id: 'discussions', label: '讨论', href: '/discussions', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  )},
  { id: 'notifications', label: '通知', href: '/notifications', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
  )},
];

function getActiveId(pathname: string | null) {
  if (!pathname) return undefined;
  if (pathname === '/') return 'home';
  if (pathname?.startsWith('/explore')) return 'explore';
  if (pathname?.startsWith('/discussions')) return 'discussions';
  if (pathname?.startsWith('/notifications')) return 'notifications';
  return undefined;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname?.startsWith('/login')
    || pathname?.startsWith('/register')
    || pathname?.startsWith('/forgot-password')
    || pathname?.startsWith('/reset-password');
  const isAdmin = pathname?.startsWith('/admin');
  const isShare = pathname?.startsWith('/share');

  // auth 页面 + 分享页：无 Header、无 BottomNav
  if (isAuth || isShare) return children;

  return (
    <div className="flex flex-col h-screen bg-[var(--ds-page-bg)] transition-colors duration-300">
      {!isAdmin && <Header />}
      <div className="flex-1 flex min-h-0">
        {children}
      </div>
      {!isAdmin && <BottomNav items={navItems} activeId={getActiveId(pathname)} />}
    </div>
  );
}
