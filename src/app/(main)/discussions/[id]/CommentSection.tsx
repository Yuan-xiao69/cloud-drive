'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  CornerDownRight,
  CheckCircle,
  AlertCircle,
} from '@/components/design/icons';
import { formatTimeAgo } from '@/lib/utils';
import ReportModal from '@/components/common/ReportModal';
import { api } from '@/lib/api/client';
import { Button, Input } from '@/components/design';

/** 净化 URL，阻止 javascript: / vbscript: / data: 等危险协议 */
function safeUrl(url: string): string {
  if (!url) return '#';
  const lower = url.trim().toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
    return '#';
  }
  return url;
}

/** 将一行文本中的 Markdown 图片/链接/裸URL 解析为 React 元素 */
function renderLine(line: string, lineKey: number): React.ReactNode {
  // 1. 先处理 <img src="..."> 标签，提取 src 属性
  const IMG_TAG_RE = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
  // 2. 再处理 Markdown 图片 ![alt](url) 和链接 [text](url)
  const MD_RE = /(!?\[([^\]]*)\]\(([^)]+)\))/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // 逐字符扫描，优先匹配 <img> 标签
  const fullRe = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>|!?\[[^\]]*\]\([^)]*\)/gi;
  while ((match = fullRe.exec(line)) !== null) {
    if (match.index > lastIndex) {
      // 处理前缀中的 Markdown 链接
      const prefix = line.slice(lastIndex, match.index);
      let pLast = 0;
      let m: RegExpExecArray | null;
      MD_RE.lastIndex = 0;
      while ((m = MD_RE.exec(prefix)) !== null) {
        if (m.index > pLast) parts.push(prefix.slice(pLast, m.index));
        const isImage = m[1].startsWith('!');
        const url = m[3];
        if (isImage) {
          parts.push(
            <img
              key={`cmi-${lineKey}-${m.index}`}
              src={safeUrl(url)}
              alt={m[2]}
              className="max-w-full h-auto rounded-[var(--ds-radius-md)] block my-1.5"
            />
          );
        } else {
          parts.push(
            <a key={`cma-${lineKey}-${m.index}`} href={safeUrl(url)} target="_blank" rel="noopener noreferrer">
              {m[2]}
            </a>
          );
        }
        pLast = m.index + m[1].length;
      }
      if (pLast < prefix.length) parts.push(prefix.slice(pLast));
    }

    const token = match[0];
    if (token.toLowerCase().startsWith('<img')) {
      // 提取 src
      const srcMatch = token.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        parts.push(
          <img
            key={`cmtag-${lineKey}-${match.index}`}
            src={safeUrl(srcMatch[1])}
            alt=""
            className="max-w-full h-auto rounded-[var(--ds-radius-md)] block my-1.5"
          />
        );
      }
    } else {
      const isImage = token.startsWith('!');
      const url = token.match(/\]\(([^)]+)\)/)?.[1];
      const text = token.match(/\[([^\]]*)\]/)?.[1] ?? '';
      if (isImage && url) {
        parts.push(
          <img
            key={`cmd-${lineKey}-${match.index}`}
            src={safeUrl(url)}
            alt={text}
            className="max-w-full h-auto rounded-[var(--ds-radius-md)] block my-1.5"
          />
        );
      } else if (!isImage && url) {
        parts.push(
          <a key={`cmd-${lineKey}-${match.index}`} href={safeUrl(url)} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        );
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    const suffix = line.slice(lastIndex);
    let sLast = 0;
    let m: RegExpExecArray | null;
    MD_RE.lastIndex = 0;
    while ((m = MD_RE.exec(suffix)) !== null) {
      if (m.index > sLast) parts.push(suffix.slice(sLast, m.index));
      const isImage = m[1].startsWith('!');
      const url = m[3];
      if (isImage) {
        parts.push(
          <img
            key={`cms-${lineKey}-${m.index}`}
            src={safeUrl(url)}
            alt={m[2]}
            className="max-w-full h-auto rounded-[var(--ds-radius-md)] block my-1.5"
          />
        );
      } else {
        parts.push(
          <a key={`cms-${lineKey}-${m.index}`} href={safeUrl(url)} target="_blank" rel="noopener noreferrer">
            {m[2]}
          </a>
        );
      }
      sLast = m.index + m[1].length;
    }
    if (sLast < suffix.length) parts.push(suffix.slice(sLast));
  }

  return parts.length > 0 ? parts : line;
}

/** 渲染评论内容（处理图片和链接） */
function renderContent(content: string): React.ReactNode[] {
  return content.split('\n').map((line, i) =>
    line ? (
      <p key={i} className="mb-2 mt-0">
        {renderLine(line, i)}
      </p>
    ) : (
      <br key={i} />
    )
  );
}

export interface DiscussionComment {
  id: string;
  content: string;
  createdAt: string | Date;
  likeCount?: number;
  isAccepted: boolean;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

interface CommentSectionProps {
  discussionId: string;
  discussionAuthorId: string;
  initialComments: DiscussionComment[];
  commentCount: number;
  currentUserId: string | null;
  isAuthor: boolean;
}

export default function CommentSection({
  discussionId,
  discussionAuthorId,
  initialComments,
  commentCount,
  currentUserId,
  isAuthor,
}: CommentSectionProps) {
  const [comments, setComments] = useState<DiscussionComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTargetComment, setReportTargetComment] = useState<{ id: string; username: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content || !currentUserId) return;

