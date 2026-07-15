'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input, PageLayout, PageLayoutContent } from '@/components/design';

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
  const isPast = diff >= 0;
  const absSeconds = Math.floor(Math.abs(diff) / 1000);
  const absMinutes = Math.floor(absSeconds / 60);
  const absHours = Math.floor(absMinutes / 60);
  const absDays = Math.floor(absHours / 24);
  const absWeeks = Math.floor(absDays / 7);
  const absMonths = Math.floor(absDays / 30);
  const absYears = Math.floor(absDays / 365);

  if (isPast) {
    if (absSeconds < 60) return '刚刚';
    if (absMinutes < 60) return `${absMinutes}分钟前`;
    if (absHours < 24) return `${absHours}小时前`;
    if (absDays < 7) return `${absDays}天前`;
    if (absWeeks < 4) return `${absWeeks}周前`;
    if (absMonths < 12) return `${absMonths}个月前`;
    return `${absYears}年前`;
  }
  if (absSeconds < 60) return '即将';
  if (absMinutes < 60) return `${absMinutes}分钟后过期`;
  if (absHours < 24) return `${absHours}小时后过期`;
  if (absDays < 7) return `${absDays}天后过期`;
  return date.toLocaleDateString('zh-CN');
}

function getFileIcon(name: string, type: string) {
  if (type === 'dir') return '📁';

  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    // 图片
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
    // 文件
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
      const url = new URL(`/api/v1/share/${token}`, window.location.origin);
      if (path) url.searchParams.set('path', path);
      if (pwd) url.searchParams.set('password', pwd);

      const res = await fetch(url.toString());
      const result = await res.json();

      // 后端 API 返回格式: { code: number, message: string, data: any }
      // code 为 200/201 表示成功
      if (result.code !== 200 && result.code !== 201) {
        // 检查是否需要密码（后端返回 code=200 但 data.requiresPassword=true）
        if (result.data?.requiresPassword) {
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
      // 后端使用 GET 方法，密码通过 query 参数传递
      const url = new URL(`/api/v1/share/${token}`, window.location.origin);
      url.searchParams.set('password', password);
      const res = await fetch(url.toString());
      const result = await res.json();

      // 后端 API 返回格式: { code: number, message: string, data: any }
      if (result.code !== 200 && result.code !== 201) {
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
      <PageLayout containerWidth="wide"><PageLayoutContent>
        <div className="max-w-lg mx-auto p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 max-w-sm w-full">
            <div className="text-center text-4xl mb-4">🔒</div>
            <h1 className="text-xl font-semibold text-center mb-2 text-[var(--ds-text-primary)]">此链接受密码保护</h1>
            <p className="text-center text-[var(--ds-text-secondary)] mb-6 text-sm">请输入访问密码</p>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入访问密码"
                state={passwordError ? 'error' : 'normal'}
              />
              {passwordError && (
                <p className="text-[var(--ds-danger-default)] text-sm">密码错误，请重试</p>
              )}
              <Button type="submit" variant="primary" block>
                验证密码
              </Button>
            </form>
          </Card>
        </div>
      </PageLayoutContent></PageLayout>
    );
  }

  // 错误页面
  if (error) {
    return (
      <PageLayout containerWidth="wide"><PageLayoutContent>
        <div className="max-w-lg mx-auto p-6">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-semibold mb-2 text-[var(--ds-text-primary)]">无法访问此链接</h1>
            <p className="text-[var(--ds-text-secondary)] mb-6">{error}</p>
            <Button variant="primary" onClick={() => router.push('/')}>
              返回首页
            </Button>
          </div>
        </div>
      </PageLayoutContent></PageLayout>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <PageLayout containerWidth="wide"><PageLayoutContent>
        <div className="max-w-lg mx-auto p-6">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin"></div>
            <p className="text-[var(--ds-text-secondary)] text-sm">加载中...</p>
          </div>
        </div>
      </PageLayoutContent></PageLayout>
    );
  }

  if (!data) return null;

  const isFile = !!data.item;

  return (
    <PageLayout containerWidth="wide"><PageLayoutContent>
      {/* Header */}
      <header className="border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)] py-3">
        <div className="max-w-lg mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-base">📦</span>
              <Link href={`/${data.repo.owner.username}`} className="text-[var(--ds-accent-default)] hover:underline">
                {data.repo.owner.username}
              </Link>
              <span className="text-[var(--ds-text-secondary)]">/</span>
              <span className="font-semibold text-[var(--ds-text-primary)]">{data.repo.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] border border-[var(--ds-accent-muted)]">分享链接</span>
              {data.expiresAt && (
                <span className="text-xs text-[var(--ds-text-secondary)]">
                  过期时间: {formatRelativeTime(new Date(data.expiresAt))}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-6">
        <div className="py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm mb-4">
            <Button variant="ghost" onClick={() => handleNavigate('')}>
              根目录
            </Button>
            {data.path && data.path.split('/').map((part, index, arr) => (
              <span key={index} className="flex items-center">
                <span className="text-[var(--ds-text-secondary)] mx-0.5">/</span>
                <Button
                  variant="ghost"
                  onClick={() => handleNavigate(arr.slice(0, index + 1).join('/'))}
                >
                  {part}
                </Button>
              </span>
            ))}
          </div>

          {/* 文件/文件夹列表 */}
          {isFile ? (
            <Card>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
                <span className="text-xl">{getFileIcon(data.item!.name, 'file')}</span>
                <span className="font-semibold text-[var(--ds-text-primary)] flex-1 min-w-0 truncate">{data.item!.name}</span>
                <span className="text-sm text-[var(--ds-text-secondary)] flex-shrink-0">{formatFileSize(data.item!.size || 0)}</span>
              </div>
              <div className="p-4 overflow-auto">
                {data.item!.content ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-[var(--ds-surface-subtle)] p-4 rounded"><code>{data.item!.content}</code></pre>
                ) : (
                  <div className="text-center py-10 text-[var(--ds-text-secondary)]">暂无内容预览</div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              {/* 目录头部 */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)] text-sm font-semibold text-[var(--ds-text-primary)]">
                <span className="flex-1">名称</span>
                <span className="w-36 text-right">修改时间</span>
                <span className="w-20 text-right">大小</span>
              </div>

              {/* 返回上级 */}
              {data.path && (
                <div
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 px-4 py-2 border-b border-[var(--ds-border-default)] cursor-pointer hover:bg-[var(--ds-surface-subtle)] transition-colors text-[var(--ds-text-secondary)]"
                  onClick={() => handleNavigate(data.path.split('/').slice(0, -1).join('/'))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNavigate(data.path.split('/').slice(0, -1).join('/')); }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">📁</span>
                    <span className="truncate">..</span>
                  </div>
                  <span className="w-36 text-sm text-[var(--ds-text-secondary)] text-right flex-shrink-0">-</span>
                  <span className="w-20 text-sm text-[var(--ds-text-secondary)] text-right flex-shrink-0">-</span>
                </div>
              )}

              {/* 文件列表 */}
              {data.items?.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-3 px-4 py-2 border-b border-[var(--ds-border-default)] last:border-b-0 cursor-pointer hover:bg-[var(--ds-surface-subtle)] transition-colors"
                  onClick={() => handleItemClick(item)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleItemClick(item); }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{getFileIcon(item.name, item.type)}</span>
                    <span className="truncate text-[var(--ds-text-primary)]">{item.name}</span>
                  </div>
                  <span className="w-36 text-sm text-[var(--ds-text-secondary)] text-right flex-shrink-0">
                    {formatRelativeTime(new Date(item.updatedAt))}
                  </span>
                  <span className="w-20 text-sm text-[var(--ds-text-secondary)] text-right flex-shrink-0">
                    {item.type === 'dir' ? '-' : formatFileSize(item.size || 0)}
                  </span>
                </div>
              ))}

              {(!data.items || data.items.length === 0) && (
                <div className="text-center py-8 text-[var(--ds-text-secondary)]">此目录为空</div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageLayoutContent></PageLayout>
  );
}
