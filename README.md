# Cloud Drive

**类 GitHub 的仓库式知识托管与交流平台 — 你的云端文件仓库**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 功能特性

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| **用户系统** | 注册/登录/邮箱验证/角色管理 | ✅ 完成 |
| **仓库管理** | 创建/Fork/Star/Watch/文件上传/分支管理 | ✅ 完成 |
| **讨论系统** | 发帖/评论/采纳最佳答案/分类筛选 | ✅ 完成 |
| **Issues** | 完整列表/详情/评论/标签/状态管理 | ✅ 完成 |
| **Pull Requests** | 列表/详情/评论/合并/关闭/重新打开 | ✅ 完成 |
| **搜索功能** | 综合搜索/用户建议/实时搜索 | ✅ 完成 |
| **管理后台** | 用户/仓库/讨论/举报/审计/处罚/申诉/系统公告 | ✅ 完成 |
| **主题切换** | 亮/暗模式自动跟随系统 | ✅ 完成 |
| **通知系统** | SSE 实时推送/通知列表/批量操作/12项设置 | ✅ 完成 |
| **分享链接** | 生成分享链接/过期时间/最大浏览次数 | ✅ 完成 |
| **分片上传** | 断点续传/粘贴上传/全局拖拽/队列管理 | ✅ 完成 |
| **文件预览** | 代码高亮/Markdown渲染/行号跳转/折叠/分页 | ✅ 完成 |
| **快捷键导航** | G+I/D/S/P 快捷键 / Backspace 返回 | ✅ 完成 |
| **移动端适配** | 底部导航栏 / 响应式布局 | ✅ 完成 |
| **Fork 申请审批** | 申请流程 / 审批 UI / SSE 通知 / 自动过期 | ✅ 完成 |

### 安全特性

| 功能 | 说明 |
|------|------|
| **XSS 防护** | 使用 DOMPurify 进行 HTML 净化 |
| **CSRF 防护** | Origin 验证 + CSRF Token |
| **文件上传安全** | Magic Bytes 检测 + 内容扫描 |
| **敏感操作验证** | 删除账号等需二次确认 |
| **速率限制** | Redis 令牌桶算法 |
| **JWT 双 Token** | Access Token + Refresh Token |

---

## 架构设计

### 系统架构总览

```mermaid
graph TB
    subgraph "客户端"
        BROWSER["浏览器<br/>亮/暗主题 · 响应式 · 快捷键"]
    end

    subgraph "Next.js 14 App Router"
        subgraph "前端层"
            DESIGN["设计系统<br/>11 组件 · 120+ Token · 陶土暖色系"]
            PAGES["23 页面路由<br/>(auth) / (main) / share"]
            COMPONENTS["~110 业务组件<br/>admin · repo · discussion · settings · user"]
        end

        subgraph "API 层 (137 个 route.ts)"
            FW["Framework 管道<br/>认证 → 限流 → CSRF → 验证 → Handler"]
            V1["V1 统一响应<br/>success / error / paginated · 60+ 错误码"]
        end

        subgraph "服务层 (13 Services)"
            SVC["User · Repo · Discussion · Issue · Pull<br/>Fork · Search · Share · Upload · Appeal<br/>Ban · Report · Session"]
        end
    end

    subgraph "基础设施"
        PG[("PostgreSQL<br/>Prisma ORM · 42 模型")]
        REDIS[("Redis<br/>缓存 · 限流 · 队列")]
        MINIO[("MinIO / S3<br/>文件存储 · 分片上传")]
        EMAIL["Nodemailer<br/>邮件通知"]
    end

    subgraph "安全层"
        SEC["JWT 双Token · MFA · DOMPurify · CSRF<br/>IP黑名单 · AES-256-GCM · 审计日志"]
    end

    BROWSER --> DESIGN
    DESIGN --> PAGES
    PAGES --> V1
    V1 --> FW
    FW --> SVC
    SVC --> PG
    SVC --> REDIS
    SVC --> MINIO
    SVC --> EMAIL
    SEC -.-> FW
    SEC -.-> SVC
```

### 业务架构：双业务线平级

