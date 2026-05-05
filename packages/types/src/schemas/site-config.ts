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
    // County-slug allowlist for the TGE landing site. Applied server-side via
    // SITE_GEO_SCOPE; ignored for Revery and Admin. An empty array is valid
    // but collapses the TGE view to nothing, so the admin form warns before
    // saving zero counties.
    tgeCountyScope: z.array(z.string().min(1).max(64)).max(42).optional(),
    // City-slug denylist for the TGE landing site only. Sister field to
    // `tgeCountyScope` — keeps a county on TGE while hiding individual cities
    // (e.g. all of Mureș except Târnăveni). Cap at 200 to leave headroom over
    // Romania's ~320 city total without inviting an accidental "hide all".
    tgeHiddenCities: z.array(z.string().min(1).max(64)).max(200).optional(),
  })
  .strict();

export type UpdateSiteConfigInput = z.infer<typeof updateSiteConfigSchema>;
