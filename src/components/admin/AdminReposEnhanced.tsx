// Enhanced Admin Repos Tab Component
// 增强的仓库管理组件 - 参考 GitHub Admin 设计

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  EyeIcon,
  ExternalLinkIcon,
  CopyIcon,
  TrashIcon,
  LockIcon,
  UnlockIcon,
  ArchiveIcon,
  UnarchiveIcon,
  ChevronDownIcon
} from './AdminIcons';
import { SidePanel, AdvancedFilter, BatchActionBar, ConfirmDialog } from './common/AdminCommon';
import type {
  RepositorySummary,
  RepoDetail,
  RepoFilters,
  ContextMenuData
} from './AdminTypes';

interface AdminReposEnhancedProps {
  // 数据
  repos: RepositorySummary[];
  reposTotal: number;
  // 分页
  reposPage: number;
  reposPageSize?: number;
  // 筛选
  filters: RepoFilters;
  // 状态
  reposLoading: boolean;
  selectedRepos: Set<string>;
  contextMenu: ContextMenuData | null;
  selectedRepoDetail: RepoDetail | null;
  repoDetailLoading?: boolean;
  // 操作回调
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: RepoFilters) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onToggleSelect: (id: string) => void;
  // 操作
  onViewDetail: (repoId: string) => void;
  onBrowseFiles: (repo: RepositorySummary) => void;
  onCopyUrl: (url: string) => void;
  onChangeVisibility: (repoId: string, visibility: number) => void;
  onArchiveRepo: (repoId: string) => void;
  onDeleteRepo: (repoId: string) => void;
  onExportRepos: (repoIds?: string[]) => void;
  // 批量操作
  onBatchArchive: (repoIds: string[]) => void;
  onBatchDelete: (repoIds: string[]) => void;
  onBatchChangeVisibility: (repoIds: string[], visibility: number) => void;
  // 右键菜单
  onContextMenu: (e: React.MouseEvent, repoId: string) => void;
  onCloseContextMenu: () => void;
  onRefresh: () => void;
}

