'use client';

import React from 'react';
import Link from 'next/link';
import SettingsSection from './SettingsSection';
import { RepoDeleteModal } from './modals';
import { Button } from '@/components/design';

const RepoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
);

interface Repo { id: string; name: string; visibility: string }

interface RepoManagementSettingsProps {
  repos: Repo[]; reposLoading: boolean; user?: { username: string } | null;
  onDeleteClick: (id: string, name: string) => void;
  deleteModal: { show: boolean; repoId: string | null; repoName: string };
  onCancelDelete: () => void; onConfirmDelete: () => void;
}

export default function RepoManagementSettings({ repos, reposLoading, user, onDeleteClick, deleteModal, onCancelDelete, onConfirmDelete }: RepoManagementSettingsProps) {
  return (
    <SettingsSection title="仓库管理" description="管理你拥有的所有仓库">
      {reposLoading ? (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]"><p>加载中...</p></div>
      ) : repos.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]"><p>暂无仓库</p></div>
      ) : (
        <div className="flex flex-col">
          {repos.map(repo => (
            <div key={repo.id} className="flex items-center gap-3 py-3.5 border-b border-[var(--ds-border-muted)] last:border-b-0">
              <div className="w-8 h-8 rounded-[var(--ds-radius-sm)] bg-[var(--ds-accent-subtle)] text-[var(--ds-accent)] flex items-center justify-center flex-shrink-0">
                <RepoIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-ui text-[13px] font-medium text-[var(--ds-text)]">
                  {user?.username}/{repo.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--ds-text-tertiary)] mt-0.5">
                  <span className={`inline-flex px-2 py-0.5 rounded-[10px] font-ui text-[11px] font-semibold ${repo.visibility === 'public' ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent)]' : 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning)]'}`}>
                    {repo.visibility === 'public' ? '公开' : '私有'}
                  </span>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => onDeleteClick(repo.id, repo.name)}>删除</Button>
            </div>
          ))}
        </div>
      )}

      <RepoDeleteModal isOpen={deleteModal.show} repoName={deleteModal.repoName} onCancel={onCancelDelete} onConfirm={onConfirmDelete} />
    </SettingsSection>
  );
}
