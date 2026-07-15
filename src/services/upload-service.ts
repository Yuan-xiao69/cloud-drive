/**
 * 分片上传服务 — 分片数据存储在 MinIO 而非数据库
 *
 * 设计要点：
 * - 分片数据以二进制形式存入 MinIO（路径：chunks/{uploadId}/{chunkIndex}）
 * - 数据库 RepoFileChunk 仅保存元数据（chunkIndex、status、chunkHash 等）
 * - 完成上传时从 MinIO 读取所有分片、合并、上传最终文件、清理分片
 *
 * 流程：
 * 1. init（路由层）：创建 RepoItem + RepoFileChunk 元数据记录
 * 2. uploadChunk：接收二进制分片 → 存入 MinIO → 更新分片状态
 * 3. completeUpload：从 MinIO 读取分片 → 合并 → 上传到最终存储路径 → 清理
 * 4. cancelUpload：删除 MinIO 分片 + 清理数据库记录
 */

import { prisma } from '@/lib/prisma'
import { putFile, getFile, deleteFile, chunkKey, repoFileKey } from '@/lib/storage'

/** 上传分片返回结果 */
export interface ChunkResult {
  chunkIndex: number
  uploaded: boolean
  pendingChunks: number
  completed: boolean
}

/** 完成上传返回的文件信息 */
export interface CompletedFile {
  id: string
  name: string
  size: string
  path: string | null
}

