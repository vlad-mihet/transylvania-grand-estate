-- CRM sync runner lock (leased, cross-instance).
--
-- Replaces the session-scoped pg_try_advisory_lock, which is unreliable under
-- Prisma's connection pool: acquire and unlock can run on different pooled
-- connections, so the unlock misses and the lock leaks — silently stopping all
-- future syncs. This is a leased row keyed on `source`:
--   owner        per-run nonce; only the owner heartbeats / releases
--   expires_at   heartbeated forward while the run is live; an expired lease
--                (crashed run) is atomically taken over by the next run.
CREATE TABLE "crm_sync_locks" (
  "source"      TEXT         NOT NULL,
  "owner"       TEXT         NOT NULL,
  "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "crm_sync_locks_pkey" PRIMARY KEY ("source")
);
