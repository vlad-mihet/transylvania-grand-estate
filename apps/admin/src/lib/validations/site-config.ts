import { z } from "zod";

export const siteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  contact: z.object({
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  socialLinks: z.array(
    z.object({
      platform: z.string(),
      url: z.string().url(),
    }),
  ),
});

export type SiteConfigFormValues = z.infer<typeof siteConfigSchema>;
