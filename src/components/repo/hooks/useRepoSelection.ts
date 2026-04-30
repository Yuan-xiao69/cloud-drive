'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tokenManager } from '@/lib/api/client';
import type { RepoItem } from '../RepoTypes';

interface UseRepoSelectionParams {
  username: string;
  repoName: string;
  isOwner: boolean;
  currentUser: { username: string } | null;
  currentPath: string[];
  currentBranch: string;
  files: RepoItem[];
  refreshFiles: () => Promise<void>;
  // 外部回调（page.tsx 管理）
  onOpenNewModal: (type: 'file' | 'folder') => void;
  onOpenChunkedUploadModal: () => void;
  onOpenDownloadModal: () => void;
  onOpenVersionHistory: (fileId: string, fileName: string) => void;
  // 外部 state setters
  setSelectedFiles: (s: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setIsSelecting: (v: boolean) => void;
  setBatchOperation: (op: string | null) => void;
  setMoveTargetPath: (p: string) => void;
  setIsBatchOperating: (v: boolean) => void;
  setSingleMoveFile: (f: { name: string; type: string; path: string } | null) => void;
  setSingleMoveTarget: (t: string) => void;
  setIsSingleMoving: (v: boolean) => void;
  setContextMenu: (m: { x: number; y: number; show: boolean; targetFile?: { name: string; type: string; fileId?: string } }) => void;
  selectedFiles: Set<string>;
  batchOperation: string | null;
  moveTargetPath: string;
  singleMoveFile: { name: string; type: string; path: string } | null;
  singleMoveTarget: string;
  contextMenu: { x: number; y: number; show: boolean; targetFile?: { name: string; type: string; fileId?: string } };
}

export function useRepoSelection({
  username,
  repoName,
  isOwner,
  currentUser,
  currentPath,
  currentBranch,
  files,
  refreshFiles,
  onOpenNewModal,
  onOpenChunkedUploadModal,
  onOpenDownloadModal,
  onOpenVersionHistory,
  setSelectedFiles,
  setIsSelecting,
  setBatchOperation,
  setMoveTargetPath,
  setIsBatchOperating,
  setSingleMoveFile,
  setSingleMoveTarget,
  setIsSingleMoving,
  setContextMenu,
  selectedFiles,
  batchOperation,
  moveTargetPath,
  singleMoveFile,
  singleMoveTarget,
  contextMenu,
}: UseRepoSelectionParams) {
  const router = useRouter();

  const closeContextMenu = useCallback(() => {
    setContextMenu({ ...contextMenu, show: false });
  }, [contextMenu, setContextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, show: true, targetFile: undefined });
  }, [setContextMenu]);

  const handleFileContextMenu = useCallback((e: React.MouseEvent, file: { name: string; type: string; fileId?: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, show: true, targetFile: file });
  }, [setContextMenu]);

  const handleContextToggleSelect = useCallback((e: React.MouseEvent, file: { name: string; type: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelecting(true);
    setSelectedFiles((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(file.name)) {
        newSet.delete(file.name);
      } else {
        newSet.add(file.name);
      }
      return newSet;
    });
  }, [setIsSelecting, setSelectedFiles]);

  const handleContextCreateFolder = useCallback(() => {
    closeContextMenu();
    if (!currentUser) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!isOwner) {
      alert('只有仓库所有者才能创建文件夹');
      return;
    }
    onOpenNewModal('folder');
  }, [currentUser, isOwner, router, closeContextMenu, onOpenNewModal]);

  const handleContextUpload = useCallback(() => {
    closeContextMenu();
    if (!currentUser) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!isOwner) {
      alert('只有仓库所有者才能上传文件');
      return;
    }
    onOpenChunkedUploadModal();
  }, [currentUser, isOwner, router, closeContextMenu, onOpenChunkedUploadModal]);

  const handleContextDownloadFromUrl = useCallback(() => {
    closeContextMenu();
    if (!currentUser) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!isOwner) {
      alert('只有仓库所有者才能从URL下载');
      return;
    }
    onOpenDownloadModal();
  }, [currentUser, isOwner, router, closeContextMenu, onOpenDownloadModal]);

  const handleDeleteItem = useCallback(async () => {
    const targetFile = contextMenu.targetFile;
    closeContextMenu();
    if (!targetFile) return;

    const itemType = targetFile.type === 'dir' ? '文件夹' : '文件';
    if (!confirm(`确定要删除 ${itemType} "${targetFile.name}" 吗？`)) {
      return;
    }

    try {
      const token = tokenManager.getAccessToken();
      const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${targetFile.name}` : targetFile.name;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ path: fullPath, type: targetFile.type, branch: currentBranch }),
      });

      const data = await res.json();
      if (data.code === 200) {
        alert('删除成功');
        await refreshFiles();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('删除失败，请重试');
    }
  }, [contextMenu.targetFile, currentPath, username, repoName, currentBranch, closeContextMenu, refreshFiles]);

  const toggleSelectFile = useCallback((fileName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFiles((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  }, [setSelectedFiles]);

  const selectAllFiles = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.name)));
    }
  }, [selectedFiles.size, files, setSelectedFiles]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setIsSelecting(false);
  }, [setSelectedFiles, setIsSelecting]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    const count = selectedFiles.size;
    if (!confirm(`确定要删除选中的 ${count} 个项目吗？`)) {
      return;
    }

    setIsBatchOperating(true);
    try {
      const token = tokenManager.getAccessToken();
      const operations = Array.from(selectedFiles).map(name => {
        const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${name}` : name;
        return {
          action: 'delete',
          path: fullPath,
          recursive: true,
          branch: currentBranch,
        };
      });

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ operations }),
      });

      const data = await res.json();
      if (data.code === 200) {
        const { success, failed } = data.data.summary;
        alert(`批量删除完成：成功 ${success}，失败 ${failed}`);
        setSelectedFiles(new Set());
        setBatchOperation(null);
        await refreshFiles();
      } else {
        alert(data.message || '批量删除失败');
      }
    } catch (err) {
      console.error('Failed to batch delete:', err);
      alert('批量删除失败，请重试');
    } finally {
      setIsBatchOperating(false);
    }
  }, [selectedFiles, currentPath, username, repoName, currentBranch, setSelectedFiles, setBatchOperation, setIsBatchOperating, refreshFiles]);

  const handleBatchMove = useCallback(async () => {
    if (selectedFiles.size === 0 || !moveTargetPath.trim()) return;

    setIsBatchOperating(true);
    try {
      const token = tokenManager.getAccessToken();
      const operations = Array.from(selectedFiles).map(name => {
        const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${name}` : name;
        const targetPath = moveTargetPath.startsWith('/')
          ? moveTargetPath
          : (currentPath.length > 0
            ? `${currentPath.join('/')}/${moveTargetPath}`
            : moveTargetPath);
        return {
          action: 'move',
          path: fullPath,
          targetPath: targetPath,
          branch: currentBranch,
        };
      });

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ operations }),
      });

      const data = await res.json();
      if (data.code === 200) {
        const { success, failed } = data.data.summary;
        alert(`批量移动完成：成功 ${success}，失败 ${failed}`);
        setSelectedFiles(new Set());
        setBatchOperation(null);
        setMoveTargetPath('');
        await refreshFiles();
      } else {
        alert(data.message || '批量移动失败');
      }
    } catch (err) {
      console.error('Failed to batch move:', err);
      alert('批量移动失败，请重试');
    } finally {
      setIsBatchOperating(false);
    }
  }, [selectedFiles, moveTargetPath, currentPath, username, repoName, currentBranch, setSelectedFiles, setBatchOperation, setMoveTargetPath, setIsBatchOperating, refreshFiles]);

  const handleSingleMove = useCallback(async () => {
    if (!singleMoveFile || !singleMoveTarget.trim()) return;

    setIsSingleMoving(true);
    try {
      const token = tokenManager.getAccessToken();
      const sourcePath = singleMoveFile.path;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({
          sourcePath,
          targetPath: singleMoveTarget,
          branch: currentBranch,
        }),
      });

      const data = await res.json();
      if (data.code === 200) {
        alert('移动成功');
        setSingleMoveFile(null);
        setSingleMoveTarget('');
        await refreshFiles();
      } else {
        alert(data.message || '移动失败');
      }
    } catch (err) {
      console.error('Failed to move:', err);
      alert('移动失败，请重试');
    } finally {
      setIsSingleMoving(false);
    }
  }, [singleMoveFile, singleMoveTarget, username, repoName, currentBranch, setSingleMoveFile, setSingleMoveTarget, setIsSingleMoving, refreshFiles]);

  const handleContextVersionHistory = useCallback((fileId: string, fileName: string) => {
    closeContextMenu();
    onOpenVersionHistory(fileId, fileName);
  }, [closeContextMenu, onOpenVersionHistory]);

  return {
    closeContextMenu,
    handleContextMenu,
    handleFileContextMenu,
    handleContextToggleSelect,
    handleContextCreateFolder,
    handleContextUpload,
    handleContextDownloadFromUrl,
    handleDeleteItem,
    handleContextVersionHistory,
    toggleSelectFile,
    selectAllFiles,
    clearSelection,
    handleBatchDelete,
    handleBatchMove,
    handleSingleMove,
  };
}
