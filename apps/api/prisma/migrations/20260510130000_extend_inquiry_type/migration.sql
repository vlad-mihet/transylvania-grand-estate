-- Extend the InquiryType enum with `viewing` and `valuation`. The client side
-- already emitted these values via useInquirySubmission's InquiryType union;
-- the server was silently rejecting / coercing them. Closes M-4 in the
-- contact-flow audit (2026-05-10).
--
-- Postgres ALTER TYPE ... ADD VALUE rules: PG 12+ allows it inside a
-- transaction block, but the new value cannot be USED in the same transaction.
-- This migration only adds values; downstream usage waits for a future
-- migration / runtime, which is why it lives in its own migration file
-- separate from the column-add migration.
ALTER TYPE "InquiryType" ADD VALUE IF NOT EXISTS 'viewing';
ALTER TYPE "InquiryType" ADD VALUE IF NOT EXISTS 'valuation';
