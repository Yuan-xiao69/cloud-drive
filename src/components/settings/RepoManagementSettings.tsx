'use client';

import React from 'react';
import Link from 'next/link';
import SettingsSection from './SettingsSection';
import { RepoDeleteModal } from './modals';

interface Repo {
  id: string;
  name: string;
  visibility: string;
}

interface RepoManagementSettingsProps {
  repos: Repo[];
  reposLoading: boolean;
  user?: { username: string } | null;
  onDeleteClick: (id: string, name: string) => void;
  deleteModal: { show: boolean; repoId: string | null; repoName: string };
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

export default function RepoManagementSettings({
  repos,
  reposLoading,
  user,
  onDeleteClick,
  deleteModal,
  onCancelDelete,
  onConfirmDelete
}: RepoManagementSettingsProps) {
  return (
    <SettingsSection 
      title="仓库管理" 
      description="管理你的仓库设置"
    >
      {reposLoading ? (
        <div className="empty-state">
          <p>加载中...</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="empty-state">
          <p>暂无仓库</p>
        </div>
      ) : (
        <div className="repo-list">
          {repos.map(repo => (
            <div key={repo.id} className="repo-item">
              <div className="repo-info">
                <Link href={`/${user?.username}/${repo.name}`} className="repo-name">{repo.name}</Link>
                <span className="repo-visibility label">{repo.visibility === 'public' ? '公开' : '私有'}</span>
              </div>
              <div className="repo-actions">
                <Link href={`/${user?.username}/${repo.name}`} className="btn btn-ghost btn-sm">设置</Link>
                <button
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => onDeleteClick(repo.id, repo.name)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <RepoDeleteModal
        isOpen={deleteModal.show}
        repoName={deleteModal.repoName}
        onCancel={onCancelDelete}
        onConfirm={onConfirmDelete}
      />
    </SettingsSection>
  );
}