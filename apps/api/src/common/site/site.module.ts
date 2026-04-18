import { Global, Module } from '@nestjs/common';
import { SiteOriginConfig } from './site.config';

@Global()
@Module({
  providers: [SiteOriginConfig],
  exports: [SiteOriginConfig],
})
export class SiteModule {}