    setIsSubmitting(true);
    setError('');

    try {
      const data = await api.post<DiscussionComment>(`/api/v1/discussions/${discussionId}/comments`, { content });
      if (data.code === 201) {
        setComments((prev) => [...prev, data.data]);
        setNewComment('');
      } else {
        setError(data.message || '发送失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContent.trim();
    if (!content || !replyTo || !currentUserId) return;

    setIsSubmittingReply(true);
    setError('');

    try {
      const data = await api.post<DiscussionComment>(`/api/v1/discussions/${discussionId}/comments`, { content, parentId: replyTo.id });
      if (data.code === 201) {
        setComments((prev) => [...prev, data.data]);
        setReplyContent('');
        setReplyTo(null);
      } else {
        setError(data.message || '回复失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleAccept = async (commentId: string) => {
    try {
      const data = await api.post(`/api/v1/discussions/${discussionId}/accept/${commentId}`);
      if (data.code === 200 || data.code === 0) {
        setComments((prev) =>
          prev.map((c) => ({ ...c, isAccepted: c.id === commentId }))
        );
      }
    } catch (err) {
      console.error('Failed to accept comment:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--ds-border-default)]">
        <MessageSquare size={20} />
        <h2>{commentCount} 条回复</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--ds-radius-sm)] text-sm bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] mb-4">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="text-center py-12 text-[var(--ds-text-secondary)]">
          <MessageSquare size={40} className="mx-auto mb-4 text-[var(--ds-text-tertiary)]" />
          <p>暂无回复，来发表第一条评论吧</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--ds-border-muted)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 ${comment.isAccepted ? 'bg-[var(--ds-success-subtle)] border-l-2 border-[var(--ds-success-default)]' : ''}`}
            >
              <div>
                {comment.isAccepted && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)] mb-2">
                    <CheckCircle size={14} />
                    采纳答案
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <Link
                    href={`/${comment.author.username}`}
                    className="flex items-center gap-2"
                  >
                    <img
                      src={comment.author.avatarUrl || '/default-avatar.png'}
                      alt={comment.author.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium text-[var(--ds-text-primary)] text-sm">
                      {comment.author.username}
                    </span>
                  </Link>
                  <span className="text-xs text-[var(--ds-text-secondary)] ml-auto">
                    {formatTimeAgo(comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-[var(--ds-text-primary)] leading-relaxed pl-10">{renderContent(comment.content)}</div>
                <div className="flex items-center gap-4 mt-3 pl-10">
                  {currentUserId && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<CornerDownRight size={14} />}
                        onClick={() => {
                          setReplyTo({
                            id: comment.id,
                            username: comment.author.username,
                          });
                          setReplyContent('');
                          setTimeout(() => textareaRef.current?.focus(), 50);
                        }}
                      >
                        回复
                      </Button>
                      {isAuthor && !comment.isAccepted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<CheckCircle size={14} />}
                          onClick={() => handleAccept(comment.id)}
                        >
                          采纳
                        </Button>
                      )}
                      {currentUserId !== comment.author.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReportTargetComment({ id: comment.id, username: comment.author.username });
                            setShowReportModal(true);
                          }}
                          title="举报评论"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Reply form */}
                {replyTo?.id === comment.id && (
                  <form onSubmit={handleReply} className="mt-3 ml-10">
                    <label htmlFor="reply-textarea" className="sr-only">回复 @{replyTo.username}</label>
                    <Input
                      id="reply-textarea"
                      multiline
                      ref={textareaRef}
                      placeholder={`回复 @${replyTo.username}：`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex items-center gap-2 justify-end mt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setReplyTo(null)}
                      >
                        取消
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        icon={<Send size={14} />}
                        disabled={isSubmittingReply}
                      >
                        {isSubmittingReply ? '发送中...' : '发送'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="border-t border-[var(--ds-border-muted)] pt-6 mt-6">
          <label htmlFor="new-comment-textarea" className="sr-only">发表评论</label>
          <Input
            id="new-comment-textarea"
            multiline
            placeholder="写下你的回复..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[var(--ds-text-secondary)]">支持 Markdown 格式</span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Send size={14} />}
              disabled={isSubmitting || !newComment.trim()}
            >
              {isSubmitting ? '发送中...' : '发表评论'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8 border-t border-[var(--ds-border-muted)]">
          <p>
            <Link href="/login" className="text-[var(--ds-accent-default)] hover:underline">登录</Link>
            后参与讨论
          </p>
        </div>
      )}

      {/* 举报评论弹窗 */}
      {showReportModal && reportTargetComment && (
        <ReportModal
          targetType="comment"
          targetId={reportTargetComment.id}
          targetTitle={`@${reportTargetComment.username} 的评论`}
          onClose={() => {
            setShowReportModal(false);
            setReportTargetComment(null);
          }}
        />
      )}
    </div>
  );
}
