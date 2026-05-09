import { createZodDto } from 'nestjs-zod';
import {
  bulkGrantEnrollmentSchema,
  grantEnrollmentSchema,
  listEnrollmentsSchema,
} from '@tge/types/schemas/academy';

export class GrantEnrollmentDto extends createZodDto(grantEnrollmentSchema) {}
export class ListEnrollmentsDto extends createZodDto(listEnrollmentsSchema) {}
export class BulkGrantEnrollmentDto extends createZodDto(
  bulkGrantEnrollmentSchema,
) {}
