# Git 分支功能完善技术方案

**制定时间**：2026-04-24  
**状态**：待审核  
**版本**：v1.0

---

## 一、问题分析

### 1.1 当前现状

| 功能 | 状态 | 说明 |
|------|------|------|
| Branch 模型 | ✅ | Prisma Schema 已定义 |
| 分支 API | ✅ | GET/POST/DELETE 已实现 |
| 前端分支选择器 | ✅ | 仓库页面已集成 |
| 分支感知文件树 | ❌ | **未实现** - 所有分支共享同一套文件 |

### 1.2 核心问题

**`RepoItem` 表没有 `branchId` 字段**

当前数据库结构：
```prisma
model RepoItem {
  id        String  @id
  repoId    String  @map("repo_id")
  parentId  String? @map("parent_id")
  name      String
  type      String  // 'file' | 'dir'
  // ... 其他字段
  // ⚠️ 缺少 branchId 字段
}
```

**问题后果**：
1. 创建分支后看不到独立的文件
2. 不同分支的文件操作互相干扰
3. 无法实现真正的 Git 分支隔离
4. 分支功能形同虚设

### 1.3 预期效果

修复后应实现：
```
main 分支    → /src/app.js, /README.md
feature/abc  → /src/app.js (基于 main 复制)
              /src/new-feature.js (新增)
dev 分支     → /src/app.js (基于 main 复制)
              /src/dev-only.js (新增)
```

每个分支有独立的文件树，互不干扰。

---

## 二、完整实施方案

### 阶段 1：数据库层

#### 1.1 修改 Prisma Schema

**文件**：`prisma/schema.prisma`

**修改内容**：

```prisma
// 修改 RepoItem 模型 - 添加 branchId 字段
model RepoItem {
  id          String     @id @default(cuid())
  repoId      String     @map("repo_id")
  branchId    String?    @map("branch_id")  // 🆕 新增：关联分支，为空则属于 main 分支
  parentId    String?    @map("parent_id")
  name        String     @db.VarChar(255)
  type        String     @db.VarChar(10)   // 'file' | 'dir'
  content     String?
  fileHash    String?    @map("file_hash") @db.VarChar(64)
  fileSize    BigInt     @default(0) @map("file_size")
  mimeType    String?    @map("mime_type") @db.VarChar(100)
  storagePath String?    @map("storage_path") @db.VarChar(500)
  linkUrl     String?    @map("link_url")
  isDeleted   Boolean    @default(false) @map("is_deleted")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  parent      RepoItem?  @relation("ParentChild", fields: [parentId], references: [id], onDelete: Cascade)
  children    RepoItem[] @relation("ParentChild")
  repo        Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  branch      Branch?    @relation(fields: [branchId], references: [id], onDelete: Cascade)  // 🆕

  @@index([repoId, parentId])
  @@index([repoId, branchId])        // 🆕 新增索引
  @@index([branchId, parentId])      // 🆕 新增索引
}

// 修改 Branch 模型 - 添加 files 关系
model Branch {
  id        String     @id @default(cuid())
  repoId    String     @map("repo_id")
  name      String     @db.VarChar(100)
  isDefault Boolean    @default(false) @map("is_default")
  createdAt DateTime   @default(now()) @map("created_at")
  repo      Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  files     RepoItem[]  // 🆕 新增：关联该分支的文件

  @@unique([repoId, name])
  @@index([repoId])
}
```

**修改 RepoFileChunk 模型**：

```prisma
model RepoFileChunk {
  id          String     @id @default(cuid())
  repoId      String     @map("repo_id")
  branchId    String?    @map("branch_id")  // 🆕 新增：关联分支
  uploadId    String     @map("upload_id") @db.VarChar(100)
  chunkIndex  Int        @map("chunk_index")
  chunkHash   String     @map("chunk_hash") @db.VarChar(64)
  chunkData   String     @db.Text
  chunkSize   Int        @map("chunk_size")
  totalChunks Int        @map("total_chunks")
  fileName    String     @map("file_name") @db.VarChar(255)
  parentPath  String     @map("parent_path") @db.VarChar(2000)
  totalSize   BigInt     @map("total_size")
  mimeType    String?    @map("mime_type") @db.VarChar(100)
  userId      String     @map("user_id")
  status      String     @default("pending") @map("status") @db.VarChar(20)
  expiresAt   DateTime   @map("expires_at")
  createdAt   DateTime   @default(now()) @map("created_at")
  repo        Repository @relation(fields: [repoId], references: [id], onDelete: Cascade)
  branch      Branch?    @relation(fields: [branchId], references: [id], onDelete: Cascade)  // 🆕

  @@unique([uploadId, chunkIndex])
  @@index([repoId])
  @@index([uploadId])
  @@index([branchId])              // 🆕 新增索引
  @@index([expiresAt])
}
```

