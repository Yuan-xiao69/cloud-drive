// Admin page types - shared across admin components
import type React from 'react';

export type AdminTab = 'dashboard' | 'users' | 'repos' | 'discussions' | 'reports' | 'audit' | 'email' | 'database' | 'notifications' | 'penalties' | 'appeals' | 'announcements' | 'security' | 'ipblacklist' | 'bans' | 'activity-logs' | 'backup' | 'monitor' | 'settings';

export interface UserSummary {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  avatarUrl?: string | null;
  isBanned?: boolean;
}

export interface RepositorySummary {
  id: string;
  name: string;
  ownerUsername: string;
  visibility: 'public' | 'private';
  starCount: number;
  forkCount: number;
  language?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface DiscussionSummary {
  id: string;
  title: string;
  authorUsername: string;
  authorId: string;
  category: string;
  status: string;
  viewCount: number;
  commentsCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// 讨论详情
export interface DiscussionDetail {
  id: string;
  title: string;
  content: string;
  authorUsername: string;
  authorId: string;
  authorAvatar?: string;
  category: string;
  status: string;
  isResolved: boolean;
  isPinned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  viewCount: number;
  commentsCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  relatedReports?: {
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
}

/** 管理端通知推送配置 */
export interface AdminNotificationConfig {
  id: string;
  title: string;
  content: string;
  type: 'all' | 'user' | 'role';
  targetRoles?: string[];
  targetUserIds?: string[];
  sentCount: number;
  status: 'draft' | 'sent' | 'sending';
  sentAt: string | null;
  createdAt: string;
}

export interface ReportSummary {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  reporterUsername?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actionType: string;
  actionLabel: string;
  targetType?: string;
  targetId?: string;
  adminUsername: string;
  detailsText: string;
  ipAddress?: string;
  createdAt: string;
}

export interface EmailConfig {
  configured: boolean;
  type: string | null;
  user: string | null;
}

export interface NotifyUser {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Penalty {
  id: string;
  userId: string;
  userUsername: string;
  userEmail: string;
  type: string;
  reason: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  operatorUsername: string;
  appeals?: Array<{ id: string; status: string; username: string }>;
  hasPendingAppeal?: boolean;
}

export interface Appeal {
  id: string;
  penaltyId: string;
  userId: string;
  userUsername: string;
  userEmail: string;
  content: string;
  status: string;
  adminReply: string | null;
  appealType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  ipAddress: string;
  userAgent: string | null;
  status: string;
  details: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface IpBlacklistEntry {
  id: string;
  ipAddress: string;
  reason: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

// Tab content props interfaces
export interface DashboardData {
  totalUsers: number;
  newUsersToday: number;
  totalPublicRepos: number;
  pendingReports: number;
  userTrend: { date: string; count: number }[];
  contentTrend: { date: string; repos: number; discussions: number }[];
  recentReports: ReportSummary[];
}

export interface EmailFormData {
  user: string;
  pass: string;
  host: string;
  port: string;
  secure: boolean;
  from: string;
}

export interface PenaltyFormData {
  userId: string;
  username: string;
  type: string;
  reason: string;
  duration: string;
}

export interface AnnouncementFormData {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  isActive: boolean;
  isPinned: boolean;
}

export interface IpFormData {
  ipAddress: string;
  reason: string;
  duration: string;
}

export interface ContextMenuData {
  x: number;
  y: number;
  type: 'user' | 'repo' | 'report' | 'appeal' | 'penalty' | 'security' | 'discussion';
  id: string;
}

// ---- 封禁管理 ----
export interface BanRecord {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    uid?: string | null;
  };
  banner: {
    id: string;
    username: string;
    email: string;
  };
  reason: string;
  banType: 'permanent' | 'temporary' | 'unknown';
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  isOrphaned?: boolean;
  unbanReason: string | null;
  unbannedAt: string | null;
  unbannedBy: string | null;
  createdAt: string;
}

export interface BanFormData {
  userId: string;
  reason: string;
  banType: 'permanent' | 'temporary';
  expiresAt: string;
}

// ---- 活动日志 ----
export interface ActivityLogItem {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
  };
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  fileSize?: number | null;
  ipAddress: string;
  userAgent: string | null;
  status: string;
  createdAt: string;
  targetName?: string;
  errorMsg?: string;
}

export interface ActivityLogStats {
  total: number;
  todayCount: number;
  successCount: number;
  failedCount: number;
}

// ---- 备份管理 ----
export interface BackupFile {
  filename: string;
  path: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  createdAtFormatted?: string;
}

export interface BackupStats {
  totalCount: number;
  totalSize: number;
  totalSizeFormatted: string;
  newestBackup: string | null;
}

export interface BackupFormData {
  compress: boolean;
  retainDays: number;
}

// ============ 增强 Dashboard 类型 ============

// 紧急通知
export interface UrgentAlert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

// 统计数据趋势
export interface StatTrend {
  value: number;
  change: number;
  changeType: 'up' | 'down' | 'neutral';
  avg7Days?: number;
  prediction?: number;
}

// 增强的仪表盘数据
export interface EnhancedDashboardData {
  // 核心统计
  stats: {
    totalUsers: StatTrend;
    activeUsers: StatTrend;
    totalPublicRepos: StatTrend;
    totalPrivateRepos: StatTrend;
    totalDiscussions: StatTrend;
    pendingReports: StatTrend;
    pendingAppeals: StatTrend;
    criticalSecurityEvents: StatTrend;
  };
  
  // 趋势数据
  trends: {
    userGrowth: { date: string; count: number }[];
    repoGrowth: { date: string; count: number }[];
    discussionGrowth: { date: string; count: number }[];
    reportTypes: { type: string; count: number }[];
    repoLanguages: { language: string; count: number }[];
  };
  
  // 最新举报
  recentReports: ReportSummary[];
  
  // 紧急通知
  alerts: UrgentAlert[];
  
  // 活动时间线
  recentActivity: ActivityLogItem[];
}

// ============ 右键菜单类型 ============

// 右键菜单操作项（支持两种命名风格）
export interface ContextMenuItemConfig {
  id?: string;
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  children?: ContextMenuItemConfig[];
  submenu?: ContextMenuItemConfig[];
  onClick?: () => void;
  action?: () => void;
}

// 右键菜单分组
export interface ContextMenuSection {
  id: string;
  items: ContextMenuItemConfig[];
}

// 右键菜单配置（同时支持 sections 和直接 items）
export interface ContextMenuConfig {
  x: number;
  y: number;
  title?: string;
  subtitle?: string;
  sections?: ContextMenuSection[];
  items?: ContextMenuItemConfig[];
  onClose?: () => void;
  maxHeight?: number;
}

// ============ 详情面板类型 ============

// 用户详情
export interface PenaltySummary {
  id: string;
  type: string;
  reason: string;
  status: 'active' | 'inactive';
  expiresAt: string | null;
  createdAt: string;
  applierUsername: string;
}

export interface UserTag {
  id: string;
  name: string;
  color: string;
}

export interface RecentLogin {
  id: string;
  time: string;
  ip: string;
  details: Record<string, unknown>;
}

export interface UserDetail {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastActiveAt: string | null;
  avatarUrl?: string | null;
  bio?: string;
  location?: string;
  website?: string;
  emailVerified?: boolean;
  isSystem?: boolean;
  isBanned?: boolean;
  stats: {
    repos: number;
    discussions: number;
    comments?: number;
    stars: number;
    forks: number;
    totalStorage?: number;
  };
  activityRate: number;
  activeDaysLast30: number;
  penalties: PenaltySummary[];
  recentLogins?: RecentLogin[];
  tags?: UserTag[];
  ipAddress?: string;
}

// 仓库详情
export interface Branch {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ForkRequest {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requester: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  reviewerUsername?: string;
}

export interface ShareLink {
  id: string;
  token: string;
  permission: string;
  hasPassword: boolean;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  path: string | null;
}

export interface OwnerPenalty {
  id: string;
  type: string;
  reason: string;
  expiresAt: string | null;
}

export interface Commit {
  sha: string;
  message: string;
  authorId: string;
  date: string;
  filePath?: string;
  version: number;
}

export interface RepoDetail {
  id: string;
  name: string;
  owner: {
    id: string;
    username: string;
    avatarUrl: string | null;
    email: string;
  };
  description?: string;
  visibility: 'public' | 'private';
  language?: string;
  starCount: number;
  forkCount: number;
  watcherCount: number;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  defaultBranch: string;
  hasIssues: boolean;
  hasWiki: boolean;
  hasProjects: boolean;
  openIssues: number;
  openPullRequests: number;
  discussionCount: number;
  fileCount: number;
  folderCount: number;
  isLocked: boolean;
  isArchived: boolean;
  status: 'normal' | 'locked' | 'archived' | 'restricted';
  branches: Branch[];
  recentCommits: Commit[];
  forkRequests: ForkRequest[];
  shareLinks: ShareLink[];
  ownerPenalties: OwnerPenalty[];
}

// ============ 筛选器类型 ============

// 用户筛选
export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  dateRange?: { start: string; end: string };
  dateFrom?: string;
  dateTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  repoCountMin?: number;
  repoCountMax?: number;
}

// 仓库筛选
export interface RepoFilters {
  search?: string;
  visibility?: 'all' | 'public' | 'private';
  language?: string;
  status?: 'all' | 'active' | 'archived' | 'deleted';
  sizeMin?: number;
  sizeMax?: number;
  starsMin?: number;
  starsMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ============ 处罚模板类型 ============
export interface PenaltyTemplate {
  id: string;
  name: string;
  type: string;
  defaultDuration: string;
  reason: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============ IP 地理位置信息 ============
export interface IpGeoInfo {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  org?: string;
  asn?: string;
  isProxy?: boolean;
  isVpn?: boolean;
  isTor?: boolean;
  isHosting?: boolean;
}

// ============ 安全统计 ============
export interface SecurityStats {
  totalEvents: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  eventsByType: { type: string; count: number }[];
  eventsByDay: { date: string; count: number }[];
  topAttackedCountries: { country: string; count: number }[];
  securityScore: number;
}

// ============ 审计日志筛选 ============
export interface AuditLogFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  action?: string;
  targetType?: string;
  ipAddress?: string;
  status?: string;
}

// ============ 批量操作类型 ============
export type BatchOperationType = 
  | 'delete'
  | 'ban'
  | 'unban'
  | 'mute'
  | 'unmute'
  | 'archive'
  | 'unarchive'
  | 'changeVisibility'
  | 'export';

export interface BatchOperationResult {
  success: number;
  failed: number;
  errors?: { id: string; error: string }[];
}

// ============ 举报详情和统计类型 ============

// 举报详情
export interface ReportDetail {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  status: string;
  priority?: string;
  reporter: {
    id: string;
    username: string;
    email?: string;
    avatarUrl?: string;
    createdAt: string;
  };
  reporterStats?: {
    totalReports: number;
    validReports: number;
    invalidReports: number;
    validRate: number;
  };
  handler?: {
    id: string;
    username: string;
  };
  handlerNote?: string;
  createdAt: string;
  handledAt?: string | null;
  targetInfo: {
    // 用户类型
    username?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    isBanned?: boolean;
    // 讨论类型
    title?: string;
    content?: string;
    authorId?: string;
    authorUsername?: string;
    authorAvatar?: string;
    isDeleted?: boolean;
    discussionId?: string;
    // Issue/PR/仓库通用
    repositoryId?: string;
    repositoryName?: string;
    sourceRepoName?: string;
    targetRepoName?: string;
    sourceRepoId?: string;
    targetRepoId?: string;
    isClosed?: boolean;
    isMerged?: boolean;
    // 仓库类型
    name?: string;
    description?: string;
    ownerId?: string;
    ownerUsername?: string;
    ownerAvatar?: string;
    visibility?: 'public' | 'private';
    isArchived?: boolean;
    stars?: number;
    forks?: number;
    link?: string;
  };
  relatedReports?: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

// 举报统计
export interface ReportStats {
  summary: {
    total: number;
    pending: number;
    processed: number;
    dismissed: number;
    today: number;
    thisWeek: number;
    avgHandlingTimeHours: number;
  };
  byType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byReason: Array<{
    reason: string;
    count: number;
  }>;
  recentTrend: Array<{
    date: string;
    count: number;
  }>;
  topReporters: Array<{
    reporterId: string;
    username?: string;
    avatarUrl?: string;
    reportCount: number;
  }>;
  mostReported: Array<{
    targetType: string;
    targetId: string;
    reportCount: number;
    name?: string;
    link?: string;
  }>;
}

// ============ 系统监控类型 ============

// 系统概览统计
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalRepos: number;
  publicRepos: number;
  privateRepos: number;
  totalDiscussions: number;
  totalIssues: number;
  totalPRs: number;
  storageUsed: number;
  storageLimit: number;
}

// 性能指标
export interface PerformanceMetrics {
  cpuUsage: number;
  cpuCores: number;
  cpuLoadAvg: number[];
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryFree: number;
  uptime: number;
  osPlatform: string;
  nodeVersion: string;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  requestCount: number;
  errorCount: number;
  auditTotal: number;
  auditToday: number;
  avgResponseTime: number;
  databaseConnectionCount: number;
}

// 数据库表统计
export interface TableStats {
  table: string;
  rows: number;
  size: string;
  rawSize?: number;
}

export interface DatabaseStats {
  tableSizes: TableStats[];
  totalSize: string;
  connectionCount: number;
  activeConnectionCount: number;
}

// 完整的监控数据
export interface MonitorData {
  system: SystemStats;
  metrics: PerformanceMetrics;
  database: DatabaseStats;
  lastUpdated: string;
}
