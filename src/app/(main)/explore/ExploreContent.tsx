'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import { Avatar, Card, PageLayout, PageLayoutPane, PageLayoutContent, Empty, Badge, Tabs } from '@/components/design';

const RepoIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" /></svg>
);
const UserIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const DiscussionIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
);
const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
);
const ForkIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9v1a2 2 0 01-2 2H8a2 2 0 01-2-2V9" /><path d="M12 12v3" /></svg>
);
type Tab = 'repos' | 'users' | 'discussions';

interface ExploreData {
  repos: { id: string; name: string; description: string | null; language: string | null; starCount: number; forkCount: number; owner: { username: string; avatarUrl?: string } | null }[];
  users: { id: string; username: string; avatarUrl: string | null; bio: string | null; followersCount?: number; reposCount?: number }[];
  discussions: { id: string; title: string; category: string; replyCount: number; createdAt: string }[];
}

export function ExploreContent({ initialData }: { initialData: ExploreData }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam === 'users' || tabParam === 'discussions' ? tabParam : 'repos'
  );
  const [results] = useState<ExploreData>(initialData);

  return (
    <PageLayout containerWidth="extraWide">
      <PageLayoutPane width="sidebar">
        <LeftSidebar />
      </PageLayoutPane>
      <PageLayoutContent>
        <div className="px-6 pt-6">
          <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)]">
            {activeTab === 'repos' ? '热门仓库' : activeTab === 'users' ? '推荐用户' : '热门讨论'}
          </h1>
              </div>
              <Tabs
                items={[
                  { key: 'repos', label: '仓库', icon: <RepoIcon size={14} /> },
                  { key: 'users', label: '用户', icon: <UserIcon size={14} /> },
                  { key: 'discussions', label: '讨论', icon: <DiscussionIcon size={14} /> },
                ]}
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as Tab)}
                className="px-6 mt-4"
              />
              <div className="p-6">
                    {activeTab === 'repos' && (results.repos.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {results.repos.map(repo => (
                          <Link key={repo.id} href={`/${repo.owner?.username}/${repo.name}`} className="no-underline block">
                            <Card variant="surface" className="hover:border-[var(--ds-accent-default)] transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 px-2 py-0.5 text-xs bg-[var(--ds-surface-subtle)] rounded-full text-[var(--ds-text-secondary)]">
                                  <StarIcon size={12} />{repo.starCount}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 text-sm">
                                    <RepoIcon size={14} />
                                    <span className="text-[var(--ds-accent-default)] font-medium">{repo.owner?.username}</span>
                                    <span className="text-[var(--ds-text-secondary)]">/</span>
                                    <span className="text-[var(--ds-text-primary)] font-semibold">{repo.name}</span>
                                  </div>
                                  <p className="text-[13px] text-[var(--ds-text-secondary)] truncate mt-1">{repo.description || '暂无描述'}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--ds-text-secondary)]">
                                    {repo.forkCount > 0 && <span className="flex items-center gap-1"><ForkIcon size={12} />{repo.forkCount}</span>}
                                  </div>
                                </div>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : <Empty title="暂无仓库" />)}

                    {activeTab === 'users' && (results.users.length > 0 ? (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
                        {results.users.map(user => (
                          <Link key={user.id} href={`/${user.username}`} className="no-underline block">
                            <Card variant="surface" className="hover:border-[var(--ds-accent-default)] transition-colors">
                              <div className="flex items-center gap-3 mb-3"><Avatar src={user.avatarUrl} size="lg" fallback={user.username} /></div>
                              <div className="text-base font-semibold text-[var(--ds-text-primary)]">{user.username}</div>
                              <p className="text-[13px] text-[var(--ds-text-secondary)] truncate mt-1">{user.bio || '暂无简介'}</p>
                              <div className="flex gap-4 mt-3 text-xs text-[var(--ds-text-secondary)]"><span>{user.followersCount || 0} 关注者</span><span>{user.reposCount || 0} 仓库</span></div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : <Empty title="暂无用户" />)}

                    {activeTab === 'discussions' && (results.discussions.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {results.discussions.map(d => (
                          <Link key={d.id} href={`/discussions/${d.id}`} className="no-underline block">
                            <Card variant="surface" className="hover:border-[var(--ds-accent-default)] transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-10 h-10 bg-[var(--ds-surface-subtle)] rounded-[var(--ds-radius-md)] text-[var(--ds-text-secondary)]"><DiscussionIcon /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1"><Badge variant="default">{d.category}</Badge><span className="text-xs text-[var(--ds-text-secondary)]">{d.replyCount} 回复</span></div>
                                  <div className="text-sm font-medium text-[var(--ds-text-primary)] truncate">{d.title}</div>
                                </div>
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    ) : <Empty title="暂无讨论" />)}
              </div>
      </PageLayoutContent>
      <PageLayoutPane width="rightSidebar">
        <RightSidebar />
      </PageLayoutPane>
    </PageLayout>
  );
}