#### 1.2 数据库迁移

**生成迁移文件**：
```bash
npx prisma migrate dev --name add_branch_id_to_repo_items
```

**迁移脚本**（如需要数据迁移）：
```sql
-- 将现有文件关联到 main 分支
UPDATE "repo_items"
SET "branch_id" = (
  SELECT id FROM "branches" 
  WHERE "repo_id" = "repo_items"."repo_id" 
  AND "name" = 'main'
  LIMIT 1
)
WHERE "branch_id" IS NULL;

-- 如果 main 分支不存在，创建它
INSERT INTO "branches" ("id", "repo_id", "name", "is_default", "created_at")
SELECT 
  gen_random_uuid()::text,
  id,
  COALESCE("default_branch", 'main'),
  true,
  NOW()
FROM "repositories" r
WHERE NOT EXISTS (
  SELECT 1 FROM "branches" b WHERE b."repo_id" = r.id
);
```

---

### 阶段 2：API 层

#### 2.1 分支管理 API 增强

**文件**：`src/app/api/v1/repos/[username]/[repoName]/branches/route.ts`

**修改内容**：

```typescript
// POST - 创建分支时正确复制文件树
if (sourceBranch) {
  // 🆕 从指定源分支复制文件
  const sourceBranchRecord = await prisma.branch.findFirst({
    where: { repoId: repo.id, name: sourceBranch },
  });
  
  if (sourceBranchRecord) {
    // 🆕 递归复制文件树，关联到新分支
    async function copyTreeWithBranch(
      srcParentId: string | null,
      tgtParentId: string | null
    ): Promise<void> {
      const items = await prisma.repoItem.findMany({
        where: { 
          repoId: repo.id, 
          branchId: sourceBranchRecord.id,  // 🆕 指定源分支
          parentId: srcParentId, 
          isDeleted: false 
        },
      });
      
      for (const item of items) {
        const newItem = await prisma.repoItem.create({
          data: {
            repoId: repo.id,
            branchId: branch.id,  // 🆕 关联到新分支
            name: item.name,
            parentId: tgtParentId,
            type: item.type,
            content: item.content ?? null,
            fileHash: item.fileHash ?? undefined,
            fileSize: item.fileSize,
            mimeType: item.mimeType ?? undefined,
            storagePath: item.storagePath ?? undefined,
          },
        });
        
        if (item.type === 'dir') {
          await copyTreeWithBranch(item.id, newItem.id);
        }
      }
    }
    
    // 从根目录开始复制
    await copyTreeWithBranch(null, null);
  }
}
```

#### 2.2 文件树 API 修改

**文件**：`src/app/api/v1/repos/[username]/[repoName]/tree/route.ts`

**GET 方法修改**：

```typescript
export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { username, repoName } = await params;
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';
    const branch = searchParams.get('branch') || 'main';  // 🆕 获取分支参数

    // ... 查找仓库代码保持不变 ...

    // 🆕 获取分支信息
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
    });
    
    if (!branchRecord) {
      return errors.notFound(`分支 '${branch}' 不存在`);
    }

    // 🆕 解析路径时指定分支
    let parentId: string | null = null;
    for (const dirName of pathParts) {
      const dir = await prisma.repoItem.findFirst({
        where: { 
          repoId: repo.id, 
          branchId: branchRecord.id,  // 🆕 限定分支
          name: dirName, 
          parentId, 
          type: 'dir', 
          isDeleted: false 
        },
      });
      if (!dir) return errors.notFound('目录');
      parentId = dir.id;
    }

    // 🆕 获取文件列表时指定分支
    const items = await prisma.repoItem.findMany({
      where: { 
        repoId: repo.id, 
        branchId: branchRecord.id,  // 🆕 限定分支
        parentId, 
        isDeleted: false 
      },
      orderBy: [
        { type: 'asc' },  // 目录在前
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        type: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 返回分支信息
    return success({
      branch: {
        name: branchRecord.name,
        isDefault: branchRecord.isDefault,
      },
      files: items.map((item) => ({
        id: String(item.id),
        name: item.name,
        type: item.type,
        size: item.type === 'file' ? Number(item.fileSize) : undefined,
        mimeType: item.mimeType,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[v1/Tree] GET Error:', error);
    return errors.internal('服务器错误');
  }
}
```

