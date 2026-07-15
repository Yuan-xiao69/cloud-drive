'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Empty, Input, Field, PageLayout, PageLayoutContent, Modal, ModalFooter, RepoHeader, Tabs } from '@/components/design';

import ChunkedUploadModal from '@/components/repo/ChunkedUploadModal';
import FileTree from '@/components/repo/FileTree';
import { useAuth } from '@/lib/providers';
import { api } from '@/lib/api/client';
import { buildFilePath } from '@/lib/utils';
import {
  RepoIcon,
  FileIcon,
  FolderIcon,
  StarIcon,
  WatchIcon,
  ForkIcon,
  CodeIcon,
  SettingsIcon,
  ShareIcon,
  ChevronIcon,
  CloseIcon,
  ChevronDownIcon,
  GitBranchIcon,
  DocumentIcon,
  UploadIcon,
  IssueIcon,
  PullRequestIcon,
  PlusIcon,
  LinkIcon,
  DownloadIcon,
} from '@/components/repo/RepoIcons';
import RepoIssuesTab from '@/components/repo/RepoIssuesTab';
import RepoPullsTab from '@/components/repo/RepoPullsTab';
import RepoSettingsTab from '@/components/repo/RepoSettingsTab';
import type { SettingsSubTab } from '@/components/repo/RepoTypes';
import RepoDownloadModal from '@/components/repo/RepoDownloadModal';
import RepoCodeTab from '@/components/repo/RepoCodeTab';
import RepoShareModal from '@/components/repo/RepoShareModal';
import RepoForkRequestModal from '@/components/repo/RepoForkRequestModal';
import FileVersionHistoryModal from '@/components/repo/FileVersionHistoryModal';
import ActionMenu from '@/components/common/ActionMenu';
import { useRepoNavigation, useRepoFiles, useRepoData } from '@/components/repo/hooks';
import type { RepoData, RepoItem, ShareLink } from '@/components/repo/RepoTypes';
import toast from 'react-hot-toast';

type RepoTab = 'code' | 'issues' | 'pulls' | 'discussions' | 'settings';
type CreateType = 'file' | 'folder';

