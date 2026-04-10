import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1, "English value is required"),
  ro: z.string().min(1, "Romanian value is required"),
  fr: z.string().optional(),
  de: z.string().optional(),
});

export const agentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  slug: z.string().min(1, "Slug is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  bio: localizedString,
  active: z.boolean(),
});

export type AgentFormValues = z.infer<typeof agentSchema>;
