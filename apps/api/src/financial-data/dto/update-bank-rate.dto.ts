import { createZodDto } from 'nestjs-zod';
import { updateBankRateSchema } from '@tge/types/schemas/financial-data';

export class UpdateBankRateDto extends createZodDto(updateBankRateSchema) {}
