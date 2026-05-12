import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/user.decorator';
import {
  RecentSearchListQueryDto,
  RecordSearchHistoryDto,
} from './dto/search-history.dto';
import { SearchHistoryService } from './search-history.service';

/**
 * Per-user recent-search history for the unified ⌘K palette. Mirrors the
 * `@Roles(...)` set on the search controller — every role that can search
 * can also record a pick and read it back.
 */
@ApiTags('Search')
@Controller('search/history')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR, AdminRole.AGENT)
export class SearchHistoryController {
  constructor(private readonly history: SearchHistoryService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async list(
    @Query() query: RecentSearchListQueryDto,
    @CurrentUser() user: CurrentUserPayload | null,
  ) {
    if (!user) throw new UnauthorizedException();
    return this.history.list(user, query.limit);
  }

  @Post()
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async record(
    @Body() body: RecordSearchHistoryDto,
    @CurrentUser() user: CurrentUserPayload | null,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException();
    await this.history.record(user, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload | null,
  ): Promise<void> {
    if (!user) throw new UnauthorizedException();
    await this.history.remove(user, id);
  }
}