export class UploadService {
  /**
   * 上传单个分片到 MinIO。
   *
   * @param uploadId - 上传会话 ID
   * @param chunkIndex - 分片序号（从 0 开始）
   * @param chunkData - 分片二进制数据
   * @param chunkHash - 分片 SHA-256 哈希（可选）
   * @returns 剩余分片数和是否全部完成
   */
  static async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunkData: Buffer,
    chunkHash?: string,
  ): Promise<ChunkResult> {
    // 查找分片记录，确认会话有效
    const chunk = await prisma.repoFileChunk.findFirst({
      where: { uploadId, chunkIndex },
    })

    if (!chunk) {
      throw new Error('分片不存在或上传已过期')
    }

    // 存入 MinIO：chunks/{uploadId}/{chunkIndex}
    const key = chunkKey(uploadId, chunkIndex)
    await putFile(key, chunkData, 'application/octet-stream')

    // 更新数据库元数据（不存储 chunkData）
    await prisma.repoFileChunk.update({
      where: { id: chunk.id },
      data: {
        status: 'completed',
        chunkHash: chunkHash || '',
      },
    })

    // 检查剩余待上传分片
    const pendingChunks = await prisma.repoFileChunk.count({
      where: { uploadId, status: 'pending' },
    })

    return {
      chunkIndex,
      uploaded: true,
      pendingChunks,
      completed: pendingChunks === 0,
    }
  }

  /**
   * 完成上传：合并 MinIO 中的所有分片 → 上传最终文件 → 清理临时分片。
   *
   * 合并策略：按 chunkIndex 升序从 MinIO 逐片读取 Buffer，使用 Buffer.concat 合并。
   * 适用于中小文件（< 500MB），超大文件可按流式优化。
   *
   * @param uploadId - 上传会话 ID
   * @returns 已创建的文件信息
   */
  static async completeUpload(uploadId: string): Promise<CompletedFile> {
    // 查找分片元数据（通过第一个分片获取文件信息）
    const firstChunk = await prisma.repoFileChunk.findFirst({
      where: { uploadId },
      select: {
        repoId: true,
        branchId: true,
        fileName: true,
        totalSize: true,
        mimeType: true,
        parentPath: true,
      },
    })

    if (!firstChunk) {
      throw new Error('上传会话不存在')
    }

    // 查找文件记录
    const fileRecord = await prisma.repoItem.findFirst({
      where: {
        repoId: firstChunk.repoId,
        branchId: firstChunk.branchId,
        name: firstChunk.fileName,
        isDeleted: false,
      },
    })

    if (!fileRecord) {
      throw new Error('文件不存在')
    }

    // 校验：所有分片是否已上传完成
    const pendingCount = await prisma.repoFileChunk.count({
      where: { uploadId, status: 'pending' },
    })

    if (pendingCount > 0) {
      throw new Error(`还有 ${pendingCount} 个分片未上传`)
    }

    // 获取所有分片（按序号排序）
    const allChunks = await prisma.repoFileChunk.findMany({
      where: { uploadId },
      orderBy: { chunkIndex: 'asc' },
      select: { chunkIndex: true },
    })

    // 从 MinIO 逐片读取二进制数据并合并
    const buffers: Buffer[] = []
    for (const c of allChunks) {
      const data = await getFile(chunkKey(uploadId, c.chunkIndex))
      if (!data) {
        throw new Error(`分片 ${c.chunkIndex} 在 MinIO 中不存在`)
      }
      buffers.push(data)
    }

    // 合并所有分片
    const mergedContent = Buffer.concat(buffers)

    // 上传合并后的文件到最终存储路径
    const finalKey = repoFileKey(
      firstChunk.repoId,
      firstChunk.branchId!,
      fileRecord.id,
    )
    const mimeType = firstChunk.mimeType || 'application/octet-stream'
    await putFile(finalKey, mergedContent, mimeType)

    // 更新数据库：记录最终存储路径
    await prisma.repoItem.update({
      where: { id: fileRecord.id },
      data: { storagePath: finalKey },
    })

    // 清理 MinIO 中的临时分片
    for (const c of allChunks) {
      try {
        await deleteFile(chunkKey(uploadId, c.chunkIndex))
      } catch {
        // 删除失败不阻塞流程，MinIO 可配置生命周期自动清理
      }
    }

    // 清理数据库中的分片元数据
    await prisma.repoFileChunk.deleteMany({ where: { uploadId } })

    return {
      id: fileRecord.id,
      name: fileRecord.name,
      size: fileRecord.fileSize.toString(),
      path: fileRecord.path,
    }
  }

  /**
   * 取消上传：删除 MinIO 中的临时分片 + 数据库中的分片和文件记录。
   *
   * @param uploadId - 上传会话 ID
   */
  static async cancelUpload(uploadId: string): Promise<void> {
    // 查找分片元数据
    const firstChunk = await prisma.repoFileChunk.findFirst({
      where: { uploadId },
      select: {
        repoId: true,
        branchId: true,
        fileName: true,
      },
    })

    // 获取所有分片记录
    const allChunks = await prisma.repoFileChunk.findMany({
      where: { uploadId },
      select: { chunkIndex: true },
    })

    // 清理 MinIO 临时分片
    for (const c of allChunks) {
      try {
        await deleteFile(chunkKey(uploadId, c.chunkIndex))
      } catch {
        // 文件可能已被清理，忽略
      }
    }

    // 删除文件记录
    if (firstChunk) {
      await prisma.repoItem.deleteMany({
        where: {
          repoId: firstChunk.repoId,
          branchId: firstChunk.branchId,
          name: firstChunk.fileName,
          isDeleted: false,
        },
      })
    }

    // 删除分片元数据
    await prisma.repoFileChunk.deleteMany({ where: { uploadId } })
  }

  /**
   * 查询上传状态。
   *
   * @param uploadId - 上传会话 ID
   * @returns 分片列表及完成状态
   */
  static async getUploadStatus(uploadId: string): Promise<{
    uploadId: string
    totalChunks: number
    uploadedChunks: number
    completed: boolean
    chunks: { index: number; uploaded: boolean }[]
  }> {
    const chunks = await prisma.repoFileChunk.findMany({
      where: { uploadId },
      orderBy: { chunkIndex: 'asc' },
    })

    const uploaded = chunks.filter((c) => c.status === 'completed').length

    return {
      uploadId,
      totalChunks: chunks.length,
      uploadedChunks: uploaded,
      completed: uploaded === chunks.length && chunks.length > 0,
      chunks: chunks.map((c) => ({
        index: c.chunkIndex,
        uploaded: c.status === 'completed',
      })),
    }
  }
}
