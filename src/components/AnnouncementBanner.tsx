'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isPinned: boolean;
}

const STORAGE_KEY = 'dismissed_announcements';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // 从 localStorage 加载已关闭的公告
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const dismissed = JSON.parse(stored) as string[];
        setDismissedIds(new Set(dismissed));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  // 获取活跃公告
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/announcements');
      if (res.ok) {
        const data = await res.json();
        // 只显示 high/urgent 优先级的公告
        const filtered = (data.data?.announcements || []).filter(
          (a: Announcement) =>
            (a.priority === 'high' || a.priority === 'urgent') &&
            !dismissedIds.has(a.id)
        );
        setAnnouncements(filtered);
      }
    } catch {
      // ignore
    }
  }, [dismissedIds]);

  useEffect(() => {
    if (!loading) {
      fetchAnnouncements();
    }
  }, [loading, fetchAnnouncements]);

  // 关闭公告
  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newDismissed]));
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  // 按优先级和类型排序
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.type === 'critical' && b.type !== 'critical') return -1;
    if (b.type === 'critical' && a.type !== 'critical') return 1;
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    return 0;
  });

  if (loading || sortedAnnouncements.length === 0) {
    return null;
  }

  // 只显示最重要的一个公告
  const topAnnouncement = sortedAnnouncements[0];

  const typeStyles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: <Info className="w-4 h-4" />,
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const style = typeStyles[topAnnouncement.type] || typeStyles.info;

  return (
    <div
      className={`${style.bg} ${style.border} border-b py-2 px-4`}
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex-shrink-0 ${style.text}`}>
            {style.icon}
          </span>
          <div className="min-w-0">
            {topAnnouncement.title && (
              <span className={`font-semibold ${style.text}`}>
                {topAnnouncement.title}
              </span>
            )}
            {topAnnouncement.title && topAnnouncement.content && (
              <span className={`mx-2 ${style.text} opacity-60`}>—</span>
            )}
            {topAnnouncement.content && (
              <span className={`${style.text} break-words`}>
                {topAnnouncement.content}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => handleDismiss(topAnnouncement.id)}
          className={`flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${style.text}`}
          aria-label="关闭公告"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
