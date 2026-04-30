'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  AlertCircle,
  Circle,
  CheckCircle,
  Tag,
  Clock,
  X,
} from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { tokenManager } from '@/lib/api/client';

interface IssueLabel {
  id: string;
  name: string;
  color: string;
}

interface Issue {
  id: string;
  title: string;
  content: string;
  status: string;
  labels: IssueLabel[];
  commentsCount: number;
  authorUsername: string;
  authorAvatar: string | null;
  createdAt: string;
}

interface RepoInfo {
  id: string;
  name: string;
  owner: { username: string };
}

export default function IssuesListPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;

  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 创建 Issue 模态框
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newLabels, setNewLabels] = useState<IssueLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#0075ca');
  const [isCreating, setIsCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  // 获取当前用户
  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (!token) return;
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.code === 200) setCurrentUser(d.data);
      })
      .catch(() => {});
  }, []);

  // 获取 Issues
  const fetchIssues = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status: status === 'all' ? 'all' : status,
        page: page.toString(),
        size: pageSize.toString(),
      });
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues?${params}`);
      const data = await res.json();
      if (data.code === 200) {
        setIssues(data.data.data);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        setError(data.message || '加载失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [username, repoName, status, page]);

  // 过滤搜索
  const filteredIssues = searchQuery
    ? issues.filter(i =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : issues;

  // 创建 Issue
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          labels: newLabels.map(l => ({ name: l.name, color: l.color })),
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        setNewLabels([]);
        fetchIssues();
      } else {
        alert(data.message || '创建失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setIsCreating(false);
    }
  };

  // 添加标签
  const handleAddLabel = () => {
    if (!newLabelName.trim()) return;
    setNewLabels(prev => [...prev, { id: Date.now().toString(), name: newLabelName.trim(), color: newLabelColor }]);
    setNewLabelName('');
  };

  // 移除标签
  const handleRemoveLabel = (id: string) => {
    setNewLabels(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="issues-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>问题</h1>
          <span className="count-badge">{total}</span>
        </div>
        {currentUser && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            新建问题
          </button>
        )}
      </div>

      {/* 状态标签栏 */}
      <div className="status-tabs">
        <button
          className={`status-tab ${status === 'open' ? 'active' : ''}`}
          onClick={() => { setStatus('open'); setPage(1); }}
        >
          <Circle size={16} />
          开放 {total > 0 && `(${issues.filter(i => i.status === 'open').length})`}
        </button>
        <button
          className={`status-tab ${status === 'closed' ? 'active' : ''}`}
          onClick={() => { setStatus('closed'); setPage(1); }}
        >
          <CheckCircle size={16} />
          已关闭 {total > 0 && `(${issues.filter(i => i.status === 'closed').length})`}
        </button>
        <button
          className={`status-tab ${status === 'all' ? 'active' : ''}`}
          onClick={() => { setStatus('all'); setPage(1); }}
        >
          全部
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="搜索问题..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 列表 */}
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>加载中...</span>
        </div>
      ) : error ? (
        <div className="error-state">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchIssues}>重试</button>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="empty-state">
          {status === 'open' ? (
            <>
              <AlertCircle size={48} />
              <h3>没有问题</h3>
              <p>这个问题仓库还没有开放的问题</p>
              {currentUser && (
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  创建第一个问题
                </button>
              )}
            </>
          ) : (
            <>
              <CheckCircle size={48} />
              <h3>没有已关闭的问题</h3>
              <p>已关闭的问题会显示在这里</p>
            </>
          )}
        </div>
      ) : (
        <div className="issues-list">
          {filteredIssues.map(issue => (
            <Link
              key={issue.id}
              href={`/${username}/${repoName}/issues/${issue.id}`}
              className="issue-item"
            >
              <div className="issue-status-icon">
                {issue.status === 'open' ? (
                  <span className="status-icon open"><Circle size={20} /></span>
                ) : (
                  <span className="status-icon closed"><CheckCircle size={20} /></span>
                )}
              </div>
              <div className="issue-content">
                <div className="issue-title-row">
                  <span className="issue-title">{issue.title}</span>
                  {issue.labels && issue.labels.length > 0 && (
                    <div className="issue-labels">
                      {issue.labels.slice(0, 3).map(label => (
                        <span
                          key={label.id}
                          className="label-badge"
                          style={{
                            backgroundColor: label.color + '22',
                            color: label.color,
                            borderColor: label.color,
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {issue.labels.length > 3 && (
                        <span className="label-more">+{issue.labels.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="issue-meta">
                  <span className="meta-item">
                    #{issue.id.slice(0, 8)} • 由 {issue.authorUsername} 提交
                  </span>
                  <span className="meta-item">
                    <Clock size={12} />
                    {formatTimeAgo(issue.createdAt)}
                  </span>
                  {issue.commentsCount > 0 && (
                    <span className="meta-item comments">
                      💬 {issue.commentsCount} 条评论
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            上一页
          </button>
          <span className="page-info">
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            下一页
          </button>
        </div>
      )}

      {/* 创建模态框 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>新建问题</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>标题 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="问题标题"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  className="form-input"
                  rows={8}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="详细描述你遇到的问题或建议..."
                />
              </div>
              <div className="form-group">
                <label>标签</label>
                <div className="label-input-row">
                  <input
                    type="text"
                    className="form-input"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    placeholder="标签名称"
                  />
                  <input
                    type="color"
                    className="color-picker"
                    value={newLabelColor}
                    onChange={e => setNewLabelColor(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleAddLabel}>
                    添加
                  </button>
                </div>
                {newLabels.length > 0 && (
                  <div className="label-list">
                    {newLabels.map(label => (
                      <span
                        key={label.id}
                        className="label-badge"
                        style={{
                          backgroundColor: label.color + '22',
                          color: label.color,
                          borderColor: label.color,
                        }}
                      >
                        <Tag size={12} />
                        {label.name}
                        <button
                          type="button"
                          className="label-remove"
                          onClick={() => handleRemoveLabel(label.id)}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating || !newTitle.trim()}>
                  {isCreating ? '创建中...' : '创建问题'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .issues-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .count-badge {
          background: var(--skeleton-bg);
          color: var(--color-text-secondary);
          font-size: 14px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 20px;
        }

        .status-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 20px;
        }

        .status-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: none;
          color: var(--color-text-secondary);
          font-size: 14px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.2s;
        }

        .status-tab:hover {
          color: var(--color-text);
        }

        .status-tab.active {
          color: var(--color-text);
          border-bottom-color: var(--accent-color);
        }

        .status-tab .status-icon.open {
          color: var(--color-success-fg);
        }

        .status-tab .status-icon.closed {
          color: var(--color-closed-fg, #8250df);
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .search-bar svg {
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }

        .search-bar input {
          flex: 1;
          border: none;
          background: none;
          font-size: 14px;
          color: var(--color-text);
          outline: none;
        }

        .search-bar input::placeholder {
          color: var(--color-text-secondary);
        }

        .issues-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }

        .issue-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }

        .issue-item:last-child {
          border-bottom: none;
        }

        .issue-item:hover {
          background: var(--hover-bg);
        }

        .issue-status-icon {
          flex-shrink: 0;
          padding-top: 2px;
        }

        .status-icon.open {
          color: var(--color-success-fg);
        }

        .status-icon.closed {
          color: var(--color-closed-fg, #8250df);
        }

        .issue-content {
          flex: 1;
          min-width: 0;
        }

        .issue-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .issue-title {
          font-size: 15px;
          font-weight: 500;
          color: var(--link-color);
        }

        .issue-labels {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .label-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          font-size: 12px;
          border-radius: 100px;
          border: 1px solid;
          font-weight: 500;
        }

        .label-more {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .label-remove {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          opacity: 0.7;
        }

        .label-remove:hover {
          opacity: 1;
        }

        .issue-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .comments {
          color: var(--color-text-secondary);
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 8px;
          font-size: 18px;
          color: var(--color-text);
        }

        .empty-state p {
          margin: 0 0 16px;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .page-info {
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .modal-content {
          background: var(--bg-primary);
          border-radius: 8px;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--color-text-secondary);
        }

        .modal-close:hover {
          color: var(--color-text);
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }

        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          background: var(--input-bg);
          color: var(--color-text);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .label-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .label-input-row .form-input {
          flex: 1;
        }

        .color-picker {
          width: 40px;
          height: 38px;
          padding: 2px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
        }

        .label-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
        }
      `}</style>
    </div>
  );
}
