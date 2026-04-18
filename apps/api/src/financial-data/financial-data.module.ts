import { Module } from '@nestjs/common';
import { FinancialDataController } from './financial-data.controller';
import { FinancialDataService } from './financial-data.service';
import { BnrSyncService } from './bnr-sync.service';

@Module({
  controllers: [FinancialDataController],
  providers: [FinancialDataService, BnrSyncService],
})
export class FinancialDataModule {}
