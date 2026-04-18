import { createZodDto } from 'nestjs-zod';
import { createBankRateSchema } from '@tge/types/schemas/financial-data';

export class CreateBankRateDto extends createZodDto(createBankRateSchema) {}
