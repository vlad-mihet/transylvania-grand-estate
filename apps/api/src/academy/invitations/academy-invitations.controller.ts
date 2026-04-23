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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { AcademyInvitationsService } from './academy-invitations.service';
import {
  AcceptAcademyInvitationWithPasswordDto,
  InviteAcademyUserDto,
  VerifyAcademyInvitationDto,
} from './dto/invite-academy-user.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAcademyAuthGuard } from '../auth/guards/jwt-academy-auth.guard';

/**
 * Two surfaces for academy invitations:
 *   - `/admin/academy/invitations` — ADMIN+ creates/lists/resends/revokes.
 *     Global APP_GUARDs (JwtAuthGuard + RolesGuard) cover auth.
 *   - `/academy/auth/invitations/*` — public verify + accept-password
 *     routes the student's browser calls from the accept-invite page.
 */
@ApiTags('Academy Invitations')
@Controller()
export class AcademyInvitationsController {
  constructor(
    private readonly invitationsService: AcademyInvitationsService,
  ) {}

  // Admin-facing routes ——————————————————————————————————————

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('admin/academy/invitations')
  async invite(
    @Request() req: { user: { id: string } },
    @Body() dto: InviteAcademyUserDto,
  ) {
    return this.invitationsService.invite(dto, req.user.id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get('admin/academy/invitations')
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('email') email?: string,
  ) {
    return this.invitationsService.list({
      page: page ? Math.max(1, parseInt(page, 10)) : 1,
      limit: limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20,
      status,
      email,
    });
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('admin/academy/invitations/:id/resend')
  async resend(
    @Request() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitationsService.resend(id, req.user.id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete('admin/academy/invitations/:id')
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.invitationsService.revoke(id);
  }

  // Public student-facing routes ————————————————————————————————
  // Not wrapped in JwtAcademyAuthGuard because the invitee is unauthenticated
  // by definition. Throttling at the controller level would be nice but
  // Nest's global ThrottlerGuard already covers it with the default bucket.

  @Public()
  @Post('academy/auth/invitations/verify')
  async verify(@Body() dto: VerifyAcademyInvitationDto) {
    return this.invitationsService.verify(dto.token);
  }

  @Public()
  @Post('academy/auth/invitations/accept-password')
  async acceptPassword(
    @Body() dto: AcceptAcademyInvitationWithPasswordDto,
  ) {
    return this.invitationsService.acceptWithPassword(dto);
  }
}
