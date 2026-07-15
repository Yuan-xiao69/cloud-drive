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
} from '@/components/design/icons';
import { formatTimeAgo } from '@/lib/utils';
import { auth } from '@/lib/auth/server';
import CommentSection, { DiscussionComment } from './CommentSection';
import { Card, PageLayout, PageLayoutPane, PageLayoutContent, Badge } from '@/components/design';
import LeftSidebar from '@/components/layout/LeftSidebar';
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
  title: '讨论详情 - 文件托管与协作平台',
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
    // 返回更新后的 viewCount（update 在 findUnique 之后，返回的是旧值）
    discussion.viewCount += 1;
  }
  return discussion;
}

const categoryLabels: Record<string, string> = {
  general: '闲聊',
  qa: '问答',
  share: '分享',
  suggestion: '建议',
  announce: '公告',
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
    <PageLayout containerWidth="extraWide">
      <PageLayoutPane width="sidebar">
        <LeftSidebar />
      </PageLayoutPane>
      <PageLayoutContent>
        <div className="bg-[var(--ds-page-bg)]">
          <div className="px-6 py-6">
              {/* Header */}
              <div className="mb-6">
                {/* 面包屑导航 */}
                <DiscussionBreadcrumb
                  discussionId={discussion.id}
                  discussionTitle={discussion.title}
                  category={categoryLabels[discussion.category]}
                />

                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare size={24} />
                  <h1 className="font-display text-2xl font-bold text-[var(--ds-text-primary)] mb-2">
                    {discussion.title}
                  </h1>
                  {currentUserId && !isAuthor && (
                    <DiscussionReportButton
                      targetType="discussion"
                      targetId={discussion.id}
                      targetTitle={discussion.title}
                    />
                  )}
                </div>

                {/* Tags and Wiki badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(discussion as any).isWiki && (
                    <Badge variant="warning">Wiki 模式</Badge>
                  )}
                  {Array.isArray((discussion as any).tags) && (discussion as any).tags.length > 0 && (discussion as any).tags.map((tag: string) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              </div>

              {/* Main content */}
              <div className="flex gap-8">
                {/* Post */}
                <Card as="article" padding="none" className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex flex-col gap-3 p-4 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
                    <span className={`inline-flex items-center px-1.5 py-px rounded-full text-[11px] bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)] ${discussion.category}`}>
                      {categoryLabels[discussion.category] || discussion.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <Link href={`/${discussion.author.username}`} className="flex items-center gap-2 no-underline text-[var(--ds-text-primary)] font-medium">
                        <img
                          src={discussion.author.avatarUrl || '/default-avatar.png'}
                          alt={discussion.author.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span>{discussion.author.username}</span>
                      </Link>
                      <span className="flex items-center gap-1 text-[13px] text-[var(--ds-text-secondary)]">
                        <Clock size={14} />
                        {formatTimeAgo(String(discussion.createdAt))}
                      </span>
                      <span className="flex items-center gap-1 text-[13px] text-[var(--ds-text-secondary)]">
                        <Eye size={14} />
                        {String((discussion as Record<string, unknown>).viewCount || 0)} 次阅读
                      </span>
                    </div>
                  </div>

                  <div className="p-5 text-[15px] leading-relaxed">
                    {discussion.content.split('\n').map((line, i) => (
                      <p key={i}>{line ? renderInlineMarkdown(line, i) : <br />}</p>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 p-4 border-t border-[var(--ds-border-default)]">
                    <LikeButton
                      discussionId={discussion.id}
                      authorId={discussion.authorId}
                    />
                    <span className="text-[13px] text-[var(--ds-text-secondary)]">感觉有帮助就点个赞吧</span>
                  </div>
                </Card>

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
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}
