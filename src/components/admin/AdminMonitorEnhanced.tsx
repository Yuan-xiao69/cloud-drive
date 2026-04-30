'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RingProgress } from './charts/AdminCharts';
import { BarChart } from './charts/AdminCharts';
import type { MonitorData, SystemStats, PerformanceMetrics, DatabaseStats } from './AdminTypes';

interface AdminMonitorEnhancedProps {
  onRefresh?: () => void;
}

interface MonitorApiResponse {
  code: number;
  data?: {
    // Monitor API - 系统统计
    totalUsers?: number;
    activeUsers?: number;
    totalRepos?: number;
    publicRepos?: number;
    privateRepos?: number;
    totalDiscussions?: number;
    totalIssues?: number;
    totalPRs?: number;
    storageUsed?: number;
    storageLimit?: number;
    // Monitor API - 系统性能
    cpuUsage?: number;
    cpuCores?: number;
    cpuLoadAvg?: number[];
    memoryUsage?: number;
    memoryTotal?: number;
    memoryUsed?: number;
    memoryFree?: number;
    uptime?: number;
    osPlatform?: string;
    nodeVersion?: string;
    // Monitor API - 进程指标
    heapUsed?: number;
    heapTotal?: number;
    rss?: number;
    // Monitor API - 操作统计
    requestCount?: number;
    errorCount?: number;
    auditTotal?: number;
    auditToday?: number;
    avgResponseTime?: number;
    databaseConnectionCount?: number;
    // Database stats API
    tableSizes?: { table: string; rows: number; size: string }[];
    totalSize?: string;
    connectionCount?: number;
    activeConnectionCount?: number;
  };
}

// 图标组件
const CpuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 1v1H4.5a.5.5 0 000 1H6v.5H4.5a.5.5 0 000 1H6V5H4.5a.5.5 0 000 1H6v.5H4.5a.5.5 0 000 1H6v.5H4.5a.5.5 0 000 1H6V11H4.5a.5.5 0 000 1H6v1h1V6h1v6h1V6h1v6h1V6h1v6h1V3a1 1 0 00-1-1H6zm4 3V7h3v7H10zm1.5-3V4h1v7h-1z"/>
  </svg>
);

const MemoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5 3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5v9A1.5 1.5 0 019.5 14h-3A1.5 1.5 0 015 12.5v-9zM6.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h3a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-3z"/>
  </svg>
);

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.904.174a13.134 13.134 0 00-.463 2.478c.122.392.29.765.463 1.132.173.367.356.735.463 1.132.12.397.24.782.463 1.132.173.367.356.735.463 1.132.122.392.29.765.463 1.132.173.367.356.735.463 1.132.122.392.29.765.463 1.132A13.12 13.12 0 0112.096 16 2.5 2.5 0 019.5 13.5H7.5V8.5H9.5A2.5 2.5 0 0112 6h.5a2.5 2.5 0 012.5 2.5v2.5H14.5A2.5 2.5 0 0112 15.5v.5a2.5 2.5 0 01-2.5 2.5h-4A2.5 2.5 0 013 15.5v-1A2.5 2.5 0 015.5 12H6v1H4.5A2.5 2.5 0 012 10.5v-4A2.5 2.5 0 014.5 4H6V3h.5A2.5 2.5 0 019 5.5V7h.5a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5H7.5V14h.5a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-4A2.5 2.5 0 011 15.5v-4A2.5 2.5 0 013.5 9H3V8h.5A2.5 2.5 0 016 5.5V3a2.5 2.5 0 012.5-2.5H10v-.174a13.133 13.133 0 01-.463-1.132c-.173-.367-.356-.735-.463-1.132A13.12 13.12 0 018.096 0a2.5 2.5 0 00-4.192 0l-.001.174z"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3.5a.5.5 0 000 1V8a.5.5 0 00.252.434l3 1.5a.5.5 0 00.496-.868L8 7.71V3.5z"/>
    <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.534 7h3.932a.25.25 0 01.192.41l-1.966 2.36a.25.25 0 01-.384 0l-1.966-2.36a.25.25 0 01.192-.41zm-11 2h3.932a.25.25 0 00.192-.41L2.692 6.23a.25.25 0 00-.384 0L.342 8.59A.25.25 0 00.534 9z"/>
    <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 11-.771-.636A6.002 6.002 0 0113.917 7H12.9A5.002 5.002 0 008 3zM3.1 9a5.002 5.002 0 008.757 2.182.5.5 0 11.771.636A6.002 6.002 0 012.083 9H3.1z"/>
  </svg>
);

// 格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${mins}分钟`;
  return `${mins}分钟`;
}

