-- County-slug allowlist for the TGE_LUXURY landing site. Stored on the
-- SiteConfig singleton so an admin can widen or narrow the Transylvania
-- definition without a deploy. Reveria and Admin sites ignore this field.
ALTER TABLE "site_config"
  ADD COLUMN "tge_county_scope" TEXT[] NOT NULL DEFAULT '{}';

-- Seed the singleton with the strict historical-Transylvania set
-- (10 counties). A fresh DB picks this up via prisma db seed; this UPDATE
-- handles upgrades of an already-populated database.
UPDATE "site_config"
SET "tge_county_scope" = ARRAY[
  'alba',
  'bistrita-nasaud',
  'brasov',
  'cluj',
  'covasna',
  'harghita',
  'hunedoara',
  'mures',
  'salaj',
  'sibiu'
]
WHERE "id" = 'singleton';
