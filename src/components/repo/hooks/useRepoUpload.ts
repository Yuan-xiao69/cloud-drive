'use client';

import { useCallback } from 'react';
import { tokenManager } from '@/lib/api/client';

interface UseRepoUploadParams {
  username: string;
  repoName: string;
  isOwner: boolean;
  currentPath: string[];
  currentBranch: string;
  setIsUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
  setIsDragging: (v: boolean) => void;
  refreshFiles: () => Promise<void>;
}

export function useRepoUpload({
  username,
  repoName,
  isOwner,
  currentPath,
  currentBranch,
  setIsUploading,
  setUploadProgress,
  setIsDragging,
  refreshFiles,
}: UseRepoUploadParams) {
  // 通用上传逻辑
  const doUpload = useCallback(async (uploadFiles: FileList | File[]) => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = tokenManager.getAccessToken();

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        const uploadPath = currentPath.length > 0 ? `${currentPath.join('/')}/${file.name}` : file.name;
        formData.append('path', uploadPath);
        formData.append('message', `Upload ${file.name}`);
        formData.append('branch', currentBranch);

        const res = await fetch(`/api/v1/repos/${username}/${repoName}/upload`, {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });

        const data = await res.json();
        setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));

        if (data.code !== 200) {
          alert(data.message || `上传 ${file.name} 失败`);
        }
      }

      await refreshFiles();
      alert('上传成功！');
    } catch (err) {
      console.error('Failed to upload:', err);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [username, repoName, currentPath, currentBranch, setIsUploading, setUploadProgress, refreshFiles]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (uploadFiles: FileList | null) => {
    if (!uploadFiles) return;
    await doUpload(uploadFiles);
  }, [doUpload]);

  // 拖拽 over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [setIsDragging]);

  // 拖拽 leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, [setIsDragging]);

  // Drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!isOwner) return;

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    await doUpload(droppedFiles);
  }, [isOwner, setIsDragging, doUpload]);

  return {
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
