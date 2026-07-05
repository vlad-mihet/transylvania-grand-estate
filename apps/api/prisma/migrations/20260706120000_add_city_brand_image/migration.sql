-- Per-brand hero image override. NULL falls back to City.image.
ALTER TABLE "city_brands" ADD COLUMN "image" TEXT;
