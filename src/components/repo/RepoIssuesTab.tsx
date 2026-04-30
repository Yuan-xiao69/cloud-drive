'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusIcon, CloseIcon, IssueIcon } from '@/components/repo/RepoIcons';
import type { Issue, IssueStatus } from './RepoTypes';

interface RepoIssuesTabProps {
  username: string;
  repoName: string;
  issues: Issue[];
  issuesTotal: number;
  issueStatus: IssueStatus;
  onStatusChange: (status: IssueStatus) => void;
  showIssueModal: boolean;
  onShowModalChange: (show: boolean) => void;
  onCreateIssue: () => Promise<void>;
  onFetchIssues: (status: string) => void;
}

export default function RepoIssuesTab({
  username,
  repoName,
  issues,
  issuesTotal,
  issueStatus,
  onStatusChange,
  showIssueModal,
  onShowModalChange,
  onCreateIssue,
  onFetchIssues,
}: RepoIssuesTabProps) {
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueContent, setNewIssueContent] = useState('');
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;
    setIsCreatingIssue(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ title: newIssueTitle, content: newIssueContent }),
      });
      const data = await res.json();
      if (data.code === 200) {
        onShowModalChange(false);
        setNewIssueTitle('');
        setNewIssueContent('');
        onFetchIssues(issueStatus);
      } else {
        alert(data.message || '创建失败');
      }
    } catch (err) {
      alert('创建失败');
    } finally {
      setIsCreatingIssue(false);
    }
  };

  return (
    <div className="issues-page">
      {/* 工具栏 */}
      <div className="issues-toolbar">
        <div className="issues-filters">
          <select
            className="filter-select"
            value={issueStatus}
            onChange={(e) => {
              const newStatus = e.target.value as IssueStatus;
              onStatusChange(newStatus);
              onFetchIssues(newStatus);
            }}
          >
            <option value="open">开放</option>
            <option value="closed">已关闭</option>
            <option value="all">全部</option>
          </select>
          <span className="issues-count">{issuesTotal} 个问题</span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onShowModalChange(true)}
        >
          <PlusIcon />
          新建问题
        </button>
      </div>

      {/* 问题列表 */}
      <div className="issues-list">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <div key={issue.id} className="issue-item">
              <IssueIcon />
              <div className="issue-content">
                <Link href={`/${username}/${repoName}/issues/${issue.id}`} className="issue-title">
                  {issue.title}
                </Link>
                <span className="issue-meta">
                  由 <strong>{issue.authorUsername}</strong> 创建于 {new Date(issue.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <span className="issue-comments">{issue.commentsCount} 评论</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <IssueIcon />
            <h3>暂无{issueStatus === 'open' ? '开放' : issueStatus === 'closed' ? '已关闭' : ''}问题</h3>
            <p>成为第一个提交问题的人</p>
          </div>
        )}
      </div>

      {/* 新建问题模态框 */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={() => onShowModalChange(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建问题</h3>
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
                  placeholder="问题标题"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder="详细描述你的问题..."
                  value={newIssueContent}
                  onChange={(e) => setNewIssueContent(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => onShowModalChange(false)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateIssue}
                disabled={!newIssueTitle.trim() || isCreatingIssue}
              >
                {isCreatingIssue ? '创建中...' : '创建问题'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
