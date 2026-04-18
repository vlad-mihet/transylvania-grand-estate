import { z } from "zod";
import { RateType } from "@prisma/client";

/**
 * Financial data — bank rates & macro indicators powering the mortgage and
 * affordability calculators. Mirrors
 * `apps/api/src/financial-data/dto/*.ts`.
 */
export const createBankRateSchema = z
  .object({
    bankName: z.string().min(1).max(120),
    rate: z.coerce.number().min(0).max(100),
    rateType: z.nativeEnum(RateType),
    maxLtv: z.coerce.number().min(0).max(1).optional(),
    maxTermYears: z.coerce.number().int().min(1).max(40).optional(),
    processingFee: z.coerce.number().min(0).max(100).optional(),
    insuranceRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().max(500).optional(),
    active: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const updateBankRateSchema = createBankRateSchema.partial();

export const updateIndicatorSchema = z
  .object({
    value: z.coerce.number().min(0),
    source: z.string().max(200).optional(),
    sourceUrl: z.string().max(500).optional(),
  })
  .strict();

export type CreateBankRateInput = z.infer<typeof createBankRateSchema>;
export type UpdateBankRateInput = z.infer<typeof updateBankRateSchema>;
export type UpdateIndicatorInput = z.infer<typeof updateIndicatorSchema>;
