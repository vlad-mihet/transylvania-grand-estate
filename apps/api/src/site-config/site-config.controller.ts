import { Body, Controller, Get, Patch } from '@nestjs/common';
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
}
