'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import UserProfileHeader from '@/components/user/UserProfileHeader';
import { useAuth } from '@/lib/providers';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { UserSummary, RepositorySummary, DiscussionSummary } from '@/types';
import { api } from '@/lib/api/client';
import ReportModal from '@/components/common/ReportModal';
import { Button, Card, Empty } from '@/components/design';

interface UserProfileClientProps {
  initialUser: UserSummary | null;
  initialRepos: RepositorySummary[];
  initialDiscussions: DiscussionSummary[];
  initialStars: RepositorySummary[];
  username: string;
}

export default function UserProfileClient({
  initialUser,
  initialRepos,
  initialDiscussions,
  initialStars,
  username
}: UserProfileClientProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('repos');
  const [user, setUser] = useState<UserSummary | null>(initialUser);
  const [repos, setRepos] = useState<RepositorySummary[]>(initialRepos);
  const [stars, setStars] = useState<RepositorySummary[]>(initialStars);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);

  const isOwner = currentUser?.username === username;

  useEffect(() => {
    if (!currentUser || isOwner) return;
    api.get<{ isFollowing: boolean }>(`/api/v1/users/${username}/follow`)
      .then(res => { if ((res.code === 200 || res.code === 0) && res.data) setIsFollowing(res.data.isFollowing); })
      .catch(console.error);
    api.get<{ isBlocked: boolean }>(`/api/v1/users/${username}/block`)
      .then(res => { if (res.code === 200 && res.data) setIsBlocked(res.data.isBlocked); })
      .catch(console.error);
  }, [currentUser, username, isOwner]);

  const handleFollow = async () => {
    if (!currentUser) { toast.error('请先登录'); return; }
    if (isOwner) { toast('不能关注自己'); return; }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/api/v1/users/${username}/follow`);
        setIsFollowing(false);
      } else {
        await api.post(`/api/v1/users/${username}/follow`);
        setIsFollowing(true);
      }
    } catch { toast.error('操作失败'); }
    finally { setFollowLoading(false); }
  };

  const handleStarUser = async () => {
    if (!currentUser) { toast.error('请先登录'); return; }
    if (isOwner) { toast('不能收藏自己'); return; }
    setStarLoading(true);
    try {
      if (isStarred) {
        await api.delete(`/api/v1/users/${username}/star`);
        setIsStarred(false);
      } else {
        await api.post(`/api/v1/users/${username}/star`);
        setIsStarred(true);
      }
    } catch { toast.error('操作失败'); }
    finally { setStarLoading(false); }
  };

  const handleBlockToggle = async () => {
    if (!currentUser) { toast.error('请先登录'); return; }
    if (isOwner) { toast('不能拉黑自己'); return; }
    setBlockLoading(true);
    try {
      if (isBlocked) {
        await api.post(`/api/v1/users/${username}/block`, { action: 'unblock' });
        setIsBlocked(false);
      } else {
        await api.post(`/api/v1/users/${username}/block`, { action: 'block' });
        setIsBlocked(true);
        if (isFollowing) setIsFollowing(false);
      }
    } catch { toast.error('操作失败'); }
    finally { setBlockLoading(false); }
  };

  useEffect(() => {
    setUser(initialUser);
    setRepos(initialRepos);
    setStars(initialStars);
  }, [initialUser, initialRepos, initialStars]);

  if (!user) {
    return (
      <div className="max-w-[var(--ds-container-max)] mx-auto pt-20 pb-12 px-6 text-center">
        <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)]">用户不存在</h1>
        <Link href="/"><Button variant="primary">返回首页</Button></Link>
      </div>
    );
  }

  const stats = [
    { num: user.stats?.reposCount || 0, label: '仓库' },
    { num: user.stats?.starsCount || 0, label: '收藏' },
    { num: user.stats?.followingCount || 0, label: '关注' },
    { num: user.stats?.followersCount || 0, label: '粉丝' },
  ];

  return (
    <div className="flex-1 min-w-0">
      {/* Profile Header */}
      <UserProfileHeader
        user={user}
        isFollowing={isFollowing}
        isBlocked={isBlocked}
        onFollow={handleFollow}
        onBlockToggle={handleBlockToggle}
        onReport={() => setShowReportModal(true)}
        followLoading={followLoading}
        blockLoading={blockLoading}
        starLoading={starLoading}
        onStarUser={handleStarUser}
        isStarred={isStarred}
      />

      {/* Stats Bar — 对齐样本：四格统计 */}
      <div className="flex gap-1 px-5 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="flex-1 text-center py-3 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface)] cursor-pointer hover:shadow-[var(--ds-shadow-sm)] transition-shadow">
            <div className="font-display text-[20px] font-bold text-[var(--ds-text)]">{s.num.toLocaleString()}</div>
            <div className="text-xs text-[var(--ds-text-tertiary)] font-ui mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs — 对齐样本：仓库 (N) | 收藏 (N) */}
      <div className="flex gap-0 border-b border-[var(--ds-border-default)] px-5 mb-4">
        {[
          { key: 'repos', label: '仓库', count: repos.length },
          { key: 'stars', label: '收藏', count: stars.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 bg-transparent cursor-pointer transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--ds-text)] border-[var(--ds-accent)] font-semibold'
                : 'text-[var(--ds-text-secondary)] border-transparent hover:text-[var(--ds-text)]'
            }`}
          >
            {tab.label}
            <span className="inline-flex items-center px-1.5 py-px text-[11px] font-semibold rounded-[10px] bg-[var(--ds-surface-subtle)] text-[var(--ds-text-tertiary)]">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5">
        {activeTab === 'repos' && (
          repos.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
              {repos.map(repo => (
                <Link key={repo.id} href={`/${repo.ownerUsername}/${repo.name}`} className="block p-5 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] bg-[var(--ds-surface)] no-underline hover:shadow-[var(--ds-shadow-sm)] transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-ui text-sm font-bold text-[var(--ds-text)] hover:text-[var(--ds-accent)]">{repo.name}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[11px] font-semibold font-ui border border-[var(--ds-border-default)] text-[var(--ds-text-tertiary)] flex-shrink-0 ml-2">
                      {repo.visibility === 'private' ? '私有' : '公开'}
                    </span>
                  </div>
                  {repo.description && (
                    <p className="text-[13px] text-[var(--ds-text-secondary)] mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[var(--ds-text-tertiary)] font-ui">
                    <span>⭐ {repo.starCount}</span>
                    <span>🍴 {repo.forkCount}</span>
                    <span>更新于 {formatTimeAgo(repo.updatedAt.toString())}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="暂无公开仓库" />
          )
        )}

        {activeTab === 'stars' && (
          stars.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3">
              {stars.map(repo => (
                <Link key={repo.id} href={`/${repo.ownerUsername}/${repo.name}`} className="block p-5 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] bg-[var(--ds-surface)] no-underline hover:shadow-[var(--ds-shadow-sm)] transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-ui text-sm font-bold text-[var(--ds-text)] hover:text-[var(--ds-accent)]">{repo.ownerUsername}/{repo.name}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[10px] text-[11px] font-semibold font-ui border border-[var(--ds-border-default)] text-[var(--ds-text-tertiary)] flex-shrink-0 ml-2">
                      {repo.visibility === 'private' ? '私有' : '公开'}
                    </span>
                  </div>
                  {repo.description && (
                    <p className="text-[13px] text-[var(--ds-text-secondary)] mb-3 line-clamp-2">{repo.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-[var(--ds-text-tertiary)] font-ui">
                    <span>⭐ {repo.starCount}</span>
                    <span>🍴 {repo.forkCount}</span>
                    <span>更新于 {formatTimeAgo(repo.updatedAt.toString())}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="暂无收藏" />
          )
        )}
      </div>

      {/* 举报弹窗 */}
      {showReportModal && user && (
        <ReportModal targetType="user" targetId={user.uid || user.id} targetTitle={user.name || user.username} onClose={() => setShowReportModal(false)} />
      )}
    </div>
  );
}
