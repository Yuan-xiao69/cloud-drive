'use client';

import React from 'react';
import Link from 'next/link';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';

// 图标组件
const RepoIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
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

const GitBranchIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 01-9 9" />
  </svg>
);

const ArrowRightIcon = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const EyeIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const CommentIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

// 时间格式化
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}年前`;
  if (months > 0) return `${months}个月前`;
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

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

interface Repo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  owner: { username: string; avatarUrl?: string } | null;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  commentCount: number;
  category: string;
  author: { username: string; avatarUrl?: string } | null;
  createdAt: string;
}

interface Stats {
  repos: number;
  users: number;
  discussions: number;
}

interface HomePageContentProps {
  hotRepos: Repo[];
  hotDiscussions: Discussion[];
  stats: Stats;
}

export default function HomePageContent({
  hotRepos,
  hotDiscussions,
  stats,
}: HomePageContentProps) {
  return (
    <div className="home-layout">
      {/* 左侧边栏 */}
      <LeftSidebar />

      {/* 主内容区域容器 */}
      <div className="home-container">
        {/* 中间主内容 */}
        <main className="home-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title" style={{ fontSize: '28px' }}>
              <GitBranchIcon size={28} />
              <span>天下万般绝学，莫过于恒心</span>
            </h1>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section">
          <div className="stats-container">
            <Link href="/explore" className="stat-card stat-card-link">
              <RepoIcon size={20} />
              <div className="stat-info">
                <span className="stat-number">{stats.repos}</span>
                <span className="stat-label">仓库</span>
              </div>
              <ArrowRightIcon size={14} className="stat-arrow" />
            </Link>
            <Link href="/explore?tab=users" className="stat-card stat-card-link">
              <UserIcon size={20} />
              <div className="stat-info">
                <span className="stat-number">{stats.users}</span>
                <span className="stat-label">开发者</span>
              </div>
              <ArrowRightIcon size={14} className="stat-arrow" />
            </Link>
            <Link href="/discussions" className="stat-card stat-card-link">
              <DiscussionIcon size={20} />
              <div className="stat-info">
                <span className="stat-number">{stats.discussions}</span>
                <span className="stat-label">讨论</span>
              </div>
              <ArrowRightIcon size={14} className="stat-arrow" />
            </Link>
          </div>
        </section>

        {/* Hot Discussions Section */}
        <section id="hot-discussions" className="hot-discussions-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <DiscussionIcon size={20} />
                热门讨论
              </h2>
              <Link href="/discussions" className="section-more">
                查看更多
                <ArrowRightIcon size={14} />
              </Link>
            </div>
            <div className="discussion-list">
              {hotDiscussions.length > 0 ? (
                hotDiscussions.map((discussion) => (
                  <Link
                    key={discussion.id}
                    href={`/discussions/${discussion.id}`}
                    className="discussion-card"
                  >
                    <div className="discussion-card-header">
                      <span className="discussion-category">{discussion.category}</span>
                      <span className="discussion-views">
                        <EyeIcon size={14} />
                        {discussion.viewCount}
                      </span>
                    </div>
                    <h3 className="discussion-title">{discussion.title}</h3>
                    <div className="discussion-meta">
                      <span className="discussion-author">{discussion.author?.username}</span>
                      <span className="discussion-comments">
                        <CommentIcon size={14} />
                        {discussion.commentCount}
                      </span>
                      <span className="discussion-date">{formatTimeAgo(discussion.createdAt)}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <DiscussionIcon size={48} />
                  <p>暂无讨论</p>
                  <Link href="/discussions" className="empty-action">
                    浏览讨论
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Hot Repos Section */}
        <section id="hot-repos" className="hot-repos-section">
          <div className="section-container">
            <div className="section-header">
              <h2 className="section-title">
                <StarIcon size={20} />
                热门仓库
              </h2>
              <Link href="/explore" className="section-more">
                查看更多
                <ArrowRightIcon size={14} />
              </Link>
            </div>

            <div className="repo-grid">
              {hotRepos.length > 0 ? (
                hotRepos.map((repo) => (
                  <Link
                    key={repo.id}
                    href={`/${repo.owner?.username}/${repo.name}`}
                    className="repo-card"
                  >
                    <div className="repo-card-header">
                      <RepoIcon size={16} />
                      <span className="repo-card-owner">{repo.owner?.username}</span>
                      <span className="repo-card-sep">/</span>
                      <span className="repo-card-name">{repo.name}</span>
                    </div>
                    <p className="repo-card-desc">
                      {repo.description || '暂无描述'}
                    </p>
                    <div className="repo-card-footer">
                      {repo.language && (
                        <span className="repo-card-lang">
                          <span
                            className="lang-dot"
                            style={{ backgroundColor: languageColors[repo.language] || '#858585' }}
                          />
                          {repo.language}
                        </span>
                      )}
                      <span className="repo-card-stars">
                        <StarIcon size={12} />
                        {repo.starCount}
                      </span>
                      <span className="repo-card-forks">
                        <ForkIcon size={12} />
                        {repo.forkCount}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="empty-state">
                  <RepoIcon size={48} />
                  <p>暂无仓库</p>
                  <Link href="/explore" className="empty-action">
                    探索项目
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 底部 Footer */}
        <footer className="home-footer">
          <div className="home-footer-links">
            <a href="/about">关于</a>
            <span className="home-footer-sep">|</span>
            <a href="/help">帮助</a>
            <span className="home-footer-sep">|</span>
            <a href="/privacy">隐私</a>
            <span className="home-footer-sep">|</span>
            <a href="/terms">条款</a>
          </div>
          <p className="home-footer-copyright">© 2026 CodeBuddy Platform</p>
        </footer>
      </main>
      </div>

      {/* 右侧边栏 */}
      <RightSidebar />
    </div>
  );
}
