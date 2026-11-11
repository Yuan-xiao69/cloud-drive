-- AlterTable: add avatar_version column with default 1
ALTER TABLE "User" ADD COLUMN "avatar_version" INTEGER NOT NULL DEFAULT 1;
