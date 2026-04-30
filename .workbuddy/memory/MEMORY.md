# 长期记忆

## 用户编程准则

### 强制总则
- **严格遵守**，不准使用脚本批量修改代码，每一个功能的代码单独修改
- **不更换方案**，严格按照原方案执行，执行出错就停下交由用户决断
- 得到指令后严格审查项目，找到对应位置修改
- 每次开发都要全局思考，完善功能的调用、API 等，遇到问题交由用户决断
- **不准改变环境**，安装依赖不更换方案，失败输出原因交由用户决断
- **不准 Mock、空函数**，禁止任何 mock 和空函数体
- 每次改动保证对原项目改动最小，用户单独要求除外
- 使用临时测试文件后立即删除，不影响原项目

### 核心原则
1. **精确改动**：只修改目标代码块，不碰无关代码（空行、注释、import顺序）
2. **只许升高**：不降级 interface → any，不跳过类型校验，不简化错误处理
3. **先问后做**：不确定必须提问，不猜测文件路径（输出 [NEED CLARIFICATION]），改动清单前置
4. **报错驱动**：严格按堆栈定位，最小修复半径，报错优先于重构冲动，保留失败回溯逻辑
5. **禁止简化**：不简化功能、不 Mock 充数、不硬编码返回值、不 setTimeout 模拟异步
6. **原功能零阉割**：不删除/注释/弱化任何现有逻辑
7. **布局不可变**：不改变 DOM 结构、CSS 层级、响应式断点
8. **框架锁定**：不替换状态管理/路由/请求库等核心机制，保持原有数据流向
9. **生产级标准**：完整类型定义、错误处理、边界情况、空值处理、并发冲突考虑
10. **配置外部化**：不硬编码 URL、密钥、超时时间，使用环境变量

### 严格禁止
- ❌ 脚本批量修改代码
- ❌ `setTimeout` 模拟异步；❌ http 降级；❌ any 类型降级；❌ 空 catch 块；❌ == 代替 ===
- ❌ 移除原有性能优化逻辑（useMemo、shouldComponentUpdate 等）
- ❌ 替换框架核心机制（Redux/Vuex/axios 拦截器等）
- ❌ 删除/注释/跳过/弱化现有功能逻辑
- ❌ 改变页面布局和 DOM 结构（未经用户明确授权）
- ❌ 放宽调用约束（鉴权→公开、需token→无认证、HTTPS→HTTP）
- ❌ 硬编码假数据、placeholder 函数体（`// TODO: implement later`）
- ❌ 用 `console.log('调用成功')` 替代真实网络请求

### 自检清单（每次改动前必须检查）
- [ ] 是否删除了原有性能优化逻辑？
- [ ] 是否把严格相等 `===` 改成了抽象相等 `==`？
- [ ] 是否移除了函数签名中的可选参数？
- [ ] 是否引入了不必要的大型依赖？
- [ ] 新增代码是否包含完整的错误处理（非空 catch）？
- [ ] 是否有硬编码的环境配置？
- [ ] 原有测试是否仍能通过？

### 改动前必须做的事
1. 复述现有代码的依赖关系
2. 用一句话列出具体修改了哪些函数签名、增减了哪些依赖、修改了哪些配置键
3. 确认改动不破坏现有测试

---

## 项目概况

- **项目**：类似 GitHub 的仓库式知识托管与交流平台
- **路径**：`D:\XIANGMU\vs\my-blog`
- **技术栈**：Next.js 14 App Router + PostgreSQL + Redis + MinIO (S3兼容) + Prisma ORM
- **运行方式**：`npm run dev`（端口 3000/3001）；Mock 模式：`NEXT_PUBLIC_USE_MOCK=true`
- **用户偏好**：注重 UI/UX 细节，偏好极简干净界面（参考 QQ Music / GitHub）
- **习惯**：一次性提交多条需求，喜欢完整重载验证
- ⚠️ **严禁**在数据库上执行高负载诊断命令（不带 LIMIT 的大量扫描查询、pg_dump 大表等）

