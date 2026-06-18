import {
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ListingSyncOrchestrator } from './core/listing-sync.orchestrator';
import { RebsClient } from './adapters/rebs/rebs.client';

/**
 * Admin manual trigger for the listing sync — same code path as the hourly
 * cron, exposed so ops can run it on demand (after fixing a quarantined city,
 * verifying the feed, etc.). Returns the run summary.
 */
@ApiTags('CRM Sync')
@Controller('crm-sync')
export class CrmSyncController {
  constructor(
    private readonly orchestrator: ListingSyncOrchestrator,
    private readonly rebs: RebsClient,
  ) {}

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('sync')
  async triggerSync() {
    // Gate on the SAME switch as the cron (`isEnabled` = key present AND
    // REBS_SYNC_ENABLED === '1'), not merely `isConfigured`. The manual trigger
    // runs the full destructive reconcile, so it must respect the kill switch:
    // during a staged rollout (key issued, flag still '0') ops disables the sync
    // on purpose, and an admin must not be able to run it out from under that.
    if (!this.rebs.isEnabled()) {
      throw new ServiceUnavailableException(
        'CRM sync is disabled (REBS_API_KEY unset or REBS_SYNC_ENABLED != 1).',
      );
    }
    return this.orchestrator.run();
  }
}
