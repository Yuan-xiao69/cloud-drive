'use client';

import { useCallback } from 'react';
import type { RepoItem } from '../RepoTypes';

interface UseRepoNavigationParams {
  username: string;
  repoName: string;
  currentPath: string[];
  currentBranch: string;
  setCurrentPath: (path: string[]) => void;
  setCurrentBranch: (branch: string) => void;
  setFiles: (files: RepoItem[]) => void;
}

export function useRepoNavigation({
  username,
  repoName,
  currentPath,
  currentBranch,
  setCurrentPath,
  setCurrentBranch,
  setFiles,
}: UseRepoNavigationParams) {
  // 刷新当前路径下的文件列表
  const refreshFiles = useCallback(async () => {
    const pathParam = currentPath.length > 0 ? `path=${currentPath.join('/')}&` : '?';
    const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree?${pathParam}branch=${encodeURIComponent(currentBranch)}`);
    const data = await res.json();
    const newFiles = data.data?.files || data.data || [];
    setFiles(newFiles);
    return newFiles;
  }, [username, repoName, currentPath, currentBranch, setFiles]);

  // 返回上级目录
  const handleGoBack = useCallback(() => {
    setCurrentPath(currentPath.slice(0, -1));
  }, [currentPath, setCurrentPath]);

  // 跳转到任意路径层级（面包屑点击）
  const navigateToPath = useCallback((index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  }, [currentPath, setCurrentPath]);

  // 进入文件夹
  const handleEnterFolder = useCallback((folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
  }, [currentPath, setCurrentPath]);

  return {
    refreshFiles,
    handleGoBack,
    navigateToPath,
    handleEnterFolder,
  };
}
