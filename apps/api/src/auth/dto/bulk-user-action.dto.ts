import { createZodDto } from 'nestjs-zod';
import { bulkUserActionSchema } from '@tge/types/schemas/auth';

export class BulkUserActionDto extends createZodDto(bulkUserActionSchema) {}
