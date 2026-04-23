import { createZodDto } from 'nestjs-zod';
import {
  inviteAcademyUserSchema,
  verifyAcademyInvitationSchema,
  acceptAcademyInvitationWithPasswordSchema,
} from '@tge/types/schemas/academy';

export class InviteAcademyUserDto extends createZodDto(
  inviteAcademyUserSchema,
) {}

export class VerifyAcademyInvitationDto extends createZodDto(
  verifyAcademyInvitationSchema,
) {}

export class AcceptAcademyInvitationWithPasswordDto extends createZodDto(
  acceptAcademyInvitationWithPasswordSchema,
) {}
