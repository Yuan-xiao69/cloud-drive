'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api/client';

const API_BASE = '/api/v1/admin';
const PAGE_SIZE = 20;

interface RepositorySummary {
  id: string; name: string; description?: string | null;
  visibility: number; language?: string | null;
  starCount: number; forkCount: number; isArchived: boolean;
  owner: { username: string; avatarUrl?: string | null };
  createdAt: string;
}

export function useAdminRepos() {
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [reposTotal, setReposTotal] = useState(0);
  const [reposPage, setReposPage] = useState(1);
  const [reposSearch, setReposSearch] = useState('');
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);

  const fetchRepos = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setReposLoading(true);
    try {
      const params: Record<string, string | number> = { page: reposPage, size: PAGE_SIZE };
      if (reposSearch) params.search = reposSearch;
      const res = await api.get<{ items: RepositorySummary[]; pagination: { total: number; page: number; size: number; totalPages: number } }>(`${API_BASE}/repos`, params);
      setRepos(res.data?.items || []);
      setReposTotal(res.data?.pagination?.total || 0);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载仓库列表失败:', err);
    } finally {
      setReposLoading(false);
    }
  }, [reposPage, reposSearch]);

  return {
    repos, reposTotal, reposPage, reposSearch, reposLoading,
    selectedRepos,
    setReposPage, setReposSearch, setRepos,
    setSelectedRepos,
    fetchRepos,
  };
}

export type { RepositorySummary };
