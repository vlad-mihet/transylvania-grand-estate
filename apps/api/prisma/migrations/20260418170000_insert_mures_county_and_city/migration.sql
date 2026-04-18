-- Follow-up to 20260418160000_insert_targu_mures.
--
-- That migration assumed Mureș county already existed in every DB —
-- which is true on developer machines (seeded from
-- packages/data/src/counties.ts, 42 entries) but NOT true on prod Neon,
-- which only has 5 counties corresponding to the 5 originally-seeded
-- cities (Cluj, Bihor, Timiș, Brașov, Sibiu). The FK subquery returned
-- zero rows, so the INSERT was a silent no-op.
--
-- This migration inserts Mureș county first, then re-runs the city +
-- neighborhood inserts. All three sections use ON CONFLICT DO NOTHING,
-- so running this on a dev DB that already has the data is a no-op.

-- 1. County (idempotent)
INSERT INTO "counties" (
  "id", "name", "slug", "code", "latitude", "longitude",
  "property_count", "created_at", "updated_at"
)
VALUES (
  gen_random_uuid()::text,
  'Mureș',
  'mures',
  'MS',
  46.55,
  24.56,
  0,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;

-- 2. City (FK resolved via subquery — now guaranteed to match after step 1)
INSERT INTO "cities" (
  "id", "name", "slug", "description", "image",
  "property_count", "latitude", "longitude", "county_id",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text,
  'Târgu Mureș',
  'targu-mures',
  '{"en":"A multicultural Transylvanian city famed for its Secession-era Palace of Culture and the rose-lined central square — an emerging residential market anchored by medical, tech, and manufacturing employers.","ro":"Un oraș transilvănean multicultural, renumit pentru Palatul Culturii în stil Secession și Piața Trandafirilor — o piață rezidențială în creștere, susținută de angajatori din medicină, tehnologie și industrie."}'::jsonb,
  '/images/cities/targu-mures.jpg',
  0,
  46.5455,
  24.5625,
  co."id",
  NOW(),
  NOW()
FROM "counties" co
WHERE co."slug" = 'mures'
ON CONFLICT ("slug") DO NOTHING;

-- 3. Neighborhoods (only `created_at`, no `updated_at`)
INSERT INTO "neighborhoods" ("id", "name", "slug", "city_id", "created_at")
SELECT gen_random_uuid()::text, n.name, n.slug, c."id", NOW()
FROM "cities" c
CROSS JOIN (VALUES
  ('Centru',              'centru'),
  ('Tudor Vladimirescu',  'tudor-vladimirescu'),
  ('7 Noiembrie',         '7-noiembrie'),
  ('Dâmbu Pietros',       'dambu-pietros'),
  ('Cornișa',             'cornisa'),
  ('Belvedere',           'belvedere'),
  ('Aleea Carpați',       'aleea-carpati'),
  ('Unirii',              'unirii-tgm'),
  ('Gării',               'garii'),
  ('Mureșeni',            'mureseni'),
  ('Livezeni',            'livezeni'),
  ('Budiului',            'budiului'),
  ('Remetea',             'remetea')
) AS n(name, slug)
WHERE c."slug" = 'targu-mures'
ON CONFLICT ("slug", "city_id") DO NOTHING;
