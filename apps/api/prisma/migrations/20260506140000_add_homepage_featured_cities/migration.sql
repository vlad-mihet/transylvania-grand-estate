-- Ordered slug lists driving the home-page "featured cities" section per brand.
-- Sister concept to `tge_county_scope` / `tge_hidden_cities`: site-curated
-- presentation config lives on the SiteConfig singleton so all per-brand city
-- knobs sit in one administrable row. Resolved at request time via
-- SiteConfigService.getHomepageCities(siteId), keyed off the X-Site header.
-- Default '{}' so an unconfigured env falls through to the existing
-- alphabetical /cities response instead of blanking the home page.
ALTER TABLE "site_config"
  ADD COLUMN "tge_homepage_cities"    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "revery_homepage_cities" TEXT[] NOT NULL DEFAULT '{}';

-- Initial curation supplied by the client for the upcoming presentation.
-- TGE order (Cat 1 then Cat 2): Transylvania-anchored markets first, national
-- expansion second. 18 cities, rendered in a uniform 3-per-row grid.
UPDATE "site_config"
SET "tge_homepage_cities" = ARRAY[
  'cluj-napoca', 'timisoara', 'brasov',
  'sibiu', 'oradea', 'arad',
  'targu-mures', 'alba-iulia', 'satu-mare',
  'bucuresti', 'iasi', 'constanta',
  'sighisoara', 'craiova', 'ploiesti',
  'bistrita', 'suceava', 'deva'
]
WHERE "id" = 'singleton';

-- Revery order (same 18 cities, distinct sequencing per the client's spec):
-- Bucharest leads, followed by Transylvania heavyweights, then secondary
-- regional cities. 6 rows of 3 on tablet/desktop.
UPDATE "site_config"
SET "revery_homepage_cities" = ARRAY[
  'bucuresti', 'cluj-napoca', 'timisoara',
  'brasov', 'oradea', 'sibiu',
  'arad', 'alba-iulia', 'targu-mures',
  'constanta', 'iasi', 'satu-mare',
  'sighisoara', 'craiova', 'ploiesti',
  'bistrita', 'suceava', 'deva'
]
WHERE "id" = 'singleton';
