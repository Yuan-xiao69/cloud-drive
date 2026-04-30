import React from 'react';
import Header from '@/components/layout/Header';
import HomePageContent from './HomePageContent';

interface Repo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  starCount: number;
  forkCount: number;
  owner: { username: string; avatarUrl?: string } | null;
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  viewCount: number;
  commentCount: number;
  category: string;
  author: { username: string; avatarUrl?: string } | null;
  createdAt: string;
}

interface Stats {
  repos: number;
  users: number;
  discussions: number;
}

async function fetchSearchData<T>(type: string, page: number, size: number): Promise<T[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(
      `${baseUrl}/api/v1/search?type=${type}&q=&page=${page}&size=${size}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    return data.data?.items || [];
  } catch (error) {
    console.error(`Failed to fetch ${type}:`, error);
    return [];
  }
}

async function fetchStats(): Promise<Stats> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const [reposRes, usersRes, discussionsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/search?type=repos&q=&page=1&size=1`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/v1/search?type=users&q=&page=1&size=1`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/v1/search?type=discussions&q=&page=1&size=1`, { cache: 'no-store' }),
    ]);
    
    const [reposData, usersData, discussionsData] = await Promise.all([
      reposRes.json(),
      usersRes.json(),
      discussionsRes.json(),
    ]);
    
    return {
      repos: reposData.data?.pagination?.total || 0,
      users: usersData.data?.pagination?.total || 0,
      discussions: discussionsData.data?.pagination?.total || 0,
    };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return { repos: 0, users: 0, discussions: 0 };
  }
}

export default async function Page() {
  // 并行获取所有数据
  const [hotRepos, hotDiscussions, stats] = await Promise.all([
    fetchSearchData<Repo>('repos', 1, 6),
    fetchSearchData<Discussion>('discussions', 1, 4),
    fetchStats(),
  ]);
  
  return (
    <div className="home-page">
      <Header />
      <HomePageContent
        hotRepos={hotRepos}
        hotDiscussions={hotDiscussions}
        stats={stats}
      />
    </div>
  );
}
