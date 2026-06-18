import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ListingSyncOrchestrator } from './core/listing-sync.orchestrator';
import { RebsClient } from './adapters/rebs/rebs.client';

/**
 * Hourly trigger for the REBS listing sync. Thin by design — mirrors
 * `BnrSyncService`: the cron method only schedules; all logic lives in the
 * orchestrator. Fires on every Fly instance; the orchestrator's advisory lock
 * + idempotency make concurrent firing safe.
 */
@Injectable()
export class CrmSyncCron {
  private readonly logger = new Logger(CrmSyncCron.name);

  constructor(
    private readonly orchestrator: ListingSyncOrchestrator,
    private readonly rebs: RebsClient,
  ) {}

  @Cron('0 * * * *', { timeZone: 'Europe/Bucharest' })
  async handleCron(): Promise<void> {
    if (!this.rebs.isEnabled()) {
      this.logger.debug(
        'REBS sync disabled (REBS_API_KEY unset or REBS_SYNC_ENABLED != 1) — skipping',
      );
      return;
    }
    this.logger.log('Running scheduled REBS listing sync…');
    await this.orchestrator.run();
  }
}
