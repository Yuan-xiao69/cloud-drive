/**
 * Fork 文件复制服务
 *
 * 负责将源仓库的文件树和分支复制到目标 Fork 仓库。
 *
 * 关键修复：idMap 使用 item.id → newItem.id 映射，而非错误的 parentId → newItem.id
 * 原代码中 `idMap.set(item.parentId ? item.parentId : '__root__', newItem.id)` 导致
 * 所有根节点互相覆盖，使得子节点永远找不到正确的父节点。
 */

import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export class ForkService {
  /**
   * 复制源仓库的所有文件（未删除的）到目标仓库。
   *
   * 按 depth 升序遍历，确保父节点先于子节点创建。
   * idMap 存储 oldId → newId 的映射，子节点通过 idMap.get(oldParentId) 找到新父节点。
   *
   * @param tx - Prisma 事务客户端
   * @param sourceRepoId - 源仓库 ID
   * @param targetRepoId - 目标（Fork）仓库 ID
   */
  static async copyRepoItems(
    tx: Tx,
    sourceRepoId: string,
    targetRepoId: string,
  ): Promise<void> {
    const sourceItems = await tx.repoItem.findMany({
      where: { repoId: sourceRepoId, isDeleted: false },
      select: {
        id: true,
        name: true,
        type: true,
        fileHash: true,
        fileSize: true,
        mimeType: true,
        storagePath: true,
        linkUrl: true,
        depth: true,
        path: true,
        sortOrder: true,
        parentId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (sourceItems.length === 0) return;

    // 按深度升序，确保父节点先于子节点创建
    const sorted = [...sourceItems].sort(
      (a, b) => (a.depth ?? 0) - (b.depth ?? 0),
    );

    // ✅ oldId → newId（修复：每个 item 以自己的 ID 作为 key）
    const idMap = new Map<string, string>();

    for (const item of sorted) {
      // ✅ 使用 item.parentId 去 idMap 中查找已创建的新父节点 ID
      const newParentId = item.parentId
        ? (idMap.get(item.parentId) ?? null)
        : null;

      const newItem = await tx.repoItem.create({
        data: {
          repoId: targetRepoId,
          name: item.name,
          type: item.type,
          fileHash: item.fileHash,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          storagePath: item.storagePath,
          linkUrl: item.linkUrl,
          depth: item.depth,
          path: item.path,
          sortOrder: item.sortOrder,
          parentId: newParentId,
        },
      });

      // ✅ 以自己的源 ID 为 key，新 ID 为 value
      idMap.set(item.id, newItem.id);
    }
  }

  /**
   * 复制源仓库的所有分支到目标仓库。
   *
   * @param tx - Prisma 事务客户端
   * @param sourceRepoId - 源仓库 ID
   * @param targetRepoId - 目标（Fork）仓库 ID
   */
  static async copyBranches(
    tx: Tx,
    sourceRepoId: string,
    targetRepoId: string,
  ): Promise<void> {
    const branches = await tx.branch.findMany({
      where: { repoId: sourceRepoId },
      select: { name: true, isDefault: true },
    });

    if (branches.length === 0) return;

    await tx.branch.createMany({
      data: branches.map((b) => ({
        repoId: targetRepoId,
        name: b.name,
        isDefault: b.isDefault,
      })),
    });
  }
}
