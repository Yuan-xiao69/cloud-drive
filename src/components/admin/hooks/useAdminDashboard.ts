'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';

const API_BASE = '/api/v1/admin';

interface DashboardData {
  totalUsers: number;
  newUsersToday: number;
  totalPublicRepos: number;
  pendingReports: number;
  userTrend: { date: string; count: number }[];
  contentTrend: { date: string; repos: number; discussions: number }[];
  recentReports: {
    id: string; targetType: string; targetId: string; reason: string;
    status: string; reporterUsername: string; createdAt: string;
  }[];
}

export function useAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const fetchDashboard = useCallback(async (_signal?: AbortSignal) => {
    setDashboardLoading(true);
    try {
      const res = await api.get<DashboardData>(`${API_BASE}/dashboard`);
      if (res.code === undefined || res.code === 0 || (res.code >= 200 && res.code < 300)) {
        setDashboardData(res.data);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载仪表盘失败:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  return { dashboardData, dashboardLoading, fetchDashboard, setDashboardData };
}

export type { DashboardData };
