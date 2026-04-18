import { z } from "zod";
import { localizedStringSchema, slugSchema } from "./_primitives";

/**
 * Agent — a broker/salesperson attached to properties. Mirrors
 * `apps/api/src/agents/dto/create-agent.dto.ts`.
 */
export const createAgentSchema = z
  .object({
    slug: slugSchema,
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    email: z.string().email().max(200),
    phone: z.string().min(3).max(40),
    photo: z.string().max(500).optional(),
    bio: localizedStringSchema,
    active: z.boolean().optional(),
  })
  .strict();

export const updateAgentSchema = createAgentSchema.partial();

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