### Docker 配置
- PostgreSQL: 端口 5432，数据库 `github_platform`
- Redis: 端口 6379
- MinIO: 端口 9000/9001 (API/Console)

---

## 技术基础设施

| 分类 | 内容 |
|------|------|
| **Prisma Schema** | 38 个表（RepoFileChunk、ForkRequest、ShareLink、UserBlock、SystemConfig、ApiKey、Webhook 等） |
| **API 版本** | `src/app/api/v1/`，98 个端点已完成 |
| **API 基础** | `src/lib/api/v1/`（errors.ts / response.ts / pagination.ts / index.ts） |
| **CI/CD** | GitHub Actions（`.github/workflows/ci.yml` + `deploy.yml`） |
| **提交规范** | commitlint（Conventional Commits） |
| **测试** | ⚠️ 已移除（用户不需要测试代码） |

### 已完成页面（23个）
首页、登录、注册、忘记密码、重置密码、用户主页、仓库页面、文件预览、讨论区、讨论详情、创建讨论、个人设置、管理面板、探索页、搜索页、Issues 列表、Issues 详情、Pulls 列表、Pulls 详情、通知列表、我的仓库、分享预览页、创建讨论（new）

### 项目知识文档
- 位置：`文档/项目知识文档.md`（2026-04-28 生成）
- 覆盖：38 个数据模型、98+ API 端点、23 个页面、100+ 组件、40+ 工具函数

### 核心库文件
| 文件 | 功能 |
|------|------|
| `src/lib/auth/index.ts` | JWT 签发/验证、getAuthUser、requireAuth、requireAdmin、recordAuditLog |
| `src/lib/auth/server.ts` | Server Component 用的 auth() 函数 |
| `src/lib/cache.ts` | Redis 缓存工具，withCache，CacheKeys |
| `src/lib/security.ts` | XSS 净化、文件验证、安全工具函数 |
| `src/lib/security-config.ts` | 安全头、速率限制配置、CSRF 白名单 |
| `src/lib/csrf.ts` | CSRF 保护中间件、敏感操作验证 |
| `src/lib/rate-limit.ts` | 速率限制中间件（内存+Redis） |
| `src/lib/file-validator.ts` | Magic Bytes 检测、文件综合验证 |
| `src/lib/notification-service.ts` | SSE 通知推送、通知类型枚举、用户设置过滤 |
| `src/lib/user-restrictions.ts` | 禁言/仓库限制/存储限制检查 |
| `src/lib/api-client.ts` | 前端 API 请求封装、TokenManager |
| `src/lib/backup-service.ts` | pg_dump 备份、用户数据导出 |
| `src/lib/email-service.ts` | 多服务商邮件发送（QQ/阿里/SendGrid/Mailgun/SMTP）+ 加密配置 |
| `src/lib/redis-queue.ts` | Redis 邮件队列（入队/出队/状态/处理器） |
| `src/lib/activity-log.ts` | 用户操作日志记录 |
| `src/lib/validation.ts` | 表单验证规则、validators、schema |
| `src/lib/context.tsx` | ThemeProvider + AuthProvider React Context |
| `src/lib/utils/index.ts` | 前端工具函数（格式化、校验等） |
| `src/lib/utils/server.ts` | 后端兼容工具函数（apiSuccess/apiError/omit/bigIntToNumber） |

---

## 已完成功能模块

