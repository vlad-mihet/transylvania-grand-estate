import { z } from "zod";
import { localizedStringSchema } from "./_primitives";

/**
 * Site config — single-row singleton. All fields optional on update because
 * the admin UI patches individual sections. Mirrors
 * `apps/api/src/site-config/dto/update-site-config.dto.ts`.
 */
export const updateSiteConfigSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    tagline: localizedStringSchema.optional(),
    description: localizedStringSchema.optional(),
    contact: z.record(z.string(), z.string()).optional(),
    socialLinks: z
      .array(
        z.object({
          platform: z.string().min(1).max(40),
          url: z.string().url().max(500),
        }),
      )
      .optional(),
  })
  .strict();

export type UpdateSiteConfigInput = z.infer<typeof updateSiteConfigSchema>;
