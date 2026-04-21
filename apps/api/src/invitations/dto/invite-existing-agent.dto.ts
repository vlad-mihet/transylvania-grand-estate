import { createZodDto } from 'nestjs-zod';
import { inviteExistingAgentSchema } from '@tge/types/schemas/invitation';

export class InviteExistingAgentDto extends createZodDto(
  inviteExistingAgentSchema,
) {}
