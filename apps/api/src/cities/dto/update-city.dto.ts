import { createZodDto } from 'nestjs-zod';
import { updateCitySchema } from '@tge/types/schemas/city';

export class UpdateCityDto extends createZodDto(updateCitySchema) {}
