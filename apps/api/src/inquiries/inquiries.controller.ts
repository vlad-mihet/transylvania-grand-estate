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
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { InquiriesService } from './inquiries.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/user.decorator';
import { OwnsResource } from '../common/decorators/owns-resource.decorator';
import { OwnershipGuard } from '../common/guards/ownership.guard';
import { CurrentSite } from '../common/site/site.decorator';
import type { SiteContext } from '../common/site/site.types';
import { InquiryRateLimitGuard } from './inquiry-rate-limit.guard';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Ownership for inquiries walks the `property` relation (added as an implicit
 * Prisma relation via propertySlug↔Property.slug in Phase 4). Inquiries with
 * no linked property can never be AGENT-owned — general-contact messages
 * belong to admins.
 */
const inquiryOwnership = {
  resource: 'inquiry',
  paramKey: 'id',
  resolve: (prisma: PrismaService, id: string) =>
    prisma.inquiry.findUnique({
      where: { id },
      select: { property: { select: { agentId: true } } },
    }),
  ownerField: 'property.agentId',
} as const;

@ApiTags('Inquiries')
@Controller('inquiries')
export class InquiriesController {
  constructor(private inquiriesService: InquiriesService) {}

  // Two layers of rate limiting on this public endpoint: the @Throttle
  // decorator (Nest's global ThrottlerGuard) and InquiryRateLimitGuard, our
  // dedicated synchronous bucket. The latter exists because the former
  // silently degraded under bursts during QA — this is a high-spam-risk
  // surface so defense-in-depth wins over relying on the third-party guard
  // alone.
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(InquiryRateLimitGuard)
  @Post()
  async create(
    @Body() dto: CreateInquiryDto,
    @CurrentSite() site: SiteContext,
  ) {
    return this.inquiriesService.create(dto, site);
  }

  @Roles(
    AdminRole.ADMIN,
    AdminRole.SUPER_ADMIN,
    AdminRole.EDITOR,
    AdminRole.AGENT,
  )
  @Get()
  async findAll(
    @Query() query: QueryInquiryDto,
    @CurrentUser() user: CurrentUserPayload,
    @CurrentSite() site: SiteContext,
  ) {
    return this.inquiriesService.findAll(query, user, site);
  }

  @Roles(
    AdminRole.ADMIN,
    AdminRole.SUPER_ADMIN,
    AdminRole.EDITOR,
    AdminRole.AGENT,
  )
  @UseGuards(OwnershipGuard)
  @OwnsResource(inquiryOwnership)
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.inquiriesService.findById(id);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN, AdminRole.AGENT)
  @UseGuards(OwnershipGuard)
  @OwnsResource(inquiryOwnership)
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.inquiriesService.updateStatus(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inquiriesService.remove(id);
  }

  /**
   * Restores a soft-deleted inquiry. ADMIN+ only — AGENT triage can't undelete
   * because they can't delete in the first place. Trash-can pattern: pair
   * with `GET /inquiries?includeDeleted=1` in the admin operator UI.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/restore')
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.inquiriesService.restore(id);
  }
}