```mermaid
flowchart LR
    subgraph "① 文件仓库（独立闭环）"
        REPO["仓库 CRUD"]
        FILE["文件上传/预览/下载"]
        FORK["拉入 Fork"]
        ISSUE["文件问题 Issue"]
        PULL["协作请求 Pull"]
        COLLAB["协作者管理"]
        SHARE["分享链接"]
    end

    subgraph "② 讨论社区（独立闭环）"
        DISC["话题发帖"]
        COMMENT["评论 · 点赞"]
        ANSWER["采纳最佳答案"]
        DISCOVER["发现 · 搜索"]
    end

    subgraph "桥接层（可选）"
        BRIDGE1["仓库文件分享到讨论区"]
        BRIDGE2["讨论区文件拉入仓库"]
    end

    REPO -.-> BRIDGE1 -.-> DISC
    DISC -.-> BRIDGE2 -.-> FORK
```

| 规则 | 说明 |
|------|------|
| **公开仓库** | 所有人可见，可被搜索、拉入、分享 |
| **私有仓库** | 仅所有者可见，不被搜索、不被拉入 |
| **两条线各自独立** | 文件仓库和讨论区均可脱离对方独立运作 |

### 页面布局体系：Compound Component 模式

```mermaid
flowchart TB
    subgraph "PageLayout 容器"
        direction LR
        NARROW["单栏窄<br/>440px<br/>登录/注册"]
        MEDIUM["单栏中<br/>800px<br/>搜索/通知"]
        WIDE["单栏宽<br/>1200px<br/>用户主页"]
        FULL["全宽<br/>100%<br/>管理后台/文件预览"]
        TWOPANE["两栏<br/>Pane + Content<br/>首页/探索/讨论"]
    end

    subgraph "可插入插槽"
        PANE["PageLayoutPane<br/>sidebar(240px)<br/>settings(200px)"]
        CONTENT["PageLayoutContent<br/>自动填充剩余空间"]
    end

    TWOPANE --> PANE
    TWOPANE --> CONTENT
```

### API 请求生命周期

```mermaid
sequenceDiagram
    participant C as 客户端
    participant DR as defineRoute
    participant A as Auth Pipeline
    participant RL as Rate Limit
    participant CS as CSRF Guard
    participant V as Validation
    participant H as Handler
    participant S as Service
    participant D as Database

    C->>DR: HTTP 请求
    DR->>A: ① JWT 验证 (Access + Refresh)
    A-->>DR: SessionUser
    DR->>RL: ② 令牌桶限流
    RL-->>DR: 放行
    DR->>CS: ③ CSRF 防护 (写操作)
    CS-->>DR: 放行
    DR->>V: ④ Zod Schema 验证
    V-->>DR: 校验通过
    DR->>H: ⑤ 业务处理
    H->>S: 调用 Service
    S->>D: Prisma 查询
    D-->>S: 数据
    S-->>H: 结果
    H-->>DR: 业务结果
    DR-->>C: V1 统一响应格式
```

### 核心数据模型

```mermaid
erDiagram
    User ||--o{ Repository : owns
    User ||--o{ Discussion : creates
    User ||--o{ Issue : reports
    User ||--o{ Notification : receives
    User ||--o{ UserFollow : follows
    User ||--o{ UserBlock : blocks
    User ||--o{ ApiKey : has
    Repository ||--o{ RepoItem : contains
    Repository ||--o{ Star : starred_by
    Repository ||--o{ Watcher : watched_by
    Repository ||--o{ ForkRequest : receives
    Repository ||--o{ ShareLink : generates
    RepoItem ||--o{ FileVersion : versions
    Discussion ||--o{ DiscussionComment : comments
    Discussion ||--o{ DiscussionLike : likes
    Issue ||--o{ IssueComment : comments
    Issue ||--o{ IssueLabel : labels
    PullRequest ||--o{ PullRequestComment : comments
    User ||--o{ UserBan : banned_by
    User ||--o{ UserPenalty : penalized_by
    User ||--o{ Appeal : appeals
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Next.js 14 (App Router) | React 18, TypeScript |
| **样式** | Tailwind CSS | CSS Variables (GitHub 风格) |
| **后端** | Next.js API Routes | Route Handlers |
| **数据库** | PostgreSQL | Prisma ORM |
| **缓存** | Redis | 可选，用于速率限制 |
| **对象存储** | MinIO | S3 兼容，大文件存储 |
| **实时通信** | Server-Sent Events | 通知推送 |

---

## 快速开始

### 环境要求

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (或使用 Docker)

### 1. 克隆项目

```bash
git clone <repository-url>
cd cloud-drive
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`:

```env
# 数据库
DATABASE_URL="postgresql://postgres:5201314Chinese*@localhost:5432/github_platform"

