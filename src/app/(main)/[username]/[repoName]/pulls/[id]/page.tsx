'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Button, Input, PageLayout, PageLayoutContent, Empty } from '@/components/design';
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
} from '@/components/design/icons';
import { formatTimeAgo } from '@/lib/utils';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/providers';
import ReportModal from '@/components/common/ReportModal';
import ActionMenu from '@/components/common/ActionMenu';
import toast from 'react-hot-toast';

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

export default function PRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;
  const prId = params.id as string;

  const [pr, setPR] = useState<PRDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { user: currentUser } = useAuth();

  const isOwner = useMemo(() =>
    !!(currentUser && pr && currentUser.username === pr.repository.owner.username),
    [currentUser, pr]
  );
  const isAuthor = useMemo(() =>
    !!(currentUser && pr && currentUser.id === pr.author.id),
    [currentUser, pr]
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

  // 拉取 PR 详情
  useEffect(() => {
    async function fetchPR() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`);
        const data = await res.json();
        if (data.code === 200) {
          setPR(data.data);
          setEditTitle(data.data.title);
          setEditContent(data.data.content);
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
  }, [username, repoName, prId]);

  // 合并/关闭/重新打开
  const handleAction = async (action: 'merge' | 'close' | 'reopen') => {
    if (!pr) return;
    try {
      const data = await api.patch<{ status: string }>(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`, { action });
      if (data.code === 200) {
        setPR(prev => prev ? { ...prev, status: data.data.status } : null);
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
      const data = await api.patch(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`, { title: editTitle, content: editContent });
      if (data.code === 200) {
        setPR(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
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
      const data = await api.post<Comment>(`/api/v1/repos/${username}/${repoName}/pulls/${prId}`, { content: newComment });
      if (data.code === 201) {
        setPR(prev => prev ? { ...prev, comments: [...prev.comments, data.data], commentsCount: prev.commentsCount + 1 } : null);
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
      const data = await api.delete(`/api/v1/repos/${username}/${repoName}/pulls/${prId}?commentId=${commentId}`);
      if (data.code === 200) {
        setPR(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.id !== commentId), commentsCount: Math.max(0, prev.commentsCount - 1) } : null);
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch {
      toast.error('网络错误');
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
      <PageLayout containerWidth="medium"><PageLayoutContent>
        <div style={{ height: 32, background: 'var(--ds-surface-subtle)', borderRadius: 6, marginBottom: 24 }} />
        <div style={{ height: 200, background: 'var(--ds-surface-subtle)', borderRadius: 6 }} />
      </PageLayoutContent></PageLayout>
    );
  }

  if (error || !pr) {
    return (
      <PageLayout containerWidth="medium"><PageLayoutContent>
        <Empty
          icon={<AlertCircle size={40} />}
          title={error || '拉取请求不存在'}
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
        <span>返回拉取请求列表</span>
      </Button>

      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${pr.status === 'open' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' : pr.status === 'merged' ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]' : 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]'}`}>
            <StatusIcon status={pr.status} />
            {getStatusText(pr.status)}
          </span>
        </div>

        {isAuthor && !isEditing && (
          <Button variant="secondary" onClick={() => setIsEditing(true)}>
            <Edit3 size={14} />
            编辑
          </Button>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 ml-auto">
          {pr.status === 'open' && isOwner && (
            <Button variant="primary" onClick={() => handleAction('merge')}>
              <GitMerge size={14} />
              合并
            </Button>
          )}
          {(isAuthor || isOwner) && pr.status === 'open' && (
            <Button variant="secondary" onClick={() => handleAction('close')}>
              <XCircle size={14} />
              关闭
            </Button>
          )}
          {(isAuthor || isOwner) && pr.status === 'closed' && (
            <Button variant="secondary" onClick={() => handleAction('reopen')}>
              <CheckCircle size={14} />
              重新打开
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="flex items-center gap-2">
        {isEditing ? (
          <Input
            className="text-2xl font-semibold"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="拉取请求标题"
          />
        ) : (
          <h1 className="text-2xl font-semibold m-0 leading-relaxed">{pr.title}</h1>
        )}
        {currentUser && !isAuthor && pr && (
          <Button
            variant="secondary"
            className="flex-shrink-0"
            onClick={() => setShowReportModal(true)}
            title="举报此合并请求"
          >
            举报
          </Button>
        )}
      </div>
    </div>

    {/* 分支信息 */}
    <div className="flex items-center gap-3 p-3 bg-[var(--ds-surface-subtle)] rounded-[var(--ds-radius-sm)] mb-6 text-sm">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-sm bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]">
        <GitBranch size={14} />
        {pr.sourceBranch}
        {pr.sourceRepo && (
          <span className="text-xs opacity-80">({pr.sourceRepo.owner.username}/{pr.sourceRepo.name})</span>
        )}
      </span>
      <ArrowRight size={16} className="text-[var(--ds-text-secondary)]" />
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-sm bg-[var(--ds-surface-subtle)] text-[var(--ds-text-primary)]">
        <GitBranch size={14} />
        {pr.targetBranch}
      </span>
    </div>

    {/* Main Layout */}
    <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-8">
      {/* Post */}
      <article className="bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
          <Link href={`/${pr.author.username}`} className="flex items-center gap-2 no-underline text-[var(--ds-text-primary)] font-medium">
            <img
              src={pr.author.avatarUrl || '/default-avatar.png'}
              alt={pr.author.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span>{pr.author.username}</span>
          </Link>
          <span className="flex items-center gap-1 text-[13px] text-[var(--ds-text-secondary)]">
            <Clock size={14} />
            {formatTimeAgo(pr.createdAt)}
          </span>
        </div>

        {isEditing ? (
          <div className="p-5">
            <Input
              multiline
              rows={10}
              className="min-h-[200px]"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="描述你的更改..."
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitle(pr.title);
                  setEditContent(pr.content);
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
            {pr.content ? (
              renderContent(pr.content)
            ) : (
              <p className="text-[var(--ds-text-secondary)] italic">暂无描述</p>
            )}
          </div>
        )}
      </article>

      {/* Sidebar */}
      <aside className="flex flex-col gap-5">
        <div className="bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] p-4">
          <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] m-0 mb-3">关于此拉取请求</h3>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--ds-text-secondary)]">状态</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${pr.status === 'open' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' : pr.status === 'merged' ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]' : 'bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)]'}`}>
                <StatusIcon status={pr.status} />
                {getStatusText(pr.status)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--ds-text-secondary)]">评论</span>
              <span className="font-medium">{pr.commentsCount}</span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--ds-text-secondary)]">创建时间</span>
              <span className="font-medium">
                {new Date(pr.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--ds-text-secondary)]">源分支</span>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium">
                <GitBranch size={12} />
                {pr.sourceBranch}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--ds-text-secondary)]">目标分支</span>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium">
                <GitBranch size={12} />
                {pr.targetBranch}
              </span>
            </div>
            {pr.sourceRepo && (
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--ds-text-secondary)]">源仓库</span>
                <Link
                  href={`/${pr.sourceRepo.owner.username}/${pr.sourceRepo.name}`}
                  className="text-[var(--ds-accent-default)] no-underline hover:underline"
                >
                  {pr.sourceRepo.owner.username}/{pr.sourceRepo.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] p-4">
          <Link href={`/${pr.author.username}`} className="flex items-center gap-2.5 no-underline text-[var(--ds-text-primary)] mb-2">
            <img
              src={pr.author.avatarUrl || '/default-avatar.png'}
              alt={pr.author.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="font-medium">{pr.author.username}</span>
          </Link>
          {pr.author.bio && (
            <p className="text-[13px] text-[var(--ds-text-secondary)] m-0 leading-relaxed">{pr.author.bio}</p>
          )}
        </div>
      </aside>
    </div>

    {/* Comment Section */}
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-[var(--ds-border-default)]">
        <Send size={18} />
        <h2 className="text-base font-semibold m-0">{pr.comments.length} 条评论</h2>
      </div>

      {commentError && (
        <div className="flex items-center gap-2 p-3 bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] rounded-[var(--ds-radius-sm)] mb-4 text-sm">
          <AlertCircle size={16} />
          {commentError}
        </div>
      )}

      {pr.comments.length === 0 && (
        <Empty
          icon={<Send size={32} />}
          title="暂无评论"
          description="发表第一条评论吧"
        />
      )}

      {pr.comments.map(comment => (
        <div key={comment.id} className="py-5 border-b border-[var(--ds-border-default)]">
          <div className="comment-main">
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
            rows={4}
            placeholder="写下你的评论..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
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
        <div className="p-5 text-center bg-[var(--ds-surface-subtle)] rounded-[var(--ds-radius-sm)] mt-5">
          <p className="m-0 text-[var(--ds-text-secondary)]">
            <Link href="/login" className="text-[var(--ds-accent-default)]">登录</Link> 后参与评论
          </p>
        </div>
      )}
    </div>

    {showReportModal && pr && (
      <ReportModal
        targetType="pullrequest"
        targetId={pr.id}
        targetTitle={pr.title}
        onClose={() => setShowReportModal(false)}
      />
    )}
    </PageLayoutContent></PageLayout>
  );
}
