'use client';

import React, { useState } from 'react';

interface RepoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (url: string, fileName: string) => Promise<void>;
}

export default function RepoDownloadModal({
  isOpen,
  onClose,
  onDownload,
}: RepoDownloadModalProps) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadFileName, setDownloadFileName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadFromUrl = async () => {
    if (!downloadUrl.trim()) return;
    setIsDownloading(true);
    try {
      await onDownload(downloadUrl, downloadFileName);
      onClose();
      setDownloadUrl('');
      setDownloadFileName('');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => !isDownloading && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>从URL下载文件</h3>
          <button className="modal-close" onClick={() => !isDownloading && onClose()} disabled={isDownloading}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">文件URL *</label>
            <input
              type="text"
              className="form-input"
              placeholder="https://example.com/file.zip"
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              disabled={isDownloading}
            />
            <small className="form-hint">输入要下载的文件的URL地址</small>
          </div>
          <div className="form-group">
            <label className="form-label">保存文件名（可选）</label>
            <input
              type="text"
              className="form-input"
              placeholder="留空则自动获取文件名"
              value={downloadFileName}
              onChange={(e) => setDownloadFileName(e.target.value)}
              disabled={isDownloading}
            />
            <small className="form-hint">下载后保存到当前目录的名称</small>
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDownloading}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDownloadFromUrl}
            disabled={isDownloading || !downloadUrl.trim()}
          >
            {isDownloading ? (
              <>
                <span className="spinner"></span>
                下载中...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Props 接口供父组件使用
export interface DownloadModalState {
  url: string;
  fileName: string;
  setUrl: (url: string) => void;
  setFileName: (name: string) => void;
}
