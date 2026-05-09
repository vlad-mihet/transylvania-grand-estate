import { createZodDto } from 'nestjs-zod';
import { inviteUserSchema } from '@tge/types/schemas/invitation';

export class InviteUserDto extends createZodDto(inviteUserSchema) {}
