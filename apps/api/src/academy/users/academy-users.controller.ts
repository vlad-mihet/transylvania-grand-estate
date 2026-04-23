import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AcademyUsersService } from './academy-users.service';
import {
  ListAcademyUsersDto,
  UpdateAcademyUserDto,
} from './dto/academy-users.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Academy Users (Admin)')
@Controller('admin/academy/users')
export class AcademyUsersController {
  constructor(private readonly usersService: AcademyUsersService) {}

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get()
  async list(@Query() query: ListAcademyUsersDto) {
    return this.usersService.list(query);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademyUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Roles(AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
