import { Module } from '@nestjs/common';
import { FinancialDataController } from './financial-data.controller';
import { FinancialDataService } from './financial-data.service';
import { BnrSyncService } from './bnr-sync.service';

@Module({
  controllers: [FinancialDataController],
  providers: [FinancialDataService, BnrSyncService],
  // Exported so the CRM sync can read the EUR/RON rate to convert RON-priced
  // listings before applying the brand-tier threshold.
  exports: [FinancialDataService],
})
export class FinancialDataModule {}