# Redis (可选)
REDIS_URL="redis://localhost:6379"

# MinIO (S3 兼容)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="github-platform"

# JWT
NEXTAUTH_SECRET="your-secret-key-here"
JWT_SECRET="your-jwt-secret-here"

# 应用
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Docker 开发环境 (推荐)

项目完全在 Docker 中开发，无需本地安装 Node.js、MySQL 等依赖。

```bash
# 启动所有服务 (PostgreSQL + Redis + MinIO + App)
docker-compose up -d

# 查看日志
docker-compose logs -f

# 初始化数据库
docker-compose exec app npx prisma db push

# 初始化种子数据
docker-compose exec app npx prisma db seed
```

### 4. 本地开发 (不推荐)

如果需要在本地运行应用，需要先启动数据库服务：

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

---

## 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 应用 | http://localhost:3000 | 主应用 |
| 初始化 | http://localhost:3000/setup | 数据库初始化 |
| API 文档 | http://localhost:3000/api/docs | Swagger API 文档 |
| Prisma Studio | http://localhost:5432 | 数据库管理 |
| MinIO Console | http://localhost:9001 | 对象存储管理 |

### Docker 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存/速率限制 |
| MinIO API | 9000 | 对象存储 API |
| MinIO Console | 9001 | 对象存储管理界面 |

---

## 项目结构

```
cloud-drive/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # 认证页面 (登录/注册)
│   │   ├── (main)/              # 主应用页面
│   │   │   ├── admin/           # 管理后台
│   │   │   ├── discussions/     # 讨论区
│   │   │   ├── explore/         # 探索页面
│   │   │   ├── notifications/   # 通知列表
│   │   │   ├── settings/        # 用户设置
│   │   │   ├── share/           # 分享链接访问
│   │   │   └── [username]/      # 用户主页/仓库详情
│   │   └── api/                 # API 路由 (v1 统一格式, 137 个 route.ts)
│   ├── components/              # React 组件
│   │   ├── design/             # 设计系统组件 (Button/Card/Modal/PageLayout 等 11 个)
│   │   ├── layout/             # 布局组件 (Header/MainLayout/LeftSidebar/BottomNav)
│   │   ├── admin/              # 管理后台组件
│   │   ├── repo/               # 仓库相关组件 (FileTree/ChunkedUploader 等)
│   │   ├── common/             # 通用业务组件
│   │   ├── settings/           # 用户设置组件
│   │   ├── discussion/         # 讨论组件
│   │   └── user/               # 用户资料组件
│   ├── lib/                     # 工具库
│   │   ├── auth/               # JWT 认证 (双 Token 模式)
│   │   ├── api/                # 统一 API 响应 + 客户端
│   │   ├── framework/          # 声明式路由工厂 (认证/限流/CSRF/验证管道)
│   │   ├── security.ts         # XSS 防护 (DOMPurify)
│   │   ├── csrf.ts             # CSRF 防护
│   │   ├── rate-limit.ts       # Redis 令牌桶速率限制
│   │   ├── file-validator.ts   # 文件上传安全验证
│   │   └── ...
│   ├── services/                # 业务服务层 (13 个 service)
│   └── types/                   # TypeScript 类型
├── prisma/
│   ├── schema.prisma           # 数据模型 (42 个)
│   └── seed.ts                 # 种子数据
├── design-samples/              # 设计样本 (12 个 HTML 文件, 全站页面/弹窗)
├── 文档/                        # 中文文档 (开发规范/部署指南等)
├── docs/                        # 方案文档
├── docker-compose.yml          # 开发基础设施 (DB/Redis/MinIO)
├── docker-compose.prod.yml     # 生产部署
├── Dockerfile                  # 生产镜像
├── 项目报告.md                  # 完整项目报告
└── README.md
```

---

## API 文档

完整的 API 文档可通过 Swagger UI 访问：

```
http://localhost:3000/api/docs
```

### 主要 API 端点

