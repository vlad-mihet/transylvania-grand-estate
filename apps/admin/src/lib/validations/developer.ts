import { z } from "zod";
import { createDeveloperSchema } from "@tge/types/schemas/developer";

// Form-specific tweaks:
// - `website` accepts empty string (form UX) in addition to URL / absent
// - Plain `z.number()` for `projectCount` (form collects numbers directly;
//   the coerce in the shared schema is for the API/query boundary)
// - `featured` required on the form
export const developerSchema = createDeveloperSchema.extend({
  website: z
    .union([z.string().url().max(500), z.literal("")])
    .optional(),
  projectCount: z.number().int().min(0),
  featured: z.boolean(),
});

export type DeveloperFormValues = z.infer<typeof developerSchema>;
