-- CreateTable
CREATE TABLE "admin_search_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "href" TEXT NOT NULL,
    "image_url" TEXT,
    "badge" TEXT,
    "selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_search_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_search_history_user_id_entity_entity_id_key" ON "admin_search_history"("user_id", "entity", "entity_id");

-- CreateIndex
CREATE INDEX "admin_search_history_user_id_selected_at_idx" ON "admin_search_history"("user_id", "selected_at" DESC);

-- AddForeignKey
ALTER TABLE "admin_search_history" ADD CONSTRAINT "admin_search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
