import { createZodDto } from 'nestjs-zod';
import { queryInquirySchema } from '@tge/types/schemas/inquiry';

export class QueryInquiryDto extends createZodDto(queryInquirySchema) {}
