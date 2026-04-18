import { z } from "zod";
import { createCitySchema } from "@tge/types/schemas/city";

// Form-specific tweak: `propertyCount` required on the form with plain
// `z.number()` — the shared schema's coerce is for the API boundary.
export const citySchema = createCitySchema.extend({
  propertyCount: z.number().int().min(0),
});

export type CityFormValues = z.infer<typeof citySchema>;
