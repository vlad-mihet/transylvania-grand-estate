import { Global, Module } from '@nestjs/common';
import { SiteConfigController } from './site-config.controller';
import { SiteConfigService } from './site-config.service';

// Global so the cities / properties services can inject the cached
// county-scope getter without each domain module re-importing this module.
@Global()
@Module({
  controllers: [SiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
