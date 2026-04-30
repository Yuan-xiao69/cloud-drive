'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Send,
  Edit3,
  GitMerge,
  XCircle,
  GitPullRequest,
  GitBranch,
  ArrowRight,
  Trash2,
  AlertCircle,
  CheckCircle,
} from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { tokenManager } from '@/lib/api/client';
import ReportModal from '@/components/common/ReportModal';
import ActionMenu from '@/components/common/ActionMenu';

interface Comment {
  id: string;
  content: string;
  author: { id: string; username: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

interface PRDetail {
  id: string;
  title: string;
  content: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  commentsCount: number;
  author: { id: string; username: string; avatarUrl: string | null; bio?: string };
  repository: { id: string; name: string; owner: { username: string } };
  sourceRepo?: { id: string; name: string; owner: { username: string } };
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
}

/** 渲染 Markdown 行（图片/链接） */
function renderLine(line: string, lineKey: number): React.ReactNode {
  const MD_RE = /(!?\[([^\]]*)\]\(([^)]+)\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MD_RE.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
    const isImage = match[1].startsWith('!');
    const url = match[3];
    const text = match[2];

    if (isImage) {
      parts.push(
        <img
          key={`i-${lineKey}-${match.index}`}
          src={url}
          alt={text}
          style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', display: 'block', margin: '8px 0' }}
        />
      );
    } else {
      parts.push(
        <a
          key={`a-${lineKey}-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0969da' }}
        >
          {text}
        </a>
      );
    }
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts.length > 0 ? parts : line;
}

function renderContent(content: string): React.ReactNode[] {
  return content.split('\n').map((line, i) =>
    line ? (
      <p key={i} style={{ marginBottom: '8px', marginTop: 0 }}>{renderLine(line, i)}</p>
    ) : <br key={i} />
  );
}

export default function PRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;
  const prId = params.id as string;

  const [pr, setPR] = useState<PRDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 评论状态
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // 获取当前用户信息
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

  // 拉取 PR 详情
  useEffect(() => {
    async function fetchPR() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`);
        const data = await res.json();
        if (data.code === 200) {
          setPR(data.data);
          setComments(data.data.comments || []);
          setEditTitle(data.data.title);
          setEditContent(data.data.content);
          const u = currentUser;
          if (u) {
            setIsOwner(data.data.repository.owner.username === username);
            setIsAuthor(data.data.author.id === u.id);
          }
        } else {
          setError(data.message || '无法加载拉取请求');
        }
      } catch {
        setError('网络错误，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    }
    fetchPR();
  }, [username, repoName, prId, currentUser]);

  // 合并/关闭/重新打开
  const handleAction = async (action: 'merge' | 'close' | 'reopen') => {
    if (!pr) return;
    const confirmMsg = {
      merge: '确定要合并此拉取请求吗？',
      close: '确定要关闭此拉取请求吗？',
      reopen: '确定要重新打开此拉取请求吗？',
    };
    if (!confirm(confirmMsg[action])) return;

    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setPR(prev => prev ? { ...prev, status: data.data.status } : null);
      } else {
        alert(data.message || '操作失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setPR(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
        setIsEditing(false);
      } else {
        alert(data.message || '保存失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  // 提交评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    setIsSubmitting(true);
    setCommentError('');
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setComments(prev => [...prev, data.data]);
        setNewComment('');
        setPR(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
      } else {
        setCommentError(data.message || '发送失败');
      }
    } catch {
      setCommentError('网络错误，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定删除此评论？')) return;
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(
        `/api/v1/repos/${username}/${repoName}/pulls/${prId}?commentId=${commentId}`,
        {
          method: 'DELETE',
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        }
      );
      const data = await res.json();
      if (data.code === 200) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setPR(prev => prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : null);
      } else {
        alert(data.message || '删除失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  // 获取状态图标
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'open':
        return <GitPullRequest size={16} />;
      case 'merged':
        return <GitMerge size={16} />;
      case 'closed':
        return <XCircle size={16} />;
      default:
        return <GitPullRequest size={16} />;
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

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ height: 32, background: 'var(--skeleton-bg)', borderRadius: 6, marginBottom: 24 }} />
        <div style={{ height: 200, background: 'var(--skeleton-bg)', borderRadius: 6 }} />
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--color-danger-fg)', marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>{error || '拉取请求不存在'}</h2>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="pr-detail-container">
      {/* Header */}
      <div className="pr-detail-header">
        <button className="back-link" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          <span>返回拉取请求列表</span>
        </button>

        <div className="pr-detail-title-row">
          <div className="pr-status-icon">
            <span className={`status-badge ${pr.status}`}>
              <StatusIcon status={pr.status} />
              {getStatusText(pr.status)}
            </span>
          </div>

          {isAuthor && !isEditing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
              <Edit3 size={14} />
              编辑
            </button>
          )}

          {/* 操作按钮 */}
          <div className="pr-actions">
            {pr.status === 'open' && isOwner && (
              <button className="btn btn-primary btn-sm" onClick={() => handleAction('merge')}>
                <GitMerge size={14} />
                合并
              </button>
            )}
            {(isAuthor || isOwner) && pr.status === 'open' && (
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('close')}>
                <XCircle size={14} />
                关闭
              </button>
            )}
            {(isAuthor || isOwner) && pr.status === 'closed' && (
              <button className="btn btn-secondary btn-sm" onClick={() => handleAction('reopen')}>
                <CheckCircle size={14} />
                重新打开
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        {isEditing ? (
          <input
            className="pr-edit-title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="拉取请求标题"
            autoFocus
          />
        ) : (
          <h1 className="pr-detail-title">{pr.title}</h1>
        )}
        {currentUser && !isOwner && pr && (
          <button
            className="btn btn-default btn-sm"
            onClick={() => setShowReportModal(true)}
            title="举报此 Pull Request"
            style={{ marginLeft: 8, flexShrink: 0 }}
          >
            举报
          </button>
        )}
      </div>

      {/* 分支信息 */}
      <div className="pr-branch-info">
        <span className="branch-label source">
          <GitBranch size={14} />
          {pr.sourceBranch}
          {pr.sourceRepo && (
            <span className="cross-repo">({pr.sourceRepo.owner.username}/{pr.sourceRepo.name})</span>
          )}
        </span>
        <ArrowRight size={16} />
        <span className="branch-label target">
          <GitBranch size={14} />
          {pr.targetBranch}
        </span>
      </div>

      {/* Main Layout */}
      <div className="pr-detail-layout">
        {/* Post */}
        <article className="pr-post">
          <div className="pr-post-header">
            <Link href={`/${pr.author.username}`} className="post-author">
              <img
                src={pr.author.avatarUrl || '/default-avatar.png'}
                alt={pr.author.username}
                className="author-avatar"
              />
              <span>{pr.author.username}</span>
            </Link>
            <span className="meta-item">
              <Clock size={14} />
              {formatTimeAgo(pr.createdAt)}
            </span>
          </div>

          {isEditing ? (
            <div className="pr-edit-body">
              <textarea
                className="form-input"
                rows={10}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="描述你的更改..."
              />
              <div className="edit-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(pr.title);
                    setEditContent(pr.content);
                  }}
                >
                  取消
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editTitle.trim()}
                >
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="pr-post-content">
              {pr.content ? (
                renderContent(pr.content)
              ) : (
                <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>暂无描述</p>
              )}
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="pr-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">关于此拉取请求</h3>
            <div className="sidebar-info-list">
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">状态</span>
                <span className={`status-badge ${pr.status}`}>
                  <StatusIcon status={pr.status} />
                  {getStatusText(pr.status)}
                </span>
              </div>
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">评论</span>
                <span className="sidebar-info-value">{pr.commentsCount}</span>
              </div>
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">创建时间</span>
                <span className="sidebar-info-value">
                  {new Date(pr.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">源分支</span>
                <span className="sidebar-info-value branch">
                  <GitBranch size={12} />
                  {pr.sourceBranch}
                </span>
              </div>
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">目标分支</span>
                <span className="sidebar-info-value branch">
                  <GitBranch size={12} />
                  {pr.targetBranch}
                </span>
              </div>
              {pr.sourceRepo && (
                <div className="sidebar-info-item">
                  <span className="sidebar-info-label">源仓库</span>
                  <Link
                    href={`/${pr.sourceRepo.owner.username}/${pr.sourceRepo.name}`}
                    className="sidebar-info-link"
                  >
                    {pr.sourceRepo.owner.username}/{pr.sourceRepo.name}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-card">
            <Link href={`/${pr.author.username}`} className="sidebar-author">
              <img
                src={pr.author.avatarUrl || '/default-avatar.png'}
                alt={pr.author.username}
                className="author-avatar-lg"
              />
              <span className="sidebar-author-name">{pr.author.username}</span>
            </Link>
            {pr.author.bio && (
              <p className="sidebar-author-bio">{pr.author.bio}</p>
            )}
          </div>
        </aside>
      </div>

      {/* Comment Section */}
      <div className="pr-comments">
        <div className="comment-section-header">
          <Send size={18} />
          <h2>{comments.length} 条评论</h2>
        </div>

        {commentError && (
          <div className="comment-error">
            <AlertCircle size={16} />
            {commentError}
          </div>
        )}

        {comments.length === 0 && (
          <div className="comment-empty">
            <Send size={32} className="comment-empty-icon" />
            <p>暂无评论，发表第一条评论吧</p>
          </div>
        )}

        {comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-main">
              <div className="comment-header">
                <Link href={`/${comment.author.username}`} className="comment-author">
                  <img
                    src={comment.author.avatarUrl || '/default-avatar.png'}
                    alt={comment.author.username}
                    className="comment-avatar"
                  />
                  <span className="comment-author-name">{comment.author.username}</span>
                </Link>
                <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                {(comment.author.id === currentUser?.id || isOwner) && (
                  <button
                    className="comment-delete-btn"
                    onClick={() => handleDeleteComment(comment.id)}
                    title="删除评论"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                {currentUser && comment.author.id !== currentUser?.id && (
                  <ActionMenu
                    type="comment"
                    targetId={comment.id}
                    targetTitle={comment.content.slice(0, 50)}
                  />
                )}
              </div>
              <div className="comment-content">{renderContent(comment.content)}</div>
            </div>
          </div>
        ))}

        {/* New comment form */}
        {currentUser ? (
          <form onSubmit={handleSubmitComment} className="new-comment-form">
            <textarea
              className="comment-textarea"
              placeholder="写下你的评论..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={4}
            />
            <div className="new-comment-footer">
              <span className="comment-hint">支持 Markdown 格式</span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !newComment.trim()}
              >
                <Send size={14} />
                {isSubmitting ? '发送中...' : '发表评论'}
              </button>
            </div>
          </form>
        ) : (
          <div className="comment-login-prompt">
            <p>
              <Link href="/login" className="link">登录</Link> 后参与评论
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .pr-detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .pr-detail-header {
          margin-bottom: 20px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-secondary);
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-bottom: 16px;
        }

        .back-link:hover {
          color: var(--color-text);
        }

        .pr-detail-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          font-size: 14px;
          font-weight: 500;
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

        .pr-actions {
          display: flex;
          gap: 8px;
        }

        .pr-edit-title {
          width: 100%;
          font-size: 24px;
          font-weight: 600;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--input-bg);
          color: var(--color-text);
        }

        .pr-detail-title {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
          line-height: 1.3;
        }

        .pr-branch-info {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--code-bg);
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .branch-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 4px;
          font-family: var(--font-mono);
        }

        .branch-label.source {
          background: #dafbe1;
          color: #1a7f37;
        }

        .branch-label.target {
          background: var(--hover-bg);
          color: var(--color-text);
        }

        .cross-repo {
          font-size: 12px;
          opacity: 0.8;
        }

        .pr-detail-layout {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 32px;
        }

        .pr-post {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }

        .pr-post-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .post-author {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--color-text);
          font-weight: 500;
        }

        .author-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--color-text-secondary);
        }

        .pr-post-content {
          padding: 20px;
          font-size: 15px;
          line-height: 1.6;
        }

        .pr-edit-body {
          padding: 20px;
        }

        .pr-edit-body textarea {
          width: 100%;
          min-height: 200px;
        }

        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }

