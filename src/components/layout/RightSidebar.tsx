'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useSidebarData } from '@/lib/contexts/SidebarDataContext';

const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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

interface RightSidebarProps {
  className?: string;
}

export default function RightSidebar({ className = '' }: RightSidebarProps) {
  const { isAuthenticated, starredRepos } = useSidebarData();

  return (
    <nav
      className={clsx(
        'sticky top-[var(--ds-header-height)] h-[calc(100vh-var(--ds-header-height))] overflow-y-auto',
        className
      )}
    >
      <div className="px-4 py-6">
        {/* 我的收藏 - 登录后显示 */}
        {isAuthenticated ? (
          <>
            <section className="mb-3">
              <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">
                <span className="flex items-center gap-1">
                  <StarIcon />
                  我的收藏
                </span>
                {starredRepos.length > 0 && (
                  <span className="text-xs text-[var(--ds-text-secondary)]">({starredRepos.length})</span>
                )}
              </h3>

              {starredRepos.length > 0 ? (
                <>
                  <ul className="flex flex-col">
                    {starredRepos.slice(0, 5).map(item => (
                      <li key={item.repoId}>
                        <Link
                          href={`/${item.repo.owner.username}/${item.repo.name}`}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
                        >
                          <StarIcon />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--ds-text-primary)] truncate">{item.repo.name}</p>
                            <p className="text-xs text-[var(--ds-text-secondary)]">{item.repo.owner.username}</p>
                            {item.repo.description && (
                              <p className="text-xs text-[var(--ds-text-secondary)] mt-0.5 line-clamp-2">{item.repo.description}</p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {starredRepos.length > 5 && (
                    <Link href="/stars" className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--ds-text-secondary)] hover:text-[var(--ds-accent-default)] transition-colors">
                      查看全部 {starredRepos.length} 个收藏
                      <ExternalLinkIcon />
                    </Link>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <StarIcon size={24} />
                  <p>暂无收藏</p>
                  <Link href="/explore" className="flex items-center gap-1 text-xs text-[var(--ds-accent-default)] hover:underline">
                    去探索有趣的项目
                    <ExternalLinkIcon />
                  </Link>
                </div>
              )}
            </section>
            <div className="border-t border-[var(--ds-border-muted)] my-4" />
          </>
        ) : (
          <>
            <section className="mb-3">
              <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">
                <span className="flex items-center gap-1">
                  <StarIcon />
                  探索精彩
                </span>
              </h3>
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-[var(--ds-text-secondary)] text-center">登录后收藏感兴趣的仓库</p>
                <Link href="/explore" className="flex items-center gap-1 text-xs text-[var(--ds-accent-default)] hover:underline">
                  浏览热门项目
                  <ExternalLinkIcon />
                </Link>
              </div>
            </section>
            <div className="border-t border-[var(--ds-border-muted)] my-4" />
            <section className="mb-3">
              <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">
                <span className="flex items-center gap-1">
                  <TrendingIcon />
                  热门仓库
                </span>
              </h3>
              <Link href="/explore" className="flex items-center gap-1 text-xs text-[var(--ds-accent-default)] hover:underline">
                查看更多热门项目
                <ExternalLinkIcon />
              </Link>
            </section>
          </>
        )}
      </div>
    </nav>
  );
}
