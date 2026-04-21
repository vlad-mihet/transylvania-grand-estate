import { createZodDto } from 'nestjs-zod';
import { inviteAgentSchema } from '@tge/types/schemas/invitation';

export class InviteAgentDto extends createZodDto(inviteAgentSchema) {}
