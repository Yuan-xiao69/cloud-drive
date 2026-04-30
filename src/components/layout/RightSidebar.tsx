'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '@/lib/providers';

// 贡献日历组件
function ContributionCalendar() {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    // 生成最近 12 周的模拟贡献数据
    const generateData = () => {
      const contributions: { date: string; count: number }[] = [];
      const today = new Date();

      for (let i = 83; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        // 随机生成 0-8 的贡献数
        const count = Math.random() > 0.6 ? Math.floor(Math.random() * 8) : 0;
        contributions.push({ date: dateStr, count });
      }
      return contributions;
    };

    setData(generateData());
  }, []);

  const getColor = (count: number) => {
    if (count === 0) return 'var(--color-calendar-empty)';
    if (count <= 2) return 'var(--color-calendar-level-1)';
    if (count <= 5) return 'var(--color-calendar-level-2)';
    if (count <= 8) return 'var(--color-calendar-level-3)';
    return 'var(--color-calendar-level-4)';
  };

  const weeks = [];
  for (let i = 0; i < 12; i++) {
    weeks.push(data.slice(i * 7, (i + 1) * 7));
  }

  const totalContributions = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="contribution-calendar">
      <div className="contribution-calendar-header">
        <span className="contribution-calendar-total">
          {totalContributions} 次贡献
        </span>
      </div>
      <div className="contribution-calendar-grid">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="contribution-calendar-week">
            {week.map((day) => (
              <div
                key={day.date}
                className="contribution-calendar-day"
                style={{ backgroundColor: getColor(day.count) }}
                title={`${day.date}: ${day.count} 次贡献`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="contribution-calendar-legend">
        <span className="contribution-calendar-legend-text">少</span>
        <div className="contribution-calendar-legend-item" style={{ backgroundColor: 'var(--color-calendar-empty)' }} />
        <div className="contribution-calendar-legend-item" style={{ backgroundColor: 'var(--color-calendar-level-1)' }} />
        <div className="contribution-calendar-legend-item" style={{ backgroundColor: 'var(--color-calendar-level-2)' }} />
        <div className="contribution-calendar-legend-item" style={{ backgroundColor: 'var(--color-calendar-level-3)' }} />
        <div className="contribution-calendar-legend-item" style={{ backgroundColor: 'var(--color-calendar-level-4)' }} />
        <span className="contribution-calendar-legend-text">多</span>
      </div>
    </div>
  );
}

const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ContributionIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M3 15h18" />
    <path d="M9 3v18" />
    <path d="M15 3v18" />
  </svg>
);

const TrendingIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
    <polyline points="17,6 23,6 23,12" />
  </svg>
);

const ExternalLinkIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

interface StarredRepo {
  repoId: string;
  starredAt: string;
  repo: {
    id: string;
    name: string;
    description: string | null;
    language: string | null;
    starCount: number;
    forkCount: number;
    visibility: 'public' | 'private';
    createdAt: string;
    owner: {
      id: string;
      username: string;
      avatarUrl?: string | null;
    };
  };
}

interface RightSidebarProps {
  className?: string;
}

export default function RightSidebar({ className = '' }: RightSidebarProps) {
  const { isAuthenticated } = useAuth();
  const [starredRepos, setStarredRepos] = useState<StarredRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const res = await fetch('/api/v1/me/stars?limit=10');
        const data = await res.json();
        if (data.code === 200) {
          setStarredRepos(data.data?.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch starred repos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated]);

  // 根据设计文档，右侧边栏始终显示（未登录时显示不同内容）
  return (
    <aside
      className={clsx(
        'right-sidebar',
        'flex-shrink-0 overflow-y-auto',
        className
      )}
    >
      <div className="home-sidebar-inner">
        {/* 我的收藏 - 登录后显示 */}
        {isAuthenticated ? (
          <>
            <section className="home-sidebar-section">
              <h3 className="home-sidebar-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StarIcon />
                  我的收藏
                </span>
                {starredRepos.length > 0 && (
                  <span className="home-sidebar-count">({starredRepos.length})</span>
                )}
              </h3>

              {loading ? (
                <div className="home-sidebar-skeleton">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="home-sidebar-skeleton-item" />
                  ))}
                </div>
              ) : starredRepos.length > 0 ? (
                <>
                  <ul className="home-sidebar-list">
                    {starredRepos.slice(0, 5).map(item => (
                      <li key={item.repoId}>
                        <Link
                          href={`/${item.repo.owner.username}/${item.repo.name}`}
                          className="home-sidebar-link"
                        >
                          <StarIcon />
                          <div className="home-sidebar-starred-info">
                            <p className="home-sidebar-starred-name">{item.repo.name}</p>
                            <p className="home-sidebar-starred-owner">{item.repo.owner.username}</p>
                            {item.repo.description && (
                              <p className="home-sidebar-starred-desc">{item.repo.description}</p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {starredRepos.length > 5 && (
                    <Link href="/stars" className="home-sidebar-link-more">
                      查看全部 {starredRepos.length} 个收藏
                      <ExternalLinkIcon />
                    </Link>
                  )}
                </>
              ) : (
                <div className="home-sidebar-empty-state">
                  <StarIcon size={24} />
                  <p>暂无收藏</p>
                  <Link href="/explore" className="home-sidebar-empty-link">
                    去探索有趣的项目
                    <ExternalLinkIcon />
                  </Link>
                </div>
              )}
            </section>

            {/* 分隔线 */}
            <div className="home-sidebar-divider" />

            {/* 贡献日历 - 登录后显示 */}
            <section className="home-sidebar-section">
              <h3 className="home-sidebar-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ContributionIcon />
                  贡献日历
                </span>
              </h3>
              <ContributionCalendar />
            </section>

            {/* 分隔线 */}
            <div className="home-sidebar-divider" />
          </>
        ) : (
          <>
            {/* 未登录时显示欢迎信息和快捷入口 */}
            <section className="home-sidebar-section">
              <h3 className="home-sidebar-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StarIcon />
                  探索精彩
                </span>
              </h3>
              <div className="home-sidebar-empty-state">
                <p className="home-sidebar-welcome-text">登录后收藏感兴趣的仓库</p>
                <Link href="/explore" className="home-sidebar-empty-link">
                  浏览热门项目
                  <ExternalLinkIcon />
                </Link>
              </div>
            </section>

            {/* 分隔线 */}
            <div className="home-sidebar-divider" />

            <section className="home-sidebar-section">
              <h3 className="home-sidebar-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingIcon />
                  热门仓库
                </span>
              </h3>
              <Link href="/explore" className="home-sidebar-empty-link">
                查看更多热门项目
                <ExternalLinkIcon />
              </Link>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