export default function RepoPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;
  const { user: currentUser } = useAuth();

  const { repo, isLoading, error, isStarred, isWatching, isForked, starCount: hookStarCount, forkCount: hookForkCount, fetchRepo, toggleStar, toggleWatch, toggleFork, repoStats, repoBranches, setRepoBranches } = useRepoData({ username, repoName });
  const [files, setFiles] = useState<RepoItem[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<RepoTab>('code');
  const [filesLoading, setFilesLoading] = useState(false);

  // 新建文件/文件夹模态框状态
  const [showNewModal, setShowNewModal] = useState(false);
  const [createType, setCreateType] = useState<CreateType>('file');
  const [newItemName, setNewItemName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // 文件上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean; targetFile?: { name: string; type: string; fileId?: string } }>({ x: 0, y: 0, show: false });


  // 从URL下载状态
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // 仓库ZIP下载状态
  const [showRepoZipDownload, setShowRepoZipDownload] = useState(false);

  // 仓库设置状态
  const [editRepoName, setEditRepoName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<number>(1);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);

  const [currentBranch, setCurrentBranch] = useState('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // 文件树展开状态
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Record<string, RepoItem[]>>({});

  // 分片上传模态框
  const [showChunkedUploadModal, setShowChunkedUploadModal] = useState(false);

  // 批量选择状态
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [batchOperation, setBatchOperation] = useState<string | null>(null); // 'move' | 'delete' | null
  const [moveTargetPath, setMoveTargetPath] = useState('');
  const [isBatchOperating, setIsBatchOperating] = useState(false);

  // 单文件移动状态
  const [singleMoveFile, setSingleMoveFile] = useState<{ name: string; type: string; path: string } | null>(null);
  const [singleMoveTarget, setSingleMoveTarget] = useState('');
  const [isSingleMoving, setIsSingleMoving] = useState(false);

  // 分享模态框状态
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);

  // Fork 申请模态框状态
  const [showForkRequestModal, setShowForkRequestModal] = useState(false);

  // 文件版本历史弹窗状态
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [versionHistoryFileId, setVersionHistoryFileId] = useState<string>('');
  const [versionHistoryFileName, setVersionHistoryFileName] = useState<string>('');
  const [versionHistoryCurrentVersion, setVersionHistoryCurrentVersion] = useState<number>(1);

  // Fork Requests 子 Tab 状态
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('general');
  const [forkRequests, setForkRequests] = useState<Array<{
    id: string;
    status: string;
    message: string | null;
    note: string | null;
    expiresAt: string | null;
    createdAt: string;
    processedAt: string | null;
    requester: {
      id: string;
      username: string;
      avatarUrl: string | null;
    };
  }>>([]);
  const [forkRequestsTotal, setForkRequestsTotal] = useState(0);
  const [forkRequestsStatus, setForkRequestsStatus] = useState<string>('pending');
  const [isLoadingForkRequests, setIsLoadingForkRequests] = useState(false);
  const [forkRequestPage, setForkRequestPage] = useState(1);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentRejectId, setCurrentRejectId] = useState<string | null>(null);

  // 初始化设置表单
  useEffect(() => {
    if (repo) {
      setEditRepoName(repo.name);
      setEditDescription(repo.description || '');
      setEditVisibility(repo.visibility);
    }
  }, [repo]);

  // 保存仓库设置
  const handleSaveSettings = async () => {
    if (!editRepoName.trim()) {
      toast.error('仓库名称不能为空');
      return;
    }

    
    setIsSavingSettings(true);
    try {
      const res = await fetch(`/api/v1/repos/${username}/${repoName}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editRepoName,
          description: editDescription,
          visibility: editVisibility,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success('设置已保存');
        // 如果仓库名改变，需要跳转到新页面
        if (editRepoName !== repo?.name) {
          router.push(`/${username}/${editRepoName}`);
        } else {
          // 刷新仓库信息
          fetchRepo();
        }
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('保存失败，请重试');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 删除仓库
  const handleDeleteRepo = async () => {


    
    setIsDeletingRepo(true);
    try {
      const data = await api.delete(`/api/v1/repos/${username}/${repoName}`);
      if (data.code === 200) {
        toast.success('仓库已删除');
        router.push(`/${username}`);
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete repo:', err);
      toast.error('删除失败，请重试');
    } finally {
      setIsDeletingRepo(false);
    }
  };

  const isOwner = !!(currentUser && repo && currentUser.username === (repo as any).owner?.username);

  // 打开分享模态框
  const handleOpenShare = () => {
    setShowShareModal(true);
  };

  // 打开版本历史弹窗
  const handleOpenVersionHistory = (fileId: string, fileName: string) => {
    setVersionHistoryFileId(fileId);
    setVersionHistoryFileName(fileName);
    // 获取当前版本号
    const file = files.find(f => f.name === fileName);
    if (file) {
      // 版本号暂设为1，后续从API获取
      setVersionHistoryCurrentVersion(1);
    }
    setShowVersionHistoryModal(true);
  };


  // repo 由 useRepoData hook 加载（含 stats/branches），这里只补充文件/README 数据
  useEffect(() => {
    if (!repo || isLoading) return;

    const defaultBranch = repo.defaultBranch || 'main';
    setCurrentBranch(defaultBranch);

    async function loadExtraData() {
      try {
        const [filesRes, readmeRes] = await Promise.all([
          fetch(`/api/v1/repos/${username}/${repoName}/tree?branch=${encodeURIComponent(defaultBranch)}`),
          fetch(`/api/v1/repos/${username}/${repoName}/blob/README.md?branch=${encodeURIComponent(defaultBranch)}`),
        ]);

        const filesData = await filesRes.json();
        if (filesData.code === 200) {
          setFiles(filesData.data?.items || filesData.data?.files || filesData.data || []);
        }

        const readmeData = await readmeRes.json();
        setReadmeContent(readmeData.code === 200 ? (readmeData.data?.content || null) : null);
      } catch (err) {
        console.error('Failed to load extra data:', err);
      }
    }
    loadExtraData();
  }, [repo, isLoading, username, repoName]);

  // 创建分支
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setIsCreatingBranch(true);
    try {
      const data = await api.post<{ id: string; name: string; isDefault: boolean }>(`/api/v1/repos/${username}/${repoName}/branches`, { name: newBranchName.trim(), sourceBranch: currentBranch });
      if (data.code === 200) {
        setRepoBranches(prev => [...prev, data.data]);
        setNewBranchName('');
        setShowBranchDropdown(false);
        setCurrentBranch(newBranchName.trim());
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch {
      toast.error('创建失败');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // 获取文件树（依赖分支和路径）
  const fetchFiles = useCallback(async () => {
    if (!repo) return;
    setFilesLoading(true);
    try {
      const pathParam = currentPath.length > 0 ? `path=${currentPath.join('/')}&` : '?';
      const treeRes = await fetch(`/api/v1/repos/${username}/${repoName}/tree?${pathParam}branch=${encodeURIComponent(currentBranch)}`);
      const treeData = await treeRes.json();
      if (treeData.code === 200) {
        setFiles(treeData.data?.items || treeData.data?.files || treeData.data || []);
      }
      // 只在根目录获取 README.md 内容
      if (currentPath.length === 0) {
        const readmeRes = await fetch(`/api/v1/repos/${username}/${repoName}/blob/README.md?branch=${encodeURIComponent(currentBranch)}`);
        const readmeData = await readmeRes.json();
        setReadmeContent(readmeData.code === 200 ? (readmeData.data?.content || null) : null);
      } else {
        setReadmeContent(null);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setFilesLoading(false);
    }
  }, [repo, username, repoName, currentPath, currentBranch]);

  // 使用 Repo Navigation Hook (handleEnterFolder)
  const { handleEnterFolder } = useRepoNavigation({
    username,
    repoName,
    currentPath,
    currentBranch,
    setCurrentPath,
    setCurrentBranch,
    setFiles,
  });

  // 使用 Repo Files Hook (handleDownloadFromUrl)
  const { handleDownloadFromUrl } = useRepoFiles({
    username,
    repoName,
    currentPath,
    currentBranch,
    setFiles,
    refreshFiles: fetchFiles,
  });

  // 仅在路径或分支变化时重新获取文件（初始加载已在主请求中完成）
  useEffect(() => {
    // 跳过初始加载，因为主请求已经获取了文件
    if (currentPath.length > 0 || currentBranch !== repo?.defaultBranch) {
      fetchFiles();
    }
  }, [currentPath, currentBranch]);

  // 全局拖拽上传到浏览器窗口（整个页面）
  useEffect(() => {
    // 只有仓库所有者才能上传
    if (!isOwner) return;
    
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      // 检查是否有文件被拖入
      if (e.dataTransfer?.types.includes('Files')) {
        setIsGlobalDragging(true);
      }
    };
    
    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // 只有当鼠标离开窗口时才清除
      if (e.relatedTarget === null || !document.body.contains(e.relatedTarget as Node)) {
        setIsGlobalDragging(false);
      }
    };
    
    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(false);
      
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      
      // 将文件添加到待上传队列
      const fileArray = Array.from(files);
      setPendingFiles(prev => [...prev, ...fileArray]);
      
      // 如果上传模态框未打开，则打开它
      if (!showChunkedUploadModal) {
        setShowChunkedUploadModal(true);
      }
    };
    
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);
    
    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [isOwner, showChunkedUploadModal]);
  
  // 全局粘贴上传（Ctrl+V）
  useEffect(() => {
    // 只有仓库所有者才能上传
    if (!isOwner) return;
    
    const handlePaste = (e: ClipboardEvent) => {
      // 检查是否在输入框中
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      
      if (files.length > 0) {
        e.preventDefault();
        // 将文件添加到待上传队列
        setPendingFiles(prev => [...prev, ...files]);
        
        // 如果上传模态框未打开，则打开它
        if (!showChunkedUploadModal) {
          setShowChunkedUploadModal(true);
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOwner, showChunkedUploadModal]);
  
  // 清除待上传文件
  const clearPendingFiles = useCallback(() => {
    setPendingFiles([]);
  }, []);




  // 打开 Fork 申请模态框
  const handleOpenForkRequest = () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setShowForkRequestModal(true);
  };

  // 获取 Fork 申请列表
  const fetchForkRequests = async (status?: string) => {
    setIsLoadingForkRequests(true);
    try {
      const statusParam = status || forkRequestsStatus;
      const data = await api.get<{ id: string; status: string; message: string | null; note: string | null; expiresAt: string | null; createdAt: string; processedAt: string | null; requester: { id: string; username: string; avatarUrl: string | null } }[]>(`/api/v1/repos/${username}/${repoName}/fork-requests?status=${statusParam}&page=${forkRequestPage}&pageSize=10`);
      if (data.code === 200) {
        setForkRequests(data.data || []);
        // V1 meta 不含 total，使用返回数组长度
        setForkRequestsTotal(data.data.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch fork requests:', err);
    } finally {
      setIsLoadingForkRequests(false);
    }
  };

  // 批准 Fork 申请（子组件已调用 API，此处只刷新父组件状态）
  const handleApproveForkRequest = async (requestId: string) => {
    toast.success('已批准 Fork 申请');
    fetchForkRequests();
  };

  // 打开拒绝模态框
  const handleOpenRejectModal = (requestId: string) => {
    setCurrentRejectId(requestId);
    setRejectNote('');
    setShowRejectModal(true);
  };

  // 拒绝 Fork 申请（子组件已调用 API，此处只刷新父组件状态）
  const handleRejectForkRequest = async () => {
    toast.success('已拒绝 Fork 申请');
    fetchForkRequests();
  };

  // 切换到 fork-requests 子 Tab 时获取数据
  useEffect(() => {
    if (settingsSubTab === 'fork-requests' && forkRequests.length === 0) {
      fetchForkRequests();
    }
  }, [settingsSubTab]);

  const handleCreate = async () => {
    if (!newItemName.trim()) {
      toast.error(`请输入${createType === 'file' ? '文件名' : '文件夹名称'}`);
      return;
    }

    const itemName = newItemName.trim();
    
    // 如果创建文件，检查文件名格式
    if (createType === 'file' && !itemName.includes('.')) {
      toast.error('文件名需要包含扩展名（如 .txt, .md）');
      return;
    }

    setIsCreating(true);
    try {
      const data = await api.post(`/api/v1/repos/${username}/${repoName}/upload`, {
        // API 需要 name 字段
        name: itemName,
        // 使用当前路径 + 新文件名
        path: buildFilePath(currentPath, itemName),
        content: newFileContent || '',
        isDirectory: createType === 'folder',
        type: createType === 'folder' ? 'dir' : 'file',
        message: `Create ${itemName}`,
        branch: currentBranch,
      });
      if (data.code === 200) {
        // 显示成功通知
        toast.success(createType === 'folder' ? '文件夹创建成功' : '文件创建成功');
        setShowNewModal(false);
        setNewItemName('');
        setNewFileContent('');
        // 刷新文件列表
        const pathParam = currentPath.length > 0 ? `path=${currentPath.join('/')}&` : '?';
        const treeRes = await fetch(`/api/v1/repos/${username}/${repoName}/tree?${pathParam}branch=${encodeURIComponent(currentBranch)}`);
        const treeData = await treeRes.json();
        if (treeData.code === 200) {
          setFiles(treeData.data?.items || treeData.data?.files || treeData.data || []);
        }
        // 如果创建的是文件夹，自动进入
        if (createType === 'folder') {
          handleEnterFolder(itemName);
        } else {
          // 如果创建的是文件，跳转到编辑页面
          router.push(`/${username}/${repoName}/blob/${currentPath.length > 0 ? currentPath.join('/') + '/' + itemName : itemName}?branch=${encodeURIComponent(currentBranch)}`);
        }
      } else {
        toast.error(data.message || '创建失败');
      }
    } catch (err) {
      console.error('Failed to create:', err);
      toast.error('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };


  if (isLoading) return null;

  if (error || !repo) {
    return <Empty title="此目录为空" />;
  }

  return (
    <PageLayout containerWidth="full" padding="none">
      <PageLayoutContent>
        <div className="flex-1 min-w-0">
          {/* 移动端 Tabs — 对齐样本：文件 | 文件问题 | 设置 */}
          <Tabs
            className="md:hidden"
            items={[
              { key: 'code', label: '文件', icon: <CodeIcon />, count: files.length },
              { key: 'issues', label: '文件问题', icon: <IssueIcon />, count: repoStats ? Number((repoStats as Record<string, unknown>).openIssueCount || 0) : 0 },
              ...(isOwner ? [{ key: 'settings', label: '设置', icon: <SettingsIcon /> }] : []),
            ]}
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as RepoTab)}
          />

      {/* Repo Header — 对齐样本：单一边框，图标+owner/name */}
      <RepoHeader
        owner={username}
        name={repo.name}
        description={repo.description}
        visibility={repo.visibility === 1 ? 'public' : 'private'}
        actions={
          <>
            <Button variant="secondary" onClick={toggleWatch}>
              <WatchIcon />
              {isWatching ? '已关注' : '关注'}
              <span className="ml-1 text-xs px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded-full">{repo.watchCount}</span>
            </Button>
            <Button variant="secondary" onClick={toggleStar}>
              <StarIcon />
              {isStarred ? '已收藏' : '收藏'}
              <span className="ml-1 text-xs px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded-full">{hookStarCount}</span>
            </Button>
            <Button variant="secondary" onClick={() => setShowRepoZipDownload(true)}>
              <DownloadIcon />
              下载全部
            </Button>
            {isOwner && (
              <Button variant="secondary" onClick={handleOpenShare}>
                <ShareIcon />
                分享
              </Button>
            )}
          </>
        }
      />

      {/* Tabs — 对齐样本：文件 (N) | 文件问题 (N) | 设置 */}
      <Tabs
        className="px-5"
        items={[
          { key: 'code', label: '文件', icon: <CodeIcon />, count: files.length },
          { key: 'issues', label: '文件问题', icon: <IssueIcon />, count: repoStats ? Number((repoStats as Record<string, unknown>).openIssueCount || 0) : 0 },
          ...(isOwner ? [{ key: 'settings', label: '设置', icon: <SettingsIcon /> }] : []),
        ]}
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as RepoTab)}
      />

      {/* Main Content */}
      {activeTab === 'code' && (
        <RepoCodeTab
          username={username}
          repoName={repoName}
          isOwner={isOwner}
          currentUser={currentUser}
          repoStats={repoStats}
          repo={repo}
          files={files}
          readmeContent={readmeContent}
          currentPath={currentPath}
          currentBranch={currentBranch}
          repoBranches={repoBranches}
          showBranchDropdown={showBranchDropdown}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          isDragging={isDragging}
          isGlobalDragging={isGlobalDragging}
          selectedFiles={selectedFiles}
          isSelecting={isSelecting}
          batchOperation={batchOperation}
          moveTargetPath={moveTargetPath}
          isBatchOperating={isBatchOperating}
          singleMoveFile={singleMoveFile}
          singleMoveTarget={singleMoveTarget}
          isSingleMoving={isSingleMoving}
          contextMenu={contextMenu}
          setFiles={setFiles}
          setCurrentPath={setCurrentPath}
          setCurrentBranch={setCurrentBranch}
          setShowBranchDropdown={setShowBranchDropdown}
          setIsUploading={setIsUploading}
          setUploadProgress={setUploadProgress}
          setIsDragging={setIsDragging}
          setIsGlobalDragging={setIsGlobalDragging}
          setSelectedFiles={setSelectedFiles}
          setIsSelecting={setIsSelecting}
          setBatchOperation={setBatchOperation}
          setMoveTargetPath={setMoveTargetPath}
          setIsBatchOperating={setIsBatchOperating}
          setSingleMoveFile={setSingleMoveFile}
          setSingleMoveTarget={setSingleMoveTarget}
          setIsSingleMoving={setIsSingleMoving}
          setContextMenu={setContextMenu}
          onOpenNewModal={(type: 'file' | 'folder') => { setCreateType(type); setNewItemName(''); setShowNewModal(true); }}
          onOpenChunkedUploadModal={() => setShowChunkedUploadModal(true)}
          onOpenDownloadModal={() => setShowDownloadModal(true)}
          onOpenVersionHistory={handleOpenVersionHistory}
        />
      )}

      {activeTab === 'issues' && (
        <RepoIssuesTab
          username={username}
          repoName={repoName}
        />
      )}

      {activeTab === 'pulls' && (
        <RepoPullsTab
          username={username}
          repoName={repoName}
          defaultBranch={repo?.defaultBranch}
        />
      )}

      {activeTab === 'settings' && (
        <RepoSettingsTab
          username={username}
          repoName={repoName}
          repo={repo}
          onSaveSettings={handleSaveSettings}
          onDeleteRepo={handleDeleteRepo}
          onFetchForkRequests={fetchForkRequests}
          onApproveForkRequest={handleApproveForkRequest}
          onRejectForkRequest={handleRejectForkRequest}
        />
      )}

      {/* 新建文件/文件夹模态框 */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title={createType === 'file' ? '创建新文件' : '创建新文件夹'}
        maxWidth="480px"
        footer={
          <ModalFooter
            onCancel={() => setShowNewModal(false)}
            onConfirm={handleCreate}
            confirmLabel={createType === 'file' ? '创建文件' : '创建文件夹'}
            confirmLoading={isCreating}
          />
        }
      >
        <Field label={createType === 'file' ? '文件名' : '文件夹名称'}>
          <Input
            type="text"
            placeholder={createType === 'file' ? '例如: README.md, index.js' : '例如: src, components, docs'}
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
        </Field>
        {createType === 'file' && (
          <Field label="文件内容（可选）">
            <Input
              id="repo-create-file-content"
              multiline
              rows={10}
              placeholder="在此输入文件内容..."
              value={newFileContent}
              onChange={e => setNewFileContent(e.target.value)}
            />
          </Field>
        )}
      </Modal>


      {/* 从URL下载弹窗 */}
      <RepoDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownloadFromUrl}
      />

      {/* 仓库ZIP下载弹窗 */}
      <RepoDownloadModal
        mode="repo-zip"
        isOpen={showRepoZipDownload}
        onClose={() => setShowRepoZipDownload(false)}
        ownerName={username}
        repoName={repoName}
      />


      {/* 分片上传模态框 */}
      <Modal
        isOpen={showChunkedUploadModal}
        onClose={() => {
          if (!isUploading) {
            setShowChunkedUploadModal(false);
            clearPendingFiles();
          }
        }}
        title="上传文件"
        maxWidth="700px"
        closeOnOverlay={!isUploading}
      >
        <ChunkedUploadModal
          username={username}
          repoName={repoName}
          currentPath={currentPath.join('/')}
          branch={currentBranch}
          initialFiles={pendingFiles}
          onClose={() => {
            setShowChunkedUploadModal(false);
            clearPendingFiles();
          }}
          onUploadComplete={() => {
            fetchFiles();
            setShowChunkedUploadModal(false);
            clearPendingFiles();
          }}
        />
      </Modal>

      {/* 快捷键提示 */}
      <div className="flex items-center justify-center gap-1.5 py-4 text-xs text-[var(--ds-text-secondary)] border-t border-[var(--ds-border-default)] mt-8">
        <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">G</span>
        <span>+</span>
        <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">I</span>
        <span>Issues</span>
        <span>·</span>
        <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">G</span>
        <span>+</span>
        <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">P</span>
        <span>合并请求</span>
        <span>·</span>
        <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">G</span>
        <span>+</span>
        <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">D</span>
        <span>Discussions</span>
        {isOwner && (
          <>
            <span>·</span>
            <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">G</span>
            <span>+</span>
            <span className="px-1.5 py-0.5 bg-[var(--ds-surface-subtle)] rounded font-mono text-xs">S</span>
            <span>Settings</span>
          </>
        )}
      </div>

      {/* 分享模态框 */}
      <RepoShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        username={username}
        repoName={repoName}
        shareLinks={shareLinks}
        onShareLinksChange={setShareLinks}
      />

      {/* Fork 申请模态框 */}
      <RepoForkRequestModal
        isOpen={showForkRequestModal}
        onClose={() => setShowForkRequestModal(false)}
        username={username}
        repoName={repoName}
        onSubmit={async () => {}}
      />

      {/* 文件版本历史弹窗 */}
      <FileVersionHistoryModal
        isOpen={showVersionHistoryModal}
        onClose={() => setShowVersionHistoryModal(false)}
        username={username}
        repoName={repoName}
        fileId={versionHistoryFileId}
        fileName={versionHistoryFileName}
        branch={currentBranch}
        currentVersion={versionHistoryCurrentVersion}
      />

      {/* 右侧边栏 - 仓库信息 */}
      </div>
    </PageLayoutContent>
  </PageLayout>
  );
}
