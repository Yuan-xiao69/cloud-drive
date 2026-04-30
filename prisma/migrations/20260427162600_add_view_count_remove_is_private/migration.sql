-- Migration: add_view_count_remove_is_private
-- Description: 添加 view_count 字段用于统计仓库浏览量，删除 is_private 字段，统一使用 visibility Int 类型

-- 1. 添加 view_count 字段
ALTER TABLE "Repository" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;

-- 2. 删除 is_private 字段
ALTER TABLE "Repository" DROP COLUMN IF EXISTS "is_private";
