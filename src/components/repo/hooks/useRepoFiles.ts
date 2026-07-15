'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import type { RepoItem } from '../RepoTypes';

interface UseRepoFilesParams {
  username: string;
  repoName: string;
  currentPath: string[];
  currentBranch: string;
  setFiles: (files: RepoItem[]) => void;
  refreshFiles: () => Promise<void>;
}

export function useRepoFiles({
  username,
  repoName,
  currentPath,
  currentBranch,
  setFiles,
  refreshFiles,
}: UseRepoFilesParams) {
  // 删除文件/文件夹（供行内删除按钮调用）
  const handleDeleteFile = useCallback(async (fileName: string, fileType: string) => {
    try {
      const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fullPath, type: fileType, branch: currentBranch }),
      });

      const data = await res.json();
      if (data.code === 200) {
        toast.success('删除成功');
        refreshFiles();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('删除失败，请重试');
    }
  }, [username, repoName, currentPath, currentBranch, refreshFiles]);

  // 重命名文件/文件夹
  const handleRename = useCallback(async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    try {
      const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${oldName}` : oldName;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: fullPath,
          targetName: newName,
          branch: currentBranch,
        }),
      });

      const data = await res.json();
      if (data.code === 200) {
        refreshFiles();
      } else {
        toast.error(data.message || '重命名失败');
      }
    } catch (err) {
      console.error('Failed to rename:', err);
      toast.error('重命名失败，请重试');
    }
  }, [username, repoName, currentPath, currentBranch, refreshFiles]);

  // 处理从URL下载 - 使用分片上传避免大文件内存溢出
  const handleDownloadFromUrl = useCallback(async (downloadUrl: string, downloadFileName: string) => {
    if (!downloadUrl.trim()) return;
    try {
      let fileName = downloadFileName.trim();
      if (!fileName) {
        const urlParts = downloadUrl.split('/');
        fileName = urlParts[urlParts.length - 1].split('?')[0] || 'downloaded_file';
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();

      // 小文件（<5MB）直接使用 JSON 上传
      if (blob.size < 5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const uploadPath = currentPath.length > 0 
            ? `${currentPath.join('/')}/${fileName}` 
            : `/${fileName}`;

          const uploadRes = await api.post(`/api/v1/repos/${username}/${repoName}/upload`, {
            name: fileName,
            path: uploadPath,
            content: base64,
            size: blob.size,
            mimeType: blob.type || 'application/octet-stream',
            branch: currentBranch,
          });

          if (uploadRes.code === 200 || uploadRes.code === 201) {
            toast.success('下载成功');
            refreshFiles();
          } else {
            toast.error(uploadRes.message || '上传失败');
          }
        };
        reader.onerror = () => toast.error('文件读取失败');
        reader.readAsDataURL(blob);
      } else {
        // 大文件（>=5MB）使用分片上传
        const CHUNK_SIZE = 5 * 1024 * 1024;
        const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
        const uploadPath = currentPath.length > 0 
          ? `${currentPath.join('/')}/${fileName}` 
          : `/${fileName}`;

        // 初始化上传
        const initData = await api.post<{ uploadId: string }>(`/api/v1/repos/${username}/${repoName}/upload-chunked?action=init`, {
          fileName,
          fileSize: blob.size,
          path: uploadPath,
          totalChunks,
          branch: currentBranch,
        });
        const uploadId = initData.data?.uploadId;
        if (!uploadId) throw new Error('获取 uploadId 失败');

        // 逐片上传
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, blob.size);
          const chunk = blob.slice(start, end);

          const chunkBase64 = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve((r.result as string).split(',')[1]);
            r.onerror = reject;
            r.readAsDataURL(chunk);
          });

          const chunkRes = await api.post(
            `/api/v1/repos/${username}/${repoName}/upload-chunked?action=chunk`,
            {
              uploadId,
              chunkIndex: i,
              chunkData: chunkBase64,
              totalChunks,
              fileName,
              parentPath: currentPath.join('/') || '/',
              totalSize: blob.size,
              branch: currentBranch,
            }
          );
          if (chunkRes.code !== 200) throw new Error(`分片 ${i + 1}/${totalChunks} 上传失败`);
        }

        // 完成上传
        await api.post(
          `/api/v1/repos/${username}/${repoName}/upload-chunked?action=complete`,
          { uploadId }
        );

        toast.success('下载成功');
        refreshFiles();
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('下载失败，请检查URL是否可访问');
    }
  }, [username, repoName, currentPath, refreshFiles]);

  return {
    handleDeleteFile,
    handleRename,
    handleDownloadFromUrl,
  };
}
