'use client';

import React, { useState } from 'react';
import {
  DashboardIcon,
  UsersIcon,
  RepoIcon,
  FlagIcon,
  ShieldIcon,
  AlertIcon,
  TimeIcon,
  SearchIcon,
  DownloadIcon,
} from './AdminIcons';
import { EnhancedStatCard } from './common/AdminCommon';
import { LineChart, BarChart, PieChart, RingProgress } from './charts/AdminCharts';
import type { 
  EnhancedDashboardData, 
  UrgentAlert, 
  ActivityLogItem,
  StatTrend 
} from './AdminTypes';

interface AdminDashboardEnhancedProps {
  dashboardData: EnhancedDashboardData | null;
  isLoading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

// 图标组件
const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"/>
  </svg>
);

const TrendingDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.22 2.766a2.75 2.75 0 013.294.66l4.488 7.936a2.75 2.75 0 01-.66 3.294 2.75 2.75 0 01-3.294-.66l-4.488-7.936a2.75 2.75 0 01.66-3.294zM6.75 9.25a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z"/>
  </svg>
);

const UsersIconNew = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z"/>
  </svg>
);

const RepoIconNew = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
  </svg>
);

const DiscussionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-5.5a.75.75 0 01-.75-.75v-.878a.75.75 0 00-.75-.75v-.878zm7.5 0v.878c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 00-1.5 0v.878a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75v-.878zm-10.5 0v-.878c0-.414.336-.75.75-.75h5.5a.75.75 0 00.75-.75v-.878a2.251 2.251 0 00-1.5 0v.878a.75.75 0 01-.75.75h-3.5a.75.75 0 01-.75-.75v-.878z"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM8 4.75a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 008 4.75zm0 6a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 008 10.75z"/>
  </svg>
);

const ShieldAlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a4 4 0 00-1.012 7.89l.776.36c.44.202.916.36 1.416.467l.002-.002a4.002 4.002 0 002.358 0l.002.002c.5-.107.976-.265 1.416-.467l.776-.36A4 4 0 108 1zM6 9.25a1 1 0 111 0v.25a.75.75 0 01-.75.75h-1a.75.75 0 01-.75-.75V9.25zm5.5 0v.25a.75.75 0 00.75.75h1a.75.75 0 00.75-.75V9.25a.75.75 0 00-.75-.75h-1a.75.75 0 00-.75.75zM8 13a1 1 0 100-2 1 1 0 000 2z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4.75 0a.75.75 0 01.75.75V2h5V.75a.75.75 0 011.5 0V2h1.25A1.75 1.75 0 0115 3.75v10.5A1.75 1.75 0 0113.25 16H2.75A1.75 1.75 0 011 14.25V3.75A1.75 1.75 0 012.75 2H4V.75A.75.75 0 014.75 0zm0 3.5A.25.25 0 015 3.25h6A.25.25 0 0111 3.5v1A.25.25 0 0110.75 5H5.25A.25.25 0 015 4.75v-1zm0 3.5h6a.25.25 0 01.25.25v1a.25.25 0 01-.25.25H5.25a.25.25 0 01-.25-.25v-1A.25.25 0 015 7.25zm5.5 2.75a.75.75 0 00-1.5 0v3c0 .414.336.75.75.75h1.5a.75.75 0 000-1.5H10v-2.25z"/>
  </svg>
);

