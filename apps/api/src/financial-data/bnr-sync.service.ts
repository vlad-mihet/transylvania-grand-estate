import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FinancialDataService } from './financial-data.service';

const BNR_FX_URL = 'https://www.bnr.ro/nbrfxrates.xml';

@Injectable()
export class BnrSyncService {
  private readonly logger = new Logger(BnrSyncService.name);

  constructor(private financialDataService: FinancialDataService) {}

  /**
   * Fetch EUR/RON rate from BNR XML feed.
   * Runs daily at 14:00 EET on weekdays (BNR publishes around 13:00).
   */
  @Cron('0 14 * * 1-5', { timeZone: 'Europe/Bucharest' })
  async handleCron() {
    this.logger.log('Running scheduled BNR EUR/RON sync...');
    await this.syncEurRon();
  }

  async syncEurRon(): Promise<{ success: boolean; value?: number; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(BNR_FX_URL, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`BNR returned status ${response.status}`);
      }

      const xml = await response.text();

      // Extract EUR rate from BNR XML
      // Format: <Rate currency="EUR">4.9700</Rate>
      const match = xml.match(
        /<Rate\s+currency="EUR"[^>]*>([0-9]+(?:\.[0-9]+)?)<\/Rate>/,
      );

      if (!match || !match[1]) {
        throw new Error('Could not parse EUR rate from BNR XML');
      }

      const eurRon = parseFloat(match[1]);
      if (isNaN(eurRon) || eurRon < 1 || eurRon > 10) {
        throw new Error(`Parsed EUR/RON rate ${eurRon} looks invalid`);
      }

      await this.financialDataService.upsertIndicator(
        'EUR_RON',
        eurRon,
        'BNR XML Feed',
        BNR_FX_URL,
      );

      this.logger.log(`EUR/RON synced: ${eurRon}`);
      return { success: true, value: eurRon };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`BNR sync failed: ${message}`);
      return { success: false, error: message };
    }
  }
}
