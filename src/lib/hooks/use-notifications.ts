'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/providers';

export interface Notification {
  id?: string;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  timestamp: number;
}

interface UseNotificationStreamOptions {
  onNotification?: (notification: Notification) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseNotificationStreamReturn {
  isConnected: boolean;
  lastNotification: Notification | null;
  notifications: Notification[];
  clearNotifications: () => void;
  reconnect: () => void;
}

/**
 * SSE 通知流 Hook
 */
export function useNotificationStream(
  options: UseNotificationStreamOptions = {}
): UseNotificationStreamReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!user || typeof window === 'undefined') return;

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/v1/notifications/stream');
    eventSourceRef.current = eventSource;

    // 连接成功
    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
      options.onConnect?.();
    });

    // 收到通知
    eventSource.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse(event.data) as Notification;
        setLastNotification(notification);
        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // 保留最近50条
        options.onNotification?.(notification);
      } catch {
        console.error('[Notification] Failed to parse notification:', event.data);
      }
    });

    // 心跳
    eventSource.addEventListener('heartbeat', () => {
      // 心跳用于保持连接，不需要额外处理
    });

    // 错误处理
    eventSource.onerror = (error) => {
      console.error('[Notification] SSE error:', error);
      setIsConnected(false);
      options.onError?.(error);

      // 断开连接
      eventSource.close();
      eventSourceRef.current = null;
      options.onDisconnect?.();

      // 5秒后重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [user, options]);

  // 连接
  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // 清除通知
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setLastNotification(null);
  }, []);

  // 手动重连
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  return {
    isConnected,
    lastNotification,
    notifications,
    clearNotifications,
    reconnect,
  };
}


/**
 * 获取通知列表
 */
export async function fetchNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
}): Promise<{
  items: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
  if (params?.type) searchParams.set('type', params.type);

  const response = await fetch(`/api/v1/notifications?${searchParams.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取通知失败');
  }

  return data.data;
}


/**
 * 标记通知已读
 */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  const response = await fetch('/api/v1/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '标记已读失败');
  }
}


/**
 * 标记所有通知已读
 */
export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch('/api/v1/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markAllRead: true }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '标记已读失败');
  }
}


/**
 * 删除通知
 */
export async function deleteNotifications(ids: string[]): Promise<void> {
  const response = await fetch(`/api/v1/notifications?ids=${ids.join(',')}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || '删除通知失败');
  }
}
