-- Phase 5.2 — backfill Property.city_id from the denormalized city_slug.
-- Safe to run multiple times (NULL-guarded). The API read path now uses
-- `cityRef` so rows without city_id won't appear in filtered results.
--
-- Apply with: `psql $DATABASE_URL -f apps/api/prisma/backfill-city-county-ids.sql`
-- Or drop into a Prisma custom migration folder and run `prisma migrate deploy`.
--
-- Property has no direct county_id column; county filtering continues via
-- `countySlug` until a schema migration adds a Property.countyId FK.

UPDATE properties p
SET city_id = c.id
FROM cities c
WHERE p.city_slug = c.slug
  AND p.city_id IS NULL;

-- Post-backfill sanity — should return 0:
--   SELECT count(*) FROM properties WHERE city_id IS NULL AND city_slug IS NOT NULL;
