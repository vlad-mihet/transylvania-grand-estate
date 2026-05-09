-- Drop the legacy SiteConfig.tge_county_scope and tge_hidden_cities columns.
--
-- These two arrays drove the original allowlist + per-city denylist gate
-- before the per-city brand membership model (city_brands) replaced them.
-- Visibility is now sourced exclusively from city_brands (see migration
-- 20260508130000_add_brand_membership). Counties are universal across brands
-- (the user-facing filter facet), so an admin scope on counties is no longer
-- meaningful either.

ALTER TABLE "site_config" DROP COLUMN IF EXISTS "tge_county_scope";
ALTER TABLE "site_config" DROP COLUMN IF EXISTS "tge_hidden_cities";
