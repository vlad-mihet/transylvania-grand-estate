-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE 'BOUNCED';

-- AlterTable
ALTER TABLE "invitations"
  ADD COLUMN "email_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "email_last_attempt_at" TIMESTAMP(3),
  ADD COLUMN "resend_email_id" TEXT,
  ADD COLUMN "bounced_at" TIMESTAMP(3),
  ADD COLUMN "bounce_reason" TEXT,
  ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "invitations_status_email_sent_at_idx" ON "invitations"("status", "email_sent_at");

-- CreateIndex
CREATE INDEX "invitations_resend_email_id_idx" ON "invitations"("resend_email_id");

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_admin_user_id_idx" ON "password_reset_tokens"("admin_user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
