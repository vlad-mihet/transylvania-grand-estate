import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * Editor-only article reads. The public `ArticlesController` strips the
 * `draft` JSON column from every response so unpublished snapshots never
 * leak to anonymous consumers; this controller serves the same rows with
 * `draft` intact so the admin edit page can pre-populate the form and
 * surface a "Draft pending" chip.
 */
@ApiTags('AdminArticles')
@Controller('admin/articles')
@Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get('by-slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlugForEditor(slug);
  }
}
