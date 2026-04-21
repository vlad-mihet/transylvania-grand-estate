import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Site Config')
@Controller('site-config')
export class SiteConfigController {
  constructor(private siteConfigService: SiteConfigService) {}

  @Public()
  @Get()
  async get() {
    return this.siteConfigService.get();
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch()
  async update(@Body() dto: UpdateSiteConfigDto) {
    return this.siteConfigService.update(dto);
  }

  /**
   * Idempotent single-slug add to the TGE county scope. Used by the toggle
   * in the admin /counties view — one endpoint per operation lets two admins
   * flip different rows concurrently without the lost-update that a whole-
   * array PATCH would suffer. Returns the full SiteConfig so the client can
   * refresh its cache from a single response.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('tge-county-scope/:slug')
  async addTgeCountyScope(@Param('slug') slug: string) {
    return this.siteConfigService.addTgeCountyScope(slug);
  }

  /** Idempotent single-slug remove. See `addTgeCountyScope` for rationale. */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete('tge-county-scope/:slug')
  async removeTgeCountyScope(@Param('slug') slug: string) {
    return this.siteConfigService.removeTgeCountyScope(slug);
  }
}
