'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@/lib/api/client';
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

interface RepoCodeTabProps {
  username: string;
  repoName: string;
  isOwner: boolean;
  currentUser: { username: string } | null;
  repoStats: Record<string, unknown> | null;
  repo: { description: string | null; language: string | null; defaultBranch?: string } | null;
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

  // ========== useEffects（原 page 中的） ==========

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

  // ========== 渲染 ==========

  return (
    <>
      <div className="repo-code-content">
        {/* Main */}
        <main className="repo-code-main">
          {/* Toolbar */}
          <div className="repo-toolbar">
            <div className="toolbar-right">
              {isUploading && (
                <div className="upload-progress">
                  <span>上传中... {uploadProgress}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumb - 增强版导航栏 */}
          <div className="repo-nav-bar">
            {currentPath.length > 0 && (
              <button
                className="repo-nav-back"
                onClick={navHook.handleGoBack}
                title="返回上级目录 (Backspace)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            <Link href={`/${username}/${repoName}`} className="repo-nav-root">
              <RepoIcon />
              <span>{repoName}</span>
            </Link>

            {currentPath.length > 0 && (
              <div className="repo-nav-path">
                {currentPath.map((part, i) => (
                  <React.Fragment key={i}>
                    <span className="repo-nav-sep">/</span>
                    <button
                      onClick={() => navHook.navigateToPath(i + 1)}
                      className={i === currentPath.length - 1 ? 'repo-nav-current' : 'repo-nav-folder'}
                      title={`跳转到 ${part}`}
                    >
                      {part}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {repoBranches.length > 1 && (
              <div className="repo-nav-branch">
                <button
                  className="repo-branch-btn"
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                >
                  <GitBranchIcon />
                  <span>{currentBranch}</span>
                  <ChevronDownIcon />
                </button>
                {showBranchDropdown && (
                  <div className="repo-branch-dropdown">
                    {repoBranches.map((branch) => (
                      <button
                        key={branch.id}
                        className={`repo-branch-option ${branch.name === currentBranch ? 'active' : ''}`}
                        onClick={() => {
                          setCurrentBranch(branch.name);
                          setShowBranchDropdown(false);
                        }}
                      >
                        <GitBranchIcon />
                        <span>{branch.name}</span>
                        {branch.isDefault && <span className="branch-default">默认</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File List - 支持拖拽上传 */}
          <div
            className={`file-list ${isDragging ? 'dragging' : ''}`}
            onDragOver={uploadHook.handleDragOver}
            onDragLeave={uploadHook.handleDragLeave}
            onDrop={uploadHook.handleDrop}
            onContextMenu={selectionHook.handleContextMenu}
          >
            <input
              type="file"
              id="file-upload-input"
              style={{ display: 'none' }}
              multiple
              onChange={(e) => {
                uploadHook.handleFileUpload(e.target.files);
                e.target.value = '';
              }}
            />
            {isDragging && isOwner && (
              <div className="drop-overlay">
                <div className="drop-overlay-content">
                  <UploadIcon />
                  <span>拖放文件到此处上传</span>
                </div>
              </div>
            )}

            {/* 批量选择工具栏 */}
            {isSelecting && selectedFiles.size > 0 && (
              <div className="batch-toolbar">
                <div className="batch-toolbar-info">
                  <span>已选择 {selectedFiles.size} 项</span>
                  <button className="batch-toolbar-btn" onClick={selectionHook.clearSelection}>取消</button>
                </div>
                <div className="batch-toolbar-actions">
                  {isOwner && (
                    <>
                      <button className="batch-toolbar-btn batch-delete" onClick={() => setBatchOperation('delete')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        删除
                      </button>
                      <button className="batch-toolbar-btn batch-move" onClick={() => setBatchOperation('move')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="5 9 2 12 5 15" />
                          <polyline points="9 5 12 2 15 5" />
                          <polyline points="15 19 12 22 9 19" />
                          <polyline points="19 9 22 12 19 15" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <line x1="12" y1="2" x2="12" y2="22" />
                        </svg>
                        移动
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {batchOperation === 'move' && (
              <div className="batch-move-input">
                <input type="text" className="form-input" placeholder="输入目标文件夹路径（如：folder1 或 folder1/folder2）" value={moveTargetPath} onChange={(e) => setMoveTargetPath(e.target.value)} autoFocus />
                <button className="btn btn-primary btn-sm" onClick={selectionHook.handleBatchMove} disabled={isBatchOperating || !moveTargetPath.trim()}>
                  {isBatchOperating ? '移动中...' : '确认移动'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setBatchOperation(null); setMoveTargetPath(''); }}>取消</button>
              </div>
            )}

            {batchOperation === 'delete' && (
              <div className="batch-delete-confirm">
                <span>确定删除选中的 {selectedFiles.size} 个项目吗？</span>
                <button className="btn btn-danger btn-sm" onClick={selectionHook.handleBatchDelete} disabled={isBatchOperating}>
                  {isBatchOperating ? '删除中...' : '确认删除'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setBatchOperation(null)}>取消</button>
              </div>
            )}

            {singleMoveFile && (
              <div className="single-move-modal" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--color-bg-default)', border: '1px solid var(--color-border-default)', borderRadius: '8px', padding: '20px', zIndex: 1000, minWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>移动 {singleMoveFile.type === 'dir' ? '文件夹' : '文件'}</h3>
                <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-fg-muted)' }}>正在移动：<strong>{singleMoveFile.name}</strong></p>
                <div className="form-group">
                  <label className="form-label">目标路径</label>
                  <input type="text" className="form-input" placeholder="输入目标文件夹路径（如：folder1 或 folder1/folder2），留空则移动到根目录" value={singleMoveTarget} onChange={(e) => setSingleMoveTarget(e.target.value)} autoFocus />
                  <small className="form-hint">目标路径不应包含文件名</small>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSingleMoveFile(null); setSingleMoveTarget(''); }} disabled={isSingleMoving}>取消</button>
                  <button className="btn btn-primary btn-sm" onClick={selectionHook.handleSingleMove} disabled={isSingleMoving}>{isSingleMoving ? '移动中...' : '确认移动'}</button>
                </div>
              </div>
            )}

            {files.map((file, index) => (
              <div key={index} className={`file-row ${selectedFiles.has(file.name) ? 'selected' : ''}`} onClick={() => {
                if (isSelecting) {
                  selectionHook.toggleSelectFile(file.name);
                } else {
                  if (file.type === 'dir') {
                    navHook.handleEnterFolder(file.name);
                  } else {
                    router.push(`/${username}/${repoName}/blob/${currentPath.length > 0 ? currentPath.join('/') + '/' + file.name : file.name}?branch=${encodeURIComponent(currentBranch)}`);
                  }
                }
              }} onContextMenu={(e) => selectionHook.handleFileContextMenu(e, { name: file.name, type: file.type, fileId: file.fileId })} style={{ cursor: 'pointer' }}>
                {isSelecting && (
                  <span className={`file-checkbox ${selectedFiles.has(file.name) ? 'checked' : ''}`} onClick={(e) => { e.stopPropagation(); selectionHook.toggleSelectFile(file.name); }}>
                    {selectedFiles.has(file.name) && (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>)}
                  </span>
                )}
                <span className="file-icon">{file.type === 'dir' ? <FolderIcon /> : <FileIcon />}</span>
                <span className="file-name">{file.name}</span>
                {isOwner && !isSelecting && (
                  <div className="file-actions">
                    <button className="file-action-btn" onClick={(e) => { e.stopPropagation(); const newName = prompt(`请输入新的名称：`, file.name); if (newName && newName !== file.name) { filesHook.handleRename(file.name, newName); } }} title="重命名">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    {file.type === 'file' && file.fileId && (
                      <button className="file-action-btn" onClick={(e) => { e.stopPropagation(); onOpenVersionHistory(file.fileId!, file.name); }} title="版本历史">
                        <HistoryIcon />
                      </button>
                    )}
                    <button className="file-action-btn file-action-delete" onClick={(e) => { e.stopPropagation(); filesHook.handleDeleteFile(file.name, file.type); }} title="删除">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
            {files.length === 0 && (
              <div className="file-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <p>暂无文件</p>
              </div>
            )}
          </div>

          {/* README - 只在根目录显示 */}
          {currentPath.length === 0 && readmeContent !== undefined && (
            <div className="readme">
              <div className="readme-header"><FileIcon /><span>README.md</span></div>
              <div className="readme-content markdown-body">
                {readmeContent ? (
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{readmeContent}</pre>
                ) : (
                  <div className="readme-empty">
                    <svg className="readme-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <p className="readme-empty-text">暂无 README 内容</p>
                    <p className="readme-empty-hint">创建一个 README.md 文件来介绍你的项目</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* 仓库信息侧边栏 */}
        <aside className="repo-info-sidebar">
          <div className="repo-info-card">
            <h3 className="repo-info-title">关于</h3>
            <p className="repo-info-desc">{repo?.description || '暂无描述'}</p>
          </div>
          
          {repo?.language && (
            <div className="repo-info-section">
              <h4 className="repo-info-label">语言</h4>
              <span className="repo-info-lang">{repo.language}</span>
            </div>
          )}
          
          {repoStats && (
            <div className="repo-info-section">
              <h4 className="repo-info-label">统计</h4>
              <div className="repo-info-stats">
                <div className="repo-info-stat">
                  <span className="repo-info-stat-value">{String((repoStats as Record<string, unknown>).fileCount ?? 0)}</span>
                  <span className="repo-info-stat-label">文件</span>
                </div>
                <div className="repo-info-stat">
                  <span className="repo-info-stat-value">{String((repoStats as Record<string, unknown>).contributorCount ?? 1)}</span>
                  <span className="repo-info-stat-label">贡献者</span>
                </div>
                <div className="repo-info-stat">
                  <span className="repo-info-stat-value">{String((repoStats as Record<string, unknown>).totalSizeFormatted ?? '0 B')}</span>
                  <span className="repo-info-stat-label">大小</span>
                </div>
                <div className="repo-info-stat">
                  <span className="repo-info-stat-value">{repoBranches.length || 1}</span>
                  <span className="repo-info-stat-label">分支</span>
                </div>
              </div>
            </div>
          )}
          
          {repoStats && Array.isArray((repoStats as Record<string, unknown>).recentActivity) && (
            <div className="repo-info-section">
              <h4 className="repo-info-label">最近活动</h4>
              <div className="repo-info-activity">
                {((repoStats as Record<string, unknown>).recentActivity as Array<{type: string; id: string; title: string; updatedAt: string}>).slice(0, 5).map((item, i) => (
                  <Link 
                    key={i} 
                    href={`/${username}/${repoName}/${item.type === 'issue' ? 'issues' : 'pulls'}/${item.id}`} 
                    className="repo-info-activity-item"
                  >
                    <span className={`repo-info-activity-icon ${item.type}`}>{item.type === 'issue' ? '!' : '⇥'}</span>
                    <span className="repo-info-activity-title">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 右键菜单 */}
      {contextMenu.show && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {contextMenu.targetFile && isOwner && (
            <>
              <div className="context-menu-item" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const fileName = contextMenu.targetFile?.name || ''; const newName = prompt(`请输入新的名称：`, fileName); if (newName && newName !== fileName && contextMenu.targetFile) { filesHook.handleRename(contextMenu.targetFile.name, newName); } selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                <span>重命名</span>
              </div>
              <div className="context-menu-item" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const fileName = contextMenu.targetFile?.name || ''; const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName; setSingleMoveFile({ name: fileName, type: contextMenu.targetFile?.type || 'file', path: fullPath }); setSingleMoveTarget(currentPath.length > 0 ? currentPath.join('/') + '/' : ''); selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15" /><polyline points="9 5 12 2 15 5" /><polyline points="15 19 12 22 9 19" /><polyline points="19 9 22 12 19 15" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" /></svg>
                <span>移动到...</span>
              </div>
              <div className="context-menu-item" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); const fileName = contextMenu.targetFile?.name || ''; const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName; const targetDir = currentPath.length > 0 ? currentPath.join('/') + '/' : ''; const targetName = prompt('请输入目标文件/文件夹名称：', fileName); if (!targetName) { selectionHook.closeContextMenu(); return; } const targetPath = targetDir + targetName; if (targetPath === fullPath) { alert('源路径和目标路径相同'); selectionHook.closeContextMenu(); return; } try { const token = tokenManager.getAccessToken(); const res = await fetch(`/api/v1/repos/${username}/${repoName}/copy`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }, body: JSON.stringify({ sources: [{ sourcePath: fullPath, targetPath }], branch: currentBranch, recursive: true }) }); const data = await res.json(); if (data.code === 200) { alert(`复制成功！已复制到 ${targetPath}`); await navHook.refreshFiles(); } else { alert(data.message || '复制失败'); } } catch { alert('复制失败，请重试'); } selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                <span>复制到...</span>
              </div>
              <div className="context-menu-item" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsSelecting(true); selectionHook.toggleSelectFile(contextMenu.targetFile?.name || ''); selectionHook.closeContextMenu(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                <span>{selectedFiles.has(contextMenu.targetFile?.name || '') ? '取消选择' : '选择'}</span>
              </div>
              {contextMenu.targetFile?.type === 'file' && contextMenu.targetFile?.fileId && (
                <>
                  <div className="context-menu-divider"></div>
                  <div className="context-menu-item" onClick={() => { selectionHook.handleContextVersionHistory(contextMenu.targetFile?.fileId || '', contextMenu.targetFile?.name || ''); }}>
                    <HistoryIcon />
                    <span>版本历史</span>
                  </div>
                </>
              )}
              <div className="context-menu-divider"></div>
              <div className="context-menu-item" onClick={selectionHook.handleDeleteItem} style={{ color: '#dc2626' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                <span>删除 {contextMenu.targetFile.type === 'dir' ? '文件夹' : '文件'}</span>
              </div>
              <div className="context-menu-divider"></div>
            </>
          )}
          <div className="context-menu-item" onClick={selectionHook.handleContextCreateFolder}><FolderIcon /><span>新建文件夹</span></div>
          <div className="context-menu-item" onClick={selectionHook.handleContextUpload}><UploadIcon /><span>上传文件</span></div>
          <div className="context-menu-divider"></div>
          <div className="context-menu-item" onClick={selectionHook.handleContextDownloadFromUrl}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span>从URL下载</span>
          </div>
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
    </>
  );
}