export default function AdminReposEnhanced({
  repos,
  reposTotal,
  reposPage,
  reposPageSize = 20,
  filters,
  reposLoading,
  selectedRepos,
  contextMenu,
  selectedRepoDetail,
  repoDetailLoading = false,
  onSearchChange,
  onPageChange,
  onFiltersChange,
  onSelectAll,
  onSelectNone,
  onToggleSelect,
  onViewDetail,
  onBrowseFiles,
  onCopyUrl,
  onChangeVisibility,
  onArchiveRepo,
  onDeleteRepo,
  onExportRepos,
  onBatchArchive,
  onBatchDelete,
  onBatchChangeVisibility,
  onContextMenu,
  onCloseContextMenu,
  onRefresh,
}: AdminReposEnhancedProps) {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'default' | 'danger';
    onConfirm: () => void;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<RepositorySummary | null>(null);

  const totalPages = Math.ceil(reposTotal / reposPageSize);

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, repo: RepositorySummary) => {
    e.preventDefault();
    setContextMenuTarget(repo);
    onContextMenu(e, repo.id);
  };

  // 关闭右键菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      onCloseContextMenu();
    };
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, onCloseContextMenu]);

  // 筛选器配置
  const filterFields = [
    {
      name: 'visibility',
      label: '可见性',
      type: 'select' as const,
      options: [
        { label: '全部', value: '' },
        { label: '公开', value: 'public' },
        { label: '私有', value: 'private' },
      ],
    },
    {
      name: 'language',
      label: '语言',
      type: 'select' as const,
      options: [
        { label: '全部语言', value: '' },
        { label: 'JavaScript', value: 'JavaScript' },
        { label: 'TypeScript', value: 'TypeScript' },
        { label: 'Python', value: 'Python' },
        { label: 'Java', value: 'Java' },
        { label: 'Go', value: 'Go' },
        { label: 'Rust', value: 'Rust' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部状态', value: '' },
        { label: '正常', value: 'active' },
        { label: '已归档', value: 'archived' },
        { label: '已删除', value: 'deleted' },
      ],
    },
    {
      name: 'dateFrom',
      label: '创建时间从',
      type: 'date' as const,
    },
    {
      name: 'dateTo',
      label: '创建时间到',
      type: 'date' as const,
    },
    {
      name: 'starsMin',
      label: 'Star 数最少',
      type: 'number' as const,
      placeholder: '0',
    },
    {
      name: 'starsMax',
      label: 'Star 数最多',
      type: 'number' as const,
      placeholder: '99999',
    },
  ];

  // 批量操作
  const handleBatchAction = (action: 'archive' | 'delete' | 'public' | 'private') => {
    const selected = Array.from(selectedRepos);
    switch (action) {
      case 'archive':
        onBatchArchive(selected);
        break;
      case 'delete':
        setConfirmDialog({
          isOpen: true,
          title: '批量删除仓库',
          message: `确定要删除选中的 ${selected.length} 个仓库吗？此操作不可恢复。`,
          variant: 'danger',
          onConfirm: () => {
            onBatchDelete(selected);
            setConfirmDialog(null);
          },
        });
        break;
      case 'public':
        onBatchChangeVisibility(selected, 0);
        break;
      case 'private':
        onBatchChangeVisibility(selected, 1);
        break;
    }
  };

  return (
    <div className="tab-content">
      {/* 页面标题和操作栏 */}
      <div className="page-header">
        <h1 className="page-title">仓库管理</h1>
        <div className="header-actions">
          <button
            className={`btn btn-secondary btn-sm ${showAdvancedFilter ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <FilterIcon /> 筛选
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onExportRepos()}
          >
            <DownloadIcon /> 导出
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
          >
            刷新
          </button>
          <div className="search-box">
            <SearchIcon />
            <input
              type="search"
              placeholder="搜索仓库名..."
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 高级筛选 */}
      {showAdvancedFilter && (
        <AdvancedFilter
          filters={filterFields}
          values={filters as Record<string, string | number | Date | null>}
          onChange={(name, value) => {
            const updated = { ...filters, [name]: value };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFiltersChange(updated as any);
          }}
          onApply={() => onPageChange(1)}
          onReset={() => onFiltersChange({} as RepoFilters)}
        />
      )}

      {/* 批量操作栏 */}
      <BatchActionBar
        selectedCount={selectedRepos.size}
        onClearSelection={onSelectNone}
        actions={[
          { label: '设为公开', onClick: () => handleBatchAction('public') },
          { label: '设为私有', onClick: () => handleBatchAction('private') },
          { label: '批量归档', onClick: () => handleBatchAction('archive') },
          { label: '批量删除', variant: 'danger', onClick: () => handleBatchAction('delete') },
        ]}
      />

      {/* 仓库列表 */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedRepos.size === repos.length && repos.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectAll();
                    } else {
                      onSelectNone();
                    }
                  }}
                />
              </th>
              <th>仓库名</th>
              <th>所有者</th>
              <th>语言</th>
              <th>⭐ Star</th>
              <th>🍴 Fork</th>
              <th>创建时间</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {reposLoading ? (
              <tr>
                <td colSpan={8} className="text-center">加载中...</td>
              </tr>
            ) : repos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">暂无仓库数据</td>
              </tr>
            ) : (
              repos.map(repo => (
                <tr
                  key={repo.id}
                  onContextMenu={(e) => handleContextMenu(e, repo)}
                  onDoubleClick={() => onViewDetail(repo.id)}
                  className={selectedRepos.has(repo.id) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRepos.has(repo.id)}
                      onChange={() => onToggleSelect(repo.id)}
                    />
                  </td>
                  <td>
                    <div className="repo-cell">
                      <span className="repo-icon">📦</span>
                      <Link
                        href={`/${repo.ownerUsername || 'unknown'}/${repo.name}`}
                        className="repo-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {repo.name}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <Link href={`/${repo.ownerUsername || 'unknown'}`} className="user-link">
                      @{repo.ownerUsername || '未知'}
                    </Link>
                  </td>
                  <td>
                    <span className="language-badge">
                      {repo.language || '-'}
                    </span>
                  </td>
                  <td>
                    <span className="star-count">{repo.starCount ?? 0}</span>
                  </td>
                  <td>
                    <span className="fork-count">{repo.forkCount ?? 0}</span>
                  </td>
                  <td>
                    <span className="date-cell">{formatDate(repo.createdAt)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${getRepoStatus(repo)}`}>
                      {getRepoStatusLabel(repo)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {reposTotal > reposPageSize && (
        <div className="pagination">
          <div className="pagination-info">
            显示 {((reposPage - 1) * reposPageSize) + 1} - {Math.min(reposPage * reposPageSize, reposTotal)} 条，共 {reposTotal} 条
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-secondary btn-sm"
              disabled={reposPage <= 1 || reposLoading}
              onClick={() => onPageChange(reposPage - 1)}
            >
              上一页
            </button>
            <div className="pagination-pages">
              {getPaginationNumbers(reposPage, totalPages).map((page, i) => (
                page === '...' ? (
                  <span key={i} className="pagination-ellipsis">...</span>
                ) : (
                  <button
                    key={i}
                    className={`btn btn-sm ${page === reposPage ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => onPageChange(page as number)}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={reposPage >= totalPages || reposLoading}
              onClick={() => onPageChange(reposPage + 1)}
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 右键上下文菜单 */}
      {contextMenu && contextMenuTarget && (
        <div
          className="context-menu enhanced"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">📦 {contextMenuTarget.name}</span>
          </div>

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onViewDetail(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <EyeIcon /> 查看详情 <span className="shortcut">Enter</span>
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                onBrowseFiles(contextMenuTarget);
                onCloseContextMenu();
              }}
            >
              <ExternalLinkIcon /> 浏览文件
            </button>
            <button
              className="context-menu-item"
              onClick={() => {
                const url = `/${contextMenuTarget.ownerUsername || 'unknown'}/${contextMenuTarget.name}`;
                onCopyUrl(url);
                onCloseContextMenu();
              }}
            >
              <CopyIcon /> 复制仓库地址 <span className="shortcut">Ctrl+C</span>
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <div className="context-menu-submenu">
              <span className="submenu-trigger">
                🌍 修改可见性 <ChevronDownIcon />
              </span>
              <div className="submenu-content">
                <button onClick={() => { onChangeVisibility(contextMenuTarget.id, 0); onCloseContextMenu(); }}>
                  设为公开
                </button>
                <button onClick={() => { onChangeVisibility(contextMenuTarget.id, 1); onCloseContextMenu(); }}>
                  设为私有
                </button>
              </div>
            </div>

            <button
              className="context-menu-item"
              onClick={() => {
                onArchiveRepo(contextMenuTarget.id);
                onCloseContextMenu();
              }}
            >
              <ArchiveIcon /> {contextMenuTarget.deletedAt ? '取消归档' : '归档仓库'}
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item danger"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: '删除仓库',
                  message: `确定要删除仓库 ${contextMenuTarget.name} 吗？此操作不可恢复。`,
                  variant: 'danger',
                  onConfirm: () => {
                    onDeleteRepo(contextMenuTarget.id);
                    setConfirmDialog(null);
                  },
                });
                onCloseContextMenu();
              }}
            >
              <TrashIcon /> 删除仓库 <span className="shortcut">d</span>
            </button>
          </div>

          <div className="context-menu-divider" />

          <div className="context-menu-section">
            <button
              className="context-menu-item"
              onClick={() => {
                onExportRepos([contextMenuTarget.id]);
                onCloseContextMenu();
              }}
            >
              <DownloadIcon /> 导出信息
            </button>
          </div>
        </div>
      )}

      {/* 仓库详情侧边栏 */}
      {(selectedRepoDetail || repoDetailLoading) && (
        <RepoDetailPanel
          repo={selectedRepoDetail}
          isLoading={repoDetailLoading}
          onClose={() => onViewDetail('')}
          onBrowseFiles={() => selectedRepoDetail && onBrowseFiles({ id: selectedRepoDetail.id, name: selectedRepoDetail.name, ownerUsername: selectedRepoDetail.owner?.username || '', visibility: selectedRepoDetail.visibility, starCount: selectedRepoDetail.starCount, forkCount: selectedRepoDetail.forkCount, language: selectedRepoDetail.language, createdAt: selectedRepoDetail.createdAt, updatedAt: selectedRepoDetail.updatedAt } as unknown as RepositorySummary)}
          onChangeVisibility={() => selectedRepoDetail && onChangeVisibility(selectedRepoDetail.id, selectedRepoDetail.visibility === 'private' ? 1 : 0)}
          onArchive={() => selectedRepoDetail && onArchiveRepo(selectedRepoDetail.id)}
          onDelete={() => {
            if (!selectedRepoDetail) return;
            setConfirmDialog({
              isOpen: true,
              title: '删除仓库',
              message: `确定要删除仓库 ${selectedRepoDetail.name} 吗？此操作不可恢复。`,
              variant: 'danger',
              onConfirm: () => {
                onDeleteRepo(selectedRepoDetail.id);
                setConfirmDialog(null);
              },
            });
          }}
        />
      )}

      {/* 确认对话框 */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText="确认"
          cancelText="取消"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

// 仓库详情侧边栏组件
interface RepoDetailPanelProps {
  repo: RepoDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onBrowseFiles: () => void;
  onChangeVisibility: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function RepoDetailPanel({
  repo,
  isLoading = false,
  onClose,
  onBrowseFiles,
  onChangeVisibility,
  onArchive,
  onDelete,
}: RepoDetailPanelProps) {
  // 加载状态
  if (isLoading) {
    return (
      <SidePanel
        isOpen={true}
        onClose={onClose}
        title="加载中..."
        width={520}
      >
        <div className="detail-loading">
          <div className="loading-spinner" />
          <p>正在加载仓库详情...</p>
        </div>
      </SidePanel>
    );
  }

  if (!repo) {
    return null;
  }

  return (
    <SidePanel
      isOpen={true}
      onClose={onClose}
      title={`📦 ${repo.name}`}
      subtitle={`@${repo.owner?.username || ''}`}
      width={520}
    >
      {/* 基本信息 */}
      <div className="detail-section">
        <h3 className="detail-section-title">基本信息</h3>
        <div className="detail-grid">
          <div className="detail-item full-width">
            <span className="detail-label">描述</span>
            <span className="detail-value">{repo.description || '暂无描述'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">语言</span>
            <span className="detail-value">{repo.language || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">默认分支</span>
            <span className="detail-value">{repo.defaultBranch || 'main'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">可见性</span>
            <span className={`status-badge ${repo.visibility === 'public' ? 'active' : 'disabled'}`}>
              {repo.visibility === 'public' ? '公开' : '私有'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">大小</span>
            <span className="detail-value">{repo.sizeFormatted || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">创建时间</span>
            <span className="detail-value">{formatDate(repo.createdAt)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">更新时间</span>
            <span className="detail-value">{formatDate(repo.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* 统计数据 */}
      <div className="detail-section">
        <h3 className="detail-section-title">统计数据</h3>
        <div className="stats-grid-4">
          <div className="mini-stat">
            <span className="mini-stat-value">{repo.starCount}</span>
            <span className="mini-stat-label">⭐ Star</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{repo.forkCount}</span>
            <span className="mini-stat-label">🍴 Fork</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{repo.watcherCount || 0}</span>
            <span className="mini-stat-label">👀 Watch</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value">{repo.openIssues}</span>
            <span className="mini-stat-label">📝 Issues</span>
          </div>
        </div>
      </div>

      {/* 仓库功能 */}
      <div className="detail-section">
        <h3 className="detail-section-title">仓库功能</h3>
        <div className="feature-list">
          <div className="feature-item">
            <span>Issues</span>
            <span className={`feature-status ${repo.hasIssues ? 'enabled' : 'disabled'}`}>
              {repo.hasIssues ? '✓ 已启用' : '✗ 已禁用'}
            </span>
          </div>
          <div className="feature-item">
            <span>Wiki</span>
            <span className={`feature-status ${repo.hasWiki ? 'enabled' : 'disabled'}`}>
              {repo.hasWiki ? '✓ 已启用' : '✗ 已禁用'}
            </span>
          </div>
          <div className="feature-item">
            <span>Projects</span>
            <span className={`feature-status ${repo.hasProjects ? 'enabled' : 'disabled'}`}>
              {repo.hasProjects ? '✓ 已启用' : '✗ 已禁用'}
            </span>
          </div>
        </div>
      </div>

      {/* 最近提交 */}
      {repo.recentCommits && repo.recentCommits.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section-title">最近提交</h3>
          <div className="commit-list">
            {repo.recentCommits.slice(0, 5).map((commit) => (
              <div key={commit.sha} className="commit-item">
                <div className="commit-message">{commit.message}</div>
                <div className="commit-meta">
                  <span className="commit-author">@{commit.authorId}</span>
                  <span className="commit-date">{formatDate(commit.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="detail-section">
        <h3 className="detail-section-title">管理操作</h3>
        <div className="detail-actions">
          <button className="btn btn-secondary btn-block" onClick={onBrowseFiles}>
            浏览文件
          </button>
          <button
            className="btn btn-secondary btn-block"
            onClick={onChangeVisibility}
          >
            {repo.visibility === 'public' ? '设为私有' : '设为公开'}
          </button>
          <button className="btn btn-secondary btn-block" onClick={onArchive}>
            {repo.isArchived ? '取消归档' : '归档仓库'}
          </button>
          <button className="btn btn-danger btn-block" onClick={onDelete}>
            删除仓库
          </button>
        </div>
      </div>
      <style jsx>{`
        .repo-cell { display: flex; align-items: center; gap: 8px; }
        .repo-icon { font-size: 16px; }
        .repo-link { font-weight: 500; color: var(--color-accent-fg); }
        .repo-link:hover { text-decoration: underline; }
        .language-badge {
          display: inline-flex; padding: 2px 8px; border-radius: 12px;
          font-size: 12px; background: var(--color-bg-subtle); color: var(--color-fg-muted);
        }
        .star-count, .fork-count { font-weight: 500; }
        .feature-list { display: flex; flex-direction: column; gap: 8px; }
        .feature-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; background: var(--color-bg-subtle);
          border-radius: 6px; font-size: 13px;
        }
        .feature-status { font-size: 12px; }
        .feature-status.enabled { color: var(--color-success-fg); }
        .feature-status.disabled { color: var(--color-fg-muted); }
        .commit-list { display: flex; flex-direction: column; gap: 8px; }
        .commit-item { padding: 10px 12px; background: var(--color-bg-subtle); border-radius: 6px; }
        .commit-message {
          font-size: 13px; color: var(--color-fg-default); margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .commit-meta { display: flex; gap: 12px; font-size: 11px; color: var(--color-fg-muted); }
        .commit-author { color: var(--color-accent-fg); }
        .detail-item.full-width { grid-column: span 2; }
      `}</style>
    </SidePanel>
  );
}

// 辅助函数
function getRepoStatus(repo: RepositorySummary): string {
  if (repo.deletedAt) return 'disabled';
  if (repo.visibility === 'private') return 'warning';
  return 'active';
}

function getRepoStatusLabel(repo: RepositorySummary): string {
  if (repo.deletedAt) return '已删除';
  if (repo.visibility === 'private') return '私有';
  return '公开';
}

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getPaginationNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  if (current <= 3) {
    pages.push(1, 2, 3, 4, 5, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}


