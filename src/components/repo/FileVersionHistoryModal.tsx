'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HistoryIcon, CloseIcon } from '@/components/repo/RepoIcons';

interface FileVersion {
  id: string;
  version: number;
  fileSize: number;
  changeSize: number;
  message: string | null;
  createdAt: string;
  user?: {
    username: string;
    avatarUrl: string | null;
  };
}

interface FileVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  repoName: string;
  fileId: string;
  fileName: string;
  branch: string;
  currentVersion: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (diffDays > 0) {
    return `${diffDays} 天前`;
  } else if (diffHours > 0) {
    return `${diffHours} 小时前`;
  } else if (diffMins > 0) {
    return `${diffMins} 分钟前`;
  } else {
    return '刚刚';
  }
}

export default function FileVersionHistoryModal({
  isOpen,
  onClose,
  username,
  repoName,
  fileId,
  fileName,
  branch,
  currentVersion,
}: FileVersionHistoryModalProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/repos/${username}/${repoName}/versions/${fileId}?page=${pageNum}&branch=${encodeURIComponent(branch)}`
      );
      const data = await response.json();

      if (data.code === 200) {
        setVersions(data.data.versions || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setPage(pageNum);
      } else {
        setError(data.message || '加载版本历史失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, [username, repoName, fileId, branch]);

  useEffect(() => {
    if (isOpen && fileId) {
      fetchVersions(1);
    }
  }, [isOpen, fileId, fetchVersions]);

  const handleRestore = async (versionNum: number) => {
    if (!confirm(`确定要恢复到版本 ${versionNum} 吗？`)) return;

    setRestoring(String(versionNum));
    try {
      const response = await fetch(
        `/api/v1/repos/${username}/${repoName}/versions/${fileId}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: versionNum, branch }),
        }
      );
      const data = await response.json();

      if (data.code === 200) {
        alert('文件已恢复到指定版本');
        onClose();
        window.location.reload();
      } else {
        alert(data.message || '恢复失败');
      }
    } catch (err) {
      alert('网络错误，请重试');
    } finally {
      setRestoring(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <HistoryIcon />
            <span>版本历史: {fileName}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchVersions(page)}>
                重试
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="empty-state">
              <HistoryIcon />
              <p>暂无版本历史</p>
              <small>文件的每次修改都会记录在版本历史中</small>
            </div>
          ) : (
            <>
              <div className="version-list">
                {versions.map((v) => (
                  <div key={v.id} className={`version-item ${v.version === currentVersion ? 'current' : ''}`}>
                    <div className="version-info">
                      <div className="version-header">
                        <span className="version-number">版本 {v.version}</span>
                        {v.version === currentVersion && (
                          <span className="version-badge current-badge">当前版本</span>
                        )}
                      </div>
                      {v.message && (
                        <div className="version-message">{v.message}</div>
                      )}
                      <div className="version-meta">
                        <span className="version-time">{formatRelativeTime(v.createdAt)}</span>
                        <span className="version-size">
                          {formatFileSize(v.fileSize)}
                          {v.changeSize !== 0 && (
                            <span className={v.changeSize > 0 ? 'change-increase' : 'change-decrease'}>
                              {' '}
                              ({v.changeSize > 0 ? '+' : ''}{formatFileSize(v.changeSize)})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                    {v.version !== currentVersion && (
                      <div className="version-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleRestore(v.version)}
                          disabled={restoring === v.id}
                        >
                          {restoring === v.id ? '恢复中...' : '恢复此版本'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => fetchVersions(page - 1)}
                    disabled={page <= 1}
                  >
                    上一页
                  </button>
                  <span className="pagination-info">
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => fetchVersions(page + 1)}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: var(--color-bg-default);
            border-radius: 8px;
            width: 100%;
            max-width: 800px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }

          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-bottom: 1px solid var(--color-border-default);
          }

          .modal-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 600;
            color: var(--color-fg-default);
          }

          .modal-title svg {
            width: 20px;
            height: 20px;
            color: var(--color-fg-muted);
          }

          .modal-close-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            color: var(--color-fg-muted);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-close-btn:hover {
            background: var(--color-bg-tertiary);
            color: var(--color-fg-default);
          }

          .modal-body {
            padding: 20px;
          }

          .loading-state,
          .error-state,
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            color: var(--color-fg-muted);
          }

          .empty-state svg {
            width: 48px;
            height: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--color-border-default);
            border-top-color: var(--color-accent-fg);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .version-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .version-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 16px;
            border: 1px solid var(--color-border-default);
            border-radius: 6px;
            background: var(--color-bg-tertiary);
            transition: border-color 0.15s;
          }

          .version-item:hover {
            border-color: var(--color-border-tertiary);
          }

          .version-item.current {
            border-color: var(--color-success-fg);
            background: rgba(46, 160, 67, 0.05);
          }

          .version-info {
            flex: 1;
            min-width: 0;
          }

          .version-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }

          .version-number {
            font-weight: 600;
            color: var(--color-fg-default);
          }

          .version-badge {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 500;
          }

          .current-badge {
            background: var(--color-success-emphasis);
            color: white;
          }

          .version-message {
            color: var(--color-fg-default);
            margin-bottom: 8px;
            word-break: break-word;
          }

          .version-meta {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: var(--color-fg-muted);
          }

          .change-increase {
            color: #dc2626;
          }

          .change-decrease {
            color: #16a34a;
          }

          .version-actions {
            margin-left: 16px;
            flex-shrink: 0;
          }

          .pagination {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--color-border-default);
          }

          .pagination-info {
            font-size: 14px;
            color: var(--color-fg-muted);
          }

          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 500;
            border-radius: 6px;
            border: 1px solid;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-secondary {
            background: var(--color-btn-secondary-bg);
            border-color: var(--color-btn-secondary-border);
            color: var(--color-btn-secondary-fg);
          }

          .btn-secondary:hover:not(:disabled) {
            background: var(--color-btn-secondary-hover-bg);
          }

          .btn-sm {
            padding: 4px 10px;
            font-size: 12px;
          }
        `}</style>
      </div>
    </div>
  );
}
