'use client';

import { createContext, useContext } from 'react';

// ── 侧栏数据类型 ──────────────────────────────

export interface SidebarRepo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  visibility: 'public' | 'private';
  isFork?: boolean;
  starCount: number;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface SidebarPR {
  id: string;
  title: string;
  status: string;
  sourceBranch: string;
  targetBranch: string;
  createdAt: string;
  repository: {
    id: string;
    name: string;
    owner: { username: string };
  };
  author: {
    username: string;
    avatarUrl?: string | null;
  };
}

export interface StarredRepo {
  repoId: string;
  starredAt: string;
  repo: {
    id: string;
    name: string;
    description: string | null;
    language: string | null;
    starCount: number;
    forkCount: number;
    visibility: 'public' | 'private';
    createdAt: string;
    owner: {
      id: string;
      username: string;
      avatarUrl?: string | null;
    };
  };
}

export interface SidebarData {
  myRepos: SidebarRepo[];
  incomingPRs: SidebarPR[];
  starredRepos: StarredRepo[];
  isAuthenticated: boolean;
  username: string | null;
  avatarUrl: string | null;
  role: string | null;
}

const defaultData: SidebarData = {
  myRepos: [],
  incomingPRs: [],
  starredRepos: [],
  isAuthenticated: false,
  username: null,
  avatarUrl: null,
  role: null,
};

const SidebarDataContext = createContext<SidebarData>(defaultData);

export function SidebarDataProvider({
  data,
  children,
}: {
  data: SidebarData;
  children: React.ReactNode;
}) {
  return (
    <SidebarDataContext.Provider value={data}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarData() {
  return useContext(SidebarDataContext);
}