        .pr-sidebar {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }

        .sidebar-card-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px;
          color: var(--color-text);
        }

        .sidebar-info-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sidebar-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .sidebar-info-label {
          color: var(--color-text-secondary);
        }

        .sidebar-info-value {
          font-weight: 500;
        }

        .sidebar-info-value.branch {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 12px;
        }

        .sidebar-info-link {
          color: var(--link-color);
          text-decoration: none;
        }

        .sidebar-info-link:hover {
          text-decoration: underline;
        }

        .sidebar-author {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--color-text);
          margin-bottom: 8px;
        }

        .author-avatar-lg {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .sidebar-author-name {
          font-weight: 500;
        }

        .sidebar-author-bio {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .pr-comments {
          margin-top: 32px;
        }

        .comment-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .comment-section-header h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .comment-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: var(--color-danger-bg);
          color: var(--color-danger-fg);
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .comment-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .comment-empty-icon {
          opacity: 0.3;
          margin-bottom: 12px;
        }

        .comment-item {
          padding: 20px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .comment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .comment-author {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          color: var(--color-text);
        }

        .comment-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }

        .comment-author-name {
          font-weight: 500;
          font-size: 14px;
        }

        .comment-time {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .comment-delete-btn {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 4px;
          border-radius: 4px;
        }

        .comment-delete-btn:hover {
          color: var(--color-danger-fg);
          background: var(--color-danger-bg);
        }

        .comment-content {
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-text);
        }

        .new-comment-form {
          margin-top: 20px;
        }

        .comment-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          background: var(--input-bg);
          color: var(--color-text);
          resize: vertical;
        }

        .comment-textarea:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .new-comment-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .comment-hint {
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        .comment-login-prompt {
          padding: 20px;
          text-align: center;
          background: var(--bg-secondary);
          border-radius: 6px;
          margin-top: 20px;
        }

        .comment-login-prompt p {
          margin: 0;
          color: var(--color-text-secondary);
        }

        @media (max-width: 768px) {
          .pr-detail-layout {
            grid-template-columns: 1fr;
          }

          .pr-sidebar {
            order: -1;
          }
        }
      `}</style>
      {showReportModal && pr && (
        <ReportModal
          targetType="pullrequest"
          targetId={pr.id}
          targetTitle={pr.title}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
