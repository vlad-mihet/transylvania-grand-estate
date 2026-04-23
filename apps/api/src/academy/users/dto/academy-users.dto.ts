import { createZodDto } from 'nestjs-zod';
import {
  listAcademyUsersSchema,
  updateAcademyUserSchema,
} from '@tge/types/schemas/academy';

export class ListAcademyUsersDto extends createZodDto(
  listAcademyUsersSchema,
) {}
export class UpdateAcademyUserDto extends createZodDto(
  updateAcademyUserSchema,
) {}
