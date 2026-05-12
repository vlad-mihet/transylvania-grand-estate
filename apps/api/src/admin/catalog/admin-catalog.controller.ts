import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { AdminCatalogService } from './admin-catalog.service';

@ApiTags('AdminCatalog')
@Controller('admin/catalog')
@Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
export class AdminCatalogController {
  constructor(private service: AdminCatalogService) {}

  @Get('overview')
  async overview() {
    return this.service.getOverview();
  }
}
