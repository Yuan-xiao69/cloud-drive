-- AlterTable
ALTER TABLE "Discussion" ADD COLUMN     "is_wiki" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "FileVersion" DROP COLUMN "content",
ADD COLUMN     "storage_path" VARCHAR(500);

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "assignee_id" TEXT,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
ADD COLUMN     "related_file_id" TEXT,
ADD COLUMN     "template_type" VARCHAR(20);

-- AlterTable
ALTER TABLE "RepoItem" DROP COLUMN "content";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "subscriber" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "targetType" VARCHAR(20) NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" VARCHAR(20) NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repo_collaborator" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'write',
    "invited_by" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repo_collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "async_job" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "async_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriber_targetType_target_id_idx" ON "subscriber"("targetType", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriber_user_id_targetType_target_id_key" ON "subscriber"("user_id", "targetType", "target_id");

-- CreateIndex
CREATE INDEX "repo_collaborator_repo_id_idx" ON "repo_collaborator"("repo_id");

-- CreateIndex
CREATE INDEX "repo_collaborator_user_id_idx" ON "repo_collaborator"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "repo_collaborator_repo_id_user_id_key" ON "repo_collaborator"("repo_id", "user_id");

-- CreateIndex
CREATE INDEX "async_job_status_run_at_idx" ON "async_job"("status", "run_at");

-- CreateIndex
CREATE INDEX "async_job_type_idx" ON "async_job"("type");

-- CreateIndex
CREATE INDEX "Issue_assignee_id_idx" ON "Issue"("assignee_id");

-- CreateIndex
CREATE INDEX "Issue_priority_idx" ON "Issue"("priority");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriber" ADD CONSTRAINT "subscriber_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_collaborator" ADD CONSTRAINT "repo_collaborator_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_collaborator" ADD CONSTRAINT "repo_collaborator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repo_collaborator" ADD CONSTRAINT "repo_collaborator_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
