'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, ThumbsUp, Eye, Clock, Plus } from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { tokenManager } from '@/lib/api/client';

interface Author {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  category: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: Author;
}

const categories = [
  { id: 'all', name: '全部' },
  { id: 'question', name: '提问' },
  { id: 'resource', name: '资源求助' },
  { id: 'team', name: '项目组队' },
  { id: 'experience', name: '经验分享' },
];

const categoryLabels: Record<string, string> = {
  question: '提问',
  resource: '资源求助',
  team: '项目组队',
  experience: '经验分享',
};

const categoryColors: Record<string, string> = {
  question: '#0969da',
  resource: '#8250df',
  team: '#bf8700',
  experience: '#1a7f37',
};

export default function DiscussionsPage() {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('latest');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      params.set('sort', sort);

      const token = tokenManager.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/discussions?${params}`, { headers });
      const data = await res.json();
      if (data.code === 200) {
        setDiscussions(data.data.items || data.data || []);
      }
    } catch (e) {
      console.error('获取讨论列表失败', e);
    } finally {
      setIsLoading(false);
    }
  }, [category, sort]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            <MessageSquare size={24} />
            讨论区
          </h1>
          <p className="page-subtitle">在这里交流想法、提问求助、分享经验</p>
        </div>
        <Link href="/discussions/new" className="btn btn-primary">
          <Plus size={16} />
          发布讨论
        </Link>
      </div>

      <div className="discussion-filters">
        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-tab ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <select
          className="sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="latest">最新</option>
          <option value="popular">最热</option>
          <option value="unanswered">待回复</option>
        </select>
      </div>

      <div className="discussion-list">
        {isLoading ? (
          <div className="discussion-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="discussion-skeleton">
                <div className="skeleton-avatar" />
                <div className="skeleton-content">
                  <div className="skeleton-title" />
                  <div className="skeleton-meta" />
                </div>
              </div>
            ))}
          </div>
        ) : discussions.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={48} />
            <p>暂无讨论，快来发起第一个吧！</p>
            <Link href="/discussions/new" className="btn btn-primary">发布讨论</Link>
          </div>
        ) : (
          discussions.map((d) => (
            <Link href={`/discussions/${d.id}`} key={d.id} className="discussion-item">
              <img
                src={d.author.avatarUrl || '/default-avatar.png'}
                alt={d.author.username}
                className="author-avatar"
              />
              <div className="discussion-info">
                <div className="discussion-title-row">
                  <span
                    className="category-badge"
                    style={{
                      backgroundColor: categoryColors[d.category] + '20',
                      color: categoryColors[d.category] || '#0969da',
                    }}
                  >
                    {categoryLabels[d.category] || d.category}
                  </span>
                  <h3 className="discussion-title">{d.title}</h3>
                </div>
                <div className="discussion-meta">
                  <span className="author-name">{d.author.username}</span>
                  <span className="meta-item">
                    <ThumbsUp size={14} />
                    {d.likeCount}
                  </span>
                  <span className="meta-item">
                    <MessageSquare size={14} />
                    {d.commentCount}
                  </span>
                  <span className="meta-item">
                    <Clock size={14} />
                    {formatTimeAgo(d.createdAt)}
                  </span>
                </div>
              </div>
              <div className="discussion-stats">
                <span className="stat-item">
                  <Eye size={14} />
                  {d.viewCount}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
