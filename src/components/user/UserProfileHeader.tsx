/**
 * UserProfileHeader Component
 * 用户页面头部组件 - 包含头像、用户名、操作按钮等
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/providers';
import type { UserSummary } from '@/types';
import clsx from 'clsx';

interface UserProfileHeaderProps {
  user: UserSummary;
  isFollowing?: boolean;
  isBlocked?: boolean;
  onFollow?: () => void;
  onBlockToggle?: () => void;
  onReport?: () => void;
  followLoading?: boolean;
  blockLoading?: boolean;
  className?: string;
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export default function UserProfileHeader({
  user,
  isFollowing = false,
  isBlocked = false,
  onFollow,
  onBlockToggle,
  onReport,
  followLoading = false,
  blockLoading = false,
  className
}: UserProfileHeaderProps) {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.username === user.username;

  return (
    <div
      className={clsx(
        'bg-[var(--color-bg-default)] border-b border-[var(--color-border-default)]',
        className
      )}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-full border border-[var(--color-border-default)] bg-[var(--color-accent-subtle)] flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-[var(--color-fg-muted)] font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            {/* Name and Username */}
            <div className="mb-1">
              <h1 className="text-2xl font-semibold text-[var(--color-fg-default)] m-0">
                {user.name || user.username}
              </h1>
              <p className="text-base text-[var(--color-fg-muted)] m-0">
                @{user.username}
              </p>
            </div>

            {/* UID */}
            {user.uid && (
              <p className="text-sm text-[var(--color-fg-muted)] mt-1 mb-4 font-mono">
                UID: {user.uid}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap items-center">
              {isOwner ? (
                <Link
                  href="/settings"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-[var(--color-border-default)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover-bg)] text-[var(--color-btn-fg)] transition-colors no-underline"
                >
                  编辑个人资料
                </Link>
              ) : currentUser ? (
                <>
                  {/* Follow Button */}
                  <button
                    onClick={onFollow}
                    disabled={followLoading}
                    className={clsx(
                      'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                      isFollowing
                        ? 'border border-[var(--color-border-default)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover-bg)] text-[var(--color-btn-fg)]'
                        : 'border border-[var(--color-btn-primary-border)] bg-[var(--color-btn-primary-bg)] hover:bg-[var(--color-btn-primary-hover-bg)] text-[var(--color-btn-primary-fg)]'
                    )}
                  >
                    {followLoading ? '处理中...' : isFollowing ? '取消关注' : '关注'}
                  </button>

                  {/* Block Button */}
                  <button
                    onClick={onBlockToggle}
                    disabled={blockLoading}
                    className={clsx(
                      'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border transition-colors',
                      isBlocked
                        ? 'border-[var(--color-danger-fg)] bg-[var(--color-danger-subtle)] text-[var(--color-danger-fg)] hover:bg-[var(--color-danger-fg)] hover:text-white'
                        : 'border border-[var(--color-border-default)] bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover-bg)] text-[var(--color-btn-fg)]'
                    )}
                  >
                    {blockLoading ? '处理中...' : isBlocked ? '取消拉黑' : '拉黑'}
                  </button>

                  {/* Report Button */}
                  <button
                    onClick={onReport}
                    className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-inset)] transition-colors"
                    title="举报用户"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bio and Stats */}
        {(user.bio || user.stats) && (
          <div className="mt-6 pt-6 border-t border-[var(--color-border-muted)]">
            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-[var(--color-fg-default)] mb-4 leading-relaxed">
                {user.bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-[var(--color-fg-muted)]">
              {/* Join Date */}
              <div className="flex items-center gap-1.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>于 {formatDate(user.createdAt.toString())} 加入</span>
              </div>

              {/* Followers */}
              <div className="flex items-center gap-1.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                <strong className="text-[var(--color-fg-default)] font-semibold">
                  {user.stats?.followersCount || 0}
                </strong>
                <span>粉丝</span>
              </div>

              {/* Following */}
              <div className="flex items-center gap-1.5">
                <strong className="text-[var(--color-fg-default)] font-semibold">
                  {user.stats?.followingCount || 0}
                </strong>
                <span>关注</span>
              </div>

              {/* Repos */}
              <div className="flex items-center gap-1.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="flex-shrink-0"
                >
                  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
                </svg>
                <strong className="text-[var(--color-fg-default)] font-semibold">
                  {user.stats?.reposCount || 0}
                </strong>
                <span>仓库</span>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="flex-shrink-0"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <strong className="text-[var(--color-fg-default)] font-semibold">
                  {user.stats?.starsCount || 0}
                </strong>
                <span>收藏</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
