'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import ChunkedUploadModal from '@/components/repo/ChunkedUploadModal';
import FileTree from '@/components/repo/FileTree';
import { useAuth } from '@/lib/providers';
import { tokenManager } from '@/lib/api/client';
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
import { useRepoNavigation, useRepoFiles } from '@/components/repo/hooks';
import type { Issue, PullRequest, RepoData, RepoItem, ShareLink } from '@/components/repo/RepoTypes';
import toast from 'react-hot-toast';

type RepoTab = 'code' | 'issues' | 'pulls' | 'discussions' | 'settings';
type CreateType = 'file' | 'folder';

export default function RepoPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const repoName = params.repoName as string;
  const { user: currentUser } = useAuth();

  const [repo, setRepo] = useState<RepoData | null>(null);
  const [files, setFiles] = useState<RepoItem[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<RepoTab>('code');
  const [isStarred, setIsStarred] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // 问题状态
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issuesTotal, setIssuesTotal] = useState(0);
  const [issueStatus, setIssueStatus] = useState<'open' | 'closed' | 'all'>('open');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueContent, setNewIssueContent] = useState('');
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  // 拉取请求状态
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [pullsTotal, setPullsTotal] = useState(0);
  const [pullStatus, setPullStatus] = useState<'open' | 'merged' | 'closed' | 'all'>('open');
  const [showPRModal, setShowPRModal] = useState(false);
  const [newPRTitle, setNewPRTitle] = useState('');
  const [newPRContent, setNewPRContent] = useState('');
  const [newPRSourceBranch, setNewPRSourceBranch] = useState('');
  const [newPRTargetBranch, setNewPRTargetBranch] = useState('main');
  const [isCreatingPR, setIsCreatingPR] = useState(false);

  // 从URL下载状态
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // 仓库设置状态
  const [editRepoName, setEditRepoName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editVisibility, setEditVisibility] = useState<number>(1);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);

  // 仓库统计和分支
  const [repoStats, setRepoStats] = useState<Record<string, unknown> | null>(null);
  const [repoBranches, setRepoBranches] = useState<{id: string; name: string; isDefault: boolean}[]>([]);
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
      alert('仓库名称不能为空');
      return;
    }
    if (editRepoName !== repo?.name && !confirm(`确定要将仓库名称从 "${repo?.name}" 改为 "${editRepoName}" 吗？`)) {
      return;
    }
    
    setIsSavingSettings(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          name: editRepoName,
          description: editDescription,
          visibility: editVisibility,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('设置已保存');
        // 如果仓库名改变，需要跳转到新页面
        if (editRepoName !== repo?.name) {
          router.push(`/${username}/${editRepoName}`);
        } else {
          // 刷新仓库信息
          const repoRes = await fetch(`/api/v1/repos/${username}/${repoName}`);
          const repoData = await repoRes.json();
          if (repoData.code === 200) {
            setRepo(repoData.data);
          }
        }
      } else {
        alert(data.message || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('保存失败，请重试');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 删除仓库
  const handleDeleteRepo = async () => {
    if (!confirm(`确定要删除仓库 "${repo?.name}" 吗？此操作不可恢复！`)) {
      return;
    }
    if (!confirm('再次确认：删除后所有内容将被永久删除！')) {
      return;
    }
    
    setIsDeletingRepo(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('仓库已删除');
        router.push(`/${username}`);
      } else {
        alert(data.message || '删除失败');
      }
    } catch (err) {
      console.error('Failed to delete repo:', err);
      alert('删除失败，请重试');
    } finally {
      setIsDeletingRepo(false);
    }
  };

  const isOwner = currentUser?.username?.toLowerCase() === username?.toLowerCase();

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

  // 获取 Issues
  const fetchIssues = async (status: string = 'open') => {
    try {
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues?status=${status}`);
      const data = await res.json();
      if (data.code === 200) {
        setIssues(data.data?.items || []);
        setIssuesTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    }
  };

  // 获取 Pull Requests
  const fetchPulls = async (status: string = 'open') => {
    try {
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls?status=${status}`);
      const data = await res.json();
      if (data.code === 200) {
        setPulls(data.data?.items || []);
        setPullsTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch pulls:', err);
    }
  };

  // 创建 Issue
  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;
    setIsCreatingIssue(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ title: newIssueTitle, content: newIssueContent }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowIssueModal(false);
        setNewIssueTitle('');
        setNewIssueContent('');
        fetchIssues(issueStatus);
      } else {
        alert(data.message || '创建失败');
      }
    } catch (err) {
      alert('创建失败');
    } finally {
      setIsCreatingIssue(false);
    }
  };

  // 创建 Pull Request
  const handleCreatePR = async () => {
    if (!newPRTitle.trim()) return;
    setIsCreatingPR(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/pulls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          title: newPRTitle,
          content: newPRContent,
          sourceBranch: newPRSourceBranch,
          targetBranch: newPRTargetBranch,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowPRModal(false);
        setNewPRTitle('');
        setNewPRContent('');
        fetchPulls(pullStatus);
      } else {
        alert(data.message || '创建失败');
      }
    } catch (err) {
      alert('创建失败');
    } finally {
      setIsCreatingPR(false);
    }
  };

  // 获取仓库信息
  useEffect(() => {
    async function fetchRepo() {
      try {
        const repoRes = await fetch(`/api/v1/repos/${username}/${repoName}`);
        const repoData = await repoRes.json();
        if (repoData.code === 200) {
          setRepo(repoData.data);
          const defaultBranch = repoData.data?.defaultBranch || 'main';
          setNewPRSourceBranch('');
          setNewPRTargetBranch(defaultBranch);
          setCurrentBranch(defaultBranch);
        } else {
          setError('仓库不存在');
        }
      } catch (err) {
        console.error('Failed to fetch repo:', err);
        setError('加载失败');
      }
    }
    fetchRepo();
  }, [username, repoName]);

  // 获取仓库统计
  useEffect(() => {
    if (!repo) return;
    async function fetchStats() {
      try {
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/stats`);
        const data = await res.json();
        if (data.code === 200) setRepoStats(data.data);
      } catch (err) {
        console.error('Failed to fetch repo stats:', err);
      }
    }
    fetchStats();
  }, [username, repoName, repo]);

  // 获取分支列表
  useEffect(() => {
    if (!repo) return;
    async function fetchBranches() {
      try {
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/branches`);
        const data = await res.json();
        if (data.code === 200) {
          setRepoBranches(data.data.branches || []);
          if (data.data.repository?.defaultBranch) {
            setCurrentBranch(data.data.repository.defaultBranch);
          }
        } else {
          // 如果分支表为空，使用默认分支
          setRepoBranches([{ id: '', name: repo?.defaultBranch || 'main', isDefault: true }]);
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    }
    fetchBranches();
  }, [username, repoName, repo]);

  // 创建分支
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setIsCreatingBranch(true);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/branches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ name: newBranchName.trim(), sourceBranch: currentBranch }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setRepoBranches(prev => [...prev, data.data]);
        setNewBranchName('');
        setShowBranchDropdown(false);
        setCurrentBranch(newBranchName.trim());
      } else {
        alert(data.message || '创建失败');
      }
    } catch {
      alert('创建失败');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  // 获取文件树（依赖分支和路径）
  const fetchFiles = useCallback(async () => {
    if (!repo) return;
    setIsLoading(true);
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
      setIsLoading(false);
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

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

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

  const handleStar = async () => {
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/star`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 200) {
        setIsStarred(!isStarred);
      } else if (data.code === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to star:', err);
    }
  };

  const handleWatch = async () => {
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/watch`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 200) {
        setIsWatched(!isWatched);
      } else if (data.code === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to watch:', err);
    }
  };

  const handleFork = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    // 公开仓库直接 fork
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert(`成功 fork 到 ${currentUser.username}/${repoName}`);
        router.push(`/${currentUser.username}/${repoName}`);
      } else if (data.code === 401) {
        router.push('/login');
      } else {
        alert(data.message || 'Fork 失败');
      }
    } catch (err) {
      console.error('Failed to fork:', err);
      alert('Fork 失败');
    }
  };

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
      const token = tokenManager.getAccessToken();
      const statusParam = status || forkRequestsStatus;
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-requests?status=${statusParam}&page=${forkRequestPage}&pageSize=10`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await res.json();
      if (data.code === 200) {
        setForkRequests(data.data || []);
        // 从 meta 中获取 total
        if (data.meta) {
          setForkRequestsTotal(data.meta.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch fork requests:', err);
    } finally {
      setIsLoadingForkRequests(false);
    }
  };

  // 批准 Fork 申请
  const handleApproveForkRequest = async (requestId: string) => {
    if (!confirm('确定要批准这个 Fork 申请吗？')) return;
    
    setProcessingRequestId(requestId);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ action: 'approve' }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('已批准 Fork 申请');
        fetchForkRequests();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) {
      console.error('Failed to approve fork request:', err);
      alert('操作失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 打开拒绝模态框
  const handleOpenRejectModal = (requestId: string) => {
    setCurrentRejectId(requestId);
    setRejectNote('');
    setShowRejectModal(true);
  };

  // 拒绝 Fork 申请
  const handleRejectForkRequest = async () => {
    if (!currentRejectId) return;
    
    setProcessingRequestId(currentRejectId);
    try {
      const token = tokenManager.getAccessToken();
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/fork-requests/${currentRejectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ action: 'reject', note: rejectNote }),
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('已拒绝 Fork 申请');
        setShowRejectModal(false);
        fetchForkRequests();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (err) {
      console.error('Failed to reject fork request:', err);
      alert('操作失败');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 切换到 fork-requests 子 Tab 时获取数据
  useEffect(() => {
    if (settingsSubTab === 'fork-requests' && forkRequests.length === 0) {
      fetchForkRequests();
    }
  }, [settingsSubTab]);

  const handleCreate = async () => {
    if (!newItemName.trim()) {
      alert(`请输入${createType === 'file' ? '文件名' : '文件夹名称'}`);
      return;
    }

    const itemName = newItemName.trim();
    
    // 如果创建文件，检查文件名格式
    if (createType === 'file' && !itemName.includes('.')) {
      alert('文件名需要包含扩展名（如 .txt, .md）');
      return;
    }

    setIsCreating(true);
    try {
      // 获取 token
      const token = tokenManager.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/repos/${username}/${repoName}/upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          // API 需要 name 字段
          name: itemName,
          // 使用当前路径 + 新文件名
          path: currentPath.length > 0 ? `${currentPath.join('/')}/${itemName}` : itemName,
          content: newFileContent || '',
          isDirectory: createType === 'folder',
          type: createType === 'folder' ? 'dir' : 'file',
          message: `Create ${itemName}`,
          branch: currentBranch,
        })
      });

      const data = await res.json();
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
        alert(data.message || '创建失败');
      }
    } catch (err) {
      console.error('Failed to create:', err);
      alert('创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // G + 快捷键导航
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // 设置待处理的 G 命令
        (window as unknown as { __pendingGCommand: boolean }).__pendingGCommand = true;
        setTimeout(() => {
          (window as unknown as { __pendingGCommand: boolean }).__pendingGCommand = false;
        }, 1000); // 1秒内有效
        return;
      }

      // 检查是否有待处理的 G 命令
      const pendingG = (window as unknown as { __pendingGCommand: boolean }).__pendingGCommand;
      
      if (pendingG) {
        (window as unknown as { __pendingGCommand: boolean }).__pendingGCommand = false;
        
        switch (e.key.toLowerCase()) {
          case 'i': // G + I: Issues
            e.preventDefault();
            setActiveTab('issues');
            break;
          case 'p': // G + P: Pull Requests
            e.preventDefault();
            setActiveTab('pulls');
            break;
          case 'd': // G + D: Discussions
            e.preventDefault();
            setActiveTab('discussions');
            break;
          case 's': // G + S: Settings (仅所有者)
            e.preventDefault();
            if (isOwner) {
              setActiveTab('settings');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOwner]);

  if (isLoading) {
    return (
      <div className="page">
        <Header />
        <div className="repo-header">
          <div className="skeleton h-12 w-full mb-4"></div>
          <div className="skeleton h-10 w-full"></div>
        </div>
        <div className="repo-layout">
          <main className="repo-main">
            <div className="skeleton h-48 w-full"></div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="page">
        <Header />
        <div className="page-container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">{error || '仓库不存在'}</h1>
          <a href="/" className="btn btn-primary">返回首页</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page repo-page">
      <Header />
      <div className="repo-layout-wrapper">
        {/* 左侧边栏 */}
        <LeftSidebar />

        {/* 中间主内容 */}
        <div className="repo-container">
          {/* 移动端底部导航 */}
          <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          <CodeIcon />
          <span>代码</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          <IssueIcon />
          <span>Issues</span>
        </button>
        <button
          className={`mobile-nav-item ${activeTab === 'pulls' ? 'active' : ''}`}
          onClick={() => setActiveTab('pulls')}
        >
          <PullRequestIcon />
          <span>Pull</span>
        </button>
        {isOwner && (
          <button
            className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon />
            <span>设置</span>
          </button>
        )}
      </nav>

      {/* Repo Header */}
      <div className="repo-header">
        <div className="repo-header-content">
          {/* Owner / Repo Name */}
          <div className="repo-title">
            <RepoIcon />
            <Link href={`/${username}`} className="repo-owner">
              {username}
            </Link>
            <span className="repo-sep">/</span>
            <Link href={`/${username}/${repoName}`} className="repo-name">
              {repo.name}
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="repo-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleWatch}>
              <WatchIcon />
              {isWatched ? '已关注' : '关注'}
              <span className="counter">{repo.watchCount}</span>
            </button>
            {isOwner && (
              <button className="btn btn-secondary btn-sm" onClick={handleOpenShare}>
                <ShareIcon />
                分享
              </button>
            )}
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={repo.visibility === 1 && username !== currentUser?.username ? handleFork : handleOpenForkRequest}
              title={repo.visibility === 1 && username !== currentUser?.username ? 'Fork 此仓库' : '申请 Fork 此仓库'}
            >
              <ForkIcon />
              {repo.visibility === 1 && username !== currentUser?.username ? '分叉' : '申请Fork'}
              <span className="counter">{repo.forkCount}</span>
            </button>
            <button
              className={`btn btn-secondary btn-sm ${isStarred ? 'starred' : ''}`}
              onClick={handleStar}
            >
              <StarIcon />
              {isStarred ? '已收藏' : '收藏'}
              <span className="counter">{isStarred ? repo.starCount + 1 : repo.starCount}</span>
            </button>
            {currentUser && !isOwner && (
              <ActionMenu
                type="repository"
                targetId={repo.id}
                targetTitle={`${username}/${repoName}`}
              />
            )}
          </div>
        </div>

        {/* Branch Selector */}
        <div className="branch-selector-wrap" style={{ position: 'relative' }}>
          <button
            className="branch-select-btn"
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
          >
            <GitBranchIcon />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentBranch}
            </span>
            <ChevronDownIcon />
          </button>
          {showBranchDropdown && (
            <div className="branch-dropdown">
              {repoBranches.map(b => (
                <div
                  key={b.id}
                  className={`branch-dropdown-item ${b.name === currentBranch ? 'current' : ''}`}
                  onClick={() => {
                    setCurrentBranch(b.name);
                    setShowBranchDropdown(false);
                  }}
                >
                  <GitBranchIcon />
                  <span style={{ flex: 1 }}>{b.name}</span>
                  {b.isDefault && <span className="default-badge">默认</span>}
                </div>
              ))}
              {isOwner && (
                <div className="branch-dropdown-create">
                  <input
                    type="text"
                    placeholder="新分支名..."
                    value={newBranchName}
                    onChange={e => setNewBranchName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateBranch(); }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleCreateBranch}
                    disabled={isCreatingBranch || !newBranchName.trim()}
                  >
                    {isCreatingBranch ? '...' : '创建'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <nav className="repo-tabs">
          <button
            className={`tab-item ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            <CodeIcon />
            文件
          </button>
          <button
            className={`tab-item ${activeTab === 'issues' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('issues');
              if (issues.length === 0) fetchIssues(issueStatus);
            }}
          >
            <IssueIcon />
            问题
            {issuesTotal > 0 && <span className="counter">{issuesTotal}</span>}
          </button>
          <button
            className={`tab-item ${activeTab === 'pulls' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('pulls');
              if (pulls.length === 0) fetchPulls(pullStatus);
            }}
          >
            <PullRequestIcon />
            拉取请求
            {pullsTotal > 0 && <span className="counter">{pullsTotal}</span>}
          </button>
          {isOwner && (
            <button
              className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon />
              设置
            </button>
          )}
        </nav>
      </div>

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
          onOpenNewModal={(type) => { setCreateType(type); setNewItemName(''); setShowNewModal(true); }}
          onOpenChunkedUploadModal={() => setShowChunkedUploadModal(true)}
          onOpenDownloadModal={() => setShowDownloadModal(true)}
          onOpenVersionHistory={handleOpenVersionHistory}
        />
      )}

      {activeTab === 'issues' && (
        <RepoIssuesTab
          username={username}
          repoName={repoName}
          issues={issues}
          issuesTotal={issuesTotal}
          issueStatus={issueStatus}
          onStatusChange={setIssueStatus}
          showIssueModal={showIssueModal}
          onShowModalChange={setShowIssueModal}
          onCreateIssue={handleCreateIssue}
          onFetchIssues={fetchIssues}
        />
      )}

      {activeTab === 'pulls' && (
        <RepoPullsTab
          username={username}
          repoName={repoName}
          pulls={pulls}
          pullsTotal={pullsTotal}
          pullStatus={pullStatus}
          defaultBranch={repo?.defaultBranch}
          onStatusChange={setPullStatus}
          showPRModal={showPRModal}
          onShowModalChange={setShowPRModal}
          onCreatePR={handleCreatePR}
          onFetchPulls={fetchPulls}
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
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{createType === 'file' ? '创建新文件' : '创建新文件夹'}</h3>
              <button className="modal-close" onClick={() => setShowNewModal(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  {createType === 'file' ? '文件名' : '文件夹名称'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={createType === 'file' ? '例如: README.md, index.js' : '例如: src, components, docs'}
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                  autoFocus
                />
              </div>
              {createType === 'file' && (
                <div className="form-group">
                  <label className="form-label">文件内容（可选）</label>
                  <textarea
                    className="form-input"
                    rows={10}
                    placeholder="在此输入文件内容..."
                    value={newFileContent}
                    onChange={e => setNewFileContent(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowNewModal(false)}
                disabled={isCreating}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <span className="spinner"></span>
                    创建中...
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    {createType === 'file' ? '创建文件' : '创建文件夹'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 从URL下载弹窗 */}
      <RepoDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownloadFromUrl}
      />


      {/* 分片上传模态框 */}
      {showChunkedUploadModal && (
        <div className="modal-overlay" onClick={() => !isUploading && (setShowChunkedUploadModal(false), clearPendingFiles())}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
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
                // 刷新文件列表
                fetchFiles();
                setShowChunkedUploadModal(false);
                clearPendingFiles();
              }}
            />
          </div>
        </div>
      )}

      {/* 快捷键提示 */}
      <div className="shortcuts-hint">
        <span className="shortcut-key">G</span>
        <span className="shortcut-sep">+</span>
        <span className="shortcut-key">I</span>
        <span className="shortcut-label">Issues</span>
        <span className="shortcut-sep">·</span>
        <span className="shortcut-key">G</span>
        <span className="shortcut-sep">+</span>
        <span className="shortcut-key">P</span>
        <span className="shortcut-label">Pull Requests</span>
        <span className="shortcut-sep">·</span>
        <span className="shortcut-key">G</span>
        <span className="shortcut-sep">+</span>
        <span className="shortcut-key">D</span>
        <span className="shortcut-label">Discussions</span>
        {isOwner && (
          <>
            <span className="shortcut-sep">·</span>
            <span className="shortcut-key">G</span>
            <span className="shortcut-sep">+</span>
            <span className="shortcut-key">S</span>
            <span className="shortcut-label">Settings</span>
          </>
        )}
      </div>

      {/* 分享模态框 */}
      <RepoShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        username={username}
        repoName={repoName}
        onCreateShare={async () => {}}
        onDeleteShare={async () => {}}
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
      <RightSidebar />
    </div>
    </div>
  );
}
