// ============================================
// Shared Type Definitions
// ============================================

// User type (used in Auth Context)
export interface User {
  id: string;
  uid?: string | null;
  username: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
  role: string;
  isBanned?: boolean;
  mfaEnabled?: boolean;
  location?: string | null;
  website?: string | null;
  createdAt: string | Date;
}

// User related types
export interface UserSummary {
  id: string;
  uid?: string | null;
  username: string;
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: string;
  isBanned?: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  createdAt: string | Date;
  stats?: {
    reposCount: number;
    starsCount: number;
    followersCount: number;
    followingCount: number;
  };
}

// Repository related types
export interface RepositorySummary {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername: string;
  ownerName?: string | null;
  ownerAvatar?: string | null;
  description?: string | null;
  visibility: 'public' | 'private';
  starCount?: number;
  forkCount?: number;
  starsCount: number;
  forksCount: number;
  watchersCount: number;
  language?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

// Discussion related types
export interface DiscussionSummary {
  id: string;
  title: string;
  content: string;
  category: 'question' | 'idea' | 'share' | 'discussion' | 'announcement';
  authorId: string;
  authorUsername: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  repositoryId?: string | null;
  repositoryName?: string | null;
  repositoryOwnerUsername?: string | null;
  commentsCount: number;
  viewsCount: number;
  viewCount?: number;
  isPinned?: boolean;
  isLocked?: boolean;
  status?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface DiscussionComment {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  isAccepted: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Report related types
export interface ReportSummary {
  id: string;
  targetType: 'discussion' | 'comment' | 'repository' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'handled' | 'dismissed';
  reporterId?: string | null;
  reporter?: UserSummary | null;
  reporterUsername?: string | null;
  handlerId?: string | null;
  handlerUsername?: string | null;
  handlerNote?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Audit log related types
export interface AuditLogEntry {
  id: string;
  action: string;
  actionType?: string;
  actionLabel?: string;
  targetType: string;
  targetId?: string | null;
  targetName?: string | null;
  adminId: string;
  adminUsername: string;
  details?: Record<string, unknown> | null;
  detailsText?: string;
  ip?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
}

// Dashboard statistics
export interface DashboardStats {
  totalUsers: number;
  totalRepos: number;
  totalDiscussions: number;
  totalStars: number;
  newUsersToday: number;
  newReposToday: number;
  newDiscussionsToday: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'user_registered' | 'repo_created' | 'discussion_created' | 'star_given' | 'comment_added';
  userId: string;
  userUsername: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  createdAt: string | Date;
}

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// Prisma where clause helpers
export type WhereClause = Record<string, unknown>;
export type OrderByClause = Record<string, 'asc' | 'desc'>;
