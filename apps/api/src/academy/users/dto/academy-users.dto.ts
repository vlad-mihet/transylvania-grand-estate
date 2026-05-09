import { createZodDto } from 'nestjs-zod';
import {
  listAcademyUsersSchema,
  suspendAcademyUserSchema,
  updateAcademyUserSchema,
} from '@tge/types/schemas/academy';

export class ListAcademyUsersDto extends createZodDto(
  listAcademyUsersSchema,
) {}
export class UpdateAcademyUserDto extends createZodDto(
  updateAcademyUserSchema,
) {}
export class SuspendAcademyUserDto extends createZodDto(
  suspendAcademyUserSchema,
) {}
