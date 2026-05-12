import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchHistoryController } from './search-history.controller';
import { SearchHistoryService } from './search-history.service';
import { SearchService } from './search.service';

// SiteConfigModule is @Global — no explicit import needed. PrismaModule is
// provided app-wide through AppModule.
@Module({
  controllers: [SearchController, SearchHistoryController],
  providers: [SearchService, SearchHistoryService],
})
export class SearchModule {}
