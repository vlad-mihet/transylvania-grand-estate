import { createZodDto } from 'nestjs-zod';
import { listInvitationsSchema } from '@tge/types/schemas/invitation';

export class ListInvitationsDto extends createZodDto(listInvitationsSchema) {}
