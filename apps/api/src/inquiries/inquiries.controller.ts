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

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post()
  async create(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN, AdminRole.AGENT)
  @Get()
  async findAll(
    @Query() query: QueryInquiryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.inquiriesService.findAll(query, user);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN, AdminRole.AGENT)
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
}
