'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import { formatTimeAgo } from '@/lib/utils';
import { fetchNotifications as fetchNotificationsApi, markNotificationsRead, markAllNotificationsRead, deleteNotifications, clearReadNotifications } from '@/lib/hooks/use-notifications';
import { Card, Button, PageLayout, PageLayoutContent, Empty, Select } from '@/components/design';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  linkUrl: string | null;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

type FilterType = 'all' | 'unread' | 'read';
type CategoryType = 'all' | 'discussion' | 'comment' | 'mention' | 'star' | 'fork' | 'system';
type PriorityType = 'all' | 'urgent' | 'high' | 'normal' | 'low';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [category, setCategory] = useState<CategoryType>('all');
  const [priority, setPriority] = useState<PriorityType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params: {
        page?: number;
        limit?: number;
        isRead?: boolean;
        type?: string;
        priority?: string;
      } = {
        page,
        limit: 20,
      };
      if (filterType === 'unread') params.isRead = false;
      if (filterType === 'read') params.isRead = true;
      if (category !== 'all') params.type = category;
      if (priority !== 'all') params.priority = priority;

      const data = await fetchNotificationsApi(params);
      setNotifications(data.items as Notification[]);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, category, priority]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [filterType, category, priority, page]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
    setSelectAll(newSet.size === notifications.length);
  };

  const handleMarkRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      setActionLoading(true);
      const ids = Array.from(selectedIds);
      await markNotificationsRead(ids);
      fetchNotifications();
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('标记已读失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await markAllNotificationsRead();
      fetchNotifications();
    } catch (error) {
      console.error('标记全部已读失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      setActionLoading(true);
      const ids = Array.from(selectedIds);
      await deleteNotifications(ids);
      fetchNotifications();
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('删除通知失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearRead = async () => {
    try {
      setActionLoading(true);
      await clearReadNotifications();
      fetchNotifications();
    } catch (error) {
      console.error('清空已读失败:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationsRead([notification.id]);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }

    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system': return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      );
      case 'discussion': return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
      case 'comment': return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      );
      case 'mention': return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
        </svg>
      );
      case 'star': return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
      case 'fork': return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
          <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/>
        </svg>
      );
      default: return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      );
    }
  };

  const getTypeColorClass = (type: string): string => {
    switch (type) {
      case 'system': return 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]';
      case 'discussion': return 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]';
      case 'comment': return 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]';
      case 'mention': return 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]';
      case 'star': return 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]';
      case 'fork': return 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]';
      default: return 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-tertiary)]';
    }
  };

  const getPriorityColorClass = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] border-[var(--ds-danger-default)]';
      case 'high': return 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)] border-[var(--ds-warning-default)]';
      case 'low': return 'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-tertiary)] border-[var(--ds-border-default)]';
      default: return '';
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center py-20 text-[var(--ds-text-secondary)]">
        <div className="w-10 h-10 border-[3px] border-[var(--ds-border-muted)] border-t-[var(--ds-accent-default)] rounded-full animate-spin mb-4"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 min-w-0 flex items-center justify-center p-6">
        <Empty
          title="登录后查看通知"
          description="登录后即可查看和管理您的所有通知"
          action={{ label: '前往登录', onClick: () => router.push('/login') }}
        />
      </div>
    );
  }

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <Card variant="elevated" padding="none" className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => router.back()} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>} />
            <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--ds-text-primary)] m-0">
              <svg className="text-[var(--ds-accent-default)]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              通知中心
            </h1>
          </div>
          <div className="flex gap-2">
            {total > 0 && (
              <Button variant="secondary" size="md" onClick={handleMarkAllRead} disabled={actionLoading} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}>全部已读</Button>
            )}
            <Button variant="secondary" size="md" onClick={handleClearRead} disabled={actionLoading} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}>清空已读</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 px-6 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-inset)] flex-wrap">
          <div className="flex gap-1 bg-[var(--ds-surface-inset)] p-1">
            <Button
              className={`flex items-center gap-1.5 px-4 py-2 border-none bg-transparent rounded-md cursor-pointer text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors ${filterType === 'all' ? 'bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] font-medium shadow-sm' : ''}`}
              onClick={() => { setFilterType('all'); setPage(1); }}
            >
              全部
            </Button>
            <Button
              className={`flex items-center gap-1.5 px-4 py-2 border-none bg-transparent rounded-md cursor-pointer text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors ${filterType === 'unread' ? 'bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] font-medium shadow-sm' : ''}`}
              onClick={() => { setFilterType('unread'); setPage(1); }}
            >
              未读
              {total > 0 && <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-[var(--ds-accent-default)] text-white text-[11px] font-semibold rounded-full">{notifications.filter(n => !n.isRead).length}</span>}
            </Button>
            <Button
              className={`flex items-center gap-1.5 px-4 py-2 border-none bg-transparent rounded-md cursor-pointer text-sm text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors ${filterType === 'read' ? 'bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] font-medium shadow-sm' : ''}`}
              onClick={() => { setFilterType('read'); setPage(1); }}
            >
              已读
            </Button>
          </div>
          <div className="flex gap-2">
            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value as CategoryType); setPage(1); }}
              options={[
                { value: 'all', label: '全部类型' },
                { value: 'discussion', label: '讨论' },
                { value: 'comment', label: '评论' },
                { value: 'mention', label: '提及' },
                { value: 'star', label: '收藏' },
                { value: 'fork', label: 'Fork' },
                { value: 'system', label: '系统' },
              ]}
            />
            <Select
              value={priority}
              onChange={(e) => { setPriority(e.target.value as PriorityType); setPage(1); }}
              options={[
                { value: 'all', label: '全部优先级' },
                { value: 'urgent', label: '紧急' },
                { value: 'high', label: '重要' },
                { value: 'normal', label: '普通' },
                { value: 'low', label: '低' },
              ]}
            />
          </div>
          <span className="ml-auto text-sm text-[var(--ds-text-secondary)]">{total} 条通知</span>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 px-6 bg-[var(--ds-accent-subtle)] border-b border-[var(--ds-border-default)] text-sm">
            <span className="flex items-center gap-1.5 text-[var(--ds-accent-default)] font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              已选择 {selectedIds.size} 项
            </span>
            <Button onClick={handleMarkRead} disabled={actionLoading} className="px-3.5 py-1.5 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] cursor-pointer text-[13px] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-subtle)] transition-colors bg-[var(--ds-page-bg)] disabled:opacity-50">
              标记已读
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={actionLoading}>
              删除
            </Button>
            <Button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }} className="px-3.5 py-1.5 border-none bg-transparent cursor-pointer text-[13px] text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-subtle)] transition-colors">
              取消
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--ds-text-secondary)]">
              <div className="w-10 h-10 border-[3px] border-[var(--ds-border-muted)] border-t-[var(--ds-accent-default)] rounded-full animate-spin mb-4"></div>
              <p>加载中...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Empty
              title="暂无通知"
              description="当有新的互动时，您会在这里收到通知"
              action={{ label: '去探索', onClick: () => router.push('/explore') }}
            />
          ) : (
            <>
              <div className="flex items-center p-3 px-6 border-b border-[var(--ds-border-muted)] bg-[var(--ds-surface-inset)]">
                <label htmlFor="select-all" className="flex items-center gap-2 cursor-pointer text-sm text-[var(--ds-text-secondary)]">
                  <input
                    id="select-all"
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-[18px] h-[18px] cursor-pointer accent-[var(--ds-accent-default)]"
                  />
                  <span>全选</span>
                </label>
              </div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  role="button"
                  tabIndex={0}
                  className={`flex items-start gap-4 p-5 px-6 border-b border-[var(--ds-border-muted)] cursor-pointer transition-colors hover:bg-[var(--ds-surface-subtle)] relative ${!notification.isRead ? 'bg-[var(--ds-accent-subtle)] border-l-[3px] border-l-[var(--ds-accent-default)]' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(notification); } }}
                >
                  <span
                    className="flex items-center gap-2 cursor-pointer text-sm text-[var(--ds-text-secondary)] pt-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                    role="presentation"
                  >
                    <input
                      id={`notification-${notification.id}`}
                      type="checkbox"
                      checked={selectedIds.has(notification.id)}
                      onChange={() => handleSelect(notification.id)}
                      className="w-[18px] h-[18px] cursor-pointer accent-[var(--ds-accent-default)]"
                    />
                  </span>
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${getTypeColorClass(notification.type)}`}
                  >
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColorClass(notification.type)}`}
                      >
                        {notification.type === 'system' && '系统'}
                        {notification.type === 'discussion' && '讨论'}
                        {notification.type === 'comment' && '评论'}
                        {notification.type === 'mention' && '提及'}
                        {notification.type === 'star' && '收藏'}
                        {notification.type === 'fork' && 'Fork'}
                        {!['system', 'discussion', 'comment', 'mention', 'star', 'fork'].includes(notification.type) && '通知'}
                      </span>
                      {notification.priority !== 'normal' && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-xs font-medium ${getPriorityColorClass(notification.priority)}`}
                        >
                          {notification.priority === 'urgent' && '🔥 紧急'}
                          {notification.priority === 'high' && '⚡ 重要'}
                          {notification.priority === 'low' && '○ 低'}
                        </span>
                      )}
                      <span className="text-[13px] text-[var(--ds-text-secondary)] ml-auto">{formatTimeAgo(notification.createdAt)}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold mb-1.5 text-[var(--ds-text-primary)] leading-relaxed m-0">{notification.title}</h3>
                    <p className="text-sm text-[var(--ds-text-secondary)] leading-relaxed truncate m-0">{notification.content}</p>
                    {notification.sender && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[13px] text-[var(--ds-accent-default)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        @{notification.sender.username}
                      </span>
                    )}
                  </div>
                  {!notification.isRead && <span className="absolute right-6 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[var(--ds-accent-default)] rounded-full shadow-[0_0_0_3px_var(--ds-accent-subtle)]"></span>}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && notifications.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-5 px-6 border-t border-[var(--ds-border-muted)] bg-[var(--ds-surface-inset)]">
            <Button variant="secondary" size="md" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>}>上一页</Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 flex items-center justify-center border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] cursor-pointer text-sm text-[var(--ds-text-secondary)] hover:bg-[var(--ds-surface-subtle)] hover:border-[var(--ds-accent-default)] hover:text-[var(--ds-accent-default)] transition-colors bg-[var(--ds-page-bg)] ${page === pageNum ? 'bg-[var(--ds-accent-default)] border-[var(--ds-accent-default)] text-white font-semibold' : ''}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button variant="secondary" size="md" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>}>下一页</Button>
          </div>
        )}
      </Card>
    </PageLayoutContent></PageLayout>
  );
}
