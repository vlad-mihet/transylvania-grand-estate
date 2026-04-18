-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('fixed', 'variable', 'govt_program');

-- CreateTable
CREATE TABLE "bank_rates" (
    "id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "max_ltv" DOUBLE PRECISION,
    "max_term_years" INTEGER,
    "processing_fee" DOUBLE PRECISION,
    "insurance_rate" DOUBLE PRECISION,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_indicators" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "source_url" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_rates_active_idx" ON "bank_rates"("active");

-- CreateIndex
CREATE INDEX "bank_rates_rate_type_idx" ON "bank_rates"("rate_type");

-- CreateIndex
CREATE UNIQUE INDEX "financial_indicators_key_key" ON "financial_indicators"("key");
