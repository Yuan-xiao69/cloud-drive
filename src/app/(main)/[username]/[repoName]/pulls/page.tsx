'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus,
  Search,
  AlertCircle,
  GitPullRequest,
  GitMerge,
  XCircle,
  Clock,
  GitBranch,
  ArrowRight,
} from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { tokenManager } from '@/lib/api/client';

interface PullRequest {
  id: string;
  title: string;
  content: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  sourceRepo?: {
    id: string;
    name: string;
    owner: { username: string };
  };
  commentsCount: number;
  authorUsername: string;
  authorAvatar: string | null;
  createdAt: string;
}

export default function PullsListPage() {
  const params = useParams();
  const username = params.username as string;
  const repoName = params.repoName as string;

  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<'open' | 'merged' | 'closed' | 'all'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 创建 PR 模态框
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSourceBranch, setNewSourceBranch] = useState('');
  const [newTargetBranch, setNewTargetBranch] = useState('main');
  const [isCreating, setIsCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [repoBranches, setRepoBranches] = useState<{name: string}[]>([]);

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

  // 获取分支列表
  useEffect(() => {
    fetch(`/api/v1/repos/${username}/${repoName}/branches`)
      .then(r => r.json())
      .then(d => {
        if (d.code === 200) {
          setRepoBranches(d.data);
          if (d.data.length > 0) {
            const nonDefault = d.data.find((b: {name: string}) => b.name !== 'main');
            setNewSourceBranch(nonDefault?.name || d.data[0]?.name || '');
          }
        }
      })
      .catch(() => {});
  }, [username, repoName]);

  // 获取 PRs
  const fetchPulls = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status: status === 'all' ? 'all' : status,
        page: page.toString(),
        size: pageSize.toString(),
      });
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls?${params}`);
      const data = await res.json();
      if (data.code === 200) {
        setPulls(data.data.data);
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
    fetchPulls();
  }, [username, repoName, status, page]);

  // 过滤搜索
  const filteredPulls = searchQuery
    ? pulls.filter(pr =>
        pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : pulls;

  // 创建 PR
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSourceBranch) return;

    setIsCreating(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          sourceBranch: newSourceBranch,
          targetBranch: newTargetBranch,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        setNewSourceBranch(repoBranches.find(b => b.name !== 'main')?.name || '');
        fetchPulls();
      } else {
        alert(data.message || '创建失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setIsCreating(false);
    }
  };

  // 获取状态图标
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'open':
        return <GitPullRequest size={20} className="status-icon open" />;
      case 'merged':
        return <GitMerge size={20} className="status-icon merged" />;
      case 'closed':
        return <XCircle size={20} className="status-icon closed" />;
      default:
        return <GitPullRequest size={20} />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return '开放';
      case 'merged': return '已合并';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  return (
    <div className="pulls-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>拉取请求</h1>
          <span className="count-badge">{total}</span>
        </div>
        {currentUser && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            新建拉取请求
          </button>
        )}
      </div>

      {/* 状态标签栏 */}
      <div className="status-tabs">
        <button
          className={`status-tab ${status === 'open' ? 'active' : ''}`}
          onClick={() => { setStatus('open'); setPage(1); }}
        >
          <GitPullRequest size={16} />
          开放
        </button>
        <button
          className={`status-tab ${status === 'merged' ? 'active' : ''}`}
          onClick={() => { setStatus('merged'); setPage(1); }}
        >
          <GitMerge size={16} />
          已合并
        </button>
        <button
          className={`status-tab ${status === 'closed' ? 'active' : ''}`}
          onClick={() => { setStatus('closed'); setPage(1); }}
        >
          <XCircle size={16} />
          已关闭
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
          placeholder="搜索拉取请求..."
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
          <button className="btn btn-secondary" onClick={fetchPulls}>重试</button>
        </div>
      ) : filteredPulls.length === 0 ? (
        <div className="empty-state">
          {status === 'open' ? (
            <>
              <GitPullRequest size={48} />
              <h3>没有开放的拉取请求</h3>
              <p>创建一个新的拉取请求来合并分支</p>
              {currentUser && repoBranches.length > 1 && (
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  创建第一个拉取请求
                </button>
              )}
              {repoBranches.length <= 1 && (
                <p className="hint">创建多个分支后才能创建拉取请求</p>
              )}
            </>
          ) : (
            <>
              <GitMerge size={48} />
              <h3>没有已合并的拉取请求</h3>
              <p>已合并的拉取请求会显示在这里</p>
            </>
          )}
        </div>
      ) : (
        <div className="pulls-list">
          {filteredPulls.map(pr => (
            <Link
              key={pr.id}
              href={`/${username}/${repoName}/pulls/${pr.id}`}
              className="pr-item"
            >
              <div className="pr-status-icon">
                <StatusIcon status={pr.status} />
              </div>
              <div className="pr-content">
                <div className="pr-title-row">
                  <span className="pr-title">{pr.title}</span>
                  <span className={`status-badge ${pr.status}`}>
                    {getStatusText(pr.status)}
                  </span>
                </div>
                <div className="pr-branch-info">
                  <span className="branch-label">
                    <GitBranch size={14} />
                    {pr.sourceBranch}
                  </span>
                  <ArrowRight size={14} className="arrow" />
                  <span className="branch-label">
                    {pr.targetBranch}
                  </span>
                  {pr.sourceRepo && (
                    <span className="cross-repo">
                      ← 来自 {pr.sourceRepo.owner.username}/{pr.sourceRepo.name}
                    </span>
                  )}
                </div>
                <div className="pr-meta">
                  <span className="meta-item">
                    #{pr.id.slice(0, 8)} • 由 {pr.authorUsername} 提交
                  </span>
                  <span className="meta-item">
                    <Clock size={12} />
                    {formatTimeAgo(pr.createdAt)}
                  </span>
                  {pr.commentsCount > 0 && (
                    <span className="meta-item comments">
                      💬 {pr.commentsCount} 条评论
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
              <h2>新建拉取请求</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
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
                  placeholder="拉取请求标题"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="详细描述你的更改..."
                />
              </div>
              <div className="branch-select-row">
                <div className="form-group">
                  <label>源分支 *</label>
                  <select
                    className="form-select"
                    value={newSourceBranch}
                    onChange={e => setNewSourceBranch(e.target.value)}
                    required
                  >
                    {repoBranches
                      .filter(b => b.name !== newTargetBranch)
                      .map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                  </select>
                </div>
                <div className="branch-arrow">
                  <ArrowRight size={24} />
                </div>
                <div className="form-group">
                  <label>目标分支 *</label>
                  <select
                    className="form-select"
                    value={newTargetBranch}
                    onChange={e => setNewTargetBranch(e.target.value)}
                    required
                  >
                    {repoBranches
                      .filter(b => b.name !== newSourceBranch)
                      .map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating || !newTitle.trim() || !newSourceBranch}>
                  {isCreating ? '创建中...' : '创建拉取请求'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pulls-page {
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

        .status-tab .status-icon.merged {
          color: #8250df;
        }

        .status-tab .status-icon.closed {
          color: var(--color-danger-fg);
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

        .pulls-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }

        .pr-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
        }

        .pr-item:last-child {
          border-bottom: none;
        }

        .pr-item:hover {
          background: var(--hover-bg);
        }

        .pr-status-icon {
          flex-shrink: 0;
          padding-top: 2px;
        }

        .status-icon.open {
          color: var(--color-success-fg);
        }

        .status-icon.merged {
          color: #8250df;
        }

        .status-icon.closed {
          color: var(--color-danger-fg);
        }

        .pr-content {
          flex: 1;
          min-width: 0;
        }

        .pr-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .pr-title {
          font-size: 15px;
          font-weight: 500;
          color: var(--link-color);
        }

        .status-badge {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 100px;
        }

        .status-badge.open {
          background: var(--color-success-bg);
          color: var(--color-success-fg);
        }

        .status-badge.merged {
          background: #f6eefd;
          color: #8250df;
        }

        .status-badge.closed {
          background: var(--color-danger-bg);
          color: var(--color-danger-fg);
        }

        .pr-branch-info {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .branch-label {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--color-text-secondary);
          background: var(--code-bg);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .branch-arrow {
          color: var(--color-text-secondary);
        }

        .cross-repo {
          font-size: 12px;
          color: var(--color-text-secondary);
          margin-left: 8px;
        }

        .pr-meta {
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

        .hint {
          font-size: 12px;
          color: var(--color-text-secondary);
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
          max-width: 560px;
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
          font-size: 24px;
          cursor: pointer;
          color: var(--color-text-secondary);
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

        .form-input,
        .form-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          background: var(--input-bg);
          color: var(--color-text);
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .branch-select-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .branch-select-row .form-group {
          flex: 1;
          margin-bottom: 0;
        }

        .branch-arrow {
          padding-bottom: 8px;
          color: var(--color-text-secondary);
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