| 分类 | 端点 | 说明 |
|------|------|------|
| **认证** | POST /api/auth/register | 用户注册 |
| | POST /api/auth/login | 用户登录 |
| | POST /api/auth/refresh | 刷新 Token |
| **用户** | GET /api/users/[username] | 获取用户信息 |
| | PUT /api/users/[username] | 更新用户信息 |
| | POST /api/users/avatar | 上传头像 |
| **仓库** | GET /api/repos/[username]/[repo] | 获取仓库详情 |
| | POST /api/repos | 创建仓库 |
| | POST /api/repos/[username]/[repo]/upload | 上传文件 |
| | POST /api/repos/[username]/[repo]/upload-chunked | 分片上传 |
| | POST /api/repos/[username]/[repo]/share | 生成分享链接 |
| **讨论** | GET /api/discussions | 获取讨论列表 |
| | POST /api/discussions | 创建讨论 |
| | POST /api/discussions/[id]/comments | 添加评论 |
| **通知** | GET /api/notifications | 获取通知列表 |
| | POST /api/notifications/stream | SSE 实时通知 |

---

## 开发规范

详细规范请查看 [项目报告.md](./项目报告.md) 和 [CLAUDE.md](./CLAUDE.md)。

### 代码规范

- 遵循 ESLint + TypeScript 严格模式
- 禁止使用 `any` 类型
- 遵循命名规范
- 组件使用 PascalCase，函数使用 camelCase

### Git 提交规范

```
<type>(<scope>): <subject>

# type: feat|fix|docs|style|refactor|test|chore
# scope: api|ui|db|auth|repo|notification

# 示例
feat(repo): 添加文件资源管理器组件
fix(api): 修复上传文件大小限制
docs(readme): 更新 README
```

### 开发检查清单

- [ ] 遵循 ESLint 规则，无 error
- [ ] 遵循 TypeScript 严格模式
- [ ] 功能完整实现，符合需求
- [ ] 有适当的错误处理
- [ ] 有必要的类型定义
- [ ] 有必要的测试
- [ ] 无调试代码残留

---

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 测试覆盖

| 测试文件 | 测试数量 | 说明 |
|----------|----------|------|
| auth.test.ts | 8个 | JWT 认证测试 |
| server.test.ts | 29个 | 服务器工具测试 |
| validation.test.ts | 34个 | 验证函数测试 |
| api-client.test.ts | 23个 | API 客户端测试 |
| cache.test.ts | 22个 | 缓存工具测试 |
| csrf.test.ts | 21个 | CSRF 防护测试 |
| security.test.ts | 36个 | 安全模块测试 |
| utils.test.ts | 31个 | 工具函数测试 |
| user-restrictions.test.ts | 16个 | 用户限制测试 |
| rate-limit.test.ts | 16个 | 速率限制测试 |
| **总计** | **236个** | **✅ 全部通过** |

---

## Docker 命令

```bash
# 开发环境（基础设施 + 应用在宿主机）
npm run dev:docker              # 一键启动

# 或分步启动
docker compose up -d            # 仅启动基础设施
npm run dev                     # 启动应用

# 生产环境
docker compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose logs -f app

# 进入容器
docker-compose exec app bash

# 重新构建
docker-compose build --no-cache

# 清理 (慎用，会删除数据)
docker-compose down -v
```

---

## 数据库管理

```bash
# 推送 schema 变更
npx prisma db push

# 生成 Client
npx prisma generate

# 打开 Prisma Studio
npx prisma studio

# 数据库迁移
npx prisma migrate dev

# 种子数据
npx prisma db seed
```

---

## 生产部署

详细部署指南请查看 [DEPLOY.md](docs/DEPLOY.md)。

### 快速部署

```bash
# 使用 Docker Compose
docker-compose up -d

# 使用 PM2 (需要先构建)
npm run build
pm2 start npm --name "cloud-drive" -- start
```

### 环境变量 (生产)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/github_platform
REDIS_URL=redis://host:6379
S3_ENDPOINT=https://your-s3-endpoint
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=github-platform
NEXTAUTH_SECRET=your-secret
JWT_SECRET=your-jwt-secret
```

---

## 安全

项目内置多层安全防护：

| 防护层 | 实现 |
|--------|------|
| XSS 防护 | `DOMPurify` HTML 净化 |
| CSRF 防护 | Origin 验证 + Token |
| 速率限制 | Redis 令牌桶算法 |
| 文件上传 | Magic Bytes 检测 |
| 敏感操作 | 二次确认验证 |

如需报告安全漏洞，请联系维护者。

---

## License

MIT License - see [LICENSE](LICENSE) 文件

---

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request
