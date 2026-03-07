import { Body, Controller, Get, Patch } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('site-config')
export class SiteConfigController {
  constructor(private siteConfigService: SiteConfigService) {}

  @Public()
  @Get()
  async get() {
    return this.siteConfigService.get();
  }

  @Patch()
  async update(@Body() dto: UpdateSiteConfigDto) {
    return this.siteConfigService.update(dto);
  }
}
