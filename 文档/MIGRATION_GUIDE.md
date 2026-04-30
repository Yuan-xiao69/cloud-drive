# 数据库迁移指南

## 当前迁移状态

**当前迁移版本**: `20260416052632_init`
**迁移数量**: 1 个初始迁移
**包含内容**: 38 个数据表完整结构

---

## 如何创建增量迁移

### 方式一：使用 Prisma CLI（推荐）

```bash
# 1. 确保 schema.prisma 已更新
# 2. 运行以下命令创建新迁移
npm run db:migrate

# 或指定迁移名称
npx prisma migrate dev --name add_new_field
```

### 方式二：手动创建迁移文件

如果你需要手动创建迁移（例如生产环境），按以下步骤：

1. 在 `prisma/migrations/` 下创建新目录：
   ```
   prisma/migrations/YYYYMMDDHHMMSS_migration_name/
   ```

2. 创建 `migration.sql` 文件

3. 更新 `migration_lock.toml`（如有需要）

### 方式三：使用 db push（开发环境）

对于开发环境的快速变更：

```bash
npm run db:push
```

---

## 迁移最佳实践

### 1. 开发环境
```bash
# 修改 schema.prisma 后
npm run db:migrate

# 或快速同步（不创建迁移文件）
npm run db:push
```

### 2. 生产环境
```bash
# 生成 SQL 脚本
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script > migration.sql

# 手动审核后执行
psql -U postgres -d github_platform -f migration.sql
```

### 3. 部署前检查清单
- [ ] 迁移文件已创建
- [ ] `prisma generate` 已运行
- [ ] 已在测试环境验证
- [ ] 回滚方案已准备

---

## 数据库表清单（初始迁移）

| 表名 | 说明 | 行数 |
|------|------|------|
| User | 用户表 | ~ |
| Repository | 仓库表 | ~ |
| RepoItem | 文件/文件夹表 | ~ |
| RepoFileChunk | 文件分片表 | ~ |
| Star | 收藏表 | ~ |
| Watcher | 关注表 | ~ |
| Discussion | 讨论表 | ~ |
| DiscussionComment | 讨论评论表 | ~ |
| DiscussionLike | 讨论点赞表 | ~ |
| Report | 举报表 | ~ |
| AdminAuditLog | 审计日志表 | ~ |
| LoginHistory | 登录历史表 | ~ |
| Issue | Issue 表 | ~ |
| IssueComment | Issue 评论表 | ~ |
| IssueLabel | Issue 标签表 | ~ |
| PullRequest | Pull Request 表 | ~ |
| PullRequestComment | PR 评论表 | ~ |
| Notification | 通知表 | ~ |
| UserBan | 用户封禁表 | ~ |
| UserPenalty | 用户处罚表 | ~ |
| Appeal | 申诉表 | ~ |
| ShareLink | 分享链接表 | ~ |
| ForkRequest | Fork 申请表 | ~ |
| UserFollow | 用户关注表 | ~ |
| UserBlock | 用户黑名单表 | ~ |
| ApiKey | API 密钥表 | ~ |
| Webhook | Webhook 表 | ~ |
| WebhookDelivery | Webhook 投递记录表 | ~ |
| FileVersion | 文件版本表 | ~ |
| SystemConfig | 系统配置表 | ~ |
| IpBlacklist | IP 黑名单表 | ~ |
| EmailQueue | 邮件队列表 | ~ |
| ActivityLog | 活动日志表 | ~ |

---

## 回滚指南

### 从备份恢复
```bash
# 如果部署失败，从备份恢复
docker exec -i postgres_container psql -U postgres -d github_platform < backup.sql
```

### Prisma 回滚
```bash
# 回滚到最后一次迁移
npx prisma migrate resolve --rolled-back 20260416052632_init
```

---

## 相关文档

- [Prisma 官方迁移文档](https://www.prisma.io/docs/guides/database/developing-databases-with-prisma-migrate)
- [项目 README.md](../README.md)
- [Docker 开发指南](../DOCKER_DEV_GUIDE.md)
