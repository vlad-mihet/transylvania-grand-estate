import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { IMAGE_UPLOAD_SINGLE } from '../common/config/upload.config';
import { ValidateUploadInterceptor } from '../common/interceptors/validate-upload.interceptor';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/user.decorator';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import type { PrismaService } from '../prisma/prisma.service';
import { CurrentSite, SiteContext } from '../common/site';

/**
 * AGENT self-ownership on `/agents/:id` — compare against the AdminUser id
 * (not agentId) because the agent *record* is owned by the logged-in user,
 * not by the sales-agent identity itself.
 */
const agentSelfOwnership = {
  resource: 'agent',
  paramKey: 'id',
  resolve: (prisma: PrismaService, id: string) =>
    prisma.agent.findUnique({
      where: { id },
      select: { adminUserId: true },
    }),
  ownerField: 'adminUserId',
  compare: (
    owner: unknown,
    user: { id: string; agentId: string | null },
  ) => owner === user.id,
} as const;

@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Public()
  @Get()
  async findAll(
    @CurrentSite() site: SiteContext,
    @Query('active') active?: boolean,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unlinked') unlinked?: boolean,
  ) {
    return this.agentsService.findAll(
      {
        active,
        search,
        sort,
        page,
        limit,
        unlinked,
      },
      site,
    );
  }

  /**
   * Returns the sales-agent record linked to the current AGENT user, or 404
   * if the account hasn't been linked yet. Admin roles can call this too —
   * they just won't get a hit unless they're also linked.
   */
  @Roles(AdminRole.AGENT, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get('me')
  async findMe(
    @CurrentUser() user: CurrentUserPayload,
    @CurrentSite() site: SiteContext,
  ) {
    if (!user.agentId) {
      throw new NotFoundException('No linked agent');
    }
    return this.agentsService.findById(user.agentId, site);
  }

  @Public()
  @Get('id/:id')
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.agentsService.findById(id, site);
  }

  @Public()
  @Get(':slug')
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentSite() site: SiteContext,
  ) {
    return this.agentsService.findBySlug(slug, site);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN, AdminRole.AGENT)
  @UseGuards(OwnershipGuard)
  @OwnsResource(agentSelfOwnership)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Sanitize for AGENT: only `firstName`, `lastName`, `phone`, `photo`,
    // `bio` are self-editable. Reject other fields outright so a crafted
    // payload can't e.g. flip `active` or change the `slug`.
    if (user.role === AdminRole.AGENT) {
      const allowed = new Set<keyof UpdateAgentDto>([
        'firstName',
        'lastName',
        'phone',
        'photo',
        'bio',
      ]);
      for (const key of Object.keys(dto) as Array<keyof UpdateAgentDto>) {
        if (!allowed.has(key)) {
          throw new ForbiddenException(
            `AGENT cannot update field "${key}" on their profile`,
          );
        }
      }
    }
    return this.agentsService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.remove(id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN, AdminRole.AGENT)
  @UseGuards(OwnershipGuard)
  @OwnsResource(agentSelfOwnership)
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('photo', IMAGE_UPLOAD_SINGLE),
    ValidateUploadInterceptor,
  )
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.agentsService.uploadPhoto(id, file);
  }
}
