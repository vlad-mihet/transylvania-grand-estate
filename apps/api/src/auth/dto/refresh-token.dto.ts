import { createZodDto } from 'nestjs-zod';
import { refreshTokenSchema } from '@tge/types/schemas/auth';

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
