import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

// SiteConfigModule is @Global — no explicit import needed. PrismaModule is
// provided app-wide through AppModule.
@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
