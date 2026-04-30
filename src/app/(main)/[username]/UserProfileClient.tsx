'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import UserProfileHeader from '@/components/user/UserProfileHeader';
import UserProfileTabs from '@/components/user/UserProfileTabs';
import { useAuth } from '@/lib/providers';
import type { UserSummary, RepositorySummary, DiscussionSummary } from '@/types';
import { api } from '@/lib/api/client';
import ReportModal from '@/components/common/ReportModal';

const TABS = [
  { key: 'overview', label: '概览' },
  { key: 'repos', label: '仓库', count: 0 },
  { key: 'discussions', label: '讨论' },
  { key: 'stars', label: '收藏' }
];

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

interface UserProfileClientProps {
  initialUser: UserSummary | null;
  initialRepos: RepositorySummary[];
  initialDiscussions: DiscussionSummary[];
  initialStars: RepositorySummary[];
  username: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export default function UserProfileClient({
  initialUser,
  initialRepos,
  initialDiscussions,
  initialStars,
  username
}: UserProfileClientProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState<UserSummary | null>(initialUser);
  const [repos, setRepos] = useState<RepositorySummary[]>(initialRepos);
  const [discussions, setDiscussions] = useState<DiscussionSummary[]>(initialDiscussions);
  const [stars, setStars] = useState<RepositorySummary[]>(initialStars);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // 检查关注状态
  const checkFollowStatus = async () => {
    if (!currentUser || currentUser.username === username) return;

    try {
      const res = await api.get<{ isFollowing: boolean }>(
        `/api/v1/users/${username}/follow`
      );
      if (res.code === 0 && res.data) {
        setIsFollowing(res.data.isFollowing);
      }
    } catch (error) {
      console.error('检查关注状态失败:', error);
    }
  };

  // 关注/取消关注
  const handleFollow = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    if (currentUser.username === username) {
      alert('不能关注自己');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const res = await api.delete<{ isFollowing: boolean }>(
          `/api/v1/users/${username}/follow`
        );
        if (res.code === 0) {
          setIsFollowing(false);
          // 更新关注数
          if (user?.stats) {
            setUser({
              ...user,
              stats: {
                ...user.stats,
                followersCount: Math.max(0, user.stats.followersCount - 1),
              },
            });
          }
        }
      } else {
        const res = await api.post<{ isFollowing: boolean }>(
          `/api/v1/users/${username}/follow`
        );
        if (res.code === 0) {
          setIsFollowing(true);
          // 更新关注数
          if (user?.stats) {
            setUser({
              ...user,
              stats: {
                ...user.stats,
                followersCount: user.stats.followersCount + 1,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('关注操作失败:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // 检查拉黑状态
  const checkBlockStatus = async () => {
    if (!currentUser || currentUser.username === username) return;

    try {
      const res = await api.get<{ isBlocked: boolean }>(
        `/api/v1/users/${username}/block`
      );
      if (res.code === 200 && res.data) {
        setIsBlocked(res.data.isBlocked);
      }
    } catch (error) {
      console.error('检查拉黑状态失败:', error);
    }
  };

  // 拉黑/取消拉黑
  const handleBlockToggle = async () => {
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    if (currentUser.username === username) {
      alert('不能拉黑自己');
      return;
    }

    const confirmed = confirm(
      isBlocked
        ? `确定要取消拉黑用户 @${username} 吗？`
        : `确定要拉黑用户 @${username} 吗？拉黑后该用户将无法查看您的个人主页和仓库。`
    );
    if (!confirmed) return;

    setBlockLoading(true);
    try {
      if (isBlocked) {
        const res = await api.post<{ blocked: boolean }>(
          `/api/v1/users/${username}/block`,
          { action: 'unblock' }
        );
        if (res.code === 200) {
          setIsBlocked(false);
        }
      } else {
        const res = await api.post<{ blocked: boolean }>(
          `/api/v1/users/${username}/block`,
          { action: 'block' }
        );
        if (res.code === 200) {
          setIsBlocked(true);
          // 如果正在关注，取消关注
          if (isFollowing) {
            setIsFollowing(false);
            if (user?.stats) {
              setUser({
                ...user,
                stats: {
                  ...user.stats,
                  followersCount: Math.max(0, user.stats.followersCount - 1),
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('拉黑操作失败:', error);
    } finally {
      setBlockLoading(false);
    }
  };

  // 初始化时检查关注状态和拉黑状态
  useEffect(() => {
    checkFollowStatus();
    checkBlockStatus();
  }, [currentUser, username]);

  // Update state when initial data changes
  useEffect(() => {
    setUser(initialUser);
    setRepos(initialRepos);
    setDiscussions(initialDiscussions);
    setStars(initialStars);
  }, [initialUser, initialRepos, initialDiscussions, initialStars]);

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ paddingTop: 80, maxWidth: 1200, margin: '0 auto', padding: '80px 24px 48px', textAlign: 'center' }}>
          <h1>用户不存在</h1>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div style={{ paddingTop: 80 }}>
        {/* Profile Header - 使用新组件 */}
        <UserProfileHeader
          user={user}
          isFollowing={isFollowing}
          isBlocked={isBlocked}
          onFollow={handleFollow}
          onBlockToggle={handleBlockToggle}
          onReport={() => setShowReportModal(true)}
          followLoading={followLoading}
          blockLoading={blockLoading}
        />

        {/* Tab Navigation - 使用新组件 */}
        <UserProfileTabs
          tabs={TABS.map(tab => ({
            ...tab,
            count: tab.key === 'repos' ? repos.length : tab.count
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
          {activeTab === 'overview' && (
            <div className="user-overview-grid">
              {/* Left: Repos */}
              <div className="user-overview-left">
                <h2 style={{ fontSize: 16, margin: '0 0 16px', fontWeight: 600 }}>热门仓库</h2>
                {repos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {repos.slice(0, 6).map(repo => (
                      <Link key={repo.id} href={`/${repo.ownerUsername}/${repo.name}`} style={{
                        display: 'block',
                        padding: 16,
                        border: '1px solid var(--color-border-default)',
                        borderRadius: 6,
                        textDecoration: 'none',
                        background: 'var(--color-bg-default)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent-fg)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-default)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-accent-fg)' }}>{repo.name}</div>
                          <span style={{ fontSize: 12, padding: '2px 8px', border: '1px solid var(--color-border-default)', borderRadius: 20, color: 'var(--color-fg-muted)' }}>{repo.visibility === 'private' ? '私有' : '公开'}</span>
                        </div>
                        {repo.description && <p style={{ fontSize: 12, color: 'var(--color-fg-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>{repo.description}</p>}
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-fg-muted)' }}>
                          {repo.language && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: languageColors[repo.language] || '#ccc' }}></span>
                              {repo.language}
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            {repo.starsCount}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v1a2 2 0 01-2 2H8a2 2 0 01-2-2V9"/><path d="M12 12v3"/></svg>
                            {repo.forksCount}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border-default)', borderRadius: 6 }}>
                    用户暂无公开仓库
                  </div>
                )}
              </div>

              {/* Right: User Details */}
              <div className="user-overview-right">
                <h2 style={{ fontSize: 16, margin: '0 0 16px', fontWeight: 600 }}>个人简介</h2>
                <div style={{ background: 'var(--color-bg-default)', border: '1px solid var(--color-border-default)', borderRadius: 6, padding: 16 }}>
                  {user.bio ? (
                    <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.5 }}>{user.bio}</p>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--color-fg-muted)', fontSize: 14 }}>暂无个人简介</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--color-fg-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>{user.name || user.username}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>于 {formatDate(user.createdAt.toString())} 加入</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                      </svg>
                      <strong style={{ color: 'var(--color-fg-default)' }}>{user.stats?.followersCount || 0}</strong>
                      <span>粉丝</span>
                      <span style={{ margin: '0 4px' }}>·</span>
                      <strong style={{ color: 'var(--color-fg-default)' }}>{user.stats?.followingCount || 0}</strong>
                      <span>关注</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'repos' && (
            <div>
              {repos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {repos.map(repo => (
                    <Link key={repo.id} href={`/${repo.ownerUsername}/${repo.name}`} style={{
                      display: 'block',
                      padding: 16,
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 6,
                      textDecoration: 'none',
                      background: 'var(--color-bg-default)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-accent-fg)', marginBottom: 4 }}>{repo.name}</div>
                          {repo.description && <p style={{ fontSize: 12, color: 'var(--color-fg-muted)', margin: '0 0 8px' }}>{repo.description}</p>}
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-fg-muted)' }}>
                            {repo.language && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: languageColors[repo.language] || '#ccc' }}></span>
                                {repo.language}
                              </span>
                            )}
                            <span>⭐ {repo.starsCount}</span>
                            <span>🍴 {repo.forksCount}</span>
                            <span>更新于 {formatDate(repo.updatedAt.toString())}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border-default)', borderRadius: 6 }}>
                  用户暂无公开仓库
                </div>
              )}
            </div>
          )}

          {activeTab === 'discussions' && (
            <div>
              {discussions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {discussions.map(discussion => (
                    <Link key={discussion.id} href={`/discussions/${discussion.id}`} style={{
                      display: 'block',
                      padding: 16,
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 6,
                      textDecoration: 'none',
                      background: 'var(--color-bg-default)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-fg-default)', marginBottom: 4 }}>{discussion.title}</div>
                        <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--color-accent-subtle)', color: 'var(--color-accent-fg)', borderRadius: 20, flexShrink: 0 }}>
                          {discussion.category}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-fg-muted)', marginTop: 8 }}>
                        <span>👁 {discussion.viewsCount || 0}</span>
                        <span>💬 {discussion.commentsCount || 0}</span>
                        <span>发布于 {formatDate(discussion.createdAt.toString())}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border-default)', borderRadius: 6 }}>
                  暂无讨论
                </div>
              )}
            </div>
          )}

          {activeTab === 'stars' && (
            <div>
              {stars.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {stars.map(repo => (
                    <Link key={repo.id} href={`/${repo.ownerUsername}/${repo.name}`} style={{
                      display: 'block',
                      padding: 16,
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 6,
                      textDecoration: 'none',
                      background: 'var(--color-bg-default)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-accent-fg)', marginBottom: 4 }}>{repo.name}</div>
                        <span style={{ fontSize: 12, padding: '2px 8px', border: '1px solid var(--color-border-default)', borderRadius: 20, color: 'var(--color-fg-muted)' }}>{repo.visibility === 'private' ? '私有' : '公开'}</span>
                      </div>
                      {repo.description && <p style={{ fontSize: 12, color: 'var(--color-fg-muted)', margin: '0 0 8px' }}>{repo.description}</p>}
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-fg-muted)' }}>
                        {repo.language && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: languageColors[repo.language] || '#ccc' }}></span>
                            {repo.language}
                          </span>
                        )}
                        <span>⭐ {repo.starsCount}</span>
                        <span>🍴 {repo.forksCount}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-fg-muted)', border: '1px solid var(--color-border-default)', borderRadius: 6 }}>
                  暂无收藏
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 举报用户弹窗 */}
      {showReportModal && user && (
        <ReportModal
          targetType="user"
          targetId={user.uid || user.id}
          targetTitle={user.name || user.username}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
