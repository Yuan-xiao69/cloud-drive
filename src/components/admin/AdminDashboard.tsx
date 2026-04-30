'use client';

import React from 'react';
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
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="empty-state">
        <DashboardIcon />
        <p>暂无数据</p>
        <button className="btn btn-primary" onClick={onRefresh}>
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <UsersIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData.totalUsers.toLocaleString()}</span>
            <span className="stat-label">总用户数</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon highlight">
            <UsersIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData.newUsersToday.toLocaleString()}</span>
            <span className="stat-label">今日新用户</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <RepoIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData.totalPublicRepos.toLocaleString()}</span>
            <span className="stat-label">公开仓库</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <FlagIcon />
          </div>
          <div className="stat-info">
            <span className="stat-value">{dashboardData.pendingReports}</span>
            <span className="stat-label">待处理举报</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="action-cards">
        <h2 className="section-title">快速操作</h2>
        <div className="action-grid">
          <button className="action-card" onClick={() => onNavigate('users')}>
            <UsersIcon />
            <span>用户管理</span>
          </button>
          <button className="action-card" onClick={() => onNavigate('repos')}>
            <RepoIcon />
            <span>仓库管理</span>
          </button>
          <button className="action-card" onClick={() => onNavigate('reports')}>
            <FlagIcon />
            <span>处理举报</span>
            {(dashboardData?.pendingReports ?? 0) > 0 && (
              <span className="badge">{dashboardData?.pendingReports}</span>
            )}
          </button>
          <button className="action-card" onClick={() => onNavigate('audit')}>
            <HistoryIcon />
            <span>查看日志</span>
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      {dashboardData?.recentReports && dashboardData.recentReports.length > 0 ? (
        <div className="recent-section">
          <h2 className="section-title">最新举报</h2>
          <div className="report-list">
            {dashboardData.recentReports.slice(0, 3).map((report: ReportSummary) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <span className="report-type label label-danger">{report.targetType}</span>
                  <span className="report-time">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="report-target">{report.reason}</h3>
                <p className="report-meta">举报人: @{report.reporterUsername || '未知'}</p>
              </div>
            ))}
          </div>
        </div>
      ) : !isLoading && (
        <div className="recent-section">
          <h2 className="section-title">最新举报</h2>
          <div className="empty-state">
            <FlagIcon />
            <p>暂无待处理的举报</p>
          </div>
        </div>
      )}
    </div>
  );
}
