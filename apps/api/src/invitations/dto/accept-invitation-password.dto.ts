import { createZodDto } from 'nestjs-zod';
import { acceptInvitationWithPasswordSchema } from '@tge/types/schemas/invitation';

export class AcceptInvitationPasswordDto extends createZodDto(
  acceptInvitationWithPasswordSchema,
) {}
