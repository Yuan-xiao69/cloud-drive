'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import clsx from 'clsx';
import { useAuth, useTheme } from '@/lib/providers';
import { useNotificationStream, fetchNotifications, markNotificationsRead, markAllNotificationsRead } from '@/lib/hooks/use-notifications';
import type { Notification } from '@/lib/hooks/use-notifications';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useAnnouncements } from '@/lib/hooks/use-announcements';
import { formatTimeAgo } from '@/lib/utils';
import KeyboardShortcutsHelpModal from './KeyboardShortcutsHelpModal';
import {
  LogoIcon, PlusIcon, BellIcon, ChevronDownIcon,
  UserIcon, SettingsIcon, LogoutIcon, AdminIcon, MenuIcon,
  WifiIcon, WifiOffIcon, RefreshIcon, SunIcon, MoonIcon,
} from './header-icons';
import { Button, Modal } from '@/components/design';
import { getAvatarDisplayUrl } from '@/lib/storage';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; content: string; type: string; isRead: boolean; createdAt: string; linkUrl?: string | null }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [newNotification, setNewNotification] = useState<{ id: string; title: string; content: string; type: string; linkUrl?: string | null } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const { announcements, loading: announcementsLoading } = useAnnouncements();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<{ id: string; title: string; content: string; type: string; priority: string } | null>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  // 提示音（Web Audio API）
  useEffect(() => {
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioRef.current = {
          play: () => {
            try {
              const osc = audioContext.createOscillator();
              const gain = audioContext.createGain();
              osc.connect(gain); gain.connect(audioContext.destination);
              osc.frequency.value = 800; osc.type = 'sine';
              gain.gain.setValueAtTime(0.3, audioContext.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              osc.start(audioContext.currentTime);
              osc.stop(audioContext.currentTime + 0.3);
            } catch { /* 静默处理 */ }
          }
        } as unknown as HTMLAudioElement;
      } catch { /* 静默处理 */ }
    };
    createNotificationSound();
  }, []);

  // SSE 实时通知
  const { isConnected } = useNotificationStream({
    onNotification: useCallback((notification: Notification) => {
      const newNotif = {
        id: notification.id || `temp-${Date.now()}`,
        title: notification.title, content: notification.content,
        type: notification.type, isRead: false,
        createdAt: new Date(notification.timestamp).toISOString(),
        linkUrl: notification.linkUrl,
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
      setNewNotification(newNotif);
      setShowToast(true);
      audioRef.current?.play().catch(() => {});
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3000);
    }, []),
    onConnect: useCallback(() => setConnectionStatus('connected'), []),
    onDisconnect: useCallback(() => setConnectionStatus('disconnected'), []),
    onError: useCallback(() => setConnectionStatus('reconnecting'), []),
  });

  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // 获取通知列表
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications({ limit: 10 });
      setNotifications((data.items || []) as Array<{ id: string; title: string; content: string; type: string; isRead: boolean; createdAt: string; linkUrl?: string | null }>);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { if (isAuthenticated) loadNotifications(); }, [isAuthenticated]);

  // 排序公告（按优先级），首次有未读公告时弹窗
  useEffect(() => {
    if (!isAuthenticated || announcementsLoading || announcements.length === 0) return;
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    const sorted = [...announcements].sort(
      (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
    );
    const storedRead = localStorage.getItem('readAnnouncements') || '';
    const readIds = storedRead ? JSON.parse(storedRead) : [];
    const unreadAnn = sorted.find((a) => !readIds.includes(a.id));
    if (unreadAnn) {
      setCurrentAnnouncement(unreadAnn);
      setShowAnnouncementModal(true);
    }
  }, [isAuthenticated, announcementsLoading, announcements]);

  const handleCloseAnnouncement = () => {
    if (currentAnnouncement) {
      const storedRead = localStorage.getItem('readAnnouncements') || '[]';
      const readIds = JSON.parse(storedRead);
      if (!readIds.includes(currentAnnouncement.id)) {
        readIds.push(currentAnnouncement.id);
        localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
      }
    }
    const nextIndex = announcementIndex + 1;
    if (nextIndex < announcements.length) {
      setAnnouncementIndex(nextIndex);
      setCurrentAnnouncement(announcements[nextIndex]);
    } else {
      setShowAnnouncementModal(false);
      setCurrentAnnouncement(null);
      setAnnouncementIndex(0);
    }
  };

  useEffect(() => () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); }, []);

  // Click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowUserMenu(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
      const target = event.target as HTMLElement;
      if (!target.closest('.header-mobile-nav') && !target.closest('.header-hamburger-btn')) setMobileMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = () => setShowShortcutsHelp(true);
    window.addEventListener('show-shortcuts-help', handler);
    return () => window.removeEventListener('show-shortcuts-help', handler);
  }, []);

  useKeyboardShortcuts({ enabled: true });

  const handleLogout = () => { logout(); setShowUserMenu(false); };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleNotificationClick = async (notification: { id: string; linkUrl?: string | null }) => {
    try {
      await markNotificationsRead([notification.id]);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      if (notification.linkUrl) { router.push(notification.linkUrl); setShowNotifications(false); }
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  // Notification type helpers
  const typeEmoji: Record<string, string> = {
    system: '📢', discussion: '💬', comment: '💭', mention: '@',
    star: '⭐', fork: '⭐', fork_request: '🔀', fork_approved: '✅', fork_rejected: '❌',
  };

  const typeCn: Record<string, string> = {
    critical: '紧急', warning: '重要',
  };

  const connectionIcon = {
    connected: <WifiIcon />,
    disconnected: <WifiOffIcon />,
    reconnecting: <RefreshIcon />,
  };
  const connectionTitle = {
    connected: '实时通知已连接',
    disconnected: '实时通知已断开',
    reconnecting: '正在重新连接...',
  };

  // Tailwind 公共类
  const iconBtnClass = 'relative flex items-center justify-center w-9 h-9 p-0 text-[var(--ds-text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] transition-colors';

  return (
    <header className="sticky top-0 z-50 w-full h-[var(--ds-header-height)] bg-[var(--ds-surface-overlay)] backdrop-blur-md transition-colors duration-300 border-b border-[var(--ds-border-default)]">
      <div className="flex items-center justify-between w-full h-full px-6">
        {/* 左侧：Logo + 导航 */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2 text-[var(--ds-accent-default)] hover:text-[var(--ds-accent-hover)] no-underline transition-colors">
            <LogoIcon />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">文件平台</span>
          </Link>
          <nav className={clsx('flex items-center gap-1', mobileMenuOpen && 'flex-col absolute top-[var(--header-height)] left-0 w-full bg-[var(--ds-page-bg)] border-b border-[var(--ds-border-default)] p-4 z-50')}>
            <Link href="/discussions" className="flex items-center px-3 py-2 text-sm font-medium font-sans text-[var(--ds-text-secondary)] no-underline rounded-[var(--ds-radius-sm)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] active:text-[var(--ds-accent-default)] active:bg-[var(--ds-accent-subtle)] transition-colors" onClick={() => setMobileMenuOpen(false)}>讨论</Link>
            <Link href="/explore" className="flex items-center px-3 py-2 text-sm font-medium font-sans text-[var(--ds-text-secondary)] no-underline rounded-[var(--ds-radius-sm)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] active:text-[var(--ds-accent-default)] active:bg-[var(--ds-accent-subtle)] transition-colors" onClick={() => setMobileMenuOpen(false)}>探索</Link>
          </nav>
        </div>

        {/* 中间：搜索框 */}
        <div className="flex-1 flex justify-center max-w-[480px] mx-6 hidden md:flex">
          <form className="w-full max-w-[320px] relative" onSubmit={handleSearch}>
            <input
              type="search" placeholder="搜索仓库、讨论..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 px-3 text-sm text-[var(--ds-text-primary)] bg-[var(--ds-surface-inset)] border border-[var(--ds-border-default)] placeholder:[var(--ds-text-tertiary)] focus:outline-none focus:border-[var(--ds-accent-default)] focus:ring-2 focus:ring-[var(--ds-accent-subtle)] transition-colors"
            />
          </form>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button className={clsx('header-hamburger-btn hidden max-md:flex items-center justify-center w-9 h-9 text-[var(--ds-text-secondary)] bg-transparent border-none cursor-pointer hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] transition-colors')} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="菜单">
            <MenuIcon />
          </Button>
          {isAuthenticated ? (
            <>
              <Link href="/new" className={iconBtnClass} title="创建仓库"><PlusIcon /></Link>

              {/* 通知下拉 */}
              <div className="relative" ref={notificationRef}>
                <Button className={clsx(iconBtnClass, showNotifications && 'text-[var(--ds-text-primary)] bg-[var(--ds-surface-subtle)]')} title="通知" onClick={() => setShowNotifications(!showNotifications)}>
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-[4px] text-[10px] font-semibold text-white bg-[var(--ds-danger-default)] rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  <span className={clsx('absolute -bottom-0.5 -right-0.5 text-[10px]', connectionStatus === 'connected' && 'text-[var(--ds-success-default)]', connectionStatus === 'disconnected' && 'text-[var(--ds-danger-default)]', connectionStatus === 'reconnecting' && 'text-[var(--ds-warning-default)] animate-spin')} title={connectionTitle[connectionStatus]}>
                    {connectionIcon[connectionStatus]}
                  </span>
                </Button>
                {showNotifications && (
                  <div className="absolute top-[calc(100%+8px)] -right-16 min-w-[360px] max-w-[400px] bg-[var(--ds-surface-default)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] shadow z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ds-border-default)]">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ds-text-primary)]">
                        <BellIcon /> 通知
                        {unreadCount > 0 && <span className="px-2 py-0.5 text-xs font-semibold bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] rounded-full">{unreadCount}</span>}
                      </div>
                      {unreadCount > 0 && (
                        <Button className="text-xs text-[var(--ds-accent-default)] hover:underline" onClick={handleMarkAllRead}>全部已读</Button>
                      )}
                    </div>

                    {/* Toast */}
                    {showToast && newNotification && (
                      <div className="flex items-start gap-3 mx-3 mt-3 p-3 bg-[var(--ds-accent-subtle)] border border-[var(--ds-accent-default)]/20">
                        <span>{typeEmoji[newNotification.type] || '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--ds-text-primary)]">{newNotification.title}</p>
                          <p className="text-xs text-[var(--ds-text-secondary)] truncate">{newNotification.content}</p>
                        </div>
                      </div>
                    )}

                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-[var(--ds-text-secondary)]">
                        <BellIcon /><p className="mt-2 text-sm font-medium">暂无通知</p>
                        <p className="text-xs">有新的通知会在这里显示</p>
                      </div>
                    ) : (
                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.slice(0, 6).map(n => (
                          <button key={n.id} type="button" className={clsx('w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--ds-surface-subtle)] transition-colors border-b border-[var(--ds-border-muted)] last:border-b-0', !n.isRead && 'bg-[var(--ds-surface-inset)]')} onClick={() => handleNotificationClick(n)}>
                            <span className="text-lg mt-0.5">{typeEmoji[n.type] || '🔔'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--ds-text-primary)] truncate">{n.title}</p>
                              <p className="text-xs text-[var(--ds-text-secondary)] truncate mt-0.5">{n.content}</p>
                              <span className="text-xs text-[var(--ds-text-tertiary)]">{formatTimeAgo(n.createdAt)}</span>
                            </div>
                            {!n.isRead && <span className="w-2 h-2 mt-1.5 rounded-full bg-[var(--ds-accent-default)] flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {announcements.length > 0 && (
                      <>
                        <div className="border-t border-[var(--ds-border-default)] px-4 py-2 flex items-center justify-between text-xs text-[var(--ds-text-secondary)]">
                          <span>📢 系统公告</span>
                          <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded-full">{announcements.length}</span>
                        </div>
                        {announcements.slice(0, 2).map(a => (
                          <button key={a.id} type="button" className="w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-muted)] last:border-b-0" onClick={() => {
                            setCurrentAnnouncement(a);
                            setAnnouncementIndex(announcements.findIndex(x => x.id === a.id));
                            setShowAnnouncementModal(true);
                            setShowNotifications(false);
                          }}>
                            <span>📢</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--ds-text-primary)] truncate">
                                <span className={clsx('inline-block px-1.5 py-0.5 mr-1 text-xs font-medium rounded', a.type === 'critical' ? 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]' : a.type === 'warning' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' : 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]')}>
                                  {typeCn[a.type] || '通知'}
                                </span>
                                {a.title}
                              </p>
                              <span className="text-xs text-[var(--ds-text-tertiary)]">{a.priority === 'urgent' || a.priority === 'high' ? '高优先级' : '普通'}</span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {notifications.length > 0 && (
                      <Link href="/notifications" className="block px-4 py-3 text-sm text-center text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline border-t border-[var(--ds-border-muted)]" onClick={() => setShowNotifications(false)}>
                        查看全部通知
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* 主题切换 */}
              <Button className="relative flex items-center justify-center w-9 h-9 p-0 text-[var(--ds-text-secondary)] border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] rounded-[var(--ds-radius-sm)] cursor-pointer hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] transition-colors" onClick={toggleTheme} title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </Button>

              {/* 用户菜单 */}
              <div className="relative" ref={menuRef}>
                <Button className="flex items-center gap-1 py-1 pl-1 pr-2 bg-transparent border-none rounded-[var(--ds-radius-sm)] cursor-pointer hover:bg-[var(--ds-surface-subtle)] transition-colors" onClick={() => setShowUserMenu(!showUserMenu)}>
                  <div className="flex w-7 h-7 rounded-full overflow-hidden">
                    {user?.avatarUrl ? <img src={getAvatarDisplayUrl(user.avatarUrl) ?? undefined} alt={user?.username || 'User'} className="w-full h-full object-cover" /> : <LogoIcon />}
                  </div>
                  <ChevronDownIcon />
                </Button>
                {showUserMenu && (
                  <div className="absolute top-[calc(100%+8px)] right-0 min-w-[200px] bg-[var(--ds-surface-default)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] shadow z-50 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border-default)]">
                      <div className="flex w-10 h-10 rounded-full overflow-hidden">
                        {user?.avatarUrl ? <img src={getAvatarDisplayUrl(user.avatarUrl) ?? undefined} alt={user?.username || 'User'} className="w-full h-full object-cover" /> : <LogoIcon />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--ds-text-primary)]">{user?.username}</span>
                        <span className="text-xs text-[var(--ds-text-secondary)]">@{user?.username}</span>
                      </div>
                    </div>
                    <Link href={`/${user?.username}`} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline transition-colors" onClick={() => setShowUserMenu(false)}>
                      <UserIcon /> 您的个人资料
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline transition-colors" onClick={() => setShowUserMenu(false)}>
                      <SettingsIcon /> 设置
                    </Link>
                    {(user?.role === 'super_admin' || user?.role === 'admin') && (
                      <>
                        <div className="border-t border-[var(--ds-border-muted)] my-1" />
                        <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline transition-colors" onClick={() => setShowUserMenu(false)}>
                          <AdminIcon /> 管理面板
                        </Link>
                      </>
                    )}
                    <div className="border-t border-[var(--ds-border-muted)] my-1" />
                    <Button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[var(--ds-danger-default)] hover:bg-[var(--ds-danger-subtle)] transition-colors" onClick={handleLogout}>
                      <LogoutIcon /> 退出登录
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center px-3 py-2 text-sm font-medium text-[var(--ds-text-secondary)] no-underline hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] transition-colors">登录</Link>
              <Link href="/register"><Button>注册</Button></Link>
            </>
          )}
        </div>
      </div>

      {/* 公告弹窗 */}
      <Modal
        isOpen={showAnnouncementModal && !!currentAnnouncement}
        onClose={handleCloseAnnouncement}
        title="公告详情"
        maxWidth="512px"
        footer={
          <>
            {announcements.length > 1 && (
              <span className="text-xs text-[var(--ds-text-secondary)] mr-auto">{announcementIndex + 1} / {announcements.length}</span>
            )}
            <Button onClick={handleCloseAnnouncement}>
              我已知晓
            </Button>
          </>
        }
      >
        {currentAnnouncement && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx('px-2 py-0.5 text-xs font-medium rounded', currentAnnouncement.type === 'critical' ? 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]' : currentAnnouncement.type === 'warning' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' : 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]')}>
                {typeCn[currentAnnouncement.type] || '通知'}
              </span>
              <span className="text-sm font-semibold text-[var(--ds-text-primary)]">{currentAnnouncement.title}</span>
            </div>
            <div className="text-sm text-[var(--ds-text-primary)] max-h-[60vh] overflow-y-auto">
              <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAnnouncement.content) }} />
            </div>
          </>
        )}
      </Modal>

      {showShortcutsHelp && <KeyboardShortcutsHelpModal onClose={() => setShowShortcutsHelp(false)} />}
    </header>
  );
}
