'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Avatar } from '@/components/ui';

const RepoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const DiscussionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  CSS: '#563d7c',
  HTML: '#e34c26',
};

interface SearchResult {
  repos: {
    id: string;
    name: string;
    description: string | null;
    language: string | null;
    starCount: number;
    owner: { username: string } | null;
  }[];
  users: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
  }[];
  discussions: {
    id: string;
    title: string;
    category: string;
    replyCount: number;
    createdAt: string;
  }[];
}

function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'repos' | 'users' | 'discussions'>('repos');

  // 从 URL 参数读取初始类型
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'users') setActiveTab('users');
    else if (type === 'discussions') setActiveTab('discussions');
    else setActiveTab('repos');
  }, [searchParams]);

  // 当 type 参数改变时，自动加载对应类型的数据
  useEffect(() => {
    const type = searchParams.get('type');
    if (!query && type) {
      // 如果没有搜索词但有 type 参数，加载全部数据
      loadAllData();
    }
  }, [searchParams]);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 加载全部数据
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 使用搜索 API 获取全部数据（空搜索词返回所有）
      const [reposRes, usersRes, discussionsRes] = await Promise.all([
        fetch(`/api/v1/search?type=repos&q=&page=1&size=50`).then(r => r.json()),
        fetch(`/api/v1/search?type=users&q=&page=1&size=50`).then(r => r.json()),
        fetch(`/api/v1/search?type=discussions&q=&page=1&size=50`).then(r => r.json()),
      ]);
      setResults({
        repos: reposRes.data?.items || [],
        users: usersRes.data?.items || [],
        discussions: discussionsRes.data?.items || [],
      });
    } catch (err) {
      console.error('Load data failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    } else if (searchParams.get('type')) {
      // 没有搜索词但有 type 参数，加载全部
      loadAllData();
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      // 搜索仓库、用户、讨论
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
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalResults = results
    ? (results.repos?.length || 0) + (results.users?.length || 0) + (results.discussions?.length || 0)
    : 0;

  return (
    <div className="page">
      <Header />

      <div className="page-container">
        {/* Results */}
        {isLoading ? (
          <div className="search-loading">
            <div className="skeleton h-8 w-full mb-4"></div>
            <div className="skeleton h-12 w-full mb-2"></div>
            <div className="skeleton h-12 w-full"></div>
          </div>
        ) : results ? (
          <>
            {/* Summary */}
            {query ? (
              <p className="search-summary">
                找到 {totalResults} 个关于 "{query}" 的结果
              </p>
            ) : (
              <p className="search-summary">
                共 {totalResults} 个结果
              </p>
            )}

            {/* Tabs */}
            <div className="search-tabs">
              <button
                className={`search-tab ${activeTab === 'repos' ? 'active' : ''}`}
                onClick={() => setActiveTab('repos')}
              >
                <RepoIcon />
                仓库
                <span className="counter">{results.repos?.length || 0}</span>
              </button>
              <button
                className={`search-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <UserIcon />
                用户
                <span className="counter">{results.users?.length || 0}</span>
              </button>
              <button
                className={`search-tab ${activeTab === 'discussions' ? 'active' : ''}`}
                onClick={() => setActiveTab('discussions')}
              >
                <DiscussionIcon />
                讨论
                <span className="counter">{results.discussions?.length || 0}</span>
              </button>
            </div>

            {/* Results List */}
            <div className="search-results">
              {activeTab === 'repos' && (
                <>
                  {results.repos?.length > 0 ? (
                    results.repos.map((repo) => (
                      <Link
                        key={repo.id}
                        href={`/${repo.owner?.username}/${repo.name}`}
                        className="result-item"
                      >
                        <div className="result-icon"><RepoIcon /></div>
                        <div className="result-content">
                          <div className="result-title">
                            {repo.owner?.username}/{repo.name}
                          </div>
                          <p className="result-desc">{repo.description || '暂无描述'}</p>
                          <div className="result-meta">
                            {repo.language && (
                              <span className="result-lang">
                                <span
                                  className="lang-dot"
                                  style={{ backgroundColor: languageColors[repo.language] || '#858585' }}
                                />
                                {repo.language}
                              </span>
                            )}
                            <span className="result-stars">★ {repo.starCount}</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="result-empty">没有找到仓库</div>
                  )}
                </>
              )}

              {activeTab === 'users' && (
                <>
                  {results.users?.length > 0 ? (
                    results.users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/${user.username}`}
                        className="result-item"
                      >
                        <div className="result-icon">
                          <Avatar src={user.avatarUrl} alt={user.username} size="md" fallback={user.username} />
                        </div>
                        <div className="result-content">
                          <div className="result-title">{user.username}</div>
                          <p className="result-desc">{user.bio || '暂无简介'}</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="result-empty">没有找到用户</div>
                  )}
                </>
              )}

              {activeTab === 'discussions' && (
                <>
                  {results.discussions?.length > 0 ? (
                    results.discussions.map((disc) => (
                      <Link
                        key={disc.id}
                        href={`/discussions/${disc.id}`}
                        className="result-item"
                      >
                        <div className="result-icon"><DiscussionIcon /></div>
                        <div className="result-content">
                          <div className="result-title">{disc.title}</div>
                          <div className="result-meta">
                            <span className="result-category">{disc.category}</span>
                            <span>·</span>
                            <span>{disc.replyCount} 回复</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="result-empty">没有找到讨论</div>
                  )}
                </>
              )}
            </div>
          </>
        ) : query && !results ? (
          <div className="search-empty">
            没有找到任何结果
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPage />
    </Suspense>
  );
}
