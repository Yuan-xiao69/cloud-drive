-- AlterTable
ALTER TABLE "AdminAuditLog" ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "RepoItem" ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "content" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT,
ADD COLUMN     "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hash" VARCHAR(64),
ADD COLUMN     "path" VARCHAR(2000),
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Repository" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uid" VARCHAR(9),
ALTER COLUMN "avatar_url" SET DATA TYPE VARCHAR(2000);

-- CreateTable
CREATE TABLE "UserBan" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "banner_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ban_type" VARCHAR(20) NOT NULL DEFAULT 'permanent',
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "unban_reason" TEXT,
    "unbanned_at" TIMESTAMP(3),
    "unbanned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "link_url" VARCHAR(500),
    "priority" VARCHAR(10) NOT NULL DEFAULT 'normal',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileVersion" (
    "id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "file_hash" VARCHAR(64),
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "change_size" BIGINT NOT NULL DEFAULT 0,
    "version_message" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoFileChunk" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "upload_id" VARCHAR(100) NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "chunk_hash" VARCHAR(64) NOT NULL,
    "chunkData" TEXT NOT NULL,
    "chunk_size" INTEGER NOT NULL,
    "total_chunks" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "parent_path" VARCHAR(2000) NOT NULL,
    "total_size" BIGINT NOT NULL,
    "mime_type" VARCHAR(100),
    "user_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoFileChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionLike" (
    "id" TEXT NOT NULL,
    "discussion_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueComment" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueLabel" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(10) NOT NULL DEFAULT '#0075ca',

    CONSTRAINT "IssueLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "source_branch" VARCHAR(100) NOT NULL,
    "target_branch" VARCHAR(100) NOT NULL,
    "source_repo_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestComment" (
    "id" TEXT NOT NULL,
    "pull_request_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivityLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_name" TEXT,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "file_size" BIGINT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'success',
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiddenContent" (
    "id" TEXT NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "hidden_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "restored_at" TIMESTAMP(3),
    "restored_by" TEXT,
    "restore_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiddenContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPenalty" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "penalty_type" VARCHAR(30) NOT NULL,
    "reason" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "applied_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "removed_by" TEXT,
    "remove_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "template_id" TEXT,

    CONSTRAINT "UserPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyTemplate" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "penalty_type" VARCHAR(30) NOT NULL,
    "default_duration" INTEGER DEFAULT 7,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PenaltyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyNote" (
    "id" TEXT NOT NULL,
    "penalty_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PenaltyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "appeal_type" VARCHAR(20) NOT NULL,
    "target_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewer_id" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'info',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'info',
    "user_id" TEXT,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "details" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPBlacklist" (
    "id" TEXT NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "ip_range" VARCHAR(50),
    "reason" TEXT NOT NULL,
    "event_id" TEXT,
    "added_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IPBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "repo_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "path" VARCHAR(2000),
    "permission" VARCHAR(20) NOT NULL DEFAULT 'read',
    "password" VARCHAR(255),
    "expires_at" TIMESTAMP(3),
    "max_views" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fork_request" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "message" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fork_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "key_prefix" VARCHAR(8) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expires_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "last_ip" VARCHAR(45),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "url" VARCHAR(2000) NOT NULL,
    "secret" VARCHAR(255),
    "content_type" VARCHAR(20) NOT NULL DEFAULT 'json',
    "events" TEXT[] DEFAULT ARRAY['push']::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "last_status" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event" VARCHAR(50) NOT NULL,
    "payload" TEXT NOT NULL,
    "response" TEXT,
    "status_code" INTEGER,
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBan_user_id_idx" ON "UserBan"("user_id");

-- CreateIndex
CREATE INDEX "UserBan_banner_id_idx" ON "UserBan"("banner_id");

-- CreateIndex
CREATE INDEX "UserBan_is_active_idx" ON "UserBan"("is_active");

-- CreateIndex
CREATE INDEX "UserBan_expires_at_idx" ON "UserBan"("expires_at");

-- CreateIndex
CREATE INDEX "Notification_user_id_idx" ON "Notification"("user_id");

-- CreateIndex
CREATE INDEX "Notification_sender_id_idx" ON "Notification"("sender_id");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Branch_repo_id_idx" ON "Branch"("repo_id");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_repo_id_name_key" ON "Branch"("repo_id", "name");

-- CreateIndex
CREATE INDEX "FileVersion_file_id_idx" ON "FileVersion"("file_id");

-- CreateIndex
CREATE INDEX "FileVersion_created_at_idx" ON "FileVersion"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "FileVersion_file_id_version_key" ON "FileVersion"("file_id", "version");

-- CreateIndex
CREATE INDEX "RepoFileChunk_repo_id_idx" ON "RepoFileChunk"("repo_id");

-- CreateIndex
CREATE INDEX "RepoFileChunk_upload_id_idx" ON "RepoFileChunk"("upload_id");

-- CreateIndex
CREATE INDEX "RepoFileChunk_branch_id_idx" ON "RepoFileChunk"("branch_id");

-- CreateIndex
CREATE INDEX "RepoFileChunk_expires_at_idx" ON "RepoFileChunk"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "RepoFileChunk_upload_id_chunk_index_key" ON "RepoFileChunk"("upload_id", "chunk_index");

-- CreateIndex
CREATE INDEX "DiscussionLike_discussion_id_idx" ON "DiscussionLike"("discussion_id");

-- CreateIndex
CREATE INDEX "DiscussionLike_user_id_idx" ON "DiscussionLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionLike_discussion_id_user_id_key" ON "DiscussionLike"("discussion_id", "user_id");

-- CreateIndex
CREATE INDEX "PasswordReset_email_code_idx" ON "PasswordReset"("email", "code");

-- CreateIndex
CREATE INDEX "PasswordReset_user_id_idx" ON "PasswordReset"("user_id");

-- CreateIndex
CREATE INDEX "Issue_repository_id_status_idx" ON "Issue"("repository_id", "status");

-- CreateIndex
CREATE INDEX "Issue_author_id_idx" ON "Issue"("author_id");

-- CreateIndex
CREATE INDEX "IssueComment_issue_id_created_at_idx" ON "IssueComment"("issue_id", "created_at");

-- CreateIndex
CREATE INDEX "IssueLabel_issue_id_idx" ON "IssueLabel"("issue_id");

-- CreateIndex
CREATE INDEX "PullRequest_repository_id_status_idx" ON "PullRequest"("repository_id", "status");

-- CreateIndex
CREATE INDEX "PullRequest_author_id_idx" ON "PullRequest"("author_id");

-- CreateIndex
CREATE INDEX "PullRequestComment_pull_request_id_created_at_idx" ON "PullRequestComment"("pull_request_id", "created_at");

-- CreateIndex
CREATE INDEX "UserActivityLog_user_id_created_at_idx" ON "UserActivityLog"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "UserActivityLog_action_created_at_idx" ON "UserActivityLog"("action", "created_at");

-- CreateIndex
CREATE INDEX "UserActivityLog_target_type_target_id_idx" ON "UserActivityLog"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "UserActivityLog_created_at_idx" ON "UserActivityLog"("created_at");

-- CreateIndex
CREATE INDEX "HiddenContent_target_type_target_id_idx" ON "HiddenContent"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "HiddenContent_hidden_by_idx" ON "HiddenContent"("hidden_by");

-- CreateIndex
CREATE INDEX "HiddenContent_is_active_idx" ON "HiddenContent"("is_active");

-- CreateIndex
CREATE INDEX "UserPenalty_user_id_idx" ON "UserPenalty"("user_id");

-- CreateIndex
CREATE INDEX "UserPenalty_penalty_type_idx" ON "UserPenalty"("penalty_type");

-- CreateIndex
CREATE INDEX "UserPenalty_is_active_idx" ON "UserPenalty"("is_active");

-- CreateIndex
CREATE INDEX "UserPenalty_expires_at_idx" ON "UserPenalty"("expires_at");

-- CreateIndex
CREATE INDEX "PenaltyTemplate_penalty_type_idx" ON "PenaltyTemplate"("penalty_type");

-- CreateIndex
CREATE INDEX "PenaltyTemplate_is_active_idx" ON "PenaltyTemplate"("is_active");

-- CreateIndex
CREATE INDEX "PenaltyNote_penalty_id_idx" ON "PenaltyNote"("penalty_id");

-- CreateIndex
CREATE INDEX "Appeal_user_id_idx" ON "Appeal"("user_id");

-- CreateIndex
CREATE INDEX "Appeal_appeal_type_idx" ON "Appeal"("appeal_type");

-- CreateIndex
CREATE INDEX "Appeal_status_idx" ON "Appeal"("status");

-- CreateIndex
CREATE INDEX "Appeal_created_at_idx" ON "Appeal"("created_at");

-- CreateIndex
CREATE INDEX "Announcement_is_active_idx" ON "Announcement"("is_active");

-- CreateIndex
CREATE INDEX "Announcement_is_pinned_idx" ON "Announcement"("is_pinned");

-- CreateIndex
CREATE INDEX "Announcement_expires_at_idx" ON "Announcement"("expires_at");

-- CreateIndex
CREATE INDEX "SecurityEvent_event_type_idx" ON "SecurityEvent"("event_type");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_status_idx" ON "SecurityEvent"("status");

-- CreateIndex
CREATE INDEX "SecurityEvent_ip_address_idx" ON "SecurityEvent"("ip_address");

-- CreateIndex
CREATE INDEX "SecurityEvent_created_at_idx" ON "SecurityEvent"("created_at");

-- CreateIndex
CREATE INDEX "IPBlacklist_ip_address_idx" ON "IPBlacklist"("ip_address");

-- CreateIndex
CREATE INDEX "IPBlacklist_is_active_idx" ON "IPBlacklist"("is_active");

-- CreateIndex
CREATE INDEX "IPBlacklist_expires_at_idx" ON "IPBlacklist"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_repo_id_idx" ON "ShareLink"("repo_id");

-- CreateIndex
CREATE INDEX "ShareLink_creator_id_idx" ON "ShareLink"("creator_id");

-- CreateIndex
CREATE INDEX "ShareLink_is_active_idx" ON "ShareLink"("is_active");

-- CreateIndex
CREATE INDEX "ShareLink_expires_at_idx" ON "ShareLink"("expires_at");

-- CreateIndex
CREATE INDEX "fork_request_repo_id_status_idx" ON "fork_request"("repo_id", "status");

-- CreateIndex
CREATE INDEX "fork_request_requester_id_idx" ON "fork_request"("requester_id");

-- CreateIndex
CREATE INDEX "fork_request_expires_at_idx" ON "fork_request"("expires_at");

-- CreateIndex
CREATE INDEX "UserFollow_follower_id_idx" ON "UserFollow"("follower_id");

-- CreateIndex
CREATE INDEX "UserFollow_following_id_idx" ON "UserFollow"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_follower_id_following_id_key" ON "UserFollow"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "UserBlock_blocker_id_idx" ON "UserBlock"("blocker_id");

-- CreateIndex
CREATE INDEX "UserBlock_blocked_id_idx" ON "UserBlock"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blocker_id_blocked_id_key" ON "UserBlock"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "ApiKey_user_id_idx" ON "ApiKey"("user_id");

-- CreateIndex
CREATE INDEX "ApiKey_key_hash_idx" ON "ApiKey"("key_hash");

-- CreateIndex
CREATE INDEX "ApiKey_is_active_idx" ON "ApiKey"("is_active");

-- CreateIndex
CREATE INDEX "ApiKey_expires_at_idx" ON "ApiKey"("expires_at");

-- CreateIndex
CREATE INDEX "Webhook_repo_id_idx" ON "Webhook"("repo_id");

-- CreateIndex
CREATE INDEX "Webhook_user_id_idx" ON "Webhook"("user_id");

-- CreateIndex
CREATE INDEX "Webhook_is_active_idx" ON "Webhook"("is_active");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhook_id_idx" ON "WebhookDelivery"("webhook_id");

-- CreateIndex
CREATE INDEX "WebhookDelivery_created_at_idx" ON "WebhookDelivery"("created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_user_id_idx" ON "AdminAuditLog"("user_id");

-- CreateIndex
CREATE INDEX "RepoItem_repo_id_branch_id_idx" ON "RepoItem"("repo_id", "branch_id");

-- CreateIndex
CREATE INDEX "RepoItem_branch_id_parent_id_idx" ON "RepoItem"("branch_id", "parent_id");

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBan" ADD CONSTRAINT "UserBan_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_forked_from_id_fkey" FOREIGN KEY ("forked_from_id") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoItem" ADD CONSTRAINT "RepoItem_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "RepoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoFileChunk" ADD CONSTRAINT "RepoFileChunk_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoFileChunk" ADD CONSTRAINT "RepoFileChunk_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionLike" ADD CONSTRAINT "DiscussionLike_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionLike" ADD CONSTRAINT "DiscussionLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueComment" ADD CONSTRAINT "IssueComment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLabel" ADD CONSTRAINT "IssueLabel_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_source_repo_id_fkey" FOREIGN KEY ("source_repo_id") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestComment" ADD CONSTRAINT "PullRequestComment_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestComment" ADD CONSTRAINT "PullRequestComment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivityLog" ADD CONSTRAINT "UserActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPenalty" ADD CONSTRAINT "UserPenalty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPenalty" ADD CONSTRAINT "UserPenalty_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "PenaltyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPenalty" ADD CONSTRAINT "UserPenalty_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyNote" ADD CONSTRAINT "PenaltyNote_penalty_id_fkey" FOREIGN KEY ("penalty_id") REFERENCES "UserPenalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPBlacklist" ADD CONSTRAINT "IPBlacklist_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "SecurityEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fork_request" ADD CONSTRAINT "fork_request_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fork_request" ADD CONSTRAINT "fork_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fork_request" ADD CONSTRAINT "fork_request_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
