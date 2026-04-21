-- Phase A4: production-grade audit columns. All nullable so deploys can roll
-- forward without a backfill — older interceptor builds keep writing rows
-- that just leave the new columns null.

ALTER TABLE "audit_logs"
  ADD COLUMN "diff"         JSONB,
  ADD COLUMN "request_id"   TEXT,
  ADD COLUMN "ip_hash"      TEXT,
  ADD COLUMN "user_agent"   TEXT,
  ADD COLUMN "method"       VARCHAR(10),
  ADD COLUMN "url"          TEXT,
  ADD COLUMN "status"       INTEGER,
  ADD COLUMN "brand"        VARCHAR(32),
  ADD COLUMN "retain_until" TIMESTAMP(3);

CREATE INDEX "audit_logs_resource_created_at_idx" ON "audit_logs"("resource", "created_at");
CREATE INDEX "audit_logs_created_at_idx"          ON "audit_logs"("created_at");
CREATE INDEX "audit_logs_brand_created_at_idx"    ON "audit_logs"("brand", "created_at");
CREATE INDEX "audit_logs_request_id_idx"          ON "audit_logs"("request_id");