### 核心功能
- **分片上传**：RepoFileChunk 模型 + upload-chunked API + ChunkedUploader + FolderUploader + ChunkedUploadModal
- **Issues 系统**：列表页 + 详情页 + 评论 + 标签 + 状态管理
- **PullRequests 系统**：列表页 + 详情页 + 评论 + 合并/关闭/重开
- **文件预览增强**：行号跳转、代码折叠、行范围选择复制、RAW 视图、Markdown 渲染
- **导航体验**：面包屑导航、返回按钮/Backspace、路径层级跳转、分支选择器
- **通知系统**：SSE 实时通知 + 通知列表 + 12项可配置设置（Redis 缓存）
- **分享链接**：ShareLink 模型 + API + 分享预览页 + 管理 UI
- **Fork 申请+审批**：ForkRequest 模型 + API + 审批 UI + 通知推送 + 7天过期
- **处罚-申诉系统**：处罚列表显示关联申诉数量，申诉审批可撤销处罚

### 安全功能
- **安全加固**：XSS(DOMPurify)、CSRF(Origin+Token)、速率限制(令牌桶)、文件安全(Magic Bytes)
- **敏感操作二次验证**：`SENSITIVE_OPERATIONS` 配置 + `validateSensitiveOperation` 函数
  - `PUT /api/v1/users/password` - 修改密码
  - `DELETE /api/v1/users/[username]/delete` - 删除账号
  - `DELETE /api/v1/repos/[username]/[repoName]` - 删除仓库
  - `POST /api/v1/repos/[username]/[repoName]/transfer` - 仓库转移
- **两步验证(MFA)**：TOTP + 二维码(qrcode) + 恢复码，API: `/api/v1/users/mfa`

### 仓库高级功能
- **Git 分支感知**：RepoItem/RepoFileChunk 含 branchId，tree/upload/upload-chunked 支持 branch 参数
- **文件版本历史**：FileVersion 模型 + 版本列表/恢复 API + 版本历史查看
- **文件复制/恢复**：copy API（支持递归）、restore API（获取恢复列表）
- **仓库锁定/归档**：isLocked/isArchived 字段 + lock/archive API
- **仓库转移**：transfer API（完整所有权转移）

### 管理后台（12个增强组件）
- **DashboardEnhanced**：仪表盘增强（统计卡片、趋势图表、紧急通知、活动时间线）
- **UsersEnhanced**：用户管理增强（高级筛选、用户详情侧边栏、完整右键菜单）
- **ReposEnhanced**：仓库管理增强（高级筛选、仓库详情、完整右键菜单）
- **DiscussionsEnhanced**：讨论管理增强（精华/置顶、分类移动、完整右键菜单）
- **ReportsEnhanced**：举报管理增强（统计图表、详情面板、完整右键菜单）
- **PenaltiesEnhanced**：处罚管理增强（处罚模板、效果统计、完整右键菜单）
- **AppealsEnhanced**：申诉管理增强（统计卡片、详情面板、完整右键菜单）
- **IpBlacklistEnhanced**：IP黑名单增强（地理位置、访问统计、自动封禁规则）
- **SecurityEnhanced**：安全事件增强（仪表盘、分类、关联分析、报告）
- **AuditLogsEnhanced**：审计日志增强（筛选、导出、统计）
- **AnnouncementsEnhanced**：公告管理增强（预览、定时发布、效果追踪）
- **NotificationsEnhanced**：通知管理增强（群发、模板、统计）
- **MonitorEnhanced**：系统监控增强（系统概览、性能指标、数据库统计、自动刷新）
- **SystemSettingsEnhanced**：系统配置增强（用户/存储/安全/审核/仓库设置）

### 通用组件库
- `AdminCharts.tsx`：LineChart、BarChart、PieChart、RingProgress、MiniTrend
- `AdminCommon.tsx`：EnhancedStatCard、SidePanel、ConfirmDialog、Toast、ActivityTimeline、AdvancedFilter、BatchActionBar
- `BackButton`：可复用的返回按钮组件（支持 href/onClick/history.back）

### 其他功能
- **API 密钥管理**：ApiKey 模型 + 用户级 API 密钥 CRUD
- **Webhook 管理**：Webhook/WebhookDelivery 模型 + Webhook CRUD + 投递记录
- **系统设置 API**：`/admin/config`（用户注册/存储/安全/审核配置）

---

## 组件拆分记录

