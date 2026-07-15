'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import type { RepoData } from '../RepoTypes';

interface UseRepoDataOptions {
  username: string;
  repoName: string;
}

export function useRepoData({ username, repoName }: UseRepoDataOptions) {
  const [repo, setRepo] = useState<RepoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarred, setIsStarred] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [isForked, setIsForked] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [forkCount, setForkCount] = useState(0);
  const [repoStats, setRepoStats] = useState<Record<string, unknown> | null>(null);
  const [repoBranches, setRepoBranches] = useState<Array<{id: string; name: string; isDefault: boolean}>>([]);

  const fetchRepo = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [repoData, statsData, branchesData] = await Promise.all([
        api.get<RepoData>(`/api/v1/repos/${username}/${repoName}`),
        api.get<Record<string, unknown>>(`/api/v1/repos/${username}/${repoName}/stats`),
        api.get<{ branches: Array<{id: string; name: string; isDefault: boolean}> }>(`/api/v1/repos/${username}/${repoName}/branches`),
      ]);
      if (repoData.code === 200) {
        const d = repoData.data as RepoData & { isWatching?: boolean; isForked?: boolean; defaultBranch?: string };
        setRepo(d);
        setIsStarred(!!d.isStarred);
        setIsWatching(!!d.isWatching);
        setIsForked(!!d.isForked);
        setStarCount(d.starCount || 0);
        setForkCount(d.forkCount || 0);

        // 处理 stats 和 branches 响应
        if (statsData.code === 200) setRepoStats(statsData.data);

        if (branchesData.code === 200) {
          setRepoBranches(branchesData.data.branches || []);
        } else {
          setRepoBranches([{ id: '', name: d.defaultBranch || 'main', isDefault: true }]);
        }
      } else {
        setError(repoData.message || '加载仓库失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误');
    } finally {
      setIsLoading(false);
    }
  }, [username, repoName]);

  useEffect(() => { fetchRepo(); }, [fetchRepo]);

  const toggleStar = useCallback(async () => {
    const data = isStarred
      ? await api.delete<{ starred: boolean; starCount: number }>(`/api/v1/repos/${username}/${repoName}/star`)
      : await api.post<{ starred: boolean; starCount: number }>(`/api/v1/repos/${username}/${repoName}/star`);
    // 使用 API 返回的真实数据，避免乐观更新导致的快速点击状态不一致
    if (data?.data) {
      setIsStarred(data.data.starred ?? !isStarred);
      setStarCount(data.data.starCount ?? (isStarred ? Math.max(0, starCount - 1) : starCount + 1));
    } else {
      setIsStarred(!isStarred);
      setStarCount(prev => isStarred ? Math.max(0, prev - 1) : prev + 1);
    }
  }, [username, repoName, isStarred, starCount]);

  const toggleWatch = useCallback(async () => {
    isWatching
      ? await api.delete(`/api/v1/repos/${username}/${repoName}/watch`)
      : await api.post(`/api/v1/repos/${username}/${repoName}/watch`);
    setIsWatching(!isWatching);
  }, [username, repoName, isWatching]);

  const toggleFork = useCallback(async () => {
    await api.post(`/api/v1/repos/${username}/${repoName}/fork`);
    setIsForked(true); setForkCount(prev => prev + 1);
  }, [username, repoName]);

  return {
    repo, setRepo, isLoading, error,
    isStarred, isWatching, isForked, starCount, forkCount,
    fetchRepo, toggleStar, toggleWatch, toggleFork,
    setStarCount, setForkCount,
    repoStats, repoBranches, setRepoBranches,
  };
}
