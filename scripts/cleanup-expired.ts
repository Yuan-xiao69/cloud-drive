/**
 * 清理过期数据的定时任务脚本
 *
 * 清理范围:
 *   1. 过期文件分块（1 小时前的 RepoFileChunk）
 *   2. 过期用户处罚（停用 isActive）
 *   3. 30 天前的已读通知
 *   4. 7 天前的失败异步任务
 *
 * 运行方式:
 *   npx ts-node scripts/cleanup-expired.ts
 *   或通过 package.json: npm run cleanup:expired
 *
 * 建议通过 cron 定时执行（如每小时一次）。
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup(): Promise<void> {
  // 1. 清理过期 RepoFileChunk（1 小时前）
  // 分片上传临时数据，expiresAt 过后应被清除
  const deletedChunks = await prisma.repoFileChunk.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  console.log(`[清理] 过期文件分块: ${deletedChunks.count} 条`)

  // 2. 停用过期 UserPenalty
  // 处罚到期后不应自动删除，而是标记为 isActive=false 以保留记录
  const now = new Date()
  const expiredPenalties = await prisma.userPenalty.updateMany({
    where: {
      expiresAt: { lt: now },
      isActive: true,
    },
    data: { isActive: false },
  })
  console.log(`[清理] 停用过期处罚: ${expiredPenalties.count} 条`)

  // 3. 清理 30 天前已读通知
  // 已读通知保留 30 天后自动清理以节省存储
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const deletedNotifications = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: { lt: thirtyDaysAgo },
    },
  })
  console.log(`[清理] 已读通知(30天前): ${deletedNotifications.count} 条`)

  // 4. 清理 7 天前的失败异步任务
  // 失败任务保留 7 天用于排查，过期后清理
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const deletedJobs = await prisma.asyncJob.deleteMany({
    where: {
      status: 'failed',
      createdAt: { lt: sevenDaysAgo },
    },
  })
  console.log(`[清理] 失败异步任务(7天前): ${deletedJobs.count} 条`)

  console.log('[清理] 全部清理完成')
}

cleanup()
  .then(() => {
    console.log('[清理] 脚本成功退出')
    process.exit(0)
  })
  .catch((e: unknown) => {
    console.error('[清理] 脚本失败:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
