import { createZodDto } from 'nestjs-zod';
import { updateAgentSchema } from '@tge/types/schemas/agent';

export class UpdateAgentDto extends createZodDto(updateAgentSchema) {}
