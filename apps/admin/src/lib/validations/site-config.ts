import { z } from "zod";
import { localizedStringSchema } from "@tge/types/schemas/_primitives";

// The API accepts a generic `Record<string, string>` contact map and
// optional tagline/description; the admin form is opinionated — it always
// collects a branded contact pair and requires all content fields. Keep
// the stricter shape here and let the API coerce it when saving (both
// shapes are compatible on the wire).
export const siteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: localizedStringSchema,
  description: localizedStringSchema,
  contact: z.object({
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  socialLinks: z.array(
    z.object({
      platform: z.string().min(1),
      url: z.string().url(),
    }),
  ),
});

export type SiteConfigFormValues = z.infer<typeof siteConfigSchema>;
