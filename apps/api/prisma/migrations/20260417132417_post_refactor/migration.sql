-- CreateIndex
CREATE INDEX "properties_developer_id_idx" ON "properties"("developer_id");

-- CreateIndex
CREATE INDEX "properties_tier_featured_created_at_idx" ON "properties"("tier", "featured", "created_at" DESC);

-- CreateIndex
CREATE INDEX "properties_tier_city_slug_price_idx" ON "properties"("tier", "city_slug", "price");

-- CreateIndex
CREATE INDEX "properties_tier_bedrooms_bathrooms_area_idx" ON "properties"("tier", "bedrooms", "bathrooms", "area");
