'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useSidebarData } from '@/lib/contexts/SidebarDataContext';
import type { SidebarRepo, SidebarPR } from '@/lib/contexts/SidebarDataContext';

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

interface LeftSidebarProps {
  className?: string;
}

export default function LeftSidebar({ className = '' }: LeftSidebarProps) {
  const { isAuthenticated, myRepos, incomingPRs } = useSidebarData();

  return (
    <nav
      className={clsx(
        'sticky top-[var(--ds-header-height)] h-[calc(100vh-var(--ds-header-height))] overflow-y-auto',
        className
      )}
    >
      <div className="px-4 py-6">
        {/* 快捷导航 - 始终显示 */}
        <section className="mb-3">
          <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">快捷导航</h3>
          <nav className="flex flex-col">
            <Link
              href="/"
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
            >
              <HomeIcon />
              <span>首页</span>
            </Link>
            <Link
              href="/explore"
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
            >
              <CompassIcon />
              <span>探索</span>
            </Link>
            <Link
              href="/discussions"
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
            >
              <ChatIcon />
              <span>讨论</span>
            </Link>
          </nav>
        </section>

        {/* 分隔线 */}
        <div className="border-t border-[var(--ds-border-muted)] my-4" />

        {/* 快捷操作 */}
        <section className="mb-3">
          <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">快捷操作</h3>
          <nav className="flex flex-col">
            {isAuthenticated ? (
              <>
                <Link
                  href="/new"
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
                >
                  <PlusIcon />
                  <span>新建仓库</span>
                </Link>
                <Link
                  href="/discussions/new"
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
                >
                  <ChatIcon />
                  <span>创建讨论</span>
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
              >
                <span>登录后使用更多功能</span>
              </Link>
            )}
          </nav>
        </section>

        {/* 我的仓库 - 登录后显示 */}
        {isAuthenticated && (
          <>
            <div className="border-t border-[var(--ds-border-muted)] my-4" />
            <section className="mb-3">
              <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">我的仓库</h3>
              {myRepos.length > 0 ? (
                <ul className="flex flex-col">
                  {myRepos.slice(0, 8).map(repo => (
                    <li key={repo.id}>
                      <Link
                        href={`/${repo.owner.username}/${repo.name}`}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
                      >
                        <RepoIcon />
                        <span className="flex-1">{repo.name}</span>
                        {repo.visibility === 'private' && <LockIcon />}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--ds-text-secondary)] px-2 py-1">暂无仓库</p>
              )}
            </section>
          </>
        )}

        {/* 待处理 PR - 登录后显示 */}
        {isAuthenticated && (
          <>
            <div className="border-t border-[var(--ds-border-muted)] my-4" />
            <section className="mb-3">
              <h3 className="text-[11px] font-bold text-[var(--ds-text-tertiary)] uppercase tracking-[0.06em] px-2 mb-2">
                <span className="flex items-center gap-1">
                  <GitPullRequestIcon />
                  待处理
                </span>
                {incomingPRs.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold text-[var(--ds-text-primary)] bg-[var(--ds-surface-subtle)] rounded-full">
                    {incomingPRs.length}
                  </span>
                )}
              </h3>
              {incomingPRs.length > 0 ? (
                <ul className="flex flex-col">
                  {incomingPRs.slice(0, 5).map(pr => (
                    <li key={pr.id}>
                      <Link
                        href={`/${pr.repository.owner.username}/${pr.repository.name}/pulls/${pr.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--ds-radius-sm)] transition-colors text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-subtle)] no-underline"
                      >
                        <GitPullRequestIcon />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--ds-text-primary)] truncate">{pr.title}</p>
                          <p className="text-xs text-[var(--ds-text-secondary)] truncate">{pr.repository.name}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--ds-text-secondary)] px-2 py-1">暂无待处理 PR</p>
              )}
            </section>
          </>
        )}
      </div>
    </nav>
  );
}
