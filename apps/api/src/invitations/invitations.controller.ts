import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { InvitationsService } from './invitations.service';
import { InviteAgentDto } from './dto/invite-agent.dto';
import { InviteExistingAgentDto } from './dto/invite-existing-agent.dto';
import { AcceptInvitationPasswordDto } from './dto/accept-invitation-password.dto';
import { VerifyInvitationDto } from './dto/verify-invitation.dto';
import { ListInvitationsDto } from './dto/list-invitations.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/user.decorator';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Create an AGENT Agent profile + invitation in one step. The admin form
   * on the Agents page posts here instead of the legacy `/agents` +
   * `/auth/register` two-step dance.
   */
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post('agents')
  async inviteAgent(
    @Body() dto: InviteAgentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invitationsService.inviteAgent(dto, user.id);
  }

  /**
   * Invite an agent that already exists in the DB but has no login yet.
   * Used for legacy public-only agent profiles. Path is rooted at `agents/`
   * so the route reads `POST /invitations/agents/:agentId/invite` \u2014
   * unambiguous with the create-and-invite endpoint above.
   */
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post('agents/:agentId/invite')
  async inviteExistingAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() dto: InviteExistingAgentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invitationsService.inviteExistingAgent(agentId, dto, user.id);
  }

  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Get()
  async list(@Query() query: ListInvitationsDto) {
    return this.invitationsService.list(query);
  }

  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post(':id/resend')
  async resend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.invitationsService.resend(id, user.id);
  }

  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
  @Post(':id/revoke')
  async revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.invitationsService.revoke(id);
  }

  /**
   * Public page-load check. Accepts the plaintext token in the query string
   * so the admin app (and the email link) can deep-link directly. Tighter
   * throttle than the global 60/min since the token space is too large to
   * brute-force but there's no benefit to being permissive here.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('verify')
  async verify(@Query() query: VerifyInvitationDto) {
    return this.invitationsService.verify(query.token);
  }

  /**
   * Public password-acceptance. Very tight throttle: a legitimate user
   * submits once. Anything more is either a scripted attack or a UI bug,
   * and either way deserves backoff.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('accept/password')
  async acceptWithPassword(@Body() dto: AcceptInvitationPasswordDto) {
    return this.invitationsService.acceptWithPassword(dto);
  }
}
