'use client';

import { useCallback } from 'react';
import { tokenManager } from '@/lib/api/client';
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
      const token = tokenManager.getAccessToken();
      const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ path: fullPath, type: fileType, branch: currentBranch }),
      });

      const data = await res.json();
      if (data.code === 200) {
        alert('删除成功');
        refreshFiles();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('删除失败，请重试');
    }
  }, [username, repoName, currentPath, currentBranch, refreshFiles]);

  // 重命名文件/文件夹
  const handleRename = useCallback(async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    try {
      const token = tokenManager.getAccessToken();
      const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${oldName}` : oldName;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
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
        alert(data.message || '重命名失败');
      }
    } catch (err) {
      console.error('Failed to rename:', err);
      alert('重命名失败，请重试');
    }
  }, [username, repoName, currentPath, currentBranch, refreshFiles]);

  // 处理从URL下载
  const handleDownloadFromUrl = useCallback(async (downloadUrl: string, downloadFileName: string) => {
    if (!downloadUrl.trim()) return;
    try {
      const token = tokenManager.getAccessToken();
      let fileName = downloadFileName.trim();
      if (!fileName) {
        const urlParts = downloadUrl.split('/');
        fileName = urlParts[urlParts.length - 1].split('?')[0] || 'downloaded_file';
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const uploadRes = await fetch(`/api/v1/repos/${username}/${repoName}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({
            name: fileName,
            path: currentPath.length > 0 ? `${currentPath.join('/')}/${fileName}` : fileName,
            content: base64,
            message: `Download ${fileName} from URL`,
          }),
        });

        const uploadData = await uploadRes.json();
        if (uploadData.code === 200) {
          alert('下载成功');
          refreshFiles();
        } else {
          alert(uploadData.message || '上传失败');
        }
      };
      reader.onerror = () => {
        alert('文件读取失败');
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Download error:', err);
      alert('下载失败，请检查URL是否可访问');
    }
  }, [username, repoName, currentPath, refreshFiles]);

  return {
    handleDeleteFile,
    handleRename,
    handleDownloadFromUrl,
  };
}
