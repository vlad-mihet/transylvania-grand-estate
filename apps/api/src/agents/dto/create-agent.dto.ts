import { createZodDto } from 'nestjs-zod';
import { createAgentSchema } from '@tge/types/schemas/agent';

export class CreateAgentDto extends createZodDto(createAgentSchema) {}
