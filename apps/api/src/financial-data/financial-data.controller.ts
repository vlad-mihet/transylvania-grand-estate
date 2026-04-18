import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FinancialDataService } from './financial-data.service';
import { BnrSyncService } from './bnr-sync.service';
import { CreateBankRateDto } from './dto/create-bank-rate.dto';
import { UpdateBankRateDto } from './dto/update-bank-rate.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '@prisma/client';

@ApiTags('Financial Data')
@Controller('financial-data')
export class FinancialDataController {
  constructor(
    private financialDataService: FinancialDataService,
    private bnrSyncService: BnrSyncService,
  ) {}

  // ─── Public endpoints ──────────────────────────────────

  @Public()
  @Get('calculator-config')
  async getCalculatorConfig() {
    return this.financialDataService.getCalculatorConfig();
  }

  @Public()
  @Get('bank-rates')
  async findAllBankRates(
    @Query('all') all?: string,
  ) {
    const activeOnly = all !== 'true';
    return this.financialDataService.findAllBankRates(activeOnly);
  }

  @Public()
  @Get('bank-rates/:id')
  async findBankRateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.financialDataService.findBankRateById(id);
  }

  @Public()
  @Get('indicators')
  async findAllIndicators() {
    return this.financialDataService.findAllIndicators();
  }

  // ─── Admin: Bank Rates CRUD ────────────────────────────

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('bank-rates')
  async createBankRate(@Body() dto: CreateBankRateDto) {
    return this.financialDataService.createBankRate(dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch('bank-rates/:id')
  async updateBankRate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankRateDto,
  ) {
    return this.financialDataService.updateBankRate(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete('bank-rates/:id')
  async removeBankRate(@Param('id', ParseUUIDPipe) id: string) {
    return this.financialDataService.removeBankRate(id);
  }

  // ─── Admin: Financial Indicators ───────────────────────

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch('indicators/:key')
  async updateIndicator(
    @Param('key') key: string,
    @Body() dto: UpdateIndicatorDto,
  ) {
    return this.financialDataService.updateIndicator(key, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('sync-bnr')
  async syncBnr() {
    return this.bnrSyncService.syncEurRon();
  }
}
