'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button, Input, PageLayout, PageLayoutContent, Empty } from '@/components/design';
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
} from '@/components/design/icons';
import { formatTimeAgo } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/providers';
import ReportModal from '@/components/common/ReportModal';
import ActionMenu from '@/components/common/ActionMenu';
import toast from 'react-hot-toast';

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
          style={{ color: 'var(--ds-accent-default)' }}
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

  const { user: currentUser } = useAuth();

  const isOwner = useMemo(() =>
    !!(currentUser && issue && currentUser.username === issue.repository.owner.username),
    [currentUser, issue]
  );
  const isAuthor = useMemo(() =>
    !!(currentUser && issue && currentUser.id === issue.author.id),
    [currentUser, issue]
  );

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 评论状态
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // 拉取 issue 详情
  useEffect(() => {
    async function fetchIssue() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`);
        const data = await res.json();
        if (data.code === 200) {
          setIssue(data.data);
          setEditTitle(data.data.title);
          setEditContent(data.data.content);
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
  }, [username, repoName, issueId]);

  // 关闭/重新打开问题
  const handleStatusChange = async (action: 'close' | 'reopen') => {
    if (!issue) return;
    try {
      const data = await api.patch<{ status: string }>(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`, { action });
      if (data.code === 200) {
        setIssue(prev => prev ? { ...prev, status: data.data.status } : null);
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    try {
      const data = await api.patch(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`, { title: editTitle, content: editContent });
      if (data.code === 200) {
        setIssue(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
        setIsEditing(false);
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch {
      toast.error('网络错误');
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
      const data = await api.post<Comment>(`/api/v1/repos/${username}/${repoName}/issues/${issueId}`, { content: newComment });
      if (data.code === 201) {
        setIssue(prev => prev ? { ...prev, comments: [...prev.comments, data.data], commentsCount: prev.commentsCount + 1 } : null);
        setNewComment('');
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
    try {
      const data = await api.delete(`/api/v1/repos/${username}/${repoName}/issues/${issueId}?commentId=${commentId}`);
      if (data.code === 200) {
        setIssue(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.id !== commentId), commentsCount: Math.max(0, prev.commentsCount - 1) } : null);
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch {
      toast.error('网络错误');
    }
  };

  if (isLoading) {
    return (
      <PageLayout containerWidth="medium"><PageLayoutContent>
        <div style={{ height: 32, background: 'var(--ds-surface-subtle)', borderRadius: 6, marginBottom: 24 }} />
        <div style={{ height: 200, background: 'var(--ds-surface-subtle)', borderRadius: 6 }} />
      </PageLayoutContent></PageLayout>
    );
  }

  if (error || !issue) {
    return (
      <PageLayout containerWidth="medium"><PageLayoutContent>
        <Empty
          icon={<AlertCircle size={48} style={{ color: 'var(--ds-danger-default)' }} />}
          title={error || '问题不存在'}
          action={{ label: '返回', onClick: () => router.back() }}
        />
      </PageLayoutContent></PageLayout>
    );
  }

  return (
    <PageLayout containerWidth="medium"><PageLayoutContent>
      <Header />
      {/* Header */}
      <div className="mb-5">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft size={16} />
          <span>返回问题列表</span>
        </Button>

        <div className="flex items-center gap-3 flex-wrap mb-3">
          <div className="shrink-0">
            {issue.status === 'open' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]">
                <CircleIcon />
                开放
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]">
                <CheckCircle size={16} />
                已关闭
              </span>
            )}
          </div>

          {isAuthor && !isEditing && (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              <Edit3 size={14} />
              编辑
            </Button>
          )}

          {(isAuthor || isOwner) && (
            <Button
              variant={issue.status === 'open' ? 'secondary' : 'primary'}
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
            </Button>
          )}
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="问题标题"
          />
        ) : (
          <h1 className="text-2xl font-semibold m-0 leading-relaxed">{issue.title}</h1>
        )}
        {currentUser && !isAuthor && issue && (
          <Button
            variant="secondary"
            className="flex-shrink-0"
            onClick={() => setShowReportModal(true)}
            title="举报此 Issue"
          >
            举报
          </Button>
        )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-[1fr_280px] gap-8 max-md:grid-cols-1 max-md:gap-6">
        {/* Post */}
        <article className="bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
            <Link href={`/${issue.author.username}`} className="flex items-center gap-2 no-underline text-[var(--ds-text-primary)] font-medium">
              <img
                src={issue.author.avatarUrl || '/default-avatar.png'}
                alt={issue.author.username}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span>{issue.author.username}</span>
            </Link>
            <span className="flex items-center gap-1 text-[13px] text-[var(--ds-text-secondary)]">
              <Clock size={14} />
              {formatTimeAgo(issue.createdAt)}
            </span>
            {issue.labels && issue.labels.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {issue.labels.map(label => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border font-medium"
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
            <div className="p-5">
              <Input
                multiline
                rows={10}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="问题描述..."
              />
              <div className="flex justify-end gap-2 mt-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setEditTitle(issue.title);
                    setEditContent(issue.content);
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editTitle.trim()}
                >
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-5 text-[15px] leading-relaxed">
              {issue.content ? (
                renderContent(issue.content)
              ) : (
                <p style={{ color: 'var(--ds-text-secondary)', fontStyle: 'italic' }}>暂无描述</p>
              )}
            </div>
          )}
        </article>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5 max-md:order-first">
          <div className="bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] p-4">
            <h3 className="text-sm font-semibold m-0 mb-3 text-[var(--ds-text-primary)]">关于此问题</h3>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--ds-text-secondary)]">状态</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${issue.status === 'open' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' : 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]'}`}>
                  {issue.status === 'open' ? '开放' : '已关闭'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--ds-text-secondary)]">评论</span>
                <span className="font-medium">{issue.commentsCount}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--ds-text-secondary)]">创建时间</span>
                <span className="font-medium">
                  {new Date(issue.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
              {issue.labels && issue.labels.length > 0 && (
                <div className="flex justify-between items-start text-[13px]">
                  <span className="text-[var(--ds-text-secondary)]">标签</span>
                  <div className="flex gap-1 flex-wrap">
                    {issue.labels.map(label => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border font-medium"
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

          <div className="bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] p-4">
            <Link href={`/${issue.author.username}`} className="flex items-center gap-2.5 no-underline text-[var(--ds-text-primary)] mb-2">
              <img
                src={issue.author.avatarUrl || '/default-avatar.png'}
                alt={issue.author.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="font-medium">{issue.author.username}</span>
            </Link>
            {issue.author.bio && (
              <p className="text-[13px] text-[var(--ds-text-secondary)] m-0 leading-relaxed">{issue.author.bio}</p>
            )}
          </div>
        </aside>
      </div>

      {/* Comment Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[var(--ds-border-default)]">
          <Send size={18} />
          <h2 className="text-base font-semibold m-0">{issue.comments.length} 条评论</h2>
        </div>

        {commentError && (
          <div className="flex items-center gap-2 p-3 bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] rounded-[var(--ds-radius-md)] mb-4 text-sm">
            <AlertCircle size={16} />
            {commentError}
          </div>
        )}

        {issue.comments.length === 0 && (
          <Empty
            icon={<Send size={32} className="opacity-30" />}
            title="暂无评论"
            description="发表第一条评论吧"
          />
        )}

        {issue.comments.map(comment => (
          <div key={comment.id} className="py-5 border-b border-[var(--ds-border-default)]">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Link href={`/${comment.author.username}`} className="flex items-center gap-2 no-underline text-[var(--ds-text-primary)]">
                  <img
                    src={comment.author.avatarUrl || '/default-avatar.png'}
                    alt={comment.author.username}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">{comment.author.username}</span>
                </Link>
                <span className="text-xs text-[var(--ds-text-secondary)]">{formatTimeAgo(comment.createdAt)}</span>
                {(comment.author.id === currentUser?.id || isOwner) && (
                  <Button
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => handleDeleteComment(comment.id)}
                    title="删除评论"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
                {currentUser && comment.author.id !== currentUser?.id && (
                  <ActionMenu
                    type="comment"
                    targetId={comment.id}
                    targetTitle={comment.content.slice(0, 50)}
                  />
                )}
              </div>
              <div className="text-sm leading-relaxed text-[var(--ds-text-primary)]">{renderContent(comment.content)}</div>
            </div>
          </div>
        ))}

        {/* New comment form */}
        {currentUser ? (
          <form onSubmit={handleSubmitComment} className="mt-5">
            <Input
              multiline
              placeholder="写下你的评论..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={4}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-[var(--ds-text-secondary)]">支持 Markdown 格式</span>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !newComment.trim()}
              >
                <Send size={14} />
                {isSubmitting ? '发送中...' : '发表评论'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-5 text-center bg-[var(--ds-surface-subtle)] rounded-[var(--ds-radius-md)] mt-5">
            <p className="m-0 text-[var(--ds-text-secondary)]">
              <Link href="/login" className="text-[var(--ds-accent-default)]">登录</Link> 后参与评论
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
    </PageLayoutContent></PageLayout>
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
