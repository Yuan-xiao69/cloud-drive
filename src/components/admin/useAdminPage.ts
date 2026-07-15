import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import type {
  AdminTab,
  DashboardData,
  UserSummary,
  UserDetail,
  RepositorySummary,
  RepoDetail,
  ReportSummary,
  ReportDetail,
  ReportStats,
  AuditLogEntry,
  Announcement,
  AnnouncementFormData,
  AdminNotificationConfig,
  Appeal,
  Penalty,
  PenaltyFormData,
  SecurityEvent,
  IpBlacklistEntry,
  IpFormData,
  IpGeoInfo,
  DiscussionSummary,
  DiscussionDetail,
  BanRecord,
  BanFormData,
  ActivityLogItem,
  ActivityLogStats,
  BackupFile,
  BackupStats,
  BackupFormData,
  ContextMenuData,
  SecurityStats,
  PenaltyTemplate,
  UserFilters,
} from './AdminTypes';

const PAGE_SIZE = 20;
const API_BASE = '/api/v1/admin';

// ============================================================
// API 请求工具
// ============================================================

// 每个 tab 独立的 AbortController，新请求到来时取消旧请求
const abortControllers = new Map<string, AbortController>();

function getAbortSignal(key: string): AbortSignal {
  abortControllers.get(key)?.abort();
  const controller = new AbortController();
  abortControllers.set(key, controller);
  return controller.signal;
}

async function adminFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();

  let res: { code: number; message?: string; [key: string]: unknown };

  if (method === 'GET') {
    res = await api.get<T>(url) as unknown as { code: number; message?: string; [key: string]: unknown };
  } else if (method === 'POST') {
    const body = options?.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
    res = await api.post<T>(url, body) as unknown as { code: number; message?: string; [key: string]: unknown };
  } else if (method === 'PUT') {
    const body = options?.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
    res = await api.put<T>(url, body) as unknown as { code: number; message?: string; [key: string]: unknown };
  } else if (method === 'DELETE') {
    res = await api.delete<T>(url) as unknown as { code: number; message?: string; [key: string]: unknown };
  } else {
    // PATCH 或其他方法：用 fetch 直发（api 客户端暂不支持 PATCH/signal）
    const fetchRes = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: options?.body,
      signal: options?.signal,
      credentials: 'include',
    });
    if (!fetchRes.ok) {
      const errBody = await fetchRes.json().catch(() => ({}));
      throw new Error(errBody.message || `请求失败 (${fetchRes.status})`);
    }
    res = await fetchRes.json();
  }

  // 统一检查业务状态码：兼容 code=0 和 code=2xx 两种成功约定
  // code 不存在、code===0、或 code 在 200-299 均视为成功
  const code = res.code;
  if (code === undefined || code === 0 || (code >= 200 && code < 300)) {
    return res as unknown as T;
  }

  throw new Error((res.message as string) || `业务错误 (code: ${code})`);
}

// ============================================================
// 初始状态工厂
// ============================================================

const emptyPenaltyForm: PenaltyFormData = {
  userId: '',
  username: '',
  type: 'mute',
  reason: '',
  duration: '7d',
};

const emptyAnnouncementForm: AnnouncementFormData = {
  id: '',
  title: '',
  content: '',
  type: 'info',
  priority: 'normal',
  isActive: true,
  isPinned: false,
};

const emptyIpForm: IpFormData = {
  ipAddress: '',
  reason: '',
  duration: '7d',
};

// ============================================================
// Hook 返回类型
// ============================================================

export interface UseAdminPageReturn {
  // 状态 - 导航 & 权限
  userRole: string;
  setUserRole: (role: string) => void;
  loadingRole: boolean;
  setLoadingRole: (loading: boolean) => void;

  // 状态 - 仪表盘
  dashboardData: DashboardData | null;
  setDashboardData: (data: DashboardData | null) => void;
  dashboardLoading: boolean;
  setDashboardLoading: (loading: boolean) => void;

  // 状态 - 用户
  users: UserSummary[];
  setUsers: (users: UserSummary[]) => void;
  usersTotal: number;
  setUsersTotal: (total: number) => void;
  usersPage: number;
  setUsersPage: (page: number) => void;
  usersSearch: string;
  setUsersSearch: (search: string) => void;
  usersLoading: boolean;
  setUsersLoading: (loading: boolean) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
  userContextMenu: ContextMenuData | null;
  setUserContextMenu: (menu: ContextMenuData | null) => void;
  userPenaltyForm: PenaltyFormData;
  setUserPenaltyForm: (form: PenaltyFormData) => void;
  // 增强组件需要的状态
  userFilters: UserFilters;
  setUserFilters: (filters: UserFilters) => void;
  selectedUserDetail: UserDetail | null;
  setSelectedUserDetail: (detail: UserDetail | null) => void;

  // 状态 - 仓库
  repos: RepositorySummary[];
  setRepos: (repos: RepositorySummary[]) => void;
  reposTotal: number;
  setReposTotal: (total: number) => void;
  reposPage: number;
  setReposPage: (page: number) => void;
  reposSearch: string;
  setReposSearch: (search: string) => void;
  reposLoading: boolean;
  setReposLoading: (loading: boolean) => void;
  selectedRepos: Set<string>;
  setSelectedRepos: (repos: Set<string>) => void;
  repoContextMenu: ContextMenuData | null;
  setRepoContextMenu: (menu: ContextMenuData | null) => void;
  // 增强组件需要的状态
  selectedRepoDetail: RepoDetail | null;
  setSelectedRepoDetail: (detail: RepoDetail | null) => void;

  // 状态 - 举报
  reports: ReportSummary[];
  setReports: (reports: ReportSummary[]) => void;
  reportsTotal: number;
  setReportsTotal: (total: number) => void;
  reportsPage: number;
  setReportsPage: (page: number) => void;
  reportsLoading: boolean;
  setReportsLoading: (loading: boolean) => void;
  selectedReports: Set<string>;
  setSelectedReports: (reports: Set<string>) => void;
  reportContextMenu: ContextMenuData | null;
  setReportContextMenu: (menu: ContextMenuData | null) => void;
  showReportModal: boolean;
  setShowReportModal: (show: boolean) => void;
  reportAction: 'delete' | 'dismiss';
  setReportAction: (action: 'delete' | 'dismiss') => void;
  reportNote: string;
  setReportNote: (note: string) => void;
  currentReportId: string | null;
  setCurrentReportId: (id: string | null) => void;
  isHandlingReport: boolean;
  setIsHandlingReport: (handling: boolean) => void;
  currentReport: ReportSummary | null;
  setCurrentReport: (report: ReportSummary | null) => void;
  showReportDetailModal: boolean;
  setShowReportDetailModal: (show: boolean) => void;
  reportPenaltyType: string;
  setReportPenaltyType: (type: string) => void;
  reportPenaltyReason: string;
  setReportPenaltyReason: (reason: string) => void;
  reportPenaltySaving: boolean;
  setReportPenaltySaving: (saving: boolean) => void;
  // 增强组件需要的举报状态
  selectedReportDetail: ReportDetail | null;
  setSelectedReportDetail: (detail: ReportDetail | null) => void;
  reportDetailLoading: boolean;
  setReportDetailLoading: (loading: boolean) => void;
  reportStats: ReportStats | null;
  setReportStats: (stats: ReportStats | null) => void;
  reportStatsLoading: boolean;
  setReportStatsLoading: (loading: boolean) => void;
  // 增强组件需要的方法
  fetchReportDetail: (reportId: string) => Promise<void>;
  fetchReportStats: () => Promise<void>;

  // 用户详情获取（用于编辑后刷新详情面板）
  fetchUserDetail: (userId: string) => Promise<void>;

  // 状态 - 审计日志
  auditLogs: AuditLogEntry[];
  setAuditLogs: (logs: AuditLogEntry[]) => void;
  auditLogsTotal: number;
  setAuditLogsTotal: (total: number) => void;
  auditLogsPage: number;
  setAuditLogsPage: (page: number) => void;
  auditLogsLoading: boolean;
  setAuditLogsLoading: (loading: boolean) => void;

  // 状态 - 公告
  announcements: Announcement[];
  setAnnouncements: (announcements: Announcement[]) => void;
  announcementsTotal: number;
  setAnnouncementsTotal: (total: number) => void;
  announcementsPage: number;
  setAnnouncementsPage: (page: number) => void;
  announcementsLoading: boolean;
  setAnnouncementsLoading: (loading: boolean) => void;
  announcementStats: { total: number; active: number; pinned: number; scheduled: number };
  showAnnouncementModal: boolean;
  setShowAnnouncementModal: (show: boolean) => void;
  announcementForm: AnnouncementFormData;
  setAnnouncementForm: (form: AnnouncementFormData) => void;
  announcementSaving: boolean;
  setAnnouncementSaving: (saving: boolean) => void;

