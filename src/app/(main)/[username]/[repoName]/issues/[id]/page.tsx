'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Tag,
  Send,
  Edit3,
  XCircle,
  CheckCircle,
  AlertCircle,
  Trash2,
} from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { tokenManager } from '@/lib/api/client';
import ReportModal from '@/components/common/ReportModal';
import ActionMenu from '@/components/common/ActionMenu';

interface IssueLabel {
  id: string;
  name: string;
  color: string;
}

interface Comment {
  id: string;
  content: string;
  author: { id: string; username: string; avatarUrl: string | null };
  createdAt: string;
  updatedAt: string;
}

interface IssueDetail {
  id: string;
  title: string;
  content: string;
  status: string;
  labels: IssueLabel[];
  commentsCount: number;
  author: { id: string; username: string; avatarUrl: string | null; bio?: string };
  repository: { id: string; name: string; owner: { username: string } };
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

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;
  const issueId = params.id as string;

  const [issue, setIssue] = useState<IssueDetail | null>(null);
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

  // 拉取当前用户信息
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

  // 拉取 issue 详情
  useEffect(() => {
    async function fetchIssue() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`);
        const data = await res.json();
        if (data.code === 200) {
          setIssue(data.data);
          setComments(data.data.comments || []);
          setEditTitle(data.data.title);
          setEditContent(data.data.content);
          const u = currentUser;
          if (u) {
            setIsOwner(data.data.repository.owner.username === username);
            setIsAuthor(data.data.author.id === u.id);
          }
        } else {
          setError(data.message || '无法加载问题');
        }
      } catch {
        setError('网络错误，请刷新重试');
      } finally {
        setIsLoading(false);
      }
    }
    fetchIssue();
  }, [username, repoName, issueId, currentUser]);

  // 关闭/重新打开问题
  const handleStatusChange = async (action: 'close' | 'reopen') => {
    if (!issue) return;
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setIssue(prev => prev ? { ...prev, status: data.data.status } : null);
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
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setIssue(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
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
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`, {
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
        setIssue(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
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
        `/api/v1/repos/${username}/${repoName}/issues/${issueId}?commentId=${commentId}`,
        {
          method: 'DELETE',
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        }
      );
      const data = await res.json();
      if (data.code === 200) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setIssue(prev => prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : null);
      } else {
        alert(data.message || '删除失败');
      }
    } catch {
      alert('网络错误');
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

  if (error || !issue) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--color-danger-fg)', marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>{error || '问题不存在'}</h2>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="issue-detail-container">
      {/* Header */}
      <div className="issue-detail-header">
        <button className="back-link" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          <span>返回问题列表</span>
        </button>

        <div className="issue-detail-title-row">
          <div className="issue-status-icon">
            {issue.status === 'open' ? (
              <span className="status-badge open">
                <CircleIcon />
                开放
              </span>
            ) : (
              <span className="status-badge closed">
                <CheckCircle size={16} />
                已关闭
              </span>
            )}
          </div>

          {isAuthor && !isEditing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
              <Edit3 size={14} />
              编辑
            </button>
          )}

          {(isAuthor || isOwner) && (
            <button
              className={`btn btn-sm ${issue.status === 'open' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => handleStatusChange(issue.status === 'open' ? 'close' : 'reopen')}
            >
              {issue.status === 'open' ? (
                <>
                  <XCircle size={14} />
                  关闭问题
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  重新打开
                </>
              )}
            </button>
          )}
        </div>

        {/* Title */}
        {isEditing ? (
          <input
            className="issue-edit-title"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="问题标题"
            autoFocus
          />
        ) : (
          <h1 className="issue-detail-title">{issue.title}</h1>
        )}
        {currentUser && !isAuthor && issue && (
          <button
            className="btn btn-default btn-sm"
            onClick={() => setShowReportModal(true)}
            title="举报此 Issue"
            style={{ marginLeft: 8, flexShrink: 0 }}
          >
            举报
          </button>
        )}
      </div>

      {/* Main Layout */}
      <div className="issue-detail-layout">
        {/* Post */}
        <article className="issue-post">
          <div className="issue-post-header">
            <Link href={`/${issue.author.username}`} className="post-author">
              <img
                src={issue.author.avatarUrl || '/default-avatar.png'}
                alt={issue.author.username}
                className="author-avatar"
              />
              <span>{issue.author.username}</span>
            </Link>
            <span className="meta-item">
              <Clock size={14} />
              {formatTimeAgo(issue.createdAt)}
            </span>
            {issue.labels && issue.labels.length > 0 && (
              <div className="issue-labels">
                {issue.labels.map(label => (
                  <span
                    key={label.id}
                    className="label-badge"
                    style={{ backgroundColor: label.color + '22', color: label.color, borderColor: label.color }}
                  >
                    <Tag size={12} />
                    {label.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="issue-edit-body">
              <textarea
                className="form-input"
                rows={10}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="问题描述..."
              />
              <div className="edit-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(issue.title);
                    setEditContent(issue.content);
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
            <div className="issue-post-content">
              {issue.content ? (
                renderContent(issue.content)
              ) : (
                <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>暂无描述</p>
              )}
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="issue-sidebar">
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">关于此问题</h3>
            <div className="sidebar-info-list">
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">状态</span>
                <span className={`status-badge ${issue.status}`}>
                  {issue.status === 'open' ? '开放' : '已关闭'}
                </span>
              </div>
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">评论</span>
                <span className="sidebar-info-value">{issue.commentsCount}</span>
              </div>
              <div className="sidebar-info-item">
                <span className="sidebar-info-label">创建时间</span>
                <span className="sidebar-info-value">
                  {new Date(issue.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {issue.labels && issue.labels.length > 0 && (
                <div className="sidebar-info-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <span className="sidebar-info-label">标签</span>
                  <div className="issue-labels" style={{ flexWrap: 'wrap' }}>
                    {issue.labels.map(label => (
                      <span
                        key={label.id}
                        className="label-badge"
                        style={{
                          backgroundColor: label.color + '22',
                          color: label.color,
                          borderColor: label.color,
                          fontSize: 12,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-card">
            <Link href={`/${issue.author.username}`} className="sidebar-author">
              <img
                src={issue.author.avatarUrl || '/default-avatar.png'}
                alt={issue.author.username}
                className="author-avatar-lg"
              />
              <span className="sidebar-author-name">{issue.author.username}</span>
            </Link>
            {issue.author.bio && (
              <p className="sidebar-author-bio">{issue.author.bio}</p>
            )}
          </div>
        </aside>
      </div>

      {/* Comment Section */}
      <div className="issue-comments">
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
      {showReportModal && issue && (
        <ReportModal
          targetType="issue"
          targetId={issue.id}
          targetTitle={issue.title}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

// 小圆圈图标（用于 open 状态）
function CircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
