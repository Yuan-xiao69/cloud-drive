-- AlterTable: add avatar_version column with default 1
ALTER TABLE "users" ADD COLUMN "avatar_version" INTEGER NOT NULL DEFAULT 1;
