'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Card, PageLayout, PageLayoutPane, PageLayoutContent, Button, Empty, Badge, Select } from '@/components/design';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { api } from '@/lib/api/client';

interface Discussion {
  id: string; title: string; content: string; viewCount: number; commentCount: number;
  category: string; updatedAt: string; tags?: string[]; isWiki?: boolean; hasAccepted?: boolean;
  author: { username: string; avatarUrl: string | null };
}

const categories = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'qa', name: '问答', icon: '💬' },
  { id: 'share', name: '分享', icon: '📤' },
  { id: 'suggestion', name: '建议', icon: '💡' },
  { id: 'announce', name: '公告', icon: '📢' },
  { id: 'general', name: '闲聊', icon: '💬' },
];
const sortOptions = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '最热' },
  { value: 'unanswered', label: '待回复' },
];

interface Props {
  initialDiscussions: Discussion[];
  isLoggedIn: boolean;
}

export default function DiscussionsContent({ initialDiscussions, isLoggedIn }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('latest');
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [isLoading, setIsLoading] = useState(false);
  const [skipInitialFetch, setSkipInitialFetch] = useState(true);

  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      params.set('sort', sort);
      const data = await api.get<{ items: Discussion[] }>(`/api/v1/discussions?${params}`);
      if (data.code === 200) setDiscussions(data.data.items || data.data || []);
    } finally { setIsLoading(false); }
  }, [category, sort]);

  useEffect(() => {
    if (skipInitialFetch) {
      setSkipInitialFetch(false);
      return;
    }
    fetchDiscussions();
  }, [fetchDiscussions, skipInitialFetch]);

  const categoryStats = categories.reduce((acc, cat) => {
    acc[cat.id] = cat.id === 'all' ? discussions.length : discussions.filter(d => d.category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageLayout containerWidth="extraWide">
      <PageLayoutPane width="sidebar">
        <LeftSidebar />
      </PageLayoutPane>
      <PageLayoutContent>
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)] mb-6">讨论</h1>

          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--ds-border-default)] flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.map(cat => {
                const active = category === cat.id;
                return (
                  <Button
                    key={cat.id}
                    variant={active ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setCategory(cat.id)}
                  >
                    <span>{cat.icon}</span> {cat.name}
                    <span className="inline-flex items-center px-[var(--ds-space-2)] py-[1px] text-[11px] font-semibold rounded-[var(--ds-radius-full)] bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)] ml-1">{categoryStats[cat.id] || 0}</span>
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <Select value={sort} onChange={e => setSort(e.target.value)} options={sortOptions} />
              {isLoggedIn && <Button variant="primary" onClick={() => router.push('/discussions/new')}>发起讨论</Button>}
            </div>
          </div>

          {isLoading ? null : discussions.length === 0 ? (
            <Empty
              title="暂无讨论"
              description="成为第一个发起讨论的人吧！"
              action={isLoggedIn ? { label: '发起讨论', onClick: () => router.push('/discussions/new') } : undefined}
            />
          ) : (
            <div className="flex flex-col gap-1">
              {discussions.map(d => (
                <Link key={d.id} href={`/discussions/${d.id}`} className="no-underline block">
                  <Card variant="surface" className="hover:border-[var(--ds-border-strong)]">
                    <div className="flex items-center gap-4">
                      <Avatar src={d.author.avatarUrl} size="md" fallback={d.author.username} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default">{categories.find(c => c.id === d.category)?.name || d.category}</Badge>
                          {d.hasAccepted && <span className="text-xs" title="已解决">✅</span>}
                        </div>
                        <h3 className="text-base font-medium text-[var(--ds-text-primary)] truncate">{d.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-[var(--ds-text-secondary)] mt-1">
                          <span className="font-medium">{d.author.username}</span>
                          <span>·</span>
                          <span>{new Date(d.updatedAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--ds-text-secondary)] flex-shrink-0">
                        <span className="flex items-center gap-1" title="回复">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                          {d.commentCount}
                        </span>
                        <span className="flex items-center gap-1" title="浏览">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          {d.viewCount}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
