-- Drop the county_brands join table introduced by 20260508130000_add_brand_membership.
--
-- Counties are universal: every county is reachable from every brand because
-- the public sites consume the full set as a filter facet, not as a
-- visibility gate. Brand membership for visibility lives on cities only
-- (city_brands), and the filtering for both Cities and Properties layers in
-- via the city -> city_brands path. Removing this table eliminates a
-- mistakenly-introduced gate that no consumer was reading.

DROP INDEX IF EXISTS "county_brands_brand_idx";
DROP TABLE IF EXISTS "county_brands";
