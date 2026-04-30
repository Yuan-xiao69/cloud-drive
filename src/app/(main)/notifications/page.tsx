'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';

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
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filterType === 'unread') params.set('isRead', 'false');
      if (filterType === 'read') params.set('isRead', 'true');
      if (category !== 'all') params.set('type', category);
      if (priority !== 'all') params.set('priority', priority);
      
      const response = await fetch(`/api/v1/notifications?${params.toString()}`);
      const data = await response.json();
      
      if (data.code === 200) {
        setNotifications(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
        setTotal(data.data.pagination.total);
      }
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
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
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
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
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
      await fetch(`/api/v1/notifications?ids=${ids.join(',')}`, {
        method: 'DELETE',
      });
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
      await fetch('/api/v1/notifications?readAll=true', {
        method: 'DELETE',
      });
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
        await fetch('/api/v1/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [notification.id] }),
        });
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return { bg: '#e6f4ff', color: '#0969da' };
      case 'discussion': return { bg: '#f6ffed', color: '#52c41a' };
      case 'comment': return { bg: '#fff7e6', color: '#fa8c16' };
      case 'mention': return { bg: '#f9f0ff', color: '#722ed1' };
      case 'star': return { bg: '#fffbe6', color: '#faad14' };
      case 'fork': return { bg: '#ffe7e7', color: '#cf1322' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return { bg: '#fff1f0', color: '#cf1322', border: '#ffccc7' };
      case 'high': return { bg: '#fff7e6', color: '#d46b08', border: '#ffd591' };
      case 'low': return { bg: '#f5f5f5', color: '#8c8c8c', border: '#d9d9d9' };
      default: return { bg: 'transparent', color: 'transparent', border: 'transparent' };
    }
  };

  if (authLoading) {
    return (
      <div className="notifications-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="notifications-page">
        <div className="notifications-container">
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h2>登录后查看通知</h2>
            <p>登录后即可查看和管理您的所有通知</p>
            <button onClick={() => router.push('/login')} className="btn-primary">
              前往登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        {/* Header */}
        <div className="notifications-header">
          <div className="header-left">
            <button onClick={() => router.back()} className="back-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </button>
            <h1>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              通知中心
            </h1>
          </div>
          <div className="header-actions">
            {total > 0 && (
              <button 
                onClick={handleMarkAllRead} 
                className="btn-icon-text"
                disabled={actionLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                全部已读
              </button>
            )}
            <button 
              onClick={handleClearRead} 
              className="btn-icon-text"
              disabled={actionLoading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              清空已读
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => { setFilterType('all'); setPage(1); }}
            >
              全部
            </button>
            <button 
              className={`filter-tab ${filterType === 'unread' ? 'active' : ''}`}
              onClick={() => { setFilterType('unread'); setPage(1); }}
            >
              未读
              {total > 0 && <span className="badge">{notifications.filter(n => !n.isRead).length}</span>}
            </button>
            <button 
              className={`filter-tab ${filterType === 'read' ? 'active' : ''}`}
              onClick={() => { setFilterType('read'); setPage(1); }}
            >
              已读
            </button>
          </div>
          <div className="filter-selects">
            <select value={category} onChange={(e) => { setCategory(e.target.value as CategoryType); setPage(1); }}>
              <option value="all">全部类型</option>
              <option value="discussion">讨论</option>
              <option value="comment">评论</option>
              <option value="mention">提及</option>
              <option value="star">收藏</option>
              <option value="fork">Fork</option>
              <option value="system">系统</option>
            </select>
            <select value={priority} onChange={(e) => { setPriority(e.target.value as PriorityType); setPage(1); }}>
              <option value="all">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">重要</option>
              <option value="normal">普通</option>
              <option value="low">低</option>
            </select>
          </div>
          <span className="total-count">{total} 条通知</span>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bulk-actions">
            <span className="selected-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              已选择 {selectedIds.size} 项
            </span>
            <button onClick={handleMarkRead} disabled={actionLoading} className="btn-action">
              标记已读
            </button>
            <button onClick={handleDelete} disabled={actionLoading} className="btn-action btn-danger">
              删除
            </button>
            <button onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }} className="btn-action btn-ghost">
              取消
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="notifications-list">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>加载中...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </div>
              <h2>暂无通知</h2>
              <p>当有新的互动时，您会在这里收到通知</p>
              <div className="empty-hints">
                <span>尝试：</span>
                <a href="/explore">探索有趣的内容</a>
                <span>或</span>
                <a href="/">浏览首页</a>
              </div>
            </div>
          ) : (
            <>
              <div className="list-header">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                  <span>全选</span>
                </label>
              </div>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <label 
                    className="checkbox-wrapper notification-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(notification.id)}
                      onChange={() => handleSelect(notification.id)}
                    />
                  </label>
                  <div 
                    className="notification-icon"
                    style={{ backgroundColor: getTypeColor(notification.type).bg, color: getTypeColor(notification.type).color }}
                  >
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <span 
                        className="notification-type"
                        style={{ backgroundColor: getTypeColor(notification.type).bg, color: getTypeColor(notification.type).color }}
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
                          className="priority-badge"
                          style={{ 
                            backgroundColor: getPriorityColor(notification.priority).bg, 
                            color: getPriorityColor(notification.priority).color,
                            borderColor: getPriorityColor(notification.priority).border
                          }}
                        >
                          {notification.priority === 'urgent' && '🔥 紧急'}
                          {notification.priority === 'high' && '⚡ 重要'}
                          {notification.priority === 'low' && '○ 低'}
                        </span>
                      )}
                      <span className="notification-time">{formatTimeAgo(notification.createdAt)}</span>
                    </div>
                    <h3 className="notification-title">{notification.title}</h3>
                    <p className="notification-text">{notification.content}</p>
                    {notification.sender && (
                      <span className="notification-sender">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        @{notification.sender.username}
                      </span>
                    )}
                  </div>
                  {!notification.isRead && <span className="unread-dot"></span>}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && notifications.length > 0 && totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-pagination"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              上一页
            </button>
            <div className="page-numbers">
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
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`page-number ${page === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-pagination"
            >
              下一页
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .notifications-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #f6f8fa 0%, #ffffff 100%);
          padding: 32px 24px;
        }

        .notifications-container {
          max-width: 800px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .notifications-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #e1e4e8;
          background: linear-gradient(180deg, #ffffff 0%, #f6f8fa 100%);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .notifications-header h1 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          color: #24292f;
        }

        .notifications-header h1 svg {
          color: #0969da;
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 8px;
          cursor: pointer;
          color: #57606a;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #f3f4f6;
          border-color: #0969da;
          color: #0969da;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-icon-text {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #57606a;
          transition: all 0.2s;
        }

        .btn-icon-text:hover:not(:disabled) {
          background: #f6f8fa;
          border-color: #0969da;
          color: #0969da;
        }

        .btn-icon-text:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .notifications-filters {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid #e1e4e8;
          background: #f6f8fa;
          flex-wrap: wrap;
        }

        .filter-tabs {
          display: flex;
          gap: 4px;
          background: #eaeef2;
          padding: 4px;
          border-radius: 8px;
        }

        .filter-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #57606a;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          color: #24292f;
        }

        .filter-tab.active {
          background: #ffffff;
          color: #24292f;
          font-weight: 500;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .filter-tab .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          background: #0969da;
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          border-radius: 9px;
        }

        .filter-selects {
          display: flex;
          gap: 8px;
        }

        .filter-selects select {
          padding: 8px 12px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 8px;
          font-size: 14px;
          color: #57606a;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-selects select:hover {
          border-color: #0969da;
        }

        .filter-selects select:focus {
          outline: none;
          border-color: #0969da;
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
        }

        .total-count {
          margin-left: auto;
          font-size: 14px;
          color: #8b949e;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background: linear-gradient(90deg, #dbeafe 0%, #bfdbfe 100%);
          border-bottom: 1px solid #93c5fd;
          font-size: 14px;
        }

        .selected-info {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #1d4ed8;
          font-weight: 500;
        }

        .btn-action {
          padding: 6px 14px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: #57606a;
          transition: all 0.2s;
        }

        .btn-action:hover:not(:disabled) {
          background: #f6f8fa;
        }

        .btn-action.btn-danger {
          color: #cf222e;
          border-color: #f85149;
        }

        .btn-action.btn-danger:hover:not(:disabled) {
          background: #fff1f0;
        }

        .btn-action.btn-ghost {
          border: none;
          background: transparent;
        }

        .notifications-list {
          min-height: 300px;
        }

        .list-header {
          display: flex;
          align-items: center;
          padding: 12px 24px;
          border-bottom: 1px solid #eaeef2;
          background: #f6f8fa;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #57606a;
          font-size: 14px;
        }

        .checkbox-wrapper input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #0969da;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px 24px;
          border-bottom: 1px solid #eaeef2;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
        }

        .notification-item:hover {
          background: #f6f8fa;
        }

        .notification-item.unread {
          background: linear-gradient(90deg, rgba(9, 105, 218, 0.04) 0%, rgba(9, 105, 218, 0.02) 100%);
          border-left: 3px solid #0969da;
        }

        .notification-item.unread:hover {
          background: linear-gradient(90deg, rgba(9, 105, 218, 0.08) 0%, rgba(9, 105, 218, 0.04) 100%);
        }

        .notification-checkbox {
          padding-top: 4px;
        }

        .notification-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }

        .notification-type {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }

        .priority-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border: 1px solid;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }

        .notification-time {
          font-size: 13px;
          color: #8b949e;
          margin-left: auto;
        }

        .notification-title {
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 6px 0;
          color: #24292f;
          line-height: 1.4;
        }

        .notification-text {
          font-size: 14px;
          color: #57606a;
          margin: 0;
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .notification-sender {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 13px;
          color: #0969da;
        }

        .unread-dot {
          position: absolute;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          background: linear-gradient(135deg, #0969da 0%, #0550ae 100%);
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.2);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
        }

        .empty-icon {
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f0f4f8 0%, #e8ecf0 100%);
          border-radius: 50%;
          margin-bottom: 24px;
          color: #8b949e;
        }

        .empty-state h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #24292f;
        }

        .empty-state p {
          font-size: 14px;
          color: #57606a;
          margin: 0 0 24px 0;
        }

        .empty-hints {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #57606a;
        }

        .empty-hints a {
          color: #0969da;
          text-decoration: none;
        }

        .empty-hints a:hover {
          text-decoration: underline;
        }

        .btn-primary {
          padding: 12px 24px;
          background: linear-gradient(135deg, #0969da 0%, #0550ae 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(9, 105, 218, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(9, 105, 218, 0.4);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          color: #57606a;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #eaeef2;
          border-top-color: #0969da;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #eaeef2;
          background: #f6f8fa;
        }

        .btn-pagination {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #57606a;
          transition: all 0.2s;
        }

        .btn-pagination:hover:not(:disabled) {
          background: #f6f8fa;
          border-color: #0969da;
          color: #0969da;
        }

        .btn-pagination:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-numbers {
          display: flex;
          gap: 4px;
        }

        .page-number {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d0d7de;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #57606a;
          transition: all 0.2s;
        }

        .page-number:hover {
          background: #f6f8fa;
          border-color: #0969da;
          color: #0969da;
        }

        .page-number.active {
          background: #0969da;
          border-color: #0969da;
          color: #ffffff;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .notifications-page {
            padding: 16px 12px;
          }

          .notifications-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .notifications-filters {
            flex-direction: column;
            align-items: flex-start;
          }

          .filter-tabs {
            width: 100%;
            overflow-x: auto;
          }

          .filter-selects {
            width: 100%;
          }

          .filter-selects select {
            flex: 1;
          }

          .total-count {
            margin-left: 0;
          }

          .notification-item {
            padding: 16px;
          }

          .notification-icon {
            width: 40px;
            height: 40px;
          }

          .empty-state {
            padding: 60px 16px;
          }
        }
      `}</style>
    </div>
  );
}
