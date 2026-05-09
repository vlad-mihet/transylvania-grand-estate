-- Phase 1 of the brand-scoped cities & counties overhaul.
-- Introduces a per-entity brand membership model (M2N) so each City and
-- County can be tagged independently for TGE / REVERY visibility, replacing
-- the legacy SiteConfig.tgeCountyScope allowlist + tgeHiddenCities denylist
-- + hardcoded REVERY_HIDDEN_CITY_SLUGS pattern.
--
-- Backfill at the end of this migration computes the equivalent membership
-- for the existing 45 cities + 42 counties using today's rules so the
-- public sites see no behavioral change after the API switches over.

-- ─── DDL ──────────────────────────────────────────────────────────────

CREATE TYPE "Brand" AS ENUM ('tge', 'revery');

CREATE TABLE "city_brands" (
    "city_id" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_brands_pkey" PRIMARY KEY ("city_id","brand")
);

CREATE TABLE "county_brands" (
    "county_id" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "county_brands_pkey" PRIMARY KEY ("county_id","brand")
);

CREATE INDEX "city_brands_brand_idx" ON "city_brands"("brand");
CREATE INDEX "county_brands_brand_idx" ON "county_brands"("brand");

ALTER TABLE "city_brands"
    ADD CONSTRAINT "city_brands_city_id_fkey"
    FOREIGN KEY ("city_id") REFERENCES "cities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "county_brands"
    ADD CONSTRAINT "county_brands_county_id_fkey"
    FOREIGN KEY ("county_id") REFERENCES "counties"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Backfill ─────────────────────────────────────────────────────────
--
-- The backfill reads the current SiteConfig row + the hardcoded Revery
-- denylist used by `geo-scope.util.ts:30` and writes one INSERT per
-- (entity, brand) pair that should be visible today. After this runs:
--   * TGE sees: counties in tgeCountyScope, cities in those counties (minus
--     tgeHiddenCities), plus every city in tgeHomepageCities (cross-country
--     featured).
--   * REVERY sees: every county, every city except 'reghin' and 'tarnaveni'.
--
-- IF NOT EXISTS guards keep the migration idempotent so re-running on a
-- partially-populated DB is safe.

-- TGE counties: everything in tgeCountyScope.
INSERT INTO "county_brands" ("county_id", "brand")
SELECT c.id, 'tge'::"Brand"
FROM counties c
INNER JOIN site_config sc ON sc.id = 'singleton'
WHERE c.slug = ANY(sc.tge_county_scope)
ON CONFLICT DO NOTHING;

-- REVERY counties: every county (current Revery scope is unrestricted).
INSERT INTO "county_brands" ("county_id", "brand")
SELECT id, 'revery'::"Brand"
FROM counties
ON CONFLICT DO NOTHING;

-- TGE cities: cities whose county is in tgeCountyScope AND slug is NOT in
-- tgeHiddenCities. Plus, separately, cities in tgeHomepageCities (the
-- cross-country featured set — bucharest/iasi/etc. live outside Transylvania
-- but the brand still markets them).
INSERT INTO "city_brands" ("city_id", "brand")
SELECT DISTINCT ci.id, 'tge'::"Brand"
FROM cities ci
INNER JOIN counties co ON co.id = ci.county_id
INNER JOIN site_config sc ON sc.id = 'singleton'
WHERE
  (co.slug = ANY(sc.tge_county_scope) AND NOT (ci.slug = ANY(sc.tge_hidden_cities)))
  OR ci.slug = ANY(sc.tge_homepage_cities)
ON CONFLICT DO NOTHING;

-- REVERY cities: every city except the hardcoded denylist that used to
-- live in `apps/api/src/common/site/geo-scope.util.ts`.
INSERT INTO "city_brands" ("city_id", "brand")
SELECT id, 'revery'::"Brand"
FROM cities
WHERE slug NOT IN ('reghin', 'tarnaveni')
ON CONFLICT DO NOTHING;
