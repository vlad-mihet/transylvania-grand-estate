import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AcademyUsersService } from './academy-users.service';
import { AcademyAuthService } from '../auth/academy-auth.service';
import {
  ListAcademyUsersDto,
  UpdateAcademyUserDto,
} from './dto/academy-users.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Academy Users (Admin)')
@Controller('admin/academy/users')
export class AcademyUsersController {
  constructor(
    private readonly usersService: AcademyUsersService,
    private readonly academyAuth: AcademyAuthService,
  ) {}

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

  /**
   * Admin-triggered re-send of a verification email. Used from the
   * student detail page when a self-registered account never clicked
   * their initial link. Unlike the public /academy/auth/resend-verification
   * endpoint, this one returns 410 ALREADY_VERIFIED when the account is
   * already verified — the admin is authenticated and deserves real
   * errors instead of the anti-enumeration silent 202.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/resend-verification')
  async resendVerification(@Param('id', ParseUUIDPipe) id: string) {
    return this.academyAuth.adminResendVerification(id);
  }
}
