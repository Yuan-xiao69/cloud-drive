import React from 'react';
import Link from 'next/link';
import { formatTimeAgo, getLanguageColor } from '@/lib/utils';
import { Badge, Card } from '@/components/design';
import { StarIcon, ForkIcon } from '@/components/design/icons';

interface RepoCardRepo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  owner: { username: string; avatarUrl?: string } | null;
  updatedAt: string;
  /** 服务端预格式化的相对时间（避免 hydration 不一致） */
  updatedAtFormatted?: string;
}

interface RepoCardProps {
  repo: RepoCardRepo;
  badge?: string;
  className?: string;
}

function RepoCardTitle({ repo, badge }: { repo: RepoCardRepo; badge?: string }) {
  return (
    <div className="flex items-baseline gap-1 font-ui text-sm mb-1">
      <span className="text-[var(--ds-text-secondary)] font-normal">{repo.owner?.username}</span>
      <span className="text-[var(--ds-text-secondary)]">/</span>
      <span className="text-[var(--ds-accent-default)] font-semibold hover:underline">{repo.name}</span>
      {badge && <Badge className="ml-2">{badge}</Badge>}
    </div>
  );
}

function RepoCardDesc({ description }: { description: string | null }) {
  return (
    <p className="font-body text-sm text-[var(--ds-text-secondary)] leading-relaxed mb-2 line-clamp-2">
      {description || '暂无描述'}
    </p>
  );
}

function RepoCardMeta({ repo }: { repo: RepoCardRepo }) {
  return (
    <div className="flex items-center gap-4 font-ui text-xs text-[var(--ds-text-tertiary)]">
      {repo.language && (
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLanguageColor(repo.language) }} />
          {repo.language}
        </span>
      )}
      <span className="flex items-center gap-1"><StarIcon size={13} />{repo.starCount}</span>
      <span className="flex items-center gap-1"><ForkIcon size={13} />{repo.forkCount}</span>
      <span>更新于 {repo.updatedAtFormatted || formatTimeAgo(repo.updatedAt)}</span>
    </div>
  );
}

export function RepoCard({ repo, badge, className = '' }: RepoCardProps) {
  return (
    <Link
      href={`/${repo.owner?.username}/${repo.name}`}
      className={`block no-underline px-[var(--ds-space-4)] py-[var(--ds-space-4)] transition-colors hover:bg-[var(--ds-surface-subtle)] ${className}`}
    >
      <RepoCardTitle repo={repo} badge={badge} />
      <RepoCardDesc description={repo.description} />
      <RepoCardMeta repo={repo} />
    </Link>
  );
}

export function RepoCardList({ repos, badge }: { repos: RepoCardRepo[]; badge?: string }) {
  return (
    <Card variant="elevated" padding="none" className="mb-6 overflow-hidden">
      {repos.map((repo, idx) => (
        <RepoCard
          key={repo.id}
          repo={repo}
          badge={badge}
          className={idx < repos.length - 1 ? 'border-b border-[var(--ds-border-muted)]' : ''}
        />
      ))}
    </Card>
  );
}
