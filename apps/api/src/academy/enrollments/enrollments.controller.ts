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
  BulkGrantEnrollmentDto,
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

  /**
   * Bulk-grant access for many students at once. Two complementary
   * inputs: pre-resolved userIds (from a list selection) and emails
   * (pasted CSV/list). Set `inviteUnknownEmails: true` to mint a fresh
   * invitation for addresses without an existing AcademyUser. Returns
   * a per-row outcome envelope so the admin UI can render a summary.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('bulk')
  async bulkGrant(
    @Request() req: { user: { id: string } },
    @Body() dto: BulkGrantEnrollmentDto,
  ) {
    return this.enrollmentsService.bulkGrant(dto, req.user.id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.enrollmentsService.revoke(id);
  }
}
