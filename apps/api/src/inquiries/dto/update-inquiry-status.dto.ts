import { createZodDto } from 'nestjs-zod';
import { updateInquiryStatusSchema } from '@tge/types/schemas/inquiry';

export class UpdateInquiryStatusDto extends createZodDto(
  updateInquiryStatusSchema,
) {}
