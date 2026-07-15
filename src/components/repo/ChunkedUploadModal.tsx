'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/design';
import ChunkedUploader from './ChunkedUploader';
import FolderUploader from './FolderUploader';

interface ChunkedUploadModalProps {
  username: string;
  repoName: string;
  currentPath: string;
  branch?: string;  // 当前分支
  onUploadComplete?: () => void;
  onClose?: () => void;
  initialFiles?: File[];
}

type UploadMode = 'file' | 'folder';
type ViewMode = 'select' | 'queue';

interface QueueItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  progress: number;
  error?: string;
}

export default function ChunkedUploadModal({
  username,
  repoName,
  currentPath,
  branch = 'main',
  onUploadComplete,
  onClose,
  initialFiles = []
}: ChunkedUploadModalProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [viewMode, setViewMode] = useState<ViewMode>('select');
  const uploaderRef = useRef<{ triggerFileInput: () => void } | null>(null);

  // 当没有初始文件时，自动触发文件选择器
  useEffect(() => {
    if (initialFiles.length === 0 && uploaderRef.current) {
      // 延迟一点执行，确保组件已完全渲染
      const timer = setTimeout(() => {
        uploaderRef.current?.triggerFileInput();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialFiles.length]);

  // 全局上传队列状态（在整个应用生命周期内保持）
  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => {
    // 从初始文件创建队列项
    return initialFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));
  });

  // 上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 统计数据
  const stats = useMemo(() => {
    const total = queueItems.length;
    const completed = queueItems.filter(f => f.status === 'completed').length;
    const error = queueItems.filter(f => f.status === 'error').length;
    const uploading = queueItems.filter(f => f.status === 'uploading').length;
    const pending = queueItems.filter(f => f.status === 'pending').length;
    const paused = queueItems.filter(f => f.status === 'paused').length;
    return { total, completed, error, uploading, pending, paused };
  }, [queueItems]);

  // 总进度
  const totalProgress = useMemo(() => {
    if (stats.total === 0) return 0;
    const completedProgress = stats.completed * 100;
    const uploadingProgress = queueItems
      .filter(f => f.status === 'uploading')
      .reduce((sum, f) => sum + f.progress, 0);
    return Math.round((completedProgress + uploadingProgress) / stats.total);
  }, [queueItems, stats]);

  // 添加文件到队列
  const addToQueue = useCallback((files: File[]) => {
    const newItems: QueueItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));
    setQueueItems(prev => [...prev, ...newItems]);
    if (viewMode === 'select' && newItems.length > 0) {
      setViewMode('queue');
    }
  }, [viewMode]);

  // 从队列移除
  const removeFromQueue = useCallback((id: string) => {
    setQueueItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // 清除已完成/错误项
  const clearFinished = useCallback(() => {
    setQueueItems(prev => prev.filter(item =>
      item.status !== 'completed' && item.status !== 'error'
    ));
  }, []);

  // 更新队列项状态
  const updateQueueItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueueItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // 单个文件上传完成回调
  const handleFileUploadComplete = useCallback((fileId: string, result: { id: string; name: string; fileSize: number }) => {
    updateQueueItem(fileId, { status: 'completed', progress: 100 });
    // 检查是否全部完成（使用函数式更新避免依赖 queueItems）
    setQueueItems(prev => {
      const remaining = prev.filter(item =>
        item.id !== fileId && item.status !== 'completed' && item.status !== 'error'
      );
      if (remaining.length === 0) {
        setIsUploading(false);
      }
      return prev;
    });
  }, [updateQueueItem]);

  // 单个文件上传错误回调
  const handleFileUploadError = useCallback((fileId: string, error: string) => {
    updateQueueItem(fileId, { status: 'error', error });
  }, [updateQueueItem]);

  // 单个文件上传进度回调
  const handleFileUploadProgress = useCallback((fileId: string, progress: number) => {
    updateQueueItem(fileId, { status: 'uploading', progress });
  }, [updateQueueItem]);

  // 开始上传
  const handleStartUpload = useCallback(() => {
    setIsUploading(true);
    setIsPaused(false);
  }, []);

  // 全部暂停
  const handlePauseAll = useCallback(() => {
    setIsPaused(true);
  }, []);

  // 全部继续
  const handleResumeAll = useCallback(() => {
    setIsPaused(false);
  }, []);

  // 重试失败项
  const handleRetryFailed = useCallback(() => {
    setQueueItems(prev => prev.map(item =>
      item.status === 'error' ? { ...item, status: 'pending', progress: 0, error: undefined } : item
    ));
  }, []);

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 处理粘贴事件
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        addToQueue(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addToQueue]);

  return (
    <>
      {/* 模式切换 + 总进度条（从原 header 移入 body） */}
      <div className="flex items-center gap-3 mb-4">
        {viewMode === 'queue' && stats.total > 0 && (
          <div className="upload-progress-inline">
            <div className="progress-mini">
              <div className="progress-mini-fill" style={{ width: `${totalProgress}%` }} />
            </div>
            <span className="progress-mini-text">{totalProgress}%</span>
          </div>
        )}

        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'file' ? 'active' : ''}`}
            onClick={() => setMode('file')}
          >
            📄 上传文件
          </button>
          <button
            className={`mode-tab ${mode === 'folder' ? 'active' : ''}`}
            onClick={() => setMode('folder')}
          >
            📁 上传文件夹
          </button>
        </div>
      </div>

      {/* 上传队列视图 */}
      {viewMode === 'queue' && stats.total > 0 && (
        <div className="queue-view">
          {/* 队列统计 */}
          <div className="queue-stats">
            <span className="text-sm text-[var(--ds-success-default)]">✓ {stats.completed} 已完成</span>
            {stats.uploading > 0 && <span className="text-sm text-[var(--ds-accent-default)]">⟳ {stats.uploading} 上传中</span>}
            {stats.paused > 0 && <span className="text-sm text-[var(--ds-warning-default)]">⏸ {stats.paused} 已暂停</span>}
            {stats.error > 0 && <span className="text-sm text-[var(--ds-danger-default)]">✗ {stats.error} 失败</span>}
            <span className="text-sm text-[var(--ds-text-secondary)]">○ {stats.pending} 等待</span>
          </div>

          {/* 队列操作栏 */}
          <div className="queue-actions">
            {!isUploading && stats.pending > 0 && (
              <Button variant="primary" size="sm" onClick={handleStartUpload}>
                ▶ 开始上传
              </Button>
            )}
            {isUploading && !isPaused && (
              <Button variant="outline" size="sm" onClick={handlePauseAll}>
                ⏸ 全部暂停
              </Button>
            )}
            {isUploading && isPaused && (
              <Button variant="primary" size="sm" onClick={handleResumeAll}>
                ▶ 继续上传
              </Button>
            )}
            {stats.error > 0 && (
              <Button variant="secondary" size="sm" onClick={handleRetryFailed}>
                ↻ 重试失败
              </Button>
            )}
            {(stats.completed > 0 || stats.error > 0) && (
              <Button variant="secondary" size="sm" onClick={clearFinished}>
                清除已完成
              </Button>
            )}
          </div>

          {/* 队列列表 */}
          <div className="queue-list">
            {queueItems.map(item => (
              <div key={item.id} className={`queue-item queue-item-${item.status}`}>
                <span className="queue-item-icon">
                  {item.status === 'completed' ? '✓' :
                   item.status === 'error' ? '✗' :
                   item.status === 'paused' ? '⏸' :
                   item.status === 'uploading' ? '⟳' : '○'}
                </span>
                <div className="queue-item-info">
                  <div className="queue-item-name">{item.file.name}</div>
                  <div className="queue-item-meta">
                    <span>{formatFileSize(item.file.size)}</span>
                    {item.status === 'uploading' && <span>{item.progress}%</span>}
                    {item.status === 'error' && <span className="error-text">{item.error}</span>}
                  </div>
                  {item.status === 'uploading' && (
                    <div className="queue-item-progress">
                      <div className="progress-bar-mini">
                        <div className="progress-bar-mini-fill" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="queue-item-actions">
                  {item.status === 'pending' && (
                    <button
                      className="queue-action-btn"
                      onClick={() => updateQueueItem(item.id, { status: 'paused' })}
                      title="暂停"
                    >
                      ⏸
                    </button>
                  )}
                  {item.status === 'paused' && (
                    <button
                      className="queue-action-btn"
                      onClick={() => updateQueueItem(item.id, { status: 'pending' })}
                      title="继续"
                    >
                      ▶
                    </button>
                  )}
                  {item.status === 'error' && (
                    <button
                      className="queue-action-btn"
                      onClick={() => updateQueueItem(item.id, { status: 'pending', error: undefined })}
                      title="重试"
                    >
                      ↻
                    </button>
                  )}
                  {(item.status === 'pending' || item.status === 'error' || item.status === 'paused') && (
                    <button
                      className="queue-action-btn queue-action-remove"
                      onClick={() => removeFromQueue(item.id)}
                      title="移除"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 上传组件区域 */}
      {mode === 'file' ? (
        <ChunkedUploader
          ref={uploaderRef}
          username={username}
          repoName={repoName}
          currentPath={currentPath}
          branch={branch}
          onUploadComplete={(result) => {
            // 找到对应的队列项并标记为完成
            const queueItem = queueItems.find(item => item.file.name === result.name);
            if (queueItem) {
              handleFileUploadComplete(queueItem.id, result);
            }
            onUploadComplete?.();
          }}
          onClose={onClose}
          maxConcurrent={3}
          onFilesSelected={addToQueue}
          showQueueButton={true}
        />
      ) : (
        <FolderUploader
          username={username}
          repoName={repoName}
          currentPath={currentPath}
          branch={branch}
          onUploadComplete={() => {
            onUploadComplete?.();
          }}
          onClose={onClose}
        />
      )}

      {/* 粘贴提示 */}
      <div className="paste-hint">
        💡 提示：可直接 Ctrl+V 粘贴截图或文件
      </div>

      <style>{`
        .upload-progress-inline {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-mini {
          width: 60px;
          height: 4px;
          background: var(--ds-border-default);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-mini-fill {
          height: 100%;
          background: var(--ds-accent-default);
          transition: width 0.3s;
        }

        .progress-mini-text {
          font-size: 12px;
          color: var(--ds-text-secondary);
          min-width: 32px;
        }

        .mode-tabs {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .mode-tab {
          padding: 6px 12px;
          border: 1px solid var(--ds-border-default);
          background: var(--ds-surface-subtle);
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-tab:hover {
          background: var(--ds-border-default);
        }

        .mode-tab.active {
          background: var(--ds-accent-default);
          border-color: var(--ds-accent-default);
          color: #fff;
        }

        /* 队列视图样式 */
        .queue-view {
          margin-bottom: 16px;
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          overflow: hidden;
        }

        .queue-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px;
          background: var(--ds-surface-subtle);
          border-bottom: 1px solid var(--ds-border-default);
        }

        .queue-actions {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid var(--ds-border-default);
        }

        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--ds-border-default);
        }

        .action-primary {
          background: var(--ds-accent-default);
          border-color: var(--ds-accent-default);
          color: #fff;
        }

        .action-primary:hover {
          background: var(--ds-accent-default);
        }

        .action-warning {
          background: var(--ds-warning-subtle);
          border-color: var(--ds-warning-default);
          color: var(--ds-warning-default);
        }

        .action-warning:hover {
          background: var(--ds-warning-subtle);
          opacity: 0.8;
        }

        .action-retry {
          background: var(--ds-success-subtle);
          border-color: var(--ds-success-default);
          color: var(--ds-success-default);
        }

        .action-retry:hover {
          background: var(--ds-success-subtle);
          opacity: 0.8;
        }

        .action-secondary {
          background: var(--ds-surface-subtle);
          color: var(--ds-text-primary);
        }

        .action-secondary:hover {
          background: var(--ds-border-default);
        }

        .queue-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .queue-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--ds-border-default);
        }

        .queue-item:last-child {
          border-bottom: none;
        }

        .queue-item-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }

        .queue-item-completed .queue-item-icon {
          color: var(--ds-success-default);
        }

        .queue-item-error .queue-item-icon {
          color: var(--ds-danger-default);
        }

        .queue-item-paused .queue-item-icon {
          color: var(--ds-warning-default);
        }

        .queue-item-uploading .queue-item-icon {
          color: var(--ds-accent-default);
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .queue-item-info {
          flex: 1;
          min-width: 0;
        }

        .queue-item-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--ds-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-item-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: var(--ds-text-secondary);
          margin-top: 2px;
        }

        .error-text {
          color: var(--ds-danger-default);
        }

        .queue-item-progress {
          margin-top: 4px;
        }

        .progress-bar-mini {
          height: 3px;
          background: var(--ds-border-default);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar-mini-fill {
          height: 100%;
          background: var(--ds-accent-default);
          transition: width 0.2s;
        }

        .queue-item-actions {
          display: flex;
          gap: 4px;
        }

        .queue-action-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--ds-text-secondary);
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .queue-action-btn:hover {
          background: var(--ds-border-default);
          color: var(--ds-text-primary);
        }

        .queue-action-remove:hover {
          background: var(--ds-danger-subtle);
          color: var(--ds-danger-default);
        }

        .paste-hint {
          margin-top: 12px;
          padding: 8px 12px;
          background: var(--ds-surface-subtle);
          border-radius: 6px;
          font-size: 12px;
          color: var(--ds-text-secondary);
        }
      `}</style>
    </>
  );
}
