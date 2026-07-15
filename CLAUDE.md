# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

这是 **Cloud Drive** — 一个**类 GitHub 的仓库式知识托管与交流平台**，全栈 Next.js 14 应用。

| 项目 | 路径 | 技术栈 | 说明 |
|------|------|--------|------|
| Cloud Drive | 项目根目录 | Next.js 14 (App Router) + Prisma + PostgreSQL + Redis + MinIO | 全栈文件托管 + 讨论社区平台 |

## 常用命令

所有命令在项目根目录执行：

```bash
# 开发（推荐方式）
npm run dev:docker          # 启动 Docker 基础设施 + Next.js 开发服务器
npm run dev                 # 仅启动 Next.js（需先 docker compose up -d）

# Docker 基础设施
npm run docker:up           # 启动 DB + Redis + MinIO
npm run docker:down         # 停止所有基础设施
npm run docker:logs         # 查看基础设施日志

# 构建和生产
npm run build               # prisma generate + next build (standalone 输出)
npm run start               # 启动生产服务器

# 数据库
npm run db:push             # 推送 schema 到数据库（开发用）
npm run db:generate         # 生成 Prisma Client
npm run db:migrate          # 运行数据库迁移
npm run db:seed             # 填充种子数据
npm run db:studio           # 打开 Prisma Studio

# 代码质量
npm run lint                # ESLint 检查
npm run lint:fix            # ESLint 自动修复
npm run format              # Prettier 格式化
npm run format:check        # Prettier 格式检查
npm run type-check          # TypeScript 类型检查

# 测试
npm test                    # 运行所有单元测试（约 236 个）
npm run test:watch          # 监听模式
```

## 核心架构

### 路由结构（Next.js App Router）

```
src/app/
├── layout.tsx              # 根布局：ThemeProvider + AuthProvider + AnnouncementBanner
├── (auth)/                 # 登录/注册页面（路由组，无共享布局）
├── (main)/                 # 主应用页面（路由组，含 Header + 侧边栏布局）
│   ├── layout.tsx          # MainLayout
│   ├── page.tsx            # 首页（仓库列表/探索）
│   ├── admin/              # 管理后台
│   ├── discussions/        # 讨论区
│   ├── explore/            # 探索
│   ├── notifications/      # 通知列表
│   ├── settings/           # 用户设置
│   ├── share/              # 分享链接访问页
│   └── [username]/         # 用户主页 + 仓库详情
└── api/                    # API Route Handlers
    ├── auth/               # 注册/登录/刷新 Token
    ├── users/              # 用户 CRUD
    ├── repos/              # 仓库 CRUD + 文件上传/分享
    ├── discussions/        # 讨论 + 评论
    ├── notifications/      # 通知 + SSE
    ├── search/             # 搜索
    └── admin/              # 管理 API
```

### 关键共享模块（`src/lib/`）

| 文件 | 用途 | 导入方式 |
|------|------|----------|
| `lib/prisma.ts` | **Prisma 单例** - 全局唯一入口，必须在所有数据库访问中使用 | `import { prisma } from '@/lib/prisma'` |
| `lib/auth/index.ts` | JWT 认证核心（sign/verify token） | `import { signAccessToken, verifyAccessToken, ... } from '@/lib/auth'` |
| `lib/auth/server.ts` | **服务端认证**（Server Component/API Route 专用） → `auth()` 获取当前用户 | `import { auth } from '@/lib/auth/server'` |
| `lib/api/v1/response.ts` | **统一 API 响应工具**（`success`, `error`, `errors`, `created`, `handlePrismaError` 等） | `import { success, error, errors } from '@/lib/api/v1'` |
| `lib/api/v1/pagination.ts` | 分页参数解析和元数据构建（`parsePagination`, `buildPaginationMeta`） | `import { parsePagination, buildPaginationMeta } from '@/lib/api/v1'` |
| `lib/api/client.ts` | **现代 API 客户端**（类式 `ApiClient`，tokenManager 单例） | `import { api } from '@/lib/api/client'` |
| `lib/utils/server.ts` | ⚠️ **已废弃** — 旧版 API 响应工具，新代码禁止使用 | 迁移至 `@/lib/api/v1` |
| `lib/utils/index.ts` | 通用工具函数（格式化、验证、颜色映射） | `import { formatTimeAgo, isValidUsername } from '@/lib/utils'` |
| `lib/security.ts` | XSS 防护（DOMPurify）、CSRF Token | `import { sanitizeHtml } from '@/lib/security'` |
| `lib/csrf.ts` | CSRF Origin 验证 | - |
| `lib/rate-limit.ts` | Redis 令牌桶速率限制 | - |
| `lib/file-validator.ts` | 文件上传验证（Magic Bytes 检测） | - |
| `lib/validation.ts` | Zod 验证 schema | - |
| `lib/cache.ts` | Redis 缓存工具 | - |

### 认证机制

