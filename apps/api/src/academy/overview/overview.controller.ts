import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AcademyOverviewService } from './overview.service';

/**
 * Single-endpoint controller behind the academy section landing
 * dashboard. ADMIN+ only — the data set leaks all student activity, so
 * EDITOR (who can edit content but not manage students) shouldn't see it.
 */
@ApiTags('Academy Overview (Admin)')
@Controller('admin/academy/overview')
export class AcademyOverviewController {
  constructor(private readonly service: AcademyOverviewService) {}

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get()
  async getOverview() {
    return this.service.getOverview();
  }
}
