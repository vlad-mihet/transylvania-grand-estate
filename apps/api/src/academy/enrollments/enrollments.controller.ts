import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { EnrollmentsService } from './enrollments.service';
import {
  GrantEnrollmentDto,
  ListEnrollmentsDto,
} from './dto/enrollments.dto';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Admin-facing enrollment management. Students can't mint enrollments
 * themselves — an admin (ADMIN+) issues them, typically as part of the
 * invitation flow but also standalone (e.g. granting an existing student
 * access to a newly released course).
 */
@ApiTags('Academy Enrollments (Admin)')
@Controller('admin/academy/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get()
  async list(@Query() query: ListEnrollmentsDto) {
    return this.enrollmentsService.list(query);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async grant(
    @Request() req: { user: { id: string } },
    @Body() dto: GrantEnrollmentDto,
  ) {
    return this.enrollmentsService.grant(dto, req.user.id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.revoke(id);
  }
}
