'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api/client';
import { buildFilePath } from '@/lib/utils';

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

// 前端文件大小限制
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_FILE_SIZE_STR = '100MB';

/**
 * 将 File 对象转换为 base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 去掉 data:...;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  // 上传错误信息状态
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // 通用上传逻辑 - 使用 JSON 格式与后端一致
  const doUpload = useCallback(async (uploadFiles: FileList | File[]) => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    // 前端文件大小校验
    const oversizedFiles: string[] = [];
    const validFiles: File[] = [];
    for (const file of Array.from(uploadFiles)) {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      } else {
        validFiles.push(file);
      }
    }

    if (oversizedFiles.length > 0) {
      const errorMsg = `以下文件超过大小限制（${MAX_FILE_SIZE_STR}），已跳过：\n${oversizedFiles.join('\n')}`;
      setUploadErrors(prev => [...prev, errorMsg]);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    const errors: string[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        // 将文件转为 base64
        const content = await fileToBase64(file);
        const uploadPath = buildFilePath(currentPath, file.name);

        const data = await api.post(`/api/v1/repos/${username}/${repoName}/upload`, {
          name: file.name,
          content,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          path: uploadPath,
          branch: currentBranch,
        });

        setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100));

        if (data.code !== 200 && data.code !== 201) {
          errors.push(data.message || `上传 ${file.name} 失败`);
        }
      }

      if (errors.length > 0) {
        setUploadErrors(prev => [...prev, ...errors]);
      }

      await refreshFiles();
    } catch (err) {
      console.error('Failed to upload:', err);
      setUploadErrors(prev => [...prev, '上传失败，请重试']);
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