- **双 Token 模式**：Access Token（短期，存 cookie）+ Refresh Token（长期，存 cookie）
- **服务端认证**：`lib/auth/server.ts` 的 `auth()` 函数，从 cookie 提取 token → 验证 JWT → 查询数据库返回 SessionUser
- **客户端认证**：AuthProvider Context 提供 `{ user, login, logout, refreshToken }`

### 组件组织结构

```
src/components/
├── design/                # 设计系统组件（Button/Card/Modal/PageLayout/Input/Badge/Alert/Empty/Avatar/Select/icons）
├── layout/                # 布局组件（Header, MainLayout, LeftSidebar, BottomNav）
├── common/                # 通用业务组件（ActionMenu, BackButton, ErrorBoundary, ReportModal）
├── admin/                 # 管理后台专用组件（14 Tab + 3 合并容器，仅超级管理员可访问）
├── repo/                  # 仓库相关组件（FileTree, ChunkedUploader, Issues/Pulls/Settings tabs）
├── settings/              # 用户设置组件
├── discussion/            # 讨论组件
├── user/                  # 用户资料组件
└── index.ts               # 统一导出入口
```

### 数据模型要点

Prisma schema（`prisma/schema.prisma`）定义在 PostgreSQL 上，核心实体：
- **User** — uid（9位编号）、角色（user/admin/super_admin）、MFA、封禁/处罚/申诉
- **Repository** — 可见性、Fork 关系、Star/Watch/View 计数
- **RepoItem** — 树形结构（parentId 自关联）、文件/文件夹、S3 存储路径
- **Branch** — 分支管理
- **Discussion / DiscussionComment** — 讨论+评论+点赞+采纳答案
- **Issue / PullRequest** — 完整的 Isssue/PR 系统
- **Notification** — 通知（SSE 实时推送）
- 安全相关：UserBan、UserPenalty、Appeal、SecurityEvent、IPBlacklist
- 其他：ShareLink、ForkRequest、ApiKey、Webhook、UserFollow、UserBlock

## 开发规范

### 必须遵守的规则
1. **Prisma 客户端**：仅在 `lib/prisma.ts` 创建，其他文件 `import { prisma } from '@/lib/prisma'`，禁止重复实例化
2. **工具函数来源统一**：
   - 前端通用：`@/lib/utils`（`formatTimeAgo`, `isValidUsername`, `truncate` 等）
   - 服务端 API：`@/lib/api/v1`（`success`, `error`, `errors`, `created`, `handlePrismaError` 等），**禁止使用** `@/lib/utils/server` 的旧版工具
   - 服务端认证：`@/lib/auth`（JWT 函数）、`@/lib/auth/server`（`auth()`）
3. **TypeScript**：严格模式，禁止 `any` 类型
4. **XSS 防护**：用户输入必须通过 DOMPurify 净化，禁止简单字符串替换
5. **文件上传**：多层验证 — 扩展名 → MIME 类型 → 文件大小 → Magic Bytes → 内容扫描
6. **🔴 彻底迁移（零残留原则）**：迁移或改造任何功能/模块时，必须 100% 完成，不允许出现"迁移了 99% 遗留 1%"的情况。具体包括：
   - 替换旧 API 客户端（`@/lib/api-client`）时，必须迁移**所有**引用文件，迁移完成后**删除旧文件**
   - 替换旧响应工具（`@/lib/utils/server`）时，必须迁移**所有**路由，迁移完成后**删除旧文件**
   - 重构组件时，旧组件必须**删除**，不能保留两份同时存在（如 `AdminDashboard` 和 `AdminDashboardEnhanced`）
   - 迁移完成后必须运行 `grep` 搜索旧导入路径，确认**零残留**
   - 禁止新建"Enhanced"或"V2"等后缀组件后保留旧版 — 要么直接替换，要么不建

### Git 提交格式
```
<type>(<scope>): <subject>
```
type: feat | fix | docs | style | refactor | test | chore | perf | ci
scope: auth | user | repo | api | ui | db | security | docs

### 样式
- Tailwind CSS，自定义 GitHub 风格色系（`github.bg`, `github.border`, `github.accent` 等）
- 支持亮/暗模式自动切换（ThemeProvider）
- 组件使用 CSS Variables 实现主题化

### 环境变量
- 本地开发：`.env.local`（唯一配置文件）
- 模板文件：`.env.example`，生产模板：`.env.production.example`
- Docker 基础设施连接信息在 `.env`（仅 DB/Redis URL）
- 关键变量：`DATABASE_URL`（PostgreSQL）、`REDIS_URL`（可选）、`S3_*`（MinIO）、`JWT_SECRET`

## 项目文档

详细文档位于以下目录：
- `README.md` — 项目说明与快速开始
- `项目报告.md` — 完整项目报告（架构/设计系统/数据统计/决策记录）
- `CHANGELOG.md` — 变更日志
- `design-samples/` — 12 个全站页面与弹窗设计样本 (HTML)
- `DEPLOY.md` — 生产部署指南
- `docs/` — 方案文档与计划
