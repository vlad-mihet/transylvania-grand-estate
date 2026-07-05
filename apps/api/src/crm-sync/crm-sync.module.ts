import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { FinancialDataModule } from '../financial-data/financial-data.module';
import { CrmSyncController } from './crm-sync.controller';
import { CrmSyncCron } from './crm-sync.cron';
import { ListingSyncOrchestrator } from './core/listing-sync.orchestrator';
import { BrandRouteService } from './core/brand-route.service';
import { MediaMirrorService } from './core/media-mirror.service';
import { ListingWriteService } from './core/listing-write.service';
import { SyncLockService } from './core/sync-lock.service';
import { LISTING_PROVIDER } from './core/ports/listing-provider.port';
import { RebsClient } from './adapters/rebs/rebs.client';
import { RebsAdapter } from './adapters/rebs/rebs.adapter';

/**
 * CRM → platform listing sync. Ports-and-adapters: the `core/*` providers are
 * CRM-agnostic; the only REBS-specific code is the adapter, bound to the
 * `LISTING_PROVIDER` token. Swapping CRMs = swap that binding.
 *
 * PrismaService is provided globally; UploadsModule supplies media storage,
 * FinancialDataModule the EUR/RON rate for price conversion.
 */
@Module({
  imports: [UploadsModule, FinancialDataModule],
  controllers: [CrmSyncController],
  providers: [
    // Core (CRM-agnostic)
    ListingSyncOrchestrator,
    BrandRouteService,
    MediaMirrorService,
    ListingWriteService,
    SyncLockService,
    CrmSyncCron,
    // REBS adapter — the one provider binding.
    RebsClient,
    RebsAdapter,
    { provide: LISTING_PROVIDER, useExisting: RebsAdapter },
  ],
})
export class CrmSyncModule {}
