'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, Card, Input, Tabs, Empty, PageLayout, PageLayoutContent } from '@/components/design';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

interface SearchResult {
  repos: {
    id: string; name: string; description: string | null; language: string | null;
    starCount: number; owner: { username: string } | null;
  }[];
  users: { id: string; username: string; avatarUrl: string | null; bio: string | null }[];
  discussions: { id: string; title: string; category: string; replyCount: number; createdAt: string }[];
}

type Tab = 'repos' | 'users' | 'discussions';

function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [keyword, setKeyword] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<Tab>('repos');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) { params.set('q', trimmed); } else { params.delete('q'); }
      if (activeTab !== 'repos') { params.set('type', activeTab); } else { params.delete('type'); }
      const newUrl = `/search${params.toString() ? '?' + params.toString() : ''}`;
      router.push(newUrl, { scroll: false });

      setQuery(trimmed);
      if (trimmed) { performSearch(trimmed); } else {
        setResults(null);
        if (params.get('type')) loadAllData();
      }
    }, 400);
  };

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'users') setActiveTab('users');
    else if (type === 'discussions') setActiveTab('discussions');
    else setActiveTab('repos');
  }, [searchParams]);

  useEffect(() => {
    const type = searchParams.get('type');
    if (!query && type) loadAllData();
  }, [searchParams]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [reposRes, usersRes, discussionsRes] = await Promise.all([
        fetch('/api/v1/search?type=repos&q=&page=1&size=50').then(r => r.json()),
        fetch('/api/v1/search?type=users&q=&page=1&size=50').then(r => r.json()),
        fetch('/api/v1/search?type=discussions&q=&page=1&size=50').then(r => r.json()),
      ]);
      setResults({
        repos: reposRes.data?.items || [],
        users: usersRes.data?.items || [],
        discussions: discussionsRes.data?.items || [],
      });
    } catch { /* 静默处理 */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (initialQuery) { performSearch(initialQuery); }
    else if (searchParams.get('type')) { loadAllData(); }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) { setResults(null); return; }
    setIsLoading(true);
    try {
      const [reposRes, usersRes, discussionsRes] = await Promise.all([
        fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=repos`).then(r => r.json()),
        fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=users`).then(r => r.json()),
        fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=discussions`).then(r => r.json()),
      ]);
      setResults({
        repos: reposRes.data?.items || [],
        users: usersRes.data?.items || [],
        discussions: discussionsRes.data?.items || [],
      });
    } catch { /* 静默处理 */ }
    finally { setIsLoading(false); }
  };

  const totalResults = results
    ? (results.repos?.length || 0) + (results.users?.length || 0) + (results.discussions?.length || 0)
    : 0;

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <div className="mx-auto px-6 pb-6">
        <div className="mb-5">
          <label htmlFor="search-input" className="sr-only">搜索</label>
          <Input
            id="search-input" type="text"
            placeholder="搜索仓库、用户、讨论..."
            value={keyword}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<SearchIcon />}
          />
        </div>

        {isLoading ? null : results ? (
          <>
            <p className="text-[var(--ds-text-secondary)] text-sm mb-4">
              {query ? `找到 ${totalResults} 个关于「${query}」的结果` : `共 ${totalResults} 个结果`}
            </p>

            <Tabs
              className="mb-4"
              items={[
                { key: 'repos', label: '仓库', count: results.repos?.length || 0 },
                { key: 'users', label: '用户', count: results.users?.length || 0 },
                { key: 'discussions', label: '讨论', count: results.discussions?.length || 0 },
              ]}
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as Tab)}
            />

            <div className="flex flex-col gap-2">
              {activeTab === 'repos' && (
                results.repos?.length > 0 ? (
                  results.repos.map((repo) => (
                    <Link key={repo.id} href={`/${repo.owner?.username}/${repo.name}`} className="no-underline block">
                      <Card variant="surface" className="transition-colors hover:border-[var(--ds-border-strong)]">
                        <div className="font-semibold text-sm">
                          <span className="text-[var(--ds-text-secondary)]">{repo.owner?.username}</span>
                          <span className="text-[var(--ds-text-tertiary)]">/</span>
                          <span className="text-[var(--ds-accent-default)]">{repo.name}</span>
                        </div>
                        <p className="text-sm text-[var(--ds-text-secondary)] mt-1 line-clamp-2">{repo.description || '暂无描述'}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--ds-text-tertiary)]">
                          <span>★ {repo.starCount}</span>
                        </div>
                      </Card>
                    </Link>
                  ))
                ) : <Empty title="没有找到仓库" />
              )}

              {activeTab === 'users' && (
                results.users?.length > 0 ? (
                  results.users.map((user) => (
                    <Link key={user.id} href={`/${user.username}`} className="no-underline block">
                      <Card variant="surface" className="transition-colors hover:border-[var(--ds-border-strong)]">
                        <div className="flex items-start gap-3">
                          <Avatar src={user.avatarUrl} alt={user.username} size="md" fallback={user.username} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[var(--ds-text-primary)]">{user.username}</div>
                            <p className="text-sm text-[var(--ds-text-secondary)] mt-1 line-clamp-2">{user.bio || '暂无简介'}</p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))
                ) : <Empty title="没有找到用户" />
              )}

              {activeTab === 'discussions' && (
                results.discussions?.length > 0 ? (
                  results.discussions.map((disc) => (
                    <Link key={disc.id} href={`/discussions/${disc.id}`} className="no-underline block">
                      <Card variant="surface" className="transition-colors hover:border-[var(--ds-border-strong)]">
                        <div className="font-semibold text-[var(--ds-text-primary)] text-sm">{disc.title}</div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--ds-text-secondary)]">
                          <span>{disc.category}</span>
                          <span>·</span>
                          <span>{disc.replyCount} 回复</span>
                        </div>
                      </Card>
                    </Link>
                  ))
                ) : <Empty title="没有找到讨论" />
              )}
            </div>
          </>
        ) : query && !results ? (
          <Empty title="没有找到任何结果" />
        ) : null}
      </div>
    </PageLayoutContent></PageLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageLayout containerWidth="medium"><PageLayoutContent><div className="p-6 text-[var(--ds-text-tertiary)]">加载中...</div></PageLayoutContent></PageLayout>}>
      <SearchPage />
    </Suspense>
  );
}
