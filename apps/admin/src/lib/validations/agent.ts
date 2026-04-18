import { z } from "zod";
import { createAgentSchema } from "@tge/types/schemas/agent";

// Form requires `active` explicitly (API schema marks it optional with a
// service-side default of true). Override so the form can't submit a
// partial-definition UI state.
export const agentSchema = createAgentSchema.extend({
  active: z.boolean(),
});

export type AgentFormValues = z.infer<typeof agentSchema>;