**DELETE 方法修改**：

```typescript
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { username, repoName } = await params;
    const body = await req.json();
    const { path, branch = 'main', recursive = false } = body;  // 🆕 添加 branch 参数

    // ... 权限检查代码保持不变 ...

    // 🆕 获取分支信息
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
    });
    
    if (!branchRecord) {
      return errors.notFound(`分支 '${branch}' 不存在`);
    }

    // 🆕 解析路径时指定分支
    let parentId: string | null = null;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const dirName = pathParts[i];
      const dir = await prisma.repoItem.findFirst({
        where: { 
          repoId: repo.id, 
          branchId: branchRecord.id,  // 🆕 限定分支
          name: dirName, 
          parentId, 
          type: 'dir', 
          isDeleted: false 
        },
      });
      if (!dir) return errors.notFound('目录');
      parentId = dir.id;
    }

    // 🆕 查找目标时指定分支
    const item = await prisma.repoItem.findFirst({
      where: { 
        repoId: repo.id, 
        branchId: branchRecord.id,  // 🆕 限定分支
        name: fileName, 
        parentId, 
        isDeleted: false 
      },
    });

    // ... 后续删除逻辑 ...
  }
}
```

**PATCH 方法修改**：

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    const { username, repoName } = await params;
    const body = await req.json();
    const { sourcePath, targetPath, targetName, branch = 'main' } = body;  // 🆕 添加 branch 参数

    // ... 权限检查代码保持不变 ...

    // 🆕 获取分支信息
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
    });
    
    if (!branchRecord) {
      return errors.notFound(`分支 '${branch}' 不存在`);
    }

    // 🆕 所有路径操作时指定分支
    let sourceParentId: string | null = null;
    for (let i = 0; i < sourceParts.length - 1; i++) {
      const dirName = sourceParts[i];
      const dir = await prisma.repoItem.findFirst({
        where: { 
          repoId: repo.id, 
          branchId: branchRecord.id,  // 🆕 限定分支
          name: dirName, 
          parentId: sourceParentId, 
          type: 'dir', 
          isDeleted: false 
        },
      });
      if (!dir) return errors.notFound('源目录');
      sourceParentId = dir.id;
    }

    const sourceItem = await prisma.repoItem.findFirst({
      where: { 
        repoId: repo.id, 
        branchId: branchRecord.id,  // 🆕 限定分支
        name: sourceName, 
        parentId: sourceParentId, 
        isDeleted: false 
      },
    });

    // ... 后续移动/重命名逻辑 ...
  }
}
```

#### 2.3 上传 API 修改

**文件**：`src/app/api/v1/repos/[username]/[repoName]/upload/route.ts`

**修改内容**：所有上传操作都需要支持 `branch` 参数。

```typescript
// 在上传文件时指定分支
const { searchParams } = new URL(req.url);
const branch = searchParams.get('branch') || 'main';

// 🆕 获取或验证分支
const branchRecord = await prisma.branch.findFirst({
  where: { repoId: repo.id, name: branch },
});
if (!branchRecord) {
  return errors.notFound(`分支 '${branch}' 不存在`);
}

// 🆕 创建文件时关联分支
const file = await prisma.repoItem.create({
  data: {
    repoId: repo.id,
    branchId: branchRecord.id,  // 🆕 关联到分支
    name: fileName,
    type: 'file',
    parentId: parentItem?.id || null,
    content: textContent || null,
    fileHash: hash,
    fileSize: fileSize,
    mimeType: mimeType || 'application/octet-stream',
    storagePath: storagePath || undefined,
  },
});
```

#### 2.4 分片上传 API 修改

**文件**：`src/app/api/v1/repos/[username]/[repoName]/upload-chunked/route.ts`

**修改内容**：初始化和完成上传时支持 `branch` 参数。

```typescript
// init action - 初始化上传
const { searchParams } = new URL(req.url);
const branch = searchParams.get('branch') || 'main';

