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
    // Ordered slug lists driving the home-page "featured cities" section per
    // brand. Position in the array IS the rank — admin reorder is an array
    // swap. Cap at 60 to keep the home page section sane (presentation grids
    // are 18 today; headroom covers seasonal pushes without inviting abuse).
    // Visibility is enforced separately by `city_brands` — these arrays only
    // dictate ORDER for cities already tagged for the brand.
    tgeHomepageCities: z.array(z.string().min(1).max(64)).max(60).optional(),
    reveryHomepageCities: z
      .array(z.string().min(1).max(64))
      .max(60)
      .optional(),
  })
  .strict();

export type UpdateSiteConfigInput = z.infer<typeof updateSiteConfigSchema>;
