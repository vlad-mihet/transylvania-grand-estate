import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/user.decorator';
import { CurrentSite, SiteContext } from '../common/site';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

/**
 * Global admin search. Single endpoint that fans out across all major entities
 * and returns grouped, deep-linked results. Powers the centered search bar in
 * the admin header.
 */
@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Each hit fans out into up to ten parallel Prisma queries, so this
   * endpoint is meaningfully more expensive than a typical list. The admin
   * client already debounces (250ms) and only fires at length ≥ 2, but we
   * cap server-side too: 60 searches / minute / IP comfortably covers fast
   * human typing and rejects scripted fan-out.
   */
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Roles(
    AdminRole.SUPER_ADMIN,
    AdminRole.ADMIN,
    AdminRole.EDITOR,
    AdminRole.AGENT,
  )
  @Get()
  async search(
    @Query() query: SearchQueryDto,
    @CurrentSite() site: SiteContext,
    @CurrentUser() user: CurrentUserPayload | null,
  ) {
    return this.searchService.search(query, site, user);
  }
}
