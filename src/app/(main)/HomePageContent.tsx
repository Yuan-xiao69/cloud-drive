'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RepoCardList, Motto, Stats, Tabs, Empty,
  PageLayout, PageLayoutPane, PageLayoutContent,
} from '@/components/design';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';

interface Repo {
  id: string; name: string; description: string | null;
  language: string | null; starCount: number; forkCount: number;
  owner: { username: string; avatarUrl?: string } | null; updatedAt: string;
}
interface RepoStats { repos: number; users: number; discussions: number }
interface HomePageContentProps { hotRepos: Repo[]; stats: RepoStats }

export default function HomePageContent({ hotRepos, stats }: HomePageContentProps) {
  const router = useRouter();
  const [tab, setTab] = useState<string>('hot');

  return (
    <PageLayout containerWidth="extraWide">
      <PageLayoutPane width="sidebar">
        <LeftSidebar />
      </PageLayoutPane>
      <PageLayoutContent>
        <div className="px-6 pt-6">

          <Motto text="天下万般绝学，莫过于恒心" />

          <div className="pb-6">
            <Stats items={[
              { value: stats.repos.toLocaleString(), label: '仓库' },
              { value: stats.users.toLocaleString(), label: '用户' },
              { value: stats.discussions.toLocaleString(), label: '讨论' },
            ]} />
          </div>

          <div className="mb-4">
            <Tabs
              items={[
                { key: 'hot', label: '热门仓库' },
                { key: 'latest', label: '最新' },
                { key: 'recommended', label: '推荐' },
              ]}
              activeKey={tab}
              onChange={setTab}
            />
          </div>

          {hotRepos.length > 0 ? (
            <RepoCardList repos={hotRepos} badge="热门" />
          ) : (
            <Empty
              title="发现更多精彩仓库"
              description="浏览社区中最受欢迎的项目，或创建你的第一个仓库。"
              action={{ label: '创建仓库', onClick: () => router.push('/new') }}
            />
          )}

        </div>
        <footer className="border-t border-[var(--ds-border-default)] py-6 text-center font-ui text-[13px] text-[var(--ds-text-tertiary)]">
          <Link href="/explore" className="text-[var(--ds-text-secondary)] no-underline mx-2 hover:text-[var(--ds-accent-default)]">探索</Link>
          <Link href="/discussions" className="text-[var(--ds-text-secondary)] no-underline mx-2 hover:text-[var(--ds-accent-default)]">讨论</Link>
          <span className="ml-2 opacity-50">© 2026 知识托管平台</span>
        </footer>
      </PageLayoutContent>
      <PageLayoutPane width="rightSidebar">
        <RightSidebar />
      </PageLayoutPane>
    </PageLayout>
  );
}
