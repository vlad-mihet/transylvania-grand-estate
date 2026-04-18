import { createZodDto } from 'nestjs-zod';
import { updateSiteConfigSchema } from '@tge/types/schemas/site-config';

export class UpdateSiteConfigDto extends createZodDto(updateSiteConfigSchema) {}