// 获取表中文名
function getTableName(table: string): string {
  const names: Record<string, string> = {
    user: '用户',
    repository: '仓库',
    repo_item: '文件项',
    discussion: '讨论',
    issue: 'Issue',
    pull_request: 'Pull Request',
    notification: '通知',
    system_config: '系统配置',
  };
  return names[table] || table;
}

// 获取内存颜色
function getMemoryColor(percentage: number): string {
  if (percentage < 50) return 'var(--color-success-fg)';
  if (percentage < 80) return 'var(--color-attention-fg)';
  return 'var(--color-danger-fg)';
}

export default function AdminMonitorEnhanced({ onRefresh }: AdminMonitorEnhancedProps) {
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // 秒

  // 获取监控数据
  const fetchMonitorData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 并行请求监控和数据库统计
      const [monitorRes, dbRes] = await Promise.all([
        fetch('/api/v1/admin/monitor'),
        fetch('/api/v1/admin/database/stats'),
      ]);

      const monitorJson: MonitorApiResponse = await monitorRes.json();
      const dbJson = await dbRes.json();

      if ((monitorJson.code === 200 || monitorJson.code === 0) && monitorJson.data) {
        const data = monitorJson.data;
        
        const system: SystemStats = {
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeUsers || 0,
          totalRepos: data.totalRepos || 0,
          publicRepos: data.publicRepos || 0,
          privateRepos: data.privateRepos || 0,
          totalDiscussions: data.totalDiscussions || 0,
          totalIssues: data.totalIssues || 0,
          totalPRs: data.totalPRs || 0,
          storageUsed: data.storageUsed || 0,
          storageLimit: data.storageLimit || 100 * 1024 * 1024 * 1024,
        };

        const metrics: PerformanceMetrics = {
          cpuUsage: data.cpuUsage ?? 0,
          cpuCores: data.cpuCores ?? 0,
          cpuLoadAvg: data.cpuLoadAvg ?? [0, 0, 0],
          memoryUsage: data.memoryUsage ?? 0,
          memoryTotal: data.memoryTotal ?? 0,
          memoryUsed: data.memoryUsed ?? 0,
          memoryFree: data.memoryFree ?? 0,
          uptime: data.uptime ?? 0,
          osPlatform: data.osPlatform ?? '',
          nodeVersion: data.nodeVersion ?? '',
          heapUsed: data.heapUsed ?? 0,
          heapTotal: data.heapTotal ?? 0,
          rss: data.rss ?? 0,
          requestCount: data.requestCount ?? 0,
          errorCount: data.errorCount ?? 0,
          auditTotal: data.auditTotal ?? 0,
          auditToday: data.auditToday ?? 0,
          avgResponseTime: data.avgResponseTime ?? 0,
          databaseConnectionCount: data.databaseConnectionCount ?? 0,
        };

        const database: DatabaseStats = {
          tableSizes: dbJson.data?.tableSizes || [],
          totalSize: dbJson.data?.totalSize || '0 KB',
          connectionCount: dbJson.data?.connectionCount || 0,
          activeConnectionCount: dbJson.data?.activeConnectionCount || 0,
        };

        setMonitorData({
          system,
          metrics,
          database,
          lastUpdated: new Date().toISOString(),
        });
        setLastUpdated(new Date().toLocaleTimeString('zh-CN'));
      }
    } catch (error) {
      console.error('Failed to fetch monitor data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchMonitorData();
    onRefresh?.();
  }, [fetchMonitorData, onRefresh]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMonitorData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMonitorData]);

  if (isLoading && !monitorData) {
    return (
      <div className="monitor-loading">
        <div className="loading-spinner" />
        <p>加载系统监控数据...</p>
      </div>
    );
  }

  if (!monitorData) {
    return (
      <div className="monitor-error">
        <p>加载监控数据失败</p>
        <button className="btn btn-primary" onClick={fetchMonitorData}>
          重新加载
        </button>
      </div>
    );
  }

  const { system, metrics, database } = monitorData;
  const storagePercentage = (system.storageUsed / system.storageLimit) * 100;
  const memoryPercentage = metrics.memoryTotal > 0 
    ? (metrics.memoryUsed / metrics.memoryTotal) * 100 
    : 0;
  const heapPercentage = metrics.heapTotal > 0
    ? (metrics.heapUsed / metrics.heapTotal) * 100
    : 0;

  // 数据库表数据（准备柱状图）
  const dbChartData = database.tableSizes.slice(0, 6).map(t => ({
    label: getTableName(t.table),
    value: t.rows,
    color: t.rows > 10000 ? 'var(--color-danger-fg)' : 
           t.rows > 1000 ? 'var(--color-attention-fg)' : 
           'var(--color-accent-fg)',
  }));

  return (
    <div className="space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-fg-default)' }}>系统监控</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-fg-muted)' }}>
            实时监控平台运行状态
            {lastUpdated && <span style={{ color: 'var(--color-fg-subtle)' }}> · 更新于 {lastUpdated}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--color-fg-muted)' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="cursor-pointer"
            />
            自动刷新
          </label>
          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-xs px-2 py-1 rounded border"
              style={{
                borderColor: 'var(--color-border-default)',
                background: 'var(--color-canvas-default)',
                color: 'var(--color-fg-default)',
              }}
            >
              <option value={10}>10秒</option>
              <option value={30}>30秒</option>
              <option value={60}>1分钟</option>
              <option value={300}>5分钟</option>
            </select>
          )}
          <button
            onClick={fetchMonitorData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              background: 'var(--color-canvas-subtle)',
              color: 'var(--color-fg-default)',
            }}
          >
            <RefreshIcon /> {isLoading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 系统概览 */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-fg-default)' }}>系统概览</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 用户 */}
          <div className="rounded-lg border p-4 flex items-start gap-3" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-fg)' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 013.034 4.084.75.75 0 11-1.482.235 4.001 4.001 0 00-7.9 0 .75.75 0 01-1.482-.236A5.507 5.507 0 013.102 8.05 3.49 3.49 0 012 5.5zM11 4a.75.75 0 100 1.5 1.5 1.5 0 01.666 2.844.75.75 0 00-.416.672v.352a.75.75 0 00.574.73c1.2.289 2.162 1.2 2.522 2.372a.75.75 0 101.434-.44 5.01 5.01 0 00-2.56-3.012A3 3 0 0011 4z"/></svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>总用户</div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{system.totalUsers.toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>活跃 {system.activeUsers.toLocaleString()}</div>
            </div>
          </div>

          {/* 仓库 */}
          <div className="rounded-lg border p-4 flex items-start gap-3" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success-fg)' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>仓库总数</div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{system.totalRepos.toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>公开 {system.publicRepos} · 私有 {system.privateRepos}</div>
            </div>
          </div>

          {/* 讨论/Issue/PR */}
          <div className="rounded-lg border p-4 flex items-start gap-3" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-attention-subtle)', color: 'var(--color-attention-fg)' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-5.5a.75.75 0 01-.75-.75v-.878z"/></svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>讨论 / Issue / PR</div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{system.totalDiscussions}</div>
              <div className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>Issue {system.totalIssues} · PR {system.totalPRs}</div>
            </div>
          </div>

          {/* 存储 */}
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent-fg)' }}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>存储使用</div>
                <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{formatBytes(system.storageUsed)}</div>
                <div className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>限额 {formatBytes(system.storageLimit)}</div>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-neutral-muted)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(storagePercentage, 100)}%`,
                  background: storagePercentage > 90 ? 'var(--color-danger-fg)' : storagePercentage > 70 ? 'var(--color-attention-fg)' : 'var(--color-accent-fg)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 性能指标 */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-fg-default)' }}>性能指标</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {/* CPU 使用率（基于 loadavg / cores） */}
          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <RingProgress
              value={metrics.cpuUsage}
              max={100}
              size={72}
              strokeWidth={6}
              color={metrics.cpuUsage > 80 ? 'var(--color-danger-fg)' : metrics.cpuUsage > 50 ? 'var(--color-attention-fg)' : 'var(--color-success-fg)'}
              label={String(Math.round(metrics.cpuUsage))}
              sublabel="%"
            />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>CPU 负载</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
                {metrics.cpuCores} 核心
              </div>
              <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--color-fg-subtle)' }}>
                {metrics.cpuLoadAvg[0]} / {metrics.cpuLoadAvg[1]} / {metrics.cpuLoadAvg[2]}
              </div>
            </div>
          </div>

          {/* 内存使用率（os.totalmem / freemem） */}
          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <RingProgress
              value={memoryPercentage}
              max={100}
              size={72}
              strokeWidth={6}
              color={getMemoryColor(memoryPercentage)}
              label={String(Math.round(memoryPercentage))}
              sublabel="%"
            />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>系统内存</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
                {formatBytes(metrics.memoryUsed)} / {formatBytes(metrics.memoryTotal)}
              </div>
            </div>
          </div>

          {/* Node.js 进程内存 */}
          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <RingProgress
              value={heapPercentage}
              max={100}
              size={72}
              strokeWidth={6}
              color={heapPercentage > 80 ? 'var(--color-danger-fg)' : heapPercentage > 60 ? 'var(--color-attention-fg)' : 'var(--color-accent-fg)'}
              label={String(Math.round(heapPercentage))}
              sublabel="%"
            />
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>进程堆内存</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
                {formatBytes(metrics.heapUsed)} / {formatBytes(metrics.heapTotal)}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-fg-subtle)' }}>
                RSS: {formatBytes(metrics.rss)}
              </div>
            </div>
          </div>

          {/* 运行时长 */}
          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-accent-subtle)' }}>
              <ClockIcon />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>进程运行时长</div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{formatUptime(metrics.uptime)}</div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-fg-subtle)' }}>
                {metrics.nodeVersion}
              </div>
            </div>
          </div>

          {/* 今日操作数 */}
          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-success-subtle)' }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill="var(--color-success-fg)"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"/></svg>
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>今日操作</div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{metrics.requestCount.toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
                管理操作 {metrics.auditToday} / 总计 {metrics.auditTotal}
              </div>
            </div>
          </div>

          {/* 今日错误 */}
          <div className="rounded-lg border p-4 flex items-center gap-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: metrics.errorCount > 0 ? 'var(--color-danger-subtle)' : 'var(--color-success-subtle)' }}>
              <svg width="24" height="24" viewBox="0 0 16 16" fill={metrics.errorCount > 0 ? 'var(--color-danger-fg)' : 'var(--color-success-fg)'}><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"/></svg>
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>今日错误</div>
              <div className="text-xl font-semibold tabular-nums" style={{ color: metrics.errorCount > 0 ? 'var(--color-danger-fg)' : 'var(--color-success-fg)' }}>{metrics.errorCount.toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'var(--color-fg-subtle)' }}>
                DB 连接: {metrics.databaseConnectionCount} 活跃
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 数据库统计 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-fg-default)' }}>数据库统计</h2>
          <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
            总计: {database.totalSize} · 连接: {database.connectionCount}（活跃 {database.activeConnectionCount}）
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* 图表 */}
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-fg-muted)' }}>各表行数分布 (Top 6)</h3>
            <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
              {dbChartData.length > 0 ? (
                <BarChart
                  data={dbChartData}
                  width={500}
                  height={220}
                  formatValue={(v) => v.toLocaleString()}
                />
              ) : (
                <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>暂无数据</div>
              )}
            </div>
          </div>

          {/* 表详情 */}
          <div className="rounded-lg border p-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: 'var(--color-fg-muted)' }}>表详情</h3>
            <div className="overflow-x-auto" style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                    <th className="text-left py-2 pr-3 text-xs font-semibold" style={{ color: 'var(--color-fg-muted)' }}>表名</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold" style={{ color: 'var(--color-fg-muted)' }}>行数</th>
                    <th className="text-right py-2 pl-3 text-xs font-semibold" style={{ color: 'var(--color-fg-muted)' }}>大小</th>
                  </tr>
                </thead>
                <tbody>
                  {database.tableSizes.map((table) => (
                    <tr key={table.table} style={{ borderBottom: '1px solid var(--color-border-muted)' }}>
                      <td className="py-2 pr-3">
                        <span className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>{getTableName(table.table)}</span>
                        <span className="block text-xs font-mono" style={{ color: 'var(--color-fg-subtle)' }}>{table.table}</span>
                      </td>
                      <td className="text-right py-2 px-3 tabular-nums" style={{ color: 'var(--color-fg-default)' }}>{table.rows.toLocaleString()}</td>
                      <td className="text-right py-2 pl-3 tabular-nums" style={{ color: 'var(--color-fg-muted)' }}>{table.size}</td>
                    </tr>
                  ))}
                  {database.tableSizes.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-sm" style={{ color: 'var(--color-fg-muted)' }}>暂无数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 系统环境信息 */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-fg-default)' }}>系统环境</h2>
        <div className="rounded-lg border p-4" style={{ background: 'var(--color-canvas-default)', borderColor: 'var(--color-border-default)' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>操作系统</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>{metrics.osPlatform || '-'}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>Node.js</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>{metrics.nodeVersion || '-'}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>CPU 核心</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>{metrics.cpuCores || '-'} 核</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>系统内存</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>{formatBytes(metrics.memoryTotal)}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>内存已用</div>
              <div className="font-mono text-xs" style={{ color: metrics.memoryUsage > 80 ? 'var(--color-danger-fg)' : 'var(--color-fg-default)' }}>
                {formatBytes(metrics.memoryUsed)} ({metrics.memoryUsage.toFixed(1)}%)
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>内存可用</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>{formatBytes(metrics.memoryFree)}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>进程 RSS</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>{formatBytes(metrics.rss)}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--color-fg-muted)' }}>CPU 负载均值</div>
              <div className="font-mono text-xs" style={{ color: 'var(--color-fg-default)' }}>
                1m: {metrics.cpuLoadAvg[0]} · 5m: {metrics.cpuLoadAvg[1]} · 15m: {metrics.cpuLoadAvg[2]}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
