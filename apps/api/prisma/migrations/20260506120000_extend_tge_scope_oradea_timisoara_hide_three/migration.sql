-- Extend the TGE landing geo scope to surface Oradea (Bihor) and Timișoara
-- (Timiș), and hide three Transylvanian cities the brand no longer wants
-- featured (Miercurea Ciuc, Reghin, Sfântu Gheorghe). Sister edits to the
-- precedent set in 20260427120000_add_tge_hidden_cities, which seeded
-- 'tarnaveni' the same way — that entry is preserved by the dedupe-sort.
--
-- Idempotent: each UPDATE concatenates the desired slugs onto the current
-- array, then DISTINCT-unnests + ORDERs so re-running is a no-op and any
-- prior admin edit that already added one of these slugs is preserved.

UPDATE "site_config"
SET "tge_county_scope" = (
  SELECT ARRAY(
    SELECT DISTINCT unnest("tge_county_scope" || ARRAY['bihor', 'timis'])
    ORDER BY 1
  )
)
WHERE "id" = 'singleton';

UPDATE "site_config"
SET "tge_hidden_cities" = (
  SELECT ARRAY(
    SELECT DISTINCT unnest("tge_hidden_cities" || ARRAY['miercurea-ciuc', 'reghin', 'sfantu-gheorghe'])
    ORDER BY 1
  )
)
WHERE "id" = 'singleton';
