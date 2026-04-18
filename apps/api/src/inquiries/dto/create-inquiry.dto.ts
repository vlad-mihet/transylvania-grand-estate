import { createZodDto } from 'nestjs-zod';
import { createInquirySchema } from '@tge/types/schemas/inquiry';

export class CreateInquiryDto extends createZodDto(createInquirySchema) {}
