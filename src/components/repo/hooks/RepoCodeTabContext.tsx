'use client';

import React, { createContext, useContext } from 'react';
import type { RepoItem } from '../RepoTypes';

// ========== 子 hook 返回类型 ==========

export interface NavigationState {
  currentPath: string[];
  currentBranch: string;
  repoBranches: { id: string; name: string; isDefault: boolean }[];
  showBranchDropdown: boolean;
  expandedFolders: Set<string>;
  folderContents: Record<string, RepoItem[]>;
}

export interface NavigationActions {
  setCurrentPath: (path: string[]) => void;
  setCurrentBranch: (branch: string) => void;
  setShowBranchDropdown: (show: boolean) => void;
  handleGoBack: () => void;
  navigateToPath: (index: number) => void;
  handleEnterFolder: (folderName: string) => void;
  toggleExpandFolder: (folderName: string, parentPath: string[]) => void;
  refreshFiles: () => Promise<void>;
}

export interface FilesState {
  files: RepoItem[];
  readmeContent: string | null;
}

export interface FilesActions {
  setFiles: (files: RepoItem[]) => void;
  handleDeleteFile: (fileName: string, fileType: string) => Promise<void>;
  handleRename: (oldName: string, newName: string) => Promise<void>;
  handleDownloadFromUrl: (downloadUrl: string, downloadFileName: string) => Promise<void>;
}

export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  isDragging: boolean;
  isGlobalDragging: boolean;
  pendingFiles: File[];
}

export interface UploadActions {
  setIsDragging: (dragging: boolean) => void;
  setIsGlobalDragging: (dragging: boolean) => void;
  setPendingFiles: (files: File[]) => void;
  clearPendingFiles: () => void;
  handleFileUpload: (files: FileList | null) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => Promise<void>;
}

export interface SelectionState {
  selectedFiles: Set<string>;
  isSelecting: boolean;
  batchOperation: string | null;
  moveTargetPath: string;
  isBatchOperating: boolean;
  singleMoveFile: { name: string; type: string; path: string } | null;
  singleMoveTarget: string;
  isSingleMoving: boolean;
  contextMenu: { x: number; y: number; show: boolean; targetFile?: { name: string; type: string } };
}

export interface SelectionActions {
  setIsSelecting: (selecting: boolean) => void;
  setBatchOperation: (op: string | null) => void;
  setMoveTargetPath: (path: string) => void;
  setSingleMoveFile: (file: { name: string; type: string; path: string } | null) => void;
  setSingleMoveTarget: (target: string) => void;
  setContextMenu: (menu: SelectionState['contextMenu']) => void;
  closeContextMenu: () => void;
  toggleSelectFile: (fileName: string, e?: React.MouseEvent) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  handleBatchDelete: () => Promise<void>;
  handleBatchMove: () => Promise<void>;
  handleSingleMove: () => Promise<void>;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleFileContextMenu: (e: React.MouseEvent, file: { name: string; type: string }) => void;
  handleContextCreateFolder: () => void;
  handleContextUpload: () => void;
  handleContextDownloadFromUrl: () => void;
  handleDeleteItem: () => Promise<void>;
  handleContextToggleSelect: (e: React.MouseEvent, file: { name: string; type: string }) => void;
}

// ========== 合并 Context 类型 ==========

export interface RepoCodeTabContextValue {
  // 基础参数
  username: string;
  repoName: string;
  isOwner: boolean;

  // 导航
  navigation: NavigationState & NavigationActions;

  // 文件
  filesState: FilesState;
  filesActions: FilesActions;

  // 上传
  uploadState: UploadState;
  uploadActions: UploadActions;

  // 选择
  selectionState: SelectionState;
  selectionActions: SelectionActions;

  // 外部状态（仍由 page 管理）
  repoStats: Record<string, unknown> | null;
  repo: { description: string | null; language: string | null; defaultBranch?: string } | null;
}

const RepoCodeTabContext = createContext<RepoCodeTabContextValue | null>(null);

export function useRepoCodeTab() {
  const ctx = useContext(RepoCodeTabContext);
  if (!ctx) {
    throw new Error('useRepoCodeTab must be used within RepoCodeTabProvider');
  }
  return ctx;
}

export { RepoCodeTabContext };
