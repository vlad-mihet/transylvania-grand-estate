-- AlterTable
ALTER TABLE "academy_enrollments" ALTER COLUMN "granted_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "academy_invitations" ADD COLUMN     "reminder_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "academy_users" ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "academy_email_verification_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_email_verification_tokens_token_hash_key" ON "academy_email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "academy_email_verification_tokens_user_id_idx" ON "academy_email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "academy_email_verification_tokens_expires_at_idx" ON "academy_email_verification_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "academy_email_verification_tokens" ADD CONSTRAINT "academy_email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "academy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