  // 状态 - 申诉
  appeals: Appeal[];
  setAppeals: (appeals: Appeal[]) => void;
  appealsTotal: number;
  setAppealsTotal: (total: number) => void;
  appealsPage: number;
  setAppealsPage: (page: number) => void;
  appealsStatus: string;
  setAppealsStatus: (status: string) => void;
  appealsLoading: boolean;
  setAppealsLoading: (loading: boolean) => void;
  selectedAppeals: Set<string>;
  setSelectedAppeals: (appeals: Set<string>) => void;
  appealContextMenu: ContextMenuData | null;
  setAppealContextMenu: (menu: ContextMenuData | null) => void;
  showAppealModal: boolean;
  setShowAppealModal: (show: boolean) => void;
  currentAppeal: Appeal | null;
  setCurrentAppeal: (appeal: Appeal | null) => void;
  appealReply: string;
  setAppealReply: (reply: string) => void;
  appealProcessing: boolean;
  setAppealProcessing: (processing: boolean) => void;
  // 增强组件需要的状态
  selectedAppealDetail: Appeal | null;
  setSelectedAppealDetail: (detail: Appeal | null) => void;

  // 状态 - 处罚
  penalties: Penalty[];
  setPenalties: (penalties: Penalty[]) => void;
  penaltiesTotal: number;
  setPenaltiesTotal: (total: number) => void;
  penaltiesPage: number;
  setPenaltiesPage: (page: number) => void;
  penaltiesSearch: string;
  setPenaltiesSearch: (search: string) => void;
  penaltiesType: string;
  setPenaltiesType: (type: string) => void;
  penaltiesStatus: string;
  setPenaltiesStatus: (status: string) => void;
  penaltiesLoading: boolean;
  setPenaltiesLoading: (loading: boolean) => void;
  selectedPenalties: Set<string>;
  setSelectedPenalties: (penalties: Set<string>) => void;
  penaltyContextMenu: ContextMenuData | null;
  setPenaltyContextMenu: (menu: ContextMenuData | null) => void;
  showPenaltyModal: boolean;
  setShowPenaltyModal: (show: boolean) => void;
  penaltyForm: PenaltyFormData;
  setPenaltyForm: (form: PenaltyFormData) => void;
  penaltySaving: boolean;
  setPenaltySaving: (saving: boolean) => void;
  currentPenalty: Penalty | null;
  setCurrentPenalty: (penalty: Penalty | null) => void;
  showPenaltyDetailModal: boolean;
  setShowPenaltyDetailModal: (show: boolean) => void;
  showRemovePenaltyModal: boolean;
  setShowRemovePenaltyModal: (show: boolean) => void;
  removeReason: string;
  setRemoveReason: (reason: string) => void;
  removeSaving: boolean;
  setRemoveSaving: (saving: boolean) => void;
  // 增强组件需要的状态
  penaltyTemplates: PenaltyTemplate[];
  setPenaltyTemplates: (templates: PenaltyTemplate[]) => void;

  // 状态 - 安全事件
  securityEvents: SecurityEvent[];
  setSecurityEvents: (events: SecurityEvent[]) => void;
  securityTotal: number;
  setSecurityTotal: (total: number) => void;
  securityPage: number;
  setSecurityPage: (page: number) => void;
  securitySeverity: string;
  setSecuritySeverity: (severity: string) => void;
  securityStatus: string;
  setSecurityStatus: (status: string) => void;
  securityLoading: boolean;
  setSecurityLoading: (loading: boolean) => void;
  selectedSecurityEvents: Set<string>;
  setSelectedSecurityEvents: (events: Set<string>) => void;
  securityContextMenu: ContextMenuData | null;
  setSecurityContextMenu: (menu: ContextMenuData | null) => void;
  showSecurityModal: boolean;
  setShowSecurityModal: (show: boolean) => void;
  currentSecurityEvent: SecurityEvent | null;
  setCurrentSecurityEvent: (event: SecurityEvent | null) => void;
  securityProcessing: boolean;
  setSecurityProcessing: (processing: boolean) => void;
  // 增强组件需要的状态
  securityStats: SecurityStats | null;
  setSecurityStats: (stats: SecurityStats | null) => void;
  selectedSecurityEventDetail: SecurityEvent | null;
  setSelectedSecurityEventDetail: (detail: SecurityEvent | null) => void;

  // 状态 - IP 黑名单
  ipBlacklist: IpBlacklistEntry[];
  setIpBlacklist: (list: IpBlacklistEntry[]) => void;
  ipBlacklistTotal: number;
  setIpBlacklistTotal: (total: number) => void;
  ipBlacklistPage: number;
  setIpBlacklistPage: (page: number) => void;
  ipBlacklistSearch: string;
  setIpBlacklistSearch: (search: string) => void;
  ipBlacklistLoading: boolean;
  setIpBlacklistLoading: (loading: boolean) => void;
  showIpModal: boolean;
  setShowIpModal: (show: boolean) => void;
  ipForm: IpFormData;
  setIpForm: (form: IpFormData) => void;
  ipSaving: boolean;
  setIpSaving: (saving: boolean) => void;
  // 增强组件需要的状态
  selectedIpDetail: IpGeoInfo | null;
  setSelectedIpDetail: (detail: IpGeoInfo | null) => void;
  ipAccessStats: Record<string, unknown> | null;
  setIpAccessStats: (stats: Record<string, unknown> | null) => void;

  // 状态 - 讨论管理
  adminDiscussions: DiscussionSummary[];
  setAdminDiscussions: (discussions: DiscussionSummary[]) => void;
  discussionsTotal: number;
  setDiscussionsTotal: (total: number) => void;
  discussionsPage: number;
  setDiscussionsPage: (page: number) => void;
  discussionsLoading: boolean;
  setDiscussionsLoading: (loading: boolean) => void;
  discussionsSearch: string;
  setDiscussionsSearch: (search: string) => void;
  discussionsCategory: string;
  setDiscussionsCategory: (category: string) => void;
  discussionsStatus: string;
  setDiscussionsStatus: (status: string) => void;
  selectedDiscussions: Set<string>;
  setSelectedDiscussions: (discussions: Set<string>) => void;
  discussionContextMenu: ContextMenuData | null;
  setDiscussionContextMenu: (menu: ContextMenuData | null) => void;
  // 增强组件需要的状态
  selectedDiscussionDetail: DiscussionDetail | null;
  setSelectedDiscussionDetail: (detail: DiscussionDetail | null) => void;

  // 状态 - 通知管理
  notifications: AdminNotificationConfig[];
  setNotifications: (notifications: AdminNotificationConfig[]) => void;
  notificationsTotal: number;
  setNotificationsTotal: (total: number) => void;
  notificationsPage: number;
  setNotificationsPage: (page: number) => void;
  notificationsLoading: boolean;
  setNotificationsLoading: (loading: boolean) => void;
  sendTitle: string;
  setSendTitle: (title: string) => void;
  sendContent: string;
  setSendContent: (content: string) => void;
  sendType: string;
  setSendType: (type: string) => void;
  sendLinkUrl: string;
  setSendLinkUrl: (url: string) => void;
  sending: boolean;
  setSending: (sending: boolean) => void;

  // 状态 - 封禁管理
  bans: BanRecord[];
  setBans: (bans: BanRecord[]) => void;
  bansTotal: number;
  setBansTotal: (total: number) => void;
  bansPage: number;
  setBansPage: (page: number) => void;
  bansSearch: string;
  setBansSearch: (search: string) => void;
  bansStatus: string;
  setBansStatus: (status: string) => void;
  bansLoading: boolean;
  setBansLoading: (loading: boolean) => void;
  showBanModal: boolean;
  setShowBanModal: (show: boolean) => void;
  banForm: BanFormData;
  setBanForm: (form: BanFormData) => void;
  banSaving: boolean;
  setBanSaving: (saving: boolean) => void;
  showUnbanModal: boolean;
  setShowUnbanModal: (show: boolean) => void;
  unbanBanRecord: BanRecord | null;
  setUnbanBanRecord: (record: BanRecord | null) => void;
  unbanReason: string;
  setUnbanReason: (reason: string) => void;
  unbanSaving: boolean;
  setUnbanSaving: (saving: boolean) => void;
  showDeleteBanModal: boolean;
  setShowDeleteBanModal: (show: boolean) => void;
  deleteBanRecord: BanRecord | null;
  setDeleteBanRecord: (record: BanRecord | null) => void;
  deleteBanSaving: boolean;
  setDeleteBanSaving: (saving: boolean) => void;

