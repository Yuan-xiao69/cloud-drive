'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useAnnouncements } from '@/lib/hooks/use-announcements';
import { Button } from '@/components/design';

const STORAGE_KEY = 'dismissed_announcements';

export default function AnnouncementBanner() {
  const { announcements: allAnnouncements, loading } = useAnnouncements();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(false);

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
    setDismissedLoaded(true);
  }, []);

  // 只显示 high/urgent 优先级且未被关闭的公告
  const announcements = allAnnouncements.filter(
    (a) =>
      (a.priority === 'high' || a.priority === 'urgent') &&
      !dismissedIds.has(a.id)
  );

  // 关闭公告
  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newDismissed]));
  };

  // 按优先级和类型排序
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.type === 'critical' && b.type !== 'critical') return -1;
    if (b.type === 'critical' && a.type !== 'critical') return 1;
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
    return 0;
  });

  if (loading || !dismissedLoaded || sortedAnnouncements.length === 0) {
    return null;
  }

  // 只显示最重要的一个公告
  const topAnnouncement = sortedAnnouncements[0];

  const typeStyles = {
    info: {
      bg: 'bg-[var(--ds-surface-subtle)]',
      border: 'border-[var(--ds-border-default)]',
      text: 'text-[var(--ds-text-primary)]',
      icon: <Info className="w-4 h-4" />,
    },
    warning: {
      bg: 'bg-[var(--ds-warning-subtle)]',
      border: 'border-[var(--ds-warning-default)]',
      text: 'text-[var(--ds-warning-default)]',
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    critical: {
      bg: 'bg-[var(--ds-danger-subtle)]',
      border: 'border-[var(--ds-danger-default)]',
      text: 'text-[var(--ds-danger-default)]',
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDismiss(topAnnouncement.id)}
          className={`flex-shrink-0 ${style.text}`}
          aria-label="关闭公告"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
