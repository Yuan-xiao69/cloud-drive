# 变更日志

所有重要的项目变更都将记录在此文件中。

变更日志遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，
并使用 [Semantic Versioning](https://semver.org/lang/zh-CN/) 进行版本控制。

## [未发布] - YYYY-MM-DD

### 新增
- 描述新添加的功能

### 更改
- 描述功能变更

### 修复
- 描述已修复的 Bug

### 移除
- 描述已移除的功能

---

## [1.0.0] - 2026-04-26

### 新增
- **核心功能**
  - 用户认证系统（注册、登录、登出、JWT）
  - 两步验证（MFA）支持
  - 仓库管理（创建、删除、Fork）
  - 文件上传和预览
  - 分片上传支持大文件
  - 文件版本历史
  - 文件复制和恢复
  - 代码预览（语法高亮）
  - Markdown 渲染
  - 文件分享链接
  
- **社交功能**
  - 用户关注系统
  - 用户黑名单
  - Star 和 Watch 仓库
  - 讨论区系统
  - 评论和点赞
  - Issues 管理
  - Pull Requests 系统
  
- **通知系统**
  - 实时 SSE 通知
  - 12 项可配置通知设置
  - Redis 缓存
  
- **管理后台**
  - 用户管理（封禁、权限）
  - 仓库管理
  - 讨论审核
  - 举报处理
  - 处罚和申诉系统
  - 系统配置
  - 监控面板
  - 数据库统计
  - IP 黑名单
  - API 密钥管理
  - Webhook 管理
  
- **安全功能**
  - XSS 防护（DOMPurify）
  - CSRF 保护
  - 速率限制（令牌桶）
  - 文件安全验证（Magic Bytes）
  - 敏感操作二次验证
  - 审计日志
  - 活动日志
  
- **DevOps**
  - Docker Compose 多环境配置
  - PostgreSQL 数据库
  - Redis 缓存和队列
  - MinIO S3 兼容存储
  - 邮件队列系统
  - 数据库备份

### 更改
- 使用 Next.js 14 App Router
- Prisma ORM 数据库操作
- Tailwind CSS 样式
- Lucide React 图标
- Zod 表单验证
- TypeScript 类型安全

### 技术栈
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Prisma ORM
- Database: PostgreSQL, Redis
- Storage: MinIO (S3 Compatible)
- Testing: Vitest

---

## 提交信息规范

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

feat(api): 添加新的用户注册接口
fix(auth): 修复登录状态丢失问题
docs(readme): 更新项目说明
refactor(repo): 重构文件上传逻辑
perf(upload): 优化大文件上传速度
```

### Type 类型
| Type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式 |
| refactor | 重构 |
| perf | 性能优化 |
| build | 构建相关 |
| ci | CI/CD |
| chore | 其他更改 |
| revert | 回滚 |

### Scope 范围
- api, auth, user, repo, discussion, notification
- admin, db, docker, i18n, ui, utils

---

## 版本标签

- `[major]` - 破坏性更新，不兼容的 API 变更
- `[minor]` - 新功能，向后兼容
- `[patch]` - Bug 修复，向后兼容

[未发布]: https://github.com/WYD915520/cloud-drive/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/WYD915520/cloud-drive/releases/tag/v1.0.0
