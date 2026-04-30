'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '@/lib/providers';

// 图标定义
const RepoIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
  </svg>
);

const GitPullRequestIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
    <line x1="6" y1="9" x2="6" y2="21" />
  </svg>
);

const LockIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const HomeIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const CompassIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
  </svg>
);

const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChatIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

interface SidebarRepo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  visibility: 'public' | 'private';
  isFork?: boolean;
  starCount: number;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

interface SidebarPR {
  id: string;
  title: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string;
  repository: {
    id: string;
    name: string;
    owner: {
      username: string;
    };
  };
  author: {
    username: string;
    avatarUrl?: string | null;
  };
}

interface LeftSidebarProps {
  className?: string;
}

export default function LeftSidebar({ className = '' }: LeftSidebarProps) {
  const { isAuthenticated } = useAuth();
  const [myRepos, setMyRepos] = useState<SidebarRepo[]>([]);
  const [incomingPRs, setIncomingPRs] = useState<SidebarPR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [reposRes, prsRes] = await Promise.all([
          fetch('/api/v1/me/repos?limit=8'),
          fetch('/api/v1/me/pull-requests?status=open&limit=5'),
        ]);
        const [reposData, prsData] = await Promise.all([
          reposRes.json(),
          prsRes.json(),
        ]);

        if (reposData.code === 200) {
          setMyRepos(reposData.data?.items || []);
        }
        if (prsData.code === 200) {
          setIncomingPRs(prsData.data?.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch sidebar data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated]);

  // 根据设计文档，左侧边栏始终显示（未登录时显示不同内容）
  return (
    <aside
      className={clsx(
        'flex-shrink-0 overflow-y-auto',
        className
      )}
    >
      <div className="home-sidebar-inner">
        {/* 快捷导航 - 始终显示 */}
        <section className="home-sidebar-section">
          <h3 className="home-sidebar-title">快捷导航</h3>
          <nav className="home-sidebar-nav">
            <Link
              href="/"
              className="home-sidebar-link"
            >
              <HomeIcon />
              <span>首页</span>
            </Link>
            <Link
              href="/explore"
              className="home-sidebar-link"
            >
              <CompassIcon />
              <span>探索</span>
            </Link>
            <Link
              href="/discussions"
              className="home-sidebar-link"
            >
              <ChatIcon />
              <span>讨论</span>
            </Link>
          </nav>
        </section>

        {/* 分隔线 */}
        <div className="home-sidebar-divider" />

        {/* 快捷操作 */}
        <section className="home-sidebar-section">
          <h3 className="home-sidebar-title">快捷操作</h3>
          <nav className="home-sidebar-nav">
            {isAuthenticated ? (
              <>
                <Link
                  href="/new"
                  className="home-sidebar-link"
                >
                  <PlusIcon />
                  <span>新建仓库</span>
                </Link>
                <Link
                  href="/discussions/new"
                  className="home-sidebar-link"
                >
                  <ChatIcon />
                  <span>创建讨论</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="home-sidebar-link"
                >
                  <span>登录后使用更多功能</span>
                </Link>
              </>
            )}
          </nav>
        </section>

        {/* 我的仓库 - 登录后显示 */}
        {isAuthenticated && (
          <>
            {/* 分隔线 */}
            <div className="home-sidebar-divider" />

            {/* 我的仓库 */}
            <section className="home-sidebar-section">
              <h3 className="home-sidebar-title">我的仓库</h3>
              {loading ? (
                <div className="home-sidebar-skeleton">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="home-sidebar-skeleton-item" />
                  ))}
                </div>
              ) : myRepos.length > 0 ? (
                <ul className="home-sidebar-list">
                  {myRepos.slice(0, 8).map(repo => (
                    <li key={repo.id}>
                      <Link
                        href={`/${repo.owner.username}/${repo.name}`}
                        className="home-sidebar-link"
                      >
                        <RepoIcon />
                        <span className="home-sidebar-link-text">
                          {repo.name}
                        </span>
                        {repo.visibility === 'private' && (
                          <LockIcon />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home-sidebar-empty">暂无仓库</p>
              )}
              {myRepos.length > 8 && (
                <Link
                  href={`/${'user'}/?tab=repos`}
                  className="home-sidebar-link-more"
                >
                  显示全部 {myRepos.length} 个 →
                </Link>
              )}
            </section>
          </>
        )}

        {/* 待处理 PR - 登录后显示 */}
        {isAuthenticated && (
          <>
            {/* 分隔线 */}
            <div className="home-sidebar-divider" />

            {/* 待处理 PR */}
            <section className="home-sidebar-section">
              <h3 className="home-sidebar-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <GitPullRequestIcon />
                  待处理
                </span>
                {incomingPRs.length > 0 && (
                  <span className="home-sidebar-badge">
                    {incomingPRs.length}
                  </span>
                )}
              </h3>
              {loading ? (
                <div className="home-sidebar-skeleton">
                  {[1, 2].map(i => (
                    <div key={i} className="home-sidebar-skeleton-item" style={{ height: 32 }} />
                  ))}
                </div>
              ) : incomingPRs.length > 0 ? (
                <ul className="home-sidebar-list">
                  {incomingPRs.slice(0, 5).map(pr => (
                    <li key={pr.id}>
                      <Link
                        href={`/${pr.repository.owner.username}/${pr.repository.name}/pulls/${pr.id}`}
                        className="home-sidebar-link"
                      >
                        <GitPullRequestIcon />
                        <div className="home-sidebar-pr-info">
                          <p className="home-sidebar-pr-title">{pr.title}</p>
                          <p className="home-sidebar-pr-repo">{pr.repository.name}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home-sidebar-empty">暂无待处理 PR</p>
              )}
            </section>
          </>
        )}

      </div>
    </aside>
  );
}
