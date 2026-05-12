import { createZodDto } from 'nestjs-zod';
import {
  recordSearchHistorySchema,
  recentSearchListQuerySchema,
} from '@tge/types/schemas/search';

export class RecordSearchHistoryDto extends createZodDto(
  recordSearchHistorySchema,
) {}

export class RecentSearchListQueryDto extends createZodDto(
  recentSearchListQuerySchema,
) {}
