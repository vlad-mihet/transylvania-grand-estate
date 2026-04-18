import { createZodDto } from 'nestjs-zod';
import { createCitySchema } from '@tge/types/schemas/city';

export class CreateCityDto extends createZodDto(createCitySchema) {}
