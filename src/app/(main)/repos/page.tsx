'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Avatar } from '@/components/ui';

const RepoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
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

interface Repo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  visibility: number;
  owner: { username: string } | null;
}

export default function AllReposPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRepos();
  }, []);

  const loadRepos = async () => {
    setIsLoading(true);
    try {
      // 使用搜索 API 获取所有仓库
      const res = await fetch(`/api/v1/search?type=repos&q=&page=1&size=100`);
      const data = await res.json();
      if (data.code === 200) {
        setRepos(data.data?.items || []);
      }
    } catch (err) {
      console.error('Load repos failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <Header />

      <div className="page-container">
        <div className="repos-page">
          <div className="repos-header">
            <h1 className="repos-title">仓库列表</h1>
            <span className="repos-count">{repos.length} 个仓库</span>
          </div>

          {isLoading ? (
            <div className="repos-loading">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="repo-card-skeleton">
                  <div className="skeleton h-5 w-48 mb-2"></div>
                  <div className="skeleton h-4 w-full mb-2"></div>
                  <div className="skeleton h-3 w-24"></div>
                </div>
              ))}
            </div>
          ) : repos.length > 0 ? (
            <div className="repos-grid">
              {repos.map((repo) => (
                <Link 
                  key={repo.id} 
                  href={`/${repo.owner?.username}/${repo.name}`}
                  className="repo-card"
                >
                  <div className="repo-card-header">
                    <div className="repo-name-group">
                      <RepoIcon />
                      <span className="repo-name">{repo.owner?.username}/{repo.name}</span>
                    </div>
                    <span className="repo-card-visibility">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm0 1C5.79 1 4 2.79 4 5s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.21 0-4 1.79-4 4v1h8v-1c0-2.21-1.79-4-4-4z"/>
                      </svg>
                      {repo.visibility === 1 ? '公开' : '私有'}
                    </span>
                  </div>
                  {repo.description && (
                    <p className="repo-description">{repo.description}</p>
                  )}
                  <div className="repo-meta">
                    {repo.language && (
                      <span className="repo-language">
                        <span 
                          className="lang-dot" 
                          style={{ backgroundColor: languageColors[repo.language] || '#6e7681' }}
                        />
                        {repo.language}
                      </span>
                    )}
                    <span className="repo-stars">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {repo.starCount || 0}
                    </span>
                    <span className="repo-forks">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="18" r="3" />
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="6" r="3" />
                        <path d="M18 9a9 9 0 01-9 9M6 9a9 9 0 009 9" />
                      </svg>
                      {repo.forkCount || 0}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="repos-empty">
              <RepoIcon />
              <p>暂无仓库</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .repos-page {
          padding: 24px 0;
        }

        .repos-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .repos-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--color-fg-default);
        }

        .repos-count {
          font-size: 14px;
          color: var(--color-fg-muted);
        }

        .repos-loading {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .repo-card-skeleton {
          padding: 24px;
          height: 160px;
          background: var(--color-bg-default);
          border: 1px solid var(--color-border-default);
          border-radius: 12px;
        }

        .repos-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .repos-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 60px 0;
          color: var(--color-fg-muted);
        }

        .repos-empty svg {
          width: 48px;
          height: 48px;
          opacity: 0.5;
        }

        .repos-empty p {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
