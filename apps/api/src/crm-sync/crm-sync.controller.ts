import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ListingSyncOrchestrator } from './core/listing-sync.orchestrator';

/**
 * Admin manual trigger for the listing sync — same code path as the hourly
 * cron, exposed so ops can run it on demand (after fixing a quarantined city,
 * verifying the feed, etc.). Returns the run summary.
 */
@ApiTags('CRM Sync')
@Controller('crm-sync')
export class CrmSyncController {
  constructor(private readonly orchestrator: ListingSyncOrchestrator) {}

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('sync')
  async triggerSync() {
    return this.orchestrator.run();
  }
}
