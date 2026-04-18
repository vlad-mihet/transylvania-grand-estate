import { z } from "zod";
import { createBankRateSchema } from "@tge/types/schemas/financial-data";

// Form-specific tweaks:
// - Plain `z.number()` (not coerce) so the form's input type aligns with
//   its output type. The shared schema keeps coerce for the API boundary.
// - Optional API fields are `.nullable()` so empty form inputs (which come
//   through as null) don't fail validation
// - `active` and `sortOrder` required on the form
export const bankRateSchema = createBankRateSchema.extend({
  rate: z.number().min(0).max(100),
  maxLtv: z.number().min(0).max(1).nullable().optional(),
  maxTermYears: z.number().int().min(1).max(40).nullable().optional(),
  processingFee: z.number().min(0).max(100).nullable().optional(),
  insuranceRate: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export type BankRateFormValues = z.infer<typeof bankRateSchema>;
