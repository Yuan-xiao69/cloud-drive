import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';
import { Card, PageLayout, PageLayoutContent, Empty } from '@/components/design';

const RepoIcon = () => <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z" /></svg>;

export default async function ReposPage() {
  const user = await auth();
  if (!user) {
    redirect('/login?redirect=/repos');
  }

  const repos = await prisma.repository.findMany({
    where: { ownerId: user.id, deletedAt: null },
    include: { owner: { select: { username: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <div className="mx-auto w-full p-6">
        <div className="py-6">
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-semibold text-[var(--ds-text-primary)]">仓库列表</h1>
            <span className="text-sm text-[var(--ds-text-secondary)]">{repos.length} 个仓库</span>
          </div>
          {repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos.map(repo => (
                <Link key={repo.id} href={`/${repo.owner?.username}/${repo.name}`} className="no-underline block"><Card variant="surface" className="hover:border-[var(--ds-accent-default)] transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 min-w-0 text-sm"><RepoIcon /><span className="font-medium text-[var(--ds-text-primary)] truncate">{repo.owner?.username}/{repo.name}</span></div>
                    <span className="flex items-center gap-1 text-xs text-[var(--ds-text-secondary)] flex-shrink-0 ml-2"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm0 1C5.79 1 4 2.79 4 5s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.21 0-4 1.79-4 4v1h8v-1c0-2.21-1.79-4-4-4z"/></svg>{repo.visibility === 1 ? '公开' : '私有'}</span>
                  </div>
                  {repo.description && <p className="text-sm text-[var(--ds-text-secondary)] line-clamp-2 mb-3">{repo.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-[var(--ds-text-secondary)]">
                    <span className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>{repo.starCount || 0}</span>
                    <span className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9a9 9 0 01-9 9M6 9a9 9 0 009 9"/></svg>{repo.forkCount || 0}</span>
                  </div>
                </Card></Link>
              ))}
            </div>
          ) : (
            <Empty title="暂无仓库" />
          )}
        </div>
      </div>
    </PageLayoutContent></PageLayout>
  );
}
