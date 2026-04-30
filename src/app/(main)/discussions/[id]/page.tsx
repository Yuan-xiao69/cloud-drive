import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  Clock,
  MessageSquare,
  Pin,
  CheckCircle,
} from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { auth } from '@/lib/auth/server';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import CommentSection, { DiscussionComment } from './CommentSection';
import LikeButton from './LikeButton';
import DiscussionReportButton from './DiscussionReportButton';
import DiscussionBreadcrumb from '@/components/discussion/DiscussionBreadcrumb';

/**
 * 将一行文本中的 Markdown 图片/链接语法解析为 React 元素。
 * 只处理 ![alt](url) 和 [text](url)，其余内容原样输出。
 */
function renderInlineMarkdown(line: string, lineKey: number): React.ReactNode {
  // 匹配 ![alt](url) 或 [text](url)
  const INLINE_RE = /(!?\[([^\]]*)\]\(([^)]+)\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_RE.exec(line)) !== null) {
    // 前缀纯文本
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const isImage = match[1].startsWith('!');
    const altOrText = match[2];
    const url = match[3];

    if (isImage) {
      parts.push(
        <img
          key={`img-${lineKey}-${match.index}`}
          src={url}
          alt={altOrText}
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
        >
          {altOrText}
        </a>
      );
    }
    lastIndex = match.index + match[1].length;
  }

  // 剩余纯文本
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : line;
}

export const metadata: Metadata = {
  title: '讨论详情 - 代码托管与协作平台',
};

type Props = { params: Promise<{ id: string }> };

async function getDiscussion(id: string) {
  const discussion = await prisma.discussion.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, username: true, avatarUrl: true, bio: true },
      },
      comments: {
        where: { isDeleted: false },
        orderBy: [{ isAccepted: 'desc' }, { createdAt: 'asc' }],
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      },
    },
  });
  if (discussion) {
    await prisma.discussion.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
  return discussion;
}

const categoryLabels: Record<string, string> = {
  question: '提问',
  idea: '奇思妙想',
  request: '资源求助',
  team: '项目组队',
  share: '经验分享',
};

export default async function DiscussionDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const [discussion, session] = await Promise.all([
    getDiscussion(resolvedParams.id),
    auth(),
  ]);

  if (!discussion) notFound();

  const currentUserId = session?.id || null;
  const isAuthor = currentUserId === discussion.authorId;

  return (
    <div className="home-page">
      <Header />
      <div className="home-layout">
        <LeftSidebar />
        <div className="home-container">
          <main className="home-main">
            <div className="discussion-detail-container">
              {/* Header */}
              <div className="discussion-detail-header">
                {/* 面包屑导航 */}
                <DiscussionBreadcrumb
                  discussionId={discussion.id}
                  discussionTitle={discussion.title}
                  category={categoryLabels[discussion.category]}
                />

                <div className="discussion-detail-title">
                  <MessageSquare size={24} />
                  <h1>{discussion.title}</h1>
                  {currentUserId && !isAuthor && (
                    <DiscussionReportButton
                      targetType="discussion"
                      targetId={discussion.id}
                      targetTitle={discussion.title}
                    />
                  )}
                </div>
              </div>

              {/* Main content */}
              <div className="discussion-detail-layout">
                {/* Post */}
                <article className="discussion-post">
                  <div className="discussion-post-header">
                    <span className={`category-badge ${discussion.category}`}>
                      {categoryLabels[discussion.category] || discussion.category}
                    </span>
                    <div className="discussion-post-meta">
                      <Link href={`/${discussion.author.username}`} className="post-author">
                        <img
                          src={discussion.author.avatarUrl || '/default-avatar.png'}
                          alt={discussion.author.username}
                          className="author-avatar"
                        />
                        <span>{discussion.author.username}</span>
                      </Link>
                      <span className="meta-item">
                        <Clock size={14} />
                        {formatTimeAgo(String(discussion.createdAt))}
                      </span>
                      <span className="meta-item">
                        <Eye size={14} />
                        {String((discussion as Record<string, unknown>).viewCount || 0)} 次阅读
                      </span>
                    </div>
                  </div>

                  <div className="discussion-post-content">
                    {discussion.content.split('\n').map((line, i) => (
                      <p key={i}>{line ? renderInlineMarkdown(line, i) : <br />}</p>
                    ))}
                  </div>

                  <div className="discussion-post-actions">
                    <LikeButton
                      discussionId={discussion.id}
                      authorId={discussion.authorId}
                    />
                    <span className="action-hint">感觉有帮助就点个赞吧</span>
                  </div>
                </article>

                {/* Sidebar */}
                <aside className="discussion-sidebar">
                  <div className="sidebar-card">
                    <h3 className="sidebar-card-title">关于作者</h3>
                    <Link href={`/${discussion.author.username}`} className="sidebar-author">
                      <img
                        src={discussion.author.avatarUrl || '/default-avatar.png'}
                        alt={discussion.author.username}
                        className="author-avatar-lg"
                      />
                      <span className="sidebar-author-name">{discussion.author.username}</span>
                    </Link>
                    {discussion.author.bio && (
                      <p className="sidebar-author-bio">{discussion.author.bio}</p>
                    )}
                  </div>

                  <div className="sidebar-card">
                    <h3 className="sidebar-card-title">讨论信息</h3>
                    <div className="sidebar-info-list">
                      <div className="sidebar-info-item">
                        <span className="sidebar-info-label">分类</span>
                        <span className={`category-badge ${discussion.category}`}>
                          {categoryLabels[discussion.category]}
                        </span>
                      </div>
                      <div className="sidebar-info-item">
                        <span className="sidebar-info-label">回复数</span>
                        <span className="sidebar-info-value">{discussion.comments?.length || 0}</span>
                      </div>
                      <div className="sidebar-info-item">
                        <span className="sidebar-info-label">浏览</span>
                        <span className="sidebar-info-value">{String((discussion as Record<string, unknown>).viewCount || 0)}</span>
                      </div>
                      <div className="sidebar-info-item">
                        <span className="sidebar-info-label">发布时间</span>
                        <span className="sidebar-info-value">
                          {new Date(discussion.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>

              {/* Comments */}
              <CommentSection
                discussionId={discussion.id}
                discussionAuthorId={discussion.authorId}
                initialComments={discussion.comments as DiscussionComment[]}
                commentCount={discussion.comments.length}
                currentUserId={currentUserId}
                isAuthor={isAuthor}
              />
            </div>
          </main>
        </div>
        <RightSidebar />
      </div>
    </div>
  );
}
