'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface RepoInfo {
  id: string;
  name: string;
  owner: {
    username: string;
    avatarUrl?: string;
  };
}

interface FileItem {
  id: string;
  name: string;
  type: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

interface ShareData {
  repo: RepoInfo;
  path: string;
  items?: FileItem[];
  item?: FileItem & { content?: string };
  permission: string;
  expiresAt?: string;
  viewCount?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// 相对时间格式化 (替代 date-fns)
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  if (weeks < 4) return `${weeks}周前`;
  if (months < 12) return `${months}个月前`;
  return `${years}年前`;
}

function getFileIcon(name: string, type: string) {
  if (type === 'dir') return '📁';

  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    // 图片
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
    // 代码
    js: '📜', ts: '📜', jsx: '📜', tsx: '📜', py: '📜', java: '📜', cpp: '📜', c: '📜',
    // 文档
    md: '📝', txt: '📝', doc: '📝', docx: '📝', pdf: '📄',
    // 数据
    json: '📋', xml: '📋', csv: '📊',
    // 样式
    css: '🎨', scss: '🎨', less: '🎨',
    // 其他
    zip: '📦', rar: '📦', tar: '📦',
    html: '🌐', htm: '🌐',
  };
  return iconMap[ext] || '📄';
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  const fetchData = useCallback(async (path = '', pwd = '') => {
    setLoading(true);
    setError(null);
    setCurrentPath(path);

    try {
      const url = new URL(`/api/share/${token}`, window.location.origin);
      if (path) url.searchParams.set('path', path);
      if (pwd) url.searchParams.set('password', pwd);

      const res = await fetch(url.toString());
      const result = await res.json();

      if (!result.success) {
        if (result.code === 'PASSWORD_REQUIRED') {
          setNeedsPassword(true);
          setLoading(false);
          return;
        }
        throw new Error(result.message || '获取数据失败');
      }

      setNeedsPassword(false);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(false);

    try {
      const res = await fetch(`/api/v1/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();

      if (!result.success) {
        setPasswordError(true);
        return;
      }

      fetchData(currentPath, password);
    } catch {
      setPasswordError(true);
    }
  };

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'dir') {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      fetchData(newPath, password);
    }
  };

  const handleNavigate = (path: string) => {
    fetchData(path, password);
  };

  // 密码输入页面
  if (needsPassword) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas-default)]">
        <div className="container">
          <div className="share-password-container">
            <div className="share-password-box">
              <div className="share-password-icon">🔒</div>
              <h1 className="share-password-title">此链接受密码保护</h1>
              <p className="share-password-desc">请输入访问密码</p>

              <form onSubmit={handlePasswordSubmit} className="share-password-form">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入访问密码"
                  className={`share-password-input ${passwordError ? 'error' : ''}`}
                  autoFocus
                />
                {passwordError && (
                  <p className="share-password-error">密码错误，请重试</p>
                )}
                <button type="submit" className="share-password-btn">
                  验证密码
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 错误页面
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas-default)]">
        <div className="container">
          <div className="share-error-container">
            <div className="share-error-icon">⚠️</div>
            <h1 className="share-error-title">无法访问此链接</h1>
            <p className="share-error-desc">{error}</p>
            <button
              className="share-error-btn"
              onClick={() => router.push('/')}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-canvas-default)]">
        <div className="container">
          <div className="share-loading">
            <div className="share-loading-spinner"></div>
            <p>加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isFile = !!data.item;

  return (
    <div className="min-h-screen bg-[var(--color-canvas-default)]">
      {/* Header */}
      <header className="share-header">
        <div className="container">
          <div className="share-header-content">
            <div className="share-repo-info">
              <span className="share-repo-icon">📦</span>
              <a href={`/${data.repo.owner.username}`} className="share-owner-link">
                {data.repo.owner.username}
              </a>
              <span className="share-repo-sep">/</span>
              <span className="share-repo-name">{data.repo.name}</span>
            </div>
            <div className="share-meta">
              <span className="share-badge">分享链接</span>
              {data.expiresAt && (
                <span className="share-expires">
                  过期时间: {formatRelativeTime(new Date(data.expiresAt))}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="share-content">
          {/* Breadcrumb */}
          <div className="share-breadcrumb">
            <button
              className="share-breadcrumb-item"
              onClick={() => handleNavigate('')}
            >
              根目录
            </button>
            {data.path && data.path.split('/').map((part, index, arr) => (
              <span key={index} className="share-breadcrumb-item">
                <span className="share-breadcrumb-sep">/</span>
                <button
                  className="share-breadcrumb-link"
                  onClick={() => handleNavigate(arr.slice(0, index + 1).join('/'))}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>

          {/* 文件/文件夹列表 */}
          {isFile ? (
            <div className="share-file-viewer">
              <div className="share-file-header">
                <span className="share-file-icon">{getFileIcon(data.item!.name, 'file')}</span>
                <span className="share-file-name">{data.item!.name}</span>
                <span className="share-file-size">{formatFileSize(data.item!.size || 0)}</span>
              </div>
              <div className="share-file-content">
                {data.item!.content ? (
                  <pre className="code-raw-view"><code>{data.item!.content}</code></pre>
                ) : (
                  <div className="share-file-empty">暂无内容预览</div>
                )}
              </div>
            </div>
          ) : (
            <div className="share-file-list">
              {/* 目录头部 */}
              <div className="share-list-header">
                <span className="share-list-name">名称</span>
                <span className="share-list-meta">修改时间</span>
                <span className="share-list-size">大小</span>
              </div>

              {/* 返回上级 */}
              {data.path && (
                <div
                  className="share-list-item share-list-item-parent"
                  onClick={() => handleNavigate(data.path.split('/').slice(0, -1).join('/'))}
                >
                  <div className="share-list-item-main">
                    <span className="share-item-icon">📁</span>
                    <span className="share-item-name">..</span>
                  </div>
                  <span className="share-item-time">-</span>
                  <span className="share-item-size">-</span>
                </div>
              )}

              {/* 文件列表 */}
              {data.items?.map((item) => (
                <div
                  key={item.id}
                  className="share-list-item"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="share-list-item-main">
                    <span className="share-item-icon">{getFileIcon(item.name, item.type)}</span>
                    <span className="share-item-name">{item.name}</span>
                  </div>
                  <span className="share-item-time">
                    {formatRelativeTime(new Date(item.updatedAt))}
                  </span>
                  <span className="share-item-size">
                    {item.type === 'dir' ? '-' : formatFileSize(item.size || 0)}
                  </span>
                </div>
              ))}

              {(!data.items || data.items.length === 0) && (
                <div className="share-list-empty">此目录为空</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