### 仓库页面（2026-04-26 完成）
- `page.tsx`：**2921 → ~1490 行**（减少 ~1431 行）
- `RepoCodeTab.tsx`（449行）：Code Tab 完整渲染
- `hooks/useRepoNavigation.ts`：路径导航
- `hooks/useRepoFiles.ts`：文件操作
- `hooks/useRepoUpload.ts`：上传逻辑
- `hooks/useRepoSelection.ts`：批量选择/右键菜单
- `hooks/RepoCodeTabContext.tsx`：Context 类型定义

### 管理面板（2026-05-08 完成）
- `useAdminHandlers.ts`（~750行）：提取所有内联处理函数
  - 用户管理、仓库管理、处罚管理、申诉管理、讨论管理、公告管理、封禁管理、邮件通知
- `AdminMonitorTab.tsx`：简化为包装组件，渲染 AdminMonitorEnhanced
- `AdminSystemSettingsTab.tsx`：简化为包装组件，实现配置加载保存

### Settings 组件（2026-05-08 完成）
- `modals/PasswordChangeModal.tsx`（180行）
- `modals/LoginHistoryModal.tsx`（250行）
- `modals/DeleteAccountModal.tsx`（200行）
- `modals/RepoDeleteModal.tsx`（60行）
- `modals/BlockUserModal.tsx`（75行）

---

## 历史 Bug 修复（重要教训）

| 问题 | 解决方案 |
|------|----------|
| 登录状态丢失 | access_token 改为 `httpOnly: false`；Cookie 含 `=` 需用 indexOf 解析 |
| Prisma 错误 | 移除 schema.prisma 的 `output` 配置；CLI 与 Client 版本须一致（均 5.22.0） |
| Admin 面板语法错误 | discussions tab 的 div 提前关闭（第 1404 行） |
| 权限检查错误 | 封禁 API role 判断需用 `super_admin`；Next.js 14 params 需 await |
| 通知模块错误 | `apiUnauthorized`→`apiError`；`verifyToken`→`verifyAccessToken`；`requireAdmin(token)`→`requireAdmin(request)` |

---

## 数据库操作注意
- 修改 schema 后：重启开发服务器 → `npx prisma generate`
- Docker 环境执行 SQL：`docker exec <container> psql -U postgres -d github_platform -c "..."`

---

## 文档目录规范
- **统一路径**：`D:\XIANGMU\vs\my-blog\文档\`（所有项目文档必须存放于此）
- **归档子目录**：`文档/docs-ARCHIVED/`（旧方案文档）
- ⚠️ 以后创建任何文档都必须放在 `文档/` 目录下，不得在项目根目录或 src/ 下新建文档

---

## 待开发（远期）
- 78 项进阶功能详见 `文档/功能完整性审计报告.md` 第九章

---

## 安全问题排查（2026-04-29）

### rate-limit.ts 主要问题（已修复）
1. 🔴 P1：X-Forwarded-For 伪造（第26-47行）→ ✅ 已修复：添加 TRUSTED_PROXIES 配置 + IP 验证
2. 🟡 P2：内存存储无上限（第9行）→ ✅ 已修复：添加 LRU 淘汰策略（默认 10000 条）
3. 🟡 P2：cleanup() 同步阻塞（第14-21行、74行调用）→ ✅ 已修复：定时清理（60秒间隔）
4. 🟡 P2：RedisRateLimiter 类是死代码（第185-277行）→ ✅ 已修复：集成到 checkRateLimit

### cache.ts 主要问题（已修复）
1. 🔴 P1：JSON.stringify 可能抛异常（第186行）→ ✅ 已修复：try-catch 包裹
2. 🔴 P1：KEYS 命令阻塞 Redis（第218行）→ ✅ 已修复：改用 SCAN 命令
3. 🟡 P2：逐个删除 key（第223-226行）→ ✅ 已修复：使用 pipeline 批量删除

### 详细报告
- `文档/rate-limit_cache问题排查.md`
