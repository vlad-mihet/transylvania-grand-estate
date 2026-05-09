import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
  SuspendAcademyUserDto,
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

  /**
   * CSV export of the same student list. Streams via `StreamableFile` so
   * large catalogs don't balloon process memory. Honours every list filter
   * the admin has applied (search/enrolled/verified) so what you see in
   * the table is what you download.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get('export.csv')
  @Header('Cache-Control', 'no-store')
  exportCsv(@Query() query: ListAcademyUsersDto) {
    return this.usersService.exportCsv(query);
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

  /**
   * Admin-triggered password reset. Sends the standard reset email to
   * the student's address with a 1h-TTL link. Use case: student forgot
   * their password and asked support to reset for them, or the admin
   * needs to force-rotate the credential after a security event.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/send-password-reset')
  async sendPasswordReset(@Param('id', ParseUUIDPipe) id: string) {
    return this.academyAuth.adminSendPasswordReset(id);
  }

  /**
   * Soft-disable an academy account. Existing access/refresh tokens
   * stop working immediately (the JWT strategy enforces) and login
   * returns 403 SUSPENDED. Reactivate via the matching endpoint.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/suspend')
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendAcademyUserDto,
  ) {
    return this.usersService.suspend(id, dto.reason);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/reactivate')
  async reactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.reactivate(id);
  }

  /**
   * Force-mark every published lesson in a course as complete for this
   * student. Use case: student finished the course offline (1:1
   * webinar) and the admin records that completion. Idempotent.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/courses/:courseId/progress/complete')
  async markCourseComplete(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.usersService.markCourseProgressComplete(id, courseId);
  }

  /**
   * Wipe the student's LessonProgress for one course. Hard delete —
   * the student starts the course fresh on their next visit. Course
   * access (the enrollment row) is untouched.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/courses/:courseId/progress/reset')
  async resetCourseProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.usersService.resetCourseProgress(id, courseId);
  }

  /**
   * Per-enrollment progress rollup for the student detail page. Returns
   * one row per accessible course (wildcard expands to all published
   * courses). The admin uses this to spot stalled enrollments without
   * clicking into each course.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id/progress')
  async progress(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProgressForStudent(id);
  }

  /**
   * Per-lesson progress for one (student, course). Lazy-loaded by the
   * admin student detail page when the admin expands a course row.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id/courses/:courseId/lessons')
  async courseLessonStates(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.usersService.getStudentLessonStates(id, courseId);
  }
}
