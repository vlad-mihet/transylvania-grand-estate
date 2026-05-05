-- Rebrand the affordable public site from Reveria to Revery in persisted
-- public-facing data. Keep this idempotent so it is safe across environments
-- that may already have been manually backfilled.

UPDATE "properties"
SET "slug" = replace("slug", 'reveria-', 'revery-')
WHERE "slug" LIKE 'reveria-%';

UPDATE "inquiries"
SET
  "entity_slug" = CASE
    WHEN "entity_slug" IS NULL THEN NULL
    ELSE replace("entity_slug", 'reveria-', 'revery-')
  END,
  "property_slug" = CASE
    WHEN "property_slug" IS NULL THEN NULL
    ELSE replace("property_slug", 'reveria-', 'revery-')
  END,
  "source" = CASE
    WHEN "source" IS NULL THEN NULL
    ELSE replace(replace(replace("source", 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')
  END,
  "source_url" = CASE
    WHEN "source_url" IS NULL THEN NULL
    ELSE replace(replace(replace("source_url", 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')
  END
WHERE
  "entity_slug" ILIKE '%reveria%'
  OR "property_slug" ILIKE '%reveria%'
  OR "source" ILIKE '%reveria%'
  OR "source_url" ILIKE '%reveria%';

UPDATE "articles"
SET
  "slug" = replace("slug", 'reveria-', 'revery-'),
  "title" = replace(replace(replace("title"::text, 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')::jsonb,
  "excerpt" = replace(replace(replace("excerpt"::text, 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')::jsonb,
  "content" = replace(replace(replace("content"::text, 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')::jsonb,
  "tags" = replace(replace(replace("tags"::text, 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')::jsonb,
  "author_name" = replace(replace(replace("author_name", 'REVERIA', 'REVERY'), 'Reveria', 'Revery'), 'reveria', 'revery')
WHERE
  "slug" ILIKE '%reveria%'
  OR "title"::text ILIKE '%reveria%'
  OR "excerpt"::text ILIKE '%reveria%'
  OR "content"::text ILIKE '%reveria%'
  OR "tags"::text ILIKE '%reveria%'
  OR "author_name" ILIKE '%reveria%';
