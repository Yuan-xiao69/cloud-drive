'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { Avatar } from '@/components/ui';

// 图标定义
const RepoIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
  </svg>
);

const UserIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const DiscussionIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ForkIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v1a2 2 0 01-2 2H8a2 2 0 01-2-2V9" />
    <path d="M12 12v3" />
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
  Vue: '#41b883',
  React: '#61dafb',
  Swift: '#fa7343',
  Kotlin: '#a97bff',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  C: '#555555',
  Shell: '#89e051',
};

interface SearchResult {
  repos: {
    id: string;
    name: string;
    description: string | null;
    language: string | null;
    starCount: number;
    forkCount: number;
    owner: { username: string; avatarUrl?: string } | null;
  }[];
  users: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    followersCount?: number;
    reposCount?: number;
  }[];
  discussions: {
    id: string;
    title: string;
    category: string;
    replyCount: number;
    createdAt: string;
  }[];
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'repos' | 'users' | 'discussions'>(
    (tabParam === 'users' || tabParam === 'discussions') ? tabParam : 'repos'
  );
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
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

  const handleTabChange = (tab: 'repos' | 'users' | 'discussions') => {
    setActiveTab(tab);
  };

  return (
    <div className="home-page">
      <Header />
      <div className="home-layout">
        {/* 左侧边栏 */}
        <LeftSidebar />

        {/* 主内容区 */}
        <div className="home-container">
          <main className="home-main">
          {/* 页面标题 */}
          <div className="explore-header">
            <h1 className="explore-title">
              {activeTab === 'repos' && '热门仓库'}
              {activeTab === 'users' && '推荐用户'}
              {activeTab === 'discussions' && '热门讨论'}
            </h1>
          </div>

          {/* Tab 导航 */}
          <div className="explore-tabs">
            <button
              className={`explore-tab ${activeTab === 'repos' ? 'active' : ''}`}
              onClick={() => handleTabChange('repos')}
            >
              <RepoIcon size={14} />
              <span>仓库</span>
            </button>
            <button
              className={`explore-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => handleTabChange('users')}
            >
              <UserIcon size={14} />
              <span>用户</span>
            </button>
            <button
              className={`explore-tab ${activeTab === 'discussions' ? 'active' : ''}`}
              onClick={() => handleTabChange('discussions')}
            >
              <DiscussionIcon size={14} />
              <span>讨论</span>
            </button>
          </div>

          {/* 内容区域 */}
          <div className="explore-content">
            {isLoading ? (
              <div className="explore-loading">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="explore-skeleton-card">
                    <div className="skeleton skeleton-avatar"></div>
                    <div className="skeleton-content">
                      <div className="skeleton skeleton-title"></div>
                      <div className="skeleton skeleton-desc"></div>
                      <div className="skeleton skeleton-meta"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* 仓库列表 */}
                {activeTab === 'repos' && (
                  <div className="repo-list">
                    {(results?.repos?.length ?? 0) > 0 ? (
                      results!.repos.map((repo) => (
                        <Link
                          key={repo.id}
                          href={`/${repo.owner?.username}/${repo.name}`}
                          className="repo-item"
                        >
                          <div className="repo-item-star-badge">
                            <StarIcon size={12} />
                            <span>{repo.starCount}</span>
                          </div>
                          <div className="repo-item-main">
                            <div className="repo-item-header">
                              <RepoIcon size={14} />
                              <span className="repo-item-name">
                                {repo.owner?.username}
                              </span>
                              <span className="repo-item-sep">/</span>
                              <span className="repo-item-repo">{repo.name}</span>
                            </div>
                            <p className="repo-item-desc">
                              {repo.description || '暂无描述'}
                            </p>
                            <div className="repo-item-meta">
                              {repo.language && (
                                <span className="repo-item-lang">
                                  <span
                                    className="lang-dot"
                                    style={{ backgroundColor: languageColors[repo.language] || '#858585' }}
                                  />
                                  {repo.language}
                                </span>
                              )}
                              {repo.forkCount > 0 && (
                                <span className="repo-item-forks">
                                  <ForkIcon size={12} />
                                  {repo.forkCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="explore-empty">
                        <RepoIcon size={32} />
                        <p>暂无仓库</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 用户列表 */}
                {activeTab === 'users' && (
                  <div className="user-grid">
                    {(results?.users?.length ?? 0) > 0 ? (
                      results!.users.map((user) => (
                        <Link
                          key={user.id}
                          href={`/${user.username}`}
                          className="user-card"
                        >
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                            alt={user.username}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div className="user-card-name">{user.username}</div>
                          <p className="user-card-bio">
                            {user.bio || '暂无简介'}
                          </p>
                          <div className="user-card-stats">
                            <span>{user.reposCount || 0} 仓库</span>
                            <span>{user.followersCount || 0} 粉丝</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="explore-empty">
                        <UserIcon size={32} />
                        <p>暂无用户</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 讨论列表 */}
                {activeTab === 'discussions' && (
                  <div className="discussion-list">
                    {(results?.discussions?.length ?? 0) > 0 ? (
                      results!.discussions.map((disc) => (
                        <Link
                          key={disc.id}
                          href={`/discussions/${disc.id}`}
                          className="discussion-item"
                        >
                          <div className="discussion-item-icon">
                            <DiscussionIcon size={18} />
                          </div>
                          <div className="discussion-item-content">
                            <div className="discussion-item-header">
                              <span className="discussion-item-title">{disc.title}</span>
                            </div>
                            <div className="discussion-item-meta">
                              <span className="discussion-item-category">{disc.category}</span>
                              <span className="discussion-item-replies">
                                {disc.replyCount} 回复
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="explore-empty">
                        <DiscussionIcon size={32} />
                        <p>暂无讨论</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          </main>
        </div>

        {/* 右侧边栏 */}
        <RightSidebar />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
