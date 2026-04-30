'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Send,
  CornerDownRight,
  CheckCircle,
  AlertCircle,
} from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import ReportModal from '@/components/common/ReportModal';
import { tokenManager } from '@/lib/api/client';

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
              src={url}
              alt={m[2]}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', display: 'block', margin: '6px 0' }}
            />
          );
        } else {
          parts.push(
            <a key={`cma-${lineKey}-${m.index}`} href={url} target="_blank" rel="noopener noreferrer">
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
            src={srcMatch[1]}
            alt=""
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', display: 'block', margin: '6px 0' }}
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
            src={url}
            alt={text}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', display: 'block', margin: '6px 0' }}
          />
        );
      } else if (!isImage && url) {
        parts.push(
          <a key={`cmd-${lineKey}-${match.index}`} href={url} target="_blank" rel="noopener noreferrer">
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
            src={url}
            alt={m[2]}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', display: 'block', margin: '6px 0' }}
          />
        );
      } else {
        parts.push(
          <a key={`cms-${lineKey}-${m.index}`} href={url} target="_blank" rel="noopener noreferrer">
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
      <p key={i} style={{ marginBottom: '8px', marginTop: 0 }}>
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
      const token = tokenManager.getAccessToken();

      const res = await fetch(`/api/v1/discussions/${discussionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
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

    setIsSubmitting(true);
    setError('');

    try {
      const token = tokenManager.getAccessToken();

      const res = await fetch(`/api/v1/discussions/${discussionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ content, parentId: replyTo.id }),
      });

      const data = await res.json();
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
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (commentId: string) => {
    try {
      const token = tokenManager.getAccessToken();

      const res = await fetch(
        `/api/v1/discussions/${discussionId}/accept/${commentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );
      const data = await res.json();
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
    <div className="comment-section">
      <div className="comment-section-header">
        <MessageSquare size={20} />
        <h2>{commentCount} 条回复</h2>
      </div>

      {error && (
        <div className="comment-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="comment-empty">
          <MessageSquare size={40} className="comment-empty-icon" />
          <p>暂无回复，来发表第一条评论吧</p>
        </div>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${comment.isAccepted ? 'accepted' : ''}`}
            >
              <div className="comment-main">
                {comment.isAccepted && (
                  <div className="accepted-badge">
                    <CheckCircle size={14} />
                    采纳答案
                  </div>
                )}
                <div className="comment-header">
                  <Link
                    href={`/${comment.author.username}`}
                    className="comment-author"
                  >
                    <img
                      src={comment.author.avatarUrl || '/default-avatar.png'}
                      alt={comment.author.username}
                      className="comment-avatar"
                    />
                    <span className="comment-author-name">
                      {comment.author.username}
                    </span>
                  </Link>
                  <span className="comment-time">
                    {formatTimeAgo(comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt)}
                  </span>
                </div>
                <div className="comment-content">{renderContent(comment.content)}</div>
                <div className="comment-actions">
                  {currentUserId && (
                    <>
                      <button
                        className="comment-action-btn"
                        onClick={() => {
                          setReplyTo({
                            id: comment.id,
                            username: comment.author.username,
                          });
                          setReplyContent('');
                          setTimeout(() => textareaRef.current?.focus(), 50);
                        }}
                      >
                        <CornerDownRight size={14} />
                        回复
                      </button>
                      {isAuthor && !comment.isAccepted && (
                        <button
                          className="comment-action-btn accept-btn"
                          onClick={() => handleAccept(comment.id)}
                        >
                          <CheckCircle size={14} />
                          采纳
                        </button>
                      )}
                      {currentUserId !== comment.author.id && (
                        <button
                          className="comment-action-btn report-btn"
                          onClick={() => {
                            setReportTargetComment({ id: comment.id, username: comment.author.username });
                            setShowReportModal(true);
                          }}
                          title="举报评论"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Reply form */}
                {replyTo?.id === comment.id && (
                  <form onSubmit={handleReply} className="reply-form">
                    <textarea
                      ref={textareaRef}
                      className="reply-textarea"
                      placeholder={`回复 @${replyTo.username}：`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                    />
                    <div className="reply-form-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setReplyTo(null)}
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        <Send size={14} />
                        {isSubmitting ? '发送中...' : '发送'}
                      </button>
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
        <form onSubmit={handleSubmit} className="new-comment-form">
          <textarea
            className="comment-textarea"
            placeholder="写下你的回复..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
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
            <Link href="/login" className="link">登录</Link>
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
