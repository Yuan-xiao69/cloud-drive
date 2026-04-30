// Repo 页面共享类型定义

export interface Issue {
  id: string;
  title: string;
  content: string;
  status: string;
  commentsCount: number;
  authorUsername: string;
  authorAvatar?: string | null;
  createdAt: string;
}

export interface PullRequest {
  id: string;
  title: string;
  content: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  commentsCount: number;
  authorUsername: string;
  authorAvatar?: string | null;
  createdAt: string;
}

export interface RepoData {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  watchCount: number;
  visibility: number;
  updatedAt: string;
  createdAt: string;
  defaultBranch?: string;
  owner: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

export interface RepoItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
  fileId?: string; // 文件版本历史用
  size?: number;
  mimeType?: string;
}

export interface ShareLink {
  id: string;
  token: string;
  path: string | null;
  permission: string;
  hasPassword: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  createdAt: string;
}

export interface ForkRequest {
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
}

export type IssueStatus = 'open' | 'closed' | 'all';
export type PullStatus = 'open' | 'merged' | 'closed' | 'all';
export type SettingsSubTab = 'general' | 'fork-requests';
