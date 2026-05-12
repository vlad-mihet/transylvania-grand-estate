-- Phase 2 — Stage 2.0c. Cross-realm FK formalisation.
-- Three columns previously left as bare strings ("cross-surface
-- references without an FK") get database-level enforcement now.
-- ON DELETE SET NULL preserves the dependent row + its history when
-- the referenced AdminUser is removed (matches Invitation.invitedById
-- semantics and AuditLog.actorId).
--
-- Pre-flight verified zero orphans in dev:
--   SELECT COUNT(*) FROM <table> WHERE <ById> IS NOT NULL
--     AND <ById> NOT IN (SELECT id FROM admin_users)  -- = 0 for all 3
--
-- Rollback: DROP CONSTRAINT for each of the 3 constraints. Rows stay
-- intact; columns revert to bare-string semantics. See
-- `phase-2-schema-fusion.md` Prep-2.

-- AddForeignKey: AcademyEnrollment.granted_by_id → admin_users.id
ALTER TABLE "academy_enrollments"
  ADD CONSTRAINT "academy_enrollments_granted_by_id_fkey"
  FOREIGN KEY ("granted_by_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LessonAttachment.uploaded_by_id → admin_users.id
ALTER TABLE "lesson_attachments"
  ADD CONSTRAINT "lesson_attachments_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: AcademyInvitation.invited_by_id → admin_users.id
ALTER TABLE "academy_invitations"
  ADD CONSTRAINT "academy_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
