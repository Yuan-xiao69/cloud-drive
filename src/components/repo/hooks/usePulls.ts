'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api/client';

interface PullRequestItem {
  id: string;
  title: string;
  content: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  sourceRepo?: { id: string; name: string; fullName: string };
  commentsCount: number;
  author: { username: string; avatarUrl: string | null };
  createdAt: string;
}

interface UsePullsOptions {
  username: string;
  repoName: string;
}

export function usePulls({ username, repoName }: UsePullsOptions) {
  const [pulls, setPulls] = useState<PullRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<'open' | 'merged' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPulls = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };
      if (status !== 'all') params.status = status;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await api.get<{ items: PullRequestItem[]; pagination: { total: number; totalPages: number } }>(`/api/v1/repos/${username}/${repoName}/pulls`, params);
      if (data.code === 200) {
        setPulls(data.data.items);
        setTotal(data.data.pagination?.total || 0);
        setTotalPages(data.data.pagination?.totalPages || 0);
      } else {
        setError(data.message || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  }, [username, repoName, page, pageSize, status, debouncedSearch]);

  useEffect(() => { fetchPulls(); }, [fetchPulls]);

  const createPull = useCallback(async (data: {
    title: string; content: string; sourceBranch: string; targetBranch: string;
  }) => {
    await api.post(`/api/v1/repos/${username}/${repoName}/pulls`, data);
    await fetchPulls();
  }, [username, repoName, fetchPulls]);

  return {
    pulls, total, page, pageSize, totalPages,
    status, setStatus,
    searchQuery, setSearchQuery,
    isLoading, error,
    setPage, fetchPulls, createPull,
  };
}

export type { PullRequestItem };
