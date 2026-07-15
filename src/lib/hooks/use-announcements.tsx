'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isPinned?: boolean;
}

interface AnnouncementContextValue {
  announcements: Announcement[];
  loading: boolean;
}

const AnnouncementContext = createContext<AnnouncementContextValue>({
  announcements: [],
  loading: true,
});

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/v1/announcements');
        const data = await res.json();
        if (!cancelled && data.code === 200) {
          setAnnouncements(data.data?.announcements || []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announcements, loading }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncements() {
  return useContext(AnnouncementContext);
}

export type { Announcement };
