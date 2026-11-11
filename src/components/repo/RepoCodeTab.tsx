'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import FileTree from '@/components/repo/FileTree';
import {
  RepoIcon,
  FileIcon,
  FolderIcon,
  GitBranchIcon,
  ChevronDownIcon,
  UploadIcon,
  HistoryIcon,
} from '@/components/repo/RepoIcons';
import { useRepoNavigation } from './hooks/useRepoNavigation';
import { useRepoFiles } from './hooks/useRepoFiles';
import { useRepoUpload } from './hooks/useRepoUpload';
import { useRepoSelection } from './hooks/useRepoSelection';
import type { RepoItem } from './RepoTypes';
import { formatFileSize, formatTimeAgo } from '@/lib/utils';
import { Button } from '@/components/design';
import toast from 'react-hot-toast';

interface RepoCodeTabProps {
  username: string;
  repoName: string;
  isOwner: boolean;
  currentUser: { username: string } | null;
  repoStats: Record<string, unknown> | null;
  repo: { id?: string; description: string | null; language: string | null; starCount?: number; forkCount?: number; watchCount?: number; defaultBranch?: string; owner?: { username: string } | null } | null;
  // === 从 page 传入的 state ===
  files: RepoItem[];
  readmeContent: string | null;
  currentPath: string[];
  currentBranch: string;
  repoBranches: { id: string; name: string; isDefault: boolean }[];
  showBranchDropdown: boolean;
  isUploading: boolean;
  uploadProgress: number;
  isDragging: boolean;
  isGlobalDragging: boolean;
  selectedFiles: Set<string>;
  isSelecting: boolean;
  batchOperation: string | null;
  moveTargetPath: string;
  isBatchOperating: boolean;
  singleMoveFile: { name: string; type: string; path: string } | null;
  singleMoveTarget: string;
  isSingleMoving: boolean;
  contextMenu: { x: number; y: number; show: boolean; targetFile?: { name: string; type: string; fileId?: string } };
  // === 从 page 传入的 setter ===
  setFiles: (files: RepoItem[]) => void;
  setCurrentPath: (path: string[]) => void;
  setCurrentBranch: (branch: string) => void;
  setShowBranchDropdown: (show: boolean) => void;
  setIsUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
  setIsDragging: (v: boolean) => void;
  setIsGlobalDragging: (v: boolean) => void;
  setSelectedFiles: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setIsSelecting: (v: boolean) => void;
  setBatchOperation: (op: string | null) => void;
  setMoveTargetPath: (p: string) => void;
  setIsBatchOperating: (v: boolean) => void;
  setSingleMoveFile: (f: { name: string; type: string; path: string } | null) => void;
  setSingleMoveTarget: (t: string) => void;
  setIsSingleMoving: (v: boolean) => void;
  setContextMenu: (m: { x: number; y: number; show: boolean; targetFile?: { name: string; type: string; fileId?: string } }) => void;
  // === 外部回调（page 管理） ===
  onOpenNewModal: (type: 'file' | 'folder') => void;
  onOpenChunkedUploadModal: () => void;
  onOpenDownloadModal: () => void;
  onOpenVersionHistory: (fileId: string, fileName: string) => void;
}

