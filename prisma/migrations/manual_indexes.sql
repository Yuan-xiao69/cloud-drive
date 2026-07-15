-- =====================================================================
-- 手动性能索引（Prisma schema 不支持定义 GIN 索引和部分复合索引）
-- =====================================================================
-- 这些索引在每次 migrate 后需要手动执行以保持数据库最佳性能。
--
-- 执行方式:
--   本地:  psql -d myblog -f prisma/migrations/manual_indexes.sql
--   Docker: docker-compose exec db psql -U postgres -d myblog -f /migrations/manual_indexes.sql
--
-- 幂等性: 所有 CREATE INDEX 均使用 IF NOT EXISTS，重复执行安全。
-- =====================================================================

-- 启用 pg_trgm 扩展（模糊搜索必需）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 仓库名称模糊搜索加速 ────────────────────────────────
-- Repository.name 的 LIKE/ILIKE 和相似度搜索需要 GIN 三元组索引
CREATE INDEX IF NOT EXISTS idx_repository_name_trgm
  ON "Repository" USING GIN (name gin_trgm_ops);

-- ── Issue 按仓库+编号查询加速 ───────────────────────────
-- 查询某个仓库下的 Issue 列表，按编号排序
-- 注意: schema 中 Issue 没有 number 字段，索引基于 (repoId, id) 近似加速
-- 若后续添加 number 字段，请调整为 ("repositoryId", "number")
CREATE INDEX IF NOT EXISTS idx_issue_repo_created
  ON "Issue" ("repositoryId", "createdAt" DESC);

-- ── 通知未读查询加速 ────────────────────────────────────
-- 用户拉取未读通知列表，按时间倒序
CREATE INDEX IF NOT EXISTS idx_notification_user_unread
  ON "Notification" ("userId", "isRead", "createdAt" DESC);

-- ── 文件树层级查询加速 ──────────────────────────────────
-- 仓库文件树递归查询：获取某仓库下未删除的文件/文件夹
CREATE INDEX IF NOT EXISTS idx_repoitem_tree
  ON "RepoItem" ("repoId", "isDeleted", "parentId", "depth");

-- ── 登录历史查询加速 ────────────────────────────────────
-- 用户登录历史按时间倒序分页
CREATE INDEX IF NOT EXISTS idx_loginhistory_user_time
  ON "LoginHistory" ("userId", "createdAt" DESC);

-- ── AsyncJob 消费者轮询加速 ──────────────────────────────
-- 后台任务消费者查询待处理的 pending 任务，按计划时间排序
-- PostgreSQL 部分索引：仅对 status='pending' 的行建索引，节省空间
CREATE INDEX IF NOT EXISTS idx_asyncjob_pending_time
  ON "async_job" ("status", "runAt")
  WHERE status = 'pending';
