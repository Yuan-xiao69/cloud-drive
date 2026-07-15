'use client';

import React, { useState } from 'react';
import { Button, Input, Modal, Field } from '@/components/design';
import toast from 'react-hot-toast';

interface RepoDownloadModalBase {
  isOpen: boolean;
  onClose: () => void;
}

interface RepoZipDownloadModal extends RepoDownloadModalBase {
  mode: 'repo-zip';
  ownerName: string;
  repoName: string;
}

interface FromUrlDownloadModal extends RepoDownloadModalBase {
  mode?: 'from-url';
  onDownload: (url: string, fileName: string) => Promise<void>;
}

type RepoDownloadModalProps = RepoZipDownloadModal | FromUrlDownloadModal;

export default function RepoDownloadModal(props: RepoDownloadModalProps) {
  const { isOpen, onClose } = props;

  // from-url mode state
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadFileName, setDownloadFileName] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // repo-zip mode state
  const [branch, setBranch] = useState('main');

  const isRepoZip = props.mode === 'repo-zip';

  const handleDownloadFromUrl = async () => {
    if (!downloadUrl.trim()) return;
    setIsDownloading(true);
    try {
      if (!isRepoZip && props.onDownload) {
        await props.onDownload(downloadUrl, downloadFileName);
      }
      onClose();
      setDownloadUrl('');
      setDownloadFileName('');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRepoZipDownload = async () => {
    if (!isRepoZip) return;
    setIsDownloading(true);
    try {
      const { ownerName, repoName } = props as RepoZipDownloadModal;
      const apiUrl = `/api/v1/repos/${ownerName}/${repoName}/download?branch=${encodeURIComponent(branch)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: '下载请求失败' }));
        throw new Error(errData.message || '下载请求失败');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${repoName}-${branch}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '下载失败';
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = () => {
    if (isRepoZip) {
      handleRepoZipDownload();
    } else {
      handleDownloadFromUrl();
    }
  };

  if (!isOpen) return null;



  const DownloadSvgIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const handleSafeClose = () => { if (!isDownloading) onClose(); };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSafeClose}
      title={isRepoZip ? `下载仓库 ${(props as RepoZipDownloadModal).repoName}` : '从URL下载文件'}
      maxWidth="512px"
      closeOnOverlay={!isDownloading}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isDownloading}>取消</Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleDownload}
            disabled={isDownloading || (!isRepoZip && !downloadUrl.trim())}
            loading={isDownloading}
            icon={DownloadSvgIcon}
          >
            下载
          </Button>
        </>
      }
    >
        {isRepoZip ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--ds-text-primary)]">仓库</span>
              <div className="text-sm text-[var(--ds-text-secondary)] bg-[var(--ds-surface-subtle)] px-3 py-2 rounded-[var(--ds-radius-sm)]">
                {(props as RepoZipDownloadModal).ownerName} / {(props as RepoZipDownloadModal).repoName}
              </div>
            </div>
            <Field label="分支" hint="输入要下载的分支名称，默认为 main">
              <Input id="download-branch" type="text" placeholder="main" value={branch} onChange={e => setBranch(e.target.value)} disabled={isDownloading} />
            </Field>
          </div>
        ) : (
          <>
            <Field label="文件URL *" hint="输入要下载的文件的URL地址">
              <Input id="download-url" type="text" placeholder="https://example.com/file.zip" value={downloadUrl} onChange={e => setDownloadUrl(e.target.value)} disabled={isDownloading} />
            </Field>
            <Field label="保存文件名（可选）" hint="下载后保存到当前目录的名称">
              <Input id="download-filename" type="text" placeholder="留空则自动获取文件名" value={downloadFileName} onChange={e => setDownloadFileName(e.target.value)} disabled={isDownloading} />
            </Field>
          </>
        )}
    </Modal>
  );
}

export interface DownloadModalState { url: string; fileName: string; setUrl: (url: string) => void; setFileName: (name: string) => void; }