export default function RepoCodeTab(props: RepoCodeTabProps) {
  const {
    username, repoName, isOwner, currentUser, repoStats, repo,
    files, readmeContent, currentPath, currentBranch, repoBranches, showBranchDropdown,
    isUploading, uploadProgress, isDragging, isGlobalDragging,
    selectedFiles, isSelecting, batchOperation, moveTargetPath,
    isBatchOperating, singleMoveFile, singleMoveTarget, isSingleMoving, contextMenu,
    setFiles, setCurrentPath, setCurrentBranch, setShowBranchDropdown,
    setIsUploading, setUploadProgress, setIsDragging, setIsGlobalDragging,
    setSelectedFiles, setIsSelecting, setBatchOperation, setMoveTargetPath,
    setIsBatchOperating, setSingleMoveFile, setSingleMoveTarget, setIsSingleMoving, setContextMenu,
    onOpenNewModal, onOpenChunkedUploadModal, onOpenDownloadModal, onOpenVersionHistory,
  } = props;

  const router = useRouter();
  const newName = '';
  const targetName = '';
  const isRoot = currentPath.length === 0;

  // ========== 初始化 hooks ==========

  const navHook = useRepoNavigation({
    username, repoName, currentPath, currentBranch,
    setCurrentPath, setCurrentBranch, setFiles,
  });

  const filesHook = useRepoFiles({
    username, repoName, currentPath, currentBranch,
    setFiles, refreshFiles: navHook.refreshFiles,
  });

  const uploadHook = useRepoUpload({
    username, repoName, isOwner, currentPath, currentBranch,
    setIsUploading, setUploadProgress, setIsDragging,
    refreshFiles: navHook.refreshFiles,
  });

  const selectionHook = useRepoSelection({
    username, repoName, isOwner, currentUser,
    currentPath, currentBranch, files,
    refreshFiles: navHook.refreshFiles,
    onOpenNewModal, onOpenChunkedUploadModal, onOpenDownloadModal, onOpenVersionHistory,
    setSelectedFiles, setIsSelecting, setBatchOperation, setMoveTargetPath,
    setIsBatchOperating, setSingleMoveFile, setSingleMoveTarget, setIsSingleMoving, setContextMenu,
    selectedFiles, batchOperation, moveTargetPath, singleMoveFile, singleMoveTarget, contextMenu,
  });

  // ========== useEffects ==========

  // 键盘快捷键 - Backspace 返回上级目录
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 'Backspace' && currentPath.length > 0) {
        e.preventDefault();
        navHook.handleGoBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, navHook.handleGoBack]);

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClick = () => selectionHook.closeContextMenu();
    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.show, selectionHook.closeContextMenu]);

  // ========== 工具函数 ==========

  const folderCount = files.filter(f => f.type === 'dir').length;
  const fileCount = files.filter(f => f.type === 'file').length;
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const allSelected = files.length > 0 && files.every(f => selectedFiles.has(f.name));
  const readmeFile = files.find(f => f.name === 'README.md');

  // ========== 渲染 ==========

  return (
    <div className="flex flex-col min-h-0">
      {/* Toolbar — 对齐样本 */}
      <div className="flex items-center justify-between px-5 py-3 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-muted)]">
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onOpenChunkedUploadModal}>
            <UploadIcon />
            上传文件
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onOpenNewModal('folder')}>
            <FolderIcon />
            新建文件夹
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenDownloadModal} disabled={selectedFiles.size === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            下载选中
          </Button>
          {/* 克隆仓库下拉 — 对齐样本 */}
          <select className="px-2 py-1 text-xs font-ui border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface)] text-[var(--ds-text-secondary)] cursor-pointer focus:outline-none focus:border-[var(--ds-accent)]">
            <option>克隆仓库</option>
            <option>HTTPS</option>
            <option>SSH</option>
          </select>
          {/* 删除 — 子目录始终可见（对齐样本） */}
          {isOwner && !isRoot && (
            <Button variant="secondary" size="sm" onClick={() => setBatchOperation('delete')} disabled={selectedFiles.size === 0} className={selectedFiles.size > 0 ? 'text-[var(--ds-danger-default)]' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              删除
            </Button>
          )}
          {isUploading && (
            <span className="text-xs text-[var(--ds-text-secondary)] ml-2">上传中... {uploadProgress}%</span>
          )}
        </div>
        <div className="text-xs text-[var(--ds-text-tertiary)]">
          {(() => {
            let statsText = '';
            if (folderCount > 0) statsText += `${folderCount} 个文件夹`;
            if (fileCount > 0) {
              if (statsText) statsText += ' · ';
              statsText += `${fileCount} 个文件`;
            }
            if (totalSize > 0) {
              statsText += ` · 总大小 ${formatFileSize(totalSize)}`;
            }
            if (!statsText) return null;
            return <span>共 {statsText}</span>;
          })()}
        </div>
      </div>

      {/* 主内容区：根目录两栏 | 子目录全宽 */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-auto">
        <main className={isRoot ? 'flex-1 min-w-0' : 'flex-1 min-w-0 w-full'}>

          {/* Breadcrumb — 子目录时显示 */}
          {!isRoot && (
            <div className="flex items-center gap-1 py-2 px-3 mb-3 border border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)] text-sm">
              <Button variant="ghost" size="sm" onClick={navHook.handleGoBack} title="返回上级目录 (Backspace)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </Button>
              <Link href={`/${username}/${repoName}`} className="flex items-center gap-1.5 px-2 py-1 hover:bg-[var(--ds-surface-inset)] transition-colors font-medium text-[var(--ds-text-primary)]">
                <RepoIcon /><span>{repoName}</span>
              </Link>
              {currentPath.map((part, i) => (
                <React.Fragment key={i}>
                  <span className="text-[var(--ds-text-secondary)] mx-0.5">/</span>
                  <Button variant="ghost" size="sm" onClick={() => navHook.navigateToPath(i + 1)} title={`跳转到 ${part}`}>
                    {part}
                  </Button>
                </React.Fragment>
              ))}
              {repoBranches.length > 1 && (
                <div className="ml-auto relative">
                  <Button variant="secondary" size="sm" onClick={() => setShowBranchDropdown(!showBranchDropdown)}>
                    <GitBranchIcon /><span>{currentBranch}</span><ChevronDownIcon />
                  </Button>
                  {showBranchDropdown && (
                    <div className="repo-branch-dropdown">
                      {repoBranches.map((branch) => (
                        <Button key={branch.id} variant="ghost" size="sm" onClick={() => { setCurrentBranch(branch.name); setShowBranchDropdown(false); }}>
                          <GitBranchIcon /><span>{branch.name}</span>
                          {branch.isDefault && <span className="branch-default">默认</span>}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File List */}
          <div
            className={`file-list ${isDragging ? 'dragging' : ''}`}
            onDragOver={uploadHook.handleDragOver}
            onDragLeave={uploadHook.handleDragLeave}
            onDrop={uploadHook.handleDrop}
            onContextMenu={selectionHook.handleContextMenu}
          >
            <input type="file" id="file-upload-input" className="hidden" multiple onChange={(e) => { uploadHook.handleFileUpload(e.target.files); e.target.value = ''; }} />

            {isDragging && isOwner && (
              <div className="drop-overlay"><div className="drop-overlay-content"><UploadIcon /><span>拖放文件到此处上传</span></div></div>
            )}

            {/* 批量选择工具栏 */}
            {isSelecting && selectedFiles.size > 0 && (
              <div className="batch-toolbar">
                <div className="batch-toolbar-info">
                  <span>已选择 {selectedFiles.size} 项</span>
                  <Button variant="ghost" size="sm" onClick={selectionHook.clearSelection}>取消</Button>
                </div>
                <div className="batch-toolbar-actions">
                  {isOwner && (
                    <>
                      <Button variant="danger" size="sm" onClick={() => setBatchOperation('delete')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        删除
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setBatchOperation('move')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>
                        移动
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {batchOperation === 'move' && (
              <div className="batch-move-input">
                <input type="text" className="w-full px-3 py-2 border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-subtle)]" placeholder="输入目标文件夹路径（如：folder1 或 folder1/folder2）" value={moveTargetPath} onChange={(e) => setMoveTargetPath(e.target.value)} />
                <Button variant="primary" size="sm" onClick={selectionHook.handleBatchMove} disabled={isBatchOperating || !moveTargetPath.trim()}>{isBatchOperating ? '移动中...' : '确认移动'}</Button>
                <Button variant="secondary" size="sm" onClick={() => { setBatchOperation(null); setMoveTargetPath(''); }}>取消</Button>
              </div>
            )}

            {batchOperation === 'delete' && (
              <div className="batch-delete-confirm">
                <span>确定删除选中的 {selectedFiles.size} 个项目吗？</span>
                <Button variant="danger" size="sm" onClick={selectionHook.handleBatchDelete} disabled={isBatchOperating}>{isBatchOperating ? '删除中...' : '确认删除'}</Button>
                <Button variant="secondary" size="sm" onClick={() => setBatchOperation(null)}>取消</Button>
              </div>
            )}

            {singleMoveFile && (
              <div className="single-move-modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] p-5 z-[1000] min-w-[400px] shadow-lg">
                <h3 className="mb-4">移动 {singleMoveFile.type === 'dir' ? '文件夹' : '文件'}</h3>
                <p className="m-0 mb-2 text-sm text-[var(--ds-text-secondary)]">正在移动：<strong>{singleMoveFile.name}</strong></p>
                <div className="mb-4">
                  <label htmlFor="single-move-target" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">目标路径</label>
                  <input id="single-move-target" type="text" className="w-full px-3 py-2 border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-subtle)]" placeholder="输入目标文件夹路径（如：folder1 或 folder1/folder2），留空则移动到根目录" value={singleMoveTarget} onChange={(e) => setSingleMoveTarget(e.target.value)} />
                  <small className="block text-xs text-[var(--ds-text-secondary)] mt-1">目标路径不应包含文件名</small>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => { setSingleMoveFile(null); setSingleMoveTarget(''); }} disabled={isSingleMoving}>取消</Button>
                  <Button variant="primary" size="sm" onClick={selectionHook.handleSingleMove} disabled={isSingleMoving}>{isSingleMoving ? '移动中...' : '确认移动'}</Button>
                </div>
              </div>
            )}

            {/* 文件表格 — 对齐样本：表头 checkbox + 名称 | 大小 | 修改时间 */}
            <table className="w-full bg-[var(--ds-surface)] border-collapse">
              <thead>
                <tr>
                  <th className="w-10 px-3 py-2.5 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)]">
                    <input type="checkbox" className="accent-[var(--ds-accent)]" checked={allSelected && files.length > 0} onChange={() => {
                      if (allSelected) { selectionHook.clearSelection(); }
                      else { files.forEach(f => { if (!selectedFiles.has(f.name)) selectionHook.toggleSelectFile(f.name); }); }
                    }} />
                  </th>
                  <th className="px-3 py-2.5 text-left font-ui text-xs font-semibold text-[var(--ds-text-tertiary)] bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)]">名称</th>
                  <th className="w-[120px] px-3 py-2.5 text-left font-ui text-xs font-semibold text-[var(--ds-text-tertiary)] bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)]">大小</th>
                  <th className="w-[140px] px-3 py-2.5 text-left font-ui text-xs font-semibold text-[var(--ds-text-tertiary)] bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)]">修改时间</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const isSelected = selectedFiles.has(file.name);
                  return (
                  <tr
                    key={file.fileId || file.name}
                    className={`${isSelected ? 'bg-[var(--ds-accent-subtle)]' : ''} hover:bg-[var(--ds-surface-subtle)] transition-colors cursor-pointer`}
                    onClick={() => {
                      if (isSelecting) { selectionHook.toggleSelectFile(file.name); }
                      else if (file.type === 'dir') { navHook.handleEnterFolder(file.name); }
                      else { router.push(`/${username}/${repoName}/blob/${currentPath.length > 0 ? currentPath.join('/') + '/' + file.name : file.name}?branch=${encodeURIComponent(currentBranch)}`); }
                    }}
                    onContextMenu={(e) => selectionHook.handleFileContextMenu(e, { name: file.name, type: file.type, fileId: file.fileId })}
                  >
                    <td className="px-3 py-2 border-b border-[var(--ds-border-muted)]">
                      <input type="checkbox" className="accent-[var(--ds-accent)]" checked={isSelected} onChange={(e) => { e.stopPropagation(); selectionHook.toggleSelectFile(file.name); }} />
                    </td>
                    <td className="px-3 py-2 border-b border-[var(--ds-border-muted)]">
                      <div className="flex items-center gap-2 font-ui text-[13px]">
                        <span className="text-[var(--ds-text-tertiary)]">{file.type === 'dir' ? <FolderIcon /> : <FileIcon />}</span>
                        <span className={`${file.type === 'dir' ? 'font-semibold' : ''} text-[var(--ds-accent)]`}>{file.name}{file.type === 'dir' ? '/' : ''}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b border-[var(--ds-border-muted)]">
                      <span className="font-ui text-[11px] text-[var(--ds-text-tertiary)]">{file.type === 'dir' ? '—' : file.sizeFormatted || (file.size ? formatFileSize(file.size) : '—')}</span>
                    </td>
                    <td className="px-3 py-2 border-b border-[var(--ds-border-muted)]">
                      <span className="font-ui text-[11px] text-[var(--ds-text-tertiary)]">{file.updatedAt ? formatTimeAgo(file.updatedAt) : '—'}</span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>

            {files.length === 0 && (
              <div className="file-empty">
                <FolderIcon />
                <p>暂无文件</p>
              </div>
            )}

            {/* 子目录拖拽上传提示 */}
            {!isRoot && (
              <div className="m-3 p-3 border-2 border-dashed border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-center text-[var(--ds-text-tertiary)] font-ui text-[13px]">
                拖拽文件到此处上传，或点击上方「上传文件」按钮
              </div>
            )}
          </div>

          {/* README — 只在根目录显示，对齐样本 margin:20px */}
          {isRoot && readmeContent !== undefined && (
            <div className="m-5 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-md)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-muted)] font-ui text-[13px] font-semibold text-[var(--ds-text-secondary)]">
                <span className="flex items-center gap-2"><FileIcon />README.md</span>
                <span className="font-ui text-[11px] font-normal text-[var(--ds-text-tertiary)]">
                  由 {repo?.owner?.username || username} 更新于 {readmeFile?.updatedAt ? formatTimeAgo(readmeFile.updatedAt) : '最近'}
                </span>
              </div>
              <div className="p-6 bg-[var(--ds-surface)]">
                {readmeContent ? (
                  <pre className="whitespace-pre-wrap font-body text-[14px] leading-relaxed text-[var(--ds-text)]">{readmeContent}</pre>
                ) : (
                  <div className="readme-empty">
                    <svg className="readme-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p className="readme-empty-text">暂无 README 内容</p>
                    <p className="readme-empty-hint">创建一个 README.md 文件来介绍你的项目</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* 侧边栏 — 仅在根目录显示，对齐样本 244px */}
        {isRoot && (
          <aside className="w-[244px] flex-shrink-0">
            {/* 仓库简介卡片 */}
            <div className="border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface)] overflow-hidden mb-4">
              <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-muted)]">
                <span className="font-ui text-xs font-semibold text-[var(--ds-text-secondary)]">仓库简介</span>
                {isOwner && (
                  <button className="text-[11px] text-[var(--ds-accent)] bg-transparent border-none cursor-pointer font-ui hover:underline">
                    编辑
                  </button>
                )}
              </div>
              <div className="p-3">
                <p className="text-[13px] text-[var(--ds-text-secondary)] leading-relaxed mb-3">{repo?.description || '暂无描述'}</p>

                {repo?.language && (
                  <div className="mb-2">
                    <span className="text-[11px] text-[var(--ds-text-tertiary)]">语言</span>
                    <span className="text-sm text-[var(--ds-text-primary)] ml-2">{repo.language}</span>
                  </div>
                )}

                {/* Stats — 对齐样本：收藏 | 关注 | 拉入 | 下载 */}
                <div className="border-t border-[var(--ds-border-muted)] mt-3 pt-3">
                  <div className="sidebar-stat">⭐ <strong>{repo?.starCount ?? 0}</strong> 收藏</div>
                  <div className="sidebar-stat">👁 <strong>{repo?.watchCount ?? 0}</strong> 关注</div>
                  <div className="sidebar-stat">🍴 <strong>{repo?.forkCount ?? 0}</strong> 拉入</div>
                  <div className="sidebar-stat">📦 <strong>{repoStats ? String((repoStats as Record<string, unknown>).totalSizeFormatted ?? '0 B') : '0 B'}</strong> 大小</div>
                </div>

                {/* License */}
                <div className="border-t border-[var(--ds-border-muted)] mt-3 pt-2.5 font-ui text-xs text-[var(--ds-text-tertiary)]">
                  MIT License
                </div>
              </div>
            </div>

            {/* 协作者卡片 */}
            <div className="border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-muted)]">
                <span className="font-ui text-xs font-semibold text-[var(--ds-text-secondary)]">协作者</span>
                {isOwner && (
                  <button className="text-[11px] text-[var(--ds-accent)] bg-transparent border-none cursor-pointer font-ui hover:underline">
                    管理
                  </button>
                )}
              </div>
              <div className="p-2">
                <div className="flex items-center gap-2 py-1.5">
                  <span className="w-7 h-7 rounded-full bg-[var(--ds-accent-subtle)] text-[var(--ds-accent)] flex items-center justify-center font-ui text-xs font-bold">{username[0]?.toUpperCase()}</span>
                  <div className="font-ui text-xs text-[var(--ds-text)] leading-tight">
                    <div>{username}</div>
                    <div className="text-[11px] text-[var(--ds-text-tertiary)]">所有者</div>
                  </div>
                </div>
                <button className="block w-full text-center py-1.5 mt-2 font-ui text-xs text-[var(--ds-accent)] bg-transparent border border-dashed border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] cursor-pointer hover:bg-[var(--ds-accent-subtle)]">
                  + 邀请协作者
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {contextMenu.targetFile && isOwner && (
            <>
              <button className="context-menu-item" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const fileName = contextMenu.targetFile?.name || '';
                if (newName && newName !== fileName && contextMenu.targetFile) { filesHook.handleRename(contextMenu.targetFile.name, newName); } selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                <span>重命名</span>
              </button>
              <button className="context-menu-item" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const fileName = contextMenu.targetFile?.name || ''; const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName; setSingleMoveFile({ name: fileName, type: contextMenu.targetFile?.type || 'file', path: fullPath }); setSingleMoveTarget(currentPath.length > 0 ? currentPath.join('/') + '/' : ''); selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>
                <span>移动到...</span>
              </button>
              <button className="context-menu-item" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const fileName = contextMenu.targetFile?.name || ''; const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName; const targetDir = currentPath.length > 0 ? currentPath.join('/') + '/' : '';
                if (!targetName) { selectionHook.closeContextMenu(); return; } const targetPath = targetDir + targetName; if (targetPath === fullPath) { toast.success('源路径和目标路径相同'); selectionHook.closeContextMenu(); return; } try { const data = await api.post(`/api/v1/repos/${username}/${repoName}/copy`, { sources: [{ sourcePath: fullPath, targetPath }], branch: currentBranch, recursive: true }); if (data.code === 200) { toast.success(`复制成功！已复制到 ${targetPath}`); await navHook.refreshFiles(); } else { toast.error(data.message || '复制失败'); } } catch { toast.error('复制失败，请重试'); } selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                <span>复制到...</span>
              </button>
              {contextMenu.targetFile?.type === 'file' && contextMenu.targetFile?.fileId && (
                <>
                  <div className="context-menu-divider" />
                  <button className="context-menu-item" onClick={() => { selectionHook.handleContextVersionHistory(contextMenu.targetFile?.fileId || '', contextMenu.targetFile?.name || ''); }}>
                    <HistoryIcon /><span>版本历史</span>
                  </button>
                </>
              )}
              <div className="context-menu-divider" />
              <button className="context-menu-item text-[var(--ds-danger-default)]" onClick={selectionHook.handleDeleteItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                <span>删除 {contextMenu.targetFile.type === 'dir' ? '文件夹' : '文件'}</span>
              </button>
              <div className="context-menu-divider" />
            </>
          )}
          <button className="context-menu-item" onClick={selectionHook.handleContextCreateFolder}><FolderIcon /><span>新建文件夹</span></button>
          <button className="context-menu-item" onClick={selectionHook.handleContextUpload}><UploadIcon /><span>上传文件</span></button>
          <div className="context-menu-divider" />
          <button className="context-menu-item" onClick={selectionHook.handleContextDownloadFromUrl}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span>从URL下载</span>
          </button>
        </div>
      )}

      {/* 全局拖拽覆盖层 */}
      {isGlobalDragging && isOwner && (
        <div className="global-drag-overlay">
          <div className="global-drag-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            <span>释放以上传文件</span>
          </div>
        </div>
      )}
  </div>
  );
}
