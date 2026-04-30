/**
 * 用户操作日志工具
 * 记录所有用户的关键操作：上传、下载、删除、创建等
 */

import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

// 操作类型枚举
export type ActivityAction =
  | 'upload'           // 上传文件
  | 'download'        // 下载文件
  | 'delete'           // 删除文件
  | 'create_folder'    // 创建文件夹
  | 'create_repo'      // 创建仓库
  | 'delete_repo'      // 删除仓库
  | 'fork_repo'        // Fork 仓库
  | 'update_repo'      // 更新仓库
  | 'archive_repo'     // 归档仓库
  | 'unarchive_repo'   // 取消归档仓库
  | 'lock_repo'        // 锁定仓库
  | 'unlock_repo'      // 解锁仓库
  | 'transfer_repo'    // 转移仓库
  | 'copy'            // 复制文件/文件夹
  | 'restore'         // 恢复文件/文件夹
  | 'restore_version'  // 恢复文件版本
  | 'star'             // 收藏
  | 'unstar'           // 取消收藏
  | 'watch'            // 关注
  | 'unwatch'          // 取消关注
  | 'create_discussion' // 创建讨论
  | 'delete_discussion' // 删除讨论
  | 'reply_discussion'  // 回复讨论
  | 'comment_discussion' // 评论讨论
  | 'create_comment'   // 创建评论
  | 'delete_comment'   // 删除评论
  | 'accept_comment'   // 采纳评论
  | 'create_issue'     // 创建 Issue
  | 'close_issue'      // 关闭 Issue
  | 'create_pr'        // 创建 Pull Request
  | 'merge_pr'         // 合并 PR
  | 'close_pr'         // 关闭 PR
  | 'update_profile'   // 更新资料
  | 'change_password'  // 修改密码
  | 'login'            // 登录
  | 'logout'           // 登出
  | 'register'         // 注册
  | 'delete_account'   // 删除账号
  | 'ban_user'         // 封禁用户
  | 'unban_user'       // 解封用户
  | 'change_role'      // 修改角色
  | 'report'           // 举报
  | 'handle_report'    // 处理举报
  | 'mark_read'        // 标记已读
  | 'export_data'      // 导出数据
  | 'move'             // 移动文件/文件夹
  | 'rename'           // 重命名文件/文件夹
  ;

// 目标类型枚举
export type TargetType =
  | 'file'
  | 'folder'
  | 'repo'
  | 'discussion'
  | 'discussion_comment'
  | 'issue'
  | 'issue_comment'
  | 'pullrequest'
  | 'pr_comment'
  | 'user'
  | 'report'
  | 'system'
  ;

// 获取客户端 IP
export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

// 获取 User-Agent
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined;
}

/**
 * 记录用户操作日志
 */
export async function logActivity(params: {
  userId: string;
  action: ActivityAction;
  targetType: TargetType;
  targetId: string;
  targetName?: string;
  details?: Record<string, unknown>;
  req?: Request;
  fileSize?: number;
  status?: 'success' | 'failed';
  errorMsg?: string;
}): Promise<void> {
  try {
    const { userId, action, targetType, targetId, targetName, details, req, fileSize, status = 'success', errorMsg } = params;

    await prisma.userActivityLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        targetName: targetName || null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress: req ? getClientIP(req) : null,
        userAgent: req ? getUserAgent(req) : undefined,
        fileSize: fileSize ? BigInt(fileSize) : null,
        status,
        errorMsg: errorMsg || null,
      },
    });
  } catch (error) {
    // 日志记录失败不影响主流程，只打印警告
    console.warn('[ActivityLog] Failed to log activity:', error);
  }
}

/**
 * 便捷方法：记录文件上传
 */
export async function logUpload(params: {
  userId: string;
  repoId: string;
  repoName: string;
  fileName: string;
  fileSize: number;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'upload',
    targetType: 'file',
    targetId: params.repoId,
    targetName: `${params.repoName}/${params.fileName}`,
    details: { fileName: params.fileName },
    req: params.req,
    fileSize: params.fileSize,
  });
}

