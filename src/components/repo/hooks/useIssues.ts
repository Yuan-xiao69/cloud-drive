'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/lib/api/client';

interface IssueItem {
  id: string;
  title: string;
  content: string;
  status: string;
  priority?: string;
  templateType?: string | null;
  dueDate?: string | null;
  relatedFileId?: string | null;
  assigneeId?: string | null;
  labels: { name: string; color: string }[];
  commentsCount: number;
  author: { username: string; avatarUrl: string | null };
  createdAt: string;
}

interface UseIssuesOptions {
  username: string;
  repoName: string;
}

export function useIssues({ username, repoName }: UseIssuesOptions) {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };
      if (status !== 'all') params.status = status;
      if (debouncedSearch) params.search = debouncedSearch;
      const data = await api.get<{ items: IssueItem[]; pagination: { total: number; totalPages: number } }>(`/api/v1/repos/${username}/${repoName}/issues`, params);
      if (data.code === 200) {
        setIssues(data.data.items);
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

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const createIssue = useCallback(async (data: {
    title: string; content: string; labels: { name: string; color: string }[]; priority?: string; templateType?: string;
  }) => {
    await api.post(`/api/v1/repos/${username}/${repoName}/issues`, data);
    await fetchIssues();
  }, [username, repoName, fetchIssues]);

  return {
    issues, total, page, pageSize, totalPages,
    status, setStatus,
    searchQuery, setSearchQuery,
    isLoading, error,
    setPage, fetchIssues, createIssue,
  };
}

export type { IssueItem };
