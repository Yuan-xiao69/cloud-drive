/**
 * 文件版本监听器 — 处理 create_version 异步任务
 *
 * 当文件内容变更时，创建 FileVersion 快照记录。
 * FileVersion 模型依赖 fileId 字段（关联 RepoItem），
 * 如果未提供 fileId 则跳过并记录警告。
 */

import { prisma } from '@/lib/prisma'

/** 文件版本任务负载类型 */
interface CreateVersionPayload {
  /** 仓库 ID（用于日志记录，非直接写入 FileVersion） */
  repoId: string
  /** 文件记录 ID（必填，关联 RepoItem） */
  fileId?: string
  /** 分支 ID（可选，用于上下文追溯） */
  branchId?: string
  /** 版本说明 */
  description?: string
  /** 存储路径（MinIO 中的版本快照路径） */
  storagePath?: string
  /** 文件哈希 */
  fileHash?: string
  /** 文件大小（字节） */
  fileSize?: number
}

/**
 * 处理创建文件版本任务。
 * 不抛出错误——所有异常内部捕获并记录日志。
 */
export async function handleCreateVersion(
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const p = payload as unknown as CreateVersionPayload

    // fileId 是 FileVersion 模型的必填关联字段
    if (!p.fileId) {
      console.warn(
        '[FileVersion Listener] 缺少 fileId，无法创建版本快照。',
        `repoId=${p.repoId}，跳过`,
      )
      return
    }

    // 校验文件是否存在于该仓库中
    const file = await prisma.repoItem.findFirst({
      where: {
        id: p.fileId,
        repoId: p.repoId,
        type: { not: 'folder' },
        isDeleted: false,
      },
      select: { id: true },
    })

    if (!file) {
      console.warn(
        `[FileVersion Listener] 文件不存在或已删除: fileId=${p.fileId}`,
      )
      return
    }

    // 查询当前最大版本号，自增生成新版本号
    const latestVersion = await prisma.fileVersion.findFirst({
      where: { fileId: p.fileId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const nextVersion = (latestVersion?.version ?? 0) + 1

    await prisma.fileVersion.create({
      data: {
        fileId: p.fileId,
        version: nextVersion,
        storagePath: p.storagePath || null,
        fileHash: p.fileHash || null,
        fileSize: p.fileSize != null ? BigInt(p.fileSize) : BigInt(0),
        message: p.description || `版本 ${nextVersion}`,
      },
    })

    console.log(
      `[FileVersion Listener] 版本快照已创建: fileId=${p.fileId}, version=${nextVersion}`,
    )
  } catch (error) {
    console.error('[FileVersion Listener] 创建文件版本失败:', {
      fileId: payload.fileId,
      repoId: payload.repoId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
