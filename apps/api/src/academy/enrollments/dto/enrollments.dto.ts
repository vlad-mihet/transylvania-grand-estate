import { createZodDto } from 'nestjs-zod';
import {
  grantEnrollmentSchema,
  listEnrollmentsSchema,
} from '@tge/types/schemas/academy';

export class GrantEnrollmentDto extends createZodDto(grantEnrollmentSchema) {}
export class ListEnrollmentsDto extends createZodDto(listEnrollmentsSchema) {}