export default function AdminDashboardEnhanced({
  dashboardData,
  isLoading,
  onRefresh,
  onNavigate,
}: AdminDashboardEnhancedProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>加载仪表盘数据...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-empty">
        <DashboardIcon />
        <h2>暂无数据</h2>
        <p>系统正在收集数据，请稍后再试</p>
        <button className="btn btn-primary" onClick={onRefresh}>
          重新加载
        </button>
      </div>
    );
  }

  // 准备图表数据
  const userGrowthData = dashboardData.trends.userGrowth.map(d => ({
    label: d.date.slice(5), // MM-DD
    value: d.count,
  }));

  const repoStatsData = dashboardData.trends.repoLanguages.slice(0, 6).map(d => ({
    label: d.language || 'Unknown',
    value: d.count,
  }));

  const reportTypeData = dashboardData.trends.reportTypes.map(d => ({
    label: d.type,
    value: d.count,
  }));

  return (
    <div className="dashboard-enhanced">
      {/* 欢迎标题和快捷操作 */}
      <div className="dashboard-header">
        <div className="dashboard-title-section">
          <h1 className="dashboard-title">欢迎回来，管理员</h1>
          <p className="dashboard-subtitle">这里显示平台的重要指标和待处理事项</p>
        </div>
        <div className="dashboard-actions">
          <select 
            className="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          >
            <option value="7d">近 7 天</option>
            <option value="30d">近 30 天</option>
            <option value="90d">近 90 天</option>
          </select>
          <button className="btn btn-secondary" onClick={onRefresh}>
            <RefreshIcon /> 刷新
          </button>
        </div>
      </div>

      {/* 紧急通知区域 */}
      {dashboardData.alerts && dashboardData.alerts.length > 0 && (
        <div className="alerts-section">
          {dashboardData.alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`alert-card alert-${alert.type}`}
            >
              <div className="alert-icon">
                {alert.type === 'urgent' ? <WarningIcon /> : 
                 alert.type === 'warning' ? <ShieldAlertIcon /> : 
                 <AlertIcon />}
              </div>
              <div className="alert-content">
                <h4 className="alert-title">{alert.title}</h4>
                <p className="alert-message">{alert.message}</p>
              </div>
              {alert.actionUrl && (
                <a href={alert.actionUrl} className="btn btn-sm">
                  {alert.actionLabel || '查看'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 统计卡片区域 */}
      <div className="stats-section">
        <EnhancedStatCard
          title="总用户数"
          value={dashboardData.stats.totalUsers.value}
          trend={{
            value: dashboardData.stats.totalUsers.change,
            type: dashboardData.stats.totalUsers.changeType,
            label: '较上周'
          }}
          icon={<UsersIconNew />}
          color="default"
          onClick={() => onNavigate('users')}
        />
        <EnhancedStatCard
          title="活跃用户"
          value={dashboardData.stats.activeUsers.value}
          trend={{
            value: dashboardData.stats.activeUsers.change,
            type: dashboardData.stats.activeUsers.changeType,
            label: '较上周'
          }}
          icon={<UsersIconNew />}
          color="success"
          onClick={() => onNavigate('users')}
        />
        <EnhancedStatCard
          title="公开仓库"
          value={dashboardData.stats.totalPublicRepos.value}
          trend={{
            value: dashboardData.stats.totalPublicRepos.change,
            type: dashboardData.stats.totalPublicRepos.changeType,
            label: '较上周'
          }}
          icon={<RepoIconNew />}
          color="default"
          onClick={() => onNavigate('repos')}
        />
        <EnhancedStatCard
          title="讨论总数"
          value={dashboardData.stats.totalDiscussions.value}
          trend={{
            value: dashboardData.stats.totalDiscussions.change,
            type: dashboardData.stats.totalDiscussions.changeType,
            label: '较上周'
          }}
          icon={<DiscussionIcon />}
          color="info"
          onClick={() => onNavigate('discussions')}
        />
        <EnhancedStatCard
          title="待处理举报"
          value={dashboardData.stats.pendingReports.value}
          trend={{
            value: dashboardData.stats.pendingReports.change,
            type: dashboardData.stats.pendingReports.changeType === 'up' ? 'down' : 'up',
            label: '较上周'
          }}
          icon={<WarningIcon />}
          color={dashboardData.stats.pendingReports.value > 10 ? 'warning' : 'default'}
          onClick={() => onNavigate('reports')}
        />
        <EnhancedStatCard
          title="待处理申诉"
          value={dashboardData.stats.pendingAppeals.value}
          icon={<CalendarIcon />}
          color={dashboardData.stats.pendingAppeals.value > 5 ? 'warning' : 'default'}
          onClick={() => onNavigate('appeals')}
        />
        <EnhancedStatCard
          title="安全事件"
          value={dashboardData.stats.criticalSecurityEvents.value}
          icon={<ShieldAlertIcon />}
          color={dashboardData.stats.criticalSecurityEvents.value > 0 ? 'danger' : 'success'}
          onClick={() => onNavigate('security')}
        />
      </div>

      {/* 图表区域 */}
      <div className="charts-section">
        <div className="chart-card chart-large">
          <div className="chart-header">
            <h3 className="chart-title">用户增长趋势</h3>
            <span className="chart-subtitle">每日新增用户数</span>
          </div>
          <div className="chart-body">
            <LineChart
              data={userGrowthData}
              width={700}
              height={250}
              color="var(--color-accent-fg)"
              formatValue={(v) => v.toLocaleString()}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">仓库语言分布</h3>
            <span className="chart-subtitle">按编程语言统计</span>
          </div>
          <div className="chart-body">
            <BarChart
              data={repoStatsData}
              width={380}
              height={250}
              formatValue={(v) => v.toLocaleString()}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">举报类型分布</h3>
            <span className="chart-subtitle">按举报类型统计</span>
          </div>
          <div className="chart-body">
            <PieChart
              data={reportTypeData}
              size={200}
              formatValue={(v) => v.toLocaleString()}
            />
          </div>
        </div>
      </div>

      {/* 快速操作和最近活动 */}
      <div className="bottom-section">
        <div className="quick-actions-card">
          <h3 className="card-title">快速操作</h3>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={() => onNavigate('users')}>
              <UsersIconNew />
              <span>用户管理</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('repos')}>
              <RepoIconNew />
              <span>仓库管理</span>
            </button>
            <button className="quick-action-btn warning" onClick={() => onNavigate('reports')}>
              <WarningIcon />
              <span>处理举报</span>
              {(dashboardData.stats.pendingReports.value) > 0 && (
                <span className="badge badge-danger">{dashboardData.stats.pendingReports.value}</span>
              )}
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('announcements')}>
              <AlertIcon />
              <span>发布公告</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('security')}>
              <ShieldAlertIcon />
              <span>安全事件</span>
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate('audit')}>
              <SearchIcon />
              <span>审计日志</span>
            </button>
          </div>
        </div>

        <div className="activity-card">
          <div className="card-header">
            <h3 className="card-title">最近活动</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('activity-logs')}>
              查看全部
            </button>
          </div>
          <div className="activity-list">
            {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.slice(0, 8).map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.action.includes('删除') ? '🗑️' :
                     activity.action.includes('封禁') ? '🔒' :
                     activity.action.includes('创建') ? '✨' :
                     activity.action.includes('更新') ? '📝' : '⚙️'}
                  </div>
                  <div className="activity-content">
                    <p className="activity-text">
                      <span className="activity-user">@{activity.user?.username || '系统'}</span>
                      {' '}{activity.action}
                      {activity.targetType && (
                        <>
                          {' '}<span className="activity-target">{activity.targetType}</span>
                        </>
                      )}
                    </p>
                    <span className="activity-time">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-empty">
                <p>暂无活动记录</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 待处理举报列表 */}
      {dashboardData.recentReports && dashboardData.recentReports.length > 0 && (
        <div className="reports-section">
          <div className="section-header">
            <h3 className="section-title">最新举报</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('reports')}>
              查看全部 ({dashboardData.stats.pendingReports.value})
            </button>
          </div>
          <div className="reports-list">
            {dashboardData.recentReports.slice(0, 5).map((report) => (
              <div key={report.id} className="report-item">
                <div className="report-badge">
                  <span className={`status-badge ${report.status === 'pending' ? 'warning' : 'default'}`}>
                    {report.targetType}
                  </span>
                </div>
                <div className="report-content">
                  <p className="report-reason">{report.reason}</p>
                  <span className="report-meta">
                    举报人: @{report.reporterUsername || '未知'} · {formatTimeAgo(report.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 辅助函数：格式化时间
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 30) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}

// 刷新图标
function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px' }}>
      <path d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.417A6 6 0 118 2v1z"/>
      <path d="M8 4.466V.534a.25.25 0 01.41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 018 4.466z"/>
    </svg>
  );
}

// ============ 组件样式 ============
const Styles = () => (
  <style jsx>{`
    .dashboard-enhanced {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .dashboard-title-section {
      flex: 1;
    }
    .dashboard-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0 0 4px;
    }
    .dashboard-subtitle {
      font-size: 14px;
      color: var(--color-fg-muted);
      margin: 0;
    }
    .dashboard-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .alerts-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 24px;
    }
    .alert-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid;
    }
    .alert-urgent {
      background: rgba(207, 34, 46, 0.08);
      border-color: rgba(207, 34, 46, 0.3);
    }
    .alert-warning {
      background: rgba(181, 127, 9, 0.08);
      border-color: rgba(181, 127, 9, 0.3);
    }
    .alert-info {
      background: rgba(9, 105, 218, 0.08);
      border-color: rgba(9, 105, 218, 0.3);
    }
    .alert-icon {
      flex-shrink: 0;
      padding-top: 2px;
    }
    .alert-content { flex: 1; min-width: 0; }
    .alert-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0 0 4px;
    }
    .alert-message {
      font-size: 13px;
      color: var(--color-fg-muted);
      margin: 0;
      line-height: 1.4;
    }
    .charts-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .chart-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 16px;
    }
    .chart-large { grid-column: 1; }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
      gap: 8px;
    }
    .chart-subtitle {
      font-size: 12px;
      color: var(--color-fg-muted);
    }
    .chart-body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 160px;
    }
    .bottom-section {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .quick-actions-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 16px;
    }
    .quick-actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 12px;
    }
    .quick-action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-fg-default);
      transition: background 0.15s, border-color 0.15s;
    }
    .quick-action-btn:hover {
      background: var(--color-neutral-subtle);
      border-color: var(--color-border-default);
    }
    .quick-action-btn.warning {
      border-color: rgba(181, 127, 9, 0.4);
      background: rgba(181, 127, 9, 0.06);
    }
    .activity-card {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 16px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 320px;
      overflow-y: auto;
    }
    .activity-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .activity-icon { font-size: 14px; flex-shrink: 0; }
    .activity-content { flex: 1; min-width: 0; }
    .activity-text {
      font-size: 13px;
      color: var(--color-fg-default);
      margin: 0 0 2px;
      line-height: 1.4;
    }
    .activity-user { font-weight: 500; }
    .activity-target { color: var(--color-accent-fg); }
    .activity-time { font-size: 11px; color: var(--color-fg-muted); }
    .activity-empty {
      text-align: center;
      padding: 24px 16px;
      color: var(--color-fg-muted);
      font-size: 13px;
    }
    .reports-section {
      background: var(--color-canvas-default);
      border: 1px solid var(--color-border-default);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-fg-default);
      margin: 0;
    }
    .reports-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .report-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .report-item:hover { background: var(--color-canvas-subtle); }
    .report-badge { flex-shrink: 0; }
    .report-content { flex: 1; min-width: 0; }
    .report-reason {
      font-size: 13px;
      color: var(--color-fg-default);
      margin: 0 0 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .report-meta { font-size: 11px; color: var(--color-fg-muted); }
    .time-range-select {
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--color-border-default);
      background: var(--color-canvas-default);
      color: var(--color-fg-default);
      font-size: 13px;
      cursor: pointer;
    }
  `}</style>
);

export { Styles as DashboardStyles };
