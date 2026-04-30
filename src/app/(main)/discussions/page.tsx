'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Clock, TrendingUp, Info } from '@/components/ui/icons';
import { formatTimeAgo } from '@/lib/utils';
import { tokenManager } from '@/lib/api/client';
import ActionMenu from '@/components/common/ActionMenu';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';

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

// 分类配置（GitHub 风格）
const categories = [
  { id: 'all', name: '全部', icon: '📋' },
  { id: 'question', name: '提问', icon: '❓' },
  { id: 'request', name: '资源求助', icon: '🆘' },
  { id: 'team', name: '项目组队', icon: '👥' },
  { id: 'share', name: '经验分享', icon: '📚' },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  question: { bg: '#0969da15', text: '#0969da' },
  request: { bg: '#bf870015', text: '#bf8700' },
  team: { bg: '#bf398915', text: '#bf3989' },
  share: { bg: '#1a7f3715', text: '#1a7f37' },
};

const sortOptions = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '最热' },
  { value: 'unanswered', label: '待回复' },
];

export default function DiscussionsPage() {
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('latest');
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查登录状态
  useEffect(() => {
    const token = tokenManager.getAccessToken();
    setIsLoggedIn(!!token);
  }, []);

  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      params.set('sort', sort);

      const token = tokenManager.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/discussions?${params}`, { headers });
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

  // 获取分类统计
  const categoryStats = categories.reduce((acc, cat) => {
    if (cat.id === 'all') {
      acc[cat.id] = discussions.length;
    } else {
      acc[cat.id] = discussions.filter(d => d.category === cat.id).length;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="home-page">
      <Header />
      <div className="home-layout">
        {/* 左侧边栏 */}
        <LeftSidebar />

        {/* 主内容区域 */}
        <main className="discussions-main">
          {/* 头部 */}
          <div className="discussions-header">
            <div className="discussions-title">
              <MessageSquare size={28} />
              <h1>讨论区</h1>
            </div>
          </div>

          {/* 筛选栏 */}
          <div className="discussions-toolbar">
            <div className="category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`category-tab ${category === cat.id ? 'active' : ''}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <span className="category-tab-icon">{cat.icon}</span>
                  <span className="category-tab-name">{cat.name}</span>
                  <span className="category-tab-count">{categoryStats[cat.id] || 0}</span>
                </button>
              ))}
            </div>
            <div className="toolbar-right">
              <select
                className="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 讨论列表 */}
          <div className="discussion-list">
            {isLoading ? (
              <div className="discussion-loading">
                {[1, 2, 3, 4, 5].map((i) => (
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
              <div className="discussions-empty">
                <MessageSquare size={48} />
                <p className="empty-title">暂无讨论</p>
                <p className="empty-desc">成为第一个发起讨论的人吧！</p>
                {isLoggedIn && (
                  <Link href="/discussions/new" className="btn btn-primary">
                    <Plus size={16} />
                    发布讨论
                  </Link>
                )}
              </div>
            ) : (
              discussions.map((d) => {
                const colors = categoryColors[d.category] || { bg: '#6e778115', text: '#57606a' };
                return (
                  <Link href={`/discussions/${d.id}`} key={d.id} className="discussion-item">
                    <img
                      src={d.author.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.author.username}`}
                      alt={d.author.username}
                      className="discussion-avatar"
                    />
                    <div className="discussion-content">
                      <div className="discussion-top">
                        <span
                          className="discussion-category"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {categories.find(c => c.id === d.category)?.name || d.category}
                        </span>
                      </div>
                      <h3 className="discussion-title">{d.title}</h3>
                      <div className="discussion-meta">
                        <span className="meta-author">{d.author.username}</span>
                        <span className="meta-sep">·</span>
                        <span className="meta-time">
                          <Clock size={12} />
                          {formatTimeAgo(d.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="discussion-stats">
                      <span className="stat-item" title="回复">
                        <MessageSquare size={14} />
                        {d.commentCount}
                      </span>
                      <span className="stat-item" title="浏览">
                        {d.viewCount}
                      </span>
                      {isLoggedIn && (
                        <span
                          className="stat-item"
                          title="举报"
                          onClick={(e) => e.preventDefault()}
                          style={{ cursor: 'pointer' }}
                        >
                          <ActionMenu
                            type="discussion"
                            targetId={d.id}
                            targetTitle={d.title}
                          />
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </main>

        {/* 右侧边栏 */}
        <RightSidebar />
      </div>
    </div>
  );
}