const branchRecord = await prisma.branch.findFirst({
  where: { repoId: repo.id, name: branch },
});
if (!branchRecord) {
  return errors.notFound(`分支 '${branch}' 不存在`);
}

// chunk action - 上传分片
// complete action - 完成上传
```

---

### 阶段 3：前端层

#### 3.1 仓库页面修改

**文件**：`src/app/(main)/[username]/[repoName]/page.tsx`

**修改内容**：

```typescript
'use client';

import { useState, useEffect } from 'react';

// 🆕 添加分支状态
const [currentBranch, setCurrentBranch] = useState('main');

// 从 URL 或存储获取当前分支
useEffect(() => {
  const savedBranch = localStorage.getItem(`repo_${repoId}_branch`);
  if (savedBranch) {
    setCurrentBranch(savedBranch);
  }
}, [repoId]);

// 切换分支时保存到存储
const handleBranchChange = (branch: string) => {
  setCurrentBranch(branch);
  localStorage.setItem(`repo_${repoId}_branch`, branch);
  // 刷新文件树
  fetchFileTree();
};

// 🆕 将 branch 传递给文件树组件
<FileTree 
  repoId={repoId}
  branch={currentBranch}  // 🆕
  onFileSelect={handleFileSelect}
  onFolderCreate={handleFolderCreate}
/>
```

#### 3.2 文件树组件修改

**文件**：`src/components/repo/FileTree.tsx`

**修改内容**：

```typescript
'use client';

interface FileTreeProps {
  repoId: string;
  branch: string;  // 🆕 新增
  // ... 其他 props
}

export default function FileTree({ repoId, branch, ... }: FileTreeProps) {  // 🆕
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 🆕 获取文件树时包含 branch 参数
  const fetchFileTree = async (path: string = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (path) params.set('path', path);
      params.set('branch', branch);  // 🆕
      
      const res = await fetch(
        `/api/v1/repos/${username}/${repoName}/tree?${params}`
      );
      const data = await res.json();
      
      if (data.code === 0) {
        setItems(data.data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 branch 变化时重新获取
  useEffect(() => {
    fetchFileTree();
  }, [branch, repoId]);  // 🆕 添加 branch 依赖
}
```

#### 3.3 文件操作组件修改

**文件**：`src/components/repo/FileOperations.tsx` 或相关组件

**修改内容**：所有文件操作（创建、删除、移动、重命名）都需要传递 `branch` 参数。

```typescript
// 创建文件/文件夹
const handleCreate = async (name: string, type: 'file' | 'dir') => {
  const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      type,
      path: currentPath,
      branch: currentBranch,  // 🆕
    }),
  });
  // ...
};

// 删除文件
const handleDelete = async (path: string) => {
  const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path,
      branch: currentBranch,  // 🆕
    }),
  });
  // ...
};

// 移动/重命名
const handleMove = async (sourcePath: string, targetPath?: string, targetName?: string) => {
  const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourcePath,
      targetPath,
      targetName,
      branch: currentBranch,  // 🆕
    }),
  });
  // ...
};
```

#### 3.4 分支选择器组件修改

**文件**：`src/components/repo/BranchSelector.tsx`

**修改内容**：确保分支选择器正确工作。

```typescript
'use client';

