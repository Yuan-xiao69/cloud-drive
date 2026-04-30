'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { useAuth, useTheme } from '@/lib/providers';
import { useNotificationStream, fetchNotifications } from '@/lib/hooks/use-notifications';
import type { Notification } from '@/lib/hooks/use-notifications';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import KeyboardShortcutsHelpModal from './KeyboardShortcutsHelpModal';

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
    <path d="M16 2C8.268 2 2 8.268 2 16c0 6.084 3.993 11.247 9.548 13.085.697.129.953-.303.953-.674 0-.332-.012-1.213-.018-2.38-3.876.842-4.694-1.869-4.694-1.869-.634-1.612-1.548-2.041-1.548-2.041-1.266-.866.096-.849.096-.849 1.4.099 2.137 1.438 2.137 1.438 1.244 2.131 3.263 1.515 4.057 1.159.126-.901.486-1.515.884-1.863-3.098-.353-6.354-1.549-6.354-6.894 0-1.523.544-2.769 1.438-3.745-.144-.353-.623-1.775.137-3.694 0 0 1.173-.375 3.857 1.43A13.38 13.38 0 0116 8.37c1.185.002 2.38.16 3.494.469 2.682-1.805 3.855-1.43 3.855-1.43.761 1.919.282 3.341.138 3.694.895.976 1.437 2.222 1.437 3.745 0 5.354-3.259 6.539-6.366 6.886.501.431.947 1.28 1.17 1.996.103.2.185.593.185 1.195 0 .865-.013 1.561-.013 1.774 0 .373.254.809 1.959.668C26.01 27.243 30 22.083 30 16c0-7.732-6.268-14-14-14z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.75 1.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z"/>
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <path d="M2.78 4.47a.75.75 0 0 1 1.06 0L6 6.69l2.16-2.22a.75.75 0 0 1 1.06 1.06l-2.69 2.78a.75.75 0 0 1-1.06 0L2.78 5.53a.75.75 0 0 1 0-1.06z"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const AdminIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const WifiIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const WifiOffIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    linkUrl?: string | null;
  }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [newNotification, setNewNotification] = useState<{
    id: string;
    title: string;
    content: string;
    type: string;
    linkUrl?: string | null;
  } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
  }>>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<{
    id: string;
    title: string;
    content: string;
    type: string;
    priority: string;
  } | null>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  // 初始化通知声音
  useEffect(() => {
    // 创建一个简单的提示音（使用 Web Audio API）
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioRef.current = {
          play: () => {
            try {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            } catch {
              // 静默处理
            }
          }
        } as unknown as HTMLAudioElement;
      } catch {
        // 静默处理
      }
    };
    createNotificationSound();
  }, []);

  // SSE 实时通知 Hook
  const { isConnected } = useNotificationStream({
    onNotification: useCallback((notification: Notification) => {
      // 添加到通知列表
      const newNotif: typeof notifications[0] = {
        id: notification.id || `temp-${Date.now()}`,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        isRead: false,
        createdAt: new Date(notification.timestamp).toISOString(),
        linkUrl: notification.linkUrl,
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
      setNewNotification(newNotif);
      setShowToast(true);

      // 播放提示音
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // 静默处理
        });
      }

      // 3秒后自动关闭 toast
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }, []),
    onConnect: useCallback(() => {
      setConnectionStatus('connected');
    }, []),
    onDisconnect: useCallback(() => {
      setConnectionStatus('disconnected');
    }, []),
    onError: useCallback(() => {
      setConnectionStatus('reconnecting');
    }, []),
  });

  // 更新连接状态
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected]);

  // 获取通知列表
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/v1/notifications?limit=10');
      const data = await response.json();
      if (data.code === 200) {
        setNotifications(data.data.items || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // 获取活跃公告
  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/announcements');
      const data = await response.json();
      if (data.code === 200 && data.data.announcements?.length > 0) {
        let anns = data.data.announcements;
        
        // 按优先级排序：urgent > high > normal > low
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        anns = [...anns].sort((a, b) => {
          const aPriority = priorityOrder[a.priority] ?? 2;
          const bPriority = priorityOrder[b.priority] ?? 2;
          return aPriority - bPriority;
        });
        
        setAnnouncements(anns);
        
        // 检查是否需要显示弹窗（高优先级/紧急公告，且未在本地存储中标记为已读）
        const storedRead = localStorage.getItem('readAnnouncements') || '';
        const readIds = storedRead ? JSON.parse(storedRead) : [];
        const unreadAnn = anns.find((a: { id: string }) => !readIds.includes(a.id));
        
        if (unreadAnn) {
          setCurrentAnnouncement(unreadAnn);
          setShowAnnouncementModal(true);
        }
      }
    } catch (error) {
      console.error('获取公告失败:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnnouncements();
    }
  }, [isAuthenticated, fetchAnnouncements]);

  // 关闭公告弹窗并标记为已读
  const handleCloseAnnouncement = () => {
    if (currentAnnouncement) {
      const storedRead = localStorage.getItem('readAnnouncements') || '[]';
      const readIds = JSON.parse(storedRead);
      if (!readIds.includes(currentAnnouncement.id)) {
        readIds.push(currentAnnouncement.id);
        localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
      }
    }
    
    // 显示下一条未读公告
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

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      // Close mobile menu on outside click
      const target = event.target as HTMLElement;
      if (!target.closest('.header-nav') && !target.closest('.header-hamburger')) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 全局快捷键：监听自定义事件显示帮助弹窗
  useEffect(() => {
    const handler = () => setShowShortcutsHelp(true);
    window.addEventListener('show-shortcuts-help', handler);
    return () => window.removeEventListener('show-shortcuts-help', handler);
  }, []);

  // 激活全局快捷键
  useKeyboardShortcuts({ enabled: true });

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNotificationClick = async (notification: { id: string; linkUrl?: string | null }) => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] })
      });
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
      if (notification.linkUrl) {
        router.push(notification.linkUrl);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      setUnreadCount(0);
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* 左侧区域：Logo + 导航链接 */}
        <div className="header-left">
          <a
            href="/"
            className="header-logo"
          >
            <LogoIcon />
            <span className="header-logo-text">文件平台</span>
          </a>

          <nav className={`header-nav${mobileMenuOpen ? ' show-mobile' : ''}`}>
            <Link href="/discussions" className="header-nav-link" onClick={() => setMobileMenuOpen(false)}>讨论</Link>
            <Link href="/explore" className="header-nav-link" onClick={() => setMobileMenuOpen(false)}>探索</Link>
          </nav>
        </div>

        {/* 中间区域：搜索框（居中） */}
        <div className="header-center">
          <form className="header-search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="搜索仓库、讨论..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="header-search-input"
            />
          </form>
        </div>

        {/* 右侧区域：操作按钮 */}
        <div className="header-right">
          {/* Hamburger menu button (mobile only) */}
          <button
            className="header-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            <MenuIcon />
          </button>
          {isAuthenticated ? (
            <>
              {/* Create new */}
              <Link href="/new" className="header-create-btn" title="创建仓库">
                <PlusIcon />
              </Link>
              {/* Notifications Dropdown */}
              <div className="header-dropdown" ref={notificationRef}>
                <button
                  className={`header-icon-btn ${showNotifications ? 'active' : ''}`}
                  title="通知"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <BellIcon />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {/* SSE 连接状态指示器 */}
                  <span 
                    className={`sse-status-indicator ${connectionStatus}`}
                    title={
                      connectionStatus === 'connected' ? '实时通知已连接' :
                      connectionStatus === 'reconnecting' ? '正在重新连接...' : '实时通知已断开'
                    }
                  >
                    {connectionStatus === 'connected' && <WifiIcon />}
                    {connectionStatus === 'disconnected' && <WifiOffIcon />}
                    {connectionStatus === 'reconnecting' && <RefreshIcon />}
                  </span>
                </button>
                {showNotifications && (
                  <div className="dropdown-menu notification-dropdown">
                    {/* 头部 */}
                    <div className="notification-dropdown-header">
                      <div className="dropdown-header-title">
                        <BellIcon />
                        <span>通知</span>
                        {unreadCount > 0 && (
                          <span className="unread-count-badge">{unreadCount}</span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          className="mark-all-read-btn"
                          onClick={handleMarkAllRead}
                        >
                          全部已读
                        </button>
                      )}
                    </div>
                    
                    {/* 新通知 Toast */}
                    {showToast && newNotification && (
                      <div className="new-notification-toast">
                        <div className="toast-icon">
                          {newNotification.type === 'system' && <span>📢</span>}
                          {newNotification.type === 'discussion' && <span>💬</span>}
                          {newNotification.type === 'comment' && <span>💭</span>}
                          {newNotification.type === 'mention' && <span>@</span>}
                          {(newNotification.type === 'star' || newNotification.type === 'fork') && <span>⭐</span>}
                          {newNotification.type === 'fork_request' && <span>🔀</span>}
                          {newNotification.type === 'fork_approved' && <span>✅</span>}
                          {newNotification.type === 'fork_rejected' && <span>❌</span>}
                        </div>
                        <div className="toast-content">
                          <p className="toast-title">{newNotification.title}</p>
                          <p className="toast-text">{newNotification.content}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* 通知列表 */}
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <div className="empty-icon">
                          <BellIcon />
                        </div>
                        <p className="empty-title">暂无通知</p>
                        <p className="empty-desc">有新的通知会在这里显示</p>
                      </div>
                    ) : (
                      <div className="notification-list">
                        {notifications.slice(0, 6).map((notification) => (
                          <div 
                            key={notification.id}
                            className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="notification-icon-wrapper">
                              <div className={`notification-icon notification-icon-${notification.type}`}>
                                {notification.type === 'system' && '📢'}
                                {notification.type === 'discussion' && '💬'}
                                {notification.type === 'comment' && '💭'}
                                {notification.type === 'mention' && '@'}
                                {(notification.type === 'star' || notification.type === 'fork') && '⭐'}
                                {notification.type === 'fork_request' && '🔀'}
                                {notification.type === 'fork_approved' && '✅'}
                                {notification.type === 'fork_rejected' && '❌'}
                                {(!notification.type || !['system', 'discussion', 'comment', 'mention', 'star', 'fork', 'fork_request', 'fork_approved', 'fork_rejected'].includes(notification.type)) && '🔔'}
                              </div>
                              {!notification.isRead && <span className="unread-dot" />}
                            </div>
                            <div className="notification-content">
                              <p className="notification-title">{notification.title}</p>
                              <p className="notification-text">{notification.content}</p>
                              <span className="notification-time">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 公告列表 */}
                    {announcements.length > 0 && (
                      <div className="announcements-section">
                        <div className="dropdown-divider" />
                        <div className="announcements-header">
                          <span>📢 系统公告</span>
                          <span className="announcements-count">{announcements.length}</span>
                        </div>
                        {announcements.slice(0, 2).map((announcement) => (
                          <div 
                            key={announcement.id}
                            className={`notification-item announcement-item announcement-${announcement.type}`}
                            onClick={() => {
                              setCurrentAnnouncement(announcement);
                              setAnnouncementIndex(announcements.findIndex(a => a.id === announcement.id));
                              setShowAnnouncementModal(true);
                              setShowNotifications(false);
                            }}
                          >
                            <div className="notification-icon-wrapper">
                              <div className="notification-icon notification-icon-announcement">
                                📢
                              </div>
                            </div>
                            <div className="notification-content">
                              <p className="notification-title">
                                <span className={`announcement-badge badge-${announcement.type}`}>
                                  {announcement.type === 'critical' ? '紧急' :
                                   announcement.type === 'warning' ? '重要' : '通知'}
                                </span>
                                {announcement.title}
                              </p>
                              <span className="notification-time">
                                {announcement.priority === 'urgent' || announcement.priority === 'high' ? '高优先级' : '普通'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 查看全部 */}
                    {notifications.length > 0 && (
                      <Link 
                        href="/notifications" 
                        className="view-all-link"
                        onClick={() => setShowNotifications(false)}
                      >
                        查看全部通知
                      </Link>
                    )}
                  </div>
                )}
              </div>
              {/* Theme Toggle */}
              <button
                className="header-icon-btn"
                onClick={toggleTheme}
                title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              {/* User menu */}
              <div className="header-dropdown" ref={menuRef}>
                <button 
                  className="header-avatar-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="header-avatar-stack">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user?.username || 'User'}
                        className="header-avatar"
                      />
                    ) : (
                      <LogoIcon />
                    )}
                  </div>
                  <ChevronDownIcon />
                </button>
                {showUserMenu && (
                  <div className="dropdown-menu dropdown-menu-user">
                    <div className="dropdown-user-header">
                      <div className="dropdown-user-avatar">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user?.username || 'User'} />
                        ) : (
                          <LogoIcon />
                        )}
                      </div>
                      <div className="dropdown-user-info">
                        <span className="dropdown-user-name">{user?.username}</span>
                        <span className="dropdown-user-username">@{user?.username}</span>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <Link href={`/${user?.username}`} className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <UserIcon />
                      您的个人资料
                    </Link>
                    <Link href="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <SettingsIcon />
                      设置
                    </Link>
                    {(user?.role === 'super_admin' || user?.role === 'admin') && (
                      <>
                        <div className="dropdown-divider" />
                        <Link href="/admin" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                          <AdminIcon />
                          管理面板
                        </Link>
                      </>
                    )}
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogoutIcon />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="header-nav-link">
                登录
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                注册
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 公告弹窗 */}
      {showAnnouncementModal && currentAnnouncement && (
        <div className="announcement-modal-overlay" onClick={handleCloseAnnouncement}>
          <div 
            className={`announcement-modal announcement-${currentAnnouncement.type}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="announcement-modal-header">
              <div className="announcement-modal-title">
                <span className={`announcement-badge badge-${currentAnnouncement.type}`}>
                  {currentAnnouncement.type === 'critical' ? '紧急' :
                   currentAnnouncement.type === 'warning' ? '重要' : '通知'}
                </span>
                <span>{currentAnnouncement.title}</span>
              </div>
              <button className="announcement-modal-close" onClick={handleCloseAnnouncement}>×</button>
            </div>
            <div className="announcement-modal-content">
              <p dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentAnnouncement.content) }} />
            </div>
            <div className="announcement-modal-footer">
              {announcements.length > 1 && (
                <span className="announcement-progress">
                  {announcementIndex + 1} / {announcements.length}
                </span>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleCloseAnnouncement}>
                我已知晓
              </button>
            </div>
          </div>
        </div>
      )}
      {showShortcutsHelp && (
        <KeyboardShortcutsHelpModal onClose={() => setShowShortcutsHelp(false)} />
      )}
    </header>
  );
}
