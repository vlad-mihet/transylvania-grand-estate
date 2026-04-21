import { createZodDto } from 'nestjs-zod';
import { verifyInvitationSchema } from '@tge/types/schemas/invitation';

export class VerifyInvitationDto extends createZodDto(verifyInvitationSchema) {}
