-- Idempotent data migration: seed Târgu Mureș (city + 13 neighborhoods).
--
-- Needed because `prisma db seed` inside the Fly container fails on ESM
-- module resolution (packages/data has no compiled dist, and the
-- container's ts-node setup won't resolve `./properties` without a .ts
-- extension). The repo normally seeds from `packages/data/src/*.ts` on
-- a developer machine, but that path doesn't run in prod.
--
-- Safe to re-run: every INSERT uses ON CONFLICT DO NOTHING. If a future
-- Prisma seed gains the ability to execute in the container, this
-- migration will become a no-op (the rows it creates already exist).
--
-- IDs: the schema stores ids as text and generates UUIDs client-side
-- via Prisma. Since we're running inside the database, we use
-- gen_random_uuid()::text to match the on-disk type.

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

-- Neighborhoods — only has `created_at`, no `updated_at`. FK resolved
-- via subquery against the city we just inserted. Unique key is
-- (slug, city_id).
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
