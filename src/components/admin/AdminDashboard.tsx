'use client';

import React from 'react';
import { Button, Card } from '@/components/design';
import {
  DashboardIcon,
  UsersIcon,
  RepoIcon,
  FlagIcon,
  HistoryIcon,
} from './AdminIcons';
import type { DashboardData, ReportSummary } from './AdminTypes';

interface AdminDashboardProps {
  dashboardData: DashboardData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export default function AdminDashboard({
  dashboardData,
  isLoading,
  onRefresh,
  onNavigate,
}: AdminDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-[var(--ds-text-secondary)]">
        <div className="w-5 h-5 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] rounded-full animate-spin" />
        <p>加载中...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]">
        <DashboardIcon />
        <p className="mt-2">暂无数据</p>
        <Button variant="primary" className="mt-4" onClick={onRefresh}>
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="subtle" padding="md" className="flex items-center gap-3">
          <div className="text-[var(--ds-text-secondary)]">
            <UsersIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{dashboardData.totalUsers.toLocaleString()}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">总用户数</span>
          </div>
        </Card>
        <Card variant="subtle" padding="md" className="flex items-center gap-3">
          <div className="text-[var(--ds-accent-default)]">
            <UsersIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{dashboardData.newUsersToday.toLocaleString()}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">今日新用户</span>
          </div>
        </Card>
        <Card variant="subtle" padding="md" className="flex items-center gap-3">
          <div className="text-[var(--ds-text-secondary)]">
            <RepoIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{dashboardData.totalPublicRepos.toLocaleString()}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">公开仓库</span>
          </div>
        </Card>
        <Card variant="subtle" padding="md" className="flex items-center gap-3">
          <div className="text-[var(--ds-warning-default)]">
            <FlagIcon />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{dashboardData.pendingReports}</span>
            <span className="text-xs text-[var(--ds-text-secondary)]">待处理举报</span>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-2">
        <h2 className="text-base font-semibold text-[var(--ds-text-primary)] mb-4">快速操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="secondary"
            icon={<UsersIcon />}
            className="flex-col p-4 text-sm w-full"
            onClick={() => onNavigate('users')}
          >
            用户管理
          </Button>
          <Button
            variant="secondary"
            icon={<RepoIcon />}
            className="flex-col p-4 text-sm w-full"
            onClick={() => onNavigate('repos')}
          >
            仓库管理
          </Button>
          <Button
            variant="secondary"
            icon={<FlagIcon />}
            className="flex-col p-4 text-sm w-full relative"
            onClick={() => onNavigate('reports')}
          >
            处理举报
            {(dashboardData?.pendingReports ?? 0) > 0 && (
              <span className="absolute top-1 right-1 text-xs px-2 py-0.5 bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] rounded-full font-medium">{dashboardData?.pendingReports}</span>
            )}
          </Button>
          <Button
            variant="secondary"
            icon={<HistoryIcon />}
            className="flex-col p-4 text-sm w-full"
            onClick={() => onNavigate('audit')}
          >
            查看日志
          </Button>
        </div>
      </div>

      {/* Recent Reports */}
      {dashboardData?.recentReports && dashboardData.recentReports.length > 0 ? (
        <div className="mt-2">
          <h2 className="text-base font-semibold text-[var(--ds-text-primary)] mb-4">最新举报</h2>
          <div className="flex flex-col gap-2">
            {dashboardData.recentReports.slice(0, 3).map((report: ReportSummary) => (
              <Card key={report.id} variant="subtle" padding="md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 bg-[var(--ds-danger-subtle)] text-[var(--ds-danger-default)] rounded-full font-medium">{report.targetType}</span>
                  <span className="text-xs text-[var(--ds-text-secondary)]">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="text-sm font-medium text-[var(--ds-text-primary)] mb-1 truncate">{report.reason}</h3>
                <p className="text-xs text-[var(--ds-text-secondary)]">举报人: @{report.reporterUsername || '未知'}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : !isLoading && (
        <div className="mt-2">
          <h2 className="text-base font-semibold text-[var(--ds-text-primary)] mb-4">最新举报</h2>
          <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]">
            <FlagIcon />
            <p className="mt-2">暂无待处理的举报</p>
          </div>
        </div>
      )}
    </div>
  );
}