  // 状态 - 活动日志
  activityLogs: ActivityLogItem[];
  setActivityLogs: (logs: ActivityLogItem[]) => void;
  activityLogsTotal: number;
  setActivityLogsTotal: (total: number) => void;
  activityLogsPage: number;
  setActivityLogsPage: (page: number) => void;
  activityLogsSearch: string;
  setActivityLogsSearch: (search: string) => void;
  activityLogsAction: string;
  setActivityLogsAction: (action: string) => void;
  activityLogsStatus: string;
  setActivityLogsStatus: (status: string) => void;
  activityLogsLoading: boolean;
  setActivityLogsLoading: (loading: boolean) => void;
  activityLogStats: ActivityLogStats | null;
  setActivityLogStats: (stats: ActivityLogStats | null) => void;

  // 状态 - 备份管理
  backupFiles: BackupFile[];
  setBackupFiles: (files: BackupFile[]) => void;
  backupLoading: boolean;
  setBackupLoading: (loading: boolean) => void;
  backupCreating: boolean;
  setBackupCreating: (creating: boolean) => void;
  backupStats: BackupStats | null;
  setBackupStats: (stats: BackupStats | null) => void;
  showBackupModal: boolean;
  setShowBackupModal: (show: boolean) => void;
  backupForm: BackupFormData;
  setBackupForm: (form: BackupFormData) => void;
  showDeleteBackupModal: boolean;
  setShowDeleteBackupModal: (show: boolean) => void;
  deleteBackupFile: BackupFile | null;
  setDeleteBackupFile: (file: BackupFile | null) => void;
  deleteBackupSaving: boolean;
  setDeleteBackupSaving: (saving: boolean) => void;

  // 数据获取函数
  fetchDashboard: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchRepos: () => Promise<void>;
  fetchReports: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  fetchAnnouncements: () => Promise<void>;
  fetchAppeals: () => Promise<void>;
  fetchPenalties: () => Promise<void>;
  fetchSecurityEvents: () => Promise<void>;
  fetchIpBlacklist: () => Promise<void>;
  fetchDiscussions: () => Promise<void>;
  fetchBans: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
  fetchBackupFiles: () => Promise<void>;
  fetchNotifications: () => Promise<void>;

  // 操作处理函数
  handleDeleteUser: (userId: string) => Promise<void>;
  handleDeleteSelectedUsers: (userIds: string[]) => Promise<void>;
  handleBanUser: (userId: string, banned: boolean) => Promise<void>;
  handleMuteUser: (userId: string, username: string) => void;
  handleLimitRepoUser: (userId: string, username: string) => void;
  handleLimitStorageUser: (userId: string, username: string) => void;
  handleDeleteRepo: (repoId: string) => Promise<void>;
  handleDeleteSelectedRepos: (repoIds: string[]) => Promise<void>;
  handleOpenReportModal: (reportId: string, action: 'delete' | 'dismiss') => void;
  handleReportSubmit: () => Promise<void>;
  handleOpenReportDetail: (report: ReportSummary) => void;
  handleCloseReportDetail: () => void;
  handlePenalizeFromReport: (report: ReportSummary, penaltyType: string, penaltyReason: string) => Promise<void>;
  handleOpenAnnouncementModal: (announcement?: Announcement | null) => void;
  handleAnnouncementSubmit: (formData?: AnnouncementFormData) => Promise<void>;
  handleDeleteAnnouncement: (id: string) => Promise<void>;
  handleToggleAnnouncementActive: (id: string, isActive: boolean) => Promise<void>;
  handleOpenAppealModal: (appeal: Appeal) => void;
  handleApproveAppeal: (appealId: string) => Promise<void>;
  handleRejectAppeal: (appealId: string) => Promise<void>;
  handlePenaltySubmit: () => Promise<void>;
  handleDeletePenalty: (id: string) => Promise<void>;
  handleOpenPenaltyDetail: (penalty: Penalty) => void;
  handleClosePenaltyDetail: () => void;
  handleOpenRemovePenalty: (penalty: Penalty) => void;
  handleCloseRemovePenalty: () => void;
  handleRemovePenaltySubmit: () => Promise<void>;
  handleBanUserFromPenalty: (userId: string) => Promise<void>;
  handleOpenSecurityModal: (event: SecurityEvent) => void;
  handleResolveSecurityEvent: (eventId: string) => Promise<void>;
  handleIpSubmit: () => Promise<void>;
  handleDeleteIp: (id: string) => Promise<void>;
  handleDeleteDiscussion: (id: string) => Promise<void>;
  handleRestoreDiscussion: (id: string) => Promise<void>;
  handleSendNotification: (overrideData?: { title: string; content: string; type: string; targetRoles?: string[]; targetUserIds?: string[] }) => Promise<void>;
  handleDeleteNotification: (id: string) => Promise<void>;
  handleOpenBanModal: () => void;
  handleCloseBanModal: () => void;
  handleBanSubmit: () => Promise<void>;
  handleOpenUnbanModal: (record: BanRecord) => void;
  handleCloseUnbanModal: () => void;
  handleUnbanSubmit: () => Promise<void>;
  handleOpenDeleteBanModal: (record: BanRecord) => void;
  handleCloseDeleteBanModal: () => void;
  handleDeleteBanSubmit: () => Promise<void>;
  handleOpenBackupModal: () => void;
  handleCloseBackupModal: () => void;
  handleCreateBackup: () => Promise<void>;
  handleOpenDeleteBackupModal: (file: BackupFile) => void;
  handleCloseDeleteBackupModal: () => void;
  handleDeleteBackupSubmit: () => Promise<void>;

  // 辅助函数
  emptyPenaltyForm: PenaltyFormData;
  emptyAnnouncementForm: AnnouncementFormData;
  emptyIpForm: IpFormData;
}

// ============================================================
// Hook 实现
// ============================================================

