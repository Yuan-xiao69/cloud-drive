'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusIcon, CloseIcon, PullRequestIcon } from '@/components/repo/RepoIcons';
import type { PullRequest, PullStatus } from './RepoTypes';

interface RepoPullsTabProps {
  username: string;
  repoName: string;
  pulls: PullRequest[];
  pullsTotal: number;
  pullStatus: PullStatus;
  defaultBranch?: string;
  onStatusChange: (status: PullStatus) => void;
  showPRModal: boolean;
  onShowModalChange: (show: boolean) => void;
  onCreatePR: () => Promise<void>;
  onFetchPulls: (status: string) => void;
}

export default function RepoPullsTab({
  username,
  repoName,
  pulls,
  pullsTotal,
  pullStatus,
  defaultBranch = 'main',
  onStatusChange,
  showPRModal,
  onShowModalChange,
  onCreatePR,
  onFetchPulls,
}: RepoPullsTabProps) {
  const [newPRTitle, setNewPRTitle] = useState('');
  const [newPRContent, setNewPRContent] = useState('');
  const [newPRSourceBranch, setNewPRSourceBranch] = useState('');
  const [newPRTargetBranch, setNewPRTargetBranch] = useState(defaultBranch);
  const [isCreatingPR, setIsCreatingPR] = useState(false);

  const handleCreatePR = async () => {
    if (!newPRTitle.trim()) return;
    setIsCreatingPR(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: newPRTitle,
          content: newPRContent,
          sourceBranch: newPRSourceBranch,
          targetBranch: newPRTargetBranch,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        onShowModalChange(false);
        setNewPRTitle('');
        setNewPRContent('');
        setNewPRSourceBranch('');
        onFetchPulls(pullStatus);
      } else {
        alert(data.message || '创建失败');
      }
    } catch (err) {
      alert('创建失败');
    } finally {
      setIsCreatingPR(false);
    }
  };

  return (
    <div className="pulls-page">
      {/* 工具栏 */}
      <div className="pulls-toolbar">
        <div className="pulls-filters">
          <select
            className="filter-select"
            value={pullStatus}
            onChange={(e) => {
              const newStatus = e.target.value as PullStatus;
              onStatusChange(newStatus);
              onFetchPulls(newStatus);
            }}
          >
            <option value="open">开放</option>
            <option value="merged">已合并</option>
            <option value="closed">已关闭</option>
            <option value="all">全部</option>
          </select>
          <span className="pulls-count">{pullsTotal} 个拉取请求</span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setNewPRTargetBranch(defaultBranch); onShowModalChange(true); }}
        >
          <PlusIcon />
          新建拉取请求
        </button>
      </div>

      {/* 拉取请求列表 */}
      <div className="pulls-list">
        {pulls.length > 0 ? (
          pulls.map((pr) => (
            <div key={pr.id} className="pull-item">
              <PullRequestIcon />
              <div className="pull-content">
                <Link href={`/${username}/${repoName}/pulls/${pr.id}`} className="pull-title">
                  {pr.title}
                </Link>
                <span className="pull-meta">
                  由 <strong>{pr.authorUsername}</strong> · {pr.sourceBranch} → {pr.targetBranch}
                </span>
              </div>
              <span className="pull-comments">{pr.commentsCount} 评论</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <PullRequestIcon />
            <h3>暂无{pullStatus === 'open' ? '开放' : pullStatus === 'merged' ? '已合并' : pullStatus === 'closed' ? '已关闭' : ''}拉取请求</h3>
            <p>成为第一个发起拉取请求的人</p>
          </div>
        )}
      </div>

      {/* 新建 PR 模态框 */}
      {showPRModal && (
        <div className="modal-overlay" onClick={() => onShowModalChange(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建拉取请求</h3>
              <button className="modal-close" onClick={() => onShowModalChange(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">标题</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="拉取请求标题"
                  value={newPRTitle}
                  onChange={(e) => setNewPRTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder="详细描述你的更改..."
                  value={newPRContent}
                  onChange={(e) => setNewPRContent(e.target.value)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">源分支</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="feature-branch"
                    value={newPRSourceBranch}
                    onChange={(e) => setNewPRSourceBranch(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">目标分支</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="main"
                    value={newPRTargetBranch}
                    onChange={(e) => setNewPRTargetBranch(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => onShowModalChange(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreatePR}
                disabled={!newPRTitle.trim() || isCreatingPR}
              >
                {isCreatingPR ? '创建中...' : '创建拉取请求'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
