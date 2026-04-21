-- CreateTable
CREATE TABLE "revoked_tokens" (
    "jti" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "revoked_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "revoked_tokens_admin_user_id_idx" ON "revoked_tokens"("admin_user_id");

-- CreateIndex
CREATE INDEX "revoked_tokens_revoked_at_idx" ON "revoked_tokens"("revoked_at");