export function useAdminPage(): UseAdminPageReturn {
  // ---- 防抖：避免搜索输入时频繁请求 ----
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const debouncedRun = useCallback((key: string, fn: () => Promise<void> | void, delay = 300): Promise<void> => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    return new Promise<void>((resolve) => {
      debounceTimers.current[key] = setTimeout(() => {
        debounceTimers.current[key] = null;
        const result = fn();
        if (result instanceof Promise) result.then(resolve).catch(resolve);
        else resolve();
      }, delay);
    });
  }, []);

  // ---- 导航 & 权限 ----
  const [userRole, setUserRole] = useState<string>('');
  const [loadingRole, setLoadingRole] = useState(true);

  // ---- 仪表盘 ----
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // ---- 用户 ----
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [userContextMenu, setUserContextMenu] = useState<ContextMenuData | null>(null);
  const [userPenaltyForm, setUserPenaltyForm] = useState<PenaltyFormData>(emptyPenaltyForm);
  // 增强组件需要的状态
  const [userFilters, setUserFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    dateRange: { start: '', end: '' },
  });
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);

  // ---- 仓库 ----
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [reposTotal, setReposTotal] = useState(0);
  const [reposPage, setReposPage] = useState(1);
  const [reposSearch, setReposSearch] = useState('');
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [repoContextMenu, setRepoContextMenu] = useState<ContextMenuData | null>(null);
  // 增强组件需要的状态
  const [selectedRepoDetail, setSelectedRepoDetail] = useState<RepoDetail | null>(null);

  // ---- 举报 ----
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [reportContextMenu, setReportContextMenu] = useState<ContextMenuData | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAction, setReportAction] = useState<'delete' | 'dismiss'>('dismiss');
  const [reportNote, setReportNote] = useState('');
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [isHandlingReport, setIsHandlingReport] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportSummary | null>(null);
  const [showReportDetailModal, setShowReportDetailModal] = useState(false);
  const [reportPenaltyType, setReportPenaltyType] = useState('mute');
  const [reportPenaltyReason, setReportPenaltyReason] = useState('');
  const [reportPenaltySaving, setReportPenaltySaving] = useState(false);
  // 增强组件需要的状态
  const [selectedReportDetail, setSelectedReportDetail] = useState<ReportDetail | null>(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [reportStatsLoading, setReportStatsLoading] = useState(false);

  // ---- 审计日志 ----
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  // ---- 公告 ----
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsTotal, setAnnouncementsTotal] = useState(0);
  const [announcementsPage, setAnnouncementsPage] = useState(1);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementStats, setAnnouncementStats] = useState({ total: 0, active: 0, pinned: 0, scheduled: 0 });
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState<AnnouncementFormData>(emptyAnnouncementForm);
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  // ---- 申诉 ----
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealsTotal, setAppealsTotal] = useState(0);
  const [appealsPage, setAppealsPage] = useState(1);
  const [appealsStatus, setAppealsStatus] = useState('');
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [selectedAppeals, setSelectedAppeals] = useState<Set<string>>(new Set());
  const [appealContextMenu, setAppealContextMenu] = useState<ContextMenuData | null>(null);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [currentAppeal, setCurrentAppeal] = useState<Appeal | null>(null);
  const [appealReply, setAppealReply] = useState('');
  const [appealProcessing, setAppealProcessing] = useState(false);
  // 增强组件需要的状态
  const [selectedAppealDetail, setSelectedAppealDetail] = useState<Appeal | null>(null);

  // ---- 处罚 ----
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [penaltiesTotal, setPenaltiesTotal] = useState(0);
  const [penaltiesPage, setPenaltiesPage] = useState(1);
  const [penaltiesSearch, setPenaltiesSearch] = useState('');
  const [penaltiesType, setPenaltiesType] = useState('');
  const [penaltiesStatus, setPenaltiesStatus] = useState('');
  const [penaltiesLoading, setPenaltiesLoading] = useState(false);
  const [selectedPenalties, setSelectedPenalties] = useState<Set<string>>(new Set());
  const [penaltyContextMenu, setPenaltyContextMenu] = useState<ContextMenuData | null>(null);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyForm, setPenaltyForm] = useState<PenaltyFormData>(emptyPenaltyForm);
  const [penaltySaving, setPenaltySaving] = useState(false);
  const [currentPenalty, setCurrentPenalty] = useState<Penalty | null>(null);
  const [showPenaltyDetailModal, setShowPenaltyDetailModal] = useState(false);
  const [showRemovePenaltyModal, setShowRemovePenaltyModal] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [removeSaving, setRemoveSaving] = useState(false);
  // 增强组件需要的状态
  const [penaltyTemplates, setPenaltyTemplates] = useState<PenaltyTemplate[]>([]);

  // ---- 安全事件 ----
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityTotal, setSecurityTotal] = useState(0);
  const [securityPage, setSecurityPage] = useState(1);
  const [securitySeverity, setSecuritySeverity] = useState('');
  const [securityStatus, setSecurityStatus] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [selectedSecurityEvents, setSelectedSecurityEvents] = useState<Set<string>>(new Set());
  const [securityContextMenu, setSecurityContextMenu] = useState<ContextMenuData | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [currentSecurityEvent, setCurrentSecurityEvent] = useState<SecurityEvent | null>(null);
  const [securityProcessing, setSecurityProcessing] = useState(false);
  // 增强组件需要的状态
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [selectedSecurityEventDetail, setSelectedSecurityEventDetail] = useState<SecurityEvent | null>(null);

  // ---- IP 黑名单 ----
  const [ipBlacklist, setIpBlacklist] = useState<IpBlacklistEntry[]>([]);
  const [ipBlacklistTotal, setIpBlacklistTotal] = useState(0);
  const [ipBlacklistPage, setIpBlacklistPage] = useState(1);
  const [ipBlacklistSearch, setIpBlacklistSearch] = useState('');
  const [ipBlacklistLoading, setIpBlacklistLoading] = useState(false);
  const [showIpModal, setShowIpModal] = useState(false);
  const [ipForm, setIpForm] = useState<IpFormData>(emptyIpForm);
  const [ipSaving, setIpSaving] = useState(false);
  // 增强组件需要的状态
  const [selectedIpDetail, setSelectedIpDetail] = useState<IpGeoInfo | null>(null);
  const [ipAccessStats, setIpAccessStats] = useState<Record<string, unknown> | null>(null);

  // ---- 讨论管理 ----
  const [adminDiscussions, setAdminDiscussions] = useState<DiscussionSummary[]>([]);
  const [discussionsTotal, setDiscussionsTotal] = useState(0);
  const [discussionsPage, setDiscussionsPage] = useState(1);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [discussionsSearch, setDiscussionsSearch] = useState('');
  const [discussionsCategory, setDiscussionsCategory] = useState('');
  const [discussionsStatus, setDiscussionsStatus] = useState('');
  const [selectedDiscussions, setSelectedDiscussions] = useState<Set<string>>(new Set());
  const [discussionContextMenu, setDiscussionContextMenu] = useState<ContextMenuData | null>(null);
  // 增强组件需要的状态
  const [selectedDiscussionDetail, setSelectedDiscussionDetail] = useState<DiscussionDetail | null>(null);

  // ---- 通知管理 ----
  const [notifications, setNotifications] = useState<AdminNotificationConfig[]>([]);
  const [notificationsTotal, setNotificationsTotal] = useState(0);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [sendTitle, setSendTitle] = useState('');
  const [sendContent, setSendContent] = useState('');
  const [sendType, setSendType] = useState('system');
  const [sendLinkUrl, setSendLinkUrl] = useState('');
  const [sending, setSending] = useState(false);

  // ---- 封禁管理 ----
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [bansTotal, setBansTotal] = useState(0);
  const [bansPage, setBansPage] = useState(1);
  const [bansSearch, setBansSearch] = useState('');
  const [bansStatus, setBansStatus] = useState('');
  const [bansLoading, setBansLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banForm, setBanForm] = useState<BanFormData>({ userId: '', reason: '', banType: 'permanent', expiresAt: '' });
  const [banSaving, setBanSaving] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [unbanBanRecord, setUnbanBanRecord] = useState<BanRecord | null>(null);
  const [unbanReason, setUnbanReason] = useState('');
  const [unbanSaving, setUnbanSaving] = useState(false);
  const [showDeleteBanModal, setShowDeleteBanModal] = useState(false);
  const [deleteBanRecord, setDeleteBanRecord] = useState<BanRecord | null>(null);
  const [deleteBanSaving, setDeleteBanSaving] = useState(false);

  // ---- 活动日志 ----
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [activityLogsTotal, setActivityLogsTotal] = useState(0);
  const [activityLogsPage, setActivityLogsPage] = useState(1);
  const [activityLogsSearch, setActivityLogsSearch] = useState('');
  const [activityLogsAction, setActivityLogsAction] = useState('');
  const [activityLogsStatus, setActivityLogsStatus] = useState('');
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogStats, setActivityLogStats] = useState<ActivityLogStats | null>(null);

  // ---- 备份管理 ----
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupCreating, setBackupCreating] = useState(false);
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupForm, setBackupForm] = useState<BackupFormData>({ compress: true, retainDays: 30 });
  const [showDeleteBackupModal, setShowDeleteBackupModal] = useState(false);
  const [deleteBackupFile, setDeleteBackupFile] = useState<BackupFile | null>(null);
  const [deleteBackupSaving, setDeleteBackupSaving] = useState(false);

  // ============================================================
  // 数据获取函数
  // ============================================================

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await adminFetch<{ code: number; data: DashboardData }>(`${API_BASE}/dashboard`, { signal: getAbortSignal('dashboard') });
      setDashboardData(res.data);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载仪表盘失败:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(usersPage), size: String(PAGE_SIZE) });
      if (usersSearch) params.set('search', usersSearch);
      if (userFilters.role) params.set('role', userFilters.role);
      if (userFilters.status) params.set('status', userFilters.status);
      if (userFilters.dateFrom) params.set('dateFrom', userFilters.dateFrom);
      if (userFilters.dateTo) params.set('dateTo', userFilters.dateTo);
      const res = await adminFetch<{ code: number; data: { items: UserSummary[]; total: number } }>(
        `${API_BASE}/users?${params}`,
        { signal: getAbortSignal('users') }
      );
      setUsers(res.data.items);
      setUsersTotal(res.data.total);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载用户列表失败:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersSearch, userFilters]);

  const fetchRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      const params = new URLSearchParams({ page: String(reposPage), size: String(PAGE_SIZE) });
      if (reposSearch) params.set('search', reposSearch);
      const res = await adminFetch<{ code: number; data: { items: RepositorySummary[]; total: number } }>(
        `${API_BASE}/repos?${params}`,
        { signal: getAbortSignal('repos') }
      );
      setRepos(res.data.items);
      setReposTotal(res.data.total);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载仓库列表失败:', err);
    } finally {
      setReposLoading(false);
    }
  }, [reposPage, reposSearch]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(reportsPage), size: String(PAGE_SIZE) });
      const res = await adminFetch<{ code: number; data: { items: ReportSummary[]; total: number } }>(
        `${API_BASE}/reports?${params}`,
        { signal: getAbortSignal('reports') }
      );
      setReports(res.data.items);
      setReportsTotal(res.data.total);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载举报列表失败:', err);
    } finally {
      setReportsLoading(false);
    }
  }, [reportsPage]);

  // 获取举报详情
  const fetchReportDetail = useCallback(async (reportId: string) => {
    setReportDetailLoading(true);
    try {
      const res = await adminFetch<{ code: number; data: ReportDetail }>(
        `${API_BASE}/reports/${reportId}/detail`
      );
      setSelectedReportDetail(res.data);
    } catch (err) {
      console.error('获取举报详情失败:', err);
    } finally {
      setReportDetailLoading(false);
    }
  }, []);

  // 获取举报统计
  const fetchReportStats = useCallback(async () => {
    setReportStatsLoading(true);
    try {
      const res = await adminFetch<{ code: number; data: ReportStats }>(
        `${API_BASE}/reports/stats`
      );
      setReportStats(res.data);
    } catch (err) {
      console.error('获取举报统计失败:', err);
    } finally {
      setReportStatsLoading(false);
    }
  }, []);

  // 获取用户详情（用于编辑后刷新详情面板）
  const fetchUserDetail = useCallback(async (userId: string) => {
    try {
      const res = await adminFetch<{ code: number; data: UserDetail }>(
        `${API_BASE}/users/${userId}/detail`
      );
      setSelectedUserDetail(res.data);
    } catch (err) {
      console.error('获取用户详情失败:', err);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(auditLogsPage), size: String(PAGE_SIZE) });
      const res = await adminFetch<{ code: number; data: { items: AuditLogEntry[]; pagination: { total: number } } }>(
        `${API_BASE}/audit-logs?${params}`
      );
      setAuditLogs(res.data.items || []);
      setAuditLogsTotal(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('加载审计日志失败:', err);
    } finally {
      setAuditLogsLoading(false);
    }
  }, [auditLogsPage]);

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(announcementsPage), size: String(PAGE_SIZE) });
      const res = await adminFetch<{
        code: number;
        data: {
          items: Announcement[];
          pagination: { total: number };
          stats: { total: number; active: number; pinned: number; scheduled: number };
        };
      }>(`${API_BASE}/announcements?${params}`);
      setAnnouncements(res.data.items);
      setAnnouncementsTotal(res.data.pagination.total);
      setAnnouncementStats(res.data.stats);
    } catch (err) {
      console.error('加载公告列表失败:', err);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [announcementsPage]);

  const fetchAppeals = useCallback((): Promise<void> => {
    return debouncedRun('appeals', async () => {
      setAppealsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(appealsPage), size: String(PAGE_SIZE) });
        if (appealsStatus) params.set('status', appealsStatus);
        const res = await adminFetch<{ code: number; data: { items: Appeal[]; pagination: { total: number } } }>(
          `${API_BASE}/appeals?${params}`
        );
        setAppeals(res.data.items || []);
        setAppealsTotal(res.data.pagination?.total || 0);
      } catch (err) {
        console.error('加载申诉列表失败:', err);
      } finally {
        setAppealsLoading(false);
      }
    });
  }, [appealsPage, appealsStatus, debouncedRun]);

  const fetchPenalties = useCallback((): Promise<void> => {
    return debouncedRun('penalties', async () => {
      setPenaltiesLoading(true);
      try {
        const params = new URLSearchParams({ page: String(penaltiesPage), size: String(PAGE_SIZE) });
        if (penaltiesSearch) params.set('search', penaltiesSearch);
        if (penaltiesType) params.set('type', penaltiesType);
        if (penaltiesStatus) params.set('status', penaltiesStatus);
        const res = await adminFetch<{ code: number; data: { items: Penalty[]; total: number } }>(
          `${API_BASE}/penalties?${params}`
        );
        setPenalties(res.data.items);
        setPenaltiesTotal(res.data.total);
      } catch (err) {
        console.error('加载处罚列表失败:', err);
      } finally {
        setPenaltiesLoading(false);
      }
    });
  }, [penaltiesPage, penaltiesSearch, penaltiesType, penaltiesStatus, debouncedRun]);

  const fetchSecurityEvents = useCallback((): Promise<void> => {
    return debouncedRun('security', async () => {
      setSecurityLoading(true);
      try {
        const params = new URLSearchParams({ page: String(securityPage), size: String(PAGE_SIZE) });
        if (securitySeverity) params.set('severity', securitySeverity);
        if (securityStatus) params.set('status', securityStatus);
        const res = await adminFetch<{ code: number; data: { items: SecurityEvent[]; pagination: { total: number } } }>(
          `${API_BASE}/security-events?${params}`
        );
        setSecurityEvents(res.data.items || []);
        setSecurityTotal(res.data.pagination?.total || 0);
      } catch (err) {
        console.error('加载安全事件失败:', err);
      } finally {
        setSecurityLoading(false);
      }
    });
  }, [securityPage, securitySeverity, securityStatus, debouncedRun]);

  const fetchIpBlacklist = useCallback((): Promise<void> => {
    return debouncedRun('ipBlacklist', async () => {
      setIpBlacklistLoading(true);
      try {
        const params = new URLSearchParams({ page: String(ipBlacklistPage), size: String(PAGE_SIZE) });
        if (ipBlacklistSearch) params.set('search', ipBlacklistSearch);
        const res = await adminFetch<{ code: number; data: { entries: IpBlacklistEntry[]; pagination: { total: number } } }>(
          `${API_BASE}/ip-blacklist?${params}`
        );
        setIpBlacklist(res.data.entries || []);
        setIpBlacklistTotal(res.data.pagination?.total || 0);
      } catch (err) {
        console.error('加载 IP 黑名单失败:', err);
      } finally {
        setIpBlacklistLoading(false);
      }
    });
  }, [ipBlacklistPage, ipBlacklistSearch, debouncedRun]);

  const fetchDiscussions = useCallback((): Promise<void> => {
    return debouncedRun('discussions', async () => {
      setDiscussionsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(discussionsPage), size: String(PAGE_SIZE) });
        if (discussionsSearch) params.set('keyword', discussionsSearch);
        if (discussionsCategory) params.set('category', discussionsCategory);
        if (discussionsStatus) params.set('status', discussionsStatus);
        const res = await adminFetch<{ code: number; data: { items: DiscussionSummary[]; total: number } }>(
          `${API_BASE}/discussions?${params}`
        );
        setAdminDiscussions(res.data.items);
        setDiscussionsTotal(res.data.total);
      } catch (err) {
        console.error('加载讨论列表失败:', err);
      } finally {
        setDiscussionsLoading(false);
      }
    });
  }, [discussionsPage, discussionsSearch, discussionsCategory, discussionsStatus, debouncedRun]);

  const fetchBans = useCallback((): Promise<void> => {
    return debouncedRun('bans', async () => {
      setBansLoading(true);
      try {
        const params = new URLSearchParams({ page: String(bansPage), size: String(PAGE_SIZE) });
        if (bansSearch) params.set('search', bansSearch);
        if (bansStatus) params.set('status', bansStatus);
        const res = await adminFetch<{ code: number; data: { items: BanRecord[]; total: number } }>(
          `${API_BASE}/bans?${params}`
        );
        setBans(res.data.items);
        setBansTotal(res.data.total);
      } catch (err) {
        console.error('加载封禁列表失败:', err);
      } finally {
        setBansLoading(false);
      }
    });
  }, [bansPage, bansSearch, bansStatus, debouncedRun]);

  const fetchActivityLogs = useCallback((): Promise<void> => {
    return debouncedRun('activityLogs', async () => {
      setActivityLogsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(activityLogsPage), size: String(PAGE_SIZE) });
        if (activityLogsSearch) params.set('search', activityLogsSearch);
        if (activityLogsAction) params.set('action', activityLogsAction);
        if (activityLogsStatus) params.set('status', activityLogsStatus);
        const res = await adminFetch<{ code: number; data: { items: ActivityLogItem[]; total: number }; stats: ActivityLogStats }>(
          `${API_BASE}/activity-logs?${params}`
        );
        setActivityLogs(res.data.items);
        setActivityLogsTotal(res.data.total);
        if (res.stats) setActivityLogStats(res.stats);
      } catch (err) {
        console.error('加载活动日志失败:', err);
      } finally {
        setActivityLogsLoading(false);
      }
    });
  }, [activityLogsPage, activityLogsSearch, activityLogsAction, activityLogsStatus, debouncedRun]);

  const fetchBackupFiles = useCallback(async () => {
    setBackupLoading(true);
    try {
      const res = await adminFetch<{ code: number; data: { backups: BackupFile[]; stats: BackupStats } }>(
        `${API_BASE}/backup`
      );
      setBackupFiles(res.data?.backups || []);
      if (res.data?.stats) setBackupStats(res.data.stats);
    } catch (err) {
      console.error('加载备份列表失败:', err);
    } finally {
      setBackupLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(notificationsPage), size: String(PAGE_SIZE) });
      const res = await adminFetch<{ code: number; data: { items: AdminNotificationConfig[]; total: number } }>(
        `${API_BASE}/notifications?${params}`,
        { signal: getAbortSignal('notifications') }
      );
      setNotifications(res.data.items || []);
      setNotificationsTotal(res.data.total || 0);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('加载通知列表失败:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationsPage]);

  // ============================================================
  // 操作处理函数
  // ============================================================

  // ---- 用户 ----
  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await adminFetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchUsers]);

  const handleDeleteSelectedUsers = useCallback(async (userIds: string[]) => {
    try {
      await adminFetch(`${API_BASE}/users/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      });
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (err) {
      toast.error((err as Error).message || '批量删除失败');
    }
  }, [fetchUsers]);

  const handleBanUser = useCallback(async (userId: string, banned: boolean) => {
    try {
      await adminFetch(`${API_BASE}/users/${userId}/ban`, {
        method: banned ? 'POST' : 'DELETE',
      });
      // 不在此处自动刷新列表，由调用方决定刷新时机（批量操作统一刷新）
      // 如果详情面板正在显示该用户，刷新详情
      if (selectedUserDetail?.id === userId) {
        fetchUserDetail(userId);
      }
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    }
  }, [selectedUserDetail?.id, fetchUserDetail]);

  const handleMuteUser = useCallback((userId: string, username: string) => {
    setUserPenaltyForm({ ...emptyPenaltyForm, userId, username, type: 'mute' });
    setShowPenaltyModal(true);
  }, []);

  const handleLimitRepoUser = useCallback((userId: string, username: string) => {
    setUserPenaltyForm({ ...emptyPenaltyForm, userId, username, type: 'repo_limit' });
    setShowPenaltyModal(true);
  }, []);

  const handleLimitStorageUser = useCallback((userId: string, username: string) => {
    setUserPenaltyForm({ ...emptyPenaltyForm, userId, username, type: 'storage_limit' });
    setShowPenaltyModal(true);
  }, []);

  // ---- 仓库 ----
  const handleDeleteRepo = useCallback(async (repoId: string) => {
    try {
      await adminFetch(`${API_BASE}/repos/${repoId}`, { method: 'DELETE' });
      fetchRepos();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchRepos]);

  const handleDeleteSelectedRepos = useCallback(async (repoIds: string[]) => {
    try {
      await adminFetch(`${API_BASE}/repos/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ repoIds }),
      });
      setSelectedRepos(new Set());
      fetchRepos();
    } catch (err) {
      toast.error((err as Error).message || '批量删除失败');
    }
  }, [fetchRepos]);

  // ---- 举报 ----
  const handleOpenReportModal = useCallback((reportId: string, action: 'delete' | 'dismiss') => {
    setCurrentReportId(reportId);
    setReportAction(action);
    setReportNote('');
    setShowReportModal(true);
  }, []);

  const handleReportSubmit = useCallback(async () => {
    if (!currentReportId) return;
    setIsHandlingReport(true);
    try {
      await adminFetch(`${API_BASE}/reports/${currentReportId}/handle`, {
        method: 'POST',
        body: JSON.stringify({ action: reportAction, note: reportNote }),
      });
      setShowReportModal(false);
      setCurrentReportId(null);
      fetchReports();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setIsHandlingReport(false);
    }
  }, [currentReportId, reportAction, reportNote, fetchReports]);

  const handleOpenReportDetail = useCallback((report: ReportSummary) => {
    setCurrentReport(report);
    setShowReportDetailModal(true);
  }, []);

  const handleCloseReportDetail = useCallback(() => {
    setCurrentReport(null);
    setShowReportDetailModal(false);
  }, []);

  const handlePenalizeFromReport = useCallback(async (report: ReportSummary, penaltyType: string, penaltyReason: string) => {
    if (!penaltyReason.trim()) {
      toast.error('请输入处罚原因');
      return;
    }
    setReportPenaltySaving(true);
    try {
      // 先解析被举报对象的实际用户 ID
      let targetUserId: string | undefined;
      if (report.targetType === 'user') {
        targetUserId = report.targetId;
      } else {
        const detailRes = await adminFetch<{ code: number; data?: { targetInfo?: { authorId?: string; ownerId?: string } } }>(
          `${API_BASE}/reports/${report.id}/detail`
        );
        if (detailRes.code === 200 && detailRes.data?.targetInfo) {
          targetUserId = detailRes.data.targetInfo.authorId
            || detailRes.data.targetInfo.ownerId
            || undefined;
        }
      }
      if (!targetUserId) {
        toast.error('无法获取被举报用户信息');
        return;
      }

      await adminFetch(`${API_BASE}/reports/${report.id}/handle`, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', note: `处罚用户: ${penaltyType} - ${penaltyReason}` }),
      });
      await adminFetch(`${API_BASE}/penalties`, {
        method: 'POST',
        body: JSON.stringify({
          userId: targetUserId,
          penaltyType: penaltyType,
          reason: `举报处理处罚: ${penaltyReason}`,
          expiresDays: 7,
        }),
      });
      handleCloseReportDetail();
      fetchReports();
      fetchPenalties();
    } catch (err) {
      toast.error((err as Error).message || '处罚失败');
    } finally {
      setReportPenaltySaving(false);
    }
  }, [fetchReports, fetchPenalties]);

  // ---- 公告 ----
  const handleOpenAnnouncementModal = useCallback((announcement?: Announcement | null) => {
    if (announcement) {
      setAnnouncementForm({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        isActive: announcement.isActive,
        isPinned: announcement.isPinned,
      });
    } else {
      setAnnouncementForm({ ...emptyAnnouncementForm, id: '' });
    }
    setShowAnnouncementModal(true);
  }, []);

  const handleAnnouncementSubmit = useCallback(async (formData?: AnnouncementFormData) => {
    const data = formData || announcementForm;
    if (!data.title.trim() || !data.content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    setAnnouncementSaving(true);
    try {
      if (data.id) {
        await adminFetch(`${API_BASE}/announcements/${data.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } else {
        await adminFetch(`${API_BASE}/announcements`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      setShowAnnouncementModal(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error((err as Error).message || '保存失败');
    } finally {
      setAnnouncementSaving(false);
    }
  }, [announcementForm, fetchAnnouncements]);

  const handleDeleteAnnouncement = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API_BASE}/announcements/${id}`, { method: 'DELETE' });
      fetchAnnouncements();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchAnnouncements]);

  const handleToggleAnnouncementActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      await adminFetch(`${API_BASE}/announcements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchAnnouncements();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    }
  }, [fetchAnnouncements]);

  // ---- 申诉 ----
  const handleOpenAppealModal = useCallback((appeal: Appeal) => {
    setCurrentAppeal(appeal);
    setAppealReply(appeal.adminReply || '');
    setShowAppealModal(true);
  }, []);

  const handleApproveAppeal = useCallback(async (appealId: string) => {
    setAppealProcessing(true);
    try {
      await adminFetch(`${API_BASE}/appeals/${appealId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve', reply: appealReply }),
      });
      setShowAppealModal(false);
      fetchAppeals();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setAppealProcessing(false);
    }
  }, [appealReply, fetchAppeals]);

  const handleRejectAppeal = useCallback(async (appealId: string) => {
    setAppealProcessing(true);
    try {
      await adminFetch(`${API_BASE}/appeals/${appealId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reject', reply: appealReply }),
      });
      setShowAppealModal(false);
      fetchAppeals();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setAppealProcessing(false);
    }
  }, [appealReply, fetchAppeals]);

  // ---- 处罚 ----
  const handlePenaltySubmit = useCallback(async () => {
    if (!penaltyForm.userId.trim() || !penaltyForm.reason.trim()) {
      toast.error('用户和原因不能为空');
      return;
    }
    setPenaltySaving(true);
    try {
      await adminFetch(`${API_BASE}/penalties`, {
        method: 'POST',
        body: JSON.stringify(penaltyForm),
      });
      setShowPenaltyModal(false);
      setPenaltyForm(emptyPenaltyForm);
      fetchPenalties();
    } catch (err) {
      toast.error((err as Error).message || '添加处罚失败');
    } finally {
      setPenaltySaving(false);
    }
  }, [penaltyForm, fetchPenalties]);

  const handleDeletePenalty = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API_BASE}/penalties/${id}`, { method: 'DELETE' });
      fetchPenalties();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchPenalties]);

  const handleOpenPenaltyDetail = useCallback((penalty: Penalty) => {
    setCurrentPenalty(penalty);
    setShowPenaltyDetailModal(true);
  }, []);

  const handleClosePenaltyDetail = useCallback(() => {
    setCurrentPenalty(null);
    setShowPenaltyDetailModal(false);
  }, []);

  const handleOpenRemovePenalty = useCallback((penalty: Penalty) => {
    setCurrentPenalty(penalty);
    setRemoveReason('');
    setShowRemovePenaltyModal(true);
  }, []);

  const handleCloseRemovePenalty = useCallback(() => {
    setCurrentPenalty(null);
    setRemoveReason('');
    setShowRemovePenaltyModal(false);
  }, []);

  const handleRemovePenaltySubmit = useCallback(async () => {
    if (!currentPenalty || !removeReason.trim()) {
      toast.error('请输入解除原因');
      return;
    }
    setRemoveSaving(true);
    try {
      await adminFetch(`${API_BASE}/penalties/${currentPenalty.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: removeReason }),
      });
      handleCloseRemovePenalty();
      fetchPenalties();
    } catch (err) {
      toast.error((err as Error).message || '解除处罚失败');
    } finally {
      setRemoveSaving(false);
    }
  }, [currentPenalty, removeReason, handleCloseRemovePenalty, fetchPenalties]);

  const handleBanUserFromPenalty = useCallback(async (userId: string) => {
    try {
      await adminFetch(`${API_BASE}/bans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason: '处罚管理中直接封禁' }),
      });
      toast.success('封禁成功');
      fetchPenalties();
    } catch (err) {
      toast.error((err as Error).message || '封禁失败');
    }
  }, [fetchPenalties]);

  // ---- 安全事件 ----
  const handleOpenSecurityModal = useCallback((event: SecurityEvent) => {
    setCurrentSecurityEvent(event);
    setShowSecurityModal(true);
  }, []);

  const handleResolveSecurityEvent = useCallback(async (eventId: string) => {
    setSecurityProcessing(true);
    try {
      await adminFetch(`${API_BASE}/security-events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resolve' }),
      });
      setShowSecurityModal(false);
      fetchSecurityEvents();
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setSecurityProcessing(false);
    }
  }, [fetchSecurityEvents]);

  // ---- IP 黑名单 ----
  const handleIpSubmit = useCallback(async () => {
    if (!ipForm.ipAddress.trim() || !ipForm.reason.trim()) {
      toast.error('IP 地址和原因不能为空');
      return;
    }
    setIpSaving(true);
    try {
      await adminFetch(`${API_BASE}/ip-blacklist`, {
        method: 'POST',
        body: JSON.stringify(ipForm),
      });
      setShowIpModal(false);
      setIpForm(emptyIpForm);
      fetchIpBlacklist();
    } catch (err) {
      toast.error((err as Error).message || '添加失败');
    } finally {
      setIpSaving(false);
    }
  }, [ipForm, fetchIpBlacklist]);

  const handleDeleteIp = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API_BASE}/ip-blacklist/${id}`, { method: 'DELETE' });
      fetchIpBlacklist();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchIpBlacklist]);

  // ---- 讨论管理 ----
  const handleDeleteDiscussion = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API_BASE}/discussions/${id}`, { method: 'DELETE' });
      fetchDiscussions();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchDiscussions]);

  const handleRestoreDiscussion = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API_BASE}/discussions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      fetchDiscussions();
    } catch (err) {
      toast.error((err as Error).message || '恢复失败');
    }
  }, [fetchDiscussions]);

  // ---- 通知管理 ----
  const handleSendNotification = useCallback(async (overrideData?: { title: string; content: string; type: string; targetRoles?: string[]; targetUserIds?: string[] }) => {
    const title = overrideData?.title || sendTitle;
    const content = overrideData?.content || sendContent;
    const type = overrideData?.type || sendType;
    if (!title?.trim() || !content?.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    setSending(true);
    try {
      await adminFetch(`${API_BASE}/notifications/send`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          type,
          targetRoles: overrideData?.targetRoles,
          targetUserIds: overrideData?.targetUserIds,
          linkUrl: sendLinkUrl || undefined,
        }),
      });
      toast.success('通知发送成功');
      setSendTitle('');
      setSendContent('');
      setSendLinkUrl('');
    } catch (err) {
      toast.error((err as Error).message || '发送失败');
    } finally {
      setSending(false);
    }
  }, [sendTitle, sendContent, sendType, sendLinkUrl]);

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await adminFetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE' });
      fetchNotifications();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    }
  }, [fetchNotifications]);

  // ---- 封禁管理 ----
  const handleOpenBanModal = useCallback(() => {
    setBanForm({ userId: '', reason: '', banType: 'permanent', expiresAt: '' });
    setShowBanModal(true);
  }, []);

  const handleCloseBanModal = useCallback(() => {
    setShowBanModal(false);
    setBanForm({ userId: '', reason: '', banType: 'permanent', expiresAt: '' });
  }, []);

  const handleBanSubmit = useCallback(async () => {
    if (!banForm.userId.trim() || !banForm.reason.trim()) {
      toast.error('用户 ID 和原因不能为空');
      return;
    }
    setBanSaving(true);
    try {
      await adminFetch(`${API_BASE}/bans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banForm),
      });
      handleCloseBanModal();
      fetchBans();
    } catch (err) {
      toast.error((err as Error).message || '封禁失败');
    } finally {
      setBanSaving(false);
    }
  }, [banForm, handleCloseBanModal, fetchBans]);

  const handleOpenUnbanModal = useCallback((record: BanRecord) => {
    setUnbanBanRecord(record);
    setUnbanReason('');
    setShowUnbanModal(true);
  }, []);

  const handleCloseUnbanModal = useCallback(() => {
    setShowUnbanModal(false);
    setUnbanBanRecord(null);
    setUnbanReason('');
  }, []);

  const handleUnbanSubmit = useCallback(async () => {
    if (!unbanBanRecord || !unbanReason.trim()) {
      toast.error('解除原因不能为空');
      return;
    }
    setUnbanSaving(true);
    try {
      await adminFetch(`${API_BASE}/bans/${unbanBanRecord.id}/unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: unbanReason }),
      });
      handleCloseUnbanModal();
      fetchBans();
    } catch (err) {
      toast.error((err as Error).message || '解除封禁失败');
    } finally {
      setUnbanSaving(false);
    }
  }, [unbanBanRecord, unbanReason, handleCloseUnbanModal, fetchBans]);

  const handleOpenDeleteBanModal = useCallback((record: BanRecord) => {
    setDeleteBanRecord(record);
    setShowDeleteBanModal(true);
  }, []);

  const handleCloseDeleteBanModal = useCallback(() => {
    setShowDeleteBanModal(false);
    setDeleteBanRecord(null);
  }, []);

  const handleDeleteBanSubmit = useCallback(async () => {
    if (!deleteBanRecord) return;
    setDeleteBanSaving(true);
    try {
      await adminFetch(`${API_BASE}/bans/${deleteBanRecord.id}`, { method: 'DELETE' });
      handleCloseDeleteBanModal();
      fetchBans();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    } finally {
      setDeleteBanSaving(false);
    }
  }, [deleteBanRecord, handleCloseDeleteBanModal, fetchBans]);

  // ---- 备份管理 ----
  const handleOpenBackupModal = useCallback(() => {
    setBackupForm({ compress: true, retainDays: 30 });
    setShowBackupModal(true);
  }, []);

  const handleCloseBackupModal = useCallback(() => {
    setShowBackupModal(false);
  }, []);

  const handleCreateBackup = useCallback(async () => {
    setBackupCreating(true);
    try {
      await adminFetch(`${API_BASE}/backup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupForm),
      });
      handleCloseBackupModal();
      fetchBackupFiles();
      toast.success('备份任务已启动');
    } catch (err) {
      toast.error((err as Error).message || '备份失败');
    } finally {
      setBackupCreating(false);
    }
  }, [backupForm, handleCloseBackupModal, fetchBackupFiles]);

  const handleOpenDeleteBackupModal = useCallback((file: BackupFile) => {
    setDeleteBackupFile(file);
    setShowDeleteBackupModal(true);
  }, []);

  const handleCloseDeleteBackupModal = useCallback(() => {
    setShowDeleteBackupModal(false);
    setDeleteBackupFile(null);
  }, []);

  const handleDeleteBackupSubmit = useCallback(async () => {
    if (!deleteBackupFile) return;
    setDeleteBackupSaving(true);
    try {
      await adminFetch(`${API_BASE}/backup/${deleteBackupFile.filename}`, { method: 'DELETE' });
      handleCloseDeleteBackupModal();
      fetchBackupFiles();
    } catch (err) {
      toast.error((err as Error).message || '删除失败');
    } finally {
      setDeleteBackupSaving(false);
    }
  }, [deleteBackupFile, handleCloseDeleteBackupModal, fetchBackupFiles]);

  // ============================================================
  // 返回所有状态和方法
  // ============================================================

  return {
    // 导航 & 权限
    userRole, setUserRole,
    loadingRole, setLoadingRole,

    // 仪表盘
    dashboardData, setDashboardData,
    dashboardLoading, setDashboardLoading,

    // 用户
    users, setUsers,
    usersTotal, setUsersTotal,
    usersPage, setUsersPage,
    usersSearch, setUsersSearch,
    usersLoading, setUsersLoading,
    selectedUsers, setSelectedUsers,
    userContextMenu, setUserContextMenu,
    userPenaltyForm, setUserPenaltyForm,
    userFilters, setUserFilters,
    selectedUserDetail, setSelectedUserDetail,

    // 仓库
    repos, setRepos,
    reposTotal, setReposTotal,
    reposPage, setReposPage,
    reposSearch, setReposSearch,
    reposLoading, setReposLoading,
    selectedRepos, setSelectedRepos,
    repoContextMenu, setRepoContextMenu,
    selectedRepoDetail, setSelectedRepoDetail,

    // 举报
    reports, setReports,
    reportsTotal, setReportsTotal,
    reportsPage, setReportsPage,
    reportsLoading, setReportsLoading,
    selectedReports, setSelectedReports,
    reportContextMenu, setReportContextMenu,
    showReportModal, setShowReportModal,
    reportAction, setReportAction,
    reportNote, setReportNote,
    currentReportId, setCurrentReportId,
    isHandlingReport, setIsHandlingReport,
    currentReport, setCurrentReport,
    showReportDetailModal, setShowReportDetailModal,
    reportPenaltyType, setReportPenaltyType,
    reportPenaltyReason, setReportPenaltyReason,
    reportPenaltySaving, setReportPenaltySaving,
    // 增强组件需要的举报状态
    selectedReportDetail, setSelectedReportDetail,
    reportDetailLoading, setReportDetailLoading,
    reportStats, setReportStats,
    reportStatsLoading, setReportStatsLoading,
    // 增强组件需要的方法
    fetchReportDetail,
    fetchReportStats,

    // 用户详情获取
    fetchUserDetail,

    // 审计日志
    auditLogs, setAuditLogs,
    auditLogsTotal, setAuditLogsTotal,
    auditLogsPage, setAuditLogsPage,
    auditLogsLoading, setAuditLogsLoading,

    // 公告
    announcements, setAnnouncements,
    announcementsTotal, setAnnouncementsTotal,
    announcementsPage, setAnnouncementsPage,
    announcementsLoading, setAnnouncementsLoading,
    announcementStats,
    showAnnouncementModal, setShowAnnouncementModal,
    announcementForm, setAnnouncementForm,
    announcementSaving, setAnnouncementSaving,

    // 申诉
    appeals, setAppeals,
    appealsTotal, setAppealsTotal,
    appealsPage, setAppealsPage,
    appealsStatus, setAppealsStatus,
    appealsLoading, setAppealsLoading,
    selectedAppeals, setSelectedAppeals,
    appealContextMenu, setAppealContextMenu,
    showAppealModal, setShowAppealModal,
    currentAppeal, setCurrentAppeal,
    appealReply, setAppealReply,
    appealProcessing, setAppealProcessing,
    selectedAppealDetail, setSelectedAppealDetail,

    // 处罚
    penalties, setPenalties,
    penaltiesTotal, setPenaltiesTotal,
    penaltiesPage, setPenaltiesPage,
    penaltiesSearch, setPenaltiesSearch,
    penaltiesType, setPenaltiesType,
    penaltiesStatus, setPenaltiesStatus,
    penaltiesLoading, setPenaltiesLoading,
    selectedPenalties, setSelectedPenalties,
    penaltyContextMenu, setPenaltyContextMenu,
    showPenaltyModal, setShowPenaltyModal,
    penaltyTemplates, setPenaltyTemplates,
    penaltyForm, setPenaltyForm,
    penaltySaving, setPenaltySaving,
    currentPenalty, setCurrentPenalty,
    showPenaltyDetailModal, setShowPenaltyDetailModal,
    showRemovePenaltyModal, setShowRemovePenaltyModal,
    removeReason, setRemoveReason,
    removeSaving, setRemoveSaving,

    // 安全事件
    securityEvents, setSecurityEvents,
    securityTotal, setSecurityTotal,
    securityPage, setSecurityPage,
    securitySeverity, setSecuritySeverity,
    securityStatus, setSecurityStatus,
    securityLoading, setSecurityLoading,
    selectedSecurityEvents, setSelectedSecurityEvents,
    securityContextMenu, setSecurityContextMenu,
    showSecurityModal, setShowSecurityModal,
    currentSecurityEvent, setCurrentSecurityEvent,
    securityProcessing, setSecurityProcessing,
    securityStats, setSecurityStats,
    selectedSecurityEventDetail, setSelectedSecurityEventDetail,

    // IP 黑名单
    ipBlacklist, setIpBlacklist,
    ipBlacklistTotal, setIpBlacklistTotal,
    ipBlacklistPage, setIpBlacklistPage,
    ipBlacklistSearch, setIpBlacklistSearch,
    ipBlacklistLoading, setIpBlacklistLoading,
    showIpModal, setShowIpModal,
    ipForm, setIpForm,
    ipSaving, setIpSaving,
    selectedIpDetail, setSelectedIpDetail,
    ipAccessStats, setIpAccessStats,

    // 讨论管理
    adminDiscussions, setAdminDiscussions,
    discussionsTotal, setDiscussionsTotal,
    discussionsPage, setDiscussionsPage,
    discussionsLoading, setDiscussionsLoading,
    discussionsSearch, setDiscussionsSearch,
    discussionsCategory, setDiscussionsCategory,
    discussionsStatus, setDiscussionsStatus,
    selectedDiscussions, setSelectedDiscussions,
    discussionContextMenu, setDiscussionContextMenu,
    selectedDiscussionDetail, setSelectedDiscussionDetail,

    // 通知管理
    notifications, setNotifications,
    notificationsTotal, setNotificationsTotal,
    notificationsPage, setNotificationsPage,
    notificationsLoading, setNotificationsLoading,
    sendTitle, setSendTitle,
    sendContent, setSendContent,
    sendType, setSendType,
    sendLinkUrl, setSendLinkUrl,
    sending, setSending,

    // 封禁管理
    bans, setBans,
    bansTotal, setBansTotal,
    bansPage, setBansPage,
    bansSearch, setBansSearch,
    bansStatus, setBansStatus,
    bansLoading, setBansLoading,
    showBanModal, setShowBanModal,
    banForm, setBanForm,
    banSaving, setBanSaving,
    showUnbanModal, setShowUnbanModal,
    unbanBanRecord, setUnbanBanRecord,
    unbanReason, setUnbanReason,
    unbanSaving, setUnbanSaving,
    showDeleteBanModal, setShowDeleteBanModal,
    deleteBanRecord, setDeleteBanRecord,
    deleteBanSaving, setDeleteBanSaving,

    // 活动日志
    activityLogs, setActivityLogs,
    activityLogsTotal, setActivityLogsTotal,
    activityLogsPage, setActivityLogsPage,
    activityLogsSearch, setActivityLogsSearch,
    activityLogsAction, setActivityLogsAction,
    activityLogsStatus, setActivityLogsStatus,
    activityLogsLoading, setActivityLogsLoading,
    activityLogStats, setActivityLogStats,

    // 备份管理
    backupFiles, setBackupFiles,
    backupLoading, setBackupLoading,
    backupCreating, setBackupCreating,
    backupStats, setBackupStats,
    showBackupModal, setShowBackupModal,
    backupForm, setBackupForm,
    showDeleteBackupModal, setShowDeleteBackupModal,
    deleteBackupFile, setDeleteBackupFile,
    deleteBackupSaving, setDeleteBackupSaving,

    // 数据获取函数
    fetchDashboard,
    fetchUsers,
    fetchRepos,
    fetchReports,
    fetchAuditLogs,
    fetchAnnouncements,
    fetchAppeals,
    fetchPenalties,
    fetchSecurityEvents,
    fetchIpBlacklist,
    fetchDiscussions,
    fetchBans,
    fetchActivityLogs,
    fetchBackupFiles,
    fetchNotifications,

    // 操作处理函数
    handleDeleteUser,
    handleDeleteSelectedUsers,
    handleBanUser,
    handleMuteUser,
    handleLimitRepoUser,
    handleLimitStorageUser,
    handleDeleteRepo,
    handleDeleteSelectedRepos,
    handleOpenReportModal,
    handleReportSubmit,
    handleOpenReportDetail,
    handleCloseReportDetail,
    handlePenalizeFromReport,
    handleOpenAnnouncementModal,
    handleAnnouncementSubmit,
    handleDeleteAnnouncement,
    handleToggleAnnouncementActive,
    handleOpenAppealModal,
    handleApproveAppeal,
    handleRejectAppeal,
    handlePenaltySubmit,
    handleDeletePenalty,
    handleOpenPenaltyDetail,
    handleClosePenaltyDetail,
    handleOpenRemovePenalty,
    handleCloseRemovePenalty,
    handleRemovePenaltySubmit,
    handleBanUserFromPenalty,
    handleOpenSecurityModal,
    handleResolveSecurityEvent,
    handleIpSubmit,
    handleDeleteIp,
    handleDeleteDiscussion,
    handleRestoreDiscussion,
    handleSendNotification,
    handleDeleteNotification,
    handleOpenBanModal,
    handleCloseBanModal,
    handleBanSubmit,
    handleOpenUnbanModal,
    handleCloseUnbanModal,
    handleUnbanSubmit,
    handleOpenDeleteBanModal,
    handleCloseDeleteBanModal,
    handleDeleteBanSubmit,
    handleOpenBackupModal,
    handleCloseBackupModal,
    handleCreateBackup,
    handleOpenDeleteBackupModal,
    handleCloseDeleteBackupModal,
    handleDeleteBackupSubmit,

    // 辅助函数
    emptyPenaltyForm,
    emptyAnnouncementForm,
    emptyIpForm,
  };
}