/**
 * 便捷方法：记录文件下载
 */
export async function logDownload(params: {
  userId: string;
  repoId: string;
  repoName: string;
  fileName: string;
  fileSize: number;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'download',
    targetType: 'file',
    targetId: params.repoId,
    targetName: `${params.repoName}/${params.fileName}`,
    details: { fileName: params.fileName },
    req: params.req,
    fileSize: params.fileSize,
  });
}

/**
 * 便捷方法：记录文件/文件夹删除
 */
export async function logDelete(params: {
  userId: string;
  repoId: string;
  repoName: string;
  itemName: string;
  itemType: 'file' | 'folder';
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'delete',
    targetType: params.itemType,
    targetId: params.repoId,
    targetName: `${params.repoName}/${params.itemName}`,
    details: { itemName: params.itemName, itemType: params.itemType },
    req: params.req,
  });
}

/**
 * 便捷方法：记录仓库创建
 */
export async function logCreateRepo(params: {
  userId: string;
  repoId: string;
  repoName: string;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'create_repo',
    targetType: 'repo',
    targetId: params.repoId,
    targetName: params.repoName,
    details: { repoName: params.repoName },
    req: params.req,
  });
}

/**
 * 便捷方法：记录仓库删除
 */
export async function logDeleteRepo(params: {
  userId: string;
  repoId: string;
  repoName: string;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'delete_repo',
    targetType: 'repo',
    targetId: params.repoId,
    targetName: params.repoName,
    details: { repoName: params.repoName },
    req: params.req,
  });
}

/**
 * 便捷方法：记录讨论创建
 */
export async function logCreateDiscussion(params: {
  userId: string;
  discussionId: string;
  discussionTitle: string;
  category: string;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'create_discussion',
    targetType: 'discussion',
    targetId: params.discussionId,
    targetName: params.discussionTitle,
    details: { title: params.discussionTitle, category: params.category },
    req: params.req,
  });
}

/**
 * 便捷方法：记录评论创建
 */
export async function logCreateComment(params: {
  userId: string;
  discussionId: string;
  discussionTitle: string;
  commentId: string;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'create_comment',
    targetType: 'discussion_comment',
    targetId: params.commentId,
    targetName: params.discussionTitle,
    details: { discussionId: params.discussionId, discussionTitle: params.discussionTitle },
    req: params.req,
  });
}

/**
 * 便捷方法：记录 Fork
 */
export async function logFork(params: {
  userId: string;
  sourceRepoId: string;
  sourceRepoName: string;
  targetRepoId: string;
  targetRepoName: string;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'fork_repo',
    targetType: 'repo',
    targetId: params.targetRepoId,
    targetName: params.targetRepoName,
    details: {
      sourceRepo: params.sourceRepoName,
      targetRepo: params.targetRepoName,
    },
    req: params.req,
  });
}

/**
 * 便捷方法：记录 Star 操作
 */
export async function logStar(params: {
  userId: string;
  repoId: string;
  repoName: string;
  action: 'star' | 'unstar';
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: params.action,
    targetType: 'repo',
    targetId: params.repoId,
    targetName: params.repoName,
    details: { repoName: params.repoName },
    req: params.req,
  });
}

/**
 * 便捷方法：记录举报
 */
export async function logReport(params: {
  userId: string;
  targetType: string;
  targetId: string;
  reason: string;
  req: Request;
}): Promise<void> {
  await logActivity({
    userId: params.userId,
    action: 'report',
    targetType: params.targetType as TargetType,
    targetId: params.targetId,
    details: { reason: params.reason },
    req: params.req,
  });
}

// 别名导出（兼容旧代码引用）
export const recordActivityLog = logActivity;
export const record_activity_log = logActivity;
