-- Backfill the Property → City FK for any rows that have a `city_slug` but a
-- NULL `city_id`. Public sites gate listing visibility through the City FK
-- (`cityRef.brands`), so a NULL `city_id` makes a listing silently invisible.
--
-- The admin create/update path now links `city_id` going forward (see
-- properties.service `linkCityForBrand`); this one-off heals any rows created
-- before that fix. On a seeded prod DB this is typically a no-op (the seed
-- already links city_id) — safe and idempotent regardless.
UPDATE "properties" p
SET "city_id" = c."id"
FROM "cities" c
WHERE c."slug" = p."city_slug"
  AND p."city_id" IS NULL;
