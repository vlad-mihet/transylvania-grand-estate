-- City-slug denylist for the TGE_LUXURY landing site. Sister concept to
-- `tge_county_scope`: counties stay allowlisted, but specific cities can be
-- hidden without dropping their whole county. Reveria and Admin ignore this
-- column. Default is the empty array so any future `INSERT` that omits the
-- field stays in the legacy "show everything in scope" state.
ALTER TABLE "site_config"
  ADD COLUMN "tge_hidden_cities" TEXT[] NOT NULL DEFAULT '{}';

-- Initial denylist: drop Târnăveni (Mureș county) from the TGE landing site
-- per stakeholder request. Mureș itself stays in `tge_county_scope` because
-- Târgu Mureș, Sighișoara and Reghin still belong on TGE.
UPDATE "site_config"
SET "tge_hidden_cities" = ARRAY['tarnaveni']
WHERE "id" = 'singleton';