export default function BranchSelector({ 
  repoId, 
  currentBranch, 
  branches, 
  onBranchChange 
}: BranchSelectorProps) {
  // ... 现有代码 ...

  const handleCreateBranch = async (name: string, sourceBranch?: string) => {
    const res = await fetch(`/api/v1/repos/${username}/${repoName}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sourceBranch: sourceBranch || currentBranch,  // 🆕 从当前分支创建
      }),
    });
    // ...
  };
}
```

---

### 阶段 4：数据迁移

#### 4.1 现有数据迁移脚本

**文件**：`prisma/migrations/migrate_existing_files.sql`

```sql
-- 迁移说明：
-- 1. 为所有仓库创建 main 分支（如果不存在）
-- 2. 将现有文件关联到 main 分支

-- 步骤 1: 为没有分支的仓库创建 main 分支
INSERT INTO "branches" ("id", "repo_id", "name", "is_default", "created_at", "updated_at")
SELECT 
  gen_random_uuid()::text,
  r.id,
  COALESCE(r.default_branch, 'main'),
  true,
  NOW(),
  NOW()
FROM "repositories" r
WHERE NOT EXISTS (
  SELECT 1 FROM "branches" b WHERE b."repo_id" = r.id
);

-- 步骤 2: 将现有文件关联到 main 分支
UPDATE "repo_items" ri
SET "branch_id" = (
  SELECT b.id 
  FROM "branches" b 
  WHERE b."repo_id" = ri."repo_id" 
  AND b."name" = COALESCE(
    (SELECT default_branch FROM "repositories" WHERE id = ri."repo_id"),
    'main'
  )
  LIMIT 1
)
WHERE ri."branch_id" IS NULL;

-- 步骤 3: 验证迁移
SELECT 
  r.name as repo_name,
  COUNT(DISTINCT b.id) as branch_count,
  COUNT(ri.id) as file_count,
  COUNT(CASE WHEN ri."branch_id" IS NULL THEN 1 END) as unlinked_files
FROM "repositories" r
LEFT JOIN "branches" b ON b."repo_id" = r.id
LEFT JOIN "repo_items" ri ON ri."repo_id" = r.id
GROUP BY r.id, r.name
HAVING COUNT(CASE WHEN ri."branch_id" IS NULL THEN 1 END) > 0;
```

---

## 三、API 变更汇总

### 3.1 路径参数变更

| API | 方法 | 新增参数 | 说明 |
|-----|------|----------|------|
| `/api/v1/repos/[username]/[repoName]/tree` | GET | `branch` | 获取指定分支的文件树 |
| `/api/v1/repos/[username]/[repoName]/tree` | DELETE | `branch` | 在指定分支删除文件 |
| `/api/v1/repos/[username]/[repoName]/tree` | PATCH | `branch` | 在指定分支移动/重命名 |
| `/api/v1/repos/[username]/[repoName]/upload` | POST | `branch` (query) | 上传到指定分支 |
| `/api/v1/repos/[username]/[repoName]/upload-chunked` | POST | `branch` (query) | 分片上传到指定分支 |

### 3.2 响应格式变更

```json
// GET /api/v1/repos/user/repo/tree?branch=feature
{
  "code": 0,
  "message": "success",
  "data": {
    "branch": {
      "name": "feature",
      "isDefault": false
    },
    "files": [
      { "id": "xxx", "name": "README.md", "type": "file", "size": 1024 },
      { "id": "yyy", "name": "src", "type": "dir" }
    ]
  }
}
```

---

## 四、测试计划

### 4.1 单元测试

```typescript
// tests/branches.test.ts

describe('Branch-aware File Operations', () => {
  test('should create files in specific branch', async () => {
    // 创建分支
    const branch = await createBranch(repo.id, 'feature');
    
    // 在 feature 分支创建文件
    await createFile(repo.id, branch.id, 'test.txt', 'content');
    
    // 验证文件在 feature 分支存在
    const filesInFeature = await getFiles(repo.id, branch.id);
    expect(filesInFeature).toContain('test.txt');
    
    // 验证文件在 main 分支不存在
    const mainBranch = await getMainBranch(repo.id);
    const filesInMain = await getFiles(repo.id, mainBranch.id);
    expect(filesInMain).not.toContain('test.txt');
  });
  
  test('should copy files when creating branch from source', async () => {
    // main 分支有文件
    await createFile(repo.id, mainBranch.id, 'existing.txt', 'content');
    
    // 从 main 创建 feature 分支
    const branch = await createBranch(repo.id, 'feature', 'main');
    
    // 验证文件被复制到 feature 分支
    const filesInFeature = await getFiles(repo.id, branch.id);
    expect(filesInFeature).toContain('existing.txt');
  });
});
```

### 4.2 集成测试

```typescript
// tests/branch-integration.test.ts

describe('Branch Integration', () => {
  test('should isolate file operations between branches', async () => {
    // 创建两个分支
    const main = await getMainBranch(repo.id);
    const feature = await createBranch(repo.id, 'feature', 'main');
    
    // main 分支添加文件 A
    await api.post(`/tree`, { name: 'a.txt', branch: main.name });
    
    // feature 分支添加文件 B
    await api.post(`/tree`, { name: 'b.txt', branch: feature.name });
    
    // 验证分支隔离
    const mainFiles = await api.get(`/tree?branch=${main.name}`);
    const featureFiles = await api.get(`/tree?branch=${feature.name}`);
    
    expect(mainFiles).toContain('a.txt');
    expect(mainFiles).not.toContain('b.txt');
    expect(featureFiles).toContain('b.txt');
    expect(featureFiles).toContain('a.txt'); // 复制时有 A
  });
});
```

---

## 五、实施步骤

### 5.1 执行顺序

```
阶段 1: 数据库层 (预计 30 分钟)
├── 修改 prisma/schema.prisma
├── 运行 prisma migrate dev
└── 执行数据迁移脚本

阶段 2: API 层 (预计 2 小时)
├── 修改 branches/route.ts
├── 修改 tree/route.ts (GET/DELETE/PATCH)
├── 修改 upload/route.ts
└── 修改 upload-chunked/route.ts

阶段 3: 前端层 (预计 2 小时)
├── 修改仓库页面 page.tsx
├── 修改 FileTree.tsx
├── 修改文件操作组件
└── 修改 BranchSelector.tsx

阶段 4: 测试与验证 (预计 1 小时)
├── 运行单元测试
├── 手动功能测试
└── 性能测试
```

### 5.2 回滚计划

如遇问题：
1. 数据库回滚：`prisma migrate reset`
2. 代码回滚：`git checkout <previous-commit>`
3. 数据回滚：运行回滚脚本

---

## 六、风险评估

### 6.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据库迁移失败 | 可能丢失数据 | 备份数据库后再迁移 |
| 现有文件关联错误 | 文件显示异常 | 迁移前验证脚本 |
| API 兼容性问题 | 现有前端调用失败 | 添加默认值 branch='main' |

### 6.2 中风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 性能下降 | 文件操作变慢 | 添加索引 |
| 前端状态管理 | 分支切换逻辑复杂 | 统一状态管理 |

### 6.3 低风险项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 测试覆盖不足 | 边界情况未覆盖 | 增加测试用例 |

---

## 七、验收标准

### 7.1 功能验收

- [ ] 创建分支后能看到独立的文件树
- [ ] 不同分支的文件互不干扰
- [ ] 文件操作（创建/删除/移动）正确关联到当前分支
- [ ] 从源分支创建新分支时正确复制文件
- [ ] 前端分支切换正常工作

### 7.2 性能验收

- [ ] 文件树加载时间 < 500ms
- [ ] 分支切换响应时间 < 200ms
- [ ] 数据库查询使用索引

### 7.3 兼容性验收

- [ ] 不带 branch 参数的 API 调用默认使用 main 分支
- [ ] 现有功能不受影响

---

## 八、附录

### A. 相关文件清单

| 文件路径 | 修改类型 |
|----------|----------|
| `prisma/schema.prisma` | 修改 |
| `src/app/api/v1/repos/[username]/[repoName]/branches/route.ts` | 修改 |
| `src/app/api/v1/repos/[username]/[repoName]/tree/route.ts` | 修改 |
| `src/app/api/v1/repos/[username]/[repoName]/upload/route.ts` | 修改 |
| `src/app/api/v1/repos/[username]/[repoName]/upload-chunked/route.ts` | 修改 |
| `src/app/(main)/[username]/[repoName]/page.tsx` | 修改 |
| `src/components/repo/FileTree.tsx` | 修改 |
| `src/components/repo/FileOperations.tsx` | 修改 |
| `src/components/repo/BranchSelector.tsx` | 修改 |

### B. 数据库索引

```sql
-- 新增索引
CREATE INDEX IF NOT EXISTS idx_repo_items_branch_id ON repo_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_repo_items_repo_branch ON repo_items(repo_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_repo_items_branch_parent ON repo_items(branch_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_file_chunks_branch_id ON repo_file_chunks(branch_id);
```

---

**方案制定人**：AI Assistant  
**审核状态**：待审核  
**批准后实施**：是 / 否
