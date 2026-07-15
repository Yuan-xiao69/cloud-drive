'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api/client';

const API_BASE = '/api/v1/admin';
const PAGE_SIZE = 20;

interface UserSummary {
  id: string; uid?: number; username: string; email: string;
  role: string; isBanned: boolean; isSystem: boolean;
  avatarUrl?: string | null; createdAt: string;
  lastLoginIp?: string;
}

interface UserDetail {
  id: string; uid?: number; username: string; email: string;
  role: string; isBanned: boolean; isSystem: boolean;
  avatarUrl?: string | null; bio?: string | null; location?: string | null;
  createdAt: string; updatedAt: string;
  [key: string]: unknown;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setUsersLoading(true);
    try {
      const params: Record<string, string | number> = { page: usersPage, size: PAGE_SIZE };
      if (usersSearch) params.search = usersSearch;
      const res = await api.get<{ items: UserSummary[]; pagination: { total: number; page: number; size: number; totalPages: number } }>(`${API_BASE}/users`, params);
      setUsers(res.data?.items || []);
      setUsersTotal(res.data?.pagination?.total || 0);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载用户列表失败:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersSearch]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    try {
      const res = await api.get<UserDetail>(`${API_BASE}/users/${userId}/detail`);
      if (res.code === 200 || res.code === 0) setSelectedUserDetail(res.data);
    } catch (err) {
      console.error('获取用户详情失败:', err);
    }
  }, []);

  return {
    users, usersTotal, usersPage, usersSearch, usersLoading,
    selectedUsers, selectedUserDetail,
    setUsersPage, setUsersSearch, setUsers,
    setSelectedUsers, setSelectedUserDetail,
    fetchUsers, fetchUserDetail,
  };
}

export type { UserSummary, UserDetail };
