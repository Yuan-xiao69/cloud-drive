'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/providers';
import { formatDate } from '@/lib/utils';
import type { UserSummary } from '@/types';
import clsx from 'clsx';
import { Button } from '@/components/design';
import { getAvatarDisplayUrl } from '@/lib/storage';

interface UserProfileHeaderProps {
  user: UserSummary;
  isFollowing?: boolean;
  isBlocked?: boolean;
  onFollow?: () => void;
  onBlockToggle?: () => void;
  onReport?: () => void;
  followLoading?: boolean;
  blockLoading?: boolean;
  starLoading?: boolean;
  onStarUser?: () => void;
  isStarred?: boolean;
  className?: string;
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
  starLoading = false,
  onStarUser,
  isStarred = false,
  className
}: UserProfileHeaderProps) {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.username === user.username;

  return (
    <div className={clsx('px-5 py-5', className)}>
      {/* Profile Row: 头像 | 信息 | 操作按钮 — 对齐样本横排布局 */}
      <div className="flex items-start gap-6 mb-4">
        {/* Avatar — 80px, 3px border */}
        <div className="w-20 h-20 rounded-full bg-[var(--ds-accent-subtle)] text-[var(--ds-accent)] flex items-center justify-center font-display text-[32px] font-bold flex-shrink-0 border-[3px] border-[var(--ds-border-default)] overflow-hidden">
          {user.avatarUrl ? (
            <img src={getAvatarDisplayUrl(user.avatarUrl) ?? undefined} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <span>{user.username.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-display text-[20px] font-bold text-[var(--ds-text)]">{user.name || user.username}</div>
          <div className="font-ui text-sm text-[var(--ds-text-secondary)] mb-2">
            {user.username}
            {user.uid && <span className="text-[11px] text-[var(--ds-text-tertiary)] font-normal ml-1">UID {user.uid}</span>}
          </div>
          {user.bio && (
            <p className="text-sm text-[var(--ds-text-secondary)] mb-3 leading-relaxed">{user.bio}</p>
          )}
          <div className="flex items-center gap-4 text-[13px] text-[var(--ds-text-tertiary)] font-ui flex-wrap">
            {user.location && <span>📍 {user.location}</span>}
            {user.website && (
              <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noopener noreferrer" className="text-[var(--ds-text-tertiary)] no-underline hover:text-[var(--ds-accent)]">
                🔗 {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span>🕐 加入于 {formatDate(user.createdAt.toString())}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {isOwner ? (
            <Link href="/settings" className="inline-flex">
              <Button variant="secondary" size="sm">✎ 编辑资料</Button>
            </Link>
          ) : currentUser ? (
            <>
              <Button onClick={onFollow} loading={followLoading} variant={isFollowing ? 'secondary' : 'primary'} size="sm">
                {isFollowing ? '已关注' : '关注'}
              </Button>
              <Button onClick={onStarUser} loading={starLoading} variant="secondary" size="sm">
                {isStarred ? '已收藏' : '收藏'}
              </Button>
              <Button onClick={onBlockToggle} loading={blockLoading} variant="secondary" size="sm" style={{ color: 'var(--ds-danger)' }}>
                {isBlocked ? '已拉黑' : '拉黑'}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
